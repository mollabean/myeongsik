(() => {
  const $ = s => document.querySelector(s);
  const S = window.Saju;
  const EL = ['木', '火', '土', '金', '水'], ELK = ['목', '화', '토', '금', '수'];
  const YEAR = 2027;
  const { PLACES, SIJIN } = window.Shared;
  const DM_TEXT = ['곧게 뻗는 큰 나무. 앞장서고 원칙을 지키려는 성향', '덩굴과 화초. 유연하게 적응하며 관계를 잘 엮는 성향', '한낮의 태양. 밝고 솔직하며 드러내는 성향',
    '촛불과 등불. 섬세하고 따뜻하게 곁을 밝히는 성향', '큰 산과 대지. 묵직하고 포용력 있는 성향', '논밭의 흙. 실속 있고 사람을 길러 내는 성향',
    '바위와 원석. 결단력 있고 의리를 중시하는 성향', '다듬어진 보석. 예리하고 완성도를 추구하는 성향', '큰 강과 바다. 생각이 넓고 흐름을 읽는 성향', '비와 이슬. 조용히 스며들며 감수성이 깊은 성향'];
  const GOD_DAY = {
    비견: ['주관·동료', '내 뜻대로 밀고 나가기 좋은 날', '고집이 세 보일 수 있어요'], 겁재: ['경쟁·속도', '빠르게 결정하고 움직이기 좋은 날', '충동 지출과 승부욕을 조절하세요'],
    식신: ['여유·표현', '하고 싶은 일을 즐겁게 풀어내기 좋은 날', '느긋함이 미루기로 바뀌지 않게'], 상관: ['아이디어·말', '새로운 생각과 표현이 잘 나오는 날', '말이 앞서지 않게, 윗사람과는 말조심'],
    편재: ['활동·기회', '사람을 만나고 기회를 넓히기 좋은 날', '큰돈이 오가는 결정은 한 번 더 확인'], 정재: ['성실·정리', '할 일과 돈을 꼼꼼히 정리하기 좋은 날', '너무 계산적으로 보이지 않게'],
    편관: ['압박·추진', '어려운 일을 정면으로 돌파하기 좋은 날', '무리한 일정과 예민함을 조심'], 정관: ['책임·인정', '맡은 일을 반듯하게 해내면 인정받는 날', '틀에 갇혀 답답해하지 않게'],
    편인: ['직관·몰입', '혼자 깊이 생각하고 공부하기 좋은 날', '생각이 많아 결정을 미루지 않게'], 정인: ['배움·도움', '도움을 받거나 배우기 좋은 날', '받는 데 익숙해져 기대지 않게'],
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hasB = w => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const jo = (w, a, b) => w + (hasB(w) ? a : b);
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  // 오늘 (한국 시간)
  const TODAY = window.Shared.todayKST();
  const WD = TODAY.weekday;

  // ----- 프로필 -----
  const EX_A = { name: '', gender: 'F', cal: 'solar', year: 1992, month: 3, day: 8, leap: false, timeKind: 'exact', time: '07:20', sijin: 4, place: 0, timeMode: 'lmt', ziMode: 'zi23' };
  const EX_B = { name: '', gender: 'M', cal: 'solar', year: 1990, month: 11, day: 21, leap: false, timeKind: 'sijin', time: '', sijin: 11, place: 1, timeMode: 'lmt', ziMode: 'zi23' };
  const st = { a: store.get('saju.me'), b: store.get('saju.partner'), A: null, B: null, compat: null, fortune: null, today: null };
  const exA = !st.a, exB = !st.b;
  st.exA = exA; st.exB = exB;
  if (!st.a) st.a = { ...EX_A };
  if (!st.b) st.b = { ...EX_B };

  const toInput = p => window.Shared.toInput(p);
  const timeLabel = p => p.timeKind === 'exact' ? p.time : p.timeKind === 'sijin' ? SIJIN[p.sijin][1] : '시간 모름';
  const dateLabel = p => `${p.cal === 'lunar' ? '음 ' : ''}${p.year}.${p.month}.${p.day}${p.cal === 'lunar' && p.leap ? '(윤)' : ''}`;
  const nameA = () => st.a.name || '나', nameB = () => st.b.name || '상대';

  function recompute() {
    st.A = S.compute(toInput(st.a));
    st.B = S.compute(toInput(st.b));
    st.compat = S.compat(st.A, st.B);
    st.fortune = S.yearFortune(st.A, YEAR);
    st.today = S.dayFortune(st.A, TODAY.year, TODAY.month, TODAY.day);
    renderAll();
  }

  // ----- 렌더 -----
  const ageNow = s => { let a = TODAY.year - s.year; if (TODAY.month < s.month || (TODAY.month === s.month && TODAY.day < s.day)) a--; return a; };
  const ORDER = [['hour', '시주'], ['day', '일주'], ['month', '월주'], ['year', '연주']];

  function renderAll() {
    $('#profileTxt').innerHTML = `${st.exA ? '<span class="tag-ex">예시</span> ' : ''}${esc(nameA())} · ${dateLabel(st.a)} · ${st.a.gender === 'M' ? '남' : '여'}`;
    renderToday(); renderSaju(); renderGung(); renderYear();
  }

  function renderToday() {
    const t = st.today, A = st.A, g = GOD_DAY[t.stemGod];
    $('#todayDate').textContent = `${TODAY.month}월 ${TODAY.day}일 ${WD}요일`;
    const rels = [...(t.stemRelation.type === '천간합' || t.stemRelation.type === '천간충' ? [{ t: `내 일간과 ${t.stemRelation.type}`, good: t.stemRelation.good }] : []),
      ...t.branchRelations.flatMap(x => x.relations.map(r => ({ t: `${x.pillar} ${r.type}`, good: r.good })))];
    $('#todayCard').innerHTML = `<div class="today-top">
        <div class="gz-big"><span class="t el-${t.stemElement}">${S.STEMS[t.stem]}</span><span class="t el-${t.branchElement}">${S.BRANCHES[t.branch]}</span></div>
        <div><span class="label">${t.hangul}일 · ${t.stemGod}의 날</span><p class="today-head">${g[1]}</p></div></div>
      <dl class="dodont"><div><dt>키워드</dt><dd>${g[0]} · ${t.branchGod}</dd></div><div><dt>살필 점</dt><dd>${g[2]}</dd></div></dl>
      ${rels.length ? `<div class="chips">${rels.map(r => `<span class="chip ${r.good ? 'good' : 'bad'}">${esc(r.t)}</span>`).join('')}</div>` : ''}
      <button class="btn sec-btn" type="button" data-read="today">AI 오늘 한마디${aiReady === false ? ' (준비 중)' : ''}</button>`;
    const dm = A.pillars.day;
    $('#meCard').innerHTML = `<span class="hj big el-${dm.stemElement}">${S.STEMS[dm.stem]}</span>
      <div><span class="label">나의 일간 · ${S.STEMS_KO[dm.stem]}${ELK[dm.stemElement]}</span><p style="margin:2px 0 0">${DM_TEXT[dm.stem]}</p></div>`;
    const c = st.compat, yp = st.fortune.pillar;
    $('#promo').innerHTML = `<button class="card" type="button" data-go="gung"><span class="label">궁합${st.exB ? ' · 예시' : ''}</span><span class="v">${c.score}<small>점</small></span><span class="d">${esc(jo(nameB(), '과', '와'))} ${c.tier}</span></button>
      <button class="card" type="button" data-go="year"><span class="label">2027 신년운세</span><span class="v"><span class="el-${yp.stemElement}" style="color:var(--el)">${S.STEMS[yp.stem]}</span><span class="el-${yp.branchElement}" style="color:var(--el)">${S.BRANCHES[yp.branch]}</span><small> 정미년</small></span><span class="d">${yp.stemGod}·${yp.branchGod}의 해</span></button>`;
  }

  function renderSaju() {
    const r = st.A, P = r.pillars, dm = P.day;
    $('#sajuHero').innerHTML = `<div class="dm el-${dm.stemElement}">${S.STEMS[dm.stem]}</div>
      <div><p class="line1">${jo(esc(nameA()), '은', '는')} ${S.STEMS_KO[dm.stem]}${ELK[dm.stemElement]} 일간</p><p class="line2">${P.year.hangul}년생 ${r.animal}띠 · ${DM_TEXT[dm.stem].split('.')[0]}</p></div>`;
    const lu = r.lunar ? `${r.lunar.year}.${r.lunar.leap ? '윤' : ''}${r.lunar.month}.${r.lunar.day}` : '';
    const off = r.utcOffsetMinutes;
    const items = [['양력', `${r.solar.year}.${r.solar.month}.${r.solar.day}`], ['음력', lu], ['시간', timeLabel(st.a)], ['출생지', r.input.placeName]];
    if (off === 600 || off === 570) items.push(['당시', '서머타임']);
    if (off === 510) items.push(['당시 표준시', 'UTC+8:30']);
    $('#sajuMeta').innerHTML = items.filter(x => x[1]).map(([k, v]) => `<span>${k} <b>${esc(v)}</b></span>`).join('');
    $('#warns').innerHTML = r.warnings.filter(w => !/시주를 제외/.test(w)).map(w => `<li>${esc(w)}</li>`).join('');
    $('#pillars').innerHTML = ORDER.map(([k, l]) => {
      const p = P[k];
      if (!p) return `<div class="col"><span class="h">${l}</span><span class="g"></span><div class="tile empty"><span class="s">모름</span></div><div class="tile empty"><span class="s">–</span></div><span class="g"></span></div>`;
      return `<div class="col"><span class="h">${l}</span><span class="g ${k === 'day' ? 'me' : ''}">${k === 'day' ? '나' : p.stemGod}</span>
        <div class="tile el-${p.stemElement} ${k === 'day' ? 'day' : ''}"><span class="c">${S.STEMS[p.stem]}</span><span class="s">${S.STEMS_KO[p.stem]}${ELK[p.stemElement]}</span></div>
        <div class="tile el-${p.branchElement}"><span class="c">${S.BRANCHES[p.branch]}</span><span class="s">${S.BRANCHES_KO[p.branch]}${ELK[p.branchElement]}</span></div>
        <span class="g">${p.branchGod}</span></div>`;
    }).join('');
    $('#detailGrid').innerHTML = '<span></span>' + ORDER.map(([, l]) => `<span class="muted">${l}</span>`).join('')
      + '<span class="rh">지장간</span>' + ORDER.map(([k]) => P[k] ? `<span class="hs">${P[k].hidden.map(x => `<span class="el-${S.STEM_EL[x.stem]}">${x.hanja}</span>`).join('')}</span>` : '<span>–</span>').join('')
      + '<span class="rh">12운성</span>' + ORDER.map(([k]) => `<span>${P[k] ? P[k].unseong : '–'}</span>`).join('');
    const mx = Math.max(4, ...r.elements);
    $('#bars').innerHTML = r.elements.map((n, i) => `<div class="bar el-${i}"><span class="n0"><b>${EL[i]}</b> ${ELK[i]}</span><span class="track"><span class="fill" style="width:${n / mx * 100}%"></span></span><span class="n">${n}</span></div>`).join('');
    const max = Math.max(...r.elements), many = r.elements.map((n, i) => n === max && n >= 3 ? ELK[i] : null).filter(Boolean), none = r.elements.map((n, i) => n === 0 ? ELK[i] : null).filter(Boolean);
    $('#elNote').textContent = [many.length ? `${many.join('·')} 기운이 많고` : '', none.length ? `${none.join('·')} 기운이 없습니다.` : '빠진 오행 없이 고루 있습니다.'].filter(Boolean).join(' ') + (P.hour ? '' : ' (시주 제외 6글자 기준)');
    $('#gods').innerHTML = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'].map(g => `<span class="chip">${g}<b>${r.godsCount[g] || 0}</b></span>`).join('');
    const age = ageNow(r.solar);
    $('#daeunTag').textContent = `${r.daeun.forward ? '순행' : '역행'} · 대운수 ${r.daeun.startAge}`;
    $('#daeun').innerHTML = r.daeun.list.map(d => { const now = age >= d.age && age < d.age + 10;
      return `<div class="du ${now ? 'now' : ''}"${now ? ' data-now' : ''}><span class="age">${d.age}세</span><span class="nt">${now ? '지금' : ''}</span><span class="c el-${S.STEM_EL[d.stem]}">${S.STEMS[d.stem]}</span><span class="c el-${S.BRANCH_EL[d.branch]}">${S.BRANCHES[d.branch]}</span><span class="gg">${d.stemGod}·${d.branchGod}</span></div>`; }).join('');
  }

  function miniPillars(R, who) {
    const t = (p, k, s) => p ? `<span class="el-${s ? p.stemElement : p.branchElement} ${k === 'day' ? 'day' : ''}">${s ? S.STEMS[p.stem] : S.BRANCHES[p.branch]}</span>` : '<span class="e">?</span>';
    return `<div class="mini"><span class="who">${esc(who)}</span><div class="mini-row">${ORDER.map(([k]) => t(R.pillars[k], k, true)).join('')}</div><div class="mini-row">${ORDER.map(([k]) => t(R.pillars[k], k, false)).join('')}</div></div>`;
  }
  function renderGung() {
    const { A, B, compat: c } = st, an = nameA(), bn = nameB();
    const pp = (p, R, who, key, ex) => `<button class="person" type="button" data-edit="${key}"><span class="nm">${ex ? '<span class="tag-ex">예시</span> ' : ''}${esc(who)}</span><span class="sm">${dateLabel(p)} · ${R.animal}띠</span><span class="sm">${S.STEMS[R.pillars.day.stem]}${EL[R.pillars.day.stemElement]} 일간 · 수정</span></button>`;
    $('#couple').innerHTML = pp(st.a, A, an, 'a', st.exA) + '<span class="x">×</span>' + pp(st.b, B, bn, 'b', st.exB);
    const C = 2 * Math.PI * 52;
    $('#score').innerHTML = `<div class="ring" role="img" aria-label="궁합 점수 ${c.score}점"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" stroke-width="9"/>
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - c.score / 100)}"/></svg>
        <div class="num"><b>${c.score}</b><small>/ 100</small></div></div>
      <div class="tier">${c.tier}</div>
      <p class="gl" style="margin:0">${esc(an)}에게 ${esc(bn)}의 일간은 <b>${c.godAtoB}</b>, ${esc(bn)}에게 ${esc(an)}의 일간은 <b>${c.godBtoA}</b>입니다.</p>`;
    $('#pair').innerHTML = miniPillars(A, an) + miniPillars(B, bn);
    $('#reasons').innerHTML = c.items.map(i => `<li><span class="ar">${i.area}</span><span class="wt"><b>${i.type}</b>${esc(i.note)}</span><span class="ds">${esc(i.desc)}</span>
      <span class="pt ${i.points > 0 ? 'good' : i.points < 0 ? 'bad' : ''}">${i.points > 0 ? '+' : ''}${i.points}</span></li>`).join('');
    const mx = Math.max(4, ...A.elements, ...B.elements);
    $('#cmp').innerHTML = `<div class="cmp-h"><span>${esc(an)}</span><span></span><span>${esc(bn)}</span></div>` + [0, 1, 2, 3, 4].map(e => `<div class="cmp-r el-${e}">
      <span class="s l"><i style="width:${A.elements[e] / mx * 80}%"></i>${A.elements[e]}</span><span class="e">${EL[e]}${ELK[e]}</span><span class="s"><i style="width:${B.elements[e] / mx * 80}%"></i>${B.elements[e]}</span></div>`).join('');
    $('#cmpNote').textContent = c.complements.length ? c.complements.map(x => `${jo(x.from === 'A' ? an : bn, '이', '가')} ${x.from === 'A' ? bn : an}에게 없는 ${ELK[x.element]} 기운을 채워 줍니다.`).join(' ') : '서로 비어 있는 기운을 크게 채워 주는 조합은 아닙니다.';
  }

  function renderYear() {
    const f = st.fortune, p = f.pillar;
    const rels = [...f.stemRelations.map(x => ({ t: `${x.pillar} ${x.rel.type}`, good: x.rel.good })), ...f.branchRelations.flatMap(x => x.relations.map(r => ({ t: `${x.pillar} ${r.type}`, good: r.good })))];
    $('#yearHero').innerHTML = `<div class="top2"><div class="gz-big"><span class="t el-${p.stemElement}">${S.STEMS[p.stem]}</span><span class="t el-${p.branchElement}">${S.BRANCHES[p.branch]}</span></div>
        <div><span class="label">${YEAR} 정미년 · 붉은 양의 해</span><p class="lead">${jo(p.stemGod, '과', '와')} ${p.branchGod}의 해, 12운성 ${p.unseong}</p></div></div>
      ${rels.length ? `<div class="chips">${rels.map(r => `<span class="chip ${r.good ? 'good' : 'bad'}">${esc(r.t)}</span>`).join('')}</div>` : ''}
      <div class="meta"><span>그해 대운 <b>${f.daeun ? f.daeun.hangul + ' · ' + f.daeun.stemGod + '·' + f.daeun.branchGod : '대운 전'}</b></span><span>만 나이 <b>${f.ageInYear - 1}~${f.ageInYear}세</b></span></div>`;
    const cls = m => { const g = m.dayRelations.some(r => r.good), b = m.dayRelations.some(r => r.good === false); return b ? 'bad' : g ? 'good' : ''; };
    const mname = m => `${S.BRANCHES_KO[m.branch]}월`;
    const goods = f.months.filter(m => cls(m) === 'good'), bads = f.months.filter(m => cls(m) === 'bad');
    const mlabel = m => `${m.start.year > YEAR ? '이듬해 ' : ''}${m.start.month}월`;
    $('#highlights').innerHTML = `<div class="hl good"><b>힘이 붙는 달</b><span>${goods.length ? goods.map(mlabel).join(' · ') : '고른 편'}</span></div>
      <div class="hl bad"><b>살펴 갈 달</b><span>${bads.length ? bads.map(mlabel).join(' · ') : '크게 없음'}</span></div>`;
    $('#months').innerHTML = f.months.map(m => { const c = cls(m);
      return `<li><span class="mn"><b>${mname(m)}</b><span>${m.start.month}/${m.start.day}–${m.end.month}/${m.end.day}</span></span>
        <span class="gz"><span class="el-${S.STEM_EL[m.stem]}">${S.STEMS[m.stem]}</span><span class="el-${S.BRANCH_EL[m.branch]}">${S.BRANCHES[m.branch]}</span></span>
        <span class="gd">${m.stemGod} · ${m.branchGod}${m.dayRelations.length ? `<small class="${c}">일지와 ${m.dayRelations.map(r => r.type).join('·')}</small>` : `<small>${m.term}부터</small>`}</span>
        <span class="dot ${c}" aria-label="${c === 'good' ? '좋음' : c === 'bad' ? '주의' : ''}"></span></li>`; }).join('');
  }

  // ----- 탭 -----
  const VIEWS = ['today', 'saju', 'gung', 'year'];
  let aiReady = null; // null: 확인 중, false: 서버에 AI 키 없음
  const CTA = { saju: 'AI 사주 풀이 보기', gung: 'AI 궁합 풀이 보기', year: 'AI 2027 운세 풀이 보기' };
  let view = 'today';
  function go(v, scroll = true) {
    view = v;
    VIEWS.forEach(k => { $(`#v-${k}`).hidden = k !== v; $(`#tb-${k}`).setAttribute('aria-selected', k === v); });
    $('#cta').hidden = !CTA[v]; $('#ctaBtn').textContent = CTA[v] ? CTA[v] + (aiReady === false ? ' (준비 중)' : '') : '';
    if (scroll) window.scrollTo(0, 0);
    if (v === 'saju') { const n = document.querySelector('.du[data-now]'); if (n) n.parentElement.scrollLeft = Math.max(0, n.offsetLeft - 16 - 76); }
    store.set('saju.tab', v);
  }
  document.querySelector('.tabbar').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) go(b.dataset.v); });
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go);
    const ed = e.target.closest('[data-edit]'); if (ed) openWizard(ed.dataset.edit);
    const rd = e.target.closest('[data-read]'); if (rd) openReader(rd.dataset.read);
  });
  $('#ctaBtn').addEventListener('click', () => openReader(view));
  $('#profileBtn').addEventListener('click', () => openWizard('a'));

  // ----- 시트 공통 -----
  let lastFocus = null;
  function openSheet(el) { lastFocus = document.activeElement; el.hidden = false; document.body.style.overflow = 'hidden'; setTimeout(() => el.querySelector('.close').focus(), 30); }
  function closeSheet(el) { el.hidden = true; if ($('#wizard').hidden && $('#reader').hidden) document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); if (el.id === 'reader') abortRead(); }
  document.querySelectorAll('.sheet').forEach(sh => {
    sh.addEventListener('click', e => { if (e.target === sh || e.target.closest('[data-close]')) closeSheet(sh); });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.sheet:not([hidden])').forEach(closeSheet); });

  // ----- 입력 마법사 -----
  let wz = null; // {who, step, d}
  function openWizard(who) {
    wz = { who, step: 0, d: { ...(who === 'a' ? st.a : st.b) } };
    if ((who === 'a' && st.exA) || (who === 'b' && st.exB)) wz.d.name = '';
    $('#wzTitle').textContent = who === 'a' ? '내 정보' : '상대 정보';
    renderStep(); openSheet($('#wizard'));
  }
  const yearOpts = sel => { let h = ''; for (let y = TODAY.year; y >= 1920; y--) h += `<option value="${y}" ${y === sel ? 'selected' : ''}>${y}년</option>`; return h; };
  const daysIn = d => d.cal === 'lunar' ? 30 : new Date(Date.UTC(d.year, d.month, 0)).getUTCDate();
  function renderStep() {
    const d = wz.d, who = wz.who === 'a' ? '' : '상대의 ';
    document.querySelectorAll('#wzSteps i').forEach((i, k) => i.classList.toggle('on', k <= wz.step));
    $('#wzErr').hidden = true;
    $('#wzPrev').disabled = wz.step === 0;
    $('#wzNext').textContent = wz.step === 3 ? '결과 보기' : '다음';
    let h = '';
    if (wz.step === 0) h = `<div class="field"><p class="q">${wz.who === 'a' ? '어떻게 불러 드릴까요?' : '상대를 어떻게 부를까요?'}</p></div>
      <div class="field"><label for="wzName">이름 또는 별명 (선택)</label><input id="wzName" maxlength="12" value="${esc(d.name)}" placeholder="${wz.who === 'a' ? '나' : '상대'}" autocomplete="off"></div>
      <div class="field"><span class="lg">성별</span><div class="seg"><label><input type="radio" name="wzG" value="F" ${d.gender === 'F' ? 'checked' : ''}>여성</label><label><input type="radio" name="wzG" value="M" ${d.gender === 'M' ? 'checked' : ''}>남성</label></div></div>`;
    if (wz.step === 1) {
      const nd = daysIn(d); if (d.day > nd) d.day = nd;
      h = `<p class="q">${who}생년월일을 알려 주세요</p>
      <div class="seg"><label><input type="radio" name="wzC" value="solar" ${d.cal === 'solar' ? 'checked' : ''}>양력</label><label><input type="radio" name="wzC" value="lunar" ${d.cal === 'lunar' ? 'checked' : ''}>음력</label></div>
      <div class="row3"><select id="wzY" aria-label="년">${yearOpts(d.year)}</select>
        <select id="wzM" aria-label="월">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${i + 1 === d.month ? 'selected' : ''}>${i + 1}월</option>`).join('')}</select>
        <select id="wzD" aria-label="일">${Array.from({ length: nd }, (_, i) => `<option value="${i + 1}" ${i + 1 === d.day ? 'selected' : ''}>${i + 1}일</option>`).join('')}</select></div>
      ${d.cal === 'lunar' ? `<label class="check"><input type="checkbox" id="wzLeap" ${d.leap ? 'checked' : ''}>윤달이에요</label>` : ''}`;
    }
    if (wz.step === 2) h = `<p class="q">${who}태어난 시간을 알려 주세요</p>
      <div class="seg"><label><input type="radio" name="wzT" value="sijin" ${d.timeKind === 'sijin' ? 'checked' : ''}>시진으로</label><label><input type="radio" name="wzT" value="exact" ${d.timeKind === 'exact' ? 'checked' : ''}>정확한 시각</label><label><input type="radio" name="wzT" value="none" ${d.timeKind === 'none' ? 'checked' : ''}>몰라요</label></div>
      ${d.timeKind === 'sijin' ? `<div class="grid-pick" id="wzSijin">${SIJIN.map((s, k) => `<button type="button" data-k="${k}" aria-pressed="${k === d.sijin}"><b>${s[1]}</b><span>${s[2]}</span></button>`).join('')}</div>
        <p class="note">시각은 서울 기준 대략적인 범위입니다. 부모님께 들은 시진이 있다면 그대로 고르세요.</p>` : ''}
      ${d.timeKind === 'exact' ? `<div class="field"><label for="wzTime">출생 시각 (출생증명서·산모수첩 기준)</label><input id="wzTime" type="time" value="${d.time || '12:00'}"></div>
        <details class="more"><summary>계산 방식</summary><div class="field"><label for="wzTM">시간 보정</label><select id="wzTM">
          <option value="lmt" ${d.timeMode === 'lmt' ? 'selected' : ''}>경도 보정 (평태양시)</option><option value="true" ${d.timeMode === 'true' ? 'selected' : ''}>진태양시 (균시차 포함)</option><option value="standard" ${d.timeMode === 'standard' ? 'selected' : ''}>보정 안 함</option></select>
          <label for="wzZM">23시~24시 출생</label><select id="wzZM"><option value="zi23" ${d.ziMode === 'zi23' ? 'selected' : ''}>다음날 일주 (자시 기준)</option><option value="yaja" ${d.ziMode === 'yaja' ? 'selected' : ''}>당일 일주 (야자시)</option></select></div></details>` : ''}
      ${d.timeKind === 'none' ? '<p class="note">시주 없이 6글자로 계산합니다. 궁합과 신년운세도 볼 수 있지만, 시간을 알면 더 정확해집니다.</p>' : ''}`;
    if (wz.step === 3) h = `<p class="q">${who}태어난 곳은요?</p><div class="grid-pick places" id="wzPlace">${PLACES.map(([n], k) => `<button type="button" data-k="${k}" aria-pressed="${k === d.place}"><b>${n}</b></button>`).join('')}</div>
      <p class="note">출생지 경도로 시간을 보정합니다. 목록에 없으면 가장 가까운 도시를 고르세요.</p>`;
    $('#wzBody').innerHTML = `<div class="sec" style="gap:16px">${h}</div>`;
    bindStep();
  }
  function bindStep() {
    const d = wz.d, on = (sel, ev, fn) => { const el = $(sel); if (el) el.addEventListener(ev, fn); };
    on('#wzName', 'input', e => { d.name = e.target.value.trim(); });
    document.querySelectorAll('input[name=wzG]').forEach(r => r.addEventListener('change', e => { d.gender = e.target.value; }));
    document.querySelectorAll('input[name=wzC]').forEach(r => r.addEventListener('change', e => { d.cal = e.target.value; renderStep(); }));
    on('#wzY', 'change', e => { d.year = +e.target.value; renderStep(); });
    on('#wzM', 'change', e => { d.month = +e.target.value; renderStep(); });
    on('#wzD', 'change', e => { d.day = +e.target.value; });
    on('#wzLeap', 'change', e => { d.leap = e.target.checked; });
    document.querySelectorAll('input[name=wzT]').forEach(r => r.addEventListener('change', e => { d.timeKind = e.target.value; if (d.timeKind === 'exact' && !d.time) d.time = '12:00'; renderStep(); }));
    on('#wzTime', 'change', e => { d.time = e.target.value; });
    on('#wzTM', 'change', e => { d.timeMode = e.target.value; });
    on('#wzZM', 'change', e => { d.ziMode = e.target.value; });
    const pick = (sel, key) => on(sel, 'click', e => { const b = e.target.closest('button'); if (!b) return; d[key] = +b.dataset.k; $(sel).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    pick('#wzSijin', 'sijin'); pick('#wzPlace', 'place');
  }
  function stepError() {
    const d = wz.d;
    if (wz.step === 1 && d.cal === 'lunar') { try { S.lunarToSolar(d.year, d.month, d.day, d.leap); } catch (e) { return e.message; } }
    if (wz.step === 2 && d.timeKind === 'exact' && !d.time) return '출생 시각을 입력하거나 다른 방법을 골라 주세요.';
    return '';
  }
  $('#wzPrev').addEventListener('click', () => { if (wz.step > 0) { wz.step--; renderStep(); } });
  $('#wzNext').addEventListener('click', () => {
    const msg = stepError();
    if (msg) { $('#wzErr').textContent = msg; $('#wzErr').hidden = false; return; }
    if (wz.step < 3) { wz.step++; renderStep(); $('#wizard .pb').scrollTop = 0; return; }
    const prev = wz.who === 'a' ? st.a : st.b;
    try {
      if (wz.who === 'a') { st.a = wz.d; st.exA = false; store.set('saju.me', st.a); } else { st.b = wz.d; st.exB = false; store.set('saju.partner', st.b); }
      recompute();
      closeSheet($('#wizard'));
      if (wz.who === 'b') go('gung'); else go(view === 'today' ? 'saju' : view);
      toast(wz.who === 'a' ? '내 명식을 계산했습니다' : '궁합을 계산했습니다');
    } catch (e) {
      if (wz.who === 'a') st.a = prev; else st.b = prev;
      $('#wzErr').textContent = e.message; $('#wzErr').hidden = false;
    }
  });

  // ----- 토스트 -----
  let tt;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 2400); }

  // ----- AI 풀이 (서버 /api/reading 스트리밍) -----
  const READ = {
    today: { title: 'AI 오늘 한마디', topics: [['today', '오늘']] },
    saju: { title: 'AI 사주 풀이', topics: [['total', '종합'], ['nature', '성격·기질'], ['work', '직업·재물'], ['love', '연애·관계']] },
    gung: { title: 'AI 궁합 풀이', beta: true, topics: [['total', '종합 궁합'], ['style', '연애 스타일'], ['conflict', '갈등과 해결'], ['long', '결혼·장기 관계']] },
    year: { title: `AI ${YEAR} 신년운세`, beta: true, topics: [['total', '총운'], ['love', '연애운'], ['work', '일·이직운'], ['money', '재물운']] },
  };
  function md(t) {
    const lines = esc(t).split('\n'); let out = '', inList = false, para = [];
    const flush = () => { if (para.length) { out += `<p>${para.join(' ')}</p>`; para = []; } };
    const cl = () => { if (inList) { out += '</ul>'; inList = false; } };
    for (let l of lines) {
      l = l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      if (/^#{1,4}\s/.test(l)) { flush(); cl(); out += `<h4>${l.replace(/^#+\s/, '')}</h4>`; }
      else if (/^\s*[-•]\s/.test(l)) { flush(); if (!inList) { out += '<ul>'; inList = true; } out += `<li>${l.replace(/^\s*[-•]\s/, '')}</li>`; }
      else if (!l.trim()) { flush(); cl(); } else { cl(); para.push(l); }
    }
    flush(); cl(); return out;
  }
  // 같은 요청은 기기에 24시간 저장해 다시 열 때 비용 없이 보여 줌
  const CACHE_KEY = 'saju.readings';
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const cacheGet = k => { const c = store.get(CACHE_KEY) || {}; const e = c[k]; return e && e.exp > Date.now() ? e.text : null; };
  const cachePut = (k, text) => { const c = store.get(CACHE_KEY) || {}; c[k] = { text, exp: Date.now() + 864e5 };
    const keys = Object.keys(c).sort((a, b) => c[a].exp - c[b].exp); while (keys.length > 30) delete c[keys.shift()]; store.set(CACHE_KEY, c); };

  let rd = { kind: null, topic: null, ctl: null };
  function abortRead() { if (rd.ctl) rd.ctl.abort(); }
  function requestBody() {
    const b = { kind: rd.kind, topic: rd.topic, me: st.a };
    if (rd.kind === 'gung') b.partner = st.b;
    return b;
  }
  function openReader(kind) {
    const cfg = READ[kind]; rd = { kind, topic: cfg.topics[0][0], ctl: null };
    $('#rdTitle').innerHTML = `${cfg.title}${cfg.beta ? ' <span class="pill" style="color:var(--accent)">베타 무료</span>' : ''}`;
    $('#rdTopics').hidden = cfg.topics.length < 2;
    $('#rdTopics').innerHTML = cfg.topics.map(([k, l]) => `<button type="button" class="topic" data-k="${k}" aria-pressed="${k === rd.topic}">${l}</button>`).join('');
    openSheet($('#reader'));
    if (aiReady === false) return showComingSoon();
    ask(false);
  }
  $('#rdTopics').addEventListener('click', e => {
    const b = e.target.closest('.topic'); if (!b) return;
    abortRead(); rd.topic = b.dataset.k;
    $('#rdTopics').querySelectorAll('.topic').forEach(x => x.setAttribute('aria-pressed', x === b));
    if (aiReady === false) return showComingSoon();
    ask(false);
  });
  function showComingSoon() {
    $('#rdAnswer').innerHTML = '<p class="wait">AI 풀이는 곧 열립니다. 지금은 사주 원국, 궁합 점수와 근거, 2027 월별 흐름을 무료로 볼 수 있습니다.</p>';
    $('#rdStatus').textContent = ''; $('#rdStop').hidden = true; $('#rdAsk').hidden = true;
  }
  async function ask(fresh) {
    $('#rdAsk').hidden = false;
    const body = requestBody(), key = hash(JSON.stringify(body) + (rd.kind === 'today' ? `${TODAY.year}-${TODAY.month}-${TODAY.day}` : ''));
    const cached = !fresh && cacheGet(key);
    $('#rdStatus').textContent = '';
    if (cached) { $('#rdAnswer').innerHTML = md(cached); $('#rdAsk').textContent = '다시 풀이'; $('#rdAsk').disabled = false; $('#rdStop').hidden = true; return; }
    const ctl = new AbortController(); rd.ctl = ctl;
    $('#rdAnswer').innerHTML = '<p class="wait">명식을 읽고 풀이를 쓰는 중입니다…</p>';
    $('#rdAsk').disabled = true; $('#rdStop').hidden = false;
    let text = '';
    try {
      const r = await fetch('/api/reading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      if (!r.ok) {
        let msg = '풀이를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
        try { const j = await r.json(); if (j.message) msg = j.message; } catch {}
        throw Object.assign(new Error(msg), { shown: true });
      }
      const reader = r.body.getReader(), dec = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        $('#rdAnswer').innerHTML = md(text);
      }
      if (!text.trim()) throw Object.assign(new Error('풀이가 비어 있습니다. 다시 시도해 주세요.'), { shown: true });
      if (!/\((풀이가 중간에 끊겼습니다)/.test(text)) cachePut(key, text);
      $('#rdAsk').textContent = '다시 풀이';
    } catch (e) {
      if (rd.ctl !== ctl) return;
      if (e.name === 'AbortError') { $('#rdAsk').textContent = text ? '처음부터 다시' : '풀이 보기'; if (!text) $('#rdAnswer').innerHTML = ''; }
      else {
        if (!text) $('#rdAnswer').innerHTML = '';
        $('#rdStatus').textContent = e.shown ? e.message : '인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
        $('#rdAsk').textContent = '다시 시도';
      }
    } finally { if (rd.ctl === ctl) { $('#rdAsk').disabled = false; $('#rdStop').hidden = true; rd.ctl = null; } }
  }
  $('#rdAsk').addEventListener('click', () => ask($('#rdAsk').textContent === '다시 풀이'));
  $('#rdStop').addEventListener('click', abortRead);

  // ----- 궁합 공유 이미지 -----
  async function shareImage() {
    const { A, B, compat: c } = st, an = nameA(), bn = nameB();
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    try { await Promise.all(['700 80px "Gowun Batang"', '600 40px "IBM Plex Sans KR"'].map(f => document.fonts.load(f))); } catch {}
    const SER = '"Gowun Batang", "Nanum Myeongjo", serif', SAN = '"IBM Plex Sans KR", "Apple SD Gothic Neo", sans-serif';
    const COL = { bg: '#eef0ec', card: '#fafbf8', ink: '#1c2024', muted: '#5f666c', line: '#d6dad3', accent: '#2e3b8a', el: ['#2f7a4c', '#c03a2b', '#a77a1c', '#7c838d', '#24467a'] };
    x.fillStyle = COL.bg; x.fillRect(0, 0, W, H);
    x.fillStyle = COL.card; x.beginPath(); x.roundRect(60, 60, W - 120, H - 120, 40); x.fill();
    x.textAlign = 'center'; x.fillStyle = COL.muted; x.font = `600 34px ${SAN}`; x.fillText('우리 사주 궁합', W / 2, 170);
    x.fillStyle = COL.ink; x.font = `700 52px ${SAN}`; x.fillText(`${an}  ×  ${bn}`, W / 2, 250);
    const cx = W / 2, cy = 470, R = 150;
    x.lineWidth = 26; x.strokeStyle = COL.line; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = COL.accent; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.score / 100); x.stroke();
    x.fillStyle = COL.ink; x.font = `700 130px ${SER}`; x.textBaseline = 'middle'; x.fillText(String(c.score), cx, cy - 6); x.textBaseline = 'alphabetic';
    x.font = `700 58px ${SER}`; x.fillText(c.tier, W / 2, 720);
    const drawP = (R0, ox, label) => {
      x.fillStyle = COL.muted; x.font = `600 30px ${SAN}`; x.fillText(label, ox + 190, 810);
      ORDER.forEach(([k], i) => { const p = R0.pillars[k]; const px = ox + i * 95 + 47;
        [[p && S.STEMS[p.stem], p && p.stemElement], [p && S.BRANCHES[p.branch], p && p.branchElement]].forEach(([ch, e], row) => {
          x.fillStyle = ch ? COL.el[e] : COL.muted; x.font = `700 64px ${SER}`; x.fillText(ch || '?', px, 890 + row * 82); }); });
    };
    drawP(A, 110, an); drawP(B, 590, bn);
    x.textAlign = 'left'; x.font = `500 32px ${SAN}`;
    c.items.filter(i => i.points !== 0).slice(0, 3).forEach((i, k) => { x.fillStyle = i.points > 0 ? COL.el[0] : '#8a5a00'; x.fillText(`${i.points > 0 ? '+' : '−'} ${i.area} ${i.type}`, 140, 1080 + k * 48); });
    x.textAlign = 'center'; x.fillStyle = COL.muted; x.font = `500 26px ${SAN}`; x.fillText('명식 · 재미로 보는 사주 궁합', W / 2, H - 100);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const file = new File([blob], `궁합-${c.score}점.png`, { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: '우리 사주 궁합' }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('이미지를 저장했습니다');
  }
  $('#shareBtn').addEventListener('click', shareImage);

  // ----- 시작 -----
  try { recompute(); } catch (e) { st.a = { ...EX_A }; st.b = { ...EX_B }; st.exA = st.exB = true; recompute(); }
  const h0 = location.hash.slice(1), saved = store.get('saju.tab');
  go(VIEWS.includes(h0) ? h0 : VIEWS.includes(saved) ? saved : 'today', false);
  $('#shareBtn').hidden = !document.createElement('canvas').toBlob;
  fetch('/api/status').then(r => r.json()).then(j => { aiReady = !!j.ai; }).catch(() => { aiReady = true; }).finally(() => { renderToday(); go(view, false); });
})();
