/*
 * POST /api/reading — AI 풀이를 텍스트 스트림으로 돌려준다.
 * body: { kind: 'today'|'saju'|'gung'|'year', topic, me: profile, partner?: profile }
 * 응답: 200 text/plain 스트림 | 4xx/5xx JSON { error, message }
 * 환경 변수: ANTHROPIC_API_KEY(필수), MODEL_MAIN, MODEL_QUICK, ANTHROPIC_BASE_URL(테스트용), ALLOWED_ORIGINS
 */
'use strict';
const { buildPrompt } = require('../lib/prompts.js');
const ratelimit = require('../lib/ratelimit.js');

const MODELS = {
  main: process.env.MODEL_MAIN || 'claude-sonnet-5-5',
  quick: process.env.MODEL_QUICK || 'claude-haiku-4-5-20251001',
};
const API = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '') + '/v1/messages';

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Object.assign(new Error('too large'), { status: 413 }); }
  return JSON.parse(raw || 'null');
}
const clientIp = req => String(req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || 'unknown').trim();

function originAllowed(req) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.length) return true; // 설정하지 않으면 검사하지 않음
  const o = req.headers.origin || '';
  return !o || allowed.includes(o);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { error: 'method_not_allowed' }); }
  if (!originAllowed(req)) return sendJson(res, 403, { error: 'forbidden_origin', message: '허용되지 않은 사이트에서 온 요청입니다.' });
  if (!process.env.ANTHROPIC_API_KEY) return sendJson(res, 503, { error: 'not_configured', message: 'AI 풀이가 아직 설정되지 않았습니다.' });

  let body, prompt;
  try { body = await readBody(req); } catch (e) { return sendJson(res, e.status || 400, { error: 'bad_request', message: '요청 형식이 올바르지 않습니다.' }); }
  try { prompt = buildPrompt(body); } catch (e) { return sendJson(res, e.status || 400, { error: 'bad_request', message: e.message }); }

  const rl = await ratelimit.check(clientIp(req));
  if (!rl.ok) {
    const message = rl.reason === 'global_day' ? '오늘 준비한 AI 풀이가 모두 소진되었습니다. 내일 다시 이용해 주세요.' : '짧은 시간에 요청이 많았습니다. 잠시 후 다시 시도해 주세요.';
    res.setHeader('Retry-After', rl.reason === 'ip_hour' ? '600' : '3600');
    return sendJson(res, 429, { error: 'rate_limited', reason: rl.reason, message });
  }

  const ctl = new AbortController();
  res.on('close', () => { if (!res.writableEnded) ctl.abort(); }); // 사용자가 중지하면 생성도 멈춤

  let upstream;
  try {
    upstream = await fetch(API, {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODELS[prompt.tier], max_tokens: prompt.maxTokens, system: prompt.system, messages: [{ role: 'user', content: prompt.user }], stream: true }),
    });
  } catch (e) {
    if (ctl.signal.aborted) return;
    return sendJson(res, 502, { error: 'upstream_unreachable', message: 'AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
  }
  if (!upstream.ok) {
    const status = upstream.status;
    let detail = ''; try { detail = (await upstream.json())?.error?.type || ''; } catch {}
    console.error('anthropic error', status, detail); // 개인정보는 기록하지 않음
    if (status === 429 || status === 529) return sendJson(res, 503, { error: 'busy', message: '지금 AI 요청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.' });
    return sendJson(res, 502, { error: 'upstream_error', message: 'AI 풀이를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Accel-Buffering', 'no');
  const decoder = new TextDecoder();
  let buf = '';
  try {
    for await (const chunk of upstream.body) {
      buf += decoder.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        let ev; try { ev = JSON.parse(line.slice(5)); } catch { continue; }
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') res.write(ev.delta.text);
        else if (ev.type === 'message_delta' && ev.delta?.stop_reason === 'max_tokens') res.write('\n\n(풀이가 길어 여기까지 표시합니다.)');
        else if (ev.type === 'error') { console.error('anthropic stream error', ev.error?.type); res.write('\n\n(풀이가 중간에 끊겼습니다. 다시 시도해 주세요.)'); }
      }
    }
  } catch (e) {
    if (!ctl.signal.aborted) { console.error('stream failed', e.name); try { res.write('\n\n(풀이가 중간에 끊겼습니다. 다시 시도해 주세요.)'); } catch {} }
  }
  res.end();
};

