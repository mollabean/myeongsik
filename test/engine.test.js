// 만세력 엔진 회귀 테스트 — 기준값: sxtwl(연·월·일·시주), 한국천문연구원 음력 데이터(korean-lunar-calendar)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const S = require('../public/saju.js');
const fx = require('./fixtures.json');

test('연·월·일주가 기준 만세력과 일치 (절기 전후일 제외 연·월)', () => {
  for (const [y, m, d, yg, mg, dg, near] of fx.days) {
    const r = S.compute({ year: y, month: m, day: d, hour: 12, minute: 0, tz: 'Etc/GMT-8', timeMode: 'standard' });
    assert.strictEqual(r.pillars.day.hanja, dg, `${y}-${m}-${d} 일주`);
    if (!near) { assert.strictEqual(r.pillars.year.hanja, yg, `${y}-${m}-${d} 연주`); assert.strictEqual(r.pillars.month.hanja, mg, `${y}-${m}-${d} 월주`); }
  }
});

test('시주가 기준 만세력과 일치', () => {
  for (const [y, m, d, h, hg] of fx.hours) {
    const r = S.compute({ year: y, month: m, day: d, hour: h, minute: 30, tz: 'Etc/GMT-8', timeMode: 'standard', ziMode: 'yaja' });
    assert.strictEqual(r.pillars.hour.hanja, hg, `${y}-${m}-${d} ${h}시`);
  }
});

test('음력 변환이 한국천문연구원 데이터와 일치 (왕복 포함)', () => {
  for (const [y, m, d, ly, lm, ld, leap] of fx.lunar) {
    const r = S.solarToLunar(y, m, d);
    assert.deepStrictEqual([r.year, r.month, r.day, r.leap], [ly, lm, ld, leap], `${y}-${m}-${d}`);
    const s = S.lunarToSolar(ly, lm, ld, leap);
    assert.deepStrictEqual([s.year, s.month, s.day], [y, m, d]);
  }
});

test('시진 입력은 고른 시진을 시주로 쓴다', () => {
  for (let b = 0; b < 12; b++) assert.strictEqual(S.compute({ year: 1992, month: 3, day: 8, hourBranch: b, gender: 'F' }).pillars.hour.branch, b);
  const late = S.compute({ year: 1992, month: 3, day: 8, hourBranch: 0, lateZi: true, gender: 'F' });
  const next = S.compute({ year: 1992, month: 3, day: 9, hourBranch: 0, gender: 'F' });
  assert.strictEqual(late.pillars.day.hanja, next.pillars.day.hanja, '자정 전 자시는 다음날 일주(자시 기준)');
});

test('합충 관계표는 대칭이고 지지마다 육합·충·원진이 하나씩', () => {
  for (let a = 0; a < 12; a++) {
    const per = {};
    for (let b = 0; b < 12; b++) {
      const t1 = S.branchRelations(a, b).map(x => x.type).sort().join(), t2 = S.branchRelations(b, a).map(x => x.type).sort().join();
      assert.strictEqual(t1, t2);
      if (a !== b) S.branchRelations(a, b).forEach(x => { per[x.type] = (per[x.type] || 0) + 1; });
    }
    assert.deepStrictEqual([per['육합'], per['충'], per['원진']], [1, 1, 1], `지지 ${a}`);
  }
});

test('2027년 월운 간지', () => {
  const A = S.compute({ year: 1992, month: 3, day: 8, hour: 7, minute: 20, gender: 'F' });
  const f = S.yearFortune(A, 2027);
  assert.deepStrictEqual(f.months.map(m => m.hanja), ['壬寅', '癸卯', '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑']);
  assert.strictEqual(f.pillar.hanja, '丁未');
});
