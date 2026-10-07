/*
 * 만세력 엔진 (Saju / Four Pillars calculator)
 * - 연주/월주: 천문 계산한 절기(태양 황경) 기준. 입춘 = 315°
 * - 일주: 율리우스 일수 기반 60갑자
 * - 시주: 경도 보정(평태양시) / 진태양시 / 표준시 선택, 자시 처리 선택
 * - 표준시·서머타임 이력: IANA tz DB (Intl, Asia/Seoul)
 * - 음력 → 양력: 합삭·중기 천문 계산 (한국 기준 자오선)
 * Node: require('./saju.js')   Browser: window.Saju (astronomy-engine 필요)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('astronomy-engine'));
  else root.Saju = factory(root.Astronomy);
})(typeof self !== 'undefined' ? self : this, function (Astronomy) {
  'use strict';

  const DAY = 86400000;
  const STEMS = '甲乙丙丁戊己庚辛壬癸'.split('');
  const STEMS_KO = '갑을병정무기경신임계'.split('');
  const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('');
  const BRANCHES_KO = '자축인묘진사오미신유술해'.split('');
  const ANIMALS = '쥐 소 호랑이 토끼 용 뱀 말 양 원숭이 닭 개 돼지'.split(' ');
  const ELEMENTS = ['木', '火', '土', '金', '水'];
  const ELEMENTS_KO = ['목', '화', '토', '금', '수'];
  const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  // 지지의 본기(정기) 천간 — 십신 판단용 (子=癸, 午=丁, 巳=丙, 亥=壬)
  const BRANCH_MAIN_STEM = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];
  // 지장간 (여기 → 중기 → 정기)
  const HIDDEN = [[8, 9], [9, 7, 5], [4, 2, 0], [0, 1], [1, 9, 4], [4, 6, 2],
                  [2, 5, 3], [3, 1, 5], [4, 8, 6], [6, 7], [7, 3, 4], [4, 0, 8]];
  const TEN_GODS = [['비견', '겁재'], ['식신', '상관'], ['편재', '정재'], ['편관', '정관'], ['편인', '정인']];
  // 12운성: 일간별 장생 지지, 양간 순행 / 음간 역행
  const UNSEONG = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
  const JANGSAENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯
  // 24절기, 황경 0°(춘분)부터 15°씩
  const TERMS = ['춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로',
                 '추분', '한로', '상강', '입동', '소설', '대설', '동지', '소한', '대한', '입춘', '우수', '경칩'];

  const mod = (a, n) => ((a % n) + n) % n;

  // ---------- 날짜 유틸 ----------
  function jdn(y, m, d) {
    const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  function fromJdn(j) {
    const a = j + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
    const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153);
    return { year: 100 * b + d - 4800 + Math.floor(m / 10), month: m + 3 - 12 * Math.floor(m / 10), day: e - Math.floor((153 * m + 2) / 5) + 1 };
  }
  function fields(ms) { // ms를 '가상 UTC'로 읽어 연월일시분
    const d = new Date(ms);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
  }
  const pad = n => String(n).padStart(2, '0');
  const fmt = f => `${f.year}-${pad(f.month)}-${pad(f.day)} ${pad(f.hour)}:${pad(f.minute)}`;

  // 시간대 오프셋(ms) — 서머타임·표준시 변경 이력 포함
  function tzOffset(ms, tz) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(new Date(ms)).reduce((o, x) => (o[x.type] = x.value, o), {});
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return asUtc - Math.floor(ms / 1000) * 1000;
  }
  function wallToUtc(y, mo, d, h, mi, tz) {
    const guess = Date.UTC(y, mo - 1, d, h, mi);
    let utc = guess - tzOffset(guess, tz);
    utc = guess - tzOffset(utc, tz);
    return utc;
  }

  // ---------- 천문 ----------
  const sunLon = ms => Astronomy.SunPosition(new Date(ms)).elon;
  const searchSun = (lon, startMs, days) => Astronomy.SearchSunLongitude(lon, new Date(startMs), days).date.getTime();
  const searchNewMoon = (startMs, days) => Astronomy.SearchMoonPhase(0, new Date(startMs), days).date.getTime();

  function ganzhi(idx) {
    const s = mod(idx, 10), b = mod(idx, 12);
    return { index: mod(idx, 60), stem: s, branch: b, hanja: STEMS[s] + BRANCHES[b], hangul: STEMS_KO[s] + BRANCHES_KO[b] };
  }
  const gzIndex = (s, b) => mod(6 * s - 5 * b, 60);

  function tenGod(dayStem, stem) {
    const rel = mod(STEM_EL[stem] - STEM_EL[dayStem], 5);
    return TEN_GODS[rel][(dayStem % 2) === (stem % 2) ? 0 : 1];
  }
  function unseong(dayStem, branch) {
    const start = JANGSAENG[dayStem];
    const k = dayStem % 2 === 0 ? mod(branch - start, 12) : mod(start - branch, 12);
    return UNSEONG[k];
  }

  // ---------- 음력 (한국 기준) ----------
  function lunarTzHours(ms) { // 한국천문연구원 음력 기준: ~1912 동경 120°, 1954–1961 동경 127.5°, 그 외 135°
    if (ms < Date.UTC(1913, 0, 1)) return 8;
    if (ms >= Date.UTC(1954, 2, 21) && ms < Date.UTC(1961, 7, 10)) return 8.5;
    return 9;
  }
  function localDay(ms) { const f = fields(ms + lunarTzHours(ms) * 3600000); return jdn(f.year, f.month, f.day); }

  const cycleCache = new Map();
  // Y년 동지 달(11월)부터 Y+1년 동지 달 직전까지의 음력 달 목록
  function lunarCycle(Y) {
    if (cycleCache.has(Y)) return cycleCache.get(Y);
    const s1 = searchSun(270, Date.UTC(Y, 11, 1), 40), s2 = searchSun(270, Date.UTC(Y + 1, 11, 1), 40);
    const d1 = localDay(s1), d2 = localDay(s2);
    const moons = [];
    let t = s1 - 35 * DAY;
    while (true) {
      const nm = searchNewMoon(t, 40);
      moons.push(localDay(nm));
      if (localDay(nm) > d2) break;
      t = nm + DAY;
    }
    let i1 = -1, i2 = -1;
    moons.forEach((d, i) => { if (d <= d1) i1 = i; if (d <= d2) i2 = i; });
    const zq = [];
    let zt = s1 - DAY;
    for (let k = 0; k <= 13; k++) { const z = searchSun(mod(270 + 30 * k, 360), zt, 40); zq.push(localDay(z)); zt = z + DAY; }
    const count = i2 - i1, months = [];
    let label = 10, leapUsed = false;
    for (let i = i1; i < i2; i++) {
      const start = moons[i], end = moons[i + 1];
      const hasZq = zq.some(z => z >= start && z < end);
      let leap = false;
      if (count === 13 && !leapUsed && !hasZq) { leap = true; leapUsed = true; } else label = label % 12 + 1;
      months.push({ year: label >= 11 ? Y : Y + 1, month: label, leap, start, length: end - start });
    }
    cycleCache.set(Y, months);
    return months;
  }
  function lunarToSolar(ly, lm, ld, leap = false) {
    const months = lunarCycle(lm >= 11 ? ly : ly - 1);
    const m = months.find(x => x.year === ly && x.month === lm && x.leap === !!leap);
    if (!m) throw new Error(leap ? `${ly}년 음력 ${lm}월에는 윤달이 없습니다.` : '해당 음력 월을 찾을 수 없습니다.');
    if (ld < 1 || ld > m.length) throw new Error(`${ly}년 음력 ${leap ? '윤' : ''}${lm}월은 ${m.length}일까지입니다.`);
    return fromJdn(m.start + ld - 1);
  }
  function solarToLunar(y, mo, d) {
    const j = jdn(y, mo, d);
    for (const Y of [y - 1, y]) {
      for (const m of lunarCycle(Y)) if (j >= m.start && j < m.start + m.length) return { year: m.year, month: m.month, day: j - m.start + 1, leap: m.leap };
    }
    throw new Error('음력 변환 실패');
  }

  // ---------- 메인 계산 ----------
  /**
   * input: { calendar:'solar'|'lunar', year, month, day, leap?, hour?, minute?, gender:'M'|'F',
   *          tz='Asia/Seoul', longitude=126.98, latitude=37.57,
   *          timeMode='lmt'|'true'|'standard', ziMode='zi23'|'yaja' }
   */
  function compute(input) {
    const o = Object.assign({ calendar: 'solar', tz: 'Asia/Seoul', longitude: 126.98, latitude: 37.57, timeMode: 'lmt', ziMode: 'zi23', gender: 'M' }, input);
    let { year, month, day } = o;
    let lunar = null;
    if (o.calendar === 'lunar') {
      lunar = { year, month, day, leap: !!o.leap };
      ({ year, month, day } = lunarToSolar(year, month, day, o.leap));
    }
    // 시진만 아는 경우: hourBranch(0=자…11=해), lateZi=true면 자정 전 자시(야자시 구간)
    const branchMode = o.hourBranch !== null && o.hourBranch !== undefined && o.hourBranch !== '';
    const hasTime = branchMode || (o.hour !== null && o.hour !== undefined && o.hour !== '');
    const h = branchMode ? 0 : hasTime ? +o.hour : 12, mi = hasTime && !branchMode ? +(o.minute || 0) : 0;
    const utc = branchMode
      ? Date.UTC(year, month - 1, day, o.lateZi ? 23 : 2 * +o.hourBranch, o.lateZi ? 30 : 0) - o.longitude * 4 * 60000 // 시진 중앙의 평태양시
      : wallToUtc(year, month, day, h, mi, o.tz);
    const offsetMin = tzOffset(utc, o.tz) / 60000;

    // 보정된 현지시각 (시주·일주 판단용)
    let local;
    if (branchMode) local = utc + o.longitude * 4 * 60000;
    else if (o.timeMode === 'standard') local = Date.UTC(year, month - 1, day, h, mi);
    else {
      local = utc + o.longitude * 4 * 60000; // 평태양시
      if (o.timeMode === 'true') {
        const obs = new Astronomy.Observer(o.latitude, o.longitude, 0);
        const apparent = mod(Astronomy.HourAngle(Astronomy.Body.Sun, new Date(utc), obs) + 12, 24);
        const lf = fields(local), lmtH = lf.hour + lf.minute / 60 + new Date(local).getUTCSeconds() / 3600;
        local += Math.round((mod(apparent - lmtH + 12, 24) - 12) * 3600000); // 균시차 반영
      }
    }
    const lf = fields(local);

    // 연주 (입춘 기준)
    const Y = new Date(utc).getUTCFullYear();
    const lichun = searchSun(315, Date.UTC(Y, 0, 20), 30);
    const sajuYear = utc < lichun ? Y - 1 : Y;
    const yearP = ganzhi(sajuYear - 4);

    // 월주 (절 기준)
    const lon = sunLon(utc);
    const m = Math.floor(mod(lon - 315, 360) / 30); // 0 = 寅월
    const monthP = ganzhi(gzIndex(mod((yearP.stem % 5) * 2 + 2 + m, 10), mod(m + 2, 12)));

    // 일주
    let dayJ = jdn(lf.year, lf.month, lf.day);
    const lateZi = hasTime && lf.hour >= 23;
    if (lateZi && o.ziMode === 'zi23') dayJ += 1;
    const dayP = ganzhi(dayJ + 49);

    // 시주
    let hourP = null;
    if (hasTime) {
      const hb = Math.floor((lf.hour * 60 + lf.minute + 60) / 120) % 12;
      const stemBase = lateZi && o.ziMode === 'yaja' ? ganzhi(dayJ + 50).stem : dayP.stem; // 야자시: 다음날 일간으로 시간 결정
      hourP = ganzhi(gzIndex(mod((stemBase % 5) * 2 + hb, 10), hb));
    }

    const ds = dayP.stem;
    const decorate = (p, label, isDay) => p && Object.assign({}, p, {
      label,
      stemElement: STEM_EL[p.stem], branchElement: BRANCH_EL[p.branch],
      stemGod: isDay ? '일간' : tenGod(ds, p.stem),
      branchGod: tenGod(ds, BRANCH_MAIN_STEM[p.branch]),
      hidden: HIDDEN[p.branch].map(s => ({ stem: s, hanja: STEMS[s], hangul: STEMS_KO[s], god: tenGod(ds, s) })),
      unseong: unseong(ds, p.branch),
    });
    const pillars = { hour: decorate(hourP, '시주'), day: decorate(dayP, '일주', true), month: decorate(monthP, '월주'), year: decorate(yearP, '연주') };

    // 오행 분포
    const elements = [0, 0, 0, 0, 0];
    Object.values(pillars).forEach(p => { if (p) { elements[p.stemElement]++; elements[p.branchElement]++; } });
    const godsCount = {};
    Object.values(pillars).forEach(p => { if (p) { [p.stemGod, p.branchGod].forEach(g => { if (g !== '일간') godsCount[g] = (godsCount[g] || 0) + 1; }); } });

    // 대운
    const yang = yearP.stem % 2 === 0;
    const forward = (o.gender === 'M') === yang;
    const target = forward ? mod(315 + 30 * (m + 1), 360) : mod(315 + 30 * m, 360);
    const jeol = forward ? searchSun(target, utc, 40) : searchSun(target, utc - 40 * DAY, 40);
    const days = Math.abs(jeol - utc) / DAY;
    const startAge = Math.max(1, Math.round(days / 3));
    const daeun = [];
    for (let k = 1; k <= 10; k++) {
      const g = ganzhi(monthP.index + (forward ? k : -k));
      daeun.push(Object.assign(g, { age: startAge + 10 * (k - 1), stemGod: tenGod(ds, g.stem), branchGod: tenGod(ds, BRANCH_MAIN_STEM[g.branch]), unseong: unseong(ds, g.branch) }));
    }

    // 직전·다음 절기 (경계 근처 경고용)
    const termIdx = Math.floor(lon / 15);
    const prevTerm = searchSun(termIdx * 15, utc - 17 * DAY, 17);
    const nextTerm = searchSun(mod((termIdx + 1) * 15, 360), utc, 17);
    const warnings = [];
    if (!hasTime) warnings.push('출생 시간을 몰라 시주를 제외했습니다.');
    if (!hasTime && (utc - prevTerm < DAY || nextTerm - utc < DAY)) warnings.push('절기가 바뀌는 날이라 출생 시간에 따라 월주·연주가 달라질 수 있습니다.');
    if (hasTime && lateZi) warnings.push(o.ziMode === 'zi23' ? '23시 이후 출생: 다음날 일주를 적용했습니다(자시 기준). 야자시 설정 시 일주가 바뀝니다.' : '야자시 적용: 당일 일주를 유지했습니다.');
    if (Math.abs((utc - prevTerm) / 3600000) < 2 || Math.abs((nextTerm - utc) / 3600000) < 2) warnings.push('절기 전환 2시간 이내 출생: 출생 시각이 조금만 달라도 월주가 바뀔 수 있습니다.');

    const tf = ms => fmt(fields(ms + offsetMin * 60000));
    return {
      input: o,
      solar: { year, month, day },
      lunar: lunar || (() => { try { return solarToLunar(year, month, day); } catch (e) { return null; } })(),
      utc: new Date(utc).toISOString(),
      utcOffsetMinutes: offsetMin,
      correctedTime: hasTime && !branchMode ? fmt(lf) : null,
      hourBranchOnly: branchMode,
      sajuYear, animal: ANIMALS[yearP.branch],
      pillars, elements, godsCount,
      daeun: { forward, startAge, daysToJeol: days, list: daeun },
      terms: { prev: { name: TERMS[termIdx], time: tf(prevTerm) }, next: { name: TERMS[mod(termIdx + 1, 24)], time: tf(nextTerm) } },
      warnings,
    };
  }

  // ---------- 합·충·형·해·원진 ----------
  const pairKey = (a, b) => a < b ? a * 12 + b : b * 12 + a;
  const PAIRS = l => new Set(l.map(([a, b]) => pairKey(a, b)));
  const YUKHAP = PAIRS([[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]);
  const WONJIN = PAIRS([[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]]);
  const HAE = PAIRS([[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]]);
  const HYEONG = PAIRS([[2, 5], [5, 8], [2, 8], [1, 10], [7, 10], [1, 7], [0, 3]]);
  const SELF_HYEONG = new Set([4, 6, 9, 11]);
  const SAMHAP = [[8, 0, 4, '수'], [11, 3, 7, '목'], [2, 6, 10, '화'], [5, 9, 1, '금']];
  const WANGJI = new Set([0, 3, 6, 9]);
  const YUKHAP_EL = { [pairKey(0, 1)]: '토', [pairKey(2, 11)]: '목', [pairKey(3, 10)]: '화', [pairKey(4, 9)]: '금', [pairKey(5, 8)]: '수', [pairKey(6, 7)]: '화·토' };
  const STEMHAP_EL = ['토', '금', '수', '목', '화'];

  /** 두 지지 사이의 관계 목록 */
  function branchRelations(a, b) {
    const k = pairKey(a, b), out = [];
    if (YUKHAP.has(k)) out.push({ type: '육합', good: true, note: `${YUKHAP_EL[k]} 기운으로 묶임` });
    for (const g of SAMHAP) if (a !== b && g.slice(0, 3).includes(a) && g.slice(0, 3).includes(b) && (WANGJI.has(a) || WANGJI.has(b))) out.push({ type: '반합', good: true, note: `${g[3]} 기운으로 모임` });
    if (mod(a - b, 12) === 6) out.push({ type: '충', good: false, note: '정면으로 부딪힘' });
    if (WONJIN.has(k)) out.push({ type: '원진', good: false, note: '이유 없이 서운함이 쌓이기 쉬움' });
    if (HYEONG.has(k)) out.push({ type: '형', good: false, note: '날카롭게 다투기 쉬움' });
    if (a === b && SELF_HYEONG.has(a)) out.push({ type: '자형', good: false, note: '같은 성향끼리 부딪힘' });
    if (HAE.has(k)) out.push({ type: '해', good: false, note: '은근히 방해가 됨' });
    return out;
  }
  const JOSA_I = ['이', '가', '가', '이', '가'], JOSA_EUL = ['을', '를', '를', '을', '를'];
  const gen = (x, y) => `${ELEMENTS_KO[x]}${JOSA_I[x]} ${ELEMENTS_KO[y]}${JOSA_EUL[y]}`;
  /** 두 천간의 관계 */
  function stemRelation(a, b) {
    if (mod(a - b, 10) === 5) return { type: '천간합', good: true, note: `${STEMHAP_EL[Math.min(a, b) % 5]} 기운으로 합` };
    if (Math.min(a, b) < 4 && Math.abs(a - b) === 6) return { type: '천간충', good: false, note: '정면으로 부딪힘' };
    const ea = STEM_EL[a], eb = STEM_EL[b];
    if (ea === eb) return { type: '비화', good: null, note: '같은 오행' };
    if (mod(eb - ea, 5) === 1) return { type: '상생', good: true, note: `${gen(ea, eb)} 생함` };
    if (mod(ea - eb, 5) === 1) return { type: '상생', good: true, note: `${gen(eb, ea)} 생함` };
    return { type: '상극', good: false, note: mod(eb - ea, 5) === 2 ? `${gen(ea, eb)} 극함` : `${gen(eb, ea)} 극함` };
  }

  // ---------- 궁합 ----------
  /**
   * 두 명식(compute 결과)의 궁합. 점수는 전통 궁합 요소를 가중합한 참고 지표(40~98).
   */
  function compat(A, B) {
    const items = [];
    let score = 62;
    const add = (area, rel, pts, desc) => { items.push({ area, type: rel.type, good: rel.good, note: rel.note, points: pts, desc }); score += pts; };

    // 1) 일간 (서로의 본성)
    const sr = stemRelation(A.pillars.day.stem, B.pillars.day.stem);
    const srPts = { 천간합: 12, 상생: 6, 비화: 2, 상극: -4, 천간충: -7 }[sr.type];
    add('일간', sr, srPts, { 천간합: '서로 끌리고 자연스럽게 하나가 되려는 조합', 상생: '한쪽이 다른 쪽을 북돋워 주는 조합', 비화: '가치관이 비슷해 친구 같은 조합', 상극: '한쪽이 다른 쪽을 누르기 쉬워 배려가 필요한 조합', 천간충: '기질이 정반대라 부딪히지만 자극도 큰 조합' }[sr.type]);

    // 2) 일지 (배우자궁)
    const dA = A.pillars.day.branch, dB = B.pillars.day.branch;
    const dr = branchRelations(dA, dB);
    const W = { 육합: 10, 반합: 6, 충: -10, 원진: -6, 형: -5, 자형: -3, 해: -3 };
    if (dr.length) dr.forEach(r => add('일지(배우자궁)', r, W[r.type], r.good ? '생활 리듬과 정서가 잘 맞물림' : '가까이 지낼수록 마찰이 생길 수 있는 지점'));
    else items.push({ area: '일지(배우자궁)', type: '무관', good: null, note: '특별한 합충 없음', points: 0, desc: '무난한 관계' });

    // 3) 띠 (연지)
    const yr = branchRelations(A.pillars.year.branch, B.pillars.year.branch);
    const WY = { 육합: 4, 반합: 3, 충: -4, 원진: -3, 형: -2, 자형: -1, 해: -1 };
    yr.forEach(r => add('띠', r, WY[r.type], r.good ? '집안·사회적 배경의 조화' : '주변 환경에서 오는 마찰'));

    // 4) 오행 보완
    let comp = 0; const complements = [];
    for (let e = 0; e < 5; e++) {
      if (A.elements[e] === 0 && B.elements[e] >= 2) { complements.push({ from: 'B', to: 'A', element: e }); comp += 4; }
      if (B.elements[e] === 0 && A.elements[e] >= 2) { complements.push({ from: 'A', to: 'B', element: e }); comp += 4; }
    }
    comp = Math.min(comp, 12);
    if (complements.length) { items.push({ area: '오행 보완', type: '보완', good: true, note: complements.map(c => `${c.from === 'A' ? '내가' : '상대가'} ${ELEMENTS_KO[c.element]} 기운을 채워 줌`).join(', '), points: comp, desc: '부족한 기운을 서로 채워 주는 관계' }); score += comp; }

    // 5) 배우자성: 상대 일간이 나에게 어떤 십신인가
    const godAB = tenGod(A.pillars.day.stem, B.pillars.day.stem), godBA = tenGod(B.pillars.day.stem, A.pillars.day.stem);
    const spouseStar = (me, god) => (me.input.gender === 'M' ? ['정재', '편재'] : ['정관', '편관']).includes(god);
    let sp = 0;
    if (spouseStar(A, godAB)) sp += 3; if (spouseStar(B, godBA)) sp += 3;
    if (sp) { items.push({ area: '배우자성', type: '배우자성', good: true, note: '상대 일간이 전통적인 배우자의 별에 해당', points: sp, desc: '서로를 짝으로 인식하기 쉬운 관계' }); score += sp; }

    score = Math.max(40, Math.min(98, Math.round(score)));
    const tier = score >= 85 ? '천생연분' : score >= 75 ? '잘 맞는 사이' : score >= 65 ? '노력하면 좋은 사이' : score >= 55 ? '서로 배울 게 많은 사이' : '맞춰 가는 과정이 필요한 사이';
    return { score, tier, items, complements, godAtoB: godAB, godBtoA: godBA };
  }

  // ---------- 세운·월운 ----------
  /** year년 세운과 월운 (월운 기간은 절기 시각, tz 표기) */
  function yearFortune(R, year, tz = R.input.tz || 'Asia/Seoul') {
    const ds = R.pillars.day.stem;
    const yp = ganzhi(year - 4);
    const toPillars = (b) => ['year', 'month', 'day', 'hour'].filter(k => R.pillars[k]).map(k => ({ pillar: R.pillars[k].label, branch: R.pillars[k].branch, relations: branchRelations(b, R.pillars[k].branch) })).filter(x => x.relations.length);
    const stemRel = ['year', 'month', 'day', 'hour'].filter(k => R.pillars[k]).map(k => ({ pillar: R.pillars[k].label, rel: stemRelation(yp.stem, R.pillars[k].stem) })).filter(x => x.rel.type === '천간합' || x.rel.type === '천간충');
    const birth = R.solar;
    const age = year - birth.year; // 해당 연도 생일 이후 만 나이
    const daeun = R.daeun.list.find(d => age >= d.age && age < d.age + 10) || null;
    const months = [];
    let t = searchSun(315, Date.UTC(year, 0, 20), 30);
    for (let m = 0; m < 12; m++) {
      const next = searchSun(mod(315 + 30 * (m + 1), 360), t + DAY, 40);
      const p = ganzhi(gzIndex(mod((yp.stem % 5) * 2 + 2 + m, 10), mod(m + 2, 12)));
      const off = ms => fields(ms + tzOffset(ms, tz));
      months.push(Object.assign(p, {
        order: m + 1, start: off(t), end: off(next - 60000), term: TERMS[mod(21 + 2 * m, 24)],
        stemGod: tenGod(ds, p.stem), branchGod: tenGod(ds, BRANCH_MAIN_STEM[p.branch]), unseong: unseong(ds, p.branch),
        dayRelations: branchRelations(p.branch, R.pillars.day.branch),
      }));
      t = next;
    }
    return {
      year, pillar: Object.assign({}, yp, { stemGod: tenGod(ds, yp.stem), branchGod: tenGod(ds, BRANCH_MAIN_STEM[yp.branch]), unseong: unseong(ds, yp.branch), stemElement: STEM_EL[yp.stem], branchElement: BRANCH_EL[yp.branch] }),
      branchRelations: toPillars(yp.branch), stemRelations: stemRel, daeun, ageInYear: age, months,
    };
  }

  // ---------- 일진 ----------
  /** 특정 양력 날짜(y,m,d)의 일진과 원국 관계 */
  function dayFortune(R, y, m, d) {
    const ds = R.pillars.day.stem;
    const p = ganzhi(jdn(y, m, d) + 49);
    const branches = ['year', 'month', 'day', 'hour'].filter(k => R.pillars[k]).map(k => ({ pillar: R.pillars[k].label, relations: branchRelations(p.branch, R.pillars[k].branch) })).filter(x => x.relations.length);
    return Object.assign(p, {
      date: { year: y, month: m, day: d }, stemElement: STEM_EL[p.stem], branchElement: BRANCH_EL[p.branch],
      stemGod: tenGod(ds, p.stem), branchGod: tenGod(ds, BRANCH_MAIN_STEM[p.branch]), unseong: unseong(ds, p.branch),
      stemRelation: stemRelation(p.stem, ds), dayBranchRelations: branchRelations(p.branch, R.pillars.day.branch), branchRelations: branches,
    });
  }

  return { compute, compat, yearFortune, dayFortune, branchRelations, stemRelation, lunarToSolar, solarToLunar, ganzhi, tenGod, wallToUtc, sunLon,
           STEMS, STEMS_KO, BRANCHES, BRANCHES_KO, ELEMENTS, ELEMENTS_KO, STEM_EL, BRANCH_EL, TERMS, jdn, fromJdn };
});
