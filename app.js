// Trainingsapp: alles draait lokaal op je telefoon.
(function () {
  'use strict';

  // ---------- opslag ----------
  const K = { log: 'ta.log', active: 'ta.active', settings: 'ta.settings' };
  function load(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* vol of geblokkeerd */ } }
  let log = load(K.log, []);
  let active = load(K.active, null);
  let settings = load(K.settings, { weights: [2, 5, 10, 15] });
  function saveLog() { save(K.log, log); }
  function saveActive() { save(K.active, active); }

  // ---------- helpers ----------
  const app = document.getElementById('app');
  const DAYMAP = {}; DAYS.forEach(function (d) { DAYMAP[d.id] = d; });
  DAYMAP.x = { id: 'x', label: 'Extra', name: 'Onderweg', color: '#B39DFF', blocks: [] };
  // dag met eventueel gewisselde oefeningen (nieuw blok)
  function dayDef(id) {
    const base = DAYMAP[id]; const ov = settings.overrides || {};
    return Object.assign({}, base, { blocks: base.blocks.map(function (b) {
      return Object.assign({}, b, { groups: b.groups.map(function (g) {
        return Object.assign({}, g, { items: g.items.map(function (x) { const o = ov[id + '.' + x.code]; return o ? Object.assign({}, x, { ex: o }) : x; }) });
      }) });
    }) });
  }
  function cur() { return active.custom || dayDef(active.day); }
  function gold() { return settings.theme === 'golden'; }
  function T(key, plain) { return gold() && GOLD[key] ? GOLD[key] : plain; }
  function unitTxt(e, n) { return e.unit === 'sec' ? n + ' s' : n + ' reps'; }
  const NL_DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const NL_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const NL_MON = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseIso(s) { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function mmss(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + pad(s % 60); }
  function firstNum(r) { const m = String(r).match(/\d+/); return m ? +m[0] : 10; }
  function kgTxt(v) { return String(v).replace('.', ','); }
  const ICON = {
    back: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    close: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    play: '<svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M8 5l11 7-11 7z"/></svg>',
    cal: '<svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="4.5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 3v3M16 3v3"/></svg>',
    check: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111315" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    bigcheck: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111315" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  };

  // ---------- blok en week ----------
  function blockStart() {
    if (settings.blockStart) return parseIso(settings.blockStart);
    if (log.length) return parseIso(log[0].date);
    return null;
  }
  function weekInfo() {
    const bs = blockStart();
    if (!bs) return { week: 1, deload: false, weeksTotal: 0 };
    const days = Math.floor((new Date().setHours(0, 0, 0, 0) - bs.getTime()) / 86400000);
    const w = Math.max(0, Math.floor(days / 7));
    const week = (w % 4) + 1;
    return { week: week, deload: week === 4, weeksTotal: w + 1 };
  }

  // ---------- vorige keer ----------
  function lastFor(exId, setNo) {
    for (let i = log.length - 1; i >= 0; i--) {
      const s = log[i].sets.filter(function (x) { return x.ex === exId; });
      if (s.length) {
        const exact = s.find(function (x) { return x.set === setNo; }) || s[s.length - 1];
        return { set: exact, all: s };
      }
    }
    return null;
  }

  // ---------- stappen van een training ----------
  function buildSteps(day, deload) {
    const steps = [];
    day.blocks.forEach(function (b, bi) {
      b.groups.forEach(function (g, gi) {
        const sets = g.items.map(function (x) { return deload ? Math.ceil(x.sets / 2) : x.sets; });
        const rounds = Math.max.apply(null, sets);
        for (let r = 0; r < rounds; r++) {
          g.items.forEach(function (item, ii) {
            if (r < sets[ii]) steps.push({ bi: bi, gi: gi, ii: ii, set: r + 1, sets: sets[ii], rest: g.rest, superset: g.items.length > 1 });
          });
        }
      });
    });
    steps.forEach(function (s, i) { const n = steps[i + 1]; s.blockEnd = !n || n.bi !== s.bi; });
    return steps;
  }
  function itemOf(step) { return cur().blocks[step.bi].groups[step.gi].items[step.ii]; }

  // ---------- geluid en scherm aan ----------
  let audio = null;
  function unlockAudio() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const o = audio.createOscillator(); const g = audio.createGain(); g.gain.value = 0.0001;
      o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.01);
    } catch (e) { /* geen geluid mogelijk */ }
  }
  function beep() {
    if (!audio) return;
    try {
      [0, 0.35, 0.7].forEach(function (t, i) {
        const o = audio.createOscillator(); const g = audio.createGain();
        o.frequency.value = i === 2 ? 1320 : 880; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, audio.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.5, audio.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.25);
        o.connect(g); g.connect(audio.destination); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.3);
      });
    } catch (e) { /* stil */ }
  }
  let wakeLock = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', function () { wakeLock = null; }); } } catch (e) { wakeLock = null; }
  }
  function releaseAwake() { try { if (wakeLock) wakeLock.release(); } catch (e) { /* */ } wakeLock = null; }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && active) { keepAwake(); render(); }
  });

  // ---------- navigatie ----------
  let view = { name: active ? 'workout' : 'home' };
  function go(v) { view = v; render(); window.scrollTo(0, 0); }

  // ---------- schermen ----------
  function greet() { const h = new Date().getHours(); return h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond'; }

  function weekDots() {
    const now = new Date(); const mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const labels = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
    let done = 0; let html = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon); d.setDate(mon.getDate() + i); const k = iso(d);
      const s = log.find(function (x) { return x.date === k; });
      const isToday = k === iso(now);
      if (s) done++;
      const style = s ? ' style="background:' + DAYMAP[s.day].color + '"' : '';
      html += '<div><div class="xs ' + (isToday ? '' : 'muted') + '"' + (isToday ? ' style="font-weight:600"' : '') + '>' + labels[i] + '</div><div class="d' + (isToday && !s ? ' today' : '') + '"' + style + '></div></div>';
    }
    return { html: html, done: done };
  }

  function nextDay() {
    const real = log.filter(function (x) { return x.day !== 'x'; });
    if (!real.length) return 'd1';
    const last = real[real.length - 1].day;
    return last === 'd1' ? 'd2' : 'd1';
  }

  function backupAge() {
    if (!log.length) return -1;
    if (!settings.lastBackup) return 999;
    return Math.round((new Date().setHours(0, 0, 0, 0) - parseIso(settings.lastBackup).getTime()) / 86400000);
  }
  function backupDue() { return backupAge() >= 7; }
  function newBlockDue() {
    const wi = weekInfo(); const today = iso(new Date());
    return wi.weeksTotal > 16 && !(settings.snoozeUntil && today < settings.snoozeUntil);
  }
  function viewHome() {
    const now = new Date(); const wd = weekDots(); const year = now.getFullYear();
    const yearCount = log.filter(function (x) { return x.date.slice(0, 4) === String(year); }).length;
    const nd = DAYMAP[nextDay()];
    let resume = '';
    if (active) {
      const d = cur();
      resume = '<button class="card hl col" data-a="resume" style="text-align:left;width:100%"><div class="eyebrow" style="color:var(--accent)">Training bezig</div><h2>' + d.label + ' · ' + d.name + '</h2><div class="small muted">Tik om verder te gaan</div></button>';
    }
    let nb = '';
    if (!active && newBlockDue()) {
      const blockLog = log.filter(function (x) { return settings.blockStart && x.date >= settings.blockStart; }).length;
      nb = '<div class="card hl col" style="gap:12px"><div class="eyebrow" style="color:var(--accent)">Blok ' + (settings.blockNo || 1) + ' afgerond</div><h2>16 weken klaar. Tijd voor nieuwe oefeningen.</h2>' +
        '<div class="small muted">Je lichaam is gewend aan dit schema. Er ligt een voorstel klaar. ' + blockLog + ' trainingen in dit blok.</div>' +
        '<button class="btn" data-a="newblock">Bekijk voorstel</button><button class="btn ghost" data-a="snooze">Nog 4 weken met dit schema</button></div>';
    }
    const hello = gold() ? GOLD.hello : greet();
    const quote = gold() ? '<div class="col" style="gap:6px;align-items:flex-start"><div class="redtag">Motivatie van de dag</div><div class="num" style="font-size:24px;line-height:1.1;text-transform:uppercase">' + GOLD.quotes[now.getDate() % GOLD.quotes.length] + '</div></div>' : '';
    return '' +
      '<div class="col" style="gap:6px;margin-top:20px"><div class="eyebrow' + (gold() ? ' goldtxt' : '') + '">' + NL_DAYS[now.getDay()] + ' ' + now.getDate() + ' ' + NL_MONTHS[now.getMonth()] + '</div><h1 style="font-size:44px">' + hello + '</h1></div>' +
      resume + nb +
      (backupDue() && !active ? '<div class="card between"><div class="col" style="gap:2px"><div style="font-weight:600">Tijd voor je weekback-up</div><div class="xs muted">' + (backupAge() >= 999 ? 'Nog nooit een back-up gemaakt' : 'Laatste back-up ' + backupAge() + ' dagen geleden') + '</div></div><button class="btn" style="width:auto;height:44px;padding:0 16px;font-size:15px;box-shadow:none;white-space:nowrap;flex-shrink:0" data-a="backupnow">Nu maken</button></div>' : '') +
      '<div class="card col" style="gap:12px"><div class="between"><div style="font-weight:600">' + T('weekTitle', 'Deze week') + '</div><div class="small muted">' + wd.done + ' van 2-3 trainingen</div></div><div class="week">' + wd.html + '</div></div>' +
      '<div class="col" style="gap:12px">' +
        '<button class="big main" data-a="choose"><div class="col" style="gap:6px"><div class="t">' + T('start', 'Start training') + '</div><div class="small" style="font-weight:600">Volgende: ' + nd.label + ' · ' + nd.name + '</div></div>' + ICON.play + '</button>' +
        '<div class="grid2">' +
        '<button class="tile" data-a="overview"><div class="t">' + T('overview', 'Overzicht') + '</div><div class="xs muted">' + year + ' · ' + yearCount + (yearCount === 1 ? ' training' : ' trainingen') + '</div></button>' +
        '<button class="tile" data-a="away"><div class="t">' + T('away', 'Niet thuis, wel tijd') + '</div><div class="xs muted">Zonder materiaal</div></button>' +
        '</div>' +
      '</div>' +
      '<div class="grow"></div>' + quote +
      '<button class="btn ghost" data-a="backup">Back-up en instellingen</button>';
  }

  function viewChoose() {
    const wi = weekInfo(); const nd = nextDay();
    let weeks = '';
    for (let i = 1; i <= 4; i++) weeks += '<div class="' + (i < wi.week ? 'on' : i === wi.week ? 'now' : '') + '" style="height:6px;border-radius:3px"></div>';
    let cards = '';
    DAYS.forEach(function (d) {
      const last = [].concat(log).reverse().find(function (x) { return x.day === d.id; });
      const n = d.blocks.reduce(function (a, b) { return a + b.groups.reduce(function (c, g) { return c + g.items.length; }, 0); }, 0);
      const badge = d.id === nd ? '<span class="badge">Volgende</span>' : d.optional ? '<span class="badge out">Optioneel</span>' : '';
      cards += '<button class="daycard' + (d.id === nd ? ' next' : '') + '" data-a="day" data-id="' + d.id + '"><div class="between"><div class="t"><span class="muted">' + d.label + ' · </span>' + d.name + '</div>' + badge + '</div><div>' + d.focus + '</div><div class="small muted">' + n + ' oefeningen · ca. ' + d.minutes + ' min' + (last ? ' · laatst ' + fmtShort(last.date) : '') + '</div></button>';
    });
    return '' +
      '<button class="iconbtn" data-a="home" aria-label="Terug">' + ICON.back + '</button>' +
      '<div class="col"><div class="eyebrow">Week ' + wi.week + ' van 4' + (wi.deload ? ' · deload' : '') + '</div><h1>Wat train je vandaag?</h1>' +
      '<div class="progress" style="grid-template-columns:repeat(4,1fr);gap:6px;margin-top:6px">' + weeks + '</div>' +
      '<div class="grid4 xs muted" style="gap:6px"><div>Week 1</div><div>Week 2</div><div>Week 3</div><div>Deload</div></div></div>' +
      (wi.deload ? '<div class="card small">Deze week is deload: de helft van de sets, zelfde gewicht, normaal tempo.</div>' : '') +
      '<div class="col" style="gap:12px">' + cards + '</div>';
  }
  function fmtShort(s) {
    const d = parseIso(s); const diff = Math.round((new Date().setHours(0, 0, 0, 0) - d.getTime()) / 86400000);
    if (diff === 0) return 'vandaag'; if (diff === 1) return 'gisteren'; if (diff < 7) return NL_DAYS[d.getDay()];
    return d.getDate() + ' ' + NL_MON[d.getMonth()];
  }

  function viewDay() {
    const d = dayDef(view.id); const wi = weekInfo();
    let blocks = '<div class="card between"><div style="font-weight:600">Warming-up</div><div class="small muted">8 min</div></div>';
    d.blocks.forEach(function (b) {
      let rows = '';
      b.groups.forEach(function (g) {
        g.items.forEach(function (x) {
          const e = EXERCISES[x.ex]; const sets = wi.deload ? Math.ceil(x.sets / 2) : x.sets;
          rows += '<div class="between small" style="font-size:14px"><div><span class="muted">' + x.code + '</span> ' + e.name + '</div><div class="muted">' + sets + ' × ' + x.reps + (e.unit === 'kg' ? ' · ' + kgTxt(x.kg) + ' kg' : '') + '</div></div>';
        });
      });
      const ss = b.groups.some(function (g) { return g.items.length > 1; });
      blocks += '<div class="card col"><div class="between"><div style="font-weight:600">' + b.name + '</div><div class="xs" style="color:var(--accent);font-weight:600">' + (ss ? 'Superset' : '') + '</div></div>' + rows + '</div>';
    });
    return '' +
      '<button class="iconbtn" data-a="choose" aria-label="Terug">' + ICON.back + '</button>' +
      '<div class="col" style="gap:4px"><h1><span class="muted">' + d.label + ' · </span>' + d.name + '</h1><div class="muted">' + d.focus + ' · ca. ' + d.minutes + ' min' + (wi.deload ? ' · deload' : '') + '</div></div>' +
      '<div class="col">' + blocks + '</div>' +
      '<div class="grow"></div>' +
      '<button class="btn" data-a="start" data-id="' + d.id + '">Start training</button>';
  }

  // ---------- training ----------
  function startWorkout(dayId, custom) {
    unlockAudio(); keepAwake();
    const wi = weekInfo();
    if (!settings.blockStart) { settings.blockStart = iso(new Date()); save(K.settings, settings); }
    const deload = custom ? false : wi.deload;
    active = { day: dayId, custom: custom || null, logDay: custom ? custom.logDay : dayId, startedAt: Date.now(), deload: deload, week: wi.week, steps: buildSteps(custom || dayDef(dayId), deload), idx: 0, phase: 'warmup', warm: [], sets: [], restEnd: 0, restTotal: 0, val: null };
    saveActive(); go({ name: 'workout' });
  }

  function topbar(label) {
    return '<div class="between"><button class="iconbtn" data-a="quit" aria-label="Training stoppen">' + ICON.close + '</button><div class="small muted" style="text-align:center">' + label + '</div><div style="width:44px"></div></div>';
  }
  function exProgress() {
    // balkje per oefening van de hele training
    const day = cur(); const items = [];
    day.blocks.forEach(function (b, bi) { b.groups.forEach(function (g, gi) { g.items.forEach(function (x, ii) { items.push(bi + '.' + gi + '.' + ii); }); }); });
    const cs = active.steps[active.idx]; const curKey = cs ? cs.bi + '.' + cs.gi + '.' + cs.ii : '';
    const doneKeys = {};
    active.steps.forEach(function (s, i) { if (i < active.idx && s.set === s.sets) doneKeys[s.bi + '.' + s.gi + '.' + s.ii] = 1; });
    return '<div class="progress" style="grid-template-columns:repeat(' + items.length + ',1fr)">' + items.map(function (k) { return '<div class="' + (doneKeys[k] ? 'on' : k === curKey ? 'now' : '') + '"></div>'; }).join('') + '</div>';
  }
  function stepLabel(step) {
    const b = cur().blocks[step.bi];
    if (!step.superset) return b.name;
    const g = b.groups[step.gi]; const rounds = Math.max.apply(null, g.items.map(function (x) { return active.deload ? Math.ceil(x.sets / 2) : x.sets; }));
    return b.name.split(' · ')[0] + ' · Superset · ronde ' + step.set + ' van ' + rounds;
  }

  function warmList() { return active.custom ? WARMUP.filter(function (w) { return w.name.indexOf('bar') < 0 && w.name.indexOf('eerste') < 0; }) : WARMUP; }
  function viewWarmup() {
    const d = cur();
    const doneN = active.warm.length;
    let rows = '';
    warmList().forEach(function (w, i) {
      const done = active.warm.indexOf(i) >= 0;
      rows += '<button class="check' + (done ? ' done' : '') + '" data-a="warm" data-i="' + i + '"><span class="box">' + (done ? ICON.check : '') + '</span><span class="lbl grow">' + w.name + '</span><span class="small muted">' + w.amount + '</span></button>';
    });
    const first = EXERCISES[itemOf(active.steps[0]).ex].name.toLowerCase();
    rows = rows.replace('Lichte set van de eerste oefening', 'Lichte set ' + first);
    return topbar(d.label + ' · ' + d.name) +
      '<div class="col" style="gap:4px"><div class="eyebrow">Stap 1</div><h1>Warming-up</h1><div class="muted">Tik af wat je gedaan hebt. ' + doneN + ' van ' + warmList().length + ' klaar.</div></div>' +
      '<div class="col">' + rows + '</div>' +
      '<div class="grow"></div>' +
      '<button class="btn" data-a="warmdone">Naar ' + cur().blocks[0].name.split(' · ')[0].replace('Blok', 'blok') + '</button>' +
      '<button class="btn ghost" data-a="warmdone">Warming-up overslaan</button>';
  }

  function prefill(step) {
    const item = itemOf(step); const e = EXERCISES[item.ex];
    const last = lastFor(item.ex, step.set);
    const reps = last ? last.set.reps : firstNum(item.reps);
    const kg = e.unit === 'kg' ? (last ? last.set.kg : item.kg) : 0;
    return { reps: reps, kg: kg, last: last };
  }

  function viewSet() {
    const step = active.steps[active.idx]; const item = itemOf(step); const e = EXERCISES[item.ex];
    if (!active.val || active.val.idx !== active.idx) { const p = prefill(step); active.val = { idx: active.idx, reps: p.reps, kg: p.kg }; saveActive(); }
    const p = prefill(step);
    let prev = 'Eerste keer';
    if (p.last) prev = 'Vorige keer: ' + (e.unit === 'kg' ? kgTxt(p.last.set.kg) + ' kg × ' + p.last.set.reps : unitTxt(e, p.last.set.reps));
    if (gold() && p.last) prev += '. Verpletter het.';
    const pills = '<span class="pill">' + unitTxt(e, item.reps) + (e.perSide ? ' per kant' : '') + '</span>' +
      '<span class="pill">' + (e.unit === 'kg' ? kgTxt(item.kg) + ' kg' : 'Lichaamsgewicht') + '</span>' +
      (item.tempo ? '<span class="pill">Tempo ' + item.tempo + '</span>' : '');
    const next = active.steps[active.idx + 1];
    let after = 'Laatste set van de training';
    if (next) {
      const nn = EXERCISES[itemOf(next).ex].name;
      after = step.blockEnd ? 'Daarna is dit blok klaar' : 'Daarna ' + step.rest + ' s rust, dan ' + itemOf(next).code + ' ' + nn + (next.set > 1 ? ' set ' + next.set : '');
    }
    const kgStepper = e.unit === 'kg' ? '<div class="col" style="gap:6px"><div class="xs muted" style="font-weight:600">' + T('weight', 'Gewicht (kg)') + '</div><div class="stepper"><button data-a="kg" data-d="-1" aria-label="Lichter">−</button><div class="v">' + kgTxt(active.val.kg) + '</div><button data-a="kg" data-d="1" aria-label="Zwaarder">+</button></div></div>' : '';
    return topbar(stepLabel(step)) + exProgress() +
      '<button class="zoomwrap" data-a="zoom" data-src="img/' + e.img + '.jpg" data-name="' + e.name + '" aria-label="Foto vergroten"><img class="exhero" src="img/' + e.img + '.jpg" alt="' + e.name + ': begin- en eindpositie"><span class="zoomhint" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></span></button>' +
      '<div class="col" style="gap:8px"><div class="row" style="align-items:baseline"><div class="num" style="font-size:20px;color:var(--accent)">' + item.code + '</div><h1 style="font-size:36px">' + e.name + '</h1></div>' +
      '<div class="row" style="flex-wrap:wrap;gap:8px">' + pills + '</div>' +
      '<div class="small muted" style="font-size:14px;line-height:1.4">' + e.cue + '</div></div>' +
      '<div class="card col" style="gap:12px"><div class="between"><div class="num" style="font-size:22px">Set ' + step.set + ' van ' + step.sets + '</div><div class="small muted">' + prev + '</div></div>' +
      '<div class="' + (e.unit === 'kg' ? 'grid2' : 'col') + '"><div class="col" style="gap:6px"><div class="xs muted" style="font-weight:600">' + (e.unit === 'sec' ? 'Seconden' : 'Reps') + '</div><div class="stepper"><button data-a="reps" data-d="-1" aria-label="Minder">−</button><div class="v">' + active.val.reps + '</div><button data-a="reps" data-d="1" aria-label="Meer">+</button></div></div>' + kgStepper + '</div></div>' +
      '<div class="grow"></div>' +
      '<button class="btn" data-a="setdone">' + T('setDone', 'Set klaar') + '</button><div class="small muted" style="text-align:center;margin-top:-8px">' + after + '</div>';
  }

  function diffBadge(rec) {
    const ex = EXERCISES[rec.ex];
    const prevSessions = log.slice();
    for (let i = prevSessions.length - 1; i >= 0; i--) {
      const s = prevSessions[i].sets.find(function (x) { return x.ex === rec.ex && x.set === rec.set; });
      if (s) {
        if (ex.unit === 'kg' && rec.kg > s.kg) return '+' + kgTxt(rec.kg - s.kg) + ' kg';
        if ((ex.unit !== 'kg' || rec.kg === s.kg) && rec.reps > s.reps) return '+' + (rec.reps - s.reps) + ' rep' + (rec.reps - s.reps > 1 ? 's' : '');
        return '';
      }
    }
    return '';
  }

  function viewRest() {
    const left = (active.restEnd - Date.now()) / 1000;
    const frac = Math.max(0, Math.min(1, left / active.restTotal));
    const C = 2 * Math.PI * 105;
    const rec = active.sets[active.sets.length - 1]; const re = EXERCISES[rec.ex];
    const badge = diffBadge(rec);
    const next = active.steps[active.idx]; const ni = itemOf(next); const ne = EXERCISES[ni.ex];
    return topbar(stepLabel(next)) +
      '<div class="card between"><div class="col" style="gap:2px"><div class="xs muted">' + T('saved', 'Opgeslagen') + '</div><div style="font-weight:600">' + re.name + ' · ' + (re.unit === 'kg' ? kgTxt(rec.kg) + ' kg × ' + rec.reps : unitTxt(re, rec.reps)) + '</div></div>' + (badge ? '<span class="badge sticker">' + badge + (gold() ? ', monster' : '') + '</span>' : '') + '</div>' +
      '<div class="col" style="align-items:center;gap:8px;padding-top:6px"><div class="eyebrow resttitle">' + T('rest', 'Rust') + '</div>' +
      '<div class="ring"><svg width="250" height="250" viewBox="0 0 250 250" aria-hidden="true"><circle cx="125" cy="125" r="105" fill="none" style="stroke:var(--s2)" stroke-width="14"/><circle id="ringc" cx="125" cy="125" r="105" fill="none" style="stroke:var(--accent)" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - frac)).toFixed(1) + '" transform="rotate(-90 125 125)"/></svg>' +
      '<div class="c"><div class="num" id="clock" role="timer" aria-live="off">' + mmss(left) + '</div><div class="small muted">van ' + mmss(active.restTotal) + '</div></div></div></div>' +
      '<div class="grid2"><button class="btn sec" data-a="plus15">+15 s' + (gold() ? '<div class="sub">' + GOLD.plus + '</div>' : '') + '</button><button class="btn sec" data-a="skip">Overslaan' + (gold() ? '<div class="sub">' + GOLD.skip + '</div>' : '') + '</button></div>' +
      '<div class="grow"></div>' +
      '<div class="card row" style="padding:12px"><button data-a="zoom" data-src="img/' + ne.img + '.jpg" data-name="' + ne.name + '" aria-label="Foto vergroten" style="flex-shrink:0"><img src="img/' + ne.img + '.jpg" alt="" style="width:88px;height:60px;object-fit:cover;border-radius:10px;display:block"></button><div class="col" style="gap:2px"><div class="xs nextlbl">' + T('next', 'Hierna') + '</div><div style="font-weight:600">' + ni.code + ' ' + ne.name + '</div><div class="small muted">Set ' + next.set + ' van ' + next.sets + ' · ' + unitTxt(ne, ni.reps) + '</div></div></div>' +
      '<div class="xs muted" style="text-align:center">Je hoort een piep als de rust voorbij is</div>';
  }

  function viewBlockDone() {
    const prevStep = active.steps[active.idx - 1]; const b = cur().blocks[prevStep.bi];
    let rows = ''; let ups = 0;
    b.groups.forEach(function (g) {
      g.items.forEach(function (x) {
        const e = EXERCISES[x.ex];
        const mine = active.sets.filter(function (s) { return s.ex === x.ex; });
        let boxes = '';
        mine.forEach(function (s) { const up = !!s.up; if (up) ups++; boxes += '<div class="' + (up ? 'up' : '') + '">' + s.reps + '</div>'; });
        const kgs = e.unit === 'kg' && mine.length ? kgTxt(mine[0].kg) + ' kg' : e.unit === 'sec' ? 'seconden' : 'lichaam';
        rows += '<div class="col" style="gap:8px"><div class="between" style="font-weight:600"><div>' + e.name + '</div><div class="muted small">' + kgs + '</div></div><div class="setboxes">' + boxes + '</div></div>';
      });
    });
    const nb = cur().blocks[prevStep.bi + 1];
    let nextHtml = '';
    if (nb) {
      let nr = '';
      nb.groups.forEach(function (g) { nr += '<div class="between" style="font-size:14px"><div>' + g.items.map(function (x) { return x.code + ' ' + EXERCISES[x.ex].name; }).join(' + ') + '</div></div>'; });
      nextHtml = '<div class="col"><div class="eyebrow">Hierna · ' + nb.name + '</div><div class="card col">' + nr + '</div></div>';
    }
    return '<div class="between small muted"><div>' + cur().label + ' · ' + mmss((Date.now() - active.startedAt) / 1000) + ' bezig</div><div>Blok ' + (prevStep.bi + 1) + ' van ' + cur().blocks.length + '</div></div>' +
      '<div class="col"><div style="width:56px;height:56px;border-radius:28px;background:var(--accent);display:flex;align-items:center;justify-content:center">' + ICON.bigcheck + '</div><h1>' + b.name.split(' · ')[0] + ' ' + T('blockDone', 'klaar') + '</h1><div class="muted">' + (ups ? ups + ' set' + (ups > 1 ? 's' : '') + ' beter dan vorige keer' : 'Goed bezig') + '</div></div>' +
      '<div class="card col" style="gap:14px">' + rows + '<div class="xs muted">Groen = beter dan vorige keer</div></div>' +
      nextHtml + '<div class="grow"></div>' +
      '<button class="btn" data-a="nextblock">Start ' + nb.name.split(' · ')[0].replace('Blok', 'blok') + '</button>';
  }

  function viewDone() {
    const d = cur(); const mins = Math.round((Date.now() - active.startedAt) / 60000);
    // per oefening: beste set vergelijken met vorige sessie
    const exIds = []; active.sets.forEach(function (s) { if (exIds.indexOf(s.ex) < 0) exIds.push(s.ex); });
    let recs = ''; let nRec = 0;
    exIds.forEach(function (id) {
      const e = EXERCISES[id]; const mine = active.sets.filter(function (s) { return s.ex === id; });
      const prev = lastFor(id, 1);
      const total = mine.reduce(function (a, s) { return a + s.reps; }, 0);
      const best = mine.reduce(function (a, s) { return (s.kg > a.kg || (s.kg === a.kg && s.reps > a.reps)) ? s : a; }, mine[0]);
      if (!prev) return;
      const pb = prev.all.reduce(function (a, s) { return (s.kg > a.kg || (s.kg === a.kg && s.reps > a.reps)) ? s : a; }, prev.all[0]);
      const pTotal = prev.all.reduce(function (a, s) { return a + s.reps; }, 0);
      let now = '', was = '';
      if (e.unit === 'kg' && (best.kg > pb.kg || (best.kg === pb.kg && best.reps > pb.reps))) { now = kgTxt(best.kg) + ' kg × ' + best.reps; was = kgTxt(pb.kg) + ' kg × ' + pb.reps; }
      else if (e.unit !== 'kg' && total > pTotal) { now = total + ' reps'; was = pTotal + ' reps totaal'; }
      if (now) { nRec++; recs += '<div><div class="col" style="gap:0"><div style="font-weight:600">' + e.name + '</div><div class="xs muted">vorige: ' + was + '</div></div><div class="small" style="font-weight:700;color:var(--accent)">' + now + '</div></div>'; }
    });
    const feel = active.feel || '';
    const fb = ['Licht', 'Goed', 'Zwaar'].map(function (f) { return '<button class="' + (feel === f ? 'on' : '') + '" data-a="feel" data-f="' + f + '">' + f + '</button>'; }).join('');
    const totalSets = active.steps.length;
    return '<div class="col" style="gap:4px;margin-top:20px"><div class="eyebrow">' + d.label + ' · ' + d.name + ' · week ' + active.week + '</div><h1 style="font-size:44px">' + T('done', 'Training klaar') + '</h1></div>' +
      '<div class="grid3"><div class="stat"><div class="num">' + mins + '</div><div class="xs muted">minuten</div></div><div class="stat"><div class="num">' + active.sets.length + '</div><div class="xs muted">van ' + totalSets + ' sets</div></div><div class="stat"><div class="num" style="color:var(--accent)">' + nRec + '</div><div class="xs muted">records</div></div></div>' +
      (recs ? '<div class="col"><div class="eyebrow">Vooruitgang</div><div class="card list" style="padding:4px 16px">' + recs + '</div></div>' : '') +
      '<div class="col"><div class="eyebrow">Hoe zwaar was het?</div><div class="seg">' + fb + '</div></div>' +
      '<div class="grow"></div>' +
      '<button class="btn" data-a="finish">Opslaan</button>';
  }

  function viewWorkout() {
    if (active.phase === 'warmup') return viewWarmup();
    if (active.phase === 'set') return viewSet();
    if (active.phase === 'rest') return viewRest();
    if (active.phase === 'block') return viewBlockDone();
    return viewDone();
  }

  // ---------- overzicht ----------
  function viewOverview() {
    const year = view.year || new Date().getFullYear(); const today = iso(new Date());
    const byDate = {}; log.forEach(function (s) { byDate[s.date] = s.day; });
    const cnt = { d1: 0, d2: 0, d3: 0, x: 0 };
    let months = '';
    for (let m = 0; m < 12; m++) {
      const first = new Date(year, m, 1); const n = new Date(year, m + 1, 0).getDate(); const off = (first.getDay() + 6) % 7;
      let cells = ''; for (let i = 0; i < off; i++) cells += '<div class="pad"></div>';
      for (let d = 1; d <= n; d++) {
        const k = year + '-' + pad(m + 1) + '-' + pad(d); const t = byDate[k];
        if (t) cnt[t]++;
        const cls = (k > today ? 'fut' : '') + (k === today ? ' tod' : '');
        cells += '<div class="' + cls + '"' + (t ? ' style="background:' + DAYMAP[t].color + '"' : '') + '></div>';
      }
      months += '<div><div class="xs muted" style="font-weight:600">' + NL_MON[m] + '</div><div class="mgrid">' + cells + '</div></div>';
    }
    const total = cnt.d1 + cnt.d2 + cnt.d3 + cnt.x;
    return '<div class="between"><button class="iconbtn" data-a="home" aria-label="Terug">' + ICON.back + '</button>' +
      '<div class="row" style="gap:0"><button class="iconbtn" style="background:none" data-a="year" data-d="-1" aria-label="Vorig jaar">' + ICON.back + '</button><div class="num" style="font-size:24px">' + year + '</div><button class="iconbtn" style="background:none;transform:scaleX(-1)" data-a="year" data-d="1" aria-label="Volgend jaar">' + ICON.back + '</button></div><div style="width:44px"></div></div>' +
      '<h1>' + T('overview', 'Overzicht') + '</h1>' +
      '<div class="grid4"><div class="stat"><div class="num">' + total + '</div><div class="xs muted">totaal</div></div><div class="stat"><div class="num" style="color:var(--accent)">' + cnt.d1 + '</div><div class="xs muted">Dag 1</div></div><div class="stat"><div class="num" style="color:var(--d2)">' + cnt.d2 + '</div><div class="xs muted">Dag 2</div></div><div class="stat"><div class="num" style="color:var(--d3)">' + cnt.d3 + '</div><div class="xs muted">Dag 3</div></div></div>' +
      '<div class="months">' + months + '</div><div class="grow"></div>' +
      '<div class="legend"><div><span style="background:var(--accent)"></span>Dag 1</div><div><span style="background:var(--d2)"></span>Dag 2</div><div><span style="background:var(--d3)"></span>Dag 3</div><div><span style="background:#B39DFF"></span>Extra</div></div>';
  }

  // ---------- niet thuis ----------
  function viewAway() {
    const o = view.opts;
    const mins = [20, 30, 45].map(function (m) { return '<button class="' + (o.min === m ? 'on' : '') + '" data-a="awaymin" data-m="' + m + '">' + m + ' min</button>'; }).join('');
    const items = AWAY_ITEMS.map(function (it) {
      const on = o.items.indexOf(it.id) >= 0;
      return '<button class="check' + (on ? ' done' : '') + '" data-a="awayitem" data-id="' + it.id + '" style="min-height:52px"><span class="box">' + (on ? ICON.check : '') + '</span><span class="grow" style="font-size:14px">' + it.label + '</span></button>';
    }).join('');
    const nd = DAYMAP[nextDay()];
    const rep = [['next', nd.label + ' · ' + nd.name, 'Je volgende training, telt mee in je week'], ['extra', 'Extra training', 'Hele lichaam, je schema blijft zoals het is']].map(function (r) {
      const on = o.replace === r[0];
      return '<button class="check' + (on ? ' done' : '') + '" data-a="awayrep" data-r="' + r[0] + '" style="min-height:58px"><span class="box" style="border-radius:13px">' + (on ? ICON.check : '') + '</span><span class="col" style="gap:2px;text-align:left"><span style="font-size:14px;font-weight:600">' + r[1] + '</span><span class="xs muted">' + r[2] + '</span></span></button>';
    }).join('');
    return '<button class="iconbtn" data-a="home" aria-label="Terug">' + ICON.back + '</button>' +
      '<div class="col" style="gap:4px"><h1>' + T('away', 'Niet thuis, wel tijd') + '</h1><div class="muted">Drie vragen, dan staat je training klaar.</div></div>' +
      '<div class="col" style="gap:8px"><div style="font-weight:600;font-size:14px">Hoeveel tijd heb je?</div><div class="seg">' + mins + '</div></div>' +
      '<div class="col" style="gap:8px"><div style="font-weight:600;font-size:14px">Wat is er in de buurt?</div><div class="grid2" style="gap:8px">' + items + '</div><div class="xs muted">Niets aangevinkt? Dan alleen oefeningen op de vloer.</div></div>' +
      '<div class="col" style="gap:8px"><div style="font-weight:600;font-size:14px">Welke training vervang je?</div>' + rep + '</div>' +
      '<div class="grow"></div><button class="btn" data-a="awayplan">Maak mijn training</button>';
  }
  function genAway(o) {
    const have = o.items; const seed = o.seed || 0;
    function avail(pool) { return pool.filter(function (id) { const n = EXERCISES[id].needs; return !n || have.indexOf(n) >= 0; }); }
    function rot(arr) { if (!arr.length) return arr; const k = seed % arr.length; return arr.slice(k).concat(arr.slice(0, k)); }
    const push = rot(avail(AWAY.push)); const pull = rot(avail(AWAY.pull)); const legs = rot(avail(AWAY.legs)); const core = rot(avail(AWAY.core));
    function pk(arr, i) { return arr[i % arr.length]; }
    const target = o.replace === 'next' ? nextDay() : 'x';
    const R = { A: { 20: 3, 30: 4, 45: 4 }[o.min], B: { 20: 0, 30: 3, 45: 3 }[o.min], C: { 20: 2, 30: 2, 45: 3 }[o.min] };
    const withLegs = target === 'd3' || target === 'x' || o.min === 45;
    function reps(id, def) { const e = EXERCISES[id]; return e.unit === 'sec' ? '45-60' : def; }
    const blocks = []; const L = ['A', 'B', 'C', 'D'];
    function add(name, rest, rounds, ids, def) {
      if (!rounds || !ids.length) return;
      const letter = L[blocks.length]; const uniq = ids.filter(function (x, i) { return ids.indexOf(x) === i; });
      blocks.push({ name: 'Blok ' + letter + ' · ' + name, groups: [{ rest: rest, items: uniq.map(function (id, i) { return { ex: id, code: letter + (i + 1), sets: rounds, reps: reps(id, def), kg: 0 }; }) }] });
    }
    if (target === 'd3') add('Benen', 45, 3, legs.slice(0, 2), '15-20');
    add('Kracht', 60, R.A, [pk(push, 0), pk(pull, 0)], '8-12');
    add('Hypertrofie', 45, R.B, [pk(push, 1), pk(pull, 1)], '10-15');
    if (withLegs && target !== 'd3') add('Benen', 45, 3, legs.slice(0, 2), '15-20');
    add('Finisher', 30, R.C, [pk(core, 0), pk(core, 1)], '15-20');
    const tdef = DAYMAP[target];
    return { id: 'away', logDay: target, label: target === 'x' ? 'Extra' : tdef.label, name: target === 'x' ? 'Onderweg' : tdef.name + ' onderweg', focus: 'Zonder materiaal', minutes: o.min, blocks: blocks };
  }
  function viewAwayPlan() {
    const plan = genAway(view.opts);
    let blocks = '';
    plan.blocks.forEach(function (b) {
      const g = b.groups[0];
      let rows = '';
      g.items.forEach(function (x) {
        const e = EXERCISES[x.ex];
        rows += '<div class="row" style="gap:12px"><button data-a="zoom" data-src="img/' + e.img + '.jpg" data-name="' + e.name + '" aria-label="Foto vergroten" style="flex-shrink:0"><img src="img/' + e.img + '.jpg" alt="" style="width:84px;height:56px;object-fit:cover;border-radius:10px;display:block"></button><div class="col" style="gap:2px"><div style="font-size:14px;font-weight:600"><span class="muted">' + x.code + '</span> ' + e.name + '</div><div class="xs muted">' + x.sets + ' × ' + unitTxt(e, x.reps) + (e.perSide ? ' per kant' : '') + '</div></div></div>';
      });
      blocks += '<div class="card col"><div class="between"><div style="font-weight:600">' + b.name + '</div><div class="xs" style="color:var(--accent);font-weight:600">' + (g.items.length > 1 ? 'Superset · ' : '') + g.rest + ' s</div></div>' + rows + '</div>';
    });
    const warn = plan.blocks.some(function (b) { return b.groups[0].items.some(function (x) { return x.ex === 'tablerow' || x.ex === 'doorrow'; }); });
    return '<div class="between"><button class="iconbtn" data-a="away" aria-label="Terug">' + ICON.back + '</button><button class="btn sec" style="width:auto;height:44px;padding:0 16px;font-size:14px" data-a="awaymix">Andere mix</button></div>' +
      '<div class="col" style="gap:4px"><div class="eyebrow">' + (plan.logDay === 'x' ? 'Extra training' : 'Vervangt ' + plan.label + ' · ' + DAYMAP[plan.logDay].name) + '</div><h1>Training zonder materiaal</h1><div class="muted">ca. ' + plan.minutes + ' min</div></div>' +
      '<div class="col">' + blocks + '</div>' +
      (warn ? '<div class="card small" style="border:1px solid var(--d3)">Let op: test eerst of de tafel niet kantelt. Trek aan een deur alleen aan de kant waar hij dichtgaat.</div>' : '') +
      '<div class="small muted">Zonder gewicht: 3 tellen omlaag en ga dichter naar falen. Je logt alleen reps.</div>' +
      '<div class="grow"></div><button class="btn" data-a="awaystart">Start training</button>';
  }

  // ---------- nieuw blok ----------
  let draft = null; let lastNB = { tab: 'd1', mode: 'new' };
  function viewNewBlock() {
    const tab = view.tab || 'd1'; const isNew = view.mode !== 'edit';
    const tabs = DAYS.map(function (d) {
      const n = Object.keys(SWAPS[d.id] || {}).length;
      return '<button class="' + (tab === d.id ? 'on' : '') + '" data-a="nbtab" data-id="' + d.id + '">' + d.label + (isNew && n ? ' · ' + n : '') + '</button>';
    }).join('');
    const base = DAYMAP[tab]; let rows = '';
    base.blocks.forEach(function (b) { b.groups.forEach(function (g) { g.items.forEach(function (x) {
      const key = tab + '.' + x.code; const curEx = (settings.overrides || {})[key] || x.ex; const chosen = draft[key] || curEx;
      const changed = chosen !== curEx;
      const sugg = isNew && SWAPS[tab] && SWAPS[tab][x.code];
      let right = '<button class="small" style="color:var(--accent);font-weight:600;padding:12px 4px" data-a="replace" data-key="' + key + '">Vervang</button>';
      if (sugg || changed) {
        right = '<div class="toggle"><button class="' + (changed ? 'on' : '') + '" data-a="nbswap" data-key="' + key + '" data-ex="' + (changed ? chosen : sugg) + '">Wissel</button><button class="' + (!changed ? 'on2' : '') + '" data-a="nbkeep" data-key="' + key + '">Houd</button></div>';
      }
      const label = changed ? '<div class="xs muted" style="text-decoration:line-through">' + EXERCISES[curEx].name + '</div><button style="font-size:15px;font-weight:600;text-align:left" data-a="replace" data-key="' + key + '">' + EXERCISES[chosen].name + '</button>'
        : (sugg ? '<div style="font-size:15px">' + EXERCISES[curEx].name + '</div><div class="xs muted">Voorstel: ' + EXERCISES[sugg].name + '</div>' : '<div style="font-size:15px">' + EXERCISES[curEx].name + '</div>');
      rows += '<div><div class="row" style="gap:10px;min-width:0"><div class="xs" style="width:24px;font-weight:700;color:' + (changed ? 'var(--accent)' : 'var(--muted)') + '">' + x.code + '</div><div class="col" style="gap:2px;min-width:0">' + label + '</div></div>' + right + '</div>';
    }); }); });
    return '<button class="iconbtn" data-a="' + (isNew ? 'home' : 'backup') + '" aria-label="Terug">' + ICON.back + '</button>' +
      '<div class="col" style="gap:4px"><h1>' + (isNew ? 'Blok ' + ((settings.blockNo || 1) + 1) + ': nieuwe oefeningen' : 'Oefeningen aanpassen') + '</h1><div class="muted">Kies per oefening: wisselen of houden.</div></div>' +
      '<div class="seg">' + tabs + '</div>' +
      '<div class="card list" style="padding:4px 14px">' + rows + '</div>' +
      '<div class="grow"></div>' +
      '<button class="btn" data-a="nbsave">' + (isNew ? 'Start blok ' + ((settings.blockNo || 1) + 1) : 'Opslaan') + '</button>' +
      (isNew ? '<div class="xs muted" style="text-align:center;margin-top:-8px">Week 1 begint weer licht, met 2 reps in reserve</div>' : '');
  }
  function viewReplace() {
    const key = view.key; const parts = key.split('.'); const day = parts[0]; const code = parts[1];
    let item = null; DAYMAP[day].blocks.forEach(function (b) { b.groups.forEach(function (g) { g.items.forEach(function (x) { if (x.code === code) item = x; }); }); });
    const curEx = draft[key] || (settings.overrides || {})[key] || item.ex; const e = EXERCISES[curEx];
    const inDay = {}; DAYMAP[day].blocks.forEach(function (b) { b.groups.forEach(function (g) { g.items.forEach(function (x) { inDay[draft[day + '.' + x.code] || (settings.overrides || {})[day + '.' + x.code] || x.ex] = 1; }); }); });
    const sugg = SWAPS[day] && SWAPS[day][code];
    const opts = Object.keys(EXERCISES).filter(function (id) {
      const x = EXERCISES[id]; const awayOnly = ['superman', 'bwsquat', 'climbers', 'bwrussian', 'closepush'].indexOf(id) >= 0; return x.group === e.group && !x.needs && !awayOnly && x.unit !== 'sec' && (id === item.ex || !inDay[id] || id === curEx) && (x.unit === 'kg') === (EXERCISES[item.ex].unit === 'kg');
    });
    opts.sort(function (a, b) { return (b === sugg) - (a === sugg); });
    const list = opts.map(function (id) {
      const x = EXERCISES[id]; const on = id === curEx;
      return '<button class="card row" data-a="pick" data-ex="' + id + '" style="width:100%;text-align:left;padding:10px;gap:12px;border:2px solid ' + (on ? 'var(--accent)' : 'var(--s1)') + '"><img src="img/' + x.img + '.jpg" alt="" style="width:96px;height:64px;object-fit:cover;border-radius:10px"><div class="col" style="gap:3px"><div style="font-weight:600">' + x.name + '</div><div class="xs muted">' + x.muscles + '</div>' + (id === sugg ? '<div class="xs" style="font-weight:700;color:var(--accent)">Voorstel</div>' : id === item.ex ? '<div class="xs muted">Origineel</div>' : '') + '</div></button>';
    }).join('');
    return '<button class="iconbtn" data-a="newblockback" aria-label="Terug">' + ICON.back + '</button>' +
      '<div class="col" style="gap:4px"><div class="eyebrow">' + DAYMAP[day].label + ' · ' + code + '</div><h1>Vervang ' + EXERCISES[item.ex].name + '</h1></div>' +
      '<div class="row" style="flex-wrap:wrap;gap:8px"><span class="pill">' + e.group.charAt(0).toUpperCase() + e.group.slice(1) + '</span><span class="pill">Past bij jouw materiaal</span><span class="pill">' + unitTxt(EXERCISES[item.ex], item.reps) + '</span></div>' +
      '<div class="col">' + list + '</div>';
  }
  function saveDraft(isNew) {
    const ov = Object.assign({}, settings.overrides || {});
    Object.keys(draft).forEach(function (k) {
      const parts = k.split('.'); let orig = null;
      DAYMAP[parts[0]].blocks.forEach(function (b) { b.groups.forEach(function (g) { g.items.forEach(function (x) { if (x.code === parts[1]) orig = x.ex; }); }); });
      if (draft[k] === orig) delete ov[k]; else ov[k] = draft[k];
    });
    settings.overrides = ov;
    if (isNew) { settings.blockStart = iso(new Date()); settings.blockNo = (settings.blockNo || 1) + 1; settings.snoozeUntil = null; }
    save(K.settings, settings); draft = null;
  }

  // ---------- back-up ----------
  function viewBackup() {
    const wi = weekInfo();
    return '<button class="iconbtn" data-a="home" aria-label="Terug">' + ICON.back + '</button>' +
      '<h1>Back-up en instellingen</h1>' +
      '<div class="card col"><div style="font-weight:600">Je logboek</div><div class="small muted">' + log.length + ' trainingen opgeslagen op deze telefoon. ' + (settings.lastBackup ? 'Laatste back-up: ' + fmtShort(settings.lastBackup) + '.' : 'Nog geen back-up gemaakt.') + ' De app herinnert je elke week. Kies bij het delen <b>Bewaar in Bestanden</b> en dan iCloud Drive.</div>' +
      '<button class="btn sec" data-a="export">Back-up maken</button>' +
      '<label class="btn sec" style="line-height:52px;cursor:pointer">Back-up terugzetten<input type="file" accept="application/json,.json" data-a="import" style="display:none"></label></div>' +
      '<div class="card col"><div style="font-weight:600">Thema</div><div class="seg" style="grid-template-columns:repeat(2,1fr)"><button class="' + (!gold() ? 'on' : '') + '" data-a="theme" data-t="standaard">Standaard</button><button class="' + (gold() ? 'on' : '') + '" data-a="theme" data-t="golden">Golden Era</button></div></div>' +
      '<div class="card col"><div style="font-weight:600">Schema</div><div class="small muted">Wissel zelf oefeningen, bijvoorbeeld als je nieuwe gewichten koopt.</div><button class="btn sec" data-a="editex">Oefeningen aanpassen</button></div>' +
      '<div class="card col"><div style="font-weight:600">Blok</div><div class="small muted">Gestart op ' + (settings.blockStart || 'nog niet gestart') + '. Blok ' + (settings.blockNo || 1) + ', nu week ' + wi.week + ' van 4, ' + wi.weeksTotal + ' van 16 weken.</div>' +
      '<button class="btn sec" data-a="resetweek">Opnieuw beginnen bij week 1</button></div>' +
      '<div class="grow"></div><div class="xs muted" style="text-align:center">Plaatjes: Free Exercise DB (public domain)</div>';
  }
  function exportLog() {
    const data = JSON.stringify({ app: 'trainingsapp', version: 1, exported: new Date().toISOString(), log: log, settings: settings }, null, 1);
    const name = 'trainingsapp-backup-' + iso(new Date()) + '.json';
    const file = new File([data], name, { type: 'application/json' });
    function done() { settings.lastBackup = iso(new Date()); save(K.settings, settings); render(); }
    if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).then(done).catch(function () {}); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); done();
  }
  function importLog(input) {
    const f = input.files && input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = function () {
      try {
        const d = JSON.parse(r.result);
        if (!d || !Array.isArray(d.log)) throw new Error('geen logboek');
        log = d.log; if (d.settings) settings = d.settings; saveLog(); save(K.settings, settings);
        sheet('<h2>Teruggezet</h2><div class="muted">' + log.length + ' trainingen staan weer in je logboek.</div><button class="btn" data-a="closesheet">Oké</button>');
        render();
      } catch (e) { sheet('<h2>Dat lukte niet</h2><div class="muted">Dit bestand is geen back-up van deze app.</div><button class="btn" data-a="closesheet">Oké</button>'); }
    };
    r.readAsText(f);
  }

  // ---------- sheet ----------
  function sheet(html) {
    closeSheet();
    const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'sheet';
    bg.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    bg.addEventListener('click', function (e) { if (e.target === bg) closeSheet(); });
    document.body.appendChild(bg);
  }
  function zoom(src, name) {
    closeSheet();
    const bg = document.createElement('div'); bg.className = 'lightbox'; bg.id = 'sheet';
    bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true'); bg.setAttribute('aria-label', name);
    bg.innerHTML = '<div class="lbtop"><div style="font-weight:600">' + name + '</div><button class="iconbtn" data-a="closesheet" aria-label="Sluiten">' + ICON.close + '</button></div>' +
      '<div class="lbimg"><figure><img src="' + src + '" alt="' + name + ': stap 1" style="object-position:0% 50%"><figcaption>Stap 1</figcaption></figure>' +
      '<figure><img src="' + src + '" alt="' + name + ': stap 2" style="object-position:100% 50%"><figcaption>Stap 2</figcaption></figure></div>' +
      '<div class="xs muted" style="text-align:center">Tik ergens om te sluiten</div>';
    bg.addEventListener('click', function () { closeSheet(); });
    document.body.appendChild(bg);
  }
  function closeSheet() { const s = document.getElementById('sheet'); if (s) s.remove(); }

  // ---------- render ----------
  let timer = null;
  function render() {
    clearInterval(timer); timer = null;
    let html = '';
    if (view.name === 'workout' && active) html = viewWorkout();
    else if (view.name === 'choose') html = viewChoose();
    else if (view.name === 'day') html = viewDay();
    else if (view.name === 'overview') html = viewOverview();
    else if (view.name === 'backup') html = viewBackup();
    else if (view.name === 'away') html = viewAway();
    else if (view.name === 'awayplan') html = viewAwayPlan();
    else if (view.name === 'newblock' && draft) html = viewNewBlock();
    else if (view.name === 'replace' && draft) html = viewReplace();
    else { view = { name: 'home' }; html = viewHome(); }
    document.body.className = gold() ? 'golden' : '';
    app.innerHTML = html;
    if (view.name === 'workout' && active && active.phase === 'rest') timer = setInterval(tick, 250);
  }
  function tick() {
    const left = (active.restEnd - Date.now()) / 1000;
    const clock = document.getElementById('clock'); const ring = document.getElementById('ringc');
    if (left <= 0) { clearInterval(timer); timer = null; endRest(true); return; }
    if (clock) clock.textContent = mmss(left);
    if (ring) { const C = 2 * Math.PI * 105; ring.setAttribute('stroke-dashoffset', (C * (1 - Math.max(0, left / active.restTotal))).toFixed(1)); }
  }
  function endRest(signal) {
    active.phase = 'set'; active.restEnd = 0; saveActive(); render();
    if (signal) { beep(); app.classList.add('flash'); setTimeout(function () { app.classList.remove('flash'); }, 2100); }
  }

  // ---------- acties ----------
  function stepKg(dir) {
    const list = settings.weights.slice().sort(function (a, b) { return a - b; });
    const cur = active.val.kg; let next = cur;
    if (dir > 0) { next = list.find(function (w) { return w > cur; }); if (next === undefined) next = cur; }
    else { const lower = list.filter(function (w) { return w < cur; }); next = lower.length ? lower[lower.length - 1] : Math.max(0, cur - 1); }
    active.val.kg = next;
  }

  function setDone() {
    const step = active.steps[active.idx]; const item = itemOf(step);
    const rec = { ex: item.ex, set: step.set, reps: active.val.reps, kg: active.val.kg };
    rec.up = !!diffBadge(rec);
    active.sets.push(rec);
    active.idx++; active.val = null;
    if (active.idx >= active.steps.length) active.phase = 'done';
    else if (step.blockEnd) active.phase = 'block';
    else { active.phase = 'rest'; active.restTotal = step.rest; active.restEnd = Date.now() + step.rest * 1000; }
    saveActive(); render(); window.scrollTo(0, 0);
  }

  function finish(keepPartial) {
    if (active.sets.length) {
      log.push({ id: active.startedAt, day: active.logDay || active.day, away: !!active.custom, date: iso(new Date(active.startedAt)), start: active.startedAt, end: Date.now(), week: active.week, deload: active.deload, feel: active.feel || null, sets: active.sets.map(function (s) { return { ex: s.ex, set: s.set, reps: s.reps, kg: s.kg }; }) });
      log.sort(function (a, b) { return a.start - b.start; });
      saveLog();
    }
    active = null; saveActive(); localStorage.removeItem(K.active); releaseAwake();
    go({ name: 'home' });
    if (backupDue()) sheet('<h2>Even een back-up?</h2><div class="muted">Je laatste back-up is meer dan een week oud. Kies straks <b>Bewaar in Bestanden</b> en dan iCloud Drive.</div><button class="btn" data-a="backupnow">Back-up maken</button><button class="btn ghost" data-a="closesheet">Later</button>');
  }

  document.addEventListener('change', function (e) {
    const t = e.target; if (t && t.dataset && t.dataset.a === 'import') importLog(t);
  });

  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-a]'); if (!el) return;
    const a = el.dataset.a;
    if (a === 'import') return;
    switch (a) {
      case 'home': go({ name: 'home' }); break;
      case 'choose': go({ name: 'choose' }); break;
      case 'overview': go({ name: 'overview' }); break;
      case 'backup': go({ name: 'backup' }); break;
      case 'resume': unlockAudio(); keepAwake(); go({ name: 'workout' }); break;
      case 'day': go({ name: 'day', id: el.dataset.id }); break;
      case 'start':
        if (active) { sheet('<h2>Er loopt al een training</h2><div class="muted">Ga daar eerst mee verder, of stop hem.</div><button class="btn" data-a="resume">Verder met training</button><button class="btn ghost" data-a="closesheet">Annuleren</button>'); break; }
        startWorkout(el.dataset.id); break;
      case 'year': view.year = (view.year || new Date().getFullYear()) + (+el.dataset.d); render(); break;
      case 'warm': { const i = +el.dataset.i; const p = active.warm.indexOf(i); if (p >= 0) active.warm.splice(p, 1); else active.warm.push(i); saveActive(); render(); break; }
      case 'warmdone': unlockAudio(); active.phase = 'set'; saveActive(); render(); window.scrollTo(0, 0); break;
      case 'reps': { const st = EXERCISES[itemOf(active.steps[active.idx]).ex].unit === 'sec' ? 5 : 1; active.val.reps = Math.max(0, active.val.reps + st * (+el.dataset.d)); saveActive(); render(); break; }
      case 'kg': stepKg(+el.dataset.d); saveActive(); render(); break;
      case 'setdone': unlockAudio(); setDone(); break;
      case 'plus15': active.restEnd += 15000; active.restTotal += 15; saveActive(); render(); break;
      case 'skip': endRest(false); break;
      case 'nextblock': active.phase = 'set'; saveActive(); render(); window.scrollTo(0, 0); break;
      case 'feel': active.feel = el.dataset.f; saveActive(); render(); break;
      case 'finish': finish(); break;
      case 'quit':
        sheet('<h2>Training stoppen?</h2><div class="muted">' + active.sets.length + (active.sets.length === 1 ? ' set' : ' sets') + ' gedaan.</div>' +
          (active.sets.length ? '<button class="btn" data-a="stopsave">Stoppen en opslaan</button>' : '') +
          '<button class="btn sec" data-a="stopdiscard">Stoppen zonder opslaan</button><button class="btn ghost" data-a="closesheet">Doorgaan met trainen</button>');
        break;
      case 'stopsave': closeSheet(); finish(); break;
      case 'stopdiscard': closeSheet(); active.sets = []; finish(); break;
      case 'closesheet': closeSheet(); break;
      case 'zoom': zoom(el.dataset.src, el.dataset.name); break;
      case 'backupnow': closeSheet(); exportLog(); break;
      case 'export': exportLog(); break;
      case 'resetweek':
        sheet('<h2>Opnieuw bij week 1?</h2><div class="muted">Je logboek blijft staan. Alleen de weektelling begint vandaag opnieuw.</div><button class="btn" data-a="resetyes">Ja, week 1</button><button class="btn ghost" data-a="closesheet">Annuleren</button>');
        break;
      case 'away': go({ name: 'away', opts: settings.awayOpts || { min: 30, items: ['stoel', 'tafel', 'rugzak'], replace: 'next', seed: 0 } }); break;
      case 'awaymin': view.opts.min = +el.dataset.m; render(); break;
      case 'awayitem': { const i = view.opts.items.indexOf(el.dataset.id); if (i >= 0) view.opts.items.splice(i, 1); else view.opts.items.push(el.dataset.id); render(); break; }
      case 'awayrep': view.opts.replace = el.dataset.r; render(); break;
      case 'awayplan': settings.awayOpts = { min: view.opts.min, items: view.opts.items.slice(), replace: view.opts.replace, seed: 0 }; save(K.settings, settings); go({ name: 'awayplan', opts: Object.assign({}, view.opts, { seed: 0 }) }); break;
      case 'awaymix': view.opts.seed = (view.opts.seed || 0) + 1; render(); break;
      case 'awaystart':
        if (active) { sheet('<h2>Er loopt al een training</h2><div class="muted">Ga daar eerst mee verder, of stop hem.</div><button class="btn" data-a="resume">Verder met training</button><button class="btn ghost" data-a="closesheet">Annuleren</button>'); break; }
        { const plan = genAway(view.opts); startWorkout(plan.logDay === 'x' ? 'x' : plan.logDay, plan); } break;
      case 'snooze': { const d = new Date(); d.setDate(d.getDate() + 28); settings.snoozeUntil = iso(d); save(K.settings, settings); render(); break; }
      case 'newblock': draft = {}; Object.keys(SWAPS).forEach(function (day) { Object.keys(SWAPS[day]).forEach(function (code) { draft[day + '.' + code] = SWAPS[day][code]; }); }); go({ name: 'newblock', tab: 'd1', mode: 'new' }); break;
      case 'editex': draft = {}; go({ name: 'newblock', tab: 'd1', mode: 'edit' }); break;
      case 'nbtab': view.tab = el.dataset.id; render(); break;
      case 'nbswap': draft[el.dataset.key] = el.dataset.ex; render(); break;
      case 'nbkeep': delete draft[el.dataset.key]; { const k = el.dataset.key; const ov = settings.overrides || {}; if (ov[k]) { const parts = k.split('.'); DAYMAP[parts[0]].blocks.forEach(function (b) { b.groups.forEach(function (g) { g.items.forEach(function (x) { if (x.code === parts[1]) draft[k] = ov[k]; }); }); }); } } render(); break;
      case 'replace': lastNB = { tab: view.tab, mode: view.mode }; go({ name: 'replace', key: el.dataset.key }); break;
      case 'pick': draft[view.key] = el.dataset.ex; go({ name: 'newblock', tab: lastNB.tab, mode: lastNB.mode }); break;
      case 'newblockback': go({ name: 'newblock', tab: lastNB.tab, mode: lastNB.mode }); break;
      case 'nbsave': { const isNew = view.mode !== 'edit'; saveDraft(isNew); go({ name: isNew ? 'home' : 'backup' }); if (isNew) sheet('<h2>Blok ' + settings.blockNo + ' gestart</h2><div class="muted">Je nieuwe oefeningen staan klaar. Week 1 begint vandaag.</div><button class="btn" data-a="closesheet">Top</button>'); break; }
      case 'theme': settings.theme = el.dataset.t; save(K.settings, settings); render(); break;
      case 'resetyes': settings.blockStart = iso(new Date()); save(K.settings, settings); closeSheet(); render(); break;
    }
    if (a === 'resume') closeSheet();
  });

  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
