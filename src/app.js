'use strict';
/* Life is a Journey: app logic.
   Plain JavaScript, no framework, so it can later be wrapped as an Android app unchanged. */

const VERSION = '0.1.0';
const STORE_KEY = 'lij.state.v1';

const PHOSPHORS = {
  orange: { label: 'ORANGE', note: 'classic', fg: '#FF9F3A', dim: '#C47A2C', faint: '#5A3612' },
  green: { label: 'GREEN', note: 'classic', fg: '#45FF7A', dim: '#2FB857', faint: '#124D22' },
  amber: { label: 'AMBER', note: 'yellow', fg: '#FFCC3D', dim: '#C29A2C', faint: '#54420F' },
  red: { label: 'WARM RED', note: 'ember', fg: '#FF6A4D', dim: '#D0503A', faint: '#4F1C12' },
  blue: { label: 'BLUE', note: 'cold', fg: '#5CB8FF', dim: '#4A8FCC', faint: '#15344F' },
  purple: { label: 'PURPLE', note: 'arcane', fg: '#C38BFF', dim: '#9466C9', faint: '#3B2556' },
  white: { label: 'WHITE', note: 'plain', fg: '#EDEDED', dim: '#A8A8A8', faint: '#3A3A3A' }
};
const WEATHER = ['CLEAR', 'FAIR', 'GREY', 'RAIN', 'STORM'];
const RARITY = { c: 'COMMON', u: 'UNCOMMON', r: 'RARE', l: 'LEGENDARY' };
// [chance of a spell, rarity weights]
const DROPS = {
  floor: [0.5, { c: 20, u: 35, r: 33, l: 12 }],
  peek: [0.4, { c: 25, u: 35, r: 30, l: 10 }],
  landmark: [0.3, { c: 45, u: 35, r: 20 }],
  dispel: [0.25, { c: 40, u: 40, r: 20 }],
  review: [0.15, { c: 50, u: 35, r: 15 }],
  steady: [0.08, { c: 70, u: 30 }],
  cast: [0.06, { c: 75, u: 25 }],
  errand: [0.04, { c: 80, u: 20 }],
  prophecy: [0.2, { c: 45, u: 35, r: 20 }],
  suppress: [0.12, { c: 50, u: 35, r: 15 }],
  revisit: [0.12, { c: 50, u: 35, r: 15 }],
  small: [0.02, { c: 100 }]
};
const SOURCE_LABEL = {
  floor: 'clearing a delve floor', peek: 'opening a chest', landmark: 'at a landmark', dispel: 'breaking a hex',
  review: 'at lantern hour', steady: 'while steadying', cast: 'casting a ritual', errand: 'finishing an errand',
  prophecy: 'judging a prophecy', suppress: 'while suppressing', revisit: 'revisiting a hex', steps: 'on foot', small: 'at camp'
};
const CAMP_LINES = {
  DAWN: ['Mist on the road. Last night\'s fire still holds a few coals.', 'The first birds are arguing about the light.'],
  MORNING: ['Morning on the road. The kettle is already warm.', 'The road is dry and the air is cool.'],
  AFTERNOON: ['You rest in the shade beside the road.', 'The afternoon is long and in no hurry.'],
  EVENING: ['You make camp beside the road. The fire catches on the second try.', 'Evening. The pack comes off, and your shoulders remember they are shoulders.'],
  NIGHT: ['The stars are out. Behind you, the road you walked keeps its shape.', 'Night. The fire is low and the world is small and quiet.']
};
const TITLE_ART = String.raw`
            .        *
    *            .-.       .
                (   )
       .         ` + '`-\'' + String.raw`    *
          /\
     /\  /  \      /\
    /  \/    \  /\/  \   /\
   /   /      \/  \   \ /  \
  ==========@=================`;
const RING_ART = String.raw`
    . - ~ ~ - .
 .'             '.
:                 :
 '.             .'
    ' - ~ ~ - '`;

/* ---------------- small helpers ---------------- */

const $ = (sel, root) => (root || document).querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function pad(n) { return String(n).padStart(2, '0'); }
function dkey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
// The app's day can turn later than midnight (Options > THE DAY TURNS AT), for late nights.
function today() { const off = (S && S.settings && S.settings.dayTurn) || 0; return dkey(new Date(Date.now() - off * 3600000)); }
function dayOne() { return (S.settings && S.settings.dayOne) || S.created; }
function dayNumber() { return daysBetween(dayOne(), today()) + 1; }
function parseD(k) { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function addDays(k, n) { const d = parseD(k); d.setDate(d.getDate() + n); return dkey(d); }
function daysBetween(a, b) { return Math.round((parseD(b) - parseD(a)) / 86400000); }
function hm(d) { d = d || new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function weekStart(k) { const d = parseD(k); const wd = (d.getDay() + 6) % 7; return addDays(k, -wd); }
function fmtDate(k) {
  if (!k) return '';
  const t = today();
  if (k === t) return 'today';
  if (k === addDays(t, 1)) return 'tomorrow';
  if (k === addDays(t, -1)) return 'yesterday';
  const d = parseD(k);
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return d.getDate() + ' ' + m + (d.getFullYear() !== parseD(t).getFullYear() ? ' ' + d.getFullYear() : '');
}
function pct(x) { return Math.round(x * 100) + '%'; }
function avg(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function round1(x) { return Math.round(x * 10) / 10; }
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickR(arr, rng) { return arr[Math.floor((rng || Math.random)() * arr.length)]; }
function pickWeighted(w) {
  const keys = Object.keys(w); const total = keys.reduce((s, k) => s + w[k], 0);
  let x = Math.random() * total;
  for (const k of keys) { x -= w[k]; if (x < 0) return k; }
  return keys[keys.length - 1];
}
const SMALL_WORDS = ['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'and', 'or', 'from', 'with'];
// Title case for a phrase that sits mid-title, so leading articles stay lower case ("Make a Wooden Spoon Hum").
function titleCase(s) {
  return s.split(' ').map((w) => SMALL_WORDS.includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

/* ---------------- state ---------------- */

let S = null;
const UI = { tab: 'camp', stack: [], form: {}, modals: [], toast: null, confirm: null, filter: 'all' };
let tickers = [];

function freshState() {
  return {
    v: 1,
    created: today(),
    createdAt: Date.now(),
    savedAt: 0,
    seed: (Math.random() * 2147483647) | 0,
    settings: { phosphor: 'orange', scan: true, glow: true, size: 'm', title: 'LIFE IS A JOURNEY', lantern: '19:00', dayTurn: 0, dayOne: null, companion: true },
    rolls: {},
    errands: [],
    rituals: [],
    days: {},
    log: [],
    events: [],
    delves: [],
    dispels: [],
    seals: [],
    spells: [],
    spellUsed: { l: [], r: [], g: {} },
    journey: { done: 0, plan: [], used: [], names: [], lm: [] },
    waystones: [],
    prophecies: [],
    suppressions: [],
    weightGoals: [],
    active: null,
    mana: { at: null, snaps: [] },
    lastWaystone: null
  };
}
function migrate(s) {
  const f = freshState();
  for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
  for (const k of Object.keys(f.settings)) if (s.settings[k] === undefined) s.settings[k] = f.settings[k];
  (s.rituals || []).forEach((r) => {
    if (!r.per) r.per = 1;
    if (!r.mode) r.mode = 'daily';
    if (!r.week) r.week = 1;
    if (!Array.isArray(r.restWeeks)) r.restWeeks = [];
    if (!r.hits) { r.hits = {}; Object.keys(r.casts || {}).forEach((d) => { r.hits[d] = [r.casts[d]]; }); }
  });
  // Hexes broken before revisits existed were answered on the day they were written, and have no revisit.
  (s.errands || []).forEach((e) => { if (e.need == null) e.need = 1; if (e.got == null) e.got = 0; });
  if (!Array.isArray(s.weightGoals)) s.weightGoals = [];
  (s.dispels || []).forEach((x) => {
    if (x.after != null && !x.ad) x.ad = x.d;
    if (x.rv === undefined) { x.rv = 0; x.due = null; x.later = null; x.ld = null; x.pid = x.pid || null; }
  });
  return s;
}
function isEmptyState(s) {
  return !s || (!s.events.length && !s.errands.length && !s.rituals.length && !s.delves.length && !s.seals.length);
}
function validState(s) {
  return s && typeof s === 'object' && s.v === 1 && s.settings && Array.isArray(s.errands) && Array.isArray(s.rituals) && s.days;
}

/* ---------------- storage: this device, plus the account copy when available ---------------- */

const Store = {
  timer: null,
  load() {
    try { const raw = localStorage.getItem(STORE_KEY); if (!raw) return null; const s = JSON.parse(raw); return validState(s) ? migrate(s) : null; } catch (e) { return null; }
  },
  saveLocal() {
    const json = JSON.stringify(S);
    try { localStorage.setItem(STORE_KEY, json); } catch (e) {
      // Out of room: the safety copies from past updates give way to the record itself.
      try { localStorage.removeItem('lij.snapshots.v1'); localStorage.setItem(STORE_KEY, json); } catch (e2) { /* storage blocked: the account copy still works */ }
    }
  },
  save() {
    if (!S) return;
    S.savedAt = Date.now();
    this.saveLocal();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => Cloud.push(), 2500);
  }
};
function save() { Store.save(); }

const Cloud = {
  db: null, uid: null, ready: false, pulled: false, status: 'device',
  async init() {
    for (let i = 0; i < 40 && !(window.claude && window.claude.use); i++) await sleep(100);
    if (!(window.claude && window.claude.use)) return;
    try {
      const pair = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      const db = pair[0], user = pair[1];
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      this.db = db; this.uid = id; this.ready = true;
      await this.pull();
    } catch (e) { /* keep working from this device */ }
  },
  ref(name) { return this.db.doc('data/users/' + this.uid + '/' + name); },
  async pull() {
    if (!this.ready) return;
    try {
      const metaSnap = await this.ref('meta').get();
      this.pulled = true;
      if (!metaSnap.exists) { if (S && !isEmptyState(S)) this.push(); this.status = 'account'; render(); return; }
      const m = metaSnap.data();
      const localAt = S ? (S.savedAt || 0) : 0;
      const cloudNewer = m.n > 0 && (m.savedAt > localAt || isEmptyState(S));
      if (cloudNewer) {
        const parts = await Promise.all(Array.from({ length: m.n }, (_, i) => this.ref(m.slot + i).get()));
        const json = parts.map((p) => (p.exists ? p.data().s : '')).join('');
        const data = JSON.parse(json);
        if (validState(data)) {
          S = migrate(data);
          UI.lastDay = null;
          Store.saveLocal();
          applyTheme();
          if (topView() && topView().type === 'title') UI.stack = [];
          toast('Your journey was loaded from your account.');
        }
      } else if (S && m.savedAt < localAt) {
        this.push();
      }
      this.status = 'account';
      render();
    } catch (e) { this.status = 'device'; }
  },
  async push() {
    if (!this.ready || !this.pulled || !S) return;
    const json = JSON.stringify(S);
    const savedAt = S.savedAt;
    try {
      const metaSnap = await this.ref('meta').get();
      const prev = metaSnap.exists ? metaSnap.data() : null;
      if (prev && prev.savedAt >= savedAt) return;
      const slot = prev && prev.slot === 'a' ? 'b' : 'a';
      const size = 50000;
      const n = Math.max(1, Math.ceil(json.length / size));
      for (let i = 0; i < n; i++) await this.ref(slot + i).set({ s: json.slice(i * size, (i + 1) * size) });
      await this.ref('meta').set({ savedAt: savedAt, n: n, slot: slot, v: VERSION });
      this.status = 'account';
    } catch (e) { this.status = 'device'; }
  },
  async erase() {
    if (!this.ready) return;
    try { await this.ref('meta').set({ savedAt: Date.now(), n: 0, slot: 'a', v: VERSION }); } catch (e) { /* ignore */ }
  }
};

/* ---------------- companion ---------------- */
/* An original travelling elf mage: long single braid over one shoulder, fur coat, by the campfire.
   One small frame every 0.8 s: the fire flickers, she blinks, now and then a small spell sparks above her.
   Late at night she sleeps and the fire burns down to embers. Frozen for reduced motion; can be turned off. */
const COMP_FIRES = [
  ['   (    ', '  ) )   ', ' (_(_)  ', ' /_/\\_\\ '],
  ['    )   ', '   ( (  ', ' (_)_)  ', ' /_/\\_\\ '],
  ['   )    ', '  ( (   ', ' (_(_)  ', ' /_/\\_\\ ']
];
const COMP_EMBERS = [
  ['        ', '        ', '  .\'.   ', ' /_/\\_\\ '],
  ['        ', '        ', '  \'.\'   ', ' /_/\\_\\ '],
  ['        ', '   .    ', '  .\'.   ', ' /_/\\_\\ ']
];
function companionFrame(n) {
  const h = new Date().getHours();
  const asleep = h >= 23 || h < 6;
  const eyes = asleep || n % 7 === 3 ? '- -' : 'o o';
  let top = '   ';
  if (asleep) top = ['z  ', ' z ', ' zZ', '  Z', '   '][n % 5];
  else if (n % 12 >= 8) top = ' ' + ['.', '*', '+', ' '][(n % 12) - 8] + ' ';
  const fig = ['   ,--.' + top, '  <(' + eyes + ')> ', '   /%%\\8  ', '  /%%%%\\8 ', '  \\%%%%/  ', '   \'  \'   '];
  const fire = asleep ? COMP_EMBERS[n % 3] : COMP_FIRES[n % 3];
  const smoke = !asleep && n % 5 === 0 ? '    \'   ' : '        ';
  return [fig[0] + '        ', fig[1] + smoke, fig[2] + fire[0], fig[3] + fire[1], fig[4] + fire[2], fig[5] + fire[3]].join('\n');
}
let compTick = 0;
const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------------- activity, journey, spells ---------------- */

function dayRec(k) { k = k || today(); return S.days[k] || (S.days[k] = { a: 0 }); }
function say(text) { S.log.push({ t: Date.now(), s: text }); if (S.log.length > 60) S.log = S.log.slice(-60); }
function event(kind, extra) { S.events.push(Object.assign({ k: kind, d: today(), t: Date.now() }, extra || {})); }
function act(kind, extra) { if (kind) event(kind, extra); }

/* A day counts as a league only if, when it ends, something done that day is still on the record:
   a cast (or a partial cast), a finished errand (or one more of an errand done several times), a peek, a scouted or cleared floor, a hex caught, broken or revisited,
   a sealed or reviewed worry, a prophecy written or judged, a steadying or suppression session,
   the inner weather, or the journal line. Undoing an action removes it from the record, so it stops counting.
   Writing down plans alone (adding errands or rituals) does not count, and neither does a session added afterwards
   for a past day (e.late): the day had already ended without it.
   Steps walked are a separate measurement: they never count toward a league, only toward statistics and mana. */
const DEED_KINDS = new Set(['cast', 'errand', 'errand_part', 'peek', 'scout', 'floor', 'dispel', 'hex_catch', 'hex_revisit', 'seal', 'review', 'steady', 'prophecy', 'prophecy_new', 'suppress']);
let deedCache = { key: null, map: null };
function deedIndex() {
  const key = S.savedAt + '|' + S.events.length + '|' + today();
  if (deedCache.key === key && deedCache.map) return deedCache.map;
  const m = {};
  const add = (d) => { m[d] = (m[d] || 0) + 1; };
  S.events.forEach((e) => { if (DEED_KINDS.has(e.k) && !e.late) add(e.d); });
  S.rituals.forEach((r) => { Object.keys(r.hits || {}).forEach((d) => { if (r.hits[d].length && !r.casts[d]) add(d); }); });
  Object.keys(S.days).forEach((d) => { const x = S.days[d]; if (x.w != null) add(d); if (x.l) add(d); });
  deedCache = { key: key, map: m };
  return m;
}

/* ---------------- steps ---------------- */
const STEPS_MAX = 200000;
function parseSteps(raw) {
  const s = String(raw == null ? '' : raw).replace(/[\s,.'_]/g, '');
  if (!s) return { clear: true };
  if (!/^\d+$/.test(s)) return { error: 'Steps are a whole number, like 8412.' };
  const n = Number(s);
  if (n > STEPS_MAX) return { error: 'That is more steps than one day holds. Check the number.' };
  return { n: n };
}
// Records (or, with n = null, clears) the steps walked on day d. Any day up to today can be filled in.
// Steps are a measurement, not a deed: no league, no spell roll, only statistics and mana.
function setSteps(d, n) {
  const rec = dayRec(d);
  const name = d === today() ? 'today' : d === addDays(today(), -1) ? 'yesterday' : fmtDate(d);
  if (n == null) {
    if (rec.s == null) return null;
    delete rec.s; delete rec.sl;
    say('Steps for ' + name + ' cleared.');
    return 'Steps for ' + name + ' cleared.';
  }
  rec.s = n;
  delete rec.sl;
  say('Steps for ' + name + ': ' + fmtNum(n) + '.');
  return fmtNum(n) + ' steps recorded for ' + name + '.';
}
function stepsField(key, d, rec) {
  const id = 'f-' + key;
  return '<div class="inline"><label class="sr" for="' + id + '">Steps walked on ' + fmtFull(d) + '</label>' +
    '<input id="' + id + '" type="text" inputmode="numeric" autocomplete="off" maxlength="9" placeholder="steps walked" data-bind="' + key + '" data-enter="saveSteps" data-d="' + d + '" data-k="' + key + '" value="' + esc(fval(key, rec.s != null ? fmtNum(rec.s) : '')) + '">' +
    '<button class="btn" data-a="saveSteps" data-d="' + d + '" data-k="' + key + '">SAVE</button></div>';
}
/* ---------------- weight ---------------- */
/* Logged in kilograms on any day, like steps, and never a deed for leagues. Day-to-day weight swings with water and
   food, so everything that judges progress uses the 7-day average (all entries in the 7 days up to a date).
   A goal has a start (the 7-day average when it was set) and a target. Each 10% of the way, reached by the 7-day
   average, adds one mana; a milestone once reached stays reached, and a goal gives at most 10. */
const KG_MIN = 25, KG_MAX = 350, GOAL_MIN_KG = 2;
function parseKg(raw) {
  const t = String(raw == null ? '' : raw).trim().toLowerCase().replace(/\s*kg$/, '').replace(',', '.');
  if (!t) return { clear: true };
  if (!/^\d{2,3}(\.\d{1,2})?$/.test(t)) return { error: 'Weight is a number in kilograms, like 78.4.' };
  const n = Math.round(Number(t) * 10) / 10;
  if (n < KG_MIN || n > KG_MAX) return { error: 'That weight looks off. Check the number.' };
  return { n: n };
}
function fmtKg(n) { return (Math.round(n * 10) / 10).toFixed(1); }
function signedKg(n) { const r = Math.round(n * 10) / 10; return (r > 0 ? '+' : r < 0 ? '-' : '') + Math.abs(r).toFixed(1); }
function kgDates() { return Object.keys(S.days).filter((k) => S.days[k].kg != null).sort(); }
function kgAvg(d) {
  let sum = 0, n = 0;
  for (let i = 0; i < 7; i++) { const x = S.days[addDays(d, -i)]; if (x && x.kg != null) { sum += x.kg; n++; } }
  return n ? sum / n : null;
}
function kgWeek(start) {
  let sum = 0, n = 0;
  for (let i = 0; i < 7; i++) { const x = S.days[addDays(start, i)]; if (x && x.kg != null) { sum += x.kg; n++; } }
  return { avg: n ? sum / n : null, n: n };
}
function kgNow() { const ds = kgDates(); return ds.length ? kgAvg(ds[ds.length - 1]) : null; }
function weightGoal() { return (S.weightGoals || []).find((g) => !g.to) || null; }
function goalProgress(g) {
  const to = g.to || today();
  const dist = g.target - g.start;
  let best = 0, now = null;
  kgDates().filter((k) => k >= g.from && k <= to).forEach((k) => {
    const a = kgAvg(k);
    const pr = dist ? (a - g.start) / dist : 0;
    if (pr > best) best = pr;
    now = { avg: a, p: pr, d: k };
  });
  return { best: Math.min(1, Math.max(0, best)), now: now };
}
function goalMilestones(g) { return Math.min(10, Math.floor(goalProgress(g).best * 10 + 1e-9)); }
function weightMana() { return (S.weightGoals || []).reduce((a, g) => a + goalMilestones(g), 0); }
function setKg(d, n) {
  const rec = dayRec(d);
  const name = d === today() ? 'today' : d === addDays(today(), -1) ? 'yesterday' : fmtDate(d);
  if (n == null) {
    if (rec.kg == null) return null;
    delete rec.kg;
    say('Weight for ' + name + ' cleared.');
    return 'Weight for ' + name + ' cleared.';
  }
  const g = weightGoal();
  const before = g ? goalMilestones(g) : 0;
  rec.kg = n;
  say('Weight for ' + name + ': ' + fmtKg(n) + ' kg.');
  const after = g ? goalMilestones(g) : 0;
  if (after > before) say('The weekly average passed ' + (after * 10) + '% of the way to your goal.');
  return fmtKg(n) + ' kg recorded for ' + name + '.';
}
function kgField(key, d, rec) {
  const id = 'f-' + key;
  return '<div class="inline"><label class="sr" for="' + id + '">Weight in kilograms on ' + fmtFull(d) + '</label>' +
    '<input id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="6" placeholder="kg, e.g. 78.4" data-bind="' + key + '" data-enter="saveKg" data-d="' + d + '" data-k="' + key + '" value="' + esc(fval(key, rec.kg != null ? fmtKg(rec.kg) : '')) + '">' +
    '<button class="btn" data-a="saveKg" data-d="' + d + '" data-k="' + key + '">SAVE</button></div>';
}
function goalBar(p) { const n = Math.min(10, Math.floor(p * 10 + 1e-9)); return '[' + '#'.repeat(n) + '.'.repeat(10 - n) + ']'; }
function weightWindow() {
  const ds = kgDates();
  const g = weightGoal();
  let h = '';
  if (!ds.length) h += '<p class="dim small">No weight logged yet. Log it at camp, daily or whenever you like. The 7-day average smooths out the day-to-day swings.</p>';
  else {
    const now = kgNow(), first = S.days[ds[0]].kg;
    const weeks = weeklySeries((st) => kgWeek(st), 12);
    const tw = weeks[11], lw = weeks[10];
    h += '<div class="statpair">' +
      '<div><span class="bignum">' + fmtKg(now) + '</span><span class="statlbl">KG, 7-DAY AVERAGE</span></div>' +
      '<div><span class="bignum">' + signedKg(now - first) + '</span><span class="statlbl">KG SINCE ' + fmtDate(ds[0]).toUpperCase() + '</span></div></div>';
    h += '<div class="row tight"><span class="grow">This week</span><span class="meta">' + (tw.n ? fmtKg(tw.avg) + ' kg · ' + plural(tw.n, 'entry', 'entries') : 'none yet') + '</span></div>' +
      '<div class="row tight"><span class="grow">Last week</span><span class="meta">' + (lw.n ? fmtKg(lw.avg) + ' kg' : 'none recorded') + '</span></div>' +
      (tw.n && lw.n ? '<div class="row tight"><span class="grow">Week to week</span><span class="meta">' + signedKg(tw.avg - lw.avg) + ' kg</span></div>' : '') +
      '<div class="row tight"><span class="grow">First entry</span><span class="meta">' + fmtKg(first) + ' kg · ' + plural(ds.length, 'entry', 'entries') + '</span></div>';
    const vals = weeks.map((x) => x.avg).filter((v) => v != null);
    if (vals.length >= 2) {
      const lo = Math.min(...vals) - 0.5, hi = Math.max(...vals) + 0.5;
      h += '<p class="lbl">WEEKLY AVERAGE</p><div class="bars" role="img" aria-label="Weekly average weight: ' + weeks.map((x) => (x.avg == null ? 'none' : fmtKg(x.avg))).join(', ') + '">' +
        weeks.map((x, i) => '<span class="' + (i === 11 ? 'hi' : '') + '" style="height:' + (x.avg == null ? 0 : Math.max(3, Math.round(((x.avg - lo) / (hi - lo)) * 64))) + 'px"></span>').join('') + '</div>' +
        '<div class="axis dim small"><span>12 weeks ago</span><span>this week</span></div><p class="dim small">Bars span ' + fmtKg(lo) + ' to ' + fmtKg(hi) + ' kg, so small changes are visible. Weeks with no entry are blank.</p>';
    }
  }
  if (g) {
    const pr = goalProgress(g);
    const down = g.target < g.start;
    const m = goalMilestones(g);
    h += '<p class="lbl">GOAL: ' + (down ? 'DOWN' : 'UP') + ' TO ' + fmtKg(g.target) + ' KG</p>' +
      '<p class="nomargin"><span class="nowrap">' + goalBar(pr.best) + '</span> ' + Math.round(pr.best * 100) + '% of the way</p>' +
      '<p class="small">Started at ' + fmtKg(g.start) + ' kg ' + (g.from === today() ? 'today' : 'on ' + fmtDate(g.from)) + (pr.now ? '. Now ' + fmtKg(pr.now.avg) + ' kg' : '') + '. ' + m + ' of 10 mana earned.' + (pr.best >= 1 ? ' The goal is reached. Set a new one when you are ready.' : '') + '</p>' +
      '<p class="dim small">Progress counts by the 7-day average. Each 10% reached adds one mana and stays earned.</p>';
  }
  const goalCap = g ? 'A NEW GOAL' : 'SET A GOAL';
  h += '<p class="lbl">' + goalCap + '</p><div class="inline"><label class="sr" for="wg-target">Goal weight in kilograms</label><input id="wg-target" type="text" inputmode="decimal" maxlength="6" placeholder="goal, kg" data-bind="wg-target" data-enter="setWeightGoal" value="' + esc(fval('wg-target')) + '"><button class="btn" data-a="setWeightGoal">' + (UI.confirm === 'newgoal' ? 'TAP AGAIN' : 'SET') + '</button></div>' +
    (UI.confirm === 'newgoal' ? '<p class="small">This ends the current goal and starts a new one from today\'s 7-day average. Mana already earned stays.</p>' : '<p class="dim small">Up or down follows from the goal and your current 7-day average. It must be at least ' + GOAL_MIN_KG + ' kg away.</p>') +
    (g ? '<button class="lnk dim small" data-a="endWeightGoal">' + (UI.confirm === 'endgoal' ? 'TAP AGAIN TO END THE GOAL' : 'END THIS GOAL') + '</button>' : '');
  return win('WEIGHT', h);
}
function stepsIn(start, days) {
  let sum = 0, n = 0;
  for (let i = 0; i < days; i++) { const x = S.days[addDays(start, i)]; if (x && x.s != null) { sum += x.s; n++; } }
  return { sum: sum, n: n, avg: n ? Math.round(sum / n) : 0 };
}
function stepsAll() {
  let sum = 0, n = 0;
  Object.keys(S.days).forEach((k) => { const s = S.days[k].s; if (s != null) { sum += s; n++; } });
  return { sum: sum, n: n };
}
function deedsOn(d) { return deedIndex()[d] || 0; }
function walkedDays() { const t = today(); return Object.keys(deedIndex()).filter((d) => d < t).sort(); }
function leagues() { return walkedDays().length; }
function todayCounts() { return deedsOn(today()) > 0; }

function makeRegion(i) {
  const J = S.journey;
  const rng = mulberry32((S.seed ^ Math.imul(i + 1, 2654435761)) >>> 0);
  let def;
  if (i === 0) {
    def = { name: FIRST_REGION[0], t: FIRST_REGION[1], d: FIRST_REGION[2], len: 5 };
  } else {
    const prev = J.plan[i - 1];
    const used = new Set(J.used);
    const avail = [];
    REGIONS.forEach((r, ix) => { if (!used.has(ix) && r[1] !== prev.t) avail.push(ix); });
    if (avail.length) {
      const ix = pickR(avail, rng);
      J.used.push(ix);
      const r = REGIONS[ix];
      def = { name: r[0], t: r[1], d: r[2] };
    } else {
      def = genRegion(rng, prev.t);
    }
    def.len = 8 + Math.floor(rng() * 23);
  }
  J.names.push(def.name);
  def.lm = [];
  let p = 3 + Math.floor(rng() * 5);
  while (p < def.len) { def.lm.push({ at: p, text: pickLandmark(rng, def.t) }); p += 3 + Math.floor(rng() * 5); }
  return def;
}
function genRegion(rng, prevT) {
  const G = REGIONGEN;
  const terrains = Object.keys(TERRAINS).filter((t) => t !== prevT);
  const t = pickR(terrains, rng);
  const longSuffixes = G.suffixes[t].filter((x) => x.length >= 4 && !['stead', 'wick'].includes(x));
  let name = '';
  for (let tries = 0; tries < 20; tries++) {
    const f = rng();
    if (f < 0.45 || !longSuffixes.length) name = pickR(G.roots, rng) + pickR(G.suffixes[t], rng);
    else if (f < 0.85) name = 'The ' + pickR(G.adjectives, rng) + ' ' + cap(pickR(longSuffixes, rng));
    else name = pickR(G.roots, rng) + '\'s ' + cap(pickR(longSuffixes, rng));
    if (!S.journey.names.includes(name)) break;
  }
  return { name: name, t: t, d: pickR(G.openers[t], rng) + ' ' + pickR(G.details, rng) };
}
function pickLandmark(rng, t) {
  const J = S.journey;
  const pool = [];
  (LANDMARKS[t] || []).forEach((_, i) => pool.push(t + ':' + i));
  LANDMARKS.any.forEach((_, i) => pool.push('any:' + i));
  let avail = pool.filter((k) => !J.lm.includes(k));
  if (!avail.length) avail = pool;
  const key = pickR(avail, rng);
  J.lm.push(key);
  const parts = key.split(':');
  return LANDMARKS[parts[0]][Number(parts[1])];
}
function ensurePlan(upto) {
  const J = S.journey;
  let total = J.plan.reduce((s, r) => s + r.len, 0);
  while (total < upto || J.plan.length < 2) { const r = makeRegion(J.plan.length); J.plan.push(r); total += r.len; }
}
function locate(L) {
  ensurePlan(L + 40);
  let start = 0;
  const plan = S.journey.plan;
  for (let i = 0; i < plan.length; i++) {
    if (L <= start + plan[i].len) return { ri: i, off: L - start, start: start };
    start += plan[i].len;
  }
  return { ri: plan.length - 1, off: plan[plan.length - 1].len, start: start - plan[plan.length - 1].len };
}
// Walks the leagues of days that have ended. Called on opening the app and whenever the day turns.
function advanceJourney() {
  const J = S.journey;
  const days = walkedDays();
  const L = days.length;
  if (J.done > L) J.done = L;
  let moved = false;
  while (J.done < L) {
    J.done++; moved = true;
    const when = days[J.done - 1];
    const pos = locate(J.done);
    const reg = J.plan[pos.ri];
    if (pos.off === 1) {
      reg.entered = when;
      if (pos.ri === 0) say('You walk through the Ash Gate. The road begins.');
      else { say('You enter ' + reg.name + '. ' + reg.d); event('region', { name: reg.name, d: when }); }
    }
    const lm = reg.lm.find((x) => x.at === pos.off);
    if (lm) { say(lm.text); event('landmark', { d: when, text: lm.text }); maybeSpell('landmark'); }
  }
  if (moved) save();
}
function currentPlace() {
  const L = leagues();
  const pos = locate(Math.max(L, 1));
  return { L: L, ri: pos.ri, off: L === 0 ? 0 : pos.off, region: S.journey.plan[pos.ri], next: S.journey.plan[pos.ri + 1] };
}

const GEN_INDEX = (function () {
  const byR = { c: [], u: [] };
  SPELLGEN.actions.forEach((a, ai) => {
    const tags = a[2].split(' ');
    const targets = [];
    SPELLGEN.targets.forEach((t, ti) => { if (t[1].split(' ').some((x) => tags.includes(x))) targets.push(ti); });
    if (targets.length) byR[a[3]].push({ ai: ai, targets: targets });
  });
  return byR;
})();
function spellName(a, t) { return 'Spell to ' + a[0].replace('{T}', titleCase(t[0])); }
function spellEffect(a, t) { return a[1].replace('{t}', t[0]) + pickR(SPELLGEN.conditions); }
function genSpell(r) {
  const U = S.spellUsed;
  const list = GEN_INDEX[r] || GEN_INDEX.c;
  for (let tries = 0; tries < 120; tries++) {
    const entry = pickR(list);
    const ti = pickR(entry.targets);
    const key = entry.ai + '.' + ti;
    if (U.g[key]) continue;
    U.g[key] = 1;
    const a = SPELLGEN.actions[entry.ai], t = SPELLGEN.targets[ti];
    return { key: 'g' + key, n: spellName(a, t), e: spellEffect(a, t), r: r };
  }
  // Random tries missed: look for any pairing not yet found before falling back to variants.
  const unused = [];
  list.forEach((en) => en.targets.forEach((ti) => { if (!U.g[en.ai + '.' + ti]) unused.push([en.ai, ti]); }));
  if (unused.length) {
    const pair = pickR(unused);
    U.g[pair[0] + '.' + pair[1]] = 1;
    const a = SPELLGEN.actions[pair[0]], t = SPELLGEN.targets[pair[1]];
    return { key: 'g' + pair[0] + '.' + pair[1], n: spellName(a, t), e: spellEffect(a, t), r: r };
  }
  // Every pairing has been found: hand out a named variant.
  const entry = pickR(list);
  const ti = pickR(entry.targets);
  const key = entry.ai + '.' + ti;
  U.g[key] = (U.g[key] || 1) + 1;
  const a = SPELLGEN.actions[entry.ai], t = SPELLGEN.targets[ti];
  const variant = SPELLGEN.variants[(U.g[key] - 2) % SPELLGEN.variants.length];
  return { key: 'g' + key + 'v' + U.g[key], n: variant + ' ' + spellName(a, t), e: spellEffect(a, t), r: r };
}
function drawSpell(r) {
  const U = S.spellUsed;
  if (r === 'l') {
    const avail = SPELLS_LEGENDARY.map((_, i) => i).filter((i) => !U.l.includes(i));
    if (avail.length) { const i = pickR(avail); U.l.push(i); return { key: 'l' + i, n: SPELLS_LEGENDARY[i][0], e: SPELLS_LEGENDARY[i][1], r: 'l' }; }
    r = 'r';
  }
  if (r === 'r') {
    const avail = SPELLS_RARE.map((_, i) => i).filter((i) => !U.r.includes(i));
    if (avail.length) { const i = pickR(avail); U.r.push(i); return { key: 'r' + i, n: SPELLS_RARE[i][0], e: SPELLS_RARE[i][1], r: 'r' }; }
    r = 'u';
  }
  return genSpell(r);
}
// rollKey marks a deed that can be undone. Each such deed rolls once per day: undoing it takes the spell back,
// and redoing it the same day returns the same result instead of rolling again, so tapping on and off gains nothing.
function maybeSpell(src, rollKey) {
  if (!S.rolls) S.rolls = {};
  if (rollKey && Object.prototype.hasOwnProperty.call(S.rolls, rollKey)) {
    const prev = S.rolls[rollKey];
    if (prev && !S.spells.some((x) => x.key === prev.key)) { S.spells.push(prev); say('The spell returns: ' + prev.n + '.'); }
    return prev;
  }
  const drop = DROPS[src];
  let sp = null;
  if (drop && Math.random() < drop[0]) {
    sp = drawSpell(pickWeighted(drop[1]));
    const place = currentPlace();
    sp.src = src; sp.d = today(); sp.at = Date.now(); sp.reg = place.region ? place.region.name : '';
    S.spells.push(sp);
    say('You found a spell: ' + sp.n + '.');
    UI.modals.push({ type: 'spell', sp: sp });
  }
  if (rollKey) S.rolls[rollKey] = sp;
  return sp;
}
function unSpell(rollKey) {
  const prev = S.rolls && S.rolls[rollKey];
  if (prev) {
    S.spells = S.spells.filter((x) => x.key !== prev.key);
    UI.modals = UI.modals.filter((m) => !(m.type === 'spell' && m.sp && m.sp.key === prev.key));
  }
}
function pruneRolls() {
  if (!S.rolls) return;
  const cutoff = addDays(today(), -3);
  Object.keys(S.rolls).forEach((k) => { const d = k.slice(-10); if (d < cutoff) delete S.rolls[k]; });
}

/* ---------------- rituals ---------------- */

/* Weekly rituals (r.mode 'weekly', r.week sessions a week, e.g. workouts 4 times a week).
   Weeks run Monday to Sunday. A session is a cast: it counts for the day's league, 1 mana, ranks and charts.
   Days without a session are never misses. The flame counts full weeks:
     target met: the flame grows by a week;  some sessions, or a rest week: it holds;
     an empty week: forgiven once, two in a row put it out.
   The current week is only judged once it ends (or as soon as the target is met), and a ritual's first, partial week
   is never held against it. Several sessions on one day are kept in r.hits[d]; r.casts[d] marks the first. */
function isWeekly(r) { return r.mode === 'weekly'; }
function weekTarget(r) { return Math.max(1, Math.min(14, Number(r.week) || 1)); }
function sessionsOn(r, d) { return r.casts[d] ? Math.max(1, r.hits && r.hits[d] ? r.hits[d].length : 1) : 0; }
function sessionsInWeek(r, ws) { let n = 0; for (let i = 0; i < 7; i++) n += sessionsOn(r, addDays(ws, i)); return n; }
function isRestWeek(r, ws) { return (r.restWeeks || []).includes(ws); }
function weeklyStats(r) {
  const t = today(), cur = weekStart(t);
  const firstCast = Object.keys(r.casts).sort()[0];
  let start = r.created;
  if (firstCast && firstCast < start) start = firstCast;
  const firstWeek = weekStart(start);
  const T = weekTarget(r);
  let total = 0;
  Object.keys(r.casts).forEach((d) => { total += sessionsOn(r, d); });
  let alive = false, flame = 0, miss = 0, longest = 0, full = 0, judged = 0, guard = 0;
  for (let w = firstWeek; w <= cur && guard++ < 3000; w = addDays(w, 7)) {
    const n = sessionsInWeek(r, w);
    const partialFirst = w === firstWeek && r.created > w && !(firstCast && firstCast < r.created);
    if (n >= T) { full++; judged++; if (!alive) { alive = true; flame = 0; } flame++; miss = 0; longest = Math.max(longest, flame); }
    else if (w === cur) { if (n > 0) { if (!alive) { alive = true; flame = 0; } miss = 0; } /* not judged until it ends */ }
    else if (partialFirst && n === 0) { /* a first week that began part-way */ }
    else if (isRestWeek(r, w)) { miss = 0; }
    else if (n > 0) { judged++; if (!alive) { alive = true; flame = 0; } miss = 0; }
    else { judged++; if (alive) { miss++; if (miss > 1) { alive = false; flame = 0; miss = 0; } } }
  }
  let status = 'unlit';
  if (alive) status = miss === 1 ? 'flickering' : 'burning';
  else if (total > 0) status = 'embers';
  const wk = sessionsInWeek(r, cur);
  return { weekly: true, total: total, flame: flame, longest: longest, status: status, castToday: !!r.casts[t], restToday: false, restWeek: isRestWeek(r, cur), week: wk, target: T, full: full, judged: judged };
}
// "2 more, 3 days left": shown only while this week's target can still be met at one session a day.
function weekReminder(r, st) {
  if (st.restWeek) return 'rest week';
  const left = st.target - st.week;
  if (left <= 0) return 'done for the week';
  const t = today();
  const daysLeft = 7 - ((parseD(t).getDay() + 6) % 7);
  const slots = daysLeft - (st.castToday ? 1 : 0);
  if (left > slots) return '';
  return left + ' more, ' + plural(slots, 'day') + ' left';
}
function weeklyHit(r, dir) {
  const t = today();
  const n = sessionsOn(r, t);
  if (dir > 0) {
    if (n >= 9) return;
    if (n === 0) { r.hits[t] = [hm()]; completeToday(r, true); }
    else {
      r.hits[t] = (r.hits[t] || [r.casts[t]]).concat(hm());
      act('cast', { rid: r.id, extra: true });
      afterCast(r);
    }
  } else {
    if (n === 0) return;
    if (n === 1) { delete r.hits[t]; uncompleteToday(r); }
    else {
      r.hits[t].pop();
      for (let i = S.events.length - 1; i >= 0; i--) { const e = S.events[i]; if (e.k === 'cast' && e.rid === r.id && e.d === t) { S.events.splice(i, 1); break; } }
    }
    const st = weeklyStats(r);
    say(r.name + ': ' + st.week + ' of ' + st.target + ' this week.');
  }
  save();
}
/* A session done on an earlier day but not logged then ("added later"). It counts for that week, the flame, the total
   and mana, but not for that day's league, and it finds no spell. A session logged on its own day cannot be removed
   once the day has ended, the same rule as every other deed. */
function isLate(r, d) { return r.casts[d] === 'late'; }
function addLateSession(r, d) {
  r.casts[d] = 'late';
  r.hits[d] = ['late'];
  S.events.push({ k: 'cast', rid: r.id, d: d, t: Date.now(), late: true });
  say(r.name + ': a session added for ' + fmtDate(d) + '.');
  const st = ritualStats(r);
  if (st.total === 10 && !r.spellName) UI.modals.push({ type: 'learned', rid: r.id });
  if (st.total === 66) say(r.name + ' is rooted.');
}
function removeLateSession(r, d) {
  delete r.casts[d]; delete r.hits[d];
  S.events = S.events.filter((e) => !(e.k === 'cast' && e.rid === r.id && e.d === d && e.late));
  say(r.name + ': the session added for ' + fmtDate(d) + ' is removed.');
}
// After a cast or a session: the milestone messages that depend on the total.
function afterCast(r) {
  const st = ritualStats(r);
  if (st.weekly) say(r.name + ': session ' + st.week + ' of ' + st.target + ' this week.' + (st.week === st.target ? ' The week is full. ' + cap(flameLabel(st)) + '.' : ''));
  if (st.total === 10 && !r.spellName) UI.modals.push({ type: 'learned', rid: r.id });
  if (st.total === 66) say(r.name + ' is rooted.');
}
function ritualStats(r) {
  if (isWeekly(r)) return weeklyStats(r);
  const t = today();
  const casts = r.casts || {}, rests = r.rests || {};
  const total = Object.keys(casts).length;
  let alive = false, start = null, miss = 0, longest = 0;
  let d = r.created;
  const firstCast = Object.keys(casts).sort()[0];
  if (firstCast && firstCast < d) d = firstCast;
  let guard = 0;
  while (d <= t && guard++ < 20000) {
    if (casts[d]) { if (!alive) { alive = true; start = d; } miss = 0; }
    else if (rests[d]) { miss = 0; }
    else if (d !== t && alive) {
      miss++;
      if (miss > 1) { longest = Math.max(longest, daysBetween(start, d)); alive = false; start = null; miss = 0; }
    }
    d = addDays(d, 1);
  }
  let flame = 0;
  if (alive) {
    const end = (casts[t] || rests[t]) ? t : addDays(t, -1);
    flame = Math.max(1, daysBetween(start, end) + 1);
    longest = Math.max(longest, flame);
  }
  let status = 'unlit';
  if (alive) status = miss === 1 ? 'flickering' : 'burning';
  else if (total > 0) status = 'embers';
  return { total: total, flame: flame, longest: longest, status: status, castToday: !!casts[t], restToday: !!rests[t] };
}
function rankOf(total) {
  if (total >= 100) return 'CIRCLE ' + Math.floor(total / 100);
  if (total >= 66) return 'ROOTED';
  if (total >= 10) return 'LEARNED';
  return '';
}
function flameLabel(st) {
  if (st.weekly && (st.status === 'burning' || st.status === 'flickering')) return (st.flame ? 'flame ' + plural(st.flame, 'week') : 'flame lit') + (st.status === 'flickering' ? ', flickering' : '');
  if (st.status === 'burning') return 'flame ' + st.flame;
  if (st.status === 'flickering') return 'flame ' + st.flame + ', flickering';
  if (st.status === 'embers') return 'embers';
  return 'unlit';
}
/* A ritual can need several casts a day (brushing teeth: 2). Each tap is a "hit";
   the day only counts as cast once hits reach r.per. Flames, ranks and charts use completed days. */
function hitsToday(r) { return (r.hits && r.hits[today()]) ? r.hits[today()].length : 0; }
function completeToday(r, roll) {
  const t = today();
  r.casts[t] = hm();
  delete r.rests[t];
  act('cast', { rid: r.id });
  if (isWeekly(r)) afterCast(r);
  else {
    const st = ritualStats(r);
    say(r.name + ' cast' + (r.per > 1 ? ' (' + r.per + ' of ' + r.per + ')' : '') + '. ' + cap(flameLabel(st)) + '.');
    if (st.total === 10 && !r.spellName) UI.modals.push({ type: 'learned', rid: r.id });
    if (st.total === 66) say(r.name + ' is rooted.');
  }
  if (roll) maybeSpell('cast', 'cast:' + r.id + ':' + t);
}
function uncompleteToday(r) {
  const t = today();
  delete r.casts[t];
  for (let i = S.events.length - 1; i >= 0; i--) { const e = S.events[i]; if (e.k === 'cast' && e.rid === r.id && e.d === t) { S.events.splice(i, 1); break; } }
  unSpell('cast:' + r.id + ':' + t);
}
function hitRitual(r, dir) {
  const t = today();
  const per = r.per || 1;
  const hits = (r.hits[t] || []).slice();
  const wasDone = !!r.casts[t];
  if (dir > 0) { if (hits.length >= per) return; hits.push(hm()); }
  else { if (!hits.length) return; hits.pop(); }
  if (hits.length) r.hits[t] = hits; else delete r.hits[t];
  const done = hits.length >= per;
  if (done && !wasDone) completeToday(r, true);
  else if (!done && wasDone) { uncompleteToday(r); say(r.name + ': ' + hits.length + ' of ' + per + ' today.'); }
  else if (dir > 0) { delete r.rests[t]; say(r.name + ': ' + hits.length + ' of ' + per + ' today.'); }
  else say(r.name + ': ' + hits.length + ' of ' + per + ' today.');
  save();
}
// After the times-a-day number changes, only today is re-judged; past days keep their record.
function rejudgeToday(r) {
  const done = hitsToday(r) >= (r.per || 1);
  const was = !!r.casts[today()];
  if (done && !was) completeToday(r, false);
  else if (!done && was) uncompleteToday(r);
}
function ritualMark(r, st) {
  if (st.weekly) return st.restWeek ? '[r]' : '[' + st.week + '/' + st.target + ']';
  if (st.castToday) return '[x]';
  if (st.restToday) return '[r]';
  const n = hitsToday(r);
  return n > 0 ? '[' + n + '/' + (r.per || 1) + ']' : '[ ]';
}

/* ---------------- errands ---------------- */

function errandsDue() {
  const t = today();
  return S.errands.filter((e) => !e.dread && e.date && e.date <= t).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}
// An errand can need doing several times (three trash bags: need 3). Each tap counts one; the last one completes it.
function errandNeed(e) { return Math.max(1, Math.min(99, Number(e.need) || 1)); }
function errandMark(e) { const n = errandNeed(e); return n > 1 ? '[' + (e.got || 0) + '/' + n + ']' : '[ ]'; }
function errandStep(e, dir) {
  const need = errandNeed(e);
  if (dir > 0) {
    if ((e.got || 0) + 1 >= need) { completeErrand(e); return; }
    e.got = (e.got || 0) + 1;
    act('errand_part', { id: e.id, text: e.text, n: e.got, of: need });
    say(e.text + ': ' + e.got + ' of ' + need + '.');
    showToast(e.text + ': ' + e.got + ' of ' + need, { kind: 'errandPart', id: e.id });
    save();
    return;
  }
  if (!e.got) return;
  e.got--;
  // Taking one back removes today's record of it, so a tap and an undo leave no trace. Earlier days stay as they were.
  for (let i = S.events.length - 1; i >= 0; i--) {
    const x = S.events[i];
    if (x.k === 'errand_part' && x.id === e.id) { if (x.d === today()) S.events.splice(i, 1); break; }
  }
  say(e.text + ': ' + e.got + ' of ' + need + '.');
  save();
}
function completeErrand(e) {
  const snap = JSON.parse(JSON.stringify(e));
  const idx = S.errands.indexOf(e);
  const need = errandNeed(e);
  if (e.repeat) {
    e.date = addDays(today(), e.repeat);
    e.got = 0;
    (e.list || []).forEach((x) => { x.done = false; });
  } else {
    S.errands.splice(idx, 1);
  }
  act('errand', need > 1 ? { id: e.id, text: e.text, of: need } : { id: e.id, text: e.text });
  say(e.text + ': done.' + (e.repeat ? ' Back on ' + fmtDate(e.date) + '.' : ''));
  maybeSpell('errand', 'errand:' + e.id + ':' + today());
  showToast('Done: ' + e.text, { kind: 'errand', snap: snap, idx: idx, repeat: !!e.repeat });
  save();
}
function undoErrand(u) {
  if (u.repeat) {
    const e = S.errands.find((x) => x.id === u.snap.id);
    if (e) Object.assign(e, u.snap);
  } else {
    S.errands.splice(Math.min(u.idx, S.errands.length), 0, u.snap);
  }
  for (let i = S.events.length - 1; i >= 0; i--) { if (S.events[i].k === 'errand' && S.events[i].id === u.snap.id) { S.events.splice(i, 1); break; } }
  unSpell('errand:' + u.snap.id + ':' + today());
  say(u.snap.text + ': back on the list.');
  save();
}
function newErrand(text, date) {
  // "trash bags x3" at the end of the text means it needs doing three times
  let need = 1;
  const m = /\s+[x×](\d{1,2})$/i.exec(text);
  if (m && Number(m[1]) > 1 && text.length > m[0].length) { need = Number(m[1]); text = text.slice(0, -m[0].length).trim(); }
  return { id: uid(), text: text, date: date || null, time: null, dread: false, dreadAt: null, list: [], repeat: null, need: need, got: 0, created: today() };
}
function newRitual(name) {
  // "Workout 4/week", "Workout 4x a week", "Workout 4 times a week" make a weekly ritual
  let mode = 'daily', week = 1;
  const m = /\s+(\d{1,2})\s*(?:x|times)?\s*(?:\/|a|per)\s*(?:week|wk|w)$/i.exec(name);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 14 && name.length > m[0].length) { mode = 'weekly'; week = Number(m[1]); name = name.slice(0, -m[0].length).trim(); }
  return { id: uid(), name: name, least: '', cue: '', time: null, per: 1, mode: mode, week: week, restWeeks: [], created: today(), casts: {}, hits: {}, rests: {}, spellName: null, archived: false };
}

/* ---------------- seals ---------------- */

function lanternTime(k) { const p = (S.settings.lantern || '19:00').split(':').map(Number); const d = parseD(k); d.setHours(p[0], p[1], 0, 0); return d.getTime(); }
function sealOpensAt(s) {
  const k = dkey(new Date(s.t));
  const l = lanternTime(k);
  return s.t < l ? l : lanternTime(addDays(k, 1));
}
function sealsReady() { const now = Date.now(); return S.seals.filter((s) => s.status === 'sealed' && sealOpensAt(s) <= now); }
function sealsWaiting() { const now = Date.now(); return S.seals.filter((s) => s.status === 'sealed' && sealOpensAt(s) > now); }

/* ---------------- prophecies ---------------- */
/* A prophecy is an explicit prediction ("they will be annoyed and say no", 80%) that is later judged
   against what actually happened. The calibration record is the point: how often confident fears come true. */
const PROPHECY_OUTCOMES = { no: 'did not happen', partly: 'partly happened', yes: 'happened' };
function newProphecy(text, p, due, src, ref) {
  const pr = { id: uid(), text: text, p: Math.max(0, Math.min(100, Number(p))), t: Date.now(), d: today(), due: due || null, src: src, ref: ref || null, o: null, charm: false, judged: null };
  S.prophecies.push(pr);
  return pr;
}
// Where a prophecy came from, and what happened to its source, so linked records read as one story.
function prophecyOrigin(p) {
  if (p.src === 'seal') {
    const x = S.seals.find((y) => y.id === p.ref);
    return 'from the jar' + (x ? (x.status === 'sealed' ? ', still sealed' : x.status === 'dissolved' ? ', faded at lantern hour' : ', still mattered at lantern hour') : '') + ' · ';
  }
  if (p.src === 'hex') {
    const x = S.dispels.find((y) => y.id === p.ref);
    return 'from a hex' + (x && hexName(x) ? ', ' + hexName(x).toLowerCase() : '') + ' · ';
  }
  if (p.src === 'delve') return 'from a delve · ';
  return '';
}
function prophecyVal(o) { return o === 'yes' ? 1 : o === 'partly' ? 0.5 : 0; }
function judgeProphecy(pr, o, charm) {
  pr.o = o; pr.charm = !!charm; pr.judged = today();
  act('prophecy', { p: pr.p, o: o, charm: !!charm });
  say(o === 'no' ? 'A prophecy failed. The Banshee had given it ' + pr.p + '%.' : o === 'partly' ? 'A prophecy came partly true. It goes on the record.' : 'A prophecy came true. It goes on the record too; an honest count is what makes the others mean something.');
  maybeSpell('prophecy');
}
function prophecyDue() { const t = today(); return S.prophecies.filter((p) => !p.o && p.due && p.due <= t); }
function prophecyStats() {
  const done = S.prophecies.filter((p) => p.o);
  const n = done.length;
  if (!n) return { n: 0 };
  const res = {
    n: n,
    pred: avg(done.map((p) => p.p)) / 100,
    act: avg(done.map((p) => prophecyVal(p.o))),
    yes: done.filter((p) => p.o === 'yes').length,
    partly: done.filter((p) => p.o === 'partly').length,
    buckets: [[0, 20], [21, 40], [41, 60], [61, 80], [81, 100]].map((b) => {
      const xs = done.filter((p) => p.p >= b[0] && p.p <= b[1]);
      return { lo: b[0], hi: b[1], n: xs.length, pred: xs.length ? avg(xs.map((p) => p.p)) / 100 : 0, act: xs.length ? avg(xs.map((p) => prophecyVal(p.o))) : 0 };
    })
  };
  if (n >= 20) {
    const ordered = done.slice().sort((a, b) => a.t - b.t);
    res.first = avg(ordered.slice(0, 10).map((p) => p.p));
    res.last = avg(ordered.slice(-10).map((p) => p.p));
  }
  const withC = done.filter((p) => p.charm), without = done.filter((p) => !p.charm);
  if (withC.length) { res.charmN = withC.length; res.charmAct = avg(withC.map((p) => prophecyVal(p.o))); res.cleanN = without.length; res.cleanAct = without.length ? avg(without.map((p) => prophecyVal(p.o))) : 0; }
  return res;
}
function prophecyRecord() {
  const st = prophecyStats();
  if (!st.n) return '<p class="dim small">Nothing judged yet. The record starts with the first prophecy you check.</p>';
  let h = '<p>' + plural(st.n, 'prophecy', 'prophecies') + ' judged. You gave them ' + pct(st.pred) + ' on average. ' + st.yes + ' came true' + (st.partly ? ' and ' + st.partly + ' partly' : '') + ', which is ' + pct(st.act) + '.</p>';
  const gap = Math.round((st.pred - st.act) * 100);
  h += '<p class="small">' + (gap > 0 ? 'The Banshee overstates by ' + gap + ' points.' : gap < 0 ? 'Things came true ' + (-gap) + ' points more often than you predicted.' : 'Your prophecies are exactly calibrated.') + (st.n < 10 ? ' Still a small sample.' : '') + '</p>';
  if (st.n >= 5) {
    h += '<p class="lbl">BY HOW SURE YOU WERE</p>' + st.buckets.filter((b) => b.n).map((b) =>
      '<div class="calrow"><span class="calk">' + b.lo + '-' + b.hi + '%</span><span class="calbars" aria-hidden="true"><i class="pred" style="width:' + Math.round(b.pred * 100) + '%"></i><i class="act" style="width:' + Math.max(1, Math.round(b.act * 100)) + '%"></i></span><span class="calv">' + pct(b.act) + ' of ' + b.n + '</span></div>').join('') +
      '<div class="legend dim small" aria-hidden="true"><i class="l2"></i><span>how sure you were</span><i class="l3"></i><span>how often it came true</span></div>';
  }
  if (st.first != null) h += '<p class="small">Your first 10 prophecies averaged ' + Math.round(st.first) + '%. Your latest 10 average ' + Math.round(st.last) + '%.' + (st.last < st.first - 5 ? ' The predictor is recalibrating.' : '') + '</p>';
  if (st.charmN) h += '<p class="small">With a safety charm: ' + st.charmN + ', came true ' + pct(st.charmAct) + '. Without: ' + st.cleanN + ', came true ' + pct(st.cleanAct) + '. Outcomes without charms are the stronger evidence.</p>';
  return h;
}

/* ---------------- hexes (dispel) ---------------- */
/* A hex goes through up to three ratings of how true it feels: when caught (before), right after answering it (after),
   and on a revisit a few days later (later). The revisit shows whether the answer held. A hex can be caught without an
   answer and answered later. Hexes that make predictions can also be tested as prophecies. */
const REVISIT_OPTS = [[1, 'TOMORROW'], [3, '3 DAYS'], [7, 'A WEEK'], [0, 'NO REVISIT']];
function hexesCaught() { return S.dispels.filter((x) => x.after == null); }
function hexesBroken() { return S.dispels.filter((x) => x.after != null); }
function hexesDue() { const t = today(); return S.dispels.filter((x) => x.after != null && x.later == null && x.due && x.due <= t); }
function hexName(x) { const hx = HEXES.find((h) => h.id === x.hex); return hx ? hx.name : ''; }
function hexTrail(x) { return x.before + (x.after != null ? ' &gt; ' + x.after : '') + (x.later != null ? ' &gt; ' + x.later : ''); }
function revisitSeg(key, def) {
  const cur = Number(fval(key, def));
  return '<p class="lbl">Look at it again in</p><div class="seg" role="group" aria-label="Revisit">' + REVISIT_OPTS.map((x) => '<button class="segb' + (cur === x[0] ? ' on' : '') + '" data-a="setForm" data-k="' + key + '" data-v="' + x[0] + '" aria-pressed="' + (cur === x[0]) + '">' + x[1] + '</button>').join('') + '</div>';
}
// "Test it as a prophecy", offered only for hexes that predict something (fortune-teller, mind-reader, long shadow).
function hexTestFields(prefix, hexId, words, p) {
  const hx = HEXES.find((x) => x.id === hexId);
  if (!hx || !hx.test) return '';
  const on = fval(prefix + '-test', false);
  let h = '<button class="row lnk wide" data-a="setForm" data-k="' + prefix + '-test" data-v="' + (!on) + '" aria-pressed="' + !!on + '"><span class="mark">' + (on ? '[x]' : '[ ]') + '</span><span class="grow small">This hex predicts something. Test it as a prophecy and check later whether it happens.</span></button>';
  if (on) {
    h += '<label class="lbl" for="' + prefix + '-ptext">What exactly does it predict?</label><textarea id="' + prefix + '-ptext" rows="2" maxlength="300" data-bind="' + prefix + '-ptext" placeholder="e.g. they will not reply to my message">' + esc(fval(prefix + '-ptext', words)) + '</textarea>' +
      '<label class="lbl" for="' + prefix + '-pp">How likely does it feel? <output id="o-' + prefix + 'pp">' + fval(prefix + '-pp', p) + '</output>%</label><input id="' + prefix + '-pp" type="range" min="0" max="100" step="5" data-bind="' + prefix + '-pp" data-out="o-' + prefix + 'pp" value="' + fval(prefix + '-pp', p) + '">' +
      '<label class="lbl" for="' + prefix + '-pdue">When will you know? (optional; otherwise in a week)</label><input id="' + prefix + '-pdue" type="date" data-bind="' + prefix + '-pdue" value="' + esc(fval(prefix + '-pdue')) + '">';
  }
  return h;
}
function maybeTestHex(rec, prefix) {
  const f = UI.form;
  const hx = HEXES.find((x) => x.id === rec.hex);
  if (!hx || !hx.test || !f[prefix + '-test'] || rec.pid) return;
  const text = (f[prefix + '-ptext'] !== undefined ? f[prefix + '-ptext'] : rec.words).trim() || rec.words;
  const pr = newProphecy(text, f[prefix + '-pp'] != null ? f[prefix + '-pp'] : rec.before, f[prefix + '-pdue'] || addDays(today(), 7), 'hex', rec.id);
  rec.pid = pr.id;
  act('prophecy_new', { pid: pr.id });
}
function breakHex(rec, answer, after) {
  rec.answer = answer; rec.after = after; rec.ad = today();
  rec.due = rec.rv > 0 ? addDays(today(), rec.rv) : null;
  act('dispel', { hid: rec.id, before: rec.before, after: rec.after });
  say('A hex is broken. It felt ' + rec.before + ' true before, ' + rec.after + ' after.' + (rec.due ? ' You will look at it again on ' + fmtDate(rec.due) + '.' : ''));
  maybeSpell('dispel');
}
function hexVerdict(x) {
  if (x.later == null) return '';
  const drop = x.before - x.after, held = x.before - x.later;
  if (x.later <= x.after) return x.later < x.after ? 'The answer held, and the hex weakened further.' : 'The answer held.';
  if (x.later < x.before) return 'It crept back up by ' + (x.later - x.after) + ', but stayed ' + held + ' below where it started.' + (drop > 0 ? ' ' + pct(held / drop) + ' of the drop held.' : '');
  return 'It came back as strong as it started. Worth knowing: this one may need testing in the world, not only answering.';
}
function hexRecord() {
  const xs = S.dispels.filter((x) => x.after != null && x.later != null);
  if (!xs.length) return '';
  const b = avg(xs.map((x) => x.before)), a = avg(xs.map((x) => x.after)), l = avg(xs.map((x) => x.later));
  let h = '<p>' + plural(xs.length, 'hex', 'hexes') + ' revisited. On average they felt ' + Math.round(b) + ' true when caught, ' + Math.round(a) + ' right after you answered, and ' + Math.round(l) + ' when you looked again.</p>';
  const drop = b - a, held = b - l;
  if (drop > 0) h += '<p class="small">' + (held >= drop ? 'The drop held completely' + (held > drop ? ', and grew' : '') + '.' : held > 0 ? 'Of the ' + Math.round(drop) + '-point drop, ' + Math.round(held) + ' held (' + pct(held / drop) + ').' : 'The belief came back to where it started. For these hexes, testing them in the world may be the stronger art.') + (xs.length < 5 ? ' Still a small sample.' : '') + '</p>';
  const groups = {};
  xs.forEach((x) => { if (x.hex) (groups[x.hex] = groups[x.hex] || []).push(x); });
  const rows = Object.keys(groups).filter((k) => groups[k].length >= 2).map((k) => {
    const g = groups[k];
    return { k: k, n: g.length, b: avg(g.map((x) => x.before)), a: avg(g.map((x) => x.after)), l: avg(g.map((x) => x.later)) };
  });
  if (rows.length) {
    h += '<p class="lbl">BY HEX: CAUGHT &gt; ANSWERED &gt; LATER</p>' + rows.map((r) => '<div class="row tight"><span class="grow">' + HEXES.find((x) => x.id === r.k).name + '</span><span class="meta">' + Math.round(r.b) + ' &gt; ' + Math.round(r.a) + ' &gt; ' + Math.round(r.l) + ' · ' + r.n + '</span></div>').join('');
    const worst = rows.slice().sort((p, q) => (q.l - q.a) - (p.l - p.a))[0];
    if (worst.l - worst.a >= 10) h += '<p class="small">' + HEXES.find((x) => x.id === worst.k).name + ' comes back the most after it is answered.</p>';
  }
  return h;
}

/* ---------------- suppress ---------------- */
/* Short, bounded sessions: ride out an urge, sit in stillness, or give a short burst to something that needs doing.
   The running session lives in S.active, so it survives the app being closed and reopened. */
const SUPPRESS_MODES = {
  urge: { label: 'RIDE AN URGE', durs: [5, 10, 15, 20], def: 10 },
  still: { label: 'STILLNESS', durs: [2, 5, 10, 15, 20], def: 5 },
  burst: { label: 'A SHORT BURST', durs: [5, 10, 15, 20, 25], def: 10 }
};
const PROMO_ART = String.raw`
        *
       /^\
      / @ \
     <=====>
      \   /
       \ /
        V
`;
const MANA_ART = String.raw`
      .   *   .
   *    .-'-.    *
  .    ( (*) )    .
   *    '-.-'    *
      '   *   '`;
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && navigator.wakeLock && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}
function buzz() { try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* not available */ } }
function fmtClock(sec) { sec = Math.max(0, sec); return Math.floor(sec / 60) + ':' + pad(sec % 60); }
function supElapsed() {
  const a = S.active;
  if (!a) return 0;
  return Math.max(0, Math.min(a.dur, Math.floor(((a.stopped || Date.now()) - a.start) / 1000)));
}
function minutesText(sec) { const m = Math.floor(sec / 60); return m < 1 ? 'less than a minute' : plural(m, 'minute'); }
function startSuppressTicker() {
  stopTickers();
  keepAwake(true);
  const tick = () => {
    const a = S.active;
    if (!a || a.stopped) { stopTickers(); return; }
    const left = a.dur - supElapsed();
    const t = $('#sup-timer'); if (t) t.textContent = fmtClock(left);
    if (left <= 0) { stopTickers(); keepAwake(false); buzz(); suppressTimeUp(); }
  };
  tick();
  tickers.push(setInterval(tick, 250));
}
function suppressView() {
  const v = topView();
  if (v && v.type === 'suppress') return v;
  UI.stack.push({ type: 'suppress', title: 'SUPPRESS' });
  return topView();
}
function suppressTimeUp() {
  const a = S.active; if (!a) return;
  a.stopped = a.start + a.dur * 1000;
  save();
  if (a.mode === 'still') { finishSuppress({}); return; }
  suppressView().phase = 'after';
  render(true);
}
function finishSuppress(extra) {
  const a = S.active; if (!a) return;
  const spent = supElapsed();
  const rec = Object.assign({ id: uid(), mode: a.mode, label: a.label || '', dur: a.dur, spent: spent, t: Date.now(), d: today(), before: a.before == null ? null : a.before, after: null, held: null, eid: a.eid || null }, extra || {});
  S.suppressions.push(rec);
  S.active = null;
  stopTickers(); keepAwake(false);
  act('suppress', { sec: spent, mode: rec.mode });
  if (rec.mode === 'urge') say(rec.held === false ? 'The urge won this time. ' + cap(minutesText(spent)) + ' of riding it still count.' : 'An urge ridden out for ' + minutesText(spent) + (rec.before != null && rec.after != null ? ', from ' + rec.before + ' down to ' + rec.after : '') + '.');
  else if (rec.mode === 'still') say(cap(minutesText(spent)) + ' of stillness.');
  else say(cap(minutesText(spent)) + ' given to: ' + (rec.label || 'something that needed doing') + '.');
  if (spent >= 60) maybeSpell('suppress');
  const v = suppressView(); v.phase = 'done'; v.rec = rec.id;
  UI.form = {};
  save();
  render(true);
}

/* ---------------- mana ---------------- */
/* A passive reserve built from everything else. It cannot be acted on, only released for viewing:
   visible for 24 hours, then sealed for at least 7 days. The first release opens 7 days after the journey began. */
const DAY_MS = 86400000;
const MANA_WEIGHTS = { cast: 1, errand: 1, peek: 5, floor: 5, prophecy: 3, dispel: 3, hex_revisit: 2, review: 2, steady: 2 };
const MANA_PARTS = [
  ['leagues', 'Days on the road', 1], ['cast', 'Rituals cast', 1], ['errand', 'Errands done', 1],
  ['peek', 'Chests opened', 5], ['floor', 'Delve floors cleared', 5], ['prophecy', 'Prophecies judged', 3],
  ['dispel', 'Hexes broken', 3], ['hex_revisit', 'Hexes revisited', 2], ['review', 'Worries reviewed', 2], ['steady', 'Steadying sessions', 2],
  ['sup10', 'Suppression, per 10 minutes', 1], ['steps', 'Steps walked, per 1,000', 1], ['weight10', 'Weight goal, per 10% of the way', 1]
];
// Bumped whenever the way mana is counted changes, so a release is only compared with releases counted the same way.
const MANA_RULES = 3;

/* Mage classes. Thresholds follow how rare each class is: a class held by ten times fewer mages takes about ten times
   the mana. Known counts: 9th class about 2,000 mages, 5th about 600, 1st 51, Great Mages 4. The classes between are
   spaced evenly in rarity. Calibrated so that a steady day (about 12 mana) reaches 5th class in about three months
   and 1st class in under three years. A Great Mage, by the same rule, would take 12.75 times the 1st class, about
   40 years; that last step is shortened to the square root of its rarity (3.57 times), roughly ten years. */
const MAGE_CLASSES = [
  { at: 300, name: '9TH-CLASS MAGE', line: 'An apprentice with a class to your name. Most who start never get this far.' },
  { at: 400, name: '8TH-CLASS MAGE', line: 'Still an apprentice, with fewer beside you now.' },
  { at: 550, name: '7TH-CLASS MAGE', line: 'Halfway through the apprentice years.' },
  { at: 750, name: '6TH-CLASS MAGE', line: 'The last of the apprentice classes.' },
  { at: 1000, name: '5TH-CLASS MAGE', line: 'A full mage. The first class that is not an apprenticeship.' },
  { at: 1850, name: '4TH-CLASS MAGE', line: 'Little is said about this class. Those who hold it are plainly better than the 5th.' },
  { at: 3400, name: '3RD-CLASS MAGE', line: 'High rank. Few travellers ever meet one.' },
  { at: 6400, name: '2ND-CLASS MAGE', line: 'One step below the highest class that can be granted.' },
  { at: 11800, name: '1ST-CLASS MAGE', line: 'The highest class that can be formally granted. Only a few dozen hold it.' },
  { at: 42000, name: 'GREAT MAGE', line: 'Not a class. A title the world gives, held by a handful in all of history.' }
];
function mageClassIndex(total) { let i = -1; MAGE_CLASSES.forEach((c, k) => { if (total >= c.at) i = k; }); return i; }
function mageClassName(i) { return i >= 0 ? MAGE_CLASSES[i].name : 'NO CLASS YET'; }
function classLine() {
  const i = S.mana && S.mana.rank != null ? S.mana.rank : -1;
  return '<p class="small">Your class: ' + mageClassName(i).toLowerCase() + '.' + (i < MAGE_CLASSES.length - 1 ? ' Classes are assessed at each release.' : '') + '</p>';
}
function manaSnapshot() {
  const stormy = new Set(Object.keys(S.days).filter((k) => S.days[k].w >= 3));
  const counts = { leagues: leagues(), cast: 0, errand: 0, peek: 0, floor: 0, prophecy: 0, dispel: 0, hex_revisit: 0, review: 0, steady: 0, sup10: 0, steps: 0, weight10: 0 };
  let bonus = 0, supSec = 0, stormSupSec = 0, steps = 0;
  const deedDays = new Set();
  S.events.forEach((e) => {
    if (MANA_WEIGHTS[e.k] != null) { counts[e.k]++; deedDays.add(e.d); if (stormy.has(e.d)) bonus += MANA_WEIGHTS[e.k]; }
    // Suppression: one mana for every 10 minutes actually spent (never more than the time picked).
    if (e.k === 'suppress') { supSec += e.sec || 0; deedDays.add(e.d); if (stormy.has(e.d)) stormSupSec += e.sec || 0; }
  });
  bonus += Math.floor(stormSupSec / 600);
  Object.keys(S.days).forEach((k) => { const s = S.days[k].s; if (s > 0) steps += s; });
  counts.sup10 = Math.floor(supSec / 600);
  counts.steps = Math.floor(steps / 1000);
  counts.weight10 = weightMana();
  let total = bonus;
  MANA_PARTS.forEach((pt) => { total += counts[pt[0]] * pt[2]; });
  const stormDays = stormy.size;
  const stormActive = [...stormy].filter((k) => deedDays.has(k)).length;
  return { t: Date.now(), rules: MANA_RULES, total: total, counts: counts, bonus: bonus, stormDays: stormDays, stormActive: stormActive };
}
function manaState() {
  const M = S.mana || (S.mana = { at: null, snaps: [] });
  const now = Date.now();
  if (M.at && now < M.at + DAY_MS) return { state: 'open', closesAt: M.at + DAY_MS };
  const opensAt = M.at ? M.at + 8 * DAY_MS : parseD(addDays(S.created, 7)).getTime();
  if (now < opensAt) return { state: 'sealed', opensAt: opensAt, first: !M.at };
  return { state: 'ready' };
}
function fmtNum(n) { return Number(n).toLocaleString('en-US'); }
function signed(n) { return (n >= 0 ? '+' : '') + fmtNum(n); }
function untilText(ts) {
  const ms = ts - Date.now();
  const h = Math.ceil(ms / 3600000);
  if (h <= 24) return 'in ' + plural(Math.max(1, h), 'hour');
  return 'on ' + fmtDate(dkey(new Date(ts))) + ' (in ' + plural(Math.ceil(ms / DAY_MS), 'day') + ')';
}
function renderMana() {
  const ms = manaState();
  const M = S.mana;
  if (ms.state === 'sealed') {
    return win('MANA', '<pre class="art center" aria-hidden="true">' + esc(MANA_ART.replace(/^\n/, '')) + '</pre>' +
      '<p class="nomargin">' + (ms.first ? 'Your mana is suppressed. It gathers from everything you do, and it cannot be seen yet.' : 'Your mana is sealed again. It keeps gathering while it is hidden.') + '</p>' +
      '<p class="dim small">It can be released ' + untilText(ms.opensAt) + '.</p>' + classLine());
  }
  if (ms.state === 'ready') {
    return win('MANA', '<pre class="art fg center" aria-hidden="true">' + esc(MANA_ART.replace(/^\n/, '')) + '</pre>' +
      '<p class="nomargin">The seal has weakened. Your mana can be released.</p>' +
      '<p class="dim small">Once released, it stays visible for 24 hours, then seals itself for at least 7 days. There is no hurry.</p>' + classLine() +
      '<button class="btn wide holdbtn" data-hold="releaseMana" data-a="holdKey">' + '<span class="holdfill" aria-hidden="true"></span><span class="holdlbl">' + (UI.confirm === 'hold' ? 'PRESS AGAIN TO RELEASE' : 'HOLD TO RELEASE') + '</span></button>');
  }
  // open: show live figures against the previous release
  const live = manaSnapshot();
  const prev = M.snaps.length >= 2 ? M.snaps[M.snaps.length - 2] : null;
  const base = prev && prev.rules === MANA_RULES ? prev : null;
  const bc = base ? base.counts : {};
  const last = M.snaps[M.snaps.length - 1] || {};
  const ci = M.rank != null ? M.rank : -1;
  let h = '<p class="sub top">RELEASED · SEALS AGAIN ' + untilText(ms.closesAt).toUpperCase() + '</p>' +
    '<div class="leagues"><span class="bignum">' + fmtNum(live.total) + '</span><span>MANA</span></div>' +
    '<p>' + (base ? signed(live.total - base.total) + ' since your last release, ' + plural(Math.max(1, Math.round((M.at - base.t) / DAY_MS)), 'day') + ' earlier.' : prev ? 'Mana is counted differently since your last release, so this release starts a fresh comparison.' : 'Your first release. All of this was gathered since day one.') + '</p>';
  h += '<p class="lbl">YOUR CLASS</p><p class="bigline nomargin">' + mageClassName(ci) + '</p>' +
    (last.promo ? '<p class="small">Promoted at this release' + (last.promo.length > 1 ? ', through ' + last.promo.length + ' classes at once' : '') + '. ' + esc(MAGE_CLASSES[ci].line) + '</p>' : ci >= 0 ? '<p class="dim small">' + esc(MAGE_CLASSES[ci].line) + '</p>' : '') +
    (ci + 1 < MAGE_CLASSES.length ? '<p class="small">Next: ' + MAGE_CLASSES[ci + 1].name.toLowerCase() + ' at ' + fmtNum(MAGE_CLASSES[ci + 1].at) + ' mana. ' + fmtNum(Math.max(0, MAGE_CLASSES[ci + 1].at - live.total)) + ' to go.' + (live.total >= MAGE_CLASSES[ci + 1].at ? ' You will be assessed at your next release.' : '') + '</p>' : '');
  h += '<p class="lbl">WHAT IT IS MADE OF</p>' + MANA_PARTS.map((pt) => {
    const c = live.counts[pt[0]], d = c - (bc[pt[0]] || 0);
    return '<div class="row tight manarow"><span class="grow">' + pt[1] + (pt[2] > 1 ? ' <span class="dim">x' + pt[2] + '</span>' : '') + '</span><span class="meta">' + fmtNum(c) + (base && d ? ' (' + signed(d) + ')' : '') + '</span><span class="manav">' + fmtNum(c * pt[2]) + '</span></div>';
  }).join('') +
    '<div class="row tight manarow"><span class="grow">Deeds on rainy or stormy days, counted twice</span><span class="meta">' + (base && live.bonus - base.bonus ? '(' + signed(live.bonus - base.bonus) + ')' : '') + '</span><span class="manav">' + fmtNum(live.bonus) + '</span></div>';
  if (live.stormDays) h += '<p class="small">On ' + plural(live.stormDays, 'day') + ' your weather was RAIN or STORM. On ' + live.stormActive + ' of them you still did something.</p>';
  h += '<p class="lbl">THE CLASSES</p>' + MAGE_CLASSES.slice().reverse().map((c, j) => {
    const k = MAGE_CLASSES.length - 1 - j;
    return '<div class="row tight"><span class="mark">' + (k <= ci ? '[x]' : '[ ]') + '</span><span class="grow' + (k === ci ? '' : ' dim') + '">' + c.name.toLowerCase() + '</span><span class="meta">' + fmtNum(c.at) + '</span></div>';
  }).join('') + '<p class="dim small">A class is granted only at a release, like an examination. It is never taken away.</p>';
  const same = M.snaps.filter((x) => x.rules === MANA_RULES);
  if (same.length >= 2) {
    const tots = same.map((x) => x.total);
    tots[tots.length - 1] = live.total;
    const mx = Math.max(...tots, 1);
    h += '<p class="lbl">AT EACH RELEASE</p><div class="bars" role="img" aria-label="Mana at each release: ' + tots.join(', ') + '">' + tots.map((v, i) => '<span class="' + (i === tots.length - 1 ? 'hi' : '') + '" style="height:' + Math.max(2, Math.round((v / mx) * 64)) + 'px"></span>').join('') + '</div><div class="axis dim small"><span>first release</span><span>now</span></div>';
  }
  return win('MANA', h, 'r-l');
}

/* ---------------- statistics ---------------- */

function weekStats(start) {
  const end = addDays(start, 6);
  const inRange = (k) => k >= start && k <= end;
  let lg = 0;
  const t = today();
  Object.keys(deedIndex()).forEach((k) => { if (inRange(k) && k < t) lg++; });
  const ev = S.events.filter((e) => inRange(e.d));
  const floors = ev.filter((e) => e.k === 'floor');
  const reviews = ev.filter((e) => e.k === 'review');
  const st = stepsIn(start, 7);
  return {
    leagues: lg,
    steps: st.sum,
    stepDays: st.n,
    stepAvg: st.avg,
    kgAvg: kgWeek(start).avg,
    casts: ev.filter((e) => e.k === 'cast').length,
    errands: ev.filter((e) => e.k === 'errand').length,
    chests: ev.filter((e) => e.k === 'peek').length,
    floors: floors.length,
    scout: round1(avg(floors.map((f) => f.scout))),
    found: round1(avg(floors.map((f) => f.found))),
    dissolved: reviews.filter((r) => r.res === 'dissolved').length,
    reviewed: reviews.length,
    spells: S.spells.filter((x) => inRange(x.d)).length,
    prophecies: ev.filter((e) => e.k === 'prophecy').length,
    supmin: Math.floor(ev.filter((e) => e.k === 'suppress').reduce((a, e) => a + (e.sec || 0), 0) / 60),
    ptrue: ev.filter((e) => e.k === 'prophecy' && e.o === 'yes').length
  };
}
function weeklySeries(fn, weeks) {
  const ws = weekStart(today());
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) out.push(fn(addDays(ws, -7 * w)));
  return out;
}
function observations() {
  const wdays = Object.keys(S.days).filter((k) => S.days[k].w != null);
  const out = [];
  if (wdays.length < 20) return { need: 20 - wdays.length, list: [] };
  const clear = (k) => S.days[k].w <= 1;
  S.rituals.forEach((r) => {
    const on = wdays.filter((k) => r.casts[k]);
    const off = wdays.filter((k) => !r.casts[k] && k >= r.created);
    if (on.length >= 5 && off.length >= 5) {
      const pOn = on.filter(clear).length / on.length;
      const pOff = off.filter(clear).length / off.length;
      if (Math.abs(pOn - pOff) >= 0.15) out.push({ w: Math.abs(pOn - pOff), s: 'On days you cast ' + r.name + ', your weather was clear or fair ' + pct(pOn) + ' of the time. On other days, ' + pct(pOff) + '. (' + (on.length + off.length) + ' days.)' });
    }
  });
  // For rituals done a few times a week (exercise, say), the day after a session is often the telling one.
  S.rituals.filter(isWeekly).forEach((r) => {
    const after = wdays.filter((k) => r.casts[addDays(k, -1)]);
    const notAfter = wdays.filter((k) => !r.casts[addDays(k, -1)] && addDays(k, -1) >= r.created);
    if (after.length >= 5 && notAfter.length >= 5) {
      const a = after.filter(clear).length / after.length, b = notAfter.filter(clear).length / notAfter.length;
      if (Math.abs(a - b) >= 0.15) out.push({ w: Math.abs(a - b), s: 'On days after a session of ' + r.name + ', your weather was clear or fair ' + pct(a) + ' of the time. After days without one, ' + pct(b) + '. (' + (after.length + notAfter.length) + ' days.)' });
    }
  });
  const errandDays = new Set(S.events.filter((e) => e.k === 'errand').map((e) => e.d));
  const eOn = wdays.filter((k) => errandDays.has(k)), eOff = wdays.filter((k) => !errandDays.has(k));
  if (eOn.length >= 5 && eOff.length >= 5) {
    const a = eOn.filter(clear).length / eOn.length, b = eOff.filter(clear).length / eOff.length;
    if (Math.abs(a - b) >= 0.15) out.push({ w: Math.abs(a - b), s: 'On days you finished an errand, your weather was clear or fair ' + pct(a) + ' of the time. On other days, ' + pct(b) + '. (' + wdays.length + ' days.)' });
  }
  // Steps against weather, split near your own typical day so both sides have enough days.
  const walked = wdays.filter((k) => S.days[k].s != null);
  if (walked.length >= 10) {
    const sorted = walked.map((k) => S.days[k].s).sort((a, b) => a - b);
    const cut = Math.max(500, Math.round(sorted[Math.floor(sorted.length / 2)] / 500) * 500);
    const hi = walked.filter((k) => S.days[k].s >= cut), lo = walked.filter((k) => S.days[k].s < cut);
    if (hi.length >= 5 && lo.length >= 5) {
      const a = hi.filter(clear).length / hi.length, b = lo.filter(clear).length / lo.length;
      if (Math.abs(a - b) >= 0.15) out.push({ w: Math.abs(a - b), s: 'On days you walked ' + fmtNum(cut) + ' steps or more, your weather was clear or fair ' + pct(a) + ' of the time. On days with fewer, ' + pct(b) + '. (' + walked.length + ' days.)' });
    }
  }
  S.rituals.forEach((r) => {
    const times = Object.values(r.casts).filter((x) => /^\d\d:\d\d$/.test(x || ''));
    if (times.length >= 10) {
      const hours = {};
      times.forEach((t) => { const h = Number(t.split(':')[0]); hours[h] = (hours[h] || 0) + 1; });
      const best = Object.keys(hours).sort((a, b) => hours[b] - hours[a])[0];
      if (hours[best] / times.length >= 0.3) out.push({ w: 0.1, s: 'You cast ' + r.name + ' most often between ' + pad(best) + ':00 and ' + pad((Number(best) + 1) % 24) + ':00.' });
    }
  });
  out.sort((a, b) => b.w - a.w);
  return { need: 0, list: out.slice(0, 5).map((o) => o.s) };
}
function checkWaystone() {
  const wk = weekStart(today());
  if (!S.lastWaystone) { S.lastWaystone = wk; return; }
  if (S.lastWaystone === wk) return;
  S.lastWaystone = wk;
  const prev = addDays(wk, -7);
  const st = weekStats(prev);
  if (st.leagues > 0) UI.modals.push({ type: 'waystone', week: prev, st: st });
  save();
}

/* ---------------- theme ---------------- */

function applyTheme() {
  const set = S ? S.settings : freshState().settings;
  const p = PHOSPHORS[set.phosphor] || PHOSPHORS.orange;
  const root = document.documentElement.style;
  root.setProperty('--fg', p.fg);
  root.setProperty('--dim', p.dim);
  root.setProperty('--faint', p.faint);
  root.setProperty('--soft', p.dim + '73');
  root.setProperty('--glowc', p.fg + '80');
  root.setProperty('--fs', { s: '17px', m: '20px', l: '23px' }[set.size] || '20px');
  document.body.classList.toggle('noscan', !set.scan);
  document.body.classList.toggle('noglow', !set.glow);
}

/* ---------------- navigation ---------------- */

function topView() { return UI.stack[UI.stack.length - 1] || null; }
function open(view) { stopTickers(); UI.stack.push(view); UI.form = {}; UI.confirm = null; render(true); }
function back() { stopTickers(); UI.stack.pop(); UI.form = {}; UI.confirm = null; render(true); }
function goTab(tab) { stopTickers(); UI.tab = tab; UI.stack = []; UI.form = {}; UI.confirm = null; render(true); }
function stopTickers() { tickers.forEach((t) => clearInterval(t)); tickers = []; }
function showToast(text, undo) {
  UI.toast = { text: text, undo: undo || null, id: uid() };
  const id = UI.toast.id;
  setTimeout(() => { if (UI.toast && UI.toast.id === id) { UI.toast = null; render(); } }, 5000);
}
function toast(text) { showToast(text); render(); }

/* ---------------- rendering ---------------- */

function win(title, body, extra) {
  return '<section class="win' + (extra ? ' ' + extra : '') + '"><h2>' + title + '</h2>' + body + '</section>';
}
function backRow(label) { return '<button class="lnk dim backbtn" data-a="back">&lt; ' + (label || 'BACK') + '</button>'; }
function fval(key, fallback) { return UI.form[key] !== undefined ? UI.form[key] : (fallback == null ? '' : fallback); }
function seasonOf(d) { const m = d.getMonth(); return (m <= 1 || m === 11) ? 'WINTER' : m <= 4 ? 'SPRING' : m <= 7 ? 'SUMMER' : 'AUTUMN'; }
function todOf(d) { const h = d.getHours(); return h < 5 ? 'NIGHT' : h < 8 ? 'DAWN' : h < 12 ? 'MORNING' : h < 17 ? 'AFTERNOON' : h < 21 ? 'EVENING' : 'NIGHT'; }
const SCREEN_NAMES = { camp: 'CAMP', quests: 'QUEST BOARD', arts: 'THE ARTS', grimoire: 'GRIMOIRE', road: 'THE ROAD' };

function render(resetScroll) {
  const app = $('#app');
  if (!app) return;
  if (S && UI.lastDay !== today()) { UI.lastDay = today(); advanceJourney(); checkWaystone(); }
  const main = $('main', app);
  const key = UI.tab + '|' + UI.stack.map((v) => v.type + (v.id || '')).join('/');
  if (main && !resetScroll) UI.scroll[key] = main.scrollTop;
  const v = topView();
  let html;
  if (!S || (v && v.type === 'title')) html = renderTitle();
  else {
    const full = v && ['peek', 'steady', 'suppress'].includes(v.type) && (v.running || v.phase === 'running' || (v.type === 'peek' && v.phase === 'after'));
    html = renderHeader() + '<main id="main">' + renderScreen() + '</main>' + (full ? '' : renderNav());
  }
  html += renderToast() + renderModal();
  app.innerHTML = html;
  const m2 = $('main', app);
  if (m2) m2.scrollTop = resetScroll ? 0 : (UI.scroll[key] || 0);
  if (resetScroll) UI.scroll[key] = 0;
}
UI.scroll = {};

function renderHeader() {
  const now = new Date();
  const day = dayNumber();
  const v = topView();
  const name = v && v.title ? v.title : SCREEN_NAMES[UI.tab];
  return '<header class="hdr">' +
    '<div class="hrow big"><span class="apptitle">' + esc(S.settings.title) + '</span><button class="lnk optbtn" data-a="openOptions" aria-label="Options">[OPT]</button></div>' +
    '<div class="hrow dim small"><span class="nowrap">DAY ' + String(day).padStart(3, '0') + ' · ' + seasonOf(now) + ' · ' + todOf(now) + '</span><span class="nowrap">' + esc(name) + '</span></div></header>' + updateBar();
}
function renderNav() {
  const tabs = [['camp', 'CAMP'], ['quests', 'QUESTS'], ['arts', 'ARTS'], ['grimoire', 'GRIMOIRE'], ['road', 'ROAD']];
  return '<nav aria-label="Main">' + tabs.map((t) => '<button data-a="tab" data-v="' + t[0] + '"' + (UI.tab === t[0] && !topView() ? ' aria-current="page"' : (UI.tab === t[0] ? ' class="here"' : '')) + '>' + t[1] + '</button>').join('') + '</nav>';
}
function renderToast() {
  if (!UI.toast) return '';
  return '<div class="toast" role="status"><span>' + esc(UI.toast.text) + '</span>' + (UI.toast.undo ? '<button class="btn" data-a="undo">UNDO</button>' : '') + '</div>';
}

function renderScreen() {
  const v = topView();
  if (v) {
    const fn = VIEWS[v.type];
    return fn ? fn(v) : '';
  }
  return { camp: renderCamp, quests: renderQuests, arts: renderArts, grimoire: renderGrimoire, road: renderRoad }[UI.tab]();
}

function renderTitle() {
  const returning = !!S;
  return '<div class="title">' +
    '<pre class="art" aria-hidden="true">' + esc(TITLE_ART.replace(/^\n/, '')) + '</pre>' +
    '<h1>LIFE IS A<br>JOURNEY</h1>' +
    '<p class="dim">a chronicle of small days</p>' +
    '<div class="titlemenu">' +
    (returning ? '<button class="lnk" data-a="closeTitle">(C) CONTINUE THE JOURNEY</button>' : '<button class="lnk" data-a="begin">(B) BEGIN THE JOURNEY</button>') +
    '</div>' +
    '<p class="dim small">' + (returning ? 'DAY ' + String(dayNumber()).padStart(3, '0') + ' OF THE ROAD' : 'Everything you write stays with you.') + ' <span class="cursor" aria-hidden="true"></span></p>' +
    '</div>';
}

/* ---- CAMP ---- */
// Everything with a second step that is ready for it, in one place: the open jar, prophecies due, hexes to look at
// again, and hexes caught but not yet answered. Nothing here is overdue in a way that costs anything; it simply waits.
function revisitWindow() {
  const t = today();
  const rows = [];
  const item = (attrs, text, sub) => '<button class="row item" ' + attrs + '><span class="grow">' + text + '<span class="sub">' + sub + '</span></span></button>';
  const ready = sealsReady();
  if (ready.length) rows.push(item('data-a="openView" data-v="seal"', 'THE JAR IS OPEN', plural(ready.length, 'sealed worry', 'sealed worries') + ' ready to look at'));
  prophecyDue().forEach((p) => rows.push(item('data-a="openView" data-v="prophecy"', '"' + esc(p.text) + '"', 'PROPHECY · ' + (p.due === t ? 'its day is today' : 'its day was ' + fmtDate(p.due)) + ' · did it happen?')));
  hexesDue().forEach((x) => rows.push(item('data-a="openHex" data-id="' + x.id + '"', '"' + esc(x.words) + '"', 'HEX · broken ' + fmtDate(x.ad) + ' · how true does it feel now?')));
  hexesCaught().forEach((x) => rows.push(item('data-a="openHex" data-id="' + x.id + '"', '"' + esc(x.words) + '"', 'HEX · caught ' + fmtDate(x.d) + ' · waiting for an answer')));
  if (!rows.length) return '';
  const shown = rows.slice(0, 6);
  return win('TO REVISIT', shown.join('') + (rows.length > shown.length ? '<p class="dim small">+ ' + (rows.length - shown.length) + ' more under the Arts.</p>' : '') + '<p class="dim small">Nothing here is late. It waits until you are ready.</p>');
}
function renderCamp() {
  const now = new Date();
  const tod = todOf(now);
  const lines = CAMP_LINES[tod];
  const line = lines[daysBetween(S.created, today()) % lines.length];
  let h = S.settings.companion === false
    ? '<p class="dim">' + line + ' Nothing more is asked of you today.</p>'
    : '<div class="campscene"><pre class="art fg companion" id="companion" aria-hidden="true">' + esc(companionFrame(compTick)) + '</pre><p class="dim">' + line + ' Nothing more is asked of you today.</p></div>';

  const rits = S.rituals.filter((r) => !r.archived);
  if (rits.length) {
    h += win('RITUALS TODAY', rits.map((r) => {
      const st = ritualStats(r);
      const mark = ritualMark(r, st);
      const subs = [];
      if (st.weekly) { subs.push(st.castToday ? 'session done today' : st.target + ' a week'); const rem = weekReminder(r, st); if (rem) subs.push(rem); }
      else if (r.per > 1) subs.push(r.per + ' times a day');
      if (r.least) subs.push('least: ' + esc(r.least));
      const faded = st.weekly ? (st.week >= st.target || st.restWeek) : st.castToday;
      return '<button class="row item" data-a="cast" data-id="' + r.id + '" aria-pressed="' + st.castToday + '" aria-label="' + esc(r.name) + ', ' + (st.weekly ? st.week + ' of ' + st.target + ' this week' + (st.castToday ? ', session done today' : '') : st.castToday ? 'done today' : hitsToday(r) + ' of ' + (r.per || 1) + ' today') + '">' +
        '<span class="mark">' + mark + '</span><span class="grow"><span class="' + (faded ? 'faded' : '') + '">' + esc(r.name) + '</span>' +
        (subs.length ? '<span class="sub">' + subs.join(' · ') + '</span>' : '') + '</span>' +
        '<span class="meta">' + (r.time ? esc(r.time) + '<br>' : '') + flameLabel(st) + '</span></button>';
    }).join(''));
  }

  const due = errandsDue();
  const shown = due.slice(0, 5);
  const rest = S.errands.filter((e) => !e.dread).length - shown.length;
  h += win('ERRANDS', (shown.length ? shown.map(errandRow).join('') : '<p class="dim small">Nothing due today.</p>') +
    (rest > 0 ? '<p class="dim small">+ ' + plural(rest, 'more errand') + ' on the board</p>' : ''));

  const chests = S.errands.filter((e) => e.dread);
  if (chests.length) {
    const c = chests.slice().sort((a, b) => (a.dreadAt || '').localeCompare(b.dreadAt || ''))[0];
    const waited = c.dreadAt ? daysBetween(c.dreadAt, today()) : 0;
    h += win('A CHEST BY THE ROAD', '<p class="nomargin">' + esc(c.text) + '</p><p class="dim small">' + (waited ? 'It has waited here ' + plural(waited, 'day') + '.' : 'It appeared today.') + ' Mimics are mostly bluff.</p>' +
      '<button class="btn" data-a="peekStart" data-id="' + c.id + '">(P) PEEK INSIDE · 2 MIN</button>' +
      (chests.length > 1 ? '<p class="dim small">' + plural(chests.length - 1, 'more chest') + ' on the board.</p>' : ''));
  }

  if (manaState().state === 'ready') h += win('MANA', '<p class="nomargin">The seal has weakened. Your mana can be released, whenever you like.</p><button class="btn" data-a="tab" data-v="grimoire">TO THE GRIMOIRE</button>');

  h += revisitWindow();

  const day = dayRec();
  h += win('INNER WEATHER', '<div class="weather">' + WEATHER.map((w, i) => '<button class="wbtn' + (day.w === i ? ' on' : '') + '" data-a="weather" data-v="' + i + '" aria-pressed="' + (day.w === i) + '">' + w + '</button>').join('') + '</div>' +
    '<p class="dim small">Optional. Weather is a record, not a verdict.</p>');

  h += win('INSCRIBE', '<div class="inline"><label class="sr" for="f-line">One line about today</label><input id="f-line" type="text" maxlength="200" placeholder="one line about today" data-bind="line" data-enter="inscribe" value="' + esc(fval('line', day.l || '')) + '"><button class="btn" data-a="inscribe">' + (day.l ? 'KEEP' : 'WRITE') + '</button></div>');

  const ys = addDays(today(), -1);
  const sd = UI.stepsDay === 'y' ? ys : today();
  const srec = S.days[sd] || {};
  const yMissing = UI.stepsDay !== 'y' && !(S.days[ys] && S.days[ys].s != null) && ys >= S.created;
  h += win('STEPS AND WEIGHT',
    '<div class="seg" role="group" aria-label="Which day">' + [['t', 'TODAY'], ['y', 'YESTERDAY']].map((x) => { const on = (UI.stepsDay === 'y') === (x[0] === 'y'); return '<button class="segb' + (on ? ' on' : '') + '" data-a="stepsDay" data-v="' + x[0] + '" aria-pressed="' + on + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<p class="lbl">STEPS</p>' + stepsField('steps', sd, srec) +
    '<p class="lbl">WEIGHT, KG</p>' + kgField('kg', sd, srec) +
    '<p class="dim small">' + (yMissing ? 'Yesterday has no steps yet. ' : '') + 'Both are optional. Older days can be filled in from the calendar on the Road.</p>');

  if (now.getHours() >= 19) {
    const tm = addDays(today(), 1);
    const n = S.errands.filter((e) => e.date === tm).length;
    h += win('TOMORROW\'S ROAD', '<p class="nomargin">' + (n ? plural(n, 'errand') + ' already set for tomorrow.' : 'Nothing set for tomorrow yet.') + '</p><p class="dim small">Choosing tomorrow\'s few things tonight saves you from choosing them at your lowest.</p><button class="btn" data-a="openView" data-v="plan">PLAN TOMORROW</button>');
  }

  h += win('ADD', addForm('camp'));

  const log = S.log.slice(-3);
  h += '<div class="log" role="log" aria-label="Journal">' + log.map((l) => '<div>&gt; ' + esc(l.s) + '</div>').join('') + '<div class="fg">&gt; <span class="cursor" aria-hidden="true"></span></div></div>';
  return h;
}
function errandRow(e) {
  const meta = [];
  if (e.time) meta.push(esc(e.time));
  if (e.date && e.date !== today()) meta.push(fmtDate(e.date));
  if (e.list && e.list.length) meta.push(e.list.filter((x) => x.done).length + '/' + e.list.length);
  if (e.repeat) meta.push('every ' + plural(e.repeat, 'day'));
  const need = errandNeed(e);
  return '<div class="row item"><button class="mark lnk" data-a="tick" data-id="' + e.id + '" aria-label="' + (need > 1 ? 'One more done: ' + esc(e.text) + ', ' + (e.got || 0) + ' of ' + need : 'Mark done: ' + esc(e.text)) + '">' + errandMark(e) + '</button>' +
    '<button class="grow lnk" data-a="openErrand" data-id="' + e.id + '">' + esc(e.text) + (meta.length ? '<span class="sub">' + meta.join(' · ') + '</span>' : '') + '</button></div>';
}
function addForm(where) {
  const kind = fval('addKind', 'errand');
  const when = fval('addWhen', where === 'camp' ? 'today' : 'someday');
  return '<div class="seg" role="group" aria-label="Kind">' +
    ['errand', 'ritual'].map((k) => '<button class="segb' + (kind === k ? ' on' : '') + '" data-a="setForm" data-k="addKind" data-v="' + k + '" aria-pressed="' + (kind === k) + '">' + k.toUpperCase() + '</button>').join('') + '</div>' +
    '<div class="inline"><label class="sr" for="f-add">' + (kind === 'ritual' ? 'New ritual' : 'New errand') + '</label><input id="f-add" type="text" maxlength="140" placeholder="' + (kind === 'ritual' ? 'a daily habit, e.g. read' : 'something to do') + '" data-bind="addText" data-enter="add" data-where="' + where + '" value="' + esc(fval('addText')) + '"><button class="btn" data-a="add" data-where="' + where + '">ADD</button></div>' +
    (kind === 'errand' ? '<div class="seg small" role="group" aria-label="When">' + [['today', 'TODAY'], ['tomorrow', 'TOMORROW'], ['someday', 'SOMEDAY']].map((w) => '<button class="segb' + (when === w[0] ? ' on' : '') + '" data-a="setForm" data-k="addWhen" data-v="' + w[0] + '" aria-pressed="' + (when === w[0]) + '">' + w[1] + '</button>').join('') + '</div><p class="dim small">End with x3 for something done three times, like "trash bags x3".</p>' : '<p class="dim small">Daily by default. End with 4/week for one done four times a week, like "workout 4/week".</p>');
}

/* ---- QUESTS ---- */
function renderQuests() {
  const t = today(), tm = addDays(t, 1);
  const errs = S.errands.filter((e) => !e.dread);
  const groups = [
    ['DUE', errs.filter((e) => e.date && e.date <= t)],
    ['TOMORROW', errs.filter((e) => e.date === tm)],
    ['LATER', errs.filter((e) => e.date && e.date > tm)],
    ['SOMEDAY', errs.filter((e) => !e.date)]
  ];
  let h = win('ADD', addForm('quests'));
  const errBody = errs.length ? groups.filter((g) => g[1].length).map((g) => '<p class="grouphd">' + g[0] + '</p>' + g[1].sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || ''))).map(errandRow).join('')).join('') : '<p class="dim small">No errands yet. Anything you need to do once, like groceries or a phone call, goes here.</p>';
  h += win('ERRANDS', errBody);

  const chests = S.errands.filter((e) => e.dread);
  h += win('MIMICS', (chests.length ? chests.map((e) => '<div class="row item"><button class="grow lnk" data-a="openErrand" data-id="' + e.id + '">' + esc(e.text) + '<span class="sub">' + (e.dreadAt ? 'waiting ' + plural(daysBetween(e.dreadAt, t), 'day') : '') + '</span></button><button class="btn" data-a="peekStart" data-id="' + e.id + '">PEEK</button></div>').join('') : '') +
    '<p class="dim small">' + (chests.length ? 'Opening a chest for two minutes counts, finished or not.' : 'Mark an errand as dreaded and it becomes a chest. Peeking inside for two minutes counts.') + '</p>');

  const active = S.rituals.filter((r) => !r.archived);
  const archived = S.rituals.filter((r) => r.archived);
  h += win('RITUALS', (active.length ? active.map(ritualRow).join('') : '<p class="dim small">No rituals yet. A ritual is a daily habit with a flame that survives one missed day.</p>') +
    (archived.length ? '<p class="grouphd">RESTING</p>' + archived.map(ritualRow).join('') : ''));
  return h;
}
function ritualRow(r) {
  const st = ritualStats(r);
  return '<button class="row item" data-a="openRitual" data-id="' + r.id + '"><span class="grow">' + esc(r.name) + '<span class="sub">' + (isWeekly(r) ? weekTarget(r) + 'x a week · ' : r.per > 1 ? r.per + 'x a day · ' : '') + (r.time ? esc(r.time) + ' · ' : '') + flameLabel(st) + ' · cast ' + st.total + (rankOf(st.total) ? ' · ' + rankOf(st.total).toLowerCase() : '') + '</span></span><span class="meta">' + strip(r, 7) + '</span></button>';
}
function strip(r, n) {
  const t = today();
  let h = '<span class="strip" aria-hidden="true">';
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(t, -i);
    let c = 'none';
    if (d < r.created && !r.casts[d]) c = 'before';
    else if (r.casts[d]) c = 'cast';
    else if (isWeekly(r)) c = isRestWeek(r, weekStart(d)) ? 'rest' : d === t ? 'open' : 'off';
    else if (r.rests[d]) c = 'rest';
    else if (r.hits && r.hits[d] && r.hits[d].length) c = 'part';
    else if (d === t) c = 'open';
    h += '<i class="' + c + '"></i>';
  }
  return h + '</span>';
}

const VIEWS = {};

VIEWS.errand = function (v) {
  const e = S.errands.find((x) => x.id === v.id);
  if (!e) return backRow() + '<p class="dim">This errand is gone.</p>';
  const dread = fval('e-dread', e.dread);
  let h = backRow();
  h += win('ERRAND',
    '<label for="e-text" class="lbl">What</label><input id="e-text" type="text" maxlength="140" data-bind="e-text" value="' + esc(fval('e-text', e.text)) + '">' +
    '<div class="two"><div><label for="e-date" class="lbl">Date</label><input id="e-date" type="date" data-bind="e-date" value="' + esc(fval('e-date', e.date || '')) + '"></div>' +
    '<div><label for="e-time" class="lbl">Time</label><input id="e-time" type="time" data-bind="e-time" value="' + esc(fval('e-time', e.time || '')) + '"></div></div>' +
    '<label for="e-repeat" class="lbl">Repeat every N days (empty for one-off)</label><input id="e-repeat" type="number" min="1" max="365" inputmode="numeric" data-bind="e-repeat" value="' + esc(fval('e-repeat', e.repeat || '')) + '">' +
    '<label for="e-need" class="lbl">Times to do it before it is done (e.g. 3 for three trash bags)</label><input id="e-need" type="number" min="1" max="99" inputmode="numeric" data-bind="e-need" value="' + esc(fval('e-need', errandNeed(e))) + '">' +
    (errandNeed(e) > 1 ? '<p class="lbl">DONE SO FAR: ' + (e.got || 0) + ' OF ' + errandNeed(e) + '</p><div class="btns"><button class="btn solid" data-a="errPlus" data-id="' + e.id + '">+1</button><button class="btn" data-a="errMinus" data-id="' + e.id + '"' + (e.got ? '' : ' disabled') + '>-1</button></div>' : '') +
    '<button class="row lnk wide" data-a="setForm" data-k="e-dread" data-v="' + (!dread) + '" aria-pressed="' + !!dread + '"><span class="mark">' + (dread ? '[x]' : '[ ]') + '</span><span class="grow">Dreaded<span class="sub">It becomes a chest you can peek into.</span></span></button>' +
    '<div class="btns"><button class="btn solid" data-a="saveErrand" data-id="' + e.id + '">SAVE</button><button class="btn" data-a="doneErrand" data-id="' + e.id + '">DONE</button></div>');
  h += win('CHECKLIST',
    (e.list.length ? e.list.map((x) => '<div class="row item"><button class="mark lnk" data-a="tickItem" data-id="' + e.id + '" data-i="' + x.id + '" aria-pressed="' + x.done + '">' + (x.done ? '[x]' : '[ ]') + '</button><span class="grow' + (x.done ? ' faded' : '') + '">' + esc(x.text) + '</span><button class="lnk dim" data-a="delItem" data-id="' + e.id + '" data-i="' + x.id + '" aria-label="Remove ' + esc(x.text) + '">x</button></div>').join('') : '<p class="dim small">Optional. For lists like groceries.</p>') +
    '<div class="inline"><label class="sr" for="e-item">New item</label><input id="e-item" type="text" maxlength="100" placeholder="add an item" data-bind="e-item" data-enter="addItem" data-id="' + e.id + '" value="' + esc(fval('e-item')) + '"><button class="btn" data-a="addItem" data-id="' + e.id + '">ADD</button></div>');
  h += '<button class="btn danger" data-a="delErrand" data-id="' + e.id + '">' + (UI.confirm === 'del' + e.id ? 'TAP AGAIN TO DELETE' : 'DELETE ERRAND') + '</button>';
  return h;
};

function weekDayButtons(r) {
  const t = today(), ws = weekStart(t);
  const names = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  let h = '<div class="weekdays" role="group" aria-label="Sessions this week">';
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i), n = sessionsOn(r, d);
    const future = d > t;
    const locked = n && d < t && !isLate(r, d);
    h += '<button class="wd' + (n ? ' on' : '') + (d === t ? ' today' : '') + '" data-a="toggleSession" data-id="' + r.id + '" data-d="' + d + '"' + (future ? ' disabled' : '') +
      ' aria-pressed="' + !!n + '" aria-label="' + fmtFull(d) + (n ? ', ' + plural(n, 'session') + (isLate(r, d) ? ', added later' : '') + (locked ? ', recorded on the day' : '') : ', no session') + '">' +
      '<span>' + names[i] + '</span><span class="wdn">' + (n ? (n > 1 ? n : (isLate(r, d) ? '+' : '*')) : (future ? '' : '-')) + '</span></button>';
  }
  return h + '</div>';
}
function weeklyRitualView(r, st, rank) {
  const alive = st.status === 'burning' || st.status === 'flickering';
  const rem = weekReminder(r, st);
  const ws = weekStart(today());
  const series = [];
  for (let i = 11; i >= 0; i--) series.push(sessionsInWeek(r, addDays(ws, -7 * i)));
  let h = win(esc(r.name.toUpperCase()),
    '<div class="statgrid">' +
    '<div><span class="bignum">' + (alive ? st.flame : '-') + '</span><span class="sub">' + (st.status === 'unlit' ? 'unlit' : st.status === 'embers' ? 'embers' : 'flame, weeks' + (st.status === 'flickering' ? ', flickering' : '')) + '</span></div>' +
    '<div><span class="bignum">' + st.longest + '</span><span class="sub">longest, weeks</span></div>' +
    '<div><span class="bignum">' + st.total + '</span><span class="sub">sessions</span></div></div>' +
    '<p class="small">' + (rank ? 'Rank: ' + rank + (r.spellName ? ' · ' + esc(r.spellName) : '') : 'Learned at 10 sessions: ' + (10 - st.total) + ' to go.') + (st.total >= 10 && st.total < 66 ? ' Rooted at 66.' : '') + '</p>' +
    '<p class="lbl">THIS WEEK</p><p class="bigline nomargin">' + st.week + ' of ' + st.target + (st.restWeek ? ' · rest week' : '') + '</p>' +
    (rem && !st.restWeek ? '<p class="small">' + cap(rem) + '.</p>' : '') +
    weekDayButtons(r) +
    '<p class="dim small">Tap a day to add a session you did but did not log. A session added later counts for the week, the flame and mana, but not for that day\'s league. For older weeks, open the day from the calendar on the Road.</p>' +
    '<div class="btns"><button class="btn solid" data-a="castPlus" data-id="' + r.id + '">+1 SESSION TODAY</button><button class="btn" data-a="castMinus" data-id="' + r.id + '"' + (st.castToday ? '' : ' disabled') + '>-1</button></div>' +
    '<p class="lbl">LAST 14 DAYS</p>' + strip(r, 14) +
    '<p class="dim small">Square: a session. Faint dot: no session, which is fine. Bar: a rest week.</p>' +
    '<p class="lbl">SESSIONS, LAST 12 WEEKS</p>' + bars(series, st.target) +
    '<p class="small">Target met in ' + st.full + ' of ' + plural(st.judged, 'week') + ' so far.</p>' +
    '<p class="dim small">A full week grows the flame by a week. A week with at least one session keeps it alight. An empty week is forgiven once; two in a row put it out. A rest week keeps the flame as it is. This week is judged when it ends.</p>');
  const next = addDays(ws, 7);
  const marked = (r.restWeeks || []).slice().sort().reverse();
  h += win('REST WEEKS',
    '<p class="dim small">Illness, travel, a week off. A rest week keeps the flame exactly as it is. Any week can be marked, past or coming.</p>' +
    '<div class="btns"><button class="btn' + (isRestWeek(r, ws) ? ' solid' : '') + '" data-a="restWeek" data-id="' + r.id + '" data-v="' + ws + '" aria-pressed="' + isRestWeek(r, ws) + '">' + (isRestWeek(r, ws) ? 'THIS WEEK: RESTING' : 'REST THIS WEEK') + '</button>' +
    '<button class="btn' + (isRestWeek(r, next) ? ' solid' : '') + '" data-a="restWeek" data-id="' + r.id + '" data-v="' + next + '" aria-pressed="' + isRestWeek(r, next) + '">' + (isRestWeek(r, next) ? 'NEXT WEEK: RESTING' : 'REST NEXT WEEK') + '</button></div>' +
    '<label class="lbl" for="rw-date">Another week: pick any day in it</label><div class="inline"><input id="rw-date" type="date" data-bind="rw-date" value="' + esc(fval('rw-date')) + '"><button class="btn" data-a="restWeek" data-id="' + r.id + '" data-v="pick">MARK</button></div>' +
    (marked.length ? '<p class="lbl">MARKED</p>' + marked.slice(0, 12).map((w) => '<div class="row tight"><span class="grow">' + fmtDate(w) + ' to ' + fmtDate(addDays(w, 6)) + (w === ws ? ' <span class="dim">this week</span>' : w > ws ? ' <span class="dim">coming</span>' : '') + '</span><button class="lnk dim" data-a="restWeek" data-id="' + r.id + '" data-v="' + w + '" aria-label="Unmark the week of ' + fmtDate(w) + '">x</button></div>').join('') : ''));
  return h;
}
VIEWS.ritual = function (v) {
  const r = S.rituals.find((x) => x.id === v.id);
  if (!r) return backRow() + '<p class="dim">This ritual is gone.</p>';
  const st = ritualStats(r);
  const rank = rankOf(st.total);
  let h = backRow();
  if (st.weekly) h += weeklyRitualView(r, st, rank);
  else h += win(esc(r.name.toUpperCase()),
    '<div class="statgrid">' +
    '<div><span class="bignum">' + (st.status === 'burning' || st.status === 'flickering' ? st.flame : '-') + '</span><span class="sub">' + (st.status === 'unlit' ? 'unlit' : st.status === 'embers' ? 'embers' : 'flame' + (st.status === 'flickering' ? ', flickering' : '')) + '</span></div>' +
    '<div><span class="bignum">' + st.longest + '</span><span class="sub">longest flame</span></div>' +
    '<div><span class="bignum">' + st.total + '</span><span class="sub">total casts</span></div></div>' +
    '<p class="small">' + (rank ? 'Rank: ' + rank + (r.spellName ? ' · ' + esc(r.spellName) : '') : 'Learned at 10 casts: ' + (10 - st.total) + ' to go.') + (st.total >= 10 && st.total < 66 ? ' Rooted at 66.' : '') + '</p>' +
    '<p class="lbl">Last 14 days</p>' + strip(r, 14) +
    '<p class="dim small">Square: cast. ' + (r.per > 1 ? 'Half square: started, not finished. ' : '') + 'Bar: rest. Dot: missed. One missed day leaves the flame burning; two in a row put it out. The record stays either way.</p>' +
    (r.per > 1
      ? '<p class="small">Today: ' + hitsToday(r) + ' of ' + r.per + (st.castToday ? '. Done.' : '. The day counts once all ' + r.per + ' are done.') + '</p>' +
        '<div class="btns"><button class="btn solid" data-a="castPlus" data-id="' + r.id + '"' + (st.castToday ? ' disabled' : '') + '>+1 TODAY</button><button class="btn" data-a="castMinus" data-id="' + r.id + '"' + (hitsToday(r) ? '' : ' disabled') + '>-1</button><button class="btn" data-a="rest" data-id="' + r.id + '">' + (st.restToday ? 'NOT RESTING' : 'REST TODAY') + '</button></div>'
      : '<div class="btns"><button class="btn solid" data-a="cast" data-id="' + r.id + '">' + (st.castToday ? 'UNCAST TODAY' : 'CAST TODAY') + '</button><button class="btn" data-a="rest" data-id="' + r.id + '">' + (st.restToday ? 'NOT RESTING' : 'REST TODAY') + '</button></div>'));
  h += win('SETTINGS',
    '<label for="r-name" class="lbl">Ritual</label><input id="r-name" type="text" maxlength="80" data-bind="r-name" value="' + esc(fval('r-name', r.name)) + '">' +
    '<label for="r-least" class="lbl">The least that still counts</label><input id="r-least" type="text" maxlength="80" placeholder="e.g. one page" data-bind="r-least" value="' + esc(fval('r-least', r.least)) + '">' +
    '<label for="r-cue" class="lbl">When and where</label><input id="r-cue" type="text" maxlength="120" placeholder="e.g. in bed, after brushing teeth" data-bind="r-cue" value="' + esc(fval('r-cue', r.cue)) + '">' +
    (function () {
      const mode = fval('r-mode', r.mode || 'daily');
      return '<p class="lbl">HOW OFTEN</p><div class="seg" role="group" aria-label="How often">' + [['daily', 'EVERY DAY'], ['weekly', 'TIMES A WEEK']].map((x) => '<button class="segb' + (mode === x[0] ? ' on' : '') + '" data-a="setForm" data-k="r-mode" data-v="' + x[0] + '" aria-pressed="' + (mode === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
        (mode === 'weekly'
          ? '<label for="r-week" class="lbl">Sessions a week (e.g. 4 for workouts)</label><input id="r-week" type="number" min="1" max="14" inputmode="numeric" data-bind="r-week" value="' + esc(fval('r-week', weekTarget(r))) + '">'
          : '<label for="r-per" class="lbl">Times a day before it counts (e.g. 2 for brushing teeth)</label><input id="r-per" type="number" min="1" max="12" inputmode="numeric" data-bind="r-per" value="' + esc(fval('r-per', r.per || 1)) + '">');
    })() +
    '<label for="r-time" class="lbl">Time (reminders arrive in the Android app)</label><input id="r-time" type="time" data-bind="r-time" value="' + esc(fval('r-time', r.time || '')) + '">' +
    (st.total >= 10 ? '<label for="r-spell" class="lbl">Its name in the Grimoire</label><input id="r-spell" type="text" maxlength="80" data-bind="r-spell" value="' + esc(fval('r-spell', r.spellName || '')) + '">' : '') +
    '<div class="btns"><button class="btn solid" data-a="saveRitual" data-id="' + r.id + '">SAVE</button><button class="btn" data-a="archiveRitual" data-id="' + r.id + '">' + (r.archived ? 'WAKE IT' : 'LET IT REST') + '</button></div>');
  h += '<button class="btn danger" data-a="delRitual" data-id="' + r.id + '">' + (UI.confirm === 'del' + r.id ? 'TAP AGAIN: DELETE ITS WHOLE RECORD' : 'DELETE RITUAL') + '</button>';
  return h;
};

VIEWS.plan = function () {
  const tm = addDays(today(), 1);
  const set = S.errands.filter((e) => e.date === tm && !e.dread);
  const loose = S.errands.filter((e) => !e.date && !e.dread);
  let h = backRow();
  h += win('TOMORROW', (set.length ? set.map((e) => '<div class="row item"><span class="grow">' + esc(e.text) + (e.time ? '<span class="sub">' + esc(e.time) + '</span>' : '') + '</span><button class="lnk dim" data-a="unplan" data-id="' + e.id + '">REMOVE</button></div>').join('') : '<p class="dim small">Nothing yet. Three small things is plenty.</p>') +
    '<div class="inline"><label class="sr" for="p-text">Add for tomorrow</label><input id="p-text" type="text" maxlength="140" placeholder="add for tomorrow" data-bind="p-text" data-enter="planAdd" value="' + esc(fval('p-text')) + '"><input id="p-time" class="timein" type="time" aria-label="Time" data-bind="p-time" value="' + esc(fval('p-time')) + '"><button class="btn" data-a="planAdd">ADD</button></div>');
  if (loose.length) h += win('FROM THE BOARD', loose.map((e) => '<div class="row item"><span class="grow">' + esc(e.text) + '</span><button class="btn" data-a="planMove" data-id="' + e.id + '">TOMORROW</button></div>').join(''));
  return h;
};

/* ---- ARTS ---- */
function renderArts() {
  const arts = [
    ['peek', 'PEEK', 'Two minutes with something you are avoiding.', S.events.filter((e) => e.k === 'peek').length + ' opened'],
    ['prophecy', 'PROPHECY', 'Write down what you fear will happen and how likely it feels. Then check.', (function () { const o = S.prophecies.filter((p) => !p.o).length, j = S.prophecies.length - o; return (o ? o + ' open' : '') + (o && j ? ' · ' : '') + (j ? j + ' judged' : ''); })()],
    ['suppress', 'SUPPRESS', 'Ride out an urge, sit still, or give a short burst to what needs doing.', (function () { const m = Math.floor(S.suppressions.reduce((a, x) => a + (x.spent || 0), 0) / 60); return m ? plural(m, 'minute') : ''; })()],
    ['delves', 'DELVE', 'Climb a fear one floor at a time.', S.delves.length ? plural(S.delves.length, 'delve') : ''],
    ['dispel', 'DISPEL', 'Answer what the inner voice says.', (function () { const c = hexesCaught().length, b = hexesBroken().length, d = hexesDue().length; return [c ? c + ' caught' : '', d ? d + ' to revisit' : '', b ? b + ' broken' : ''].filter(Boolean).join(' · '); })()],
    ['seal', 'SEAL', 'Put a worry in the jar until lantern hour.', sealsReady().length ? sealsReady().length + ' ready' : (sealsWaiting().length ? sealsWaiting().length + ' sealed' : '')],
    ['steady', 'STEADY', 'Two minutes of slow breathing, or a grounding count.', '']
  ];
  let h = win('THE ARTS', arts.map((a) => '<button class="row item" data-a="openView" data-v="' + a[0] + '"><span class="grow">' + a[1] + '<span class="sub">' + a[2] + '</span></span><span class="meta">' + a[3] + '</span></button>').join(''));
  h += win('BESTIARY', BESTIARY.map((b) => '<button class="row item" data-a="openBeast" data-id="' + b.id + '"><span class="grow">' + b.name + '<span class="sub">' + b.plain + '</span></span></button>').join('') +
    FIELD_NOTES.map((n) => '<button class="row item" data-a="openNote" data-id="' + n.id + '"><span class="grow">' + n.name + '<span class="sub">' + n.plain + '</span></span></button>').join(''));
  h += '<button class="row item darkrow" data-a="openView" data-v="dark"><span class="grow">WHEN THE ROAD GOES DARK<span class="sub">If you feel unsafe. Plain language, with numbers to call.</span></span></button>';
  return h;
}

VIEWS.peek = function (v) {
  if (v.phase === 'pick') {
    const chests = S.errands.filter((e) => e.dread);
    const others = S.errands.filter((e) => !e.dread);
    let h = backRow();
    h += win('PEEK', '<p class="nomargin">Pick the thing you are avoiding. You only have to look at it for two minutes.</p>' +
      (chests.length ? '<p class="grouphd">CHESTS</p>' + chests.map((e) => '<button class="row item" data-a="peekStart" data-id="' + e.id + '"><span class="grow">' + esc(e.text) + '</span></button>').join('') : '') +
      (others.length ? '<p class="grouphd">ERRANDS</p>' + others.map((e) => '<button class="row item" data-a="peekStart" data-id="' + e.id + '"><span class="grow">' + esc(e.text) + '</span></button>').join('') : '') +
      '<p class="grouphd">SOMETHING ELSE</p><div class="inline"><label class="sr" for="pk-text">Something else</label><input id="pk-text" type="text" maxlength="140" placeholder="what are you avoiding?" data-bind="pk-text" data-enter="peekFree" value="' + esc(fval('pk-text')) + '"><button class="btn" data-a="peekFree">PEEK</button></div>');
    return h;
  }
  const e = v.id ? S.errands.find((x) => x.id === v.id) : null;
  const text = e ? e.text : v.text;
  const left = v.left == null ? 120 : v.left;
  let h = (v.phase === 'running' || v.phase === 'after' ? '' : backRow('BACK TO CAMP'));
  h += '<pre class="art fg center" aria-hidden="true">' + esc(String.raw`  .--------------------.
 /                      \
|   .----------------.   |
|   |  (o)      (o)  |   |
|   |   VVVVVVVVVV   |   |
|   '----------------'   |
|___________[]___________|`) + '</pre>';
  h += '<div class="center"><p class="dim small spaced">A MIMIC GUARDS</p><h1 class="peekname">' + esc(text) + '</h1></div>';
  const scale = (act, sel, lo, hi) => '<div class="scale">' + Array.from({ length: 11 }, (_, i) => '<button class="sbtn' + (sel === i ? ' on' : '') + '" data-a="' + act + '" data-v="' + i + '" aria-pressed="' + (sel === i) + '">' + i + '</button>').join('') + '</div><div class="scalelbl dim small"><span>' + lo + '</span><span>' + hi + '</span></div>';
  if (v.phase === 'after') {
    h += win('THE CHEST IS OPEN', '<p class="nomargin">You expected it to be ' + v.exp + ' out of 10.</p><p class="lbl">How bad was it, really?</p>' + scale('peekFound', null, 'not at all', 'the worst') +
      '<button class="lnk dim" data-a="peekFound" data-v="">SKIP</button>');
    return h;
  }
  h += win('THE RULE OF THE CHEST', '<p class="nomargin">You only have to look inside. Two minutes. When the sand runs out you may walk away, and it still counts as opened.</p>');
  if (v.phase === 'ready') h += win('BEFORE YOU LIFT THE LID', '<p class="lbl nomargin">How bad do you expect it to be? (optional)</p>' + scale('peekExp', v.exp, 'not at all', 'the worst'));
  h += '<div class="timer" id="peek-timer" role="timer">' + Math.floor(left / 60) + ':' + pad(left % 60) + '</div>';
  if (v.phase === 'ready') h += '<button class="btn solid wide" data-a="peekBegin">BEGIN</button>';
  else h += '<button class="btn wide" data-a="peekClose">' + (v.phase === 'done' ? 'CLOSE THE CHEST' : 'CLOSE IT NOW · STILL COUNTS') + '</button>';
  h += '<button class="lnk dim wide center" data-a="peekNot">NOT TODAY</button>';
  return h;
};

VIEWS.delves = function () {
  let h = backRow();
  h += '<p class="dim">A fear becomes a dungeon. List its floors from easiest to hardest. Before each floor, scout how bad you think it will be. After, write down how bad it was.</p>';
  h += win('YOUR DELVES', (S.delves.length ? S.delves.map((d) => {
    const cleared = d.floors.filter((f) => f.found != null);
    return '<button class="row item" data-a="openDelve" data-id="' + d.id + '"><span class="grow">' + esc(d.name) + '<span class="sub">' + cleared.length + ' of ' + plural(d.floors.length, 'floor') + ' cleared' + (cleared.length ? ' · scouted ' + round1(avg(cleared.map((f) => f.scout))) + ', found ' + round1(avg(cleared.map((f) => f.found))) : '') + '</span></span></button>';
  }).join('') : '<p class="dim small">No delves yet.</p>') +
    '<div class="inline"><label class="sr" for="d-name">New delve</label><input id="d-name" type="text" maxlength="80" placeholder="a fear, e.g. phone calls" data-bind="d-name" data-enter="newDelve" value="' + esc(fval('d-name')) + '"><button class="btn" data-a="newDelve">BEGIN</button></div>');
  return h;
};
VIEWS.delve = function (v) {
  const d = S.delves.find((x) => x.id === v.id);
  if (!d) return backRow() + '<p class="dim">This delve is gone.</p>';
  const cleared = d.floors.filter((f) => f.found != null);
  let h = backRow();
  h += win('DELVE: ' + esc(d.name.toUpperCase()), (d.floors.length ? d.floors.map((f, i) => {
    const res = f.found != null ? f.scout + ' &gt; ' + f.found : f.scout != null ? 'scouted ' + f.scout : '?';
    return '<button class="row item" data-a="openFloor" data-id="' + d.id + '" data-i="' + f.id + '"><span class="mark">F' + (i + 1) + '</span><span class="grow' + (f.found != null ? ' faded' : '') + '">' + esc(f.text) + '</span><span class="meta">' + res + '</span></button>';
  }).join('') : '<p class="dim small">Add floors from easiest (F1) to hardest.</p>') +
    (cleared.length ? '<p class="small">Scouted ' + round1(avg(cleared.map((f) => f.scout))) + ' · found ' + round1(avg(cleared.map((f) => f.found))) + ' (out of 10, across ' + plural(cleared.length, 'floor') + ')</p>' : '') +
    '<div class="inline"><label class="sr" for="fl-text">New floor</label><input id="fl-text" type="text" maxlength="120" placeholder="next floor, a little harder" data-bind="fl-text" data-enter="addFloor" data-id="' + d.id + '" value="' + esc(fval('fl-text')) + '"><button class="btn" data-a="addFloor" data-id="' + d.id + '">ADD</button></div>');
  h += '<button class="btn danger" data-a="delDelve" data-id="' + d.id + '">' + (UI.confirm === 'del' + d.id ? 'TAP AGAIN TO DELETE' : 'DELETE DELVE') + '</button>';
  return h;
};
VIEWS.floor = function (v) {
  const d = S.delves.find((x) => x.id === v.id);
  const f = d && d.floors.find((x) => x.id === v.fid);
  if (!f) return backRow() + '<p class="dim">This floor is gone.</p>';
  const idx = d.floors.indexOf(f) + 1;
  const scale = (act) => '<div class="scale">' + Array.from({ length: 11 }, (_, i) => '<button class="sbtn" data-a="' + act + '" data-v="' + i + '">' + i + '</button>').join('') + '</div><div class="scalelbl dim small"><span>not at all</span><span>the worst</span></div>';
  let h = backRow();
  const pr = f.pid ? S.prophecies.find((p) => p.id === f.pid) : null;
  let body = '<p class="nomargin">' + esc(f.text) + '</p>';
  if (f.scout == null) {
    body += '<label class="lbl" for="fl-proph">What does the Banshee predict will happen? (optional)</label><textarea id="fl-proph" rows="2" maxlength="300" data-bind="fl-proph" placeholder="e.g. my voice will shake and they will laugh">' + esc(fval('fl-proph')) + '</textarea>' +
      '<label class="lbl" for="fl-p">How likely does it feel? <output id="o-flp">' + fval('fl-p', 50) + '</output>%</label><input id="fl-p" type="range" min="0" max="100" step="5" data-bind="fl-p" data-out="o-flp" value="' + fval('fl-p', 50) + '">' +
      '<p class="lbl">SCOUT: how bad do you expect it to be?</p>' + scale('scout');
  } else if (f.found == null) {
    const o = fval('fl-o', ''), ck = fval('fl-charm', false);
    body += '<p class="small">You scouted it at ' + f.scout + ' out of 10.</p>';
    if (pr && !pr.o) {
      body += '<p class="small">The Banshee predicted: "' + esc(pr.text) + '" (' + pr.p + '%).</p><p class="lbl">Did it come true?</p><div class="seg" role="group" aria-label="Did it come true">' +
        [['no', 'NO'], ['partly', 'PARTLY'], ['yes', 'YES']].map((x) => '<button class="segb' + (o === x[0] ? ' on' : '') + '" data-a="setForm" data-k="fl-o" data-v="' + x[0] + '" aria-pressed="' + (o === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
        '<button class="row lnk wide" data-a="setForm" data-k="fl-charm" data-v="' + (!ck) + '" aria-pressed="' + !!ck + '"><span class="mark">' + (ck ? '[x]' : '[ ]') + '</span><span class="grow small">I used a safety charm</span></button>';
    }
    body += '<p class="lbl">Done it? How bad was it, really?</p>' + scale('found') + '<button class="lnk dim" data-a="rescout">SCOUT AGAIN</button>';
  } else {
    body += '<p>Scouted ' + f.scout + '. Found ' + f.found + '.' + (f.found < f.scout ? ' The fear was ' + (f.scout - f.found) + ' bigger than the floor.' : f.found === f.scout ? ' Exactly as expected.' : ' Harder than expected, and you did it anyway.') + '</p>';
    if (pr) body += '<p class="small">' + (pr.o ? 'The prophecy ' + PROPHECY_OUTCOMES[pr.o] + '. You had given it ' + pr.p + '%.' : 'Its prophecy is waiting to be judged under PROPHECY.') + '</p>';
  }
  h += win('F' + idx + ' · ' + esc(d.name.toUpperCase()), body);
  h += '<button class="btn danger" data-a="delFloor" data-id="' + d.id + '" data-i="' + f.id + '">' + (UI.confirm === 'del' + f.id ? 'TAP AGAIN TO DELETE' : 'DELETE FLOOR') + '</button>';
  return h;
};

VIEWS.suppress = function (v) {
  const a = S.active;
  if (a && !a.stopped && v.phase !== 'done') v.phase = 'running';
  if (a && a.stopped && v.phase !== 'done') v.phase = 'after';
  if (v.phase === 'running' && a) {
    const lines = {
      urge: 'Ride it out. Urges rise, peak and fall like a wave, usually within minutes. You do not have to fight it. Only do not act on it yet.',
      still: 'Breathe normally. When the mind wanders, notice where it went, and come back. Coming back is the practice.',
      burst: 'Only this, and only for ' + Math.round(a.dur / 60) + ' minutes. When the sand runs out you may stop, and it counts.'
    };
    return '<div class="center"><p class="dim small spaced">' + SUPPRESS_MODES[a.mode].label + '</p>' + (a.label ? '<h1 class="peekname">' + esc(a.label) + '</h1>' : '') + '</div>' +
      '<pre class="art fg center" aria-hidden="true">' + esc(MANA_ART.replace(/^\n/, '')) + '</pre>' +
      '<div class="timer" id="sup-timer" role="timer">' + fmtClock(a.dur - supElapsed()) + '</div>' +
      '<p class="center">' + lines[a.mode] + '</p>' +
      '<button class="btn wide" data-a="supStop">STOP NOW · THE MINUTES SO FAR COUNT</button>' +
      '<button class="lnk dim wide center" data-a="supDiscard">' + (UI.confirm === 'supdiscard' ? 'TAP AGAIN: DISCARD THIS SESSION' : 'DISCARD, IT WAS STARTED BY MISTAKE') + '</button>';
  }
  if (v.phase === 'after' && a) {
    const spent = supElapsed();
    let body = '<p class="nomargin">' + cap(minutesText(spent)) + (a.label ? ': ' + esc(a.label) : '') + '.</p>';
    if (a.mode === 'urge') {
      const af = fval('su-after', '');
      body += '<p class="lbl">How strong is the urge now?</p><div class="scale">' + Array.from({ length: 11 }, (_, i) => '<button class="sbtn' + (String(af) === String(i) ? ' on' : '') + '" data-a="setForm" data-k="su-after" data-v="' + i + '" aria-pressed="' + (String(af) === String(i)) + '">' + i + '</button>').join('') + '</div><div class="scalelbl dim small"><span>gone</span><span>overwhelming</span></div>' +
        (a.before != null ? '<p class="dim small">It started at ' + a.before + '.</p>' : '') +
        '<div class="btns"><button class="btn solid" data-a="supFinish" data-v="held">I HELD</button><button class="btn" data-a="supFinish" data-v="gave">IT WON THIS TIME</button></div>';
    } else {
      const e = a.eid ? S.errands.find((x) => x.id === a.eid) : null;
      body += e ? '<p class="lbl">Is the errand finished?</p><div class="btns"><button class="btn solid" data-a="supFinish" data-v="errandDone">FINISHED</button><button class="btn" data-a="supFinish" data-v="notyet">NOT YET</button></div>'
        : '<p class="small">Stop here, or keep going on your own. Either way, it counts.</p><button class="btn solid wide" data-a="supFinish" data-v="done">DONE</button>';
    }
    return win('SUPPRESS', body);
  }
  if (v.phase === 'done') {
    const rec = S.suppressions.find((x) => x.id === v.rec);
    return backRow() + win('SUPPRESS', '<p class="nomargin">' + (rec ? cap(minutesText(rec.spent)) + ' on the record. Every 10 minutes of suppression adds one to your mana.' : 'Done.') + '</p><p class="dim small">It stays hidden until the next release.</p><div class="btns"><button class="btn" data-a="supAgain">AGAIN</button><button class="btn" data-a="back">BACK</button></div>');
  }
  const mode = fval('su-mode', 'urge');
  const M = SUPPRESS_MODES[mode];
  const dur = Number(fval('su-dur', M.def));
  let body = '<div class="seg" role="group" aria-label="Kind">' + Object.keys(SUPPRESS_MODES).map((k) => '<button class="segb' + (mode === k ? ' on' : '') + '" data-a="supMode" data-v="' + k + '" aria-pressed="' + (mode === k) + '">' + SUPPRESS_MODES[k].label + '</button>').join('') + '</div>';
  if (mode === 'urge') {
    const bf = fval('su-before', '');
    body += '<label class="lbl" for="su-label">What is the urge? (optional)</label><input id="su-label" type="text" maxlength="100" placeholder="e.g. scroll the phone" data-bind="su-label" value="' + esc(fval('su-label')) + '">' +
      '<p class="lbl">How strong is it right now?</p><div class="scale">' + Array.from({ length: 11 }, (_, i) => '<button class="sbtn' + (String(bf) === String(i) ? ' on' : '') + '" data-a="setForm" data-k="su-before" data-v="' + i + '" aria-pressed="' + (String(bf) === String(i)) + '">' + i + '</button>').join('') + '</div><div class="scalelbl dim small"><span>faint</span><span>overwhelming</span></div>';
  } else if (mode === 'still') {
    body += '<p class="small">Sit somewhere. Breathe normally. When the mind wanders, notice where it went and come back to the breath.</p>';
  } else {
    const eid = fval('su-eid', '');
    const errs = S.errands.slice(0, 8);
    body += '<label class="lbl" for="su-label">What needs doing?</label><input id="su-label" type="text" maxlength="100" placeholder="e.g. declutter the desk" data-bind="su-label" value="' + esc(fval('su-label')) + '">' +
      (errs.length ? '<p class="lbl">Or give the time to an errand</p>' + errs.map((e) => '<button class="row item" data-a="supPick" data-id="' + e.id + '" aria-pressed="' + (eid === e.id) + '"><span class="mark">' + (eid === e.id ? '&gt;' : '') + '</span><span class="grow">' + esc(e.text) + '</span></button>').join('') : '') +
      '<p class="dim small">Not the whole job. Only the minutes below.</p>';
  }
  body += '<p class="lbl">For how long?</p><div class="seg" role="group" aria-label="Minutes">' + M.durs.map((d) => '<button class="segb' + (dur === d ? ' on' : '') + '" data-a="setForm" data-k="su-dur" data-v="' + d + '" aria-pressed="' + (dur === d) + '">' + d + ' MIN</button>').join('') + '</div>' +
    '<button class="btn solid wide" data-a="supBegin">BEGIN</button>';
  let h = backRow();
  h += '<p class="dim">Hold back an urge, quiet the mind, or give a short, bounded burst to something that needs doing. Every 10 minutes add one to your mana.</p>';
  h += win('SUPPRESS', body);
  const recent = S.suppressions.slice().reverse().slice(0, 20);
  if (recent.length) {
    const urges = S.suppressions.filter((x) => x.mode === 'urge' && x.held != null);
    const drops = urges.filter((x) => x.before != null && x.after != null);
    h += win('SO FAR', '<p class="small">' + cap(minutesText(S.suppressions.reduce((acc, x) => acc + (x.spent || 0), 0))) + ' in all.' + (urges.length ? ' Urges held: ' + urges.filter((x) => x.held).length + ' of ' + urges.length + '.' : '') + (drops.length ? ' On average an urge fell from ' + round1(avg(drops.map((x) => x.before))) + ' to ' + round1(avg(drops.map((x) => x.after))) + '.' : '') + '</p>' +
      recent.map((x) => '<div class="row tight"><span class="grow">' + SUPPRESS_MODES[x.mode].label.toLowerCase() + (x.label ? ': ' + esc(x.label) : '') + '<span class="sub">' + fmtDate(x.d) + (x.mode === 'urge' && x.before != null ? ' · ' + x.before + (x.after != null ? ' &gt; ' + x.after : '') : '') + (x.held === true ? ' · held' : x.held === false ? ' · it won' : '') + '</span></span><span class="meta">' + Math.floor(x.spent / 60) + ' min</span></div>').join(''));
  }
  return h;
};

VIEWS.prophecy = function () {
  const open = S.prophecies.filter((p) => !p.o).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.t - b.t);
  const judged = S.prophecies.filter((p) => p.o).slice().sort((a, b) => (b.judged || '').localeCompare(a.judged || '') || b.t - a.t).slice(0, 30);
  const srcLabel = prophecyOrigin;
  let h = backRow();
  h += '<p class="dim">The Banshee makes prophecies. Write one down with how likely it feels, then check what actually happened. Over time, the gap between the two is the finding.</p>';
  h += win('NEW PROPHECY',
    '<label class="lbl" for="pr-text">What does the Banshee say will happen?</label><textarea id="pr-text" rows="2" maxlength="300" data-bind="pr-text" placeholder="e.g. they will be annoyed and say no">' + esc(fval('pr-text')) + '</textarea>' +
    '<label class="lbl" for="pr-p">How likely does it feel? <output id="o-prp">' + fval('pr-p', 50) + '</output>%</label><input id="pr-p" type="range" min="0" max="100" step="5" data-bind="pr-p" data-out="o-prp" value="' + fval('pr-p', 50) + '">' +
    '<label class="lbl" for="pr-due">When will you know? (optional; otherwise in a week)</label><input id="pr-due" type="date" data-bind="pr-due" value="' + esc(fval('pr-due')) + '">' +
    '<button class="btn solid wide" data-a="newProphecy">WRITE IT DOWN</button>');
  if (open.length) {
    h += win('TO JUDGE', open.map((p) => {
      const ck = fval('pc-' + p.id, false);
      return '<div class="entry"><p class="nomargin">"' + esc(p.text) + '"</p><p class="sub">' + p.p + '% · ' + srcLabel(p) + 'written ' + fmtDate(p.d) + (p.due ? ' · know by ' + fmtDate(p.due) : '') + '</p>' +
        '<button class="row lnk wide" data-a="setForm" data-k="pc-' + p.id + '" data-v="' + (!ck) + '" aria-pressed="' + !!ck + '"><span class="mark">' + (ck ? '[x]' : '[ ]') + '</span><span class="grow small">I used a safety charm</span></button>' +
        '<div class="btns"><button class="btn" data-a="judge" data-id="' + p.id + '" data-v="no">DID NOT HAPPEN</button><button class="btn" data-a="judge" data-id="' + p.id + '" data-v="partly">PARTLY</button><button class="btn" data-a="judge" data-id="' + p.id + '" data-v="yes">HAPPENED</button></div>' +
        '<button class="lnk dim small" data-a="dropProphecy" data-id="' + p.id + '">' + (UI.confirm === 'drop' + p.id ? 'TAP AGAIN TO REMOVE' : 'REMOVE') + '</button></div>';
    }).join('') + '<p class="dim small">A safety charm is anything done only to feel safe: over-preparing, rehearsing lines, avoiding eye contact, bringing someone along. It weakens what the outcome can teach, so it is noted.</p>');
  }
  h += win('THE BANSHEE\'S RECORD', prophecyRecord());
  if (judged.length) h += win('JUDGED', judged.map((p) => '<div class="entry"><p class="nomargin">"' + esc(p.text) + '"</p><p class="sub">' + prophecyOrigin(p) + 'you gave it ' + p.p + '% · ' + PROPHECY_OUTCOMES[p.o] + (p.charm ? ' · charm used' : '') + ' · ' + fmtDate(p.judged) + '</p></div>').join(''));
  return h;
};

VIEWS.dispel = function () {
  const hex = fval('dz-hex', '');
  const words = fval('dz-words');
  let h = backRow();
  h += '<p class="dim">The Doppelganger speaks in your voice. Write down its exact words, name the hex, and answer it as an old companion would. If you are too deep in it to answer, catch it now and answer later.</p>';
  h += win('DISPEL',
    '<label class="lbl" for="dz-words">What does it say?</label><textarea id="dz-words" rows="2" maxlength="300" data-bind="dz-words" placeholder="in its exact words">' + esc(words) + '</textarea>' +
    '<p class="lbl">Which hex is it?</p><div class="hexes">' + HEXES.map((x) => '<button class="hexb' + (hex === x.id ? ' on' : '') + '" data-a="setForm" data-k="dz-hex" data-v="' + x.id + '" aria-pressed="' + (hex === x.id) + '">' + x.name + '<span class="sub">' + esc(x.says) + '</span></button>').join('') + '</div>' +
    '<label class="lbl" for="dz-before">How true does it feel right now? <output id="o-before">' + fval('dz-before', 70) + '</output></label><input id="dz-before" type="range" min="0" max="100" step="5" data-bind="dz-before" data-out="o-before" value="' + fval('dz-before', 70) + '">' +
    hexTestFields('dz', hex, words, fval('dz-before', 70)) +
    '<label class="lbl" for="dz-answer">What would a companion who has walked beside you for years say?</label><textarea id="dz-answer" rows="3" maxlength="500" data-bind="dz-answer" placeholder="accurate and warm, not flattering">' + esc(fval('dz-answer')) + '</textarea>' +
    '<label class="lbl" for="dz-after">And now, how true does it feel? <output id="o-after">' + fval('dz-after', 50) + '</output></label><input id="dz-after" type="range" min="0" max="100" step="5" data-bind="dz-after" data-out="o-after" value="' + fval('dz-after', 50) + '">' +
    revisitSeg('dz-rv', 3) +
    '<button class="btn solid wide" data-a="saveDispel" data-v="break">BREAK THE HEX</button>' +
    '<button class="btn wide" data-a="saveDispel" data-v="catch">CATCH IT, ANSWER LATER</button>' +
    '<p class="dim small">Catching keeps its words and how true it felt. The answer can wait for a calmer hour.</p>');
  const caught = hexesCaught().slice().reverse();
  const due = hexesDue();
  const row = (x, sub) => '<button class="row item" data-a="openHex" data-id="' + x.id + '"><span class="grow">"' + esc(x.words) + '"<span class="sub">' + sub + '</span></span></button>';
  if (due.length) h += win('TO REVISIT', due.map((x) => row(x, 'broken ' + fmtDate(x.ad) + (hexName(x) ? ' · ' + hexName(x) : '') + ' · ' + hexTrail(x))).join(''));
  if (caught.length) h += win('CAUGHT, NOT YET ANSWERED', caught.map((x) => row(x, 'caught ' + fmtDate(x.d) + (hexName(x) ? ' · ' + hexName(x) : '') + ' · felt ' + x.before + ' true')).join(''));
  const broken = hexesBroken().filter((x) => !due.includes(x)).sort((a, b) => (b.ad || '').localeCompare(a.ad || '') || b.t - a.t).slice(0, 30);
  if (broken.length) h += win('BROKEN HEXES', broken.map((x) => row(x, fmtDate(x.ad) + (hexName(x) ? ' · ' + hexName(x) : '') + ' · ' + hexTrail(x) + (x.later == null && x.due ? ' · look again ' + fmtDate(x.due) : ''))).join('') +
    '<p class="dim small">Numbers read: how true it felt when caught &gt; right after answering &gt; when you looked again.</p>');
  return h;
};
VIEWS.hex = function (v) {
  const x = S.dispels.find((d) => d.id === v.id);
  if (!x) return backRow() + '<p class="dim">This hex is gone.</p>';
  const t = today();
  let h = backRow();
  let body = '<p class="bigline nomargin">"' + esc(x.words) + '"</p><p class="sub">' + (hexName(x) ? hexName(x) + ' · ' : '') + 'caught ' + fmtDate(x.d) + ' · felt ' + x.before + ' true</p>';
  const pr = x.pid ? S.prophecies.find((p) => p.id === x.pid) : null;
  if (x.after == null) {
    body += hexTestFields('hx', x.hex, x.words, x.before) +
      '<label class="lbl" for="hx-answer">What would a companion who has walked beside you for years say?</label><textarea id="hx-answer" rows="3" maxlength="500" data-bind="hx-answer" placeholder="accurate and warm, not flattering">' + esc(fval('hx-answer', x.answer || '')) + '</textarea>' +
      '<label class="lbl" for="hx-after">And now, how true does it feel? <output id="o-hxafter">' + fval('hx-after', 50) + '</output></label><input id="hx-after" type="range" min="0" max="100" step="5" data-bind="hx-after" data-out="o-hxafter" value="' + fval('hx-after', 50) + '">' +
      revisitSeg('hx-rv', x.rv != null ? x.rv : 3) +
      '<button class="btn solid wide" data-a="answerHex" data-id="' + x.id + '">BREAK THE HEX</button>' +
      '<button class="lnk dim small" data-a="dropHex" data-id="' + x.id + '">' + (UI.confirm === 'drophex' + x.id ? 'TAP AGAIN TO REMOVE' : 'REMOVE, IT WAS A MISTAKE') + '</button>';
  } else {
    body += '<p class="lbl">THE ANSWER</p><p>' + (x.answer ? esc(x.answer) : '<span class="dim">no answer written</span>') + '</p>' +
      '<p class="small">Broken ' + fmtDate(x.ad) + ': ' + x.before + ' &gt; ' + x.after + '.' + (x.later != null ? ' Looked at again ' + fmtDate(x.ld) + ': ' + x.later + '.' : '') + '</p>';
    if (x.later != null) body += '<p>' + hexVerdict(x) + '</p>';
    else if (x.due && x.due <= t) {
      body += '<label class="lbl" for="hx-later">Looking at it again: how true does it feel now? <output id="o-hxlater">' + fval('hx-later', x.after) + '</output></label><input id="hx-later" type="range" min="0" max="100" step="5" data-bind="hx-later" data-out="o-hxlater" value="' + fval('hx-later', x.after) + '">' +
        '<p class="dim small">Rate what you feel, not what you think you should feel. A hex that comes back is useful to know about.</p>' +
        '<button class="btn solid wide" data-a="revisitHex" data-id="' + x.id + '">RECORD IT</button>' +
        '<button class="lnk dim small" data-a="skipRevisit" data-id="' + x.id + '">SKIP THIS REVISIT</button>';
    } else if (x.due) body += '<p class="dim small">You will look at it again on ' + fmtDate(x.due) + '.</p><button class="lnk dim small" data-a="skipRevisit" data-id="' + x.id + '">NO REVISIT FOR THIS ONE</button>';
  }
  if (pr) body += '<p class="small">Tested as a prophecy: "' + esc(pr.text) + '" (' + pr.p + '%). ' + (pr.o ? 'It ' + PROPHECY_OUTCOMES[pr.o] + '.' : 'Judge it under PROPHECY' + (pr.due ? ' from ' + fmtDate(pr.due) : '') + '.') + '</p>';
  h += win('HEX', body);
  return h;
};

function sealProphecy(x) { return S.prophecies.find((p) => p.src === 'seal' && p.ref === x.id) || null; }
function prophecyBrief(pr) { return 'its prophecy: ' + pr.p + '%' + (pr.o ? ', ' + PROPHECY_OUTCOMES[pr.o] : pr.due ? ', to judge ' + (pr.due <= today() ? 'now' : 'on ' + fmtDate(pr.due)) : ''); }
VIEWS.seal = function () {
  const ready = sealsReady(), waiting = sealsWaiting();
  const reviewed = S.seals.filter((x) => x.status !== 'sealed');
  const faded = reviewed.filter((x) => x.status === 'dissolved');
  let h = backRow();
  h += '<p class="dim">Write the worry down and seal it. The jar opens at lantern hour (' + esc(S.settings.lantern) + '). Until then, the worry can wait. Sealing limits the worrying; whether the feared thing actually happens is a question for PROPHECY.</p>';
  const track = fval('s-track', false);
  h += win('SEAL A WORRY', '<label class="sr" for="s-text">Worry</label><textarea id="s-text" rows="2" maxlength="400" data-bind="s-text" placeholder="what is the worry?">' + esc(fval('s-text')) + '</textarea>' +
    '<button class="row lnk wide" data-a="setForm" data-k="s-track" data-v="' + (!track) + '" aria-pressed="' + !!track + '"><span class="mark">' + (track ? '[x]' : '[ ]') + '</span><span class="grow small">Does this worry predict something that will or will not happen? Record it as a prophecy too, and check later.</span></button>' +
    (track ? '<label class="lbl" for="s-p">How likely does it feel? <output id="o-sp">' + fval('s-p', 50) + '</output>%</label><input id="s-p" type="range" min="0" max="100" step="5" data-bind="s-p" data-out="o-sp" value="' + fval('s-p', 50) + '">' +
      '<label class="lbl" for="s-due">When will you know? (optional; otherwise in a week)</label><input id="s-due" type="date" data-bind="s-due" value="' + esc(fval('s-due')) + '">' : '') +
    '<button class="btn solid wide" data-a="sealIt">SEAL IT</button>' +
    '<p class="dim small">' + (waiting.length ? plural(waiting.length, 'worry', 'worries') + ' sealed, waiting for lantern hour.' : 'The jar is empty.') + '</p>');
  if (ready.length) {
    h += win('THE JAR IS OPEN', ready.map((x) => { const pr = sealProphecy(x); return '<div class="entry"><p class="nomargin">' + esc(x.text) + '</p><p class="sub">sealed ' + fmtDate(x.d || dkey(new Date(x.t))) + (pr ? ' · ' + prophecyBrief(pr) : '') + '</p><div class="btns"><button class="btn" data-a="sealKeep" data-id="' + x.id + '" data-v="errand">STILL MATTERS: ERRAND</button><button class="btn" data-a="sealKeep" data-id="' + x.id + '" data-v="delve">MAKE IT A DELVE</button><button class="btn solid" data-a="sealDissolve" data-id="' + x.id + '">FADED</button></div></div>'; }).join('') +
      '<p class="dim small">FADED: it no longer feels pressing. That is not the same as "it did not happen"; a worry recorded as a prophecy is still judged on its own day.</p>');
  }
  if (reviewed.length) {
    h += win('LATELY', '<p class="small">' + plural(reviewed.length, 'worry', 'worries') + ' looked at so far. ' + faded.length + ' had faded by lantern hour (' + pct(faded.length / reviewed.length) + ').</p>' +
      reviewed.slice().sort((a, b) => (b.reviewed || 0) - (a.reviewed || 0)).slice(0, 10).map((x) => { const pr = sealProphecy(x); return '<div class="row tight"><span class="grow">' + esc(x.text) + '<span class="sub">' + (x.status === 'dissolved' ? 'faded' : 'still mattered') + (x.reviewed ? ' ' + fmtDate(dkey(new Date(x.reviewed))) : '') + (pr ? ' · ' + prophecyBrief(pr) : '') + '</span></span></div>'; }).join(''));
  }
  return h;
};

VIEWS.steady = function (v) {
  let h = v.running ? '' : backRow();
  if (v.mode === 'ground') {
    const steps = ['Name five things you can see.', 'Name four things you can touch.', 'Name three things you can hear.', 'Name two things you can smell.', 'Name one thing you can taste, or one thing you like about this moment.'];
    const i = v.step || 0;
    h += win('GROUNDING · ' + (i + 1) + ' OF 5', '<p class="bigline">' + steps[i] + '</p><p class="dim small">Say them out loud or in your head. Take your time.</p><button class="btn solid wide" data-a="groundNext">' + (i < 4 ? 'NEXT' : 'DONE') + '</button>');
    return h;
  }
  if (!v.running && !v.done) {
    h += '<p class="dim">Gather your mana. Breathe in while the ring grows, for four seconds, and out while it shrinks, for six. About six breaths a minute, for two minutes.</p>';
    h += '<button class="btn solid wide" data-a="breatheBegin">BEGIN BREATHING · 2 MIN</button>';
    h += '<button class="btn wide" data-a="groundBegin">GROUNDING COUNT · 5 4 3 2 1</button>';
    return h;
  }
  if (v.done) return h + win('STEADY', '<p class="nomargin">Two minutes of slow breath, done.</p><button class="btn wide" data-a="back">BACK</button>');
  h += '<div class="breath"><pre class="art fg ring" id="ring" aria-hidden="true">' + esc(RING_ART.replace(/^\n/, '')) + '</pre></div>';
  h += '<p class="center bigline" id="breath-phase">IN</p><p class="center dim" id="breath-left">2:00</p>';
  h += '<button class="lnk dim wide center" data-a="breatheStop">STOP</button>';
  return h;
};

VIEWS.beast = function (v) {
  const b = BESTIARY.find((x) => x.id === v.id);
  if (!b) return backRow();
  return backRow() + win(b.name, '<p class="sub top">' + esc(b.plain) + '</p><p class="lure">' + esc(b.lure) + '</p>' +
    '<p class="lbl">HOW IT FEEDS</p><p>' + esc(b.feeds) + '</p>' +
    '<p class="lbl">HOW IT IS FOUGHT</p><p>' + esc(b.fought) + '</p>' +
    '<p class="lbl">ART</p><p>' + esc(b.art) + '</p>' +
    '<p class="lbl">SCHOLARS\' NOTE</p><p class="dim small">' + esc(b.note) + '</p>');
};
VIEWS.note = function (v) {
  const n = FIELD_NOTES.find((x) => x.id === v.id);
  if (!n) return backRow();
  let body = '<p class="sub top">' + esc(n.plain) + '</p>' + n.body.map((p) => '<p>' + esc(p) + '</p>').join('');
  if (n.id === 'hexes') body += HEXES.map((x) => '<div class="entry"><p class="nomargin">' + x.name + '</p><p class="small">"' + esc(x.says) + '"</p><p class="sub">' + esc(x.plain) + '</p></div>').join('');
  body += '<p class="lbl">SCHOLARS\' NOTE</p><p class="dim small">' + esc(n.note) + '</p>';
  return backRow() + win(n.name, body);
};
VIEWS.dark = function () {
  return backRow() + '<div class="plainpage"><h1>' + DARK_PAGE.title.charAt(0) + DARK_PAGE.title.slice(1).toLowerCase() + '</h1><p>' + DARK_PAGE.intro + '</p>' +
    DARK_PAGE.lines.map((l) => '<p>' + esc(l) + '</p>').join('') +
    DARK_PAGE.contacts.map((c) => '<div class="contact"><span>' + esc(c.label) + '</span><a class="num" href="tel:' + c.number.replace(/\s/g, '') + '">' + esc(c.number) + '</a></div>').join('') +
    '<ul>' + DARK_PAGE.more.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul></div>';
};

/* ---- GRIMOIRE ---- */
function renderGrimoire() {
  const learned = S.rituals.filter((r) => Object.keys(r.casts).length >= 10);
  let h = renderMana();
  h += win('LEARNED', learned.length ? learned.map((r) => {
    const st = ritualStats(r);
    return '<button class="row item" data-a="openRitual" data-id="' + r.id + '"><span class="mark">*</span><span class="grow">' + esc(r.spellName || r.name) + '<span class="sub">' + esc(r.name) + ' · ' + rankOf(st.total).toLowerCase() + ' · cast ' + st.total + ' · longest flame ' + st.longest + '</span></span></button>';
  }).join('') : '<p class="dim small">A ritual enters the Grimoire once you have cast it 10 times, in any order and over any stretch of time.</p>');
  const sp = S.spells;
  const counts = { l: 0, r: 0, u: 0, c: 0 };
  sp.forEach((s) => { counts[s.r]++; });
  const filt = UI.filter;
  const list = sp.filter((s) => filt === 'all' || s.r === filt).slice().reverse();
  h += win('FOUND · ' + sp.length,
    (sp.length ? '<p class="small">' + ['l', 'r', 'u', 'c'].map((k) => counts[k] + ' ' + RARITY[k].toLowerCase()).join(' · ') + '</p>' +
      '<div class="seg small" role="group" aria-label="Filter">' + [['all', 'ALL'], ['l', 'LEGEND'], ['r', 'RARE'], ['u', 'UNCOM'], ['c', 'COMMON']].map((f) => '<button class="segb' + (filt === f[0] ? ' on' : '') + '" data-a="filter" data-v="' + f[0] + '" aria-pressed="' + (filt === f[0]) + '">' + f[1] + '</button>').join('') + '</div>' +
      list.map((s) => '<div class="entry spell r-' + s.r + '"><p class="nomargin">' + esc(s.n) + '</p><p class="small">' + esc(s.e) + '</p><p class="sub">' + RARITY[s.r] + ' · ' + fmtDate(s.d) + (s.reg ? ' · ' + esc(s.reg) : '') + ' · ' + (SOURCE_LABEL[s.src] || '') + '</p></div>').join('')
      : '<p class="dim small">No spells yet. Useless, specific little spells turn up as you travel, most often when you face something hard: a chest, a delve floor, a broken hex.</p>'));
  return h;
}

/* ---- ROAD ---- */
function renderRoad() {
  const P = currentPlace();
  const reg = P.region;
  const art = (TERRAINS[reg.t] || TERRAINS.ruins).art.replace(/^\n/, '').replace(/\n$/, '');
  const span = reg.len;
  const pos = Math.max(0, P.off);
  const cells = 24;
  const at = Math.round((pos / span) * (cells - 1));
  let road = '';
  for (let i = 0; i < cells; i++) road += i < at ? '=' : i === at ? '@' : '-';
  const toNext = span - pos + 1;
  let h = win(esc(reg.name.toUpperCase()),
    '<pre class="art" aria-hidden="true">' + esc(art) + '</pre>' +
    '<p class="small dim">' + (TERRAINS[reg.t] ? TERRAINS[reg.t].label : '') + '</p>' +
    '<p>' + esc(reg.d) + '</p>' +
    '<pre class="art roadline" aria-hidden="true">' + road.replace('@', '<b>@</b>') + ' ?</pre>' +
    '<p class="small">' + (P.L === 0 ? 'You stand at the gate. The first thing you do on any day is the first league.' : 'League ' + pos + ' of ' + span + ' in this region. Next: ' + esc(P.next.name) + ', in ' + plural(toNext, 'league') + '.') + '</p>');
  h += '<div class="leagues"><span class="bignum">' + P.L + '</span><span>LEAGUES WALKED</span></div><p class="small">' + (todayCounts() ? 'Today\'s league is waiting. It is walked when the day ends, if something is still on the record.' : 'Nothing is on the record for today yet.') + '</p><p class="dim small">A league is walked for each day that ends with something done still on the record. Undone actions do not count, and neither does only writing down plans. The road never gets shorter.</p>';

  const crossed = S.journey.plan.filter((r) => r.entered);
  if (crossed.length > 1) h += win('THE ROAD BEHIND', crossed.slice().reverse().map((r) => '<div class="row tight"><span class="grow">' + esc(r.name) + '</span><span class="meta">' + fmtDate(r.entered) + '</span></div>').join(''));

  h += win('LAST 12 WEEKS', heatmap() + '<p class="dim small">Tap a square to open that day.</p>');
  h += win('THE WHOLE JOURNEY', calendarHtml());

  const started = daysBetween(S.created, today());
  const casts = weeklySeries((s) => weekStats(s).casts, 12);
  const errs = weeklySeries((s) => weekStats(s).errands, 12);
  const sky = weeklySeries((s) => { let n = 0; for (let i = 0; i < 7; i++) { const d = S.days[addDays(s, i)]; if (d && d.w != null && d.w <= 1) n++; } return n; }, 12);
  const compare = (arr, unit) => started >= 56 ? '<p class="small">First four weeks shown: ' + round1(avg(arr.slice(0, 4))) + ' ' + unit + '. Latest four: ' + round1(avg(arr.slice(8))) + '.</p>' : '<p class="dim small">Comparisons appear after eight weeks on the road.</p>';
  h += win('RITUALS CAST, PER WEEK', bars(casts) + compare(casts, 'a week'));
  h += win('ERRANDS DONE, PER WEEK', bars(errs) + compare(errs, 'a week'));
  h += stepsWindow(started);
  h += weightWindow();
  h += win('CLEAR SKIES, PER WEEK', bars(sky, 7) + '<p class="dim small">Days a week with clear or fair inner weather.</p>');

  const floors = S.events.filter((e) => e.k === 'floor');
  const peeks = S.events.filter((e) => e.k === 'peek');
  const reviews = S.events.filter((e) => e.k === 'review');
  const waits = peeks.filter((p) => p.wait != null).map((p) => p.wait);
  const hexCount = {};
  S.dispels.forEach((d) => { if (d.hex) hexCount[d.hex] = (hexCount[d.hex] || 0) + 1; });
  const topHex = Object.keys(hexCount).sort((a, b) => hexCount[b] - hexCount[a])[0];
  const artsRows = [
    ['Delve floors cleared', floors.length ? floors.length + ' · scouted ' + round1(avg(floors.map((f) => f.scout))) + ', found ' + round1(avg(floors.map((f) => f.found))) : 'none yet'],
    ['Chests opened', (function () { if (!peeks.length) return 'none yet'; const pairs = peeks.filter((x) => x.exp != null && x.found != null); return peeks.length + (waits.length ? ' · usual wait ' + round1(avg(waits)) + ' days' : '') + (pairs.length ? ' · expected ' + round1(avg(pairs.map((x) => x.exp))) + ', found ' + round1(avg(pairs.map((x) => x.found))) : ''); })()],
    ['Hexes broken', (function () { const bs = hexesBroken(); return bs.length ? bs.length + ' · belief ' + Math.round(avg(bs.map((d) => d.before))) + ' > ' + Math.round(avg(bs.map((d) => d.after))) + (topHex ? ' · most often ' + HEXES.find((x) => x.id === topHex).name.toLowerCase() : '') : 'none yet'; })()],
    ['Suppression', (function () { const xs = S.suppressions; if (!xs.length) return 'none yet'; const urges = xs.filter((x) => x.mode === 'urge' && x.held != null); return minutesText(xs.reduce((a, x) => a + (x.spent || 0), 0)) + (urges.length ? ' · urges held ' + urges.filter((x) => x.held).length + ' of ' + urges.length : ''); })()],
    ['Prophecies judged', (function () { const ps = prophecyStats(); return ps.n ? ps.n + ' · sure ' + pct(ps.pred) + ', came true ' + pct(ps.act) : 'none yet'; })()],
    ['Worries reviewed', reviews.length ? reviews.length + ' · ' + pct(reviews.filter((r) => r.res === 'dissolved').length / reviews.length) + ' faded' : 'none yet']
  ];
  h += win('THE ARTS, SO FAR', artsRows.map((r) => '<div class="row tight"><span class="grow">' + r[0] + '</span><span class="meta">' + r[1] + '</span></div>').join(''));

  if (S.prophecies.some((p) => p.o)) h += win('THE BANSHEE\'S RECORD', prophecyRecord());
  const hr = hexRecord();
  if (hr) h += win('THE DOPPELGANGER\'S RECORD', hr);

  const obs = observations();
  h += win('OBSERVATIONS', obs.list.length ? obs.list.map((s) => '<p>&gt; ' + esc(s) + '</p>').join('') + '<p class="dim small">Patterns, not causes. Read them as hints.</p>' : '<p class="dim small">' + (obs.need ? 'Observations appear once you have logged your inner weather on 20 days. ' + plural(obs.need, 'day') + ' to go.' : 'No clear patterns yet.') + '</p>');

  const echoes = [[30, 'A MONTH AGO'], [90, 'THREE MONTHS AGO'], [365, 'A YEAR AGO']].map((o) => { const d = S.days[addDays(today(), -o[0])]; return d && d.l ? [o[1], d.l] : null; }).filter(Boolean);
  if (echoes.length) h += win('ECHOES', echoes.map((e) => '<p class="lbl">' + e[0] + '</p><p>"' + esc(e[1]) + '"</p>').join(''));
  if (S.waystones.length) h += win('WHAT HAS HELPED', S.waystones.slice().reverse().map((w) => '<p class="sub">week of ' + fmtDate(w.week) + '</p><p>' + esc(w.answer) + '</p>').join(''));
  return h;
}
// Averages use only the days with steps recorded: a day left empty is unknown, not zero.
function stepsWindow(started) {
  const weeks = weeklySeries((s) => stepsIn(s, 7), 12);
  const tw = weeks[11], lw = weeks[10];
  const all = stepsAll();
  const pool = (arr) => { const s = arr.reduce((a, x) => a + x.sum, 0), n = arr.reduce((a, x) => a + x.n, 0); return n ? Math.round(s / n) : null; };
  let h = '<div class="statpair">' +
    '<div><span class="bignum">' + (tw.n ? fmtNum(tw.avg) : '-') + '</span><span class="statlbl">A DAY THIS WEEK</span></div>' +
    '<div><span class="bignum">' + fmtNum(all.sum) + '</span><span class="statlbl">STEPS IN ALL' + (all.n ? ', ' + plural(all.n, 'DAY', 'DAYS') : '') + '</span></div></div>';
  h += '<div class="row tight"><span class="grow">This week</span><span class="meta">' + (tw.n ? fmtNum(tw.sum) + ' in ' + plural(tw.n, 'day') : 'none yet') + '</span></div>' +
    '<div class="row tight"><span class="grow">Last week</span><span class="meta">' + (lw.n ? fmtNum(lw.avg) + ' a day' : 'none recorded') + '</span></div>' +
    '<div class="row tight"><span class="grow">On average</span><span class="meta">' + (all.n ? fmtNum(Math.round(all.sum / all.n)) + ' a day' : 'none yet') + '</span></div>';
  h += '<p class="lbl">A DAY, PER WEEK</p>' + bars(weeks.map((x) => x.avg));
  const first = pool(weeks.slice(0, 4)), last = pool(weeks.slice(8));
  h += started >= 56 && first != null && last != null
    ? '<p class="small">First four weeks shown: ' + fmtNum(first) + ' a day. Latest four: ' + fmtNum(last) + '.</p>'
    : '<p class="dim small">Comparisons appear after eight weeks on the road.</p>';
  h += '<p class="dim small">Averages count only days with steps recorded. A day left empty is unknown, not zero. Record steps at camp, or for any past day from the calendar.</p>';
  return win('STEPS', h);
}
function heatmap() {
  const ws = weekStart(today());
  const t = today();
  let cells = '';
  for (let w = 11; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const k = addDays(ws, -7 * w + d);
      const a = deedsOn(k);
      const cls = a === 0 ? 'l0' : a <= 2 ? 'l1' : a <= 5 ? 'l2' : 'l3';
      cells += k > t ? '<i class="fut"></i>' : '<button class="' + cls + '" data-a="openDay" data-d="' + k + '" aria-label="' + fmtFull(k) + '"></button>';
    }
  }
  return '<div class="heat"><div class="days dim" aria-hidden="true"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div><div class="grid" aria-label="The last 12 weeks. Tap a day to open it.">' + cells + '</div></div>' +
    '<div class="legend dim small" aria-hidden="true"><span>quiet</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>full</span></div>';
}
const MONTHS_LONG = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function fmtFull(k) { const d = parseD(k); return WEEKDAYS[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MONTHS_LONG[d.getMonth()].charAt(0) + MONTHS_LONG[d.getMonth()].slice(1, 3).toLowerCase() + ' ' + d.getFullYear(); }
function firstRecordDay() {
  let first = S.created;
  if (dayOne() < first) first = dayOne();
  Object.keys(deedIndex()).forEach((k) => { if (k < first) first = k; });
  return first;
}
// A month calendar over the whole journey; every recorded day opens as a day card.
function calendarHtml() {
  const t = today();
  const cur = t.slice(0, 7);
  const minMonth = firstRecordDay().slice(0, 7);
  let month = UI.calMonth || cur;
  if (month > cur) month = cur;
  if (month < minMonth) month = minMonth;
  const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7));
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const ndays = new Date(y, m, 0).getDate();
  const prevM = dkey(new Date(y, m - 2, 1)).slice(0, 7), nextM = dkey(new Date(y, m, 1)).slice(0, 7);
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="calblank"></span>';
  let walkedIn = 0;
  for (let dd = 1; dd <= ndays; dd++) {
    const k = month + '-' + pad(dd);
    const a = deedsOn(k);
    if (a && k < t) walkedIn++;
    const lv = a === 0 ? 'l0' : a <= 2 ? 'l1' : a <= 5 ? 'l2' : 'l3';
    const rec = S.days[k];
    const cls = 'calday ' + lv + (k === t ? ' istoday' : '') + (rec && rec.l ? ' hasline' : '');
    cells += k > t ? '<span class="calday fut">' + dd + '</span>' : '<button class="' + cls + '" data-a="openDay" data-d="' + k + '" aria-label="' + fmtFull(k) + (a ? ', ' + plural(a, 'thing') + ' recorded' : ', nothing recorded') + '">' + dd + '</button>';
  }
  return '<div class="calnav"><button class="btn" data-a="calMonth" data-v="' + prevM + '"' + (month <= minMonth ? ' disabled' : '') + ' aria-label="Previous month">&lt;</button><span>' + MONTHS_LONG[m - 1] + ' ' + y + '</span><button class="btn" data-a="calMonth" data-v="' + nextM + '"' + (month >= cur ? ' disabled' : '') + ' aria-label="Next month">&gt;</button></div>' +
    '<div class="calhead dim small" aria-hidden="true"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>' +
    '<div class="cal">' + cells + '</div>' +
    '<p class="dim small">' + plural(walkedIn, 'league') + ' walked this month. A dot marks a day with a written line.</p>';
}
function dayPlace(d) {
  const L = walkedDays().filter((k) => k <= d).length;
  if (!L) return null;
  return S.journey.plan[locate(L).ri];
}
VIEWS.day = function (v) {
  const d = v.d, t = today();
  const n = daysBetween(dayOne(), d) + 1;
  const idx = deedIndex();
  const walked = walkedDays();
  const li = walked.indexOf(d);
  const rec = S.days[d] || {};
  const prev = addDays(d, -1), next = addDays(d, 1);
  let h = backRow();
  h += '<div class="daynav"><button class="btn" data-a="openDay" data-d="' + prev + '" data-replace="1" aria-label="Previous day">&lt; ' + fmtDate(prev).toUpperCase() + '</button>' +
    '<button class="btn" data-a="openDay" data-d="' + next + '" data-replace="1"' + (next > t ? ' disabled' : '') + ' aria-label="Next day">' + fmtDate(next).toUpperCase() + ' &gt;</button></div>';

  let status;
  if (d === t) status = idx[d] ? 'Today. Its league is waiting, and is walked when the day ends.' : 'Today. Nothing is on the record yet.';
  else if (li >= 0) { const pos = locate(li + 1); status = 'League ' + (li + 1) + ', walked through ' + esc(S.journey.plan[pos.ri].name) + '.'; }
  else if (d < S.created && !idx[d]) status = d < dayOne() ? 'Before the journey began.' : 'Nothing was recorded. The chronicle started keeping records on ' + fmtDate(S.created) + '.';
  else status = 'A quiet day. No league was walked. Quiet days are part of the road too.';
  const place = dayPlace(d);
  h += win((n >= 1 ? 'DAY ' + n + ' · ' : '') + fmtFull(d).toUpperCase(),
    '<p>' + status + '</p>' +
    (place && li < 0 && d !== t ? '<p class="dim small">You were resting in ' + esc(place.name) + '.</p>' : '') +
    '<div class="row tight"><span class="grow">Inner weather</span><span class="meta">' + (rec.w != null ? WEATHER[rec.w] : 'not recorded') + '</span></div>' +
    (rec.l ? '<p class="lbl">THE LINE</p><p>"' + esc(rec.l) + '"</p>' : '<p class="dim small">' + (d === t ? 'No line yet. You can write one at camp.' : 'No line was written.') + '</p>'));

  h += win('STEPS AND WEIGHT', '<p class="lbl">STEPS</p>' + stepsField('dsteps', d, rec) + '<p class="lbl">WEIGHT, KG</p>' + kgField('dkg', d, rec) +
    '<p class="dim small">' + 'Steps and weight count toward statistics and mana, not leagues. Leave a field empty and save to clear it.' + '</p>');

  const rits = S.rituals.filter((r) => r.created <= d || r.casts[d] || (r.hits && r.hits[d]) || (isWeekly(r) && weekStart(r.created) <= d));
  if (rits.length) {
    h += win('RITUALS', rits.map((r) => {
      const hits = (r.hits && r.hits[d]) ? r.hits[d].length : 0;
      let mark = '[ ]', note = d === t ? 'not yet' : 'missed';
      if (isWeekly(r)) {
        const n = sessionsOn(r, d), w = weekStart(d);
        const wk = sessionsInWeek(r, w);
        if (n && isLate(r, d)) { mark = '[+]'; note = 'session, added later'; }
        else if (n) { mark = '[x]'; note = (n > 1 ? n + ' sessions, first at ' : 'session at ') + r.casts[d]; }
        else { mark = '[-]'; note = 'no session'; }
        note += ' · ' + (isRestWeek(r, w) ? 'rest week' : 'week ' + wk + ' of ' + weekTarget(r));
        const canToggle = d < t && (!n || isLate(r, d));
        if (canToggle) return '<button class="row item" data-a="toggleSession" data-id="' + r.id + '" data-d="' + d + '" aria-label="' + (n ? 'Remove the session added later for ' : 'Add a session for ') + esc(r.name) + '"><span class="mark">' + mark + '</span><span class="grow">' + esc(r.name) + '<span class="sub">' + (n ? 'tap to remove' : 'did it but did not log it? tap to add') + '</span></span><span class="meta">' + note + '</span></button>';
        return '<div class="row tight"><span class="mark">' + mark + '</span><span class="grow">' + esc(r.name) + '</span><span class="meta">' + note + '</span></div>';
      }
      if (r.casts[d]) { mark = '[x]'; note = 'cast at ' + r.casts[d]; }
      else if (r.rests && r.rests[d]) { mark = '[r]'; note = 'rest day'; }
      else if (hits) { mark = '[' + hits + '/' + (r.per || 1) + ']'; note = 'started'; }
      return '<div class="row tight"><span class="mark">' + mark + '</span><span class="grow">' + esc(r.name) + '</span><span class="meta">' + note + '</span></div>';
    }).join(''));
  }

  const ev = S.events.filter((e) => e.d === d);
  const items = [];
  ev.filter((e) => e.k === 'errand').forEach((e) => items.push(['Errand done', (e.text ? esc(e.text) : 'an errand') + (e.of ? ' · all ' + e.of : '')]));
  const parts = {};
  ev.filter((e) => e.k === 'errand_part').forEach((e) => { parts[e.id] = e; });
  Object.keys(parts).forEach((id) => { const e = parts[id]; items.push(['Errand progress', esc(e.text || 'an errand') + ' · ' + e.n + ' of ' + e.of]); });
  ev.filter((e) => e.k === 'peek').forEach((e) => items.push(['Chest opened', (e.text ? esc(e.text) : 'a chest') + (e.exp != null ? ' · expected ' + e.exp + (e.found != null ? ', found ' + e.found : '') : '')]));
  ev.filter((e) => e.k === 'scout').forEach((e) => {
    let txt = 'a floor';
    S.delves.forEach((dv) => dv.floors.forEach((f) => { if (f.id === e.fid) txt = esc(f.text); }));
    items.push(['Floor scouted', txt]);
  });
  ev.filter((e) => e.k === 'floor').forEach((e) => items.push(['Floor cleared', (e.text ? esc(e.text) : 'a delve floor') + ' · scouted ' + e.scout + ', found ' + e.found]));
  S.dispels.forEach((x) => {
    if (x.d === d && x.ad !== d) items.push(['Hex caught', '"' + esc(x.words) + '" · felt ' + x.before + ' true']);
    if (x.ad === d) items.push(['Hex broken', '"' + esc(x.words) + '" · ' + x.before + ' &gt; ' + x.after]);
    if (x.ld === d) items.push(['Hex revisited', '"' + esc(x.words) + '" · ' + x.before + ' &gt; ' + x.after + ' &gt; ' + x.later]);
  });
  S.seals.filter((x) => (x.d || dkey(new Date(x.t))) === d).forEach((x) => items.push(['Worry sealed', esc(x.text)]));
  ev.filter((e) => e.k === 'review').forEach((e) => items.push(['Worry reviewed', (e.text ? esc(e.text) + ' · ' : '') + (e.res === 'dissolved' ? 'faded' : 'still mattered')]));
  S.prophecies.filter((x) => x.d === d).forEach((x) => items.push(['Prophecy written', '"' + esc(x.text) + '" · ' + x.p + '%']));
  S.prophecies.filter((x) => x.judged === d).forEach((x) => items.push(['Prophecy judged', '"' + esc(x.text) + '" · ' + PROPHECY_OUTCOMES[x.o] + (x.charm ? ' · charm used' : '')]));
  const steadies = ev.filter((e) => e.k === 'steady').length;
  if (steadies) items.push(['Steadying', plural(steadies, 'session')]);
  S.suppressions.filter((x) => x.d === d).forEach((x) => items.push([SUPPRESS_MODES[x.mode].label.charAt(0) + SUPPRESS_MODES[x.mode].label.slice(1).toLowerCase(), (x.label ? esc(x.label) + ' · ' : '') + minutesText(x.spent) + (x.mode === 'urge' && x.before != null ? ' · ' + x.before + (x.after != null ? ' &gt; ' + x.after : '') : '') + (x.held === true ? ' · held' : x.held === false ? ' · it won' : '')]));
  h += win('DONE', items.length ? items.map((it) => '<div class="entry"><p class="sub nomargin">' + it[0].toUpperCase() + '</p><p class="nomargin">' + it[1] + '</p></div>').join('') : '<p class="dim small">Nothing else was recorded on this day.</p>');

  const road = [];
  S.journey.plan.forEach((r, i) => { if (r.entered === d) road.push(i === 0 ? 'You walked through the Ash Gate.' : 'You entered ' + esc(r.name) + '.'); });
  ev.filter((e) => e.k === 'landmark' && e.text).forEach((e) => road.push(esc(e.text)));
  S.spells.filter((x) => x.d === d).forEach((x) => road.push('Spell found: ' + esc(x.n) + ' (' + RARITY[x.r].toLowerCase() + ').'));
  if (road.length) h += win('ON THE ROAD', road.map((x) => '<p>' + x + '</p>').join(''));
  return h;
};

function bars(arr, max) {
  const m = Math.max(max || 0, ...arr, 1);
  return '<div class="bars" role="img" aria-label="' + arr.join(', ') + '">' + arr.map((v, i) => '<span class="' + (i === arr.length - 1 ? 'hi' : '') + '" style="height:' + Math.round((v / m) * 64) + 'px"></span>').join('') + '</div><div class="axis dim small"><span>12 weeks ago</span><span>this week</span></div>';
}

/* ---- OPTIONS ---- */
VIEWS.options = function () {
  const set = S.settings;
  let h = backRow();
  h += win('PHOSPHOR', Object.keys(PHOSPHORS).map((k) => {
    const p = PHOSPHORS[k];
    return '<button class="row item" data-a="phosphor" data-v="' + k + '" aria-pressed="' + (set.phosphor === k) + '"><span class="mark">' + (set.phosphor === k ? '&gt;' : '') + '</span><span class="grow">' + p.label + ' <span class="sub inl">' + p.note + '</span></span><span class="swatch" style="background:' + p.fg + ';box-shadow:0 0 8px ' + p.fg + '99"></span></button>';
  }).join('') + '<p class="dim small">The background is always black.</p>');
  h += win('DISPLAY',
    '<button class="row item" data-a="toggle" data-k="scan"><span class="grow">SCANLINES</span><span>' + (set.scan ? '[ON]' : '[OFF]') + '</span></button>' +
    '<button class="row item" data-a="toggle" data-k="companion"><span class="grow">COMPANION AT CAMP</span><span>' + (set.companion !== false ? '[ON]' : '[OFF]') + '</span></button>' +
    '<button class="row item" data-a="toggle" data-k="glow"><span class="grow">PHOSPHOR GLOW</span><span>' + (set.glow ? '[ON]' : '[OFF]') + '</span></button>' +
    '<div class="row item"><span class="grow">TEXT SIZE</span><span class="seg">' + [['s', 'S'], ['m', 'M'], ['l', 'L']].map((x) => '<button class="segb' + (set.size === x[0] ? ' on' : '') + '" data-a="size" data-v="' + x[0] + '" aria-pressed="' + (set.size === x[0]) + '">' + x[1] + '</button>').join('') + '</span></div>');
  h += win('NAME OF THE CHRONICLE', '<div class="inline"><label class="sr" for="o-title">Name</label><input id="o-title" type="text" maxlength="40" data-bind="o-title" data-enter="saveTitle" value="' + esc(fval('o-title', set.title)) + '"><button class="btn" data-a="saveTitle">SAVE</button></div>');
  const d1 = dayOne();
  h += win('DAYS',
    '<p class="nomargin">Today is Day ' + dayNumber() + '. Day 1 is ' + fmtDate(d1) + '.</p>' +
    '<p class="dim small">This only changes the day count. The road, spells, mana and every record stay as they are.</p>' +
    '<label class="lbl" for="o-dayone">Move Day 1 to</label><div class="inline"><input id="o-dayone" type="date" max="' + today() + '" data-bind="o-dayone" value="' + esc(fval('o-dayone', d1)) + '"><button class="btn" data-a="setDayOne">' + (UI.confirm === 'dayone' ? 'TAP AGAIN' : 'SET') + '</button></div>' +
    (UI.confirm === 'dayone' ? '<p class="small">Day 1 will become ' + fmtDate(fval('o-dayone', d1)) + '. Tap again to confirm.</p>' : '') +
    '<button class="btn wide" data-a="resetDays">' + (UI.confirm === 'resetdays' ? 'TAP AGAIN: TODAY BECOMES DAY 1' : 'RESET TO DAY 1') + '</button>' +
    '<p class="lbl">THE DAY TURNS AT</p><div class="seg" role="group" aria-label="The day turns at">' + [0, 2, 3, 4, 5].map((hh) => '<button class="segb' + ((S.settings.dayTurn || 0) === hh ? ' on' : '') + '" data-a="dayTurn" data-v="' + hh + '" aria-pressed="' + ((S.settings.dayTurn || 0) === hh) + '">' + pad(hh) + ':00</button>').join('') + '</div>' +
    '<p class="dim small">Anything done before this hour counts for the previous day. Useful for late nights.</p>');
  h += win('LANTERN HOUR', '<div class="inline"><label class="sr" for="o-lantern">Lantern hour</label><input id="o-lantern" type="time" data-bind="o-lantern" value="' + esc(fval('o-lantern', set.lantern)) + '"><button class="btn" data-a="saveLantern">SAVE</button></div><p class="dim small">When the jar of sealed worries opens each day.</p>');
  const snaps = Pwa.snapshots().slice().reverse();
  const canShare = PWA && navigator.canShare && (function () { try { return navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] }); } catch (e) { return false; } })();
  h += win('YOUR DATA',
    '<p class="small">' + (Cloud.status === 'account' ? 'Saved on this device and to your Claude account.' : PWA ? 'Saved on this phone. Updates to the app change the app only, never this record.' : 'Saved on this device.') + '</p>' +
    (PWA ? '<p class="dim small">Only uninstalling the app or clearing Chrome\'s data for it would remove the record. A backup file now and then keeps it safe even then. ' + (S.lastBackup ? 'Last backup: ' + fmtDate(dkey(new Date(S.lastBackup))) + '.' : 'No backup file yet.') + '</p>' : '') +
    '<div class="btns"><button class="btn" data-a="exportData">' + (PWA ? 'SAVE BACKUP FILE' : 'EXPORT BACKUP') + '</button>' + (canShare ? '<button class="btn" data-a="shareData">SEND BACKUP TO...</button>' : '') + '<label class="btn filebtn" for="o-import">IMPORT BACKUP</label><input id="o-import" class="sr" type="file" accept=".json,application/json" data-change="importFile"></div>' +
    (snaps.length ? '<p class="lbl">BEFORE EACH UPDATE</p>' + snaps.map((x, i) => '<div class="row tight"><span class="grow small">' + fmtDate(dkey(new Date(x.at))) + ' ' + pad(new Date(x.at).getHours()) + ':' + pad(new Date(x.at).getMinutes()) + '</span><button class="lnk small" data-a="restoreSnap" data-v="' + (snaps.length - 1 - i) + '">' + (UI.confirm === 'snap' + (snaps.length - 1 - i) ? 'TAP AGAIN TO RESTORE' : 'RESTORE') + '</button></div>').join('') + '<p class="dim small">A copy of the record is kept each time a new version opens. Restoring replaces the record now in the app.</p>' : '') +
    (Pwa.installEvt ? '<button class="btn wide" data-a="installApp">INSTALL ON THIS PHONE</button>' : '') +
    '<button class="btn danger" data-a="erase">' + (UI.confirm === 'erase' ? 'TAP AGAIN: ERASE EVERYTHING FOREVER' : 'ERASE EVERYTHING') + '</button>');
  h += win('ABOUT', '<p class="small">Version ' + VERSION + ' (' + BUILD + '). ' + S.spells.length + ' spells found, ' + plural(leagues(), 'league') + ' walked.</p><button class="lnk" data-a="showTitle">&gt; TITLE SCREEN</button>');
  return h;
};

/* ---- MODALS ---- */
function renderModal() {
  const m = UI.modals[0];
  if (!m) return '';
  let body = '';
  if (m.type === 'spell') {
    const s = m.sp;
    body = win('A SPELL FOUND', '<p class="sub top">' + RARITY[s.r] + '</p><p class="bigline">' + esc(s.n) + '</p><p>' + esc(s.e) + '</p><p class="dim small">Found ' + (SOURCE_LABEL[s.src] || '') + (s.reg ? ', in ' + esc(s.reg) : '') + '.</p><button class="btn solid wide" data-a="closeModal">INTO THE GRIMOIRE</button>', 'r-' + s.r);
  } else if (m.type === 'learned') {
    const r = S.rituals.find((x) => x.id === m.rid);
    body = win('A SPELL LEARNED', '<p>You have cast ' + esc(r ? r.name : '') + ' ten times. It enters the Grimoire as a spell you know.</p><label class="lbl" for="m-name">What will you call it?</label><input id="m-name" type="text" maxlength="60" data-bind="m-name" data-enter="nameSpell" value="' + esc(fval('m-name', r ? r.name : '')) + '"><button class="btn solid wide" data-a="nameSpell">NAME IT</button>');
  } else if (m.type === 'waystone') {
    const st = m.st;
    const rows = [['Leagues', st.leagues], ['Rituals cast', st.casts], ['Errands done', st.errands], ['Chests opened', st.chests], ['Delve floors', st.floors ? st.floors + ' (scouted ' + st.scout + ', found ' + st.found + ')' : 0], ['Worries faded', st.reviewed ? st.dissolved + ' of ' + st.reviewed : 0], ['Prophecies judged', st.prophecies ? st.prophecies + ' (' + st.ptrue + ' came true)' : 0], ['Minutes of suppression', st.supmin], ['Steps walked', st.stepDays ? fmtNum(st.steps) + ' (' + fmtNum(st.stepAvg) + ' a day)' : 0], ['Weight, weekly average', st.kgAvg != null ? fmtKg(st.kgAvg) + ' kg' : '-'], ['Spells found', st.spells]];
    body = win('WAYSTONE · WEEK OF ' + fmtDate(m.week).toUpperCase(), rows.map((r) => '<div class="row tight"><span class="grow">' + r[0] + '</span><span class="meta">' + r[1] + '</span></div>').join('') +
      '<label class="lbl" for="m-help">What helped this week?</label><textarea id="m-help" rows="2" maxlength="300" data-bind="m-help" placeholder="optional">' + esc(fval('m-help')) + '</textarea>' +
      '<div class="btns"><button class="btn solid" data-a="waystoneSave">CARVE IT</button><button class="btn" data-a="closeModal">WALK ON</button></div>');
  } else if (m.type === 'import') {
    body = win('IMPORT BACKUP', '<p>This backup is from ' + fmtDate(dkey(new Date(m.data.savedAt || Date.now()))) + ' and holds ' + plural(m.data.errands.length, 'errand') + ', ' + plural(m.data.rituals.length, 'ritual') + ' and ' + plural(Object.keys(m.data.days).length, 'logged day') + '.</p><p>Importing replaces everything in the app now.</p><div class="btns"><button class="btn solid" data-a="importConfirm">REPLACE</button><button class="btn" data-a="closeModal">CANCEL</button></div>');
  } else if (m.type === 'exportText') {
    body = win('BACKUP', '<p class="small">Saving a file is not available here. Copy this text and keep it somewhere safe; IMPORT BACKUP accepts it as a .json file.</p><textarea id="m-json" rows="8" readonly>' + esc(m.json) + '</textarea><div class="btns"><button class="btn solid" data-a="copyJson">COPY</button><button class="btn" data-a="closeModal">CLOSE</button></div>');
  } else if (m.type === 'promotion') {
    const c = MAGE_CLASSES[m.rank];
    body = win('PROMOTION', '<pre class="art fg center" aria-hidden="true">' + esc(PROMO_ART.replace(/^\n/, '').replace(/\n$/, '')) + '</pre><p class="sub top center">' + (m.count > 1 ? 'ASSESSED THROUGH ' + m.count + ' CLASSES' : 'YOU ARE NOW') + '</p><p class="bigline center">' + c.name + '</p><p>' + esc(c.line) + '</p><button class="btn solid wide" data-a="closeModal">CONTINUE</button>', 'r-l');
  } else if (m.type === 'message') {
    body = win(m.title, '<p>' + esc(m.text) + '</p><button class="btn solid wide" data-a="closeModal">OK</button>');
  }
  return '<div class="overlay" role="dialog" aria-modal="true">' + body + '</div>';
}

/* ---------------- actions ---------------- */

const A = {};
A.tab = (el) => goTab(el.dataset.v);
A.back = () => back();
A.openView = (el) => {
  const t = el.dataset.v;
  if (t === 'peek') open({ type: 'peek', phase: 'pick', title: 'PEEK' });
  else open({ type: t, title: { prophecy: 'PROPHECY', suppress: 'SUPPRESS', delves: 'DELVE', dispel: 'DISPEL', seal: 'SEAL', steady: 'STEADY', plan: 'TOMORROW', dark: 'HELP' }[t] || '' });
};
A.openOptions = () => { if (topView() && topView().type === 'options') return; open({ type: 'options', title: 'OPTIONS' }); };
A.openErrand = (el) => open({ type: 'errand', id: el.dataset.id, title: 'ERRAND' });
A.openRitual = (el) => open({ type: 'ritual', id: el.dataset.id, title: 'RITUAL' });
A.openBeast = (el) => open({ type: 'beast', id: el.dataset.id, title: 'BESTIARY' });
A.openNote = (el) => open({ type: 'note', id: el.dataset.id, title: 'BESTIARY' });
A.openDelve = (el) => open({ type: 'delve', id: el.dataset.id, title: 'DELVE' });
A.openFloor = (el) => open({ type: 'floor', id: el.dataset.id, fid: el.dataset.i, title: 'DELVE' });
A.setForm = (el) => {
  let v = el.dataset.v;
  if (v === 'true') v = true; else if (v === 'false') v = false;
  UI.form[el.dataset.k] = v;
  render();
};
A.filter = (el) => { UI.filter = el.dataset.v; render(); };
A.openDay = (el) => {
  const d = el.dataset.d;
  if (!d || d > today()) return;
  const v = { type: 'day', d: d, title: 'DAY' };
  if (el.dataset.replace && topView() && topView().type === 'day') { UI.stack[UI.stack.length - 1] = v; UI.form = {}; UI.confirm = null; render(true); }
  else open(v);
};
A.calMonth = (el) => { UI.calMonth = el.dataset.v; render(); };
A.closeModal = () => { UI.modals.shift(); UI.form = {}; render(); };

A.begin = () => {
  S = freshState();
  ensurePlan(60);
  S.lastWaystone = weekStart(today());
  say('Day one. You stand at the Ash Gate with a light pack.');
  save();
  applyTheme();
  UI.stack = []; UI.tab = 'camp';
  render(true);
};
A.closeTitle = () => { UI.stack = []; render(true); };
A.showTitle = () => open({ type: 'title' });

A.add = (el) => {
  const text = (UI.form.addText || '').trim();
  if (!text) return;
  const kind = UI.form.addKind || 'errand';
  if (kind === 'ritual') {
    const nr = newRitual(text);
    S.rituals.push(nr);
    say('A new ritual: ' + nr.name + (isWeekly(nr) ? ', ' + nr.week + ' times a week' : '') + '. Its flame lights on the first cast.');
  } else {
    const when = UI.form.addWhen || (el.dataset.where === 'camp' ? 'today' : 'someday');
    const date = when === 'today' ? today() : when === 'tomorrow' ? addDays(today(), 1) : null;
    S.errands.push(newErrand(text, date));
  }
  act(null);
  UI.form.addText = '';
  save();
  render();
  const inp = $('#f-add'); if (inp) inp.focus();
};
A.tick = (el) => { const e = S.errands.find((x) => x.id === el.dataset.id); if (e) { errandStep(e, 1); render(); } };
// +1 from the errand screen: the last one completes the errand and returns to the list.
A.errPlus = (el) => {
  const e = S.errands.find((x) => x.id === el.dataset.id); if (!e) return;
  const last = (e.got || 0) + 1 >= errandNeed(e);
  if (last) { stopTickers(); UI.stack.pop(); }
  errandStep(e, 1);
  render(last);
};
A.errMinus = (el) => { const e = S.errands.find((x) => x.id === el.dataset.id); if (e) { errandStep(e, -1); render(); } };
A.undo = () => {
  const u = UI.toast && UI.toast.undo;
  UI.toast = null;
  if (u && u.kind === 'errand') undoErrand(u);
  if (u && u.kind === 'errandPart') { const e = S.errands.find((x) => x.id === u.id); if (e) errandStep(e, -1); }
  render();
};
// Tap on a ritual: adds one cast until the day is done; tapping a finished ritual takes one back.
A.cast = (el) => {
  const r = S.rituals.find((x) => x.id === el.dataset.id); if (!r) return;
  if (isWeekly(r)) weeklyHit(r, r.casts[today()] ? -1 : 1);
  else hitRitual(r, r.casts[today()] ? -1 : 1);
  render();
};
A.castPlus = (el) => { const r = S.rituals.find((x) => x.id === el.dataset.id); if (r) { if (isWeekly(r)) weeklyHit(r, 1); else hitRitual(r, 1); render(); } };
A.castMinus = (el) => { const r = S.rituals.find((x) => x.id === el.dataset.id); if (r) { if (isWeekly(r)) weeklyHit(r, -1); else hitRitual(r, -1); render(); } };
// A day button on the weekly ritual screen or a day card: today works like the camp tap; an earlier day adds or
// removes a session added later.
A.toggleSession = (el) => {
  const r = S.rituals.find((x) => x.id === el.dataset.id); if (!r || !isWeekly(r)) return;
  const d = el.dataset.d, t = today();
  if (!d || d > t) return;
  if (d === t) { weeklyHit(r, r.casts[t] ? -1 : 1); render(); return; }
  if (r.casts[d] && !isLate(r, d)) { toast('A session logged on its own day stays on the record.'); return; }
  if (r.casts[d]) removeLateSession(r, d); else addLateSession(r, d);
  save(); render();
};
// Rest weeks: this week, next week, or the week of any chosen date. Tapping a marked week unmarks it.
A.restWeek = (el) => {
  const r = S.rituals.find((x) => x.id === el.dataset.id); if (!r) return;
  let ws = el.dataset.v;
  if (ws === 'pick') {
    const d = UI.form['rw-date'];
    if (!d) { toast('Pick a day in the week first.'); return; }
    ws = weekStart(d);
    delete UI.form['rw-date'];
  }
  if (!r.restWeeks) r.restWeeks = [];
  const label = 'the week of ' + fmtDate(ws);
  if (r.restWeeks.includes(ws)) { r.restWeeks = r.restWeeks.filter((x) => x !== ws); say(r.name + ': ' + label + ' is no longer a rest week.'); }
  else { r.restWeeks.push(ws); r.restWeeks.sort(); say(r.name + ': ' + label + ' is a rest week. The flame is safe.'); }
  save(); render();
};
A.rest = (el) => {
  const r = S.rituals.find((x) => x.id === el.dataset.id); if (!r) return;
  const t = today();
  if (r.rests[t]) delete r.rests[t];
  else {
    r.rests[t] = 1;
    if (r.casts[t]) uncompleteToday(r);
    delete r.hits[t];
    say(r.name + ': a rest day. The flame is safe.');
  }
  save(); render();
};
// Tapping the chosen weather again clears it.
A.weather = (el) => {
  const day = dayRec();
  const v = Number(el.dataset.v);
  if (day.w === v) {
    delete day.w;
    unSpell('w:' + today());
    say('Inner weather cleared for today.');
  } else {
    const first = day.w == null;
    day.w = v;
    if (first) { maybeSpell('small', 'w:' + today()); say('Inner weather: ' + WEATHER[day.w].toLowerCase() + '. Recorded, not judged.'); }
  }
  save(); render();
};
// Saving an empty line removes today's line.
A.inscribe = () => {
  const day = dayRec();
  const text = (UI.form.line !== undefined ? UI.form.line : (day.l || '')).trim();
  delete UI.form.line;
  if (!text) {
    if (day.l) { delete day.l; unSpell('l:' + today()); say('Today\'s line is erased.'); save(); }
    render();
    return;
  }
  const first = !day.l;
  day.l = text;
  if (first) { maybeSpell('small', 'l:' + today()); say('A line is inscribed for today.'); }
  save(); render();
};

A.stepsDay = (el) => { UI.stepsDay = el.dataset.v; delete UI.form.steps; delete UI.form.kg; render(); };
// Saving an empty weight field clears that day's weight.
A.saveKg = (el) => {
  const d = el.dataset.d, key = el.dataset.k;
  if (!d || d > today()) return;
  const rec = S.days[d] || {};
  const raw = UI.form[key] !== undefined ? UI.form[key] : (rec.kg != null ? String(rec.kg) : '');
  const p = parseKg(raw);
  if (p.error) { toast(p.error); return; }
  delete UI.form[key];
  const msg = setKg(d, p.clear ? null : p.n);
  if (msg == null) { render(); return; }
  save();
  if (topView() && topView().type === 'day') showToast(msg);
  render();
};
A.setWeightGoal = () => {
  const p = parseKg(UI.form['wg-target']);
  if (p.clear) { toast('Write the goal weight first.'); return; }
  if (p.error) { toast(p.error); return; }
  const start = kgAvg(today());
  if (start == null) { toast('Log your weight first, so the goal has a starting point.'); return; }
  if (Math.abs(p.n - start) < GOAL_MIN_KG) { toast('Set a goal at least ' + GOAL_MIN_KG + ' kg from your 7-day average (' + fmtKg(start) + ' kg).'); return; }
  const cur = weightGoal();
  if (cur && UI.confirm !== 'newgoal') { UI.confirm = 'newgoal'; render(); return; }
  if (!S.weightGoals) S.weightGoals = [];
  if (cur) cur.to = today();
  S.weightGoals.push({ id: uid(), start: Math.round(start * 10) / 10, target: p.n, from: today(), to: null });
  UI.confirm = null; delete UI.form['wg-target'];
  say('A weight goal is set: ' + (p.n < start ? 'down' : 'up') + ' to ' + fmtKg(p.n) + ' kg, from ' + fmtKg(start) + '.');
  save(); render();
};
A.endWeightGoal = () => {
  const cur = weightGoal(); if (!cur) return;
  if (UI.confirm !== 'endgoal') { UI.confirm = 'endgoal'; render(); return; }
  cur.to = today(); UI.confirm = null;
  say('The weight goal is ended. The mana it earned stays.');
  save(); render();
};
// Saves steps for the day on the button or field. Saving an empty field clears that day's steps.
A.saveSteps = (el) => {
  const d = el.dataset.d, key = el.dataset.k;
  if (!d || d > today()) return;
  const rec = S.days[d] || {};
  const raw = UI.form[key] !== undefined ? UI.form[key] : (rec.s != null ? String(rec.s) : '');
  const p = parseSteps(raw);
  if (p.error) { toast(p.error); return; }
  delete UI.form[key];
  const msg = setSteps(d, p.clear ? null : p.n);
  if (msg == null) { render(); return; }
  save();
  if (topView() && topView().type === 'day') showToast(msg);
  render();
};

A.saveErrand = (el) => {
  const e = S.errands.find((x) => x.id === el.dataset.id); if (!e) return;
  const f = UI.form;
  if (f['e-text'] !== undefined && f['e-text'].trim()) e.text = f['e-text'].trim();
  if (f['e-date'] !== undefined) e.date = f['e-date'] || null;
  if (f['e-time'] !== undefined) e.time = f['e-time'] || null;
  if (f['e-repeat'] !== undefined) { const n = parseInt(f['e-repeat'], 10); e.repeat = n > 0 ? Math.min(n, 365) : null; if (e.repeat && !e.date) e.date = today(); }
  let finish = false;
  if (f['e-need'] !== undefined) {
    const n = parseInt(f['e-need'], 10);
    e.need = n > 0 ? Math.min(n, 99) : 1;
    // Lowered to what is already done: it is finished.
    if (e.need > 1 && (e.got || 0) >= e.need) finish = true;
    if (e.need === 1 && e.got) finish = true;
  }
  if (f['e-dread'] !== undefined && f['e-dread'] !== e.dread) {
    e.dread = !!f['e-dread'];
    e.dreadAt = e.dread ? today() : null;
    if (e.dread) say(e.text + ' is marked as dreaded. A chest appears by the road.');
  }
  save();
  back();
  if (finish) { completeErrand(e); render(); } else toast('Saved.');
};
A.doneErrand = (el) => { const e = S.errands.find((x) => x.id === el.dataset.id); if (!e) return; stopTickers(); UI.stack.pop(); completeErrand(e); render(true); };
A.delErrand = (el) => {
  const id = el.dataset.id;
  if (UI.confirm !== 'del' + id) { UI.confirm = 'del' + id; render(); return; }
  S.errands = S.errands.filter((x) => x.id !== id);
  save(); back();
};
A.addItem = (el) => {
  const e = S.errands.find((x) => x.id === el.dataset.id); const text = (UI.form['e-item'] || '').trim();
  if (!e || !text) return;
  e.list.push({ id: uid(), text: text, done: false });
  UI.form['e-item'] = '';
  save(); render();
  const inp = $('#e-item'); if (inp) inp.focus();
};
A.tickItem = (el) => {
  const e = S.errands.find((x) => x.id === el.dataset.id); if (!e) return;
  const it = e.list.find((x) => x.id === el.dataset.i); if (!it) return;
  it.done = !it.done;
  save(); render();
};
A.delItem = (el) => {
  const e = S.errands.find((x) => x.id === el.dataset.id); if (!e) return;
  e.list = e.list.filter((x) => x.id !== el.dataset.i);
  save(); render();
};

A.saveRitual = (el) => {
  const r = S.rituals.find((x) => x.id === el.dataset.id); if (!r) return;
  const f = UI.form;
  if (f['r-name'] !== undefined && f['r-name'].trim()) r.name = f['r-name'].trim();
  if (f['r-least'] !== undefined) r.least = f['r-least'].trim();
  if (f['r-cue'] !== undefined) r.cue = f['r-cue'].trim();
  if (f['r-time'] !== undefined) r.time = f['r-time'] || null;
  if (f['r-spell'] !== undefined) r.spellName = f['r-spell'].trim() || null;
  const mode = f['r-mode'] !== undefined ? f['r-mode'] : (r.mode || 'daily');
  if (mode === 'weekly') {
    if (r.mode !== 'weekly') {
      // Past days keep their casts; a day that took several taps as a daily ritual counts as one session.
      Object.keys(r.hits || {}).forEach((d) => { if (r.casts[d]) r.hits[d] = [r.casts[d]]; else delete r.hits[d]; });
      r.per = 1;
    }
    r.mode = 'weekly';
    if (f['r-week'] !== undefined) { const n = parseInt(f['r-week'], 10); r.week = n > 0 ? Math.min(n, 14) : 1; }
  } else {
    if (r.mode === 'weekly') { r.mode = 'daily'; Object.keys(r.hits || {}).forEach((d) => { if (r.casts[d]) r.hits[d] = [r.casts[d]]; }); }
    if (f['r-per'] !== undefined) {
      const n = parseInt(f['r-per'], 10);
      const per = n > 0 ? Math.min(n, 12) : 1;
      if (per !== r.per) { r.per = per; rejudgeToday(r); }
    }
  }
  save(); UI.form = {}; render(); toast('Saved.');
};
A.archiveRitual = (el) => {
  const r = S.rituals.find((x) => x.id === el.dataset.id); if (!r) return;
  r.archived = !r.archived;
  say(r.archived ? r.name + ' is resting. Its record stays.' : r.name + ' is awake again.');
  save(); render();
};
A.delRitual = (el) => {
  const id = el.dataset.id;
  if (UI.confirm !== 'del' + id) { UI.confirm = 'del' + id; render(); return; }
  S.rituals = S.rituals.filter((x) => x.id !== id);
  save(); back();
};
A.nameSpell = () => {
  const m = UI.modals[0]; if (!m) return;
  const r = S.rituals.find((x) => x.id === m.rid);
  const name = (UI.form['m-name'] !== undefined ? UI.form['m-name'] : (r ? r.name : '')).trim();
  if (r) { r.spellName = name || r.name; say('A spell learned: ' + r.spellName + '.'); save(); }
  A.closeModal();
};

A.planAdd = () => {
  const text = (UI.form['p-text'] || '').trim(); if (!text) return;
  const e = newErrand(text, addDays(today(), 1));
  e.time = UI.form['p-time'] || null;
  S.errands.push(e);
  act(null);
  UI.form['p-text'] = ''; UI.form['p-time'] = '';
  save(); render();
};
A.planMove = (el) => { const e = S.errands.find((x) => x.id === el.dataset.id); if (e) { e.date = addDays(today(), 1); save(); render(); } };
A.unplan = (el) => { const e = S.errands.find((x) => x.id === el.dataset.id); if (e) { e.date = null; e.time = null; save(); render(); } };

/* peek */
A.peekStart = (el) => {
  const v = { type: 'peek', phase: 'ready', id: el.dataset.id, left: 120, title: 'PEEK' };
  if (topView() && topView().type === 'peek') { stopTickers(); UI.stack[UI.stack.length - 1] = v; render(true); }
  else open(v);
};
A.peekFree = () => {
  const text = (UI.form['pk-text'] || '').trim(); if (!text) return;
  stopTickers();
  UI.stack[UI.stack.length - 1] = { type: 'peek', phase: 'ready', text: text, left: 120, title: 'PEEK' };
  UI.form = {};
  render(true);
};
A.peekBegin = () => {
  const v = topView(); if (!v) return;
  v.phase = 'running'; v.started = Date.now();
  render(true);
  tickers.push(setInterval(() => {
    const left = Math.max(0, 120 - Math.floor((Date.now() - v.started) / 1000));
    v.left = left;
    const el = $('#peek-timer'); if (el) el.textContent = Math.floor(left / 60) + ':' + pad(left % 60);
    if (left === 0) { stopTickers(); v.phase = 'done'; render(); }
  }, 250));
};
A.peekExp = (el) => { const v = topView(); if (!v) return; const n = Number(el.dataset.v); v.exp = v.exp === n ? null : n; render(); };
// If a dread was expected, closing the chest asks how bad it really was before recording.
A.peekClose = () => {
  const v = topView(); if (!v) return;
  stopTickers();
  if (v.exp != null) { v.phase = 'after'; render(true); return; }
  finishPeek(v, null);
};
A.peekFound = (el) => { const v = topView(); if (!v) return; finishPeek(v, el.dataset.v === '' ? null : Number(el.dataset.v)); };
function finishPeek(v, found) {
  const e = v.id ? S.errands.find((x) => x.id === v.id) : null;
  const wait = e && e.dreadAt ? daysBetween(e.dreadAt, today()) : null;
  act('peek', { wait: wait, text: e ? e.text : (v.text || ''), exp: v.exp != null ? v.exp : null, found: found });
  if (e) { e.dread = false; e.dreadAt = null; }
  const x = v.exp;
  say(found == null || x == null ? 'You opened the chest. It was smaller inside than it looked.'
    : found < x ? 'You opened the chest. You expected ' + x + ' and found ' + found + '. It was smaller inside than it looked.'
      : found === x ? 'You opened the chest. It was about as bad as you expected, and you looked anyway.'
        : 'You opened the chest. It was worse than you expected, and you looked anyway.');
  maybeSpell('peek');
  save();
  UI.stack = []; UI.tab = 'camp';
  render(true);
}
A.peekNot = () => {
  stopTickers();
  say('The chest can wait. It is in no hurry.');
  save();
  UI.stack = []; UI.tab = 'camp';
  render(true);
};

/* delve */
A.newDelve = () => {
  const name = (UI.form['d-name'] || '').trim(); if (!name) return;
  const d = { id: uid(), name: name, created: today(), floors: [] };
  S.delves.push(d);
  act(null);
  save();
  UI.stack[UI.stack.length - 1] = { type: 'delves', title: 'DELVE' };
  open({ type: 'delve', id: d.id, title: 'DELVE' });
};
A.addFloor = (el) => {
  const d = S.delves.find((x) => x.id === el.dataset.id); const text = (UI.form['fl-text'] || '').trim();
  if (!d || !text) return;
  d.floors.push({ id: uid(), text: text, scout: null, found: null, at: null });
  UI.form['fl-text'] = '';
  save(); render();
  const inp = $('#fl-text'); if (inp) inp.focus();
};
A.scout = (el) => {
  const v = topView(); const d = S.delves.find((x) => x.id === v.id); const f = d && d.floors.find((x) => x.id === v.fid);
  if (!f) return;
  f.scout = Number(el.dataset.v);
  const txt = (UI.form['fl-proph'] || '').trim();
  if (txt && !f.pid) { const pr = newProphecy(txt, UI.form['fl-p'] != null ? UI.form['fl-p'] : 50, null, 'delve', f.id); f.pid = pr.id; }
  UI.form = {};
  act('scout', { fid: f.id });
  say('Floor scouted at ' + f.scout + ' out of 10.' + (txt ? ' The prophecy is on the record.' : ''));
  save(); render();
};
A.rescout = () => {
  const v = topView(); const d = S.delves.find((x) => x.id === v.id); const f = d && d.floors.find((x) => x.id === v.fid);
  if (!f) return;
  f.scout = null;
  const t = today();
  for (let i = S.events.length - 1; i >= 0; i--) { const e = S.events[i]; if (e.k === 'scout' && e.fid === f.id && e.d === t) { S.events.splice(i, 1); break; } }
  save(); render();
};
A.found = (el) => {
  const v = topView(); const d = S.delves.find((x) => x.id === v.id); const f = d && d.floors.find((x) => x.id === v.fid);
  if (!f) return;
  f.found = Number(el.dataset.v); f.at = today();
  act('floor', { scout: f.scout, found: f.found, text: f.text, delve: d.name });
  say('A delve floor cleared. Scouted ' + f.scout + ', found ' + f.found + '.');
  maybeSpell('floor');
  const pr = f.pid ? S.prophecies.find((p) => p.id === f.pid) : null;
  if (pr && !pr.o) {
    if (UI.form['fl-o']) judgeProphecy(pr, UI.form['fl-o'], UI.form['fl-charm']);
    else pr.due = today();
  }
  UI.form = {};
  save(); render();
};
A.delDelve = (el) => {
  const id = el.dataset.id;
  if (UI.confirm !== 'del' + id) { UI.confirm = 'del' + id; render(); return; }
  S.delves = S.delves.filter((x) => x.id !== id);
  save(); back();
};
A.delFloor = (el) => {
  const fid = el.dataset.i;
  if (UI.confirm !== 'del' + fid) { UI.confirm = 'del' + fid; render(); return; }
  const d = S.delves.find((x) => x.id === el.dataset.id);
  if (d) d.floors = d.floors.filter((x) => x.id !== fid);
  S.prophecies = S.prophecies.filter((p) => !(p.ref === fid && !p.o));
  save(); back();
};

/* suppress */
A.supMode = (el) => { UI.form['su-mode'] = el.dataset.v; delete UI.form['su-dur']; render(); };
A.supPick = (el) => {
  const e = S.errands.find((x) => x.id === el.dataset.id); if (!e) return;
  if (UI.form['su-eid'] === e.id) { delete UI.form['su-eid']; UI.form['su-label'] = ''; }
  else { UI.form['su-eid'] = e.id; UI.form['su-label'] = e.text; }
  render();
};
A.supBegin = () => {
  const f = UI.form;
  const mode = f['su-mode'] || 'urge';
  const dur = Number(f['su-dur'] || SUPPRESS_MODES[mode].def);
  S.active = { mode: mode, label: (f['su-label'] || '').trim(), before: f['su-before'] != null && f['su-before'] !== '' ? Number(f['su-before']) : null, dur: dur * 60, start: Date.now(), stopped: null, eid: mode === 'burst' ? (f['su-eid'] || null) : null };
  save();
  const v = topView(); v.phase = 'running';
  UI.form = {}; UI.confirm = null;
  render(true);
  startSuppressTicker();
};
A.supStop = () => {
  const a = S.active; if (!a) return;
  stopTickers(); keepAwake(false);
  a.stopped = Date.now();
  save();
  if (a.mode === 'still') { finishSuppress({}); return; }
  topView().phase = 'after';
  render(true);
};
A.supDiscard = () => {
  if (UI.confirm !== 'supdiscard') { UI.confirm = 'supdiscard'; render(); return; }
  stopTickers(); keepAwake(false);
  S.active = null; UI.confirm = null;
  save();
  const v = topView(); v.phase = null;
  render(true);
};
A.supFinish = (el) => {
  const a = S.active; if (!a) return;
  const r = el.dataset.v;
  if (r === 'held' || r === 'gave') {
    const af = UI.form['su-after'];
    finishSuppress({ held: r === 'held', after: af != null && af !== '' ? Number(af) : null });
  } else {
    const eid = a.eid;
    finishSuppress({});
    if (r === 'errandDone') { const e = S.errands.find((x) => x.id === eid); if (e) completeErrand(e); render(); }
  }
};
A.supAgain = () => { const v = topView(); v.phase = null; v.rec = null; UI.form = {}; render(true); };

/* mana */
A.releaseMana = () => {
  if (manaState().state !== 'ready') return;
  S.mana.at = Date.now();
  const snap = manaSnapshot();
  // The assessment: classes are granted only here, and never taken away.
  const before = S.mana.rank != null ? S.mana.rank : -1;
  const now = Math.max(before, mageClassIndex(snap.total));
  if (now > before) {
    snap.promo = [];
    for (let k = before + 1; k <= now; k++) snap.promo.push(k);
    S.mana.rank = now;
    say('Promotion: you are now a ' + MAGE_CLASSES[now].name.toLowerCase() + '.');
    UI.modals.push({ type: 'promotion', rank: now, count: snap.promo.length });
  }
  S.mana.snaps.push(snap);
  UI.confirm = null;
  say('You release your mana. For one day, it can be seen.');
  buzz();
  save(); render();
};
// A keyboard press cannot be held, so it confirms in two steps instead.
A.holdKey = (el, ev) => {
  if (ev && ev.detail !== 0) return;
  if (UI.confirm !== 'hold') { UI.confirm = 'hold'; render(); return; }
  A[el.dataset.hold](el);
};

/* prophecy */
A.newProphecy = () => {
  const text = (UI.form['pr-text'] || '').trim();
  if (!text) { toast('Write the prophecy down first.'); return; }
  const pr = newProphecy(text, UI.form['pr-p'] != null ? UI.form['pr-p'] : 50, UI.form['pr-due'] || addDays(today(), 7), 'free', null);
  act('prophecy_new', { pid: pr.id });
  say('A prophecy is written down. Its day of judgement will come.');
  UI.form = {};
  save(); render();
};
A.judge = (el) => {
  const pr = S.prophecies.find((x) => x.id === el.dataset.id);
  if (!pr || pr.o) return;
  judgeProphecy(pr, el.dataset.v, UI.form['pc-' + pr.id]);
  delete UI.form['pc-' + pr.id];
  save(); render();
};
A.dropProphecy = (el) => {
  const id = el.dataset.id;
  if (UI.confirm !== 'drop' + id) { UI.confirm = 'drop' + id; render(); return; }
  S.prophecies = S.prophecies.filter((x) => x.id !== id);
  S.events = S.events.filter((e) => !(e.k === 'prophecy_new' && e.pid === id && e.d === today()));
  S.delves.forEach((d) => d.floors.forEach((f) => { if (f.pid === id) f.pid = null; }));
  S.dispels.forEach((x) => { if (x.pid === id) x.pid = null; });
  UI.confirm = null;
  save(); render();
};

/* dispel */
A.saveDispel = (el) => {
  const f = UI.form;
  const words = (f['dz-words'] || '').trim();
  if (!words) { toast('Write down what it says first.'); return; }
  const breakNow = !el || el.dataset.v !== 'catch';
  const answer = (f['dz-answer'] || '').trim();
  if (breakNow && !answer) { toast('Write the companion\'s answer first, or catch it to answer later.'); return; }
  const rec = { id: uid(), t: Date.now(), d: today(), words: words, hex: f['dz-hex'] || null, answer: breakNow ? answer : '', before: Number(f['dz-before'] != null ? f['dz-before'] : 70), after: null, ad: null, rv: Number(f['dz-rv'] != null ? f['dz-rv'] : 3), due: null, later: null, ld: null, pid: null };
  S.dispels.push(rec);
  maybeTestHex(rec, 'dz');
  UI.toast = null;
  if (breakNow) breakHex(rec, answer, Number(f['dz-after'] != null ? f['dz-after'] : 50));
  else { act('hex_catch', { hid: rec.id }); say('A hex is caught. Its words are on the record; the answer can wait.' + (rec.pid ? ' Its prophecy is written down.' : '')); }
  UI.form = {};
  save(); render(true);
};
A.openHex = (el) => open({ type: 'hex', id: el.dataset.id, title: 'DISPEL' });
A.answerHex = (el) => {
  const x = S.dispels.find((d) => d.id === el.dataset.id);
  if (!x || x.after != null) return;
  const f = UI.form;
  const answer = (f['hx-answer'] !== undefined ? f['hx-answer'] : (x.answer || '')).trim();
  if (!answer) { toast('Write the companion\'s answer first.'); return; }
  x.rv = Number(f['hx-rv'] != null ? f['hx-rv'] : (x.rv != null ? x.rv : 3));
  maybeTestHex(x, 'hx');
  UI.toast = null;
  breakHex(x, answer, Number(f['hx-after'] != null ? f['hx-after'] : 50));
  UI.form = {};
  save(); render(true);
};
A.revisitHex = (el) => {
  const x = S.dispels.find((d) => d.id === el.dataset.id);
  if (!x || x.after == null || x.later != null) return;
  x.later = Number(UI.form['hx-later'] != null ? UI.form['hx-later'] : x.after);
  x.ld = today();
  act('hex_revisit', { hid: x.id, before: x.before, after: x.after, later: x.later });
  say('A hex looked at again: ' + x.before + ', then ' + x.after + ', now ' + x.later + '.');
  maybeSpell('revisit');
  UI.form = {};
  save(); render(true);
};
A.skipRevisit = (el) => {
  const x = S.dispels.find((d) => d.id === el.dataset.id); if (!x) return;
  x.due = null; x.rv = 0;
  save(); render();
};
A.dropHex = (el) => {
  const id = el.dataset.id;
  const x = S.dispels.find((d) => d.id === id);
  if (!x || x.after != null) return;
  if (UI.confirm !== 'drophex' + id) { UI.confirm = 'drophex' + id; render(); return; }
  S.dispels = S.dispels.filter((d) => d.id !== id);
  S.events = S.events.filter((e) => !(e.k === 'hex_catch' && e.hid === id && e.d === today()));
  UI.confirm = null;
  save(); back();
};

/* seal */
A.sealIt = () => {
  const text = (UI.form['s-text'] || '').trim(); if (!text) return;
  const seal = { id: uid(), t: Date.now(), d: today(), text: text, status: 'sealed', reviewed: null };
  S.seals.push(seal);
  const track = UI.form['s-track'] !== undefined ? UI.form['s-track'] : false;
  if (track) newProphecy(text, UI.form['s-p'] != null ? UI.form['s-p'] : 50, UI.form['s-due'] || addDays(today(), 7), 'seal', seal.id);
  act('seal', { sid: seal.id });
  say('A worry is sealed until lantern hour.' + (track ? ' Its prophecy is on the record.' : ''));
  UI.form['s-text'] = ''; delete UI.form['s-p']; delete UI.form['s-due'];
  save(); render();
};
A.sealDissolve = (el) => {
  const s = S.seals.find((x) => x.id === el.dataset.id); if (!s) return;
  s.status = 'dissolved'; s.reviewed = Date.now();
  act('review', { res: 'dissolved', sid: s.id, text: s.text });
  say('A sealed worry has faded. It no longer feels pressing.');
  maybeSpell('review');
  save(); render();
};
A.sealKeep = (el) => {
  const s = S.seals.find((x) => x.id === el.dataset.id); if (!s) return;
  s.status = 'kept'; s.reviewed = Date.now();
  act('review', { res: 'kept', sid: s.id, text: s.text });
  if (el.dataset.v === 'delve') { S.delves.push({ id: uid(), name: s.text.slice(0, 80), created: today(), floors: [] }); say('A worry becomes a delve.'); }
  else { S.errands.push(newErrand(s.text.slice(0, 140), null)); say('A worry becomes an errand on the board.'); }
  maybeSpell('review');
  save(); render();
};

/* steady */
A.breatheBegin = () => {
  const v = topView(); v.running = true; v.started = Date.now(); v.mode = 'breathe';
  render(true);
  let lastPhase = null;
  const tick = () => {
    const el = Math.floor((Date.now() - v.started) / 1000);
    const left = Math.max(0, 120 - el);
    const inCycle = ((Date.now() - v.started) / 1000) % 10;
    const phase = inCycle < 4 ? 'in' : 'out';
    const ring = $('#ring'), ph = $('#breath-phase'), lf = $('#breath-left');
    if (phase !== lastPhase && ring) { ring.classList.toggle('grow', phase === 'in'); lastPhase = phase; if (ph) ph.textContent = phase === 'in' ? 'IN' : 'OUT'; }
    if (lf) lf.textContent = Math.floor(left / 60) + ':' + pad(left % 60);
    if (left === 0) { stopTickers(); v.running = false; v.done = true; act('steady'); maybeSpell('steady'); say('Two minutes of slow breath.'); save(); render(true); }
  };
  setTimeout(tick, 50);
  tickers.push(setInterval(tick, 250));
};
A.breatheStop = () => { stopTickers(); const v = topView(); v.running = false; render(true); };
A.groundBegin = () => { const v = topView(); v.mode = 'ground'; v.step = 0; render(true); };
A.groundNext = () => {
  const v = topView();
  if ((v.step || 0) < 4) { v.step = (v.step || 0) + 1; render(); return; }
  act('steady'); maybeSpell('steady'); say('Five things seen, four touched, three heard, two smelled, one tasted. Steady.');
  save();
  v.mode = null; v.done = true; render(true);
};

/* options */
A.phosphor = (el) => { S.settings.phosphor = el.dataset.v; applyTheme(); save(); render(); };
A.toggle = (el) => { const k = el.dataset.k; S.settings[k] = !S.settings[k]; applyTheme(); save(); render(); };
A.size = (el) => { S.settings.size = el.dataset.v; applyTheme(); save(); render(); };
A.saveTitle = () => { const t = (UI.form['o-title'] || '').trim(); if (!t) return; S.settings.title = t.toUpperCase(); save(); render(); toast('Renamed.'); };
A.setDayOne = () => {
  const v = UI.form['o-dayone'];
  if (!v || v > today()) { toast('Choose a date no later than today.'); return; }
  if (UI.confirm !== 'dayone') { UI.confirm = 'dayone'; render(); return; }
  S.settings.dayOne = v; UI.confirm = null; delete UI.form['o-dayone'];
  save(); render(); toast('Day 1 is now ' + fmtDate(v) + '.');
};
A.resetDays = () => {
  if (UI.confirm !== 'resetdays') { UI.confirm = 'resetdays'; render(); return; }
  S.settings.dayOne = today(); UI.confirm = null;
  say('The count begins again. Day 1.');
  save(); render(); toast('Today is Day 1.');
};
A.dayTurn = (el) => {
  S.settings.dayTurn = Number(el.dataset.v);
  UI.lastDay = null;
  save(); render(); toast('The day now turns at ' + pad(S.settings.dayTurn) + ':00.');
};
A.saveLantern = () => { const t = UI.form['o-lantern']; if (!t) return; S.settings.lantern = t; save(); render(); toast('Lantern hour set to ' + t + '.'); };
function backupName() { return 'life-is-a-journey-' + today() + '.json'; }
function markBackup(msg) { S.lastBackup = Date.now(); save(); toast(msg); }
A.exportData = async () => {
  const json = JSON.stringify(S);
  const name = backupName();
  try {
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename: name, data: json }); markBackup('Backup saved.'); return; }
  } catch (e) {
    if (e && e.code === 'declined') { toast('Backup not saved.'); return; }
  }
  if (PWA) {
    try {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      markBackup('Backup saved to Downloads as ' + name + '.');
      return;
    } catch (e) { /* fall back to copying the text */ }
  }
  UI.modals.push({ type: 'exportText', json: json });
  render();
};
// The phone's share sheet: Google Drive, email, a message to yourself.
A.shareData = async () => {
  const file = new File([JSON.stringify(S)], backupName(), { type: 'application/json' });
  try { await navigator.share({ files: [file], title: 'Life is a Journey backup' }); markBackup('Backup sent.'); } catch (e) { if (!(e && e.name === 'AbortError')) toast('Sharing is not available here. Use SAVE BACKUP FILE.'); }
};
A.restoreSnap = (el) => {
  const i = Number(el.dataset.v);
  if (UI.confirm !== 'snap' + i) { UI.confirm = 'snap' + i; render(); return; }
  const snap = Pwa.snapshots()[i];
  UI.confirm = null;
  try {
    const data = JSON.parse(snap.raw);
    if (!validState(data)) throw new Error('invalid');
    S = migrate(data);
    save(); applyTheme();
    UI.stack = []; UI.tab = 'camp'; UI.lastDay = null;
    render(true);
    toast('The record from before that update is back.');
  } catch (e) { toast('That copy could not be read.'); render(); }
};
A.applyUpdate = () => { if (S) Store.saveLocal(); location.reload(); };
A.installApp = async () => { const e = Pwa.installEvt; if (!e) return; Pwa.installEvt = null; try { e.prompt(); await e.userChoice; } catch (x) { /* dismissed */ } render(); };
A.copyJson = () => {
  const ta = $('#m-json');
  const json = UI.modals[0] ? UI.modals[0].json : '';
  try {
    navigator.clipboard.writeText(json).then(() => toast('Copied.'), () => { if (ta) { ta.focus(); ta.select(); } });
  } catch (e) { if (ta) { ta.focus(); ta.select(); } }
};
A.importConfirm = () => {
  const m = UI.modals[0]; if (!m || !m.data) return;
  S = migrate(m.data);
  UI.modals = [];
  save(); applyTheme();
  UI.stack = []; UI.tab = 'camp';
  render(true);
  toast('Backup imported.');
};
A.erase = () => {
  if (UI.confirm !== 'erase') { UI.confirm = 'erase'; render(); return; }
  try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  clearTimeout(Store.timer);
  Cloud.erase();
  S = null;
  UI.stack = []; UI.tab = 'camp'; UI.confirm = null;
  applyTheme();
  render(true);
};
A.waystoneSave = () => {
  const m = UI.modals[0];
  const ans = (UI.form['m-help'] || '').trim();
  if (m && ans) { S.waystones.push({ week: m.week, answer: ans, t: Date.now() }); act(null); save(); }
  A.closeModal();
};

/* ---------------- events ---------------- */

function onClick(ev) {
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  const fn = A[el.dataset.a];
  if (!fn) return;
  ev.preventDefault();
  fn(el, ev);
}
function onKey(ev) {
  if (ev.key !== 'Enter') return;
  const el = ev.target;
  if (!el || !el.dataset || !el.dataset.enter || el.tagName === 'TEXTAREA') return;
  ev.preventDefault();
  const fn = A[el.dataset.enter];
  if (fn) fn(el, ev);
}
function onInput(ev) {
  const el = ev.target;
  if (!el || !el.dataset || !el.dataset.bind) return;
  UI.form[el.dataset.bind] = el.value;
  if (el.dataset.out) { const o = document.getElementById(el.dataset.out); if (o) o.textContent = el.value; }
}
function onChange(ev) {
  const el = ev.target;
  if (!el || !el.dataset) return;
  if (el.dataset.bind) UI.form[el.dataset.bind] = el.value;
  if (el.dataset.change === 'importFile' && el.files && el.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!validState(data)) throw new Error('bad');
        UI.modals.push({ type: 'import', data: data });
      } catch (e) {
        UI.modals.push({ type: 'message', title: 'IMPORT FAILED', text: 'That file is not a Life is a Journey backup. Choose a .json file made with EXPORT BACKUP.' });
      }
      render();
    };
    reader.readAsText(el.files[0]);
    el.value = '';
  }
}

/* ---------------- the installed phone app ---------------- */
/* The phone build is served from its own web address and installed to the home screen (PWA is true there).
   An update replaces the page, never the record: the journey stays in this phone's storage under the same key.
   As a safety net, the first time a new version opens, the record is copied aside (the last 3 updates are kept)
   and can be restored from Options. */
const SNAP_KEY = 'lij.snapshots.v1', BUILD_KEY = 'lij.build';
const Pwa = {
  update: null, installEvt: null, lastCheck: 0,
  snapshots() { try { return JSON.parse(localStorage.getItem(SNAP_KEY) || '[]'); } catch (e) { return []; } },
  snapshotIfNewBuild() {
    try {
      const prev = localStorage.getItem(BUILD_KEY);
      if (prev === BUILD) return;
      const raw = localStorage.getItem(STORE_KEY);
      if (raw && prev && raw.length < 800000) {
        const snaps = this.snapshots();
        snaps.push({ at: Date.now(), from: prev, to: BUILD, raw: raw });
        while (snaps.length > 3) snaps.shift();
        try { localStorage.setItem(SNAP_KEY, JSON.stringify(snaps)); } catch (e) { try { localStorage.setItem(SNAP_KEY, JSON.stringify(snaps.slice(-1))); } catch (e2) { /* no room for copies */ } }
      }
      localStorage.setItem(BUILD_KEY, BUILD);
    } catch (e) { /* storage blocked */ }
  },
  async check() {
    if (!PWA || Date.now() - this.lastCheck < 60000) return;
    this.lastCheck = Date.now();
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      if (j.build && j.build !== BUILD && this.update !== j.build) { this.update = j.build; render(); }
    } catch (e) { /* offline: try again later */ }
  },
  init() {
    this.snapshotIfNewBuild();
    if (!PWA) return;
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* not supported */ }
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.installEvt = e; render(); });
    window.addEventListener('appinstalled', () => { this.installEvt = null; render(); });
    setTimeout(() => this.check(), 2000);
  }
};
function updateBar() {
  if (!Pwa.update) return '';
  return '<div class="updbar" role="status"><span>THE ROAD HAS CHANGED. A NEW VERSION IS READY.</span><button class="btn" data-a="applyUpdate">UPDATE</button></div>';
}

function boot() {
  Pwa.init();
  S = Store.load();
  applyTheme();
  if (S) { ensurePlan(60); pruneRolls(); }
  setInterval(() => { if (S && UI.lastDay !== today()) render(); }, 60000);
  if (!REDUCED_MOTION) setInterval(() => { compTick++; const el = document.getElementById('companion'); if (el) el.textContent = companionFrame(compTick); }, 800);
  render(true);
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  let holdTimer = null;
  document.addEventListener('pointerdown', (ev) => {
    const b = ev.target.closest('[data-hold]');
    if (!b) return;
    b.classList.add('holding');
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { holdTimer = null; b.classList.remove('holding'); const fn = A[b.dataset.hold]; if (fn) fn(b); }, 3000);
  });
  const cancelHold = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } document.querySelectorAll('.holding').forEach((x) => x.classList.remove('holding')); };
  document.addEventListener('pointerup', cancelHold);
  document.addEventListener('pointercancel', cancelHold);
  document.addEventListener('contextmenu', (ev) => { if (ev.target.closest('[data-hold]')) ev.preventDefault(); });
  if (S && S.active) {
    UI.tab = 'arts'; UI.stack = [{ type: 'suppress', title: 'SUPPRESS' }];
    if (!S.active.stopped && supElapsed() >= S.active.dur) suppressTimeUp();
    else { render(true); if (!S.active.stopped) startSuppressTicker(); }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (Cloud.ready) Cloud.pull();
      Pwa.check();
      if (S) { checkWaystone(); render(); }
    } else if (S) {
      clearTimeout(Store.timer);
      Cloud.push();
    }
  });
  Cloud.init();
}
boot();
