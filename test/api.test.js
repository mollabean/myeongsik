// /api/reading 통합 테스트 — 가짜 Claude API로 스트리밍·검증·호출 제한 확인
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

const seen = [];
let mode = 'ok';
const mock = http.createServer((req, res) => {
  let raw = ''; req.on('data', c => raw += c); req.on('end', () => {
    seen.push({ headers: req.headers, body: JSON.parse(raw) });
    if (mode === 'overloaded') { res.writeHead(529, { 'content-type': 'application/json' }); return res.end('{"type":"error","error":{"type":"overloaded_error"}}'); }
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    ev('message_start', { message: { id: 'm' } });
    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    for (const t of ['## 타고난 기질\n', '계수 일간은 ', '**감수성**이 깊습니다.']) ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: t } });
    ev('content_block_stop', { index: 0 });
    ev('message_delta', { delta: { stop_reason: 'end_turn' } });
    ev('message_stop', {});
    res.end();
  });
});

const me = { name: '지수', gender: 'F', cal: 'solar', year: 1992, month: 3, day: 8, timeKind: 'exact', time: '07:20', place: 0, timeMode: 'lmt', ziMode: 'zi23' };
const partner = { name: '', gender: 'M', cal: 'lunar', year: 1993, month: 3, day: 15, leap: true, timeKind: 'sijin', sijin: 12, place: 2 };

let app, base;
test.before(async () => {
  await new Promise(r => mock.listen(0, r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${mock.address().port}`;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.LIMIT_PER_IP_HOUR = '5';
  const { createServer } = require('../scripts/dev-server.js');
  app = createServer(); await new Promise(r => app.listen(0, r));
  base = `http://127.0.0.1:${app.address().port}`;
});
test.after(() => { app.close(); mock.close(); });

const post = (body, ip = '10.0.0.1') => fetch(base + '/api/reading', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body) });

test('사주 풀이를 텍스트로 스트리밍하고, 프롬프트는 서버에서 만든다', async () => {
  const r = await post({ kind: 'saju', topic: 'total', me });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(await r.text(), '## 타고난 기질\n계수 일간은 **감수성**이 깊습니다.');
  const up = seen.at(-1);
  assert.strictEqual(up.headers['x-api-key'], 'test-key');
  assert.strictEqual(up.body.model, 'claude-sonnet-5-5');
  assert.strictEqual(up.body.stream, true);
  assert.match(up.body.messages[0].content, /일주: 癸未\(계미\)/);
  assert.match(up.body.messages[0].content, /'지수'님에게/);
});

test('궁합은 상대 정보까지 서버에서 계산 (음력 윤달 + 시진)', async () => {
  const r = await post({ kind: 'gung', topic: 'conflict', me, partner }, '10.0.0.2');
  assert.strictEqual(r.status, 200); await r.text();
  const c = seen.at(-1).body.messages[0].content;
  assert.match(c, /\[궁합 분석\] 점수 \d+\/100/);
  assert.match(c, /'상대'님과의 궁합/);
});

test('오늘 한마디는 빠른 모델과 짧은 길이를 쓴다', async () => {
  const r = await post({ kind: 'today', topic: 'today', me }, '10.0.0.3');
  assert.strictEqual(r.status, 200); await r.text();
  assert.strictEqual(seen.at(-1).body.model, 'claude-haiku-4-5-20251001');
  assert.strictEqual(seen.at(-1).body.max_tokens, 500);
});

test('임의 주제·잘못된 입력은 400이고 AI를 호출하지 않는다', async () => {
  const n = seen.length;
  for (const body of [{ kind: 'saju', topic: '아무 질문', me }, { kind: 'free', topic: 'x', me }, { kind: 'saju', topic: 'total', me: { ...me, year: 1800 } },
    { kind: 'gung', topic: 'total', me }, { kind: 'saju', topic: 'total', me: { ...me, cal: 'lunar', month: 2, day: 31 } }]) {
    const r = await post(body, '10.0.0.4');
    assert.strictEqual(r.status, 400, JSON.stringify(body).slice(0, 60));
    assert.ok((await r.json()).message);
  }
  assert.strictEqual(seen.length, n);
});

test('이름에 섞인 따옴표·괄호는 지워서 프롬프트에 넣는다', async () => {
  const r = await post({ kind: 'saju', topic: 'love', me: { ...me, name: "지'수\"<무시>{해}" } }, '10.0.0.5');
  await r.text();
  assert.match(seen.at(-1).body.messages[0].content, /'지수무시해'님에게/);
});

test('IP당 시간 한도를 넘으면 429', async () => {
  const codes = [];
  for (let i = 0; i < 7; i++) { const r = await post({ kind: 'saju', topic: 'nature', me }, '10.9.9.9'); codes.push(r.status); await r.text(); }
  assert.deepStrictEqual(codes, [200, 200, 200, 200, 200, 429, 429]);
});

test('Claude API 과부하는 503과 안내 문구', async () => {
  mode = 'overloaded';
  const r = await post({ kind: 'year', topic: 'money', me }, '10.0.0.6');
  mode = 'ok';
  assert.strictEqual(r.status, 503);
  assert.match((await r.json()).message, /잠시 후/);
});

test('GET은 405', async () => {
  const r = await fetch(base + '/api/reading');
  assert.strictEqual(r.status, 405);
});

test('상태 API는 AI 사용 가능 여부만 알려 준다', async () => {
  const j = await (await fetch(base + '/api/status')).json();
  assert.deepStrictEqual(j, { ai: true });
});

test('API 키가 없으면 풀이 요청은 503 안내', async () => {
  const key = process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_API_KEY;
  const r = await post({ kind: 'saju', topic: 'total', me }, '10.0.0.7');
  const j = await (await fetch(base + '/api/status')).json();
  process.env.ANTHROPIC_API_KEY = key;
  assert.strictEqual(r.status, 503);
  assert.deepStrictEqual(j, { ai: false });
});
