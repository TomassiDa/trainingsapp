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
  function itemOf(step) { return DAYMAP[active.day].blocks[step.bi].groups[step.gi].items[step.ii]; }

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
    if (!log.length) return 'd1';
    const last = log[log.length - 1].day;
    return last === 'd1' ? 'd2' : 'd1';
  }

  function viewHome() {
    const now = new Date(); const wd = weekDots(); const year = now.getFullYear();
    const yearCount = log.filter(function (x) { return x.date.slice(0, 4) === String(year); }).length;
    const nd = DAYMAP[nextDay()];
    let resume = '';
    if (active) {
      const d = DAYMAP[active.day];
      resume = '<button class="card hl col" data-a="resume" style="text-align:left;width:100%"><div class="eyebrow" style="color:var(--accent)">Training bezig</div><h2>' + d.label + ' · ' + d.name + '</h2><div class="small muted">Tik om verder te gaan</div></button>';
    }
    return '' +
      '<div class="col" style="gap:6px;margin-top:20px"><div class="eyebrow">' + NL_DAYS[now.getDay()] + ' ' + now.getDate() + ' ' + NL_MONTHS[now.getMonth()] + '</div><h1 style="font-size:44px">' + greet() + '</h1></div>' +
      resume +
      '<div class="card col" style="gap:12px"><div class="between"><div style="font-weight:600">Deze week</div><div class="small muted">' + wd.done + ' van 2-3 trainingen</div></div><div class="week">' + wd.html + '</div></div>' +
      '<div class="col" style="gap:12px">' +
        '<button class="big" data-a="choose" style="background:var(--accent);color:#111315"><div class="col" style="gap:6px"><div class="t">Start training</div><div class="small" style="font-weight:500">Volgende: ' + nd.label + ' · ' + nd.name + '</div></div>' + ICON.play + '</button>' +
        '<button class="big" data-a="overview" style="background:var(--s1)"><div class="col" style="gap:6px"><div class="t">Overzicht</div><div class="small muted">' + year + ' · ' + yearCount + (yearCount === 1 ? ' training' : ' trainingen') + '</div></div>' + ICON.cal + '</button>' +
      '</div>' +
      '<div class="grow"></div>' +
      '<div class="legend"><div><span style="background:var(--accent)"></span>Dag 1</div><div><span style="background:var(--d2)"></span>Dag 2</div><div><span style="background:var(--d3)"></span>Dag 3</div></div>' +
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
    const d = DAYMAP[view.id]; const wi = weekInfo();
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
  function startWorkout(dayId) {
    unlockAudio(); keepAwake();
    const wi = weekInfo();
    if (!settings.blockStart) { settings.blockStart = iso(new Date()); save(K.settings, settings); }
    active = { day: dayId, startedAt: Date.now(), deload: wi.deload, week: wi.week, steps: buildSteps(DAYMAP[dayId], wi.deload), idx: 0, phase: 'warmup', warm: [], sets: [], restEnd: 0, restTotal: 0, val: null };
    saveActive(); go({ name: 'workout' });
  }

  function topbar(label) {
    return '<div class="between"><button class="iconbtn" data-a="quit" aria-label="Training stoppen">' + ICON.close + '</button><div class="small muted" style="text-align:center">' + label + '</div><div style="width:44px"></div></div>';
  }
  function exProgress() {
    // balkje per oefening van de hele training
    const day = DAYMAP[active.day]; const items = [];
    day.blocks.forEach(function (b, bi) { b.groups.forEach(function (g, gi) { g.items.forEach(function (x, ii) { items.push(bi + '.' + gi + '.' + ii); }); }); });
    const cur = active.steps[active.idx]; const curKey = cur ? cur.bi + '.' + cur.gi + '.' + cur.ii : '';
    const doneKeys = {};
    active.steps.forEach(function (s, i) { if (i < active.idx && s.set === s.sets) doneKeys[s.bi + '.' + s.gi + '.' + s.ii] = 1; });
    return '<div class="progress" style="grid-template-columns:repeat(' + items.length + ',1fr)">' + items.map(function (k) { return '<div class="' + (doneKeys[k] ? 'on' : k === curKey ? 'now' : '') + '"></div>'; }).join('') + '</div>';
  }
  function stepLabel(step) {
    const b = DAYMAP[active.day].blocks[step.bi];
    if (!step.superset) return b.name;
    const g = b.groups[step.gi]; const rounds = Math.max.apply(null, g.items.map(function (x) { return active.deload ? Math.ceil(x.sets / 2) : x.sets; }));
    return b.name.split(' · ')[0] + ' · Superset · ronde ' + step.set + ' van ' + rounds;
  }

  function viewWarmup() {
    const d = DAYMAP[active.day];
    const doneN = active.warm.length;
    let rows = '';
    WARMUP.forEach(function (w, i) {
      const done = active.warm.indexOf(i) >= 0;
      rows += '<button class="check' + (done ? ' done' : '') + '" data-a="warm" data-i="' + i + '"><span class="box">' + (done ? ICON.check : '') + '</span><span class="lbl grow">' + w.name + '</span><span class="small muted">' + w.amount + '</span></button>';
    });
    const first = EXERCISES[itemOf(active.steps[0]).ex].name.toLowerCase();
    rows = rows.replace('Lichte set van de eerste oefening', 'Lichte set ' + first);
    return topbar(d.label + ' · ' + d.name) +
      '<div class="col" style="gap:4px"><div class="eyebrow">Stap 1</div><h1>Warming-up</h1><div class="muted">Tik af wat je gedaan hebt. ' + doneN + ' van ' + WARMUP.length + ' klaar.</div></div>' +
      '<div class="col">' + rows + '</div>' +
      '<div class="grow"></div>' +
      '<button class="btn" data-a="warmdone">Naar ' + DAYMAP[active.day].blocks[0].name.split(' · ')[0].replace('Blok', 'blok') + '</button>' +
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
    if (p.last) prev = 'Vorige keer: ' + (e.unit === 'kg' ? kgTxt(p.last.set.kg) + ' kg × ' : '') + p.last.set.reps + (e.unit === 'kg' ? '' : ' reps');
    const pills = '<span class="pill">' + item.reps + ' reps' + (e.perSide ? ' per kant' : '') + '</span>' +
      '<span class="pill">' + (e.unit === 'kg' ? kgTxt(item.kg) + ' kg' : 'Lichaamsgewicht') + '</span>' +
      (item.tempo ? '<span class="pill">Tempo ' + item.tempo + '</span>' : '');
    const next = active.steps[active.idx + 1];
    let after = 'Laatste set van de training';
    if (next) {
      const nn = EXERCISES[itemOf(next).ex].name;
      after = step.blockEnd ? 'Daarna is dit blok klaar' : 'Daarna ' + step.rest + ' s rust, dan ' + itemOf(next).code + ' ' + nn + (next.set > 1 ? ' set ' + next.set : '');
    }
    const kgStepper = e.unit === 'kg' ? '<div class="col" style="gap:6px"><div class="xs muted" style="font-weight:600">Gewicht (kg)</div><div class="stepper"><button data-a="kg" data-d="-1" aria-label="Lichter">−</button><div class="v">' + kgTxt(active.val.kg) + '</div><button data-a="kg" data-d="1" aria-label="Zwaarder">+</button></div></div>' : '';
    return topbar(stepLabel(step)) + exProgress() +
      '<img class="exhero" src="img/' + e.img + '.jpg" alt="' + e.name + ': begin- en eindpositie">' +
      '<div class="col" style="gap:8px"><div class="row" style="align-items:baseline"><div class="num" style="font-size:20px;color:var(--accent)">' + item.code + '</div><h1 style="font-size:36px">' + e.name + '</h1></div>' +
      '<div class="row" style="flex-wrap:wrap;gap:8px">' + pills + '</div>' +
      '<div class="small muted" style="font-size:14px;line-height:1.4">' + e.cue + '</div></div>' +
      '<div class="card col" style="gap:12px"><div class="between"><div class="num" style="font-size:22px">Set ' + step.set + ' van ' + step.sets + '</div><div class="small muted">' + prev + '</div></div>' +
      '<div class="' + (e.unit === 'kg' ? 'grid2' : 'col') + '"><div class="col" style="gap:6px"><div class="xs muted" style="font-weight:600">Reps</div><div class="stepper"><button data-a="reps" data-d="-1" aria-label="Rep minder">−</button><div class="v">' + active.val.reps + '</div><button data-a="reps" data-d="1" aria-label="Rep meer">+</button></div></div>' + kgStepper + '</div></div>' +
      '<div class="grow"></div>' +
      '<button class="btn" data-a="setdone">Set klaar</button><div class="small muted" style="text-align:center;margin-top:-8px">' + after + '</div>';
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
      '<div class="card between"><div class="col" style="gap:2px"><div class="xs muted">Opgeslagen</div><div style="font-weight:600">' + re.name + ' · ' + (re.unit === 'kg' ? kgTxt(rec.kg) + ' kg × ' : '') + rec.reps + (re.unit === 'kg' ? '' : ' reps') + '</div></div>' + (badge ? '<span class="badge">' + badge + '</span>' : '') + '</div>' +
      '<div class="col" style="align-items:center;gap:8px;padding-top:6px"><div class="eyebrow">Rust</div>' +
      '<div class="ring"><svg width="250" height="250" viewBox="0 0 250 250" aria-hidden="true"><circle cx="125" cy="125" r="105" fill="none" stroke="#262A2F" stroke-width="14"/><circle id="ringc" cx="125" cy="125" r="105" fill="none" stroke="#C8F53C" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - frac)).toFixed(1) + '" transform="rotate(-90 125 125)"/></svg>' +
      '<div class="c"><div class="num" id="clock" role="timer" aria-live="off">' + mmss(left) + '</div><div class="small muted">van ' + mmss(active.restTotal) + '</div></div></div></div>' +
      '<div class="grid2"><button class="btn sec" data-a="plus15">+15 s</button><button class="btn sec" data-a="skip">Overslaan</button></div>' +
      '<div class="grow"></div>' +
      '<div class="card row" style="padding:12px"><img src="img/' + ne.img + '.jpg" alt="" style="width:88px;height:60px;object-fit:cover;border-radius:10px"><div class="col" style="gap:2px"><div class="xs muted">Hierna</div><div style="font-weight:600">' + ni.code + ' ' + ne.name + '</div><div class="small muted">Set ' + next.set + ' van ' + next.sets + ' · ' + ni.reps + ' reps</div></div></div>' +
      '<div class="xs muted" style="text-align:center">Je hoort een piep als de rust voorbij is</div>';
  }

  function viewBlockDone() {
    const prevStep = active.steps[active.idx - 1]; const b = DAYMAP[active.day].blocks[prevStep.bi];
    let rows = ''; let ups = 0;
    b.groups.forEach(function (g) {
      g.items.forEach(function (x) {
        const e = EXERCISES[x.ex];
        const mine = active.sets.filter(function (s) { return s.ex === x.ex; });
        let boxes = '';
        mine.forEach(function (s) { const up = !!s.up; if (up) ups++; boxes += '<div class="' + (up ? 'up' : '') + '">' + s.reps + '</div>'; });
        const kgs = e.unit === 'kg' && mine.length ? kgTxt(mine[0].kg) + ' kg' : 'lichaam';
        rows += '<div class="col" style="gap:8px"><div class="between" style="font-weight:600"><div>' + e.name + '</div><div class="muted small">' + kgs + '</div></div><div class="setboxes">' + boxes + '</div></div>';
      });
    });
    const nb = DAYMAP[active.day].blocks[prevStep.bi + 1];
    let nextHtml = '';
    if (nb) {
      let nr = '';
      nb.groups.forEach(function (g) { nr += '<div class="between" style="font-size:14px"><div>' + g.items.map(function (x) { return x.code + ' ' + EXERCISES[x.ex].name; }).join(' + ') + '</div></div>'; });
      nextHtml = '<div class="col"><div class="eyebrow">Hierna · ' + nb.name + '</div><div class="card col">' + nr + '</div></div>';
    }
    return '<div class="between small muted"><div>' + DAYMAP[active.day].label + ' · ' + mmss((Date.now() - active.startedAt) / 1000) + ' bezig</div><div>Blok ' + (prevStep.bi + 1) + ' van ' + DAYMAP[active.day].blocks.length + '</div></div>' +
      '<div class="col"><div style="width:56px;height:56px;border-radius:28px;background:var(--accent);display:flex;align-items:center;justify-content:center">' + ICON.bigcheck + '</div><h1>' + b.name.split(' · ')[0] + ' klaar</h1><div class="muted">' + (ups ? ups + ' set' + (ups > 1 ? 's' : '') + ' beter dan vorige keer' : 'Goed bezig') + '</div></div>' +
      '<div class="card col" style="gap:14px">' + rows + '<div class="xs muted">Groen = beter dan vorige keer</div></div>' +
      nextHtml + '<div class="grow"></div>' +
      '<button class="btn" data-a="nextblock">Start ' + nb.name.split(' · ')[0].replace('Blok', 'blok') + '</button>';
  }

  function viewDone() {
    const d = DAYMAP[active.day]; const mins = Math.round((Date.now() - active.startedAt) / 60000);
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
    return '<div class="col" style="gap:4px;margin-top:20px"><div class="eyebrow">' + d.label + ' · ' + d.name + ' · week ' + active.week + '</div><h1 style="font-size:44px">Training klaar</h1></div>' +
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
    const cnt = { d1: 0, d2: 0, d3: 0 };
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
    const total = cnt.d1 + cnt.d2 + cnt.d3;
    return '<div class="between"><button class="iconbtn" data-a="home" aria-label="Terug">' + ICON.back + '</button>' +
      '<div class="row" style="gap:0"><button class="iconbtn" style="background:none" data-a="year" data-d="-1" aria-label="Vorig jaar">' + ICON.back + '</button><div class="num" style="font-size:24px">' + year + '</div><button class="iconbtn" style="background:none;transform:scaleX(-1)" data-a="year" data-d="1" aria-label="Volgend jaar">' + ICON.back + '</button></div><div style="width:44px"></div></div>' +
      '<h1>Overzicht</h1>' +
      '<div class="grid4"><div class="stat"><div class="num">' + total + '</div><div class="xs muted">totaal</div></div><div class="stat"><div class="num" style="color:var(--accent)">' + cnt.d1 + '</div><div class="xs muted">Dag 1</div></div><div class="stat"><div class="num" style="color:var(--d2)">' + cnt.d2 + '</div><div class="xs muted">Dag 2</div></div><div class="stat"><div class="num" style="color:var(--d3)">' + cnt.d3 + '</div><div class="xs muted">Dag 3</div></div></div>' +
      '<div class="months">' + months + '</div><div class="grow"></div>' +
      '<div class="legend"><div><span style="background:var(--accent)"></span>Dag 1</div><div><span style="background:var(--d2)"></span>Dag 2</div><div><span style="background:var(--d3)"></span>Dag 3</div><div><span style="background:var(--s2)"></span>Rust</div></div>';
  }

  // ---------- back-up ----------
  function viewBackup() {
    const wi = weekInfo();
    return '<button class="iconbtn" data-a="home" aria-label="Terug">' + ICON.back + '</button>' +
      '<h1>Back-up en instellingen</h1>' +
      '<div class="card col"><div style="font-weight:600">Je logboek</div><div class="small muted">' + log.length + ' trainingen opgeslagen op deze telefoon. Maak af en toe een back-up, bijvoorbeeld naar iCloud Drive.</div>' +
      '<button class="btn sec" data-a="export">Back-up maken</button>' +
      '<label class="btn sec" style="line-height:52px;cursor:pointer">Back-up terugzetten<input type="file" accept="application/json,.json" data-a="import" style="display:none"></label></div>' +
      '<div class="card col"><div style="font-weight:600">Blok</div><div class="small muted">Gestart op ' + (settings.blockStart || 'nog niet gestart') + '. Nu week ' + wi.week + ' van 4, ' + wi.weeksTotal + ' weken in totaal.</div>' +
      '<button class="btn sec" data-a="resetweek">Opnieuw beginnen bij week 1</button></div>' +
      '<div class="grow"></div><div class="xs muted" style="text-align:center">Plaatjes: Free Exercise DB (public domain)</div>';
  }
  function exportLog() {
    const data = JSON.stringify({ app: 'trainingsapp', version: 1, exported: new Date().toISOString(), log: log, settings: settings }, null, 1);
    const name = 'trainingsapp-backup-' + iso(new Date()) + '.json';
    const file = new File([data], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(function () {}); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click();
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
    else { view = { name: 'home' }; html = viewHome(); }
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
      log.push({ id: active.startedAt, day: active.day, date: iso(new Date(active.startedAt)), start: active.startedAt, end: Date.now(), week: active.week, deload: active.deload, feel: active.feel || null, sets: active.sets.map(function (s) { return { ex: s.ex, set: s.set, reps: s.reps, kg: s.kg }; }) });
      log.sort(function (a, b) { return a.start - b.start; });
      saveLog();
    }
    active = null; saveActive(); localStorage.removeItem(K.active); releaseAwake();
    go({ name: 'home' });
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
      case 'reps': active.val.reps = Math.max(0, active.val.reps + (+el.dataset.d)); saveActive(); render(); break;
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
      case 'export': exportLog(); break;
      case 'resetweek':
        sheet('<h2>Opnieuw bij week 1?</h2><div class="muted">Je logboek blijft staan. Alleen de weektelling begint vandaag opnieuw.</div><button class="btn" data-a="resetyes">Ja, week 1</button><button class="btn ghost" data-a="closesheet">Annuleren</button>');
        break;
      case 'resetyes': settings.blockStart = iso(new Date()); save(K.settings, settings); closeSheet(); render(); break;
    }
    if (a === 'resume') closeSheet();
  });

  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
