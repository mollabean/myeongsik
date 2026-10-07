/*
 * 브라우저와 서버가 함께 쓰는 입력 정의: 출생지, 시진, 프로필 → 계산 입력 변환, 입력 검증.
 * Node: require('./shared.js')   Browser: window.Shared
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Shared = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // [이름, 경도, 위도]
  const PLACES = [['서울', 126.98, 37.57], ['부산', 129.08, 35.18], ['대구', 128.60, 35.87], ['인천', 126.70, 37.46], ['광주', 126.85, 35.16], ['대전', 127.38, 36.35],
    ['울산', 129.31, 35.54], ['수원', 127.03, 37.26], ['춘천', 127.73, 37.88], ['청주', 127.49, 36.64], ['전주', 127.15, 35.82], ['포항', 129.37, 36.02],
    ['창원', 128.68, 35.23], ['강릉', 128.88, 37.75], ['제주', 126.53, 33.50]];

  // [지지, 라벨, 서울 기준 대략적인 시계 시각, 자정 전 자시 여부]
  const SIJIN = [[0, '자시', '00:00–01:30', false], [1, '축시', '01:30–03:30'], [2, '인시', '03:30–05:30'], [3, '묘시', '05:30–07:30'], [4, '진시', '07:30–09:30'], [5, '사시', '09:30–11:30'],
    [6, '오시', '11:30–13:30'], [7, '미시', '13:30–15:30'], [8, '신시', '15:30–17:30'], [9, '유시', '17:30–19:30'], [10, '술시', '19:30–21:30'], [11, '해시', '21:30–23:30'], [0, '자시(밤)', '23:30–24:00', true]];

  const cleanName = s => String(s || '').replace(/[\u0000-\u001f\u007f"'`<>{}\[\]\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);

  /**
   * 프로필 검증. 올바르면 정리된 프로필을, 아니면 Error를 던진다.
   * 프로필 형식: { name, gender:'M'|'F', cal:'solar'|'lunar', year, month, day, leap,
   *               timeKind:'exact'|'sijin'|'none', time:'HH:MM', sijin:0~12, place:0~14, timeMode, ziMode }
   */
  function validateProfile(p) {
    if (!p || typeof p !== 'object') throw new Error('생년월일 정보가 없습니다.');
    const int = (v, lo, hi, what) => { const n = Number(v); if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`${what} 값이 올바르지 않습니다.`); return n; };
    const one = (v, list, what) => { if (!list.includes(v)) throw new Error(`${what} 값이 올바르지 않습니다.`); return v; };
    const out = {
      name: cleanName(p.name),
      gender: one(p.gender, ['M', 'F'], '성별'),
      cal: one(p.cal, ['solar', 'lunar'], '달력'),
      year: int(p.year, 1900, 2100, '연도'), month: int(p.month, 1, 12, '월'), day: int(p.day, 1, 31, '일'),
      leap: p.cal === 'lunar' && p.leap === true,
      timeKind: one(p.timeKind, ['exact', 'sijin', 'none'], '시간 방식'),
      time: '', sijin: 0,
      place: int(p.place, 0, PLACES.length - 1, '출생지'),
      timeMode: one(p.timeMode || 'lmt', ['lmt', 'true', 'standard'], '시간 보정'),
      ziMode: one(p.ziMode || 'zi23', ['zi23', 'yaja'], '자시 처리'),
    };
    if (out.timeKind === 'exact') {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(p.time || ''));
      if (!m || +m[1] > 23 || +m[2] > 59) throw new Error('출생 시각이 올바르지 않습니다.');
      out.time = `${m[1].padStart(2, '0')}:${m[2]}`;
    }
    if (out.timeKind === 'sijin') out.sijin = int(p.sijin, 0, SIJIN.length - 1, '시진');
    return out;
  }

  /** 프로필 → Saju.compute 입력 */
  function toInput(p) {
    const pl = PLACES[p.place] || PLACES[0];
    const o = { calendar: p.cal, leap: p.cal === 'lunar' && !!p.leap, year: p.year, month: p.month, day: p.day, gender: p.gender,
      longitude: pl[1], latitude: pl[2], placeName: pl[0], timeMode: p.timeMode, ziMode: p.ziMode, name: p.name, tz: 'Asia/Seoul' };
    if (p.timeKind === 'exact' && p.time) { const [h, m] = p.time.split(':').map(Number); o.hour = h; o.minute = m; }
    else if (p.timeKind === 'sijin') { const s = SIJIN[p.sijin]; o.hourBranch = s[0]; o.lateZi = !!s[3]; }
    return o;
  }

  /** 한국 시간 기준 오늘 날짜 */
  function todayKST(now = new Date()) {
    const k = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })
      .formatToParts(now).reduce((o, x) => (o[x.type] = x.value, o), {});
    return { year: +k.year, month: +k.month, day: +k.day, weekday: { Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토' }[k.weekday] };
  }

  const READING_KINDS = {
    today: ['today'],
    saju: ['total', 'nature', 'work', 'love'],
    gung: ['total', 'style', 'conflict', 'long'],
    year: ['total', 'love', 'work', 'money'],
  };

  return { PLACES, SIJIN, cleanName, validateProfile, toInput, todayKST, READING_KINDS, YEAR: 2027 };
});
