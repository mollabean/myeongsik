/*
 * 호출 제한.
 * - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 이 설정되어 있으면 Upstash Redis로 모든 서버 인스턴스에 공통 적용.
 * - 없으면 서버 인스턴스 메모리에서 최선 노력으로 적용 (인스턴스가 여러 개면 느슨해짐).
 * 진짜 비용 상한은 Anthropic Console의 월 사용 한도(Spend limit)로 걸어 두세요.
 */
'use strict';

const LIMITS = {
  perIpHour: Number(process.env.LIMIT_PER_IP_HOUR || 20),
  perIpDay: Number(process.env.LIMIT_PER_IP_DAY || 60),
  globalDay: Number(process.env.LIMIT_GLOBAL_DAY || 1000),
};

const mem = new Map(); // key -> { n, exp }
function memIncr(key, ttlSec, now) {
  const e = mem.get(key);
  if (!e || e.exp <= now) { mem.set(key, { n: 1, exp: now + ttlSec * 1000 }); return 1; }
  e.n += 1; return e.n;
}
function memSweep(now) { if (mem.size > 5000) for (const [k, v] of mem) if (v.exp <= now) mem.delete(k); }

async function upstashIncr(keys) {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const cmds = keys.flatMap(([k, ttl]) => [['INCR', k], ['EXPIRE', k, String(ttl), 'NX']]);
  const r = await fetch(url.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('rate limit store unavailable');
  const out = await r.json();
  return keys.map((_, i) => Number(out[i * 2].result));
}

/** @returns {Promise<{ok: boolean, reason?: 'ip_hour'|'ip_day'|'global_day'}>} */
async function check(ip, now = Date.now()) {
  const d = new Date(now + 9 * 3600e3).toISOString(); // KST 기준 날짜·시
  const day = d.slice(0, 10), hour = d.slice(0, 13);
  const keys = [[`rl:h:${ip}:${hour}`, 3600], [`rl:d:${ip}:${day}`, 86400], [`rl:g:${day}`, 86400]];
  let counts;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try { counts = await upstashIncr(keys); } catch { counts = null; }
  }
  if (!counts) { memSweep(now); counts = keys.map(([k, ttl]) => memIncr(k, ttl, now)); }
  if (counts[0] > LIMITS.perIpHour) return { ok: false, reason: 'ip_hour' };
  if (counts[1] > LIMITS.perIpDay) return { ok: false, reason: 'ip_day' };
  if (counts[2] > LIMITS.globalDay) return { ok: false, reason: 'global_day' };
  return { ok: true };
}

module.exports = { check, LIMITS, _mem: mem };
