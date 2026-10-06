/* Illuminated Life · the app
   Plain JavaScript, no build step, no dependencies.
   State lives in one object, saved to this browser only (localStorage).
   Screens are functions that return HTML strings; one click handler reads data-act.
   Every value that comes from the user or from a backup passes through esc() on its way into HTML.

   ── For other scripts (the Guide): window.IL.api ──
   A small, stable doorway into the app. Every call goes the same way as a tap on the screen:
   the value is checked, the state is normalised and saved on this device, and the screen is drawn again.
     IL.api.getState()            a copy of everything saved (changing the copy changes nothing)
     IL.api.addPractice({ title, field, cadence, time, weekday, note, companion })
                                  adds one practice to the Rule and returns its id, or null if it has no title.
                                  cadence: "day", "week", "month" or "year". field: a field id such as "soul".
                                  time: "07:30". weekday: 0 (Sunday) to 6, or a name such as "friday"; weekly only.
                                  companion: the id of a companion app, such as "laudate".
     IL.api.setFloor([a, b, c])   the three floor lines
     IL.api.setSeasonField(id)    this season's field; the ninety days begin today. Returns false for an unknown id.
     IL.api.setSteward(patch)     any of { baptism: "YYYY-MM-DD", patron, stateOfLife, call, gifts: [a, b, c] }
     IL.api.iconoSummary()        the latest Icon Screen synthesis, or null if it has not been taken
     IL.api.makeICS(opts)         the whole Rule as calendar text (RFC 5545). opts: { feasts: true } adds the principal feasts.
     IL.api.makeDayICS(iso)       one day's plan as calendar text: single events, nothing repeating
     IL.api.go(route)             "today", "fields", "rule", "diary", "diary/examen", "more", "more/model", "more/icon" ...
     IL.api.removePractice(id)    takes one practice out of the Rule. Returns true if it was there.
     IL.api.setChurch(patch)      any of { parish, confession, ahead, beside, behind }
     IL.api.setMovements(id, m)   the four lines of one field: any of { receive, bless, spend, return }
     IL.api.setDay(patch)         the shape of a day: any of { wake, workStart, workEnd, bed: "HH:MM", workVaries, restDay: 0 to 6 }
     IL.api.setName(name)         what the Guide calls the person
     IL.api.addCommitment({ title, start, end, date | weekday })   a fixed commitment on one date, or every week. Returns its id.
     IL.api.removeCommitment(id)
     IL.api.finishGuide(ids)      marks the Guide as used today, clears its draft, and notes which practices it added
     IL.api.batch(fn)             runs several calls and draws the screen once at the end
   The pure scoring of the Icon Screen is on IL.icono, and its words on IL.ICONO (js/icons.js).
   The Guide, My day and the calendar screen are in js/guide.js, which is loaded before this file. */

(function () {
  "use strict";
  const { RINGS, LEVELS, MOVES, FIELDS, LAWS, PRECEPTS, PRAYERS, VERSES, EXAMEN, BUCKETS, DEFAULT_RULE, COMPANIONS, ANCHOR_HINTS, ICONO } = IL;
  const icono = IL.icono;
  const L = IL.liturgy;
  const KEY = "illuminated-life-v1";
  const LOCALE = "en-GB"; // one fixed locale, so dates read the same on every device
  const PREVIEW = window.IL_HOST === "preview"; // set only in the hosted preview, where files and printing are blocked
  const root = document.getElementById("app");
  const GUIDE = IL.guide || null; // js/guide.js: the Guide, My day, the calendar screen

  /* ───────── helpers ───────── */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"'`]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9) || "r" + Date.now();
  const todayISO = () => L.iso(new Date());
  const fieldById = (id) => FIELDS.find((f) => f.id === id);
  const compById = (id) => COMPANIONS.find((c) => c.id === id);
  const fmt = (d, o) => d.toLocaleDateString(LOCALE, o);
  const pretty = (d) => fmt(d, { day: "numeric", month: "long" });
  const fromISO = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
  const isISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && L.iso(fromISO(s)) === s;
  const longDate = (iso) => fmt(fromISO(iso), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const verseFor = (d) => VERSES[L.dayOfYear(d) % VERSES.length];
  const cssq = (s) => String(s).replace(/["\\]/g, "\\$&");
  const isTime = (s) => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

  function weekKey(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return t.getUTCFullYear() + "-W" + String(Math.ceil(((t - y0) / 86400000 + 1) / 7)).padStart(2, "0");
  }
  function periodKey(cadence, d = new Date()) {
    if (cadence === "weekly") return weekKey(d);
    if (cadence === "monthly") return L.iso(d).slice(0, 7);
    if (cadence === "yearly") return String(d.getFullYear());
    return L.iso(d);
  }

  // Reads "1234.56", "1.234,56", "12,50" and "1,234.56". Money never has three decimals,
  // so a single separator followed by exactly three digits is read as a thousands mark.
  function parseNum(v) {
    let s = String(v == null ? "" : v).replace(/[^\d.,-]/g, "");
    const neg = s.startsWith("-"); s = s.replace(/-/g, "");
    const lastDot = s.lastIndexOf("."), lastComma = s.lastIndexOf(",");
    if (lastDot >= 0 && lastComma >= 0) {
      const dec = lastDot > lastComma ? "." : ",", grp = dec === "." ? "," : ".";
      s = s.split(grp).join(""); if (dec === ",") s = s.replace(",", ".");
    } else if (lastDot >= 0 || lastComma >= 0) {
      const sep = lastDot >= 0 ? "." : ",", parts = s.split(sep);
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length > 0)) s = parts.join("");
      else s = parts.join(".");
    }
    const n = parseFloat(s);
    return isFinite(n) ? (neg ? -n : n) : 0;
  }

  // Only ordinary web links are allowed out of the app.
  function safeURL(v) {
    let s = String(v == null ? "" : v).trim().slice(0, 500);
    if (!s) return "";
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
    try { const u = new URL(s); return (u.protocol === "https:" || u.protocol === "http:") && u.hostname ? u.href : ""; }
    catch (e) { return ""; }
  }
  function companionOf(r) {
    if (!r) return null;
    if (r.companion === "custom") {
      const url = safeURL(r.link); if (!url) return null;
      let host = "link"; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) { /* keep the plain word */ }
      return { name: host, url, label: "Open " + host };
    }
    const c = compById(r.companion);
    return c ? { name: c.name, url: c.url, label: "Open in " + c.name } : null;
  }
  const outLink = (url, label, cls = "out") => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;

  /* ───────── state ───────── */
  const CADENCES = ["daily", "weekly", "monthly", "yearly"];
  const CONFESSION = ["every two weeks", "monthly", "every two months", "each season"];
  const EXAMEN_KEYS = ["thanks", "alive", "tight", "wound", "limit", "tomorrow"]; // the line "for mercy" is never stored
  const FIELD_KEYS = ["receive", "bless", "spend", "ret", "act"];
  const UNSAFE = ["__proto__", "constructor", "prototype"];
  const STATES = IL.STATES_OF_LIFE.map((x) => x[0]);
  // The Icon Screen, one step at a time: each panel (p) and then what it shows (r).
  const ICO_STEPS = ["p1", "r1", "p2", "r2", "p3", "r3", "p4", "r4", "p5", "r5"];

  function blank() {
    const fields = {};
    FIELDS.forEach((f) => { fields[f.id] = { level: 0, receive: "", bless: "", spend: "", ret: "", act: "" }; });
    return {
      v: 1, fields, focus: null,
      rule: DEFAULT_RULE.map(([cadence, text, time, note, field]) => ({ id: uid(), cadence, text, time, note, field, done: null, companion: "", link: "", weekday: "" })),
      floor: ["Two minutes of prayer, morning and night", "Sunday Mass", "One honest conversation a week"],
      floorMode: false, floorDay: { date: "", done: [false, false, false] },
      church: { parish: "", confession: "monthly", ahead: "", beside: "", behind: "", shownTo: "", shownOn: "" },
      steward: { baptism: "", patron: "", stateOfLife: "", call: "", gifts: ["", "", ""] },
      // The Icon Screen: dated results, and the answers of a sitting in progress. Shadow answers are never here.
      icono: { results: [], draft: null },
      diary: {}, journal: {},
      treasury: { currency: "€", income: "", buckets: BUCKETS.map(([name, note, pct]) => ({ name, note, pct })) },
      // The shape of an ordinary day, the person's own fixed commitments, and the first thing for a given date.
      day: { wake: "07:00", workStart: "09:00", workEnd: "17:30", bed: "22:30", workVaries: false, restDay: 0, fixed: [], first: {} },
      // The Guide: the date it was last finished, and the answers of an interview in progress.
      guide: { done: "", draft: null, made: [] }, // made: the practices the Guide itself put in the Rule
      prefs: { pdfVerse: true, region: "general", sundayFeasts: false, name: "", todayView: "list", icsFeasts: false }, meta: { lastBackup: "", calStart: "" }
    };
  }

  // Turns anything (an old save, a backup, a damaged file) into a well-formed state.
  // Unknown keys are dropped, wrong types are replaced by defaults. Used by load and by restore.
  function normalise(raw) {
    const base = blank();
    const obj = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
    const str = (x, max = 4000) => (typeof x === "string" ? x.slice(0, max) : typeof x === "number" && isFinite(x) ? String(x) : "");
    const src = obj(raw);
    if (!Object.keys(src).length) return base;

    const sf = obj(src.fields);
    FIELDS.forEach((f) => {
      const r = obj(sf[f.id]), out = base.fields[f.id];
      const lvl = Math.round(Number(r.level)); out.level = lvl >= 0 && lvl <= 4 ? lvl : 0;
      FIELD_KEYS.forEach((k) => { out[k] = str(r[k]); });
    });

    const fo = obj(src.focus);
    base.focus = fieldById(fo.field) && isISO(fo.since) ? { field: fo.field, since: fo.since } : null;

    if (Array.isArray(src.rule)) {
      const seen = {};
      base.rule = src.rule.slice(0, 200).map((x) => {
        const r = obj(x), text = str(r.text, 300).trim(); if (!text) return null;
        let id = typeof r.id === "string" && /^[a-z0-9]{1,16}$/i.test(r.id) ? r.id : uid();
        while (seen[id]) id = uid(); seen[id] = true;
        const cadence = CADENCES.includes(r.cadence) ? r.cadence : "daily";
        const link = safeURL(r.link);
        const companion = r.companion === "custom" ? (link ? "custom" : "") : compById(r.companion) ? r.companion : "";
        return {
          id, cadence, text, time: typeof r.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) ? r.time : "",
          note: str(r.note, 300), field: fieldById(r.field) ? r.field : "",
          done: typeof r.done === "string" && /^[0-9W-]{4,10}$/.test(r.done) ? r.done : null,
          companion, link: companion === "custom" ? link : "",
          weekday: cadence === "weekly" && Number.isInteger(r.weekday) && r.weekday >= 0 && r.weekday <= 6 ? r.weekday : ""
        };
      }).filter(Boolean);
    }

    if (Array.isArray(src.floor)) base.floor = [0, 1, 2].map((i) => str(src.floor[i], 300));
    base.floorMode = src.floorMode === true;
    const fd = obj(src.floorDay), done = Array.isArray(fd.done) ? fd.done : [];
    base.floorDay = { date: isISO(fd.date) ? fd.date : "", done: [0, 1, 2].map((i) => done[i] === true) };

    const ch = obj(src.church);
    Object.keys(base.church).forEach((k) => { base.church[k] = str(ch[k], 300); });
    if (!CONFESSION.includes(base.church.confession)) base.church.confession = "monthly";

    const st = obj(src.steward), sg = Array.isArray(st.gifts) ? st.gifts : [];
    base.steward = { baptism: isISO(st.baptism) && st.baptism <= todayISO() ? st.baptism : "", patron: str(st.patron, 120),
      stateOfLife: STATES.includes(st.stateOfLife) ? st.stateOfLife : "", call: str(st.call, 300), gifts: [0, 1, 2].map((i) => str(sg[i], 120)) };

    // Icon Screen results are checked one by one; a damaged one is dropped. One result for each date, the newest twelve.
    const ic = obj(src.icono), byDate = {};
    (Array.isArray(ic.results) ? ic.results : []).slice(-60).forEach((x) => { const r = icono.clean(x); if (r && isISO(r.date)) byDate[r.date] = r; });
    base.icono.results = Object.keys(byDate).sort().slice(-12).map((k) => byDate[k]);
    if (ic.draft && typeof ic.draft === "object" && !Array.isArray(ic.draft)) {
      const d = ic.draft, pick = (list, n, ok) => Array.from({ length: n }, (_, i) => (Array.isArray(list) && ok(list[i]) ? list[i] : null));
      base.icono.draft = {
        step: ICO_STEPS.includes(d.step) ? d.step : "p1",
        d: pick(d.d, ICONO.dwelling.questions.length, (v) => Number.isInteger(v) && v >= 0 && v <= 4),
        l: pick(d.l, ICONO.lamps.statements.length, (v) => Number.isInteger(v) && v >= 0 && v <= 3),
        s: (Array.isArray(d.s) ? d.s : []).filter((id, i, arr) => icono.SCENE_IDS.includes(id) && arr.indexOf(id) === i).slice(0, ICONO.icon.pick),
        t: pick(d.t, ICONO.threshold.questions.length, (v) => icono.REGISTER_IDS.includes(v)),
        vice: icono.VICE_IDS.includes(d.vice) ? d.vice : "" // present only when the person asked to keep it
      };
    }

    const di = obj(src.diary);
    Object.keys(di).filter(isISO).slice(-1500).forEach((k) => {
      const e = obj(di[k]), out = {};
      EXAMEN_KEYS.forEach((f) => { const v = str(e[f]); if (v) out[f] = v; });
      if (Object.keys(out).length) base.diary[k] = out;
    });

    const jo = obj(src.journal);
    const lines = (x, n) => { const o = {}, s = Array.isArray(x) ? x : obj(x); for (let i = 0; i < n; i++) { const v = str(s[i], 1000); if (v) o[i] = v; } return o; };
    Object.keys(jo).filter(isISO).slice(-1500).forEach((k) => {
      const e = obj(jo[k]);
      const out = { g: lines(e.g, 7), p: lines(e.p, 3), service: str(e.service, 1000), serviceDone: e.serviceDone === true, light: str(e.light), word: str(e.word, 1000) };
      if (Object.keys(out.g).length || Object.keys(out.p).length || out.service || out.serviceDone || out.light || out.word) base.journal[k] = out;
    });

    const tr = obj(src.treasury), tb = Array.isArray(tr.buckets) ? tr.buckets : [];
    if (typeof tr.currency === "string") base.treasury.currency = tr.currency.slice(0, 4);
    base.treasury.income = str(tr.income, 20);
    base.treasury.buckets.forEach((b, i) => { const x = obj(tb[i]); if (typeof x.pct === "number" || typeof x.pct === "string") b.pct = str(x.pct, 8); });

    const dy = obj(src.day), hhmm = (v, d) => (isTime(v) ? v : d), seenF = {}, old = L.iso(L.shift(new Date(), -7));
    base.day.wake = hhmm(dy.wake, "07:00"); base.day.bed = hhmm(dy.bed, "22:30");
    base.day.workStart = hhmm(dy.workStart, "09:00"); base.day.workEnd = hhmm(dy.workEnd, "17:30");
    base.day.workVaries = dy.workVaries === true;
    base.day.restDay = Number.isInteger(dy.restDay) && dy.restDay >= 0 && dy.restDay <= 6 ? dy.restDay : 0;
    // A commitment belongs to one date or to one weekday. One-off commitments older than a week are let go.
    base.day.fixed = (Array.isArray(dy.fixed) ? dy.fixed : []).slice(0, 200).map((x) => {
      const c = obj(x), title = str(c.title, 120).trim(); if (!title || !isTime(c.start)) return null;
      const weekly = Number.isInteger(c.weekday) && c.weekday >= 0 && c.weekday <= 6, date = !weekly && isISO(c.date) ? c.date : "";
      if (!weekly && (!date || date < old)) return null;
      let id = typeof c.id === "string" && /^[a-z0-9]{1,16}$/i.test(c.id) ? c.id : uid(); while (seenF[id]) id = uid(); seenF[id] = true;
      const end = isTime(c.end) && c.end > c.start ? c.end : c.start < "23:00" ? String(Number(c.start.slice(0, 2)) + 1).padStart(2, "0") + c.start.slice(2) : "23:59";
      return { id, title, start: c.start, end, date, weekday: weekly ? c.weekday : "" };
    }).filter(Boolean).slice(0, 60);
    const fi = obj(dy.first), yesterday = L.iso(L.shift(new Date(), -1));
    Object.keys(fi).filter((k) => isISO(k) && k >= yesterday).sort().slice(0, 4).forEach((k) => { const v = str(fi[k], 200); if (v) base.day.first[k] = v; });

    const gd = obj(src.guide);
    base.guide.done = isISO(gd.done) && gd.done <= todayISO() ? gd.done : "";
    base.guide.draft = GUIDE && gd.draft ? GUIDE.cleanDraft(gd.draft) : null;
    base.guide.made = (Array.isArray(gd.made) ? gd.made : []).filter((id, i, arr) => typeof id === "string" && arr.indexOf(id) === i && base.rule.some((r) => r.id === id)).slice(0, 40);

    const pf = obj(src.prefs); base.prefs.pdfVerse = pf.pdfVerse !== false;
    base.prefs.region = pf.region === "nl" ? "nl" : "general"; base.prefs.sundayFeasts = pf.sundayFeasts === true;
    base.prefs.name = str(pf.name, 60).trim(); base.prefs.todayView = pf.todayView === "day" ? "day" : "list"; base.prefs.icsFeasts = pf.icsFeasts === true;
    const me = obj(src.meta); base.meta.lastBackup = typeof me.lastBackup === "string" && !isNaN(Date.parse(me.lastBackup)) ? new Date(Date.parse(me.lastBackup)).toISOString() : "";
    base.meta.calStart = isISO(me.calStart) && me.calStart <= todayISO() ? me.calStart : "";
    return base;
  }

  let loadFailed = false, unreadable = null;
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return blank(); } // storage is blocked: the app still runs
    if (!raw) return blank();
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("shape");
      return normalise(data);
    } catch (e) { loadFailed = true; unreadable = raw; return blank(); } // start fresh; nothing is written until the user acts
  }
  let state = load();
  let saveTimer = null, storageOK = true, dirty = false, persistAsked = false;
  function writeNow() {
    clearTimeout(saveTimer); if (!dirty) return; dirty = false;
    try {
      if (unreadable != null) { try { localStorage.setItem(KEY + "-unreadable", unreadable); } catch (e) { /* no room for the old copy */ } unreadable = null; }
      localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true;
      if (!persistAsked) { persistAsked = true; try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* optional */ } }
    } catch (e) { if (storageOK) flash("Could not save on this device. Copy a backup from More."); storageOK = false; }
  }
  function save() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(writeNow, 350); }
  // Never lose the last keystroke when the app is closed or put in the background.
  window.addEventListener("pagehide", writeNow);

  const ui = {
    tab: "today", sub: null, open: null, gild: null, toast: null, showPrayer: false, day: null, diaryView: "diary",
    printKind: "rule", printRange: "month", today: todayISO(), mem: {}, later: {}, confirmFocus: null, editRule: null, updated: false,
    cal: null, calView: "month", calDay: null, calFocus: null, calWeek: null,
    // The Icon Screen. The Shadow answers live here, in memory, and nowhere else.
    ico: { view: null, shadow: { a: [], vice: "", keep: false }, sitting: "", del: false }
  };
  const icoReset = () => { ui.ico = { view: null, shadow: { a: [], vice: "", keep: false }, sitting: "", del: false }; };

  function setPath(path, value) {
    if (path.startsWith("rule:")) {
      const [, id, key] = path.split(":");
      const r = state.rule.find((x) => x.id === id);
      if (r && key === "companion") { r.companion = value === "custom" || compById(value) ? value : ""; if (r.companion !== "custom") r.link = ""; }
      return;
    }
    const parts = path.split("."); if (parts.some((p) => UNSAFE.includes(p))) return;
    let o = state;
    for (let i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null || typeof o[parts[i]] !== "object") o[parts[i]] = {}; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = value;
  }
  function flash(msg) {
    ui.toast = msg; const el = document.getElementById("toast");
    if (el) { el.textContent = msg; el.hidden = false; }
    clearTimeout(flash.t); flash.t = setTimeout(() => { ui.toast = null; const e2 = document.getElementById("toast"); if (e2) e2.hidden = true; }, 3200);
  }

  /* ───────── icons (simple line drawings) ───────── */
  const ICONS = {
    lily: "M12 20.5V9.2M12 9.2c0-2.9-2.4-4.8-4.8-4.8 0 2.9 1.9 4.8 4.8 4.8ZM12 9.2c0-2.9 2.4-4.8 4.8-4.8 0 2.9-1.9 4.8-4.8 4.8ZM12 9.2c-1.3-2.3-1.3-5 0-6.7 1.3 1.7 1.3 4.4 0 6.7ZM8.8 20.5h6.4",
    book: "M12 6.6c-1.9-1.5-4.3-1.9-6.6-1.5v12.4c2.3-.4 4.7 0 6.6 1.5 1.9-1.5 4.3-1.9 6.6-1.5V5.1c-2.3-.4-4.7 0-6.6 1.5ZM12 6.6v12.4",
    flame: "M12 20.5c3 0 5-2 5-4.7 0-3.4-2.8-4.5-2.8-7 0-1.2.5-2.2 1.1-2.9-3.8.7-6.6 3.4-6.6 6.9 0 1.3.5 2.3 1.1 3-1.3.2-2 1.2-2 2.3 0 1.5 1.7 2.4 4.2 2.4Z",
    heart: "M12 19.6S4.8 15 4.8 9.9C4.8 7.4 6.7 5.6 9 5.6c1.5 0 2.5.8 3 1.6.5-.8 1.5-1.6 3-1.6 2.3 0 4.2 1.8 4.2 4.3 0 5.1-7.2 9.7-7.2 9.7Z",
    calendar: "M5.5 5h13a2 2 0 0 1 2 2v11.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM3.5 9.8h17M8 3.5v3M16 3.5v3",
    coin: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 7.2v9.6M9.6 9.8h4a1.8 1.8 0 0 1 0 3.6h-3.6a1.8 1.8 0 0 0 0 3.6h4",
    wheat: "M12 20.5V8M12 9.2C10.2 9.2 9 8 9 6.2c1.8 0 3 1.2 3 3Zm0 0c1.8 0 3-1.2 3-3-1.8 0-3 1.2-3 3ZM12 13.2c-1.8 0-3-1.2-3-3 1.8 0 3 1.2 3 3Zm0 0c1.8 0 3-1.2 3-3-1.8 0-3 1.2-3 3ZM12 17.2c-1.8 0-3-1.2-3-3 1.8 0 3 1.2 3 3Zm0 0c1.8 0 3-1.2 3-3-1.8 0-3 1.2-3 3Z",
    lamp: "M6.4 19h11.2l-1.5-6.4H7.9ZM9.6 12.6c0-1.6 1-2.5 2.4-2.5s2.4.9 2.4 2.5M12 10.1V7.8M12 5c.8.8.8 2 0 2.8-.8-.8-.8-2 0-2.8Z",
    leaf: "M5 19c-1.5-6 2.5-12.5 14-13.5C20 12 15.5 19.5 5 19ZM5 19c2.5-4.5 6-7.5 11-9.5",
    pen: "M5 19h3l9.3-9.3a2 2 0 0 0-2.8-2.8L5.2 16.2Z",
    star: "m12 3.6 2.2 6 6.3 1.5-5.2 3.3 1.4 6.4L12 17.2l-4.7 3.6 1.4-6.4L3.5 11l6.3-1.5Z",
    seeds: "M12 6c3.9 0 6.3 2.9 6.3 6.6S15.7 19.7 12 19.7s-6.3-3.3-6.3-7.1S8.1 6 12 6ZM12 6V3.7m0 2.3L10 4.5M12 6l2-1.5",
    scroll: "M6.5 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-11M6.5 4a2 2 0 0 0-2 2v1.6h4M8.5 9.5h7M8.5 13h7M8.5 16.5h4",
    grid: "M4 4h6.5v6.5H4ZM13.5 4H20v6.5h-6.5ZM4 13.5h6.5V20H4ZM13.5 13.5H20V20h-6.5Z",
    more: "M5 12h.01M12 12h.01M19 12h.01",
    moon: "M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z",
    spark: "M12 3.5 13.6 8 18 9.6 13.6 11.2 12 15.7 10.4 11.2 6 9.6 10.4 8Z",
    cross: "M12 3.5v17M6 9.2h12",
    chev: "m9.5 6 6 6-6 6",
    trash: "M4.8 6.6h14.4M9.6 6.6V4.8h4.8v1.8M6.6 6.6l.9 12.6h9l.9-12.6",
    shield: "M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6Z",
    guide: "M5.2 5.5h13.6a1.7 1.7 0 0 1 1.7 1.7v7.6a1.7 1.7 0 0 1-1.7 1.7h-7.3L7.6 20v-3.5H5.2a1.7 1.7 0 0 1-1.7-1.7V7.2a1.7 1.7 0 0 1 1.7-1.7ZM8 9.6h8M8 12.6h5",
    send: "M4.5 12h13M12.5 6.5 18 12l-5.5 5.5"
  };
  const icon = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="${n === "more" ? 2.6 : 1.5}" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[n] || ICONS.spark}"/></svg>`;
  // Ring colours: every field takes the colour of its ring. Gold stays with the centre.
  const rc = (fieldId) => { const R = IL.ringOf(fieldId); return R ? "rc-" + R.colour : ""; };
  const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const upper = (s) => esc(s.charAt(0).toUpperCase() + s.slice(1));
  // A field's badge (third argument) takes its ring colour; other badges stay blue or gold.
  const badge = (n, gold, fieldId) => `<span class="badge ${fieldId && rc(fieldId) ? rc(fieldId) : gold ? "gold" : ""}">${icon(n)}</span>`;
  const fname = (f) => `<span class="fname ${rc(f.id)}">${esc(f.name)}</span>`;
  const ringLegend = () => `<ul class="legend" aria-label="What the colours mean">${RINGS.map((R) => `<li><i class="sw rc-${R.colour}" aria-hidden="true"></i><span><b>${R.name}</b> · ${esc(R.sub)}</span></li>`).join("")}<li><i class="sw centre" aria-hidden="true"></i><span><b>${IL.CENTRE.name}</b> · ${esc(IL.CENTRE.sub)}</span></li></ul>`;
  const ringSub = (R) => `<span class="ringsub"> · ${esc(R.sub)}</span>`;

  /* ───────── the rose window: twelve petals, numbered like the hours ─────────
     One image for assistive technology. The same fields are an ordinary list on the Fields screen. */
  function roseLabel() {
    const lit = FIELDS.filter((f) => state.fields[f.id].level > 0);
    const F = state.focus ? fieldById(state.focus.field) : null;
    return "The twelve fields, drawn as a rose window. " +
      (lit.length ? "Lit: " + lit.map((f) => f.name + ", " + LEVELS[state.fields[f.id].level].toLowerCase()).join("; ") + ". " : "No field is lit yet. ") +
      (lit.length && lit.length < 12 ? (12 - lit.length) + " not yet begun. " : "") +
      (F ? "This season's field: " + F.name + "." : "");
  }
  function rose() {
    const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return [100 + r * Math.sin(a), 100 - r * Math.cos(a)]; };
    const arc = (from, to, R) => { const [x1, y1] = pt(92, from), [x2, y2] = pt(92, to); return `<path class="arc rc-${R.colour}" d="M${x1.toFixed(1)} ${y1.toFixed(1)}A92 92 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`; };
    const petal = "M100 32C111 45 111 63 100 78C89 63 89 45 100 32Z";
    const petals = FIELDS.map((f, i) => {
      const deg = (i + 1) * 30, lvl = state.fields[f.id].level, [nx, ny] = pt(78, deg);
      const focus = state.focus && state.focus.field === f.id ? 1 : 0;
      return `<g class="p ${rc(f.id)}" data-act="gofield" data-f="${esc(f.id)}" data-focus="${focus}">
        <g transform="rotate(${deg} 100 100)"><path class="petal-line" d="${petal}"/><path class="petal-fill" d="${petal}" style="opacity:${lvl / 4}"/></g>
        <text class="num" x="${nx.toFixed(1)}" y="${(ny + 3.2).toFixed(1)}" text-anchor="middle">${f.n}</text></g>`;
    }).join("");
    return `<div class="rosewrap"><svg class="rose" viewBox="0 0 200 200" role="img" aria-label="${esc(roseLabel())}">
      <circle class="ring" cx="100" cy="100" r="86"/>${arc(19, 131, RINGS[0])}${arc(139, 251, RINGS[1])}${arc(259, 371, RINGS[2])}
      ${petals}<circle class="halo" cx="100" cy="100" r="17"/><circle class="core" cx="100" cy="100" r="10"/></svg>${ringLegend()}</div>`;
  }

  /* ───────── shared pieces ───────── */
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekdayName = (r) => (r && r.cadence === "weekly" && Number.isInteger(r.weekday) ? WEEKDAYS[r.weekday] + "s" : "");
  const crisisNote = () => `<div class="pane quiet pad"><p>This app is not medical or pastoral care. If you are thinking of harming yourself, contact your doctor or a crisis line now.</p><p>In the Netherlands: 113 Suicide Prevention, call <a class="out inl" href="tel:113">113</a> or <a class="out inl" href="tel:08000113">0800-0113</a>, or <a class="out inl" href="https://www.113.nl/" target="_blank" rel="noopener noreferrer">113.nl</a>.</p><p style="margin:0">Elsewhere, call your local emergency number.</p></div>`;
  const prettyISO = (isoDate) => fmt(fromISO(isoDate), { day: "numeric", month: "long", year: "numeric" });

  // One way into the Rule for every practice, whoever asks: the Rule screen, a field, the Icon Screen, or IL.api.
  const CAD_ALIAS = { day: "daily", week: "weekly", month: "monthly", year: "yearly" };
  function addPractice(p) {
    const o = p && typeof p === "object" ? p : {};
    const text = String(o.title != null ? o.title : o.text != null ? o.text : "").trim().slice(0, 300); if (!text) return null;
    const cadence = CAD_ALIAS[o.cadence] || (CADENCES.includes(o.cadence) ? o.cadence : "daily");
    let link = o.companion === "custom" ? safeURL(o.link) : "";
    const companion = o.companion === "custom" ? (link ? "custom" : "") : compById(o.companion) ? o.companion : "";
    if (companion !== "custom") link = "";
    let wd = typeof o.weekday === "string" && o.weekday.trim() ? WEEKDAYS.findIndex((n) => n.toLowerCase() === o.weekday.trim().toLowerCase()) : typeof o.weekday === "number" ? o.weekday : -1;
    if (!(cadence === "weekly" && Number.isInteger(wd) && wd >= 0 && wd <= 6)) wd = "";
    const r = { id: uid(), cadence, text, time: typeof o.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(o.time) ? o.time : "",
      note: typeof o.note === "string" ? o.note.slice(0, 300) : "", field: fieldById(o.field) ? o.field : "", done: null, companion, link, weekday: wd };
    state.rule.push(r); save(); return r;
  }
  // Replace part of the state the long way round: merge, normalise, save, draw again.
  function commit(patch) { state = normalise(Object.assign({}, state, patch)); save(); render(); }
  function keepRow(r, doneNow, act, extra) {
    const f = r.field ? fieldById(r.field) : null, c = companionOf(r);
    const btn = (cls) => `<button class="${cls} row keep" data-act="${act}" ${extra} aria-pressed="${doneNow ? "true" : "false"}">
      ${badge(f ? f.icon : "flame", false, f && f.id)}
      <span class="rowtext"><b>${esc(r.text)}</b><span>${[f ? fname(f) : "", weekdayName(r), esc(r.time), r.note && !(f && r.note === f.name) ? esc(r.note) : ""].filter(Boolean).join(" · ")}</span></span>
      <span class="ringc" aria-hidden="true"><svg viewBox="0 0 36 36"><circle class="rt" cx="18" cy="18" r="15"/><circle class="rp" cx="18" cy="18" r="15"/></svg>
      <svg class="tick" viewBox="0 0 24 24"><path d="m7 12.5 3.4 3.4L17 9"/></svg></span></button>`;
    if (!c) return btn("pane");
    return `<div class="pane keepwrap">${btn("")}<p class="keeplink">${outLink(c.url, c.label)}</p></div>`;
  }
  const idOf = (bind) => bind.replace(/[^a-z0-9]/gi, "-");
  const input = (bind, value, ph, label, cls = "", aria = "") => `<label class="fieldset">${label ? `<span class="lab">${esc(label)}</span>` : ""}<input class="in ${cls}" id="i-${esc(idOf(bind))}" data-bind="${esc(bind)}" value="${esc(value)}" placeholder="${esc(ph || "")}"${!label && aria ? ` aria-label="${esc(aria)}"` : ""}></label>`;
  const area = (bind, value, ph, label, rows = 2, aria = "") => `<label class="fieldset">${label ? `<span class="lab">${esc(label)}</span>` : ""}<textarea class="in" id="t-${esc(idOf(bind))}" rows="${rows}" data-bind="${esc(bind)}" placeholder="${esc(ph || "")}"${!label && aria ? ` aria-label="${esc(aria)}"` : ""}>${esc(value)}</textarea></label>`;
  const back = () => `<button class="back" data-act="back">${icon("chev", 16)} Back</button>`;
  const companionOptions = (sel) => `<option value="">No companion</option>${COMPANIONS.map((c) => `<option value="${esc(c.id)}" ${sel === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}<option value="custom" ${sel === "custom" ? "selected" : ""}>Another link</option>`;

  // The greater days ahead: solemnities, feasts of the Lord, and the days the seasons turn on.
  function upcomingFeasts(n) {
    const now = new Date(), t = todayISO();
    return L.feasts(now.getFullYear()).concat(L.feasts(now.getFullYear() + 1)).filter((x) => x.date >= t && (x.rank !== "feast" || x.lord)).slice(0, n);
  }
  const feastName = (u) => esc(L.shortName(u.name)) + (u.moved ? ` <span class="moved">(moved this year)</span>` : "");

  /* ───────── the day in the Church's year ───────── */
  // The calendar follows the saved setting: the general calendar, or the Netherlands.
  const useCalendar = () => L.use({ region: state.prefs.region, sunday: state.prefs.sundayFeasts });
  const litDay = (isoDate) => L.day(fromISO(isoDate));
  // Liturgical colour of the day: a small bead. White is drawn as a ring.
  const bead = (colour) => `<i class="lc lc-${esc(colour)}" aria-hidden="true"></i>`;
  // Rank is shown by weight: solemnity in bold small capitals, feast bold, memorial plain, optional memorial italic.
  const rankClass = (d) => (d.rank === "solemnity" || d.rank === "triduum" ? "rk-s" : d.rank === "feast" || d.rank === "commemoration" || d.major ? "rk-f" : d.rank === "memorial" ? "rk-m" : d.optional.length ? "rk-o" : d.rank === "sunday" ? "rk-sun" : "rk-w");
  const rankWords = (d) => (d.rank === "feast" && d.lord ? "Feast of the Lord" : d.rank === "commemoration" ? "Commemoration, ranked with the solemnities" : d.rankLabel) + (d.proper ? " (proper calendar)" : "");
  const dayLabel = (d) => `${longDate(d.iso)}: ${d.name}, ${rankWords(d).toLowerCase()}, ${d.colourLabel}` + (d.optional.length ? ". May also be kept: " + d.optional.map((o) => o.name).join("; ") : "");
  const dayLine = (isoDate) => { const d = litDay(isoDate); return `<span class="dayfeast">${bead(d.colour)}<span>${esc(L.lineText(d))}</span></span>`; };

  /* ───────── Today ───────── */
  function anchorHints(now) {
    const h = now.getHours(), key = h < 11 ? "morning" : h < 16 ? "midday" : "evening";
    const bits = (ANCHOR_HINTS[key] || []).map(([what, id]) => { const c = compById(id); return c ? `${esc(what)} in ${outLink(c.url, c.name, "out inl")}` : ""; }).filter(Boolean);
    if (!bits.length) return "";
    return `<p class="note hint">${{ morning: "This morning", midday: "At midday", evening: "This evening" }[key]}, if it helps: ${bits.join(", or ")}. <button class="link sm" data-act="sub" data-s="companions">About companions</button></p>`;
  }
  // How many years since Baptism, if today is the anniversary. 29 February is kept on the 28th in other years.
  function baptismYears(now) {
    const b = state.steward.baptism; if (!isISO(b)) return 0;
    const [y, m, d0] = b.split("-").map(Number), leap = new Date(now.getFullYear(), 1, 29).getMonth() === 1, d = m === 2 && d0 === 29 && !leap ? 28 : d0;
    return now.getMonth() + 1 === m && now.getDate() === d && now.getFullYear() > y ? now.getFullYear() - y : 0;
  }
  function Today() {
    const now = new Date(), d = todayISO(), S = L.SEASONS[L.seasonOn(now)];
    const v = verseFor(now);
    const started = state.focus || FIELDS.some((f) => state.fields[f.id].level > 0);
    const F = state.focus ? fieldById(state.focus.field) : null;
    let h = `<section class="stack">
      <div class="pane quiet verse"><h1 class="rub center"><span class="vh">Today, </span>${esc(fmt(now, { weekday: "long", day: "numeric", month: "long" }))}</h1>
        <p class="vtext">“${esc(v.t)}”</p><p class="vref">${esc(v.r)}</p></div>`;
    // Two ways to see today: the list of what to keep, or the day hour by hour. Floor mode shows only the floor.
    if (G && !state.floorMode) {
      h += `<div class="seg" id="today-seg" role="group" aria-label="How to see today">${[["list", "List", "what to keep"], ["day", "Day", "hour by hour"]].map(([k, t, e]) => `<button data-act="todayview" data-v="${k}" aria-pressed="${state.prefs.todayView === k}">${t}<em>${e}</em></button>`).join("")}</div>`;
      if (state.prefs.todayView === "day") return h + G.day() + `</section>`;
    }
    h += `<div class="pane quiet rosepane">${rose()}
        <div><span class="rub">Twelve fields, one steward</span>
          <h2 class="h2">${F ? "This season: " + esc(F.name) : "Everything you hold, on one page"}</h2>
          <p class="sub">Each petal is a field, numbered like the hours. A petal brightens as its practices are kept. It records practice. It does not measure grace or the state of your soul.</p>
          <p class="mt"><button class="link" data-act="tab" data-t="fields">Open the fields</button></p></div></div>`;

    if (!started && !ui.later.begin) {
      h += `<div class="pane lit pad"><span class="rub">Begin here</span><h2 class="h2">Three small steps</h2>
        <ol class="plain"><li><b>Pray first.</b> Ask to see what you have been given, and where you are being asked.</li>
        <li><b>Walk the twelve fields.</b> A quick, honest glance at each.</li>
        <li><b>Choose one field</b> for this season. Add nothing new in the other eleven. Their ordinary duties still hold.</li></ol>
        <div class="btnrow mt"><button class="gold-btn" data-act="sub" data-s="review">Walk the twelve fields</button>
        <button class="pill gold" data-act="toggleprayer" aria-expanded="${ui.showPrayer ? "true" : "false"}">${ui.showPrayer ? "Hide the prayer" : "A prayer to begin"}</button>
        <button class="pill" data-act="later" data-k="begin">Later</button></div>
        ${ui.showPrayer ? `<p class="vtext sm">Lord, show me what you have given me, and where you are asking. Make me faithful in the field I have been avoiding. Amen.</p>` : ""}</div>`;
    }
    if (F) {
      const day = Math.max(1, L.daysBetween(fromISO(state.focus.since), now) + 1), r = state.fields[F.id];
      h += `<button class="pane row link-row field focus" data-act="gofield" data-f="${esc(F.id)}">${badge(F.icon, true, F.id)}
        <span class="rowtext"><b><span class="fnum ${rc(F.id)}">${F.n}</span> · ${esc(F.name)} · day ${day} of about ninety</b>
        <span>${r.spend ? "Spend: " + esc(r.spend) : "Write its four movements: receive, bless, spend, return."}</span>
        ${r.act ? `<span>Next act: ${esc(r.act)}</span>` : ""}</span>${icon("chev", 18)}</button>
        ${day >= 90 && !ui.later.season ? `<div class="pane lit pad"><span class="rub">The season is complete</span><p>Ninety days with one field. Give thanks, look again at the twelve, and ask which field is next.</p><div class="btnrow"><button class="gold-btn" data-act="sub" data-s="review">Review the season</button><button class="pill" data-act="later" data-k="season">Later</button></div></div>` : ""}`;
    }

    const years = baptismYears(now);
    if (years) h += `<div class="pane lit pad" id="baptism-day"><span class="rub">The anniversary of your Baptism</span><h2 class="h2">${years === 1 ? "One year" : years + " years"} a temple of the Holy Spirit</h2>
      <p class="sub">On this day you were made a member of Christ. Give thanks, renew your promises, and light a candle if you can.${state.steward.patron ? " " + esc(state.steward.patron) + ", pray for us." : ""}</p></div>`;

    if (G && !state.floorMode) h += G.todayCard();
    const jt = jGet(d), nThanks = Object.values(jt.g || {}).filter(Boolean).length;
    h += `<button class="pane row link-row" data-act="opendiary">${badge("pen", nThanks > 0)}<span class="rowtext"><b>Today's diary</b><span>${nThanks ? "Begun. Seven thanks, three prayers, one act of service." : "Seven thanks, three prayers, one act of service."}</span></span>${icon("chev", 18)}</button>`;
    // A quiet invitation, until the Icon Screen has been taken once. Hidden in floor mode.
    if (!state.icono.results.length && !state.floorMode) { const dr = state.icono.draft, P = dr ? ICONO.panels[icoPanelOf(dr.step)] : null;
      h += `<button class="pane row link-row" id="today-icon" data-act="sub" data-s="icon">${badge("spark", false)}<span class="rowtext"><b>${dr ? "Go on with the Icon Screen" : "The Icon Screen"}</b><span>${dr ? "Your place is kept: Panel " + P.n + " of V, " + esc(P.name) + "." : "A mirror in five panels. About twenty minutes, once a year."}</span></span>${icon("chev", 18)}</button>`; }
    h += `<div class="pane pad switchrow"><div><b id="floor-lab">Floor mode</b><p class="note">For hard weeks. Today shows only your three floor lines. Nothing is counted against you.</p></div>
      <label class="switch"><input type="checkbox" id="floor-mode" data-toggle="floorMode" ${state.floorMode ? "checked" : ""} aria-labelledby="floor-lab"><span></span></label></div>`;

    if (state.floorMode) {
      if (state.floorDay.date !== d) state.floorDay = { date: d, done: [false, false, false] };
      h += `<div class="secrow"><h2 class="h2">Your floor</h2><button class="pill" data-act="tab" data-t="rule">Edit</button></div>`;
      h += state.floor.map((t, i) => t ? keepRow({ text: t, note: "", time: "" }, state.floorDay.done[i], "floorkeep", `data-i="${i}"`) : "").join("");
      h += `<p class="creed">The absence of feeling is not the absence of God.</p>`;
    } else {
      const daily = state.rule.filter((r) => r.cadence === "daily").sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
      h += `<div class="secrow"><h2 class="h2">Today</h2><button class="pill" data-act="tab" data-t="rule">Edit the Rule</button></div>`;
      h += daily.length ? daily.map((r) => keepRow(r, r.done === periodKey("daily"), "keep", `data-id="${esc(r.id)}"`)).join("") : `<p class="sub">No daily practices yet. Add one in your Rule.</p>`;
      h += anchorHints(now);
      const longer = state.rule.filter((r) => r.cadence !== "daily").sort((a, b) => CADENCES.indexOf(a.cadence) - CADENCES.indexOf(b.cadence));
      if (longer.length) {
        h += `<h2 class="h2 mt">This week, this month, this year</h2>`;
        h += longer.map((r) => keepRow(Object.assign({}, r, { note: [r.cadence, r.note].filter(Boolean).join(" · ") }), r.done === periodKey(r.cadence), "keep", `data-id="${esc(r.id)}"`)).join("");
      }
    }
    const up = upcomingFeasts(3);
    h += `<h2 class="h2 mt">The Church's year</h2><div class="pane pad">${up.map((u) => {
      const n = L.daysBetween(now, fromISO(u.date));
      return `<div class="fline"><span>${feastName(u)}</span><span class="fd">${n === 0 ? "today" : n === 1 ? "tomorrow" : esc(pretty(fromISO(u.date)))}</span></div>`;
    }).join("")}</div>
      <p class="creed">${esc(S.name)}. ${esc(S.asks)}</p></section>`;
    return h;
  }

  /* ───────── Fields ───────── */
  function focusControl(f) {
    const cur = state.focus ? fieldById(state.focus.field) : null;
    if (cur && cur.id === f.id) return `<span class="tag">This season's field</span>`;
    if (ui.confirmFocus === f.id && cur) return `<div class="confirm" role="group" aria-label="Change the season's field"><p>Change this season's field from ${esc(cur.name)} to ${esc(f.name)}? The ninety days begin again.</p>
      <div class="btnrow"><button class="gold-btn" data-act="focusyes" data-f="${esc(f.id)}">Yes, change it</button><button class="pill" data-act="focusno" data-f="${esc(f.id)}">Keep ${esc(cur.name)}</button></div></div>`;
    return "";
  }
  function fieldCard(f) {
    const r = state.fields[f.id], lvl = r.level, open = ui.open === f.id;
    const isFocus = state.focus && state.focus.field === f.id;
    let h = `<div class="pane field ${rc(f.id)} ${open ? "open" : ""} ${isFocus ? "focus" : ""} ${ui.gild === f.id ? "gilding" : ""}" id="field-${esc(f.id)}">
      <button class="row field-head" data-act="open" data-f="${esc(f.id)}" aria-expanded="${open}" aria-controls="fieldbody-${esc(f.id)}">
        <span class="lampwrap">${badge(f.icon, lvl > 0, f.id)}<svg class="lamp" viewBox="0 0 44 44" aria-hidden="true"><circle class="lt" cx="22" cy="22" r="20"/><circle class="lp" cx="22" cy="22" r="20" style="stroke-dashoffset:${125.6 - 125.6 * (lvl / 4)}"/></svg></span>
        <span class="rowtext"><b><span class="fnum">${f.n}</span> · ${esc(f.name)}</b><span>${LEVELS[lvl]}${isFocus ? " · this season's field" : ""}</span></span>
        <span class="chev">${icon("chev", 18)}</span></button>`;
    if (!open) return h + `</div>`;
    h += `<div class="field-body" id="fieldbody-${esc(f.id)}">
      <p class="sub">${esc(f.holds)}</p>
      <span class="rub">What it is for</span><p class="telos">${esc(f.end)}</p>
      <span class="rub">The disorder to watch for</span><p class="disorder">${esc(f.disorder)}</p>
      ${f.care ? `<p class="care">${esc(f.care)}</p>` : ""}
      <span class="rub">Examine</span><ul class="quest">${f.examine.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>
      <span class="rub">The four movements</span>
      <div class="moves">${MOVES.map((m) => `<div class="move"><div class="mh"><b>${m.name}</b><em>${m.verb}</em></div><p>${esc(m.ask)}</p>
        <textarea class="in" rows="2" id="mv-${esc(f.id)}-${m.id}" data-bind="fields.${esc(f.id)}.${m.id}" placeholder="${esc(m.ph)}" aria-label="${m.name}: ${esc(f.name)}">${esc(r[m.id])}</textarea>
        ${m.id === "spend" ? `<div class="btnrow mt"><select class="in fix" id="cad-${esc(f.id)}" aria-label="How often" style="width:auto"><option value="daily">daily</option><option value="weekly" selected>weekly</option><option value="monthly">monthly</option></select><button class="pill gold" data-act="place" data-f="${esc(f.id)}">Place this in my Rule</button></div>` : ""}</div>`).join("")}</div>
      <span class="rub">The ladder</span>
      <ol class="ladder">${f.rungs.map((t, i) => `<li class="${i < lvl ? "done" : i === lvl ? "now" : ""}"><span class="rn">${i + 1}</span><span class="rt2">${esc(t)}</span>${i === lvl ? `<button class="pill gold" data-act="climb" data-f="${esc(f.id)}" aria-label="Kept: ${esc(t)}">Kept</button>` : ""}</li>`).join("")}</ol>
      <p class="note">A light records a practice kept. It does not measure grace or the state of your soul.</p>
      <p class="mastery"><span class="rub inl">Radiant looks like</span>${esc(f.radiant)}</p>
      ${area(`fields.${f.id}.act`, r.act, "Small, dated, possible this week.", "My one next act")}
      <div class="btnrow">${focusControl(f) || `<button class="gold-btn" data-act="focus" data-f="${esc(f.id)}">Make this my field for the season</button>`}</div>
      <blockquote class="quote">“${esc(f.verse.t)}”<cite>${esc(f.verse.r)} · Catechism ${esc(f.ccc)}</cite></blockquote>
    </div></div>`;
    return h;
  }
  function Fields() {
    return `<section class="stack"><h1 class="h1">The Twelve Fields</h1>
      <p class="lede">Everything you have been given, in three rings. God ordinarily asks about one field at a time.</p>
      ${ringLegend()}
      <p><button class="link" data-act="sub" data-s="model">How the model works</button></p>
      ${RINGS.map((R) => `<div class="ringhead rc-${R.colour}"><span class="rub">${R.says} · ${R.hours}</span><h2 class="h2"><i class="sw" aria-hidden="true"></i>${R.name}${ringSub(R)}</h2><p class="sub">${esc(R.gloss)}</p></div>
        ${FIELDS.filter((f) => f.ring === R.id).map(fieldCard).join("")}`).join("")}</section>`;
  }

  /* ───────── Rule ───────── */
  // The steward: three threads through all twelve fields. What you are, the shape your life is given, what you bring.
  function stewardCard() {
    const S = state.steward, T = IL.THREADS, latest = icoLatest(), sum = latest ? icono.lampSummary(latest.lamps) : null;
    const head = (t) => `<h3 class="h3">${esc(t.name)}<span class="ringsub"> · ${esc(t.says)}</span></h3><p class="sub">${esc(t.text)}</p>`;
    const chips = latest ? latest.charisms.map((id) => ICONO.charisms.find((c) => c.id === id).name).concat(sum.awake.map((id) => ICONO.gifts.find((g) => g.id === id).name)) : [];
    return `<h2 class="h2 mt" id="steward">The steward</h2>
      <div class="pane pad steward"><p class="sub">Three threads run through all twelve fields. Write here what is true of you. All of it is optional.</p>
        <div class="thread">${head(T[0])}
          <div class="frow mt"><label class="fieldset"><span class="lab">The date of my Baptism</span><input class="in" type="date" id="st-baptism" data-bind="steward.baptism" value="${esc(isISO(S.baptism) ? S.baptism : "")}" max="${esc(todayISO())}"></label>
            ${input("steward.patron", S.patron, "e.g. St Willibrord", "My patron saint")}</div>
          <p class="note below">If you give the date, Today marks the anniversary each year, and your calendar file includes it.</p></div>
        <div class="thread">${head(T[1])}
          <div class="mt"><label class="fieldset"><span class="lab">My state of life</span><select class="in" id="st-state" data-bind="steward.stateOfLife">${IL.STATES_OF_LIFE.map(([v, l]) => `<option value="${esc(v)}" ${S.stateOfLife === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
            ${input("steward.call", S.call, "A sentence is enough", "My particular call, in my own words")}</div></div>
        <div class="thread">${head(T[2])}
          <div class="mt">${[0, 1, 2].map((i) => input(`steward.gifts.${i}`, S.gifts[i], i === 0 ? "A gift, in my own words" : "", `Gift ${i + 1}`)).join("")}</div>
          ${chips.length ? `<p class="lab">From the Icon Screen, ${esc(prettyISO(latest.date))}</p><p class="chips">${chips.map((c) => `<span class="tag">${esc(c)}</span>`).join("")}</p><p class="note">Provisional. Ask the people you have served.</p>` : `<p class="note">The Icon Screen can suggest where to look.</p>`}
          <button class="link" data-act="sub" data-s="icon">Open the Icon Screen</button></div>
        <p class="steward-line">${esc(IL.THREADS_LINE)}</p></div>`;
  }
  function Rule() {
    const group = (c, title) => {
      const rows = state.rule.filter((r) => r.cadence === c);
      return `<h2 class="h2 mt">${title}</h2>${rows.length ? `<div class="pane">${rows.map((r) => {
        const f = r.field ? fieldById(r.field) : null, comp = companionOf(r), edit = ui.editRule === r.id, id = esc(r.id);
        return `<div class="rulerow"><div class="row">${badge(f ? f.icon : "flame", false, f && f.id)}<span class="rowtext"><b>${esc(r.text)}</b><span>${[f ? fname(f) : "", weekdayName(r), esc(r.time), r.note && !(f && r.note === f.name) ? esc(r.note) : ""].filter(Boolean).join(" · ")}</span>${comp ? `<span class="withc">With ${esc(comp.name)}</span>` : ""}</span>
          <button class="icobtn" data-act="editrule" data-id="${id}" aria-expanded="${edit}" aria-label="Companion for ${esc(r.text)}">${icon("pen", 18)}</button><button class="icobtn" data-act="delrule" data-id="${id}" aria-label="Remove ${esc(r.text)}">${icon("trash", 18)}</button></div>
          ${edit ? `<div class="ruleedit"><label class="fieldset"><span class="lab">Companion app</span><select class="in" id="rc-${id}" data-bind="rule:${id}:companion" data-rerender="1">${companionOptions(r.companion)}</select></label>
            ${r.companion === "custom" ? `<label class="fieldset"><span class="lab">Link</span><input class="in" id="rl-${id}" type="url" inputmode="url" autocomplete="off" data-link="${id}" value="${esc(r.link)}" placeholder="https://"></label>` : ""}
            <p class="note">Today will show a small link beside this practice. The link opens the other app or its website.</p></div>` : ""}</div>`;
      }).join("")}</div>` : `<p class="sub">Nothing here yet.</p>`}`;
    };
    const c = state.church;
    return `<section class="stack"><h1 class="h1">Rule of Life</h1>
      <p class="lede">A trellis, not a cage. Small enough to keep in your worst week.</p>
      ${G ? `<button class="pane row link-row" id="rule-guide" data-act="sub" data-s="guide">${badge("guide", false)}<span class="rowtext"><b>${state.guide.done ? "Revisit the Guide" : "Build my Rule with the Guide"}</b><span>Plain questions, one at a time. It drafts, you decide.</span></span>${icon("chev", 18)}</button>` : ""}
      <div class="pane lit pad"><span class="rub">The floor</span><p class="sub">Three lines you will keep when everything else falls away. Decide them now, in a good hour.</p>
        <div class="mt">${[0, 1, 2].map((i) => input(`floor.${i}`, state.floor[i], "A line of your floor", `Line ${i + 1}`)).join("")}</div></div>
      ${group("daily", "Each day")}${group("weekly", "Each week")}${group("monthly", "Each month")}${group("yearly", "Each year")}
      <div class="pane pad mt"><span class="rub">Add a practice</span>
        <div class="frow"><input class="in" id="new-text" placeholder="What, exactly" aria-label="Practice" maxlength="300"><input class="in tm fix" id="new-time" type="time" aria-label="Time"></div>
        <div class="frow"><select class="in" id="new-cad" aria-label="How often">${CADENCES.map((k) => `<option value="${k}">${k}</option>`).join("")}</select>
          <select class="in" id="new-field" aria-label="Field">${FIELDS.map((f) => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join("")}</select></div>
        <div class="frow"><select class="in" id="new-comp" aria-label="Companion app">${companionOptions("")}</select>
          <input class="in" id="new-link" type="url" inputmode="url" autocomplete="off" placeholder="https://" aria-label="Link" hidden>
          <button class="gold-btn fix" data-act="addrule">Add</button></div>
        <p class="note">Give it a time and a place. One new practice at a time. A companion is optional: another app that gives you the prayer itself.</p></div>
      ${stewardCard()}
      <h2 class="h2 mt">In the Body</h2>
      <div class="pane pad"><p class="sub">No one is saved alone. Name the places and people that hold you.</p><div class="mt">
        ${input("church.parish", c.parish, "e.g. St Nicholas, Amsterdam", "My parish")}
        <label class="fieldset"><span class="lab">Confession</span><select class="in" id="conf" data-bind="church.confession">${CONFESSION.map((o) => `<option ${c.confession === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>
        <p class="note below">Mortal sin needs the sacrament of Reconciliation, not a habit. If unsure, ask a confessor.</p>
        ${input("church.ahead", c.ahead, "A director, a confessor, an older witness", "Someone ahead of me")}
        ${input("church.beside", c.beside, "A friend who knows the truth and says it", "Someone beside me")}
        ${input("church.behind", c.behind, "Someone I am helping along", "Someone behind me")}
        <div class="frow">${input("church.shownTo", c.shownTo, "A rule written alone is a rumour", "I have shown this Rule to")}${input("church.shownOn", c.shownOn, "date", "On")}</div></div></div>
      <h2 class="h2 mt">The Church's own minimum</h2>
      <div class="pane pad"><p class="sub">The five precepts are the floor beneath every floor (Catechism 2041-2043).</p><ol class="plain mt">${PRECEPTS.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></div>
      ${canSave() || !PREVIEW ? `<div class="btnrow mt">${canSave() ? `<button class="gold-btn" data-act="ics">Add my Rule to my calendar</button>` : ""}${PREVIEW ? "" : `<button class="pill gold" data-act="print">Print my Rule</button>`}</div>
        <p class="note">The calendar file opens in Apple Calendar, Google Calendar or Outlook. There is only one life, so use your one calendar.</p>${G ? `<p style="margin:0"><button class="link" data-act="sub" data-s="calendar">How it works, and what is in the file</button></p>` : ""}` : `<p class="note">In the full app you can add your Rule to your calendar and print it.</p>`}
      <p class="creed">I decided in a clear hour. Today I only keep the appointment.</p>
    </section>`;
  }

  /* ───────── Examen ───────── */
  function Examen() {
    const d = todayISO(), e = state.diary[d] || {};
    const past = Object.keys(state.diary).filter((k) => k !== d && isISO(k) && Object.values(state.diary[k]).some(Boolean)).sort().reverse().slice(0, 60);
    const box = (s, key, ph) => (key ? area(`diary.${d}.${key}`, e[key], ph, "", 2, s.name + ": " + String(ph || "").replace(/[.:]+$/, "")) : "");
    return `<section class="stack"><h1 class="h1">Evening Examen</h1>
      ${diarySeg()}
      <p class="lede">Five minutes. Gentle. This is medicine, not an audit. If a step distresses you, skip it.</p>
      <div class="pane pad">${EXAMEN.map((s, i) => `<div class="step"><h2 class="h3"><span class="n">${i + 1}</span>${esc(s.name)}</h2><p>${esc(s.text)}</p>
        ${box(s, s.field, s.ph)}
        ${s.mem ? `<label class="fieldset"><span class="lab">${esc(s.memLabel)}</span><textarea class="in" id="mem-${esc(s.mem)}" rows="2" data-mem="${esc(s.mem)}" placeholder="${esc(s.memPh)}" autocomplete="off">${esc(ui.mem[s.mem])}</textarea></label>
          <p class="note below">${esc(s.memNote)} <b>${esc(s.memSmall)}</b></p>` : ""}
        ${box(s, s.field2, s.ph2)}${box(s, s.field3, s.ph3)}</div>`).join("")}</div>
      <p class="note">What you write stays on this device. The line for mercy is not kept at all. The examen never replaces confession. Mortal sin needs the sacrament of Reconciliation.</p>
      ${past.length ? `<h2 class="h2 mt">Earlier evenings</h2><div class="pane pad">${past.map((k) => { const x = state.diary[k];
        return `<details class="entry"><summary>${esc(longDate(k))}</summary>
        ${[["Thanks", x.thanks], ["Alive", x.alive], ["Tight", x.tight], ["Wound", x.wound], ["Limit", x.limit], ["Tomorrow", x.tomorrow]].filter((p) => p[1]).map((p) => `<p><span class="rub inl">${p[0]}</span>${esc(p[1])}</p>`).join("")}</details>`; }).join("")}</div>` : ""}
    </section>`;
  }

  /* ───────── Diary: seven thanks, three prayers, one act of service ───────── */
  const diarySeg = () => `<div class="seg" role="group" aria-label="Diary or Examen">${[["diary", "Diary", "thanks, prayer, service"], ["examen", "Examen", "the evening review"]].map(([v, t, e]) => `<button data-act="diaryview" data-v="${v}" aria-pressed="${ui.diaryView === v}">${t}<em>${e}</em></button>`).join("")}</div>`;
  const jGet = (d) => state.journal[d] || {};
  const jHas = (j) => !!(j && (Object.values(j.g || {}).some(Boolean) || Object.values(j.p || {}).some(Boolean) || j.service || j.light || j.word));
  const ROMAN7 = ["i", "ii", "iii", "iv", "v", "vi", "vii"];
  const viewDay = () => { const t = todayISO(); return ui.day && isISO(ui.day) && ui.day <= t ? ui.day : t; };
  const isEvening = () => new Date().getHours() >= 17;

  function Diary() {
    if (ui.diaryView === "examen") return Examen();
    const t = todayISO(), d = viewDay(), j = jGet(d), g = j.g || {}, pr = j.p || {};
    const v = verseFor(fromISO(d));
    const yest = L.iso(L.shift(fromISO(d), -1)), yp = jGet(yest).p || {};
    const canCarry = !Object.values(pr).some(Boolean) && Object.values(yp).some(Boolean);
    const past = Object.keys(state.journal).filter((k) => k !== d && isISO(k) && jHas(state.journal[k])).sort().reverse().slice(0, 90);
    return `<section class="stack"><h1 class="h1">Diary</h1>
      ${diarySeg()}
      <p class="lede">Seven thanks, three prayers, one act of service. A few minutes, any time of day.</p>
      <div class="pane quiet pad datebar"><button class="pill" data-act="dayshift" data-n="-1" aria-label="The day before">Earlier</button>
        <b class="dayname">${esc(longDate(d))}</b>
        ${d === t ? `<span class="tag">Today</span>` : `<button class="pill gold" data-act="daytoday">Today</button>`}${dayLine(d)}</div>
      <div class="pane pad"><span class="rub">Receive</span><h2 class="h2">Seven things I am grateful for</h2>
        <p class="sub">Name them one by one. Small ones count. Gratitude is the plain recognition that this was not mine first.</p>
        <div class="mt">${ROMAN7.map((r, i) => `<div class="gline"><span class="gnum" aria-hidden="true">${r}</span><input class="in" id="g-${i}" data-bind="journal.${esc(d)}.g.${i}" value="${esc(g[i])}" placeholder="${i === 0 ? "Thank you for…" : ""}" aria-label="Gratitude ${i + 1} of 7" maxlength="1000"></div>`).join("")}</div></div>
      <div class="pane pad"><span class="rub">Ask</span><h2 class="h2">Three things I am praying for</h2>
        <p class="sub">A person, a need, a grace. Name them, and hand them over.</p>
        <div class="mt">${[0, 1, 2].map((i) => `<div class="gline"><span class="gnum" aria-hidden="true">${ROMAN7[i]}</span><input class="in" id="p-${i}" data-bind="journal.${esc(d)}.p.${i}" value="${esc(pr[i])}" placeholder="${i === 0 ? "Lord, I bring you…" : ""}" aria-label="Prayer intention ${i + 1} of 3" maxlength="1000"></div>`).join("")}</div>
        ${canCarry ? `<button class="pill gold" data-act="carry" data-d="${esc(d)}">Carry yesterday's three forward</button>` : ""}</div>
      <div class="pane pad"><span class="rub">Spend</span><h2 class="h2">One act of service</h2>
        <p class="sub">For whom, and what. Small, concrete, and unannounced.</p>
        <div class="mt">${input(`journal.${d}.service`, j.service, "Today I will…", "", "", "One act of service")}</div>
        <label class="check"><input type="checkbox" id="svc-done" data-check="journal.${esc(d)}.serviceDone" ${j.serviceDone ? "checked" : ""}><span>Done, and given back to God</span></label></div>
      <div class="pane pad"><span class="rub">Return</span><h2 class="h2">Where I saw light today</h2>
        ${area(`journal.${d}.light`, j.light, "A moment, a face, a sentence. Where God was near.", "", 2, "Where I saw light today")}
        ${input(`journal.${d}.word`, j.word, v.t, "A word I am carrying")}
        <p class="note">If the line is empty, the verse of the day is offered: ${esc(v.r)}.</p></div>
      <p class="handoff" id="handoff" ${d === t && isEvening() && jHas(j) ? "" : "hidden"}>Saved. When you are ready, <button class="link" data-act="diaryview" data-v="examen">go on to the evening Examen</button>.</p>
      <div class="pane lit pad"><span class="rub">Keep it</span><h2 class="h2">Save my diary as a PDF</h2>
        ${PREVIEW ? `<p class="sub">In the full app you can save your diary as a PDF, by day, week or month.</p>` : `<p class="sub">Choose what to include. In the window that opens, choose <b>Save as PDF</b> (on iPhone: Share, then Print, then pinch the preview open and share it).</p>
        <div class="btnrow mt"><select class="in fix" id="print-range" aria-label="What to include" style="width:auto">${[["day", "This day"], ["week", "The last seven days"], ["month", "The last thirty days"], ["all", "Everything"]].map(([k, l]) => `<option value="${k}" ${ui.printRange === k ? "selected" : ""}>${l}</option>`).join("")}</select>
        <button class="gold-btn" data-act="printdiary" data-d="${esc(d)}">Save as PDF</button></div>
        <label class="check mt"><input type="checkbox" id="pdf-verse" data-check="prefs.pdfVerse" ${state.prefs.pdfVerse ? "checked" : ""}><span>Where my word is empty, print the verse of the day</span></label>`}
        <p class="note mt">Your diary stays on this device. Nothing is sent anywhere.</p></div>
      ${past.length ? `<h2 class="h2 mt">Earlier days</h2><div class="pane pad">${past.map((k) => { const x = state.journal[k];
        return `<details class="entry"><summary>${esc(longDate(k))}</summary>
          ${Object.values(x.g || {}).filter(Boolean).length ? `<p><span class="rub inl">Thanks</span>${Object.values(x.g).filter(Boolean).map(esc).join(" · ")}</p>` : ""}
          ${Object.values(x.p || {}).filter(Boolean).length ? `<p><span class="rub inl">Prayer</span>${Object.values(x.p).filter(Boolean).map(esc).join(" · ")}</p>` : ""}
          ${x.service ? `<p><span class="rub inl">Service</span>${esc(x.service)}${x.serviceDone ? " (done)" : ""}</p>` : ""}
          ${x.light ? `<p><span class="rub inl">Light</span>${esc(x.light)}</p>` : ""}
          <p><button class="link" data-act="dayopen" data-d="${esc(k)}">Open this day</button></p></details>`; }).join("")}</div>` : ""}
    </section>`;
  }

  function DiaryBook() {
    const d = viewDay(), span = { day: 0, week: 6, month: 29 }[ui.printRange];
    const from = span == null ? "0000" : L.iso(L.shift(fromISO(d), -span));
    const days = Object.keys(state.journal).filter((k) => isISO(k) && jHas(state.journal[k]) && (ui.printRange === "all" || (k >= from && k <= d))).sort();
    const list = (o) => Object.values(o || {}).filter(Boolean);
    return `<div class="bp bcover"><p>A DIARY OF GRATITUDE</p><h1>Illuminated Life</h1><p><i>Receive, bless, spend, return.</i></p>
        <p>${days.length ? esc(days.length === 1 ? longDate(days[0]) : pretty(fromISO(days[0])) + " to " + longDate(days[days.length - 1])) : ""}</p></div>
      <div class="bp">${days.length ? days.map((k) => { const x = state.journal[k], vv = verseFor(fromISO(k));
        return `<div class="ba bday"><h2>${esc(longDate(k))}</h2><p class="blit">${esc(L.lineText(litDay(k)))}</p>
          ${list(x.g).length ? `<h3>I am grateful for</h3><ol>${list(x.g).map((v) => `<li>${esc(v)}</li>`).join("")}</ol>` : ""}
          ${list(x.p).length ? `<h3>I am praying for</h3><ul>${list(x.p).map((v) => `<li>${esc(v)}</li>`).join("")}</ul>` : ""}
          ${x.service ? `<h3>An act of service</h3><p>${esc(x.service)}${x.serviceDone ? " (done)" : ""}</p>` : ""}
          ${x.light ? `<h3>Where I saw light</h3><p>${esc(x.light)}</p>` : ""}
          ${x.word ? `<h3>A word I am carrying</h3><p><i>${esc(x.word)}</i></p>` : state.prefs.pdfVerse ? `<h3>The verse of the day</h3><p><i>${esc(vv.t)}</i> (${esc(vv.r)})</p>` : ""}</div>`; }).join("") : "<p>No diary pages in this range yet.</p>"}</div>`;
  }

  /* ───────── More ───────── */
  const MORE = [
    ...(GUIDE ? [["guide", "The Guide", "Plain questions that build a first Rule and a plan for the day", "guide"]] : []),
    ["model", "The Steward's Model", "Lamp, temple, house, field. Twelve fields, four movements, six laws", "spark"],
    ["icon", "The Icon Screen", "A mirror in five panels: where you are, what you were given, what it is for", "lamp"],
    ["review", "Season review", "Walk the twelve fields and choose one", "grid"],
    ["year", "The Church's year", "The whole calendar, day by day", "calendar"],
    ...(GUIDE ? [["calendar", "Into my calendar", "Hand your Rule to Apple, Google or Outlook as a file", "send"]] : []),
    ["treasury", "The Treasury", "First fruits, and an order for the rest", "coin"],
    ["prayers", "Prayers of the steward", "Morning, night, and the hard days", "flame"],
    ["companions", "Companions", "Other Catholic apps that give you the prayers themselves", "star"],
    ["backup", "Keep my words safe", "Back up, restore, or erase what is on this device", "shield"],
    ["about", "About this app", "What it is, and what it must never become", "book"]
  ];
  const SUBS = { model: Model, icon: Icono, review: Review, year: Year, treasury: Treasury, prayers: Prayers, companions: Companions, backup: Backup, about: About };
  if (GUIDE) { SUBS.guide = () => G.guide(); SUBS.calendar = () => G.calendar(); }
  function More() {
    if (!ui.sub || !SUBS[ui.sub]) return `<section class="stack"><h1 class="h1">More</h1><p class="lede">The model beneath the app, and the tools around it.</p>
      ${MORE.map(([id, t, s, ic]) => `<button class="pane row link-row" data-act="sub" data-s="${id}">${badge(ic, id === "model")}<span class="rowtext"><b>${t}</b><span>${s}</span></span>${icon("chev", 18)}</button>`).join("")}</section>`;
    return `<section class="stack">${back()}${SUBS[ui.sub]()}</section>`;
  }

  // The picture of the model: a small church. The lamp at its heart, the arch of the temple, the walls of the house, the furrows of the field.
  function churchPicture() {
    const sprout = (x, y) => `<path class="w" d="M${x} ${y}v-9M${x} ${y - 5}c-3.2-.6-4.6-2.6-4.6-5.2M${x} ${y - 5}c3.2-.6 4.6-2.6 4.6-5.2"/>`;
    return `<svg class="church" viewBox="0 0 320 236" role="img" aria-label="${esc(IL.PICTURE.alt)}">
      <path class="hf" d="M104 190V100l56-54 56 54v90Z"/>
      <path class="pf" d="M128 190v-62c0-22 16-34 32-46 16 12 32 24 32 46v62Z"/>
      <circle class="halo" cx="160" cy="112" r="24"/>
      <path class="w" d="M10 190h94M216 190h94"/>
      <path class="w" d="M150 191c-8 14-34 28-92 37M170 191c8 14 34 28 92 37M157 191c-2 12-8 26-18 39M163 191c2 12 8 26 18 39"/>
      <path class="w thin" d="M18 204c28-5 56-6 84-3M302 204c-28-5-56-6-84-3M10 219c22-5 44-7 64-7M310 219c-22-5-44-7-64-7"/>
      ${sprout(36, 190)}${sprout(62, 190)}${sprout(228, 190)}${sprout(246, 190)}
      <path class="h" d="M93 110.5 160 46l67 64.5M104 100v90M216 100v90M104 190h24M192 190h24"/>
      <path class="g" d="M160 46V25M153 32h14"/>
      <path class="p" d="M128 190v-62c0-22 16-34 32-46 16 12 32 24 32 46v62"/>
      <path class="g thin" d="M160 82v13M160 95l-7 20M160 95l7 20"/>
      <path class="g" d="M152 115h16c0 6-3.2 9.5-8 9.5s-8-3.5-8-9.5Z"/>
      <path class="flame" d="M160 113.5c3-3.2 2.6-6.8 0-10-2.6 3.2-3 6.8 0 10Z"/>
      <path class="g" d="M151 170v-17a9 9 0 0 1 18 0v17M160 154v10M156 158h8M141 170h38M146 170v20M174 170v20"/>
      <g class="lbl"><text class="tl-g" x="14" y="112">the lamp</text><path class="g thin" d="M66 108h68"/>
        <text class="tl-p" x="306" y="150" text-anchor="end">the temple</text><path class="p thin" d="M194 146h50"/>
        <text class="tl-h" x="14" y="66">the house</text><path class="h thin" d="M72 62h54l8 8"/>
        <text class="tl-w" x="306" y="183" text-anchor="end">the field</text></g>
    </svg>`;
  }
  function Model() {
    const P = IL.PICTURE, C = IL.CHRIST;
    return `<h1 class="h1">The Steward's Model</h1>
      <p class="lede">One Lord at the centre. One steward. Twelve fields in three rings. In every field the same four movements.</p>
      <div class="pane quiet pad picture"><span class="rub center">The picture of the model</span><h2 class="h2 center">${esc(P.title)}</h2>
        ${churchPicture()}
        <p class="pictext">${esc(P.text)}</p>
        ${ringLegend()}
        <p class="note center">The Lamb is its lamp (${esc(IL.CENTRE.subRef)}). ${RINGS.map((R) => upper(R.sub) + ": " + esc(R.subRef)).join(". ")}.</p></div>
      <div class="pane quiet rosepane">${rose()}<div><span class="rub">Read it like a clock</span><p class="sub">The same model, drawn as a rose window. Hours I to IV are the Person: what I am. V to VIII are the Household: what I keep. IX to XII are the World: what I give. The centre is not yours to light. It is Christ, who is the light.</p></div></div>
      <h2 class="h2 mt">The centre</h2><div class="prose"><p>At the centre is not a goal or a best self. It is a Person. The servant who buried his talent said: I knew you to be a hard man, and I was afraid (Matthew 25:24-25). His failure began with a false picture of the master. Fear buries. Trust invests.</p></div>
      <h2 class="h2 mt">Christ at the centre</h2><p class="lede sm">${esc(C.intro)}</p>
      <div class="ccards">${C.cards.map((c) => `<div class="pane pad ccard"><h3 class="h3">${esc(c.title)}</h3>${c.caution ? `<p class="caution">${esc(c.caution)}</p>` : ""}<p>${esc(c.text)}</p><p class="vref">${esc(c.ref)}</p></div>`).join("")}</div>
      <h2 class="h2 mt">Three rings</h2>${RINGS.map((R) => `<div class="pane pad ringcard rc-${R.colour}"><span class="rub">${R.says} · ${R.hours}</span><h3 class="h3"><i class="sw" aria-hidden="true"></i>${R.name}${ringSub(R)}</h3><p class="sub">${esc(R.gloss)}</p></div>`).join("")}
      <p class="note">The rings are an order of flow and not a ranking of worth. Inner serves outer.</p>
      <h2 class="h2 mt">Three threads through all twelve</h2>
      ${IL.THREADS.map((t) => `<div class="pane pad"><span class="rub">${esc(t.says)}</span><h3 class="h3">${esc(t.name)}</h3><p class="sub">${esc(t.text)}</p></div>`).join("")}
      <p class="steward-line">${esc(IL.THREADS_LINE)}</p>
      <p><button class="link" data-act="gosteward">Write yours on the steward card</button></p>
      <h2 class="h2 mt">Four movements</h2><div class="prose"><p>They echo what the Lord did with bread: he took, blessed, broke and gave (Matthew 26:26). By baptism you share in Christ's priesthood, and your work, prayer, family life and rest become an offering joined to his (Catechism 901; Romans 12:1).</p></div>
      <div class="moves">${MOVES.map((m) => `<div class="move"><div class="mh"><b>${m.name}</b><em>${m.verb}</em></div><p>${esc(m.ask)}</p><p class="note">${esc(m.prayer)}</p></div>`).join("")}</div>
      <h2 class="h2 mt">Six laws</h2><div class="pane pad"><ol class="laws">${LAWS.map(([a, b]) => `<li><b>${esc(a)}</b>${esc(b)}</li>`).join("")}</ol></div>
      <h2 class="h2 mt">What the lamps do not show</h2><div class="pane lit pad prose"><p>A lit petal records a practice kept. It does not measure grace, and no one can read the state of their soul from a chart (Catechism 2005). Grave sin breaks communion with God, and what restores it is not a habit but the sacrament of Reconciliation.</p><p>The church, the rings, the movements and the rose are this app's way of arranging what the Church teaches. They are aids to memory, not doctrines.</p></div>`;
  }

  function Review() {
    return `<h1 class="h1">Season review</h1><p class="lede">A glance, not a verdict. Be quick and honest, then choose one field.</p>
      <div class="pane pad">${FIELDS.map((f) => { const lvl = state.fields[f.id].level, isF = state.focus && state.focus.field === f.id, id = esc(f.id);
        return `<div class="reviewrow"><span class="nm"><b><span class="fnum ${rc(f.id)}">${f.n}</span> · ${esc(f.name)}</b><span id="lv-${id}">${LEVELS[lvl]}</span></span>
          <span class="dots5" role="group" aria-label="${esc(f.name)}: light">${[1, 2, 3, 4].map((n) => `<button data-act="setlevel" data-f="${id}" data-l="${n}" aria-pressed="${lvl >= n}" aria-label="${esc(f.name)}: ${LEVELS[n]}"></button>`).join("")}</span>
          <button class="pill ${isF ? "gold" : ""}" data-act="focus" data-f="${id}" aria-pressed="${isF ? "true" : "false"}" aria-label="${isF ? esc(f.name) + " is this season's field" : "Choose " + esc(f.name) + " for this season"}">${isF ? "This season" : "Choose"}</button>
          ${!isF && ui.confirmFocus === f.id ? focusControl(f) : ""}</div>`; }).join("")}</div>
      <p class="note">Tap a lit dot again to dim it. Usually the field to choose is the dimmest one, or the one you skimmed. Choose one. Add nothing new in the other eleven. Their ordinary duties still hold.</p>
      <p class="note">The lights record practices kept. They do not measure grace or the state of your soul.</p>
      <p class="creed">Master, make me faithful in the field I have been avoiding.</p>`;
  }

  /* ───────── The Church's year: month, week, and the days ahead ───────── */
  const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => fmt(new Date(2024, i, 1), { month: "long" }));
  const DOW = [["Mo", "Monday"], ["Tu", "Tuesday"], ["We", "Wednesday"], ["Th", "Thursday"], ["Fr", "Friday"], ["Sa", "Saturday"], ["Su", "Sunday"]];
  const calMonth = () => { if (!ui.cal) { const n = new Date(); ui.cal = { y: n.getFullYear(), m: n.getMonth() }; } return ui.cal; };
  const mondayOf = (d) => L.shift(d, -((d.getDay() + 6) % 7));
  const dayRow = (d, t, withDate) => `<button class="drow ${d.iso === t ? "today" : ""}" data-act="calday" data-d="${d.iso}" aria-label="${esc(dayLabel(d))}${d.iso === t ? " (today)" : ""}">
      <span class="dd" aria-hidden="true"><b>${d.date.getDate()}</b>${esc(withDate ? fmt(d.date, { month: "short" }) : fmt(d.date, { weekday: "short" }))}</span>${bead(d.colour)}
      <span class="dn"><span class="${rankClass(d).replace("rk-o", "rk-w")}">${esc(d.name)}</span>${d.moved ? ` <span class="moved">(moved this year)</span>` : ""}
      ${d.optional.length ? `<span class="rk-o dopt">${d.optional.map((o) => esc(o.name)).join(" · ")}</span>` : ""}</span></button>`;

  function CalendarMonth(t) {
    const { y, m } = calMonth(), days = L.year(y).days.filter((d) => d.date.getMonth() === m);
    const lead = (days[0].date.getDay() + 6) % 7, cells = Array(lead).fill(null).concat(days);
    while (cells.length % 7) cells.push(null);
    const inMonth = (isoDate) => isoDate && isoDate.slice(0, 7) === days[0].iso.slice(0, 7);
    const focus = inMonth(ui.calFocus) ? ui.calFocus : inMonth(t) ? t : days[0].iso;
    const rows = []; for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    const greater = days.filter((d) => d.rank !== "weekday" && d.rank !== "sunday" || d.major);
    return `<div class="pane calpane">
        <div class="calnav"><button class="pill" data-act="calshift" data-n="-1" aria-label="The month before">Earlier</button>
          <h2 class="calmonth" id="cal-title" aria-live="polite">${esc(MONTH_NAMES[m])} ${y}</h2>
          <button class="pill" data-act="calshift" data-n="1" aria-label="The month after">Later</button></div>
        <div class="cal" role="grid" aria-labelledby="cal-title">
          <div class="calrow calhead" role="row">${DOW.map(([s, l]) => `<span role="columnheader" aria-label="${l}">${s}</span>`).join("")}</div>
          ${rows.map((r) => `<div class="calrow" role="row">${r.map((d) => (d ? `<span role="gridcell"><button class="calday ${rankClass(d)} ${d.iso === t ? "today" : ""} ${d.iso === ui.calFocus ? "sel" : ""}" data-act="calday" data-d="${d.iso}" tabindex="${d.iso === focus ? 0 : -1}" aria-label="${esc(dayLabel(d))}${d.iso === t ? " (today)" : ""}"><b>${d.date.getDate()}</b>${bead(d.colour)}</button></span>` : `<span role="gridcell" class="calblank"></span>`)).join("")}</div>`).join("")}
        </div>
        <div class="calfoot"><button class="pill gold" data-act="caltoday">Today</button>
          <select class="in" id="cal-jump" aria-label="Jump to a principal feast of ${y}"><option value="">Jump to a feast of ${y}…</option>${L.principal(y).map((f) => `<option value="${f.date}">${esc(f.name)} · ${esc(fmt(fromISO(f.date), { day: "numeric", month: "short" }))}</option>`).join("")}</select></div>
      </div>
      <div class="legend-lit" role="group" aria-label="Key"><span class="lk"><b>Liturgical colour of the day</b></span>
        ${[["white", "white"], ["red", "red"], ["green", "green"], ["violet", "violet"], ["rose", "rose"]].map(([c, l]) => `<span class="lk">${bead(c)}${l}</span>`).join("")}
        <span class="lk wide"><span class="rk-s">Solemnity</span> · <span class="rk-f">Feast</span> · <span class="rk-m">Memorial</span> · <span class="rk-o">Optional memorial</span></span></div>
      ${greater.length ? `<h2 class="h2 mt">The greater days of ${esc(MONTH_NAMES[m])}</h2><div class="pane dlist">${greater.map((d) => dayRow(d, t, false)).join("")}</div>` : ""}`;
  }
  function CalendarWeek(t) {
    const start = mondayOf(fromISO(ui.calWeek && isISO(ui.calWeek) ? ui.calWeek : t)), days = [0, 1, 2, 3, 4, 5, 6].map((i) => L.day(L.shift(start, i)));
    const thisWeek = L.iso(mondayOf(fromISO(t))) === days[0].iso;
    return `<div class="pane calpane"><div class="calnav"><button class="pill" data-act="weekshift" data-n="-7" aria-label="The week before">Earlier</button>
        <h2 class="calmonth" aria-live="polite">${thisWeek ? "This week" : esc(pretty(days[0].date)) + " to " + esc(pretty(days[6].date))}</h2>
        <button class="pill" data-act="weekshift" data-n="7" aria-label="The week after">Later</button></div>
      <div class="dlist">${days.map((d) => dayRow(d, t, false)).join("")}</div>
      ${thisWeek ? "" : `<div class="calfoot"><button class="pill gold" data-act="caltoday">This week</button></div>`}</div>`;
  }
  function CalendarAhead(t) {
    const now = new Date(), y = now.getFullYear();
    const list = L.year(y).days.concat(L.year(y + 1).days).filter((d) => d.iso >= t && (d.rank === "solemnity" && !/Octave of Easter/.test(d.name) || d.rank === "triduum" || d.rank === "commemoration" || d.major || (d.rank === "feast" && d.lord))).slice(0, 18);
    return `<div class="pane dlist">${list.map((d) => dayRow(d, t, true)).join("")}</div>
      <p class="note">Solemnities, feasts of the Lord, and the days the seasons turn on. A day marked as moved is kept on another date this year, because a Sunday of Advent, Lent or Easter, Holy Week or the Easter Octave takes its place.</p>`;
  }
  function Year() {
    const t = todayISO(), d = litDay(t), S = L.SEASONS[d.season], nl = state.prefs.region === "nl";
    const view = ui.calView === "week" ? CalendarWeek(t) : ui.calView === "ahead" ? CalendarAhead(t) : CalendarMonth(t);
    return `<h1 class="h1">The Church's year</h1>
      <div class="pane lit pad"><span class="rub">Today · ${esc(S.name)}</span>
        <h2 class="h2 litname">${bead(d.colour)}<span>${esc(d.name)}</span></h2>
        <p class="sub">${esc(rankWords(d))} · ${esc(d.colourLabel)}${d.name !== d.weekday && !d.inPlaceOf ? " · " + esc(d.weekdayShort) : ""}</p>
        <p class="mt">${esc(S.asks)}</p>${S.more ? `<p>${esc(S.more)}</p>` : ""}
        <p><button class="link" data-act="calday" data-d="${t}">About today</button></p></div>
      <div class="seg three" role="group" aria-label="How to see the calendar">${[["month", "Month", "every day"], ["week", "This week", "day by day"], ["ahead", "Ahead", "the feasts"]].map(([v, l, e]) => `<button data-act="calview" data-v="${v}" aria-pressed="${ui.calView === v}">${l}<em>${e}</em></button>`).join("")}</div>
      ${view}
      <div class="pane pad"><span class="rub">Which calendar</span>
        <label class="fieldset"><span class="lab">Calendar</span><select class="in" id="cal-region">${Object.keys(L.REGIONS).map((k) => `<option value="${k}" ${state.prefs.region === k ? "selected" : ""}>${esc(L.REGIONS[k])}</option>`).join("")}</select></label>
        ${nl ? `<p class="note">Netherlands: the Epiphany on the Sunday between 2 and 8 January, the Ascension on its Thursday, Corpus Christi on the Sunday, St Willibrord on 7 November, and the national feasts as far as we could establish them. The days of your own diocese are not included.</p>`
          : `<div class="switchrow"><span id="sun-lab">Epiphany, Ascension and Corpus Christi on Sunday<span class="note" style="display:block">As in many countries. Off: 6 January, and the two Thursdays.</span></span>
            <label class="switch"><input type="checkbox" id="sun-feasts" data-toggle="sundayFeasts" ${state.prefs.sundayFeasts ? "checked" : ""} aria-labelledby="sun-lab"><span></span></label></div>`}
        <p class="note calnote">Holy days of obligation differ from country to country. Beyond Sundays, check your diocese.</p></div>
      <p class="note">This is the General Roman Calendar as best we can compute it. Your diocese, country or religious order has its own proper calendar, which takes precedence. For the readings of the day, open a companion app such as Laudate. <button class="link sm" data-act="sub" data-s="companions">See the companions</button></p>`;
  }
  // The detail of one day, in a sheet over the calendar.
  function DaySheet() {
    if (!ui.calDay || !isISO(ui.calDay)) return "";
    const d = litDay(ui.calDay), own = d.name !== d.weekday;
    const row = (k, v) => (v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : "");
    const week = d.season === "triduum" ? "The Paschal Triduum" : d.seasonName.replace(/^the /, "") + (d.week ? ", week " + d.week : "");
    return `<div class="sheet-back" data-act="calclose"></div>
      <div class="sheet" id="daysheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1">
        <div class="sheet-top"><span class="rub">${esc(longDate(d.iso))}</span><button class="pill" data-act="calclose">Close</button></div>
        <h2 class="h2 litname" id="sheet-title">${bead(d.colour)}<span class="${rankClass(d) === "rk-s" ? "rk-s" : ""}">${esc(d.name)}</span></h2>
        <p class="sub">${esc(rankWords(d))} · liturgical colour: ${esc(d.colourLabel)}</p>
        ${d.moved ? `<p class="sheet-note">Moved this year from ${esc(pretty(fromISO(d.moved.from)))}, where a higher day takes its place.</p>` : ""}
        ${d.away.map((a) => `<p class="sheet-note">${esc(a.name)} is moved this year to ${esc(pretty(fromISO(a.to)))}.</p>`).join("")}
        ${d.inPlaceOf ? `<p class="sheet-note">Kept in place of the ${esc(d.inPlaceOf)}.</p>` : ""}
        ${d.note ? `<p class="sheet-note">${esc(d.note)}</p>` : ""}
        <dl class="facts">${row("Season", esc(week))}${own && !d.inPlaceOf ? row("Weekday", esc(d.weekday)) : ""}
          ${row("Sunday cycle", "Year " + d.sundayCycle)}${d.season === "ordinary" ? row("Weekday cycle", "Year " + d.weekdayCycle) : ""}${row("Psalter", "Week " + d.psalterWeek)}</dl>
        ${d.optional.length ? `<h3 class="rub">${d.optional[0].commemoration ? "May be commemorated" : "May also be kept"}</h3><ul class="optlist">${d.optional.map((o) => `<li>${bead(o.colour)}<span class="rk-o">${esc(o.name)}</span><span class="note">${o.commemoration ? (o.memorial ? "memorial, kept as a commemoration in this season" : "optional memorial, as a commemoration") : "optional memorial · " + esc(o.colour)}</span></li>`).join("")}</ul>` : ""}
        ${d.omitted.length ? `<p class="note">Not kept this year, because today ranks higher: ${d.omitted.map(esc).join("; ")}.</p>` : ""}
        <div class="btnrow mt"><button class="pill" data-act="calstep" data-n="-1">The day before</button><button class="pill" data-act="calstep" data-n="1">The day after</button></div>
        <p class="note">Your diocese, country or order may keep this day differently. For the readings, open a companion such as Laudate.</p>
      </div>`;
  }

  function bucketAmount(b) { return (parseNum(state.treasury.income) * parseNum(b.pct)) / 100; }
  const money = (n) => esc(state.treasury.currency) + (Math.round(n * 100) / 100).toLocaleString(LOCALE, { maximumFractionDigits: 2 });
  const pctTotal = () => Math.round(state.treasury.buckets.reduce((n, b) => n + parseNum(b.pct), 0) * 100) / 100;
  const pctLine = (total) => (total === 100 ? "The six parts make one hundred." : "The parts add up to " + total + ". Adjust them to make one hundred.");
  function Treasury() {
    const T = state.treasury;
    return `<h1 class="h1">The Treasury</h1><p class="lede">Give first. Then let every euro be told where to go.</p>
      <div class="pane pad"><div class="frow">${input("treasury.income", T.income, "0", "Income this month", "num", "")}${input("treasury.currency", T.currency, "€", "Currency", "num")}</div>
      <p class="note below">Write the amount as you usually do: 1.234,56 or 1234.56.</p>
      ${T.buckets.map((b, i) => `<div class="bucket"><span><b>${esc(b.name)}</b><span class="note" style="display:block">${esc(b.note)}</span></span>
        <input class="in pc" id="pc-${i}" inputmode="decimal" data-bind="treasury.buckets.${i}.pct" value="${esc(b.pct)}" aria-label="${esc(b.name)} percent" maxlength="8">
        <span class="amt" data-amt="${i}">${money(bucketAmount(b))}</span></div>`).join("")}
      <p class="note mt" id="pct-total" role="status">${pctLine(pctTotal())}</p></div>
      <p class="note">The proportions are a starting pattern, not a rule of the Church. Set them with someone you trust. This is not financial advice.</p>
      <p class="creed">Where your treasure is, there will your heart be also.</p>`;
  }
  function refreshTreasury() {
    state.treasury.buckets.forEach((b, i) => { const el = root.querySelector(`[data-amt="${i}"]`); if (el) el.innerHTML = money(bucketAmount(b)); });
    const el = document.getElementById("pct-total"); if (el) el.textContent = pctLine(pctTotal());
  }

  function Prayers() {
    return `<h1 class="h1">Prayers of the steward</h1><p class="sub">Written for private use. They are not liturgical texts.</p>
      ${PRAYERS.map(([t, p]) => `<div class="pane pad"><h2 class="rub">${esc(t)}</h2><p class="vtext sm">${esc(p)}</p></div>`).join("")}
      <div class="pane pad"><h2 class="rub">The four movements</h2>${MOVES.map((m) => `<p><b>${m.name}.</b> ${esc(m.prayer)}</p>`).join("")}</div>
      <p class="note">For the Church's own prayers, the readings and the Hours, see <button class="link sm" data-act="sub" data-s="companions">Companions</button>.</p>`;
  }

  function Companions() {
    return `<h1 class="h1">Companions</h1>
      <p class="lede">Illuminated Life keeps your Rule. These apps give you the prayers themselves.</p>
      <p class="note">They are independent works; we are not affiliated with them. Some have paid features.</p>
      ${COMPANIONS.map((c) => `<div class="pane pad comp"><h2 class="h3">${esc(c.name)}</h2><p>${esc(c.good)}</p>
        <p class="note">Serves: ${esc(c.fields.map((id) => (fieldById(id) || {}).name).filter(Boolean).join(", "))}. ${esc(c.anchors)}.</p>
        <p class="complink">${outLink(c.url, "Open " + c.name)}<span class="note">${esc(c.where)}</span></p></div>`).join("")}
      <div class="pane quiet pad"><span class="rub">How to use them here</span><p class="sub">In your Rule, tap the pen beside a practice and choose a companion. Today then shows a small link beside that practice. The link opens the other app's page. Nothing from this app is shared with it.</p>
        <p class="mt"><button class="link" data-act="tab" data-t="rule">Open my Rule</button></p></div>`;
  }

  function Backup() {
    const lb = state.meta.lastBackup ? new Date(state.meta.lastBackup) : null;
    return `<h1 class="h1">Keep my words safe</h1><p class="lede">Everything you write lives only in this browser, on this device. Nothing is sent anywhere.</p>
      <div class="pane pad"><h2 class="rub">Back up</h2><p class="sub">Clearing your browser data erases the app's memory. Keep a copy.</p>
        <div class="btnrow mt">${canSave() ? `<button class="gold-btn" data-act="download">Save a backup file</button>` : ""}<button class="pill gold" data-act="copybackup">Copy my backup as text</button></div>
        <p class="note mt" id="last-backup">${lb ? "Last backup: " + esc(fmt(lb, { day: "numeric", month: "long", year: "numeric" })) : "Never backed up"}</p>
        <textarea class="in mt" id="backup-out" rows="3" readonly hidden aria-label="Backup text"></textarea></div>
      <div class="pane pad"><h2 class="rub">Restore</h2><p class="sub">Paste a backup here, or choose a backup file. This replaces what is on this device.</p>
        <textarea class="in mt" id="backup-in" rows="3" placeholder="Paste your backup text" aria-label="Paste a backup" autocomplete="off" spellcheck="false"></textarea>
        <div class="btnrow mt"><button class="pill gold" data-act="importpaste">Restore from this text</button>${PREVIEW ? "" : `<input type="file" id="backup-file" accept="application/json,.json" aria-label="Choose a backup file">`}</div></div>
      <div class="pane pad"><h2 class="rub">Erase</h2><p class="sub">Remove everything this app has stored on this device.</p>
        <div class="btnrow mt"><button class="pill" data-act="erase1">Erase everything</button><button class="pill" id="erase2" data-act="erase2" hidden>Yes, erase it all</button></div></div>`;
  }

  function About() {
    return `<h1 class="h1">About this app</h1><div class="prose">
      <p class="lede">Self-knowledge in the presence of God, turned into times and places for love.</p>
      <p>Illuminated Life is the companion to the book <i>Illuminated: The Image of God, Embodied</i>. Every screen is a chapter of that book in working form. Read the theology first. Without it, this is only a task list with a candle on it.</p>
      <h2 class="h2 mt">What it promises</h2><ul class="plain"><li>It lights, and never scores. Dignity is not a metric.</li><li>It asks about one field. It adds nothing new in the other eleven. Their ordinary duties still hold.</li><li>It lets you begin again without penalty.</li><li>It sends you out of itself: to your parish, your confessor, your friends and the poor.</li><li>It keeps your words on your own device.</li></ul>
      <h2 class="h2 mt">The Guide</h2><p>The Guide on this site follows fixed questions and is not an AI. Inside Claude, the same app can also draft with Claude if you allow it.</p><p>This app cannot see or change your Apple or Google calendar. It can hand your Rule to your calendar as a file.</p>
      <h2 class="h2 mt">What it must never become</h2><p>It is not a spiritual director, a confessor or a diagnosis. It cannot absolve, and it cannot discern a vocation. If you carry trauma, depression, addiction or disordered eating, please work with a qualified professional, and let this accompany that work.</p>
      <p>If the app ever feels like a judge and not a trellis, switch on floor mode, or close it for a season. The anchors are enough.</p>
      <h2 class="h2 mt">If you are in crisis</h2>${crisisNote()}
      <h2 class="h2 mt">The three colours</h2><p>${esc(IL.COLOUR_NOTE)}</p>${ringLegend()}
      <h2 class="h2 mt">On authority</h2><p>This app is a private work. It is not an official text of the Church, and it carries no imprimatur. Use it alongside a parish, a confessor and the sacraments, never in place of them.</p><p>It is meant to agree in every point with Sacred Scripture and the Magisterium, and it is submitted to the Church's judgement. Catechism numbers are given so that each claim can be checked.</p>
      <h2 class="h2 mt">Other apps</h2><p>The apps named under Companions are independent works. We are not affiliated with them, and their names belong to their owners.</p></div>
      <p class="creed">Come to him and be enlightened.</p>`;
  }

  /* ───────── the printed pages ───────── */
  function Book() {
    if (ui.printKind === "diary") return DiaryBook();
    if (ui.printKind === "icon") return IconBook();
    if (ui.printKind === "day" && G) return G.dayBook();
    const F = state.focus ? fieldById(state.focus.field) : null, c = state.church;
    const by = (cad) => state.rule.filter((r) => r.cadence === cad).map((r) => `<p>${esc([r.time, r.text].filter(Boolean).join("  "))}</p>`).join("");
    return `<div class="bp bcover"><p>A RULE OF LIFE</p><h1>Illuminated Life</h1><p><i>Receive, bless, spend, return.</i></p><p>${esc(fmt(new Date(), { day: "numeric", month: "long", year: "numeric" }))}</p></div>
      <div class="bp"><h2>My floor</h2>${state.floor.filter(Boolean).map((t, i) => `<p>${i + 1}. ${esc(t)}</p>`).join("")}
        <h2 style="margin-top:18pt">My rule of life</h2><h3>Each day</h3>${by("daily")}<h3>Each week</h3>${by("weekly")}<h3>Each month</h3>${by("monthly")}<h3>Each year</h3>${by("yearly")}
        <h3>In the Body</h3><p>Parish: ${esc(c.parish)}</p><p>Confession: ${esc(c.confession)}</p><p>Ahead of me: ${esc(c.ahead)}   Beside me: ${esc(c.beside)}   Behind me: ${esc(c.behind)}</p><p>Shown to: ${esc(c.shownTo)} ${esc(c.shownOn)}</p></div>
      <div class="bp"><h2>The twelve fields</h2>${F ? `<p><i>This season's field: ${esc(F.name)}</i></p>` : ""}
        ${RINGS.map((R) => `<p class="bring rc-${R.colour}">${R.name} · ${esc(R.sub)} · ${lower(R.says)} · ${R.hours}</p>
          ${FIELDS.filter((f) => f.ring === R.id).map((f) => { const r = state.fields[f.id]; return `<div class="ba bfield rc-${R.colour}"><h3><span class="bnum">${f.n}.</span> ${esc(f.name)} · ${LEVELS[r.level]}</h3>${MOVES.filter((m) => r[m.id]).map((m) => `<p><b>${m.name}.</b> ${esc(r[m.id])}</p>`).join("")}${r.act ? `<p><b>Next act.</b> ${esc(r.act)}</p>` : ""}</div>`; }).join("")}`).join("")}</div>`;
  }

  /* ───────── render ─────────
     A re-render keeps the caret, the focused control and the scroll position.
     The entry animation plays only when go() moves to another screen. */
  const NAV = [["today", "Today", "calendar"], ["fields", "Fields", "grid"], ["rule", "Rule", "scroll"], ["diary", "Diary", "pen"], ["more", "More", "more"]];
  const SCREENS = { today: Today, fields: Fields, rule: Rule, diary: Diary, more: More };
  function focusKey(el) {
    if (!el || el === document.body || !root.contains(el)) return null;
    const k = { sel: null, s: null, e: null };
    if (el.id) k.sel = "#" + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
    else if (el.dataset && el.dataset.act) k.sel = Object.keys(el.dataset).map((n) => `[data-${n.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}="${cssq(el.dataset[n])}"]`).join("");
    try { if (typeof el.selectionStart === "number") { k.s = el.selectionStart; k.e = el.selectionEnd; } } catch (e) { /* this control has no caret */ }
    return k.sel ? k : null;
  }
  let batching = 0, drawLater = false;
  function render(opts) {
    if (batching) { drawLater = true; return; } // IL.api.batch draws once, at the end
    const o = opts || {}, keep = focusKey(document.activeElement), y = window.scrollY;
    useCalendar();
    const today = litDay(todayISO()), tl = L.line(today);
    const screen = (SCREENS[ui.tab] || Today)();
    root.innerHTML = `<header class="top">${PREVIEW ? `<span class="mark">Illuminated Life</span>` : `<a class="mark" href="index.html" title="About the book and the app">Illuminated Life</a>`}<button class="season-chip" data-act="sub" data-s="year" aria-label="Today: ${esc(L.lineText(today))}. Open the calendar"><span class="sc-text"><b>${bead(today.colour)}${esc(tl.title)}</b>${tl.sub ? `<span>${esc(tl.sub)}</span>` : ""}</span></button></header>
      <main class="body ${o.nav ? "rise" : ""}" id="main">${screen}</main>
      <div class="toast" id="toast" role="status" ${ui.toast ? "" : "hidden"}>${esc(ui.toast || "")}</div>
      ${ui.updated && !ui.later.update ? `<div class="update" id="update" role="status"><span>Updated.</span><button class="link" data-act="reload">Reload</button><button class="link dim" data-act="later" data-k="update">Later</button></div>` : ""}
      <nav class="tabbar" aria-label="Sections">${NAV.map(([id, label, ic]) => `<button data-act="tab" data-t="${id}" ${ui.tab === id ? 'aria-current="page"' : ""}>${icon(ic, 22)}<span>${label}</span></button>`).join("")}</nav>
      ${ui.tab === "more" && ui.sub === "year" ? DaySheet() : ""}
      <div class="book" aria-hidden="true">${Book()}</div>`;
    if (keep) {
      let el = null; try { el = root.querySelector(keep.sel); } catch (e) { /* the control is gone */ }
      if (el) {
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
        if (keep.s != null) { try { el.setSelectionRange(keep.s, keep.e); } catch (e) { /* not a text control */ } }
      }
    }
    if (!o.nav && window.scrollY !== y) window.scrollTo(0, y);
  }
  // Re-render while keeping one element at the same place on the screen (so opening a field does not jump).
  function renderAnchored(selector) {
    const before = root.querySelector(selector), top = before ? before.getBoundingClientRect().top : null;
    render();
    const after = root.querySelector(selector);
    if (after && top != null) { const dy = after.getBoundingClientRect().top - top; if (Math.abs(dy) > 1) window.scrollBy(0, dy); }
  }

  /* ───────── routes: #today, #fields, #rule, #diary, #more ───────── */
  function routeHash() {
    let h = ui.tab;
    if (ui.tab === "more" && ui.sub) h += "/" + ui.sub;
    if (ui.tab === "diary" && ui.diaryView === "examen") h += "/examen";
    return "#" + h;
  }
  function readHash() {
    const [t, s] = String(location.hash || "").replace(/^#/, "").split("/");
    if (!SCREENS[t]) return false;
    ui.tab = t; ui.sub = t === "more" && SUBS[s] ? s : null;
    if (t === "diary") ui.diaryView = s === "examen" ? "examen" : "diary";
    return true;
  }
  function pushRoute(replace) {
    if (PREVIEW) return;
    try { const h = routeHash(); if (location.hash !== h) history[replace ? "replaceState" : "pushState"](null, "", h); } catch (e) { /* history is not available here */ }
  }
  // The day may have turned while the app was open.
  function checkDay() {
    const t = todayISO(); if (t === ui.today) return false;
    ui.today = t; ui.day = null; ui.mem = {}; return true;
  }
  function go(tab, sub, opts) {
    checkDay();
    ui.tab = SCREENS[tab] ? tab : "today"; ui.sub = sub || null; ui.confirmFocus = null; ui.editRule = null; ui.calDay = null; ui.ico.view = null; ui.ico.del = false;
    if (ui.tab === "diary") { ui.day = null; ui.diaryView = "diary"; } // the Diary tab always opens on today's page
    if (G) G.onGo(ui.tab, ui.sub);
    render({ nav: true }); window.scrollTo(0, 0); pushRoute();
    // If the control that was pressed is gone, put focus on the new screen's heading.
    const h1 = root.querySelector("main h1");
    if (h1 && !root.contains(document.activeElement)) { h1.tabIndex = -1; try { h1.focus({ preventScroll: true }); } catch (e) { /* older browsers */ } }
  }

  /* ───────── files ─────────
     On the site a file is saved by the browser. In the hosted preview the page cannot save files itself:
     there it asks the host (the "downloads" capability) and the person confirms each save. If the host
     offers nothing, the save buttons are not drawn at all. */
  const caps = { downloads: null, sample: null };
  if (PREVIEW && window.claude && typeof window.claude.use === "function") {
    ["downloads", "sample"].forEach((name) => {
      try { Promise.resolve(window.claude.use(name)).then((c) => { if (c) { caps[name] = c; render(); } }, () => {}); } catch (e) { /* not offered here */ }
    });
  }
  const canSave = () => !PREVIEW || !!caps.downloads;
  function download(name, text, mime) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  // One file inside a plain zip, stored and not compressed. The preview host does not accept calendar files, but it accepts a zip.
  function zipOne(name, text) {
    const enc = new TextEncoder(), data = enc.encode(text), fn = enc.encode(name), now = new Date();
    let crc = -1; for (let i = 0; i < data.length; i++) { crc ^= data[i]; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1)); } crc = ~crc >>> 0;
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1), date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const out = new Uint8Array(30 + fn.length + data.length + 46 + fn.length + 22), v = new DataView(out.buffer); let p = 0;
    const u16 = (n) => { v.setUint16(p, n, true); p += 2; }, u32 = (n) => { v.setUint32(p, n >>> 0, true); p += 4; }, put = (b) => { out.set(b, p); p += b.length; };
    u32(0x04034b50); u16(20); u16(0x0800); u16(0); u16(time); u16(date); u32(crc); u32(data.length); u32(data.length); u16(fn.length); u16(0); put(fn); put(data);
    const central = p;
    u32(0x02014b50); u16(20); u16(20); u16(0x0800); u16(0); u16(time); u16(date); u32(crc); u32(data.length); u32(data.length); u16(fn.length); u16(0); u16(0); u16(0); u16(0); u32(0); u32(0); put(fn);
    const size = p - central;
    u32(0x06054b50); u16(0); u16(0); u16(1); u16(1); u32(size); u32(central); u16(0);
    return out;
  }
  // Saves one file. Resolves true when it was saved, false when it was not. It never throws.
  function saveFile(name, text, mime) {
    if (!PREVIEW) { try { download(name, text, mime); return Promise.resolve(true); } catch (e) { flash("Not saved"); return Promise.resolve(false); } }
    if (!caps.downloads) return Promise.resolve(false);
    const ics = /\.ics$/i.test(name);
    let job;
    try { job = Promise.resolve(caps.downloads.save(ics ? { filename: name.replace(/\.ics$/i, ".zip"), data: zipOne(name, text) } : { filename: name, data: text })); } catch (e) { job = Promise.reject(e); }
    return job.then(() => true, (e) => {
      const code = e && e.code;
      if (["unavailable", "not_granted", "capability_disabled", "capability_removed"].includes(code)) { caps.downloads = null; render(); } // saving is not possible in this view
      flash("Not saved"); return false;
    });
  }
  // RFC 5545: CRLF line ends, lines folded at 75 octets, text escaped.
  function icsFold(line) {
    const enc = window.TextEncoder ? new TextEncoder() : null, size = (ch) => (enc ? enc.encode(ch).length : 3);
    const out = []; let cur = "", n = 0;
    for (const ch of line) { const b = size(ch); if (n + b > 75) { out.push(cur); cur = " " + ch; n = 1 + b; } else { cur += ch; n += b; } }
    out.push(cur); return out.join("\r\n");
  }
  const icsText = (s) => String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const ICS_WD = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"], WDN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const ymd = (d) => L.iso(d).replace(/-/g, "");
  const icsStamp = () => new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const normTitle = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  // The weekday a weekly practice falls on: the one chosen, or one named in its words ("Sunday Mass"), or the day of rest. Null if none.
  function ruleWeekday(r) {
    if (!r || r.cadence !== "weekly") return null;
    if (Number.isInteger(r.weekday)) return r.weekday;
    const named = WDN.findIndex((n) => r.text.toLowerCase().includes(n)); if (named >= 0) return named;
    return /\bday of rest\b/i.test(r.text) ? state.day.restDay : null;
  }
  // One event, as lines. o: { uid, date, time, minutes, rrule, summary, description, url, alarm }. Without a time it is a whole day.
  function icsEvent(o, stamp) {
    const out = ["BEGIN:VEVENT", "UID:" + o.uid + "@illuminated-life", "DTSTAMP:" + stamp];
    if (isTime(o.time)) out.push("DTSTART:" + ymd(o.date) + "T" + o.time.replace(":", "") + "00", "DURATION:PT" + (o.minutes >= 60 && o.minutes % 60 === 0 ? o.minutes / 60 + "H" : (o.minutes || 15) + "M"));
    else out.push("DTSTART;VALUE=DATE:" + ymd(o.date));
    if (o.rrule) out.push("RRULE:" + o.rrule);
    out.push("SUMMARY:" + icsText(o.summary));
    if (o.description) out.push("DESCRIPTION:" + icsText(o.description));
    if (o.url) out.push("URL:" + String(o.url).replace(/[\r\n]/g, ""));
    out.push("TRANSP:TRANSPARENT");
    if (isTime(o.time) && Number.isInteger(o.alarm)) out.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsText(o.summary), "TRIGGER:-PT" + o.alarm + "M", "END:VALARM");
    out.push("END:VEVENT"); return out;
  }
  const icsWrap = (name, events) => ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Illuminated Life//Rule of Life//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:" + icsText(name)].concat(events, ["END:VCALENDAR"]).map(icsFold).join("\r\n") + "\r\n";
  // When, and how often, a practice lands in the calendar. Dates that nobody chose are taken from the day the Rule
  // was first handed over (meta.calStart), so that a second export says the same thing as the first.
  function ruleSchedule(r) {
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const anchor = isISO(state.meta.calStart) ? fromISO(state.meta.calStart) : today;
    if (r.cadence === "weekly") {
      const chosen = ruleWeekday(r), wd = chosen == null ? anchor.getDay() : chosen;
      return { date: L.shift(today, (wd - today.getDay() + 7) % 7), rrule: "FREQ=WEEKLY;BYDAY=" + ICS_WD[wd] };
    }
    if (r.cadence === "monthly") {
      if (/^confession\b/.test(normTitle(r.text))) return confessionSchedule();
      const dom = Math.min(anchor.getDate(), 28); // a day every month has
      let date = new Date(today.getFullYear(), today.getMonth(), dom); if (date < today) date = new Date(today.getFullYear(), today.getMonth() + 1, dom);
      return { date, rrule: "FREQ=MONTHLY;BYMONTHDAY=" + dom };
    }
    if (r.cadence === "yearly") {
      const m = anchor.getMonth(), dom = m === 1 && anchor.getDate() === 29 ? 28 : anchor.getDate();
      let date = new Date(today.getFullYear(), m, dom); if (date < today) date = new Date(today.getFullYear() + 1, m, dom);
      return { date, rrule: "FREQ=YEARLY;BYMONTH=" + (m + 1) + ";BYMONTHDAY=" + dom };
    }
    return { date: today, rrule: "FREQ=DAILY" };
  }
  // Confession, at the interval set under "In the Body": a whole-day reminder on a Saturday, to be moved to the parish's own time.
  function confessionSchedule() {
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const anchor = isISO(state.meta.calStart) ? fromISO(state.meta.calStart) : today, every = state.church.confession;
    const sat = (d) => L.shift(d, (6 - d.getDay() + 7) % 7);
    if (every === "every two weeks") {
      let date = sat(anchor); while (date < today) date = L.shift(date, 14);
      return { date, rrule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=SA" };
    }
    const step = every === "each season" ? 3 : every === "every two months" ? 2 : 1;
    let k = 0, date = sat(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    while (date < today && k < 600) { k += step; date = sat(new Date(anchor.getFullYear(), anchor.getMonth() + k, 1)); }
    return { date, rrule: "FREQ=MONTHLY;" + (step > 1 ? "INTERVAL=" + step + ";" : "") + "BYDAY=1SA" };
  }
  // What the calendar file holds, as plain objects. The screen "Into my calendar" lists them; makeICS writes them.
  function calendarEvents(opts) {
    const o = opts || {}, now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), list = [];
    const anchor = isISO(state.meta.calStart) ? fromISO(state.meta.calStart) : today;
    let confessed = false;
    state.rule.forEach((r, i) => {
      const s = ruleSchedule(r), c = companionOf(r), conf = r.cadence === "monthly" && /^confession\b/.test(normTitle(r.text)); if (conf) confessed = true;
      list.push({ uid: /^[a-z0-9]{1,16}$/i.test(r.id) ? r.id : "r" + i, kind: "practice", cadence: r.cadence, date: s.date, time: conf ? "" : r.time, minutes: /\bhour\b/i.test(r.text) ? 60 : 15, rrule: s.rrule,
        summary: r.text, description: conf ? [r.note, "A reminder. Move it to the time your parish hears confessions."].filter(Boolean).join(" ") : r.note, url: c ? c.url : "", alarm: r.cadence === "daily" ? 5 : 10 });
    });
    if (!confessed) { const s = confessionSchedule();
      list.push({ uid: "confession", kind: "confession", date: s.date, rrule: s.rrule, summary: "Confession", description: "A reminder, " + state.church.confession + ". Move it to the time your parish hears confessions." }); }
    // The season review: about ninety days after the season began, and every ninety days after that.
    const F = state.focus ? fieldById(state.focus.field) : null; let rv = L.shift(F ? fromISO(state.focus.since) : anchor, 90), guard = 0;
    while (rv < today && guard++ < 400) rv = L.shift(rv, 90);
    list.push({ uid: "seasonreview", kind: "review", date: rv, rrule: "FREQ=DAILY;INTERVAL=90", summary: "Season review: walk the twelve fields",
      description: (F ? "This season's field: " + F.name + ". " : "") + "Give thanks, look again at the twelve, and ask which field is next." });
    if (isISO(state.steward.baptism)) { // the anniversary of Baptism, every year, as a whole day
      const [, bm, bd0] = state.steward.baptism.split("-").map(Number), bd = bm === 2 && bd0 === 29 ? 28 : bd0;
      let when = new Date(now.getFullYear(), bm - 1, bd); if (L.iso(when) < L.iso(now)) when = new Date(now.getFullYear() + 1, bm - 1, bd);
      list.push({ uid: "baptism", kind: "baptism", date: when, rrule: "FREQ=YEARLY;BYMONTH=" + bm + ";BYMONTHDAY=" + bd, summary: "The anniversary of my Baptism", description: "Give thanks, and renew the promises of Baptism." });
    }
    if (o.feasts) { // the principal feasts of the twelve months ahead: single whole days, nothing repeating
      const from = L.iso(today), to = L.iso(L.shift(today, 365));
      L.principal(today.getFullYear()).concat(L.principal(today.getFullYear() + 1)).filter((f) => f.date >= from && f.date < to)
        .forEach((f) => list.push({ uid: "feast" + f.date.replace(/-/g, ""), kind: "feast", date: fromISO(f.date), summary: f.name, description: "From the calendar of Illuminated Life. Your diocese may keep this day differently." }));
    }
    return list;
  }
  function makeICS(opts) { const stamp = icsStamp(); return icsWrap("Illuminated Life", calendarEvents(opts).reduce((all, e) => all.concat(icsEvent(e, stamp)), [])); }
  // Hands the whole Rule to the calendar as one file. The first time, today is remembered as the day the dates are counted from.
  function exportCalendar() {
    if (!canSave()) return Promise.resolve(false);
    if (!isISO(state.meta.calStart)) { state.meta.calStart = todayISO(); save(); writeNow(); } // written at once: the file about to be saved depends on it
    return saveFile("illuminated-life.ics", makeICS({ feasts: state.prefs.icsFeasts }), "text/calendar;charset=utf-8").then((ok) => { if (ok) flash(PREVIEW ? "Saved as a zip. Open it, then open the calendar file inside." : "Calendar file saved. Open it to add your Rule."); return ok; });
  }
  // A backup is checked and normalised before anything is stored. A bad file changes nothing.
  function restore(text) {
    let data = null;
    try { data = JSON.parse(String(text || "").trim()); } catch (e) { data = null; }
    const ok = data && typeof data === "object" && !Array.isArray(data) && ["fields", "rule", "journal", "diary"].some((k) => data[k] && typeof data[k] === "object");
    if (!ok) return flash("That is not a backup from this app. Nothing was changed.");
    let next; try { next = normalise(data); JSON.stringify(next); } catch (e) { return flash("That backup could not be read. Nothing was changed."); }
    clearTimeout(saveTimer); dirty = false; unreadable = null;
    try { localStorage.setItem(KEY, JSON.stringify(next)); storageOK = true; }
    catch (e) { return flash("Could not save on this device. Nothing was changed."); }
    state = next; ui.open = null; ui.day = null; ui.mem = {}; icoReset();
    go("today"); flash("Restored");
  }
  function markBackup() { state.meta.lastBackup = new Date().toISOString(); save(); const el = document.getElementById("last-backup"); if (el) el.textContent = "Last backup: " + fmt(new Date(), { day: "numeric", month: "long", year: "numeric" }); }
  function setFocusField(f) { state.focus = { field: f.id, since: todayISO() }; ui.confirmFocus = null; delete ui.later.season; save(); render(); flash(f.name + " is your field for this season"); }

  /* ───────── the calendar: focus and keys ───────── */
  function focusDay(isoDate) {
    const b = root.querySelector(`.calday[data-d="${cssq(isoDate)}"]`) || root.querySelector(`.drow[data-d="${cssq(isoDate)}"]`);
    if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } b.scrollIntoView({ block: "nearest" }); }
  }
  function closeSheet() {
    if (!ui.calDay) return;
    const back = ui.calOpener, d = ui.calDay; ui.calDay = null; ui.calOpener = null; render();
    let el = null; try { el = back && root.querySelector(back.sel); } catch (e) { /* the opener is gone */ }
    if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } } else focusDay(d);
  }
  // Arrow keys walk the month grid; Page Up and Page Down change the month; Escape closes the day.
  root.addEventListener("keydown", (e) => {
    if (ui.calDay) {
      if (e.key === "Escape") { e.preventDefault(); closeSheet(); return; }
      if (e.key === "Tab") { // keep the focus inside the open sheet
        const sh = document.getElementById("daysheet"); if (!sh) return;
        const f = sh.querySelectorAll("button"), first = f[0], last = f[f.length - 1], a = document.activeElement;
        if (e.shiftKey && (a === first || a === sh)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
        else if (!sh.contains(a)) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    const el = e.target; if (!el.classList || !el.classList.contains("calday") || e.altKey || e.ctrlKey || e.metaKey) return;
    const cur = fromISO(el.dataset.d), dow = (cur.getDay() + 6) % 7;
    let next = null;
    if (e.key === "ArrowLeft") next = L.shift(cur, -1); else if (e.key === "ArrowRight") next = L.shift(cur, 1);
    else if (e.key === "ArrowUp") next = L.shift(cur, -7); else if (e.key === "ArrowDown") next = L.shift(cur, 7);
    else if (e.key === "Home") next = L.shift(cur, -dow); else if (e.key === "End") next = L.shift(cur, 6 - dow);
    else if (e.key === "PageUp" || e.key === "PageDown") { const n = e.key === "PageUp" ? -1 : 1, last = new Date(cur.getFullYear(), cur.getMonth() + n + 1, 0).getDate(); next = new Date(cur.getFullYear(), cur.getMonth() + n, Math.min(cur.getDate(), last)); }
    if (!next || next.getFullYear() < 1970 || next.getFullYear() > 2200) return;
    e.preventDefault();
    ui.calFocus = L.iso(next); ui.cal = { y: next.getFullYear(), m: next.getMonth() };
    render(); focusDay(ui.calFocus);
  });

  /* ───────── The Icon Screen: a mirror in five panels ─────────
     The words and the scoring are in js/icons.js. Here are only the screens.
     Answers to panels I, II, III and V are kept as a draft, so a sitting can be paused.
     Answers to the Shadow Panel are held in ui.ico.shadow, in memory, and are never written anywhere.
     Its one-line result is stored only if the person ticks the box. */
  const icoLatest = () => (state.icono.results.length ? state.icono.results[state.icono.results.length - 1] : null);
  const icoPanelOf = (step) => Math.max(0, Math.min(4, Number(String(step).slice(1)) - 1));
  const icoFind = (list, id) => list.find((x) => x.id === id);
  const icoVice = (dr) => ui.ico.shadow.vice || (dr && dr.vice) || "";
  const glyph = (id, size = 44) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICONO.glyphs[id] || ""}</svg>`;
  // The order in which answers are shown. It is fixed, so the screen is the same every time, but it is not the order of the scoring.
  const DWELL_ORDER = [[2, 0, 4, 1, 3], [1, 3, 0, 2], [3, 0, 2, 1], [0, 2, 1, 3], [2, 3, 0, 1], [1, 0, 3, 2]];
  const turned = (n, by) => Array.from({ length: n }, (_, i) => (i + by) % n);

  function icoHead(step) {
    const i = icoPanelOf(step), P = ICONO.panels[i], shows = step[0] === "r";
    return `<p class="rub icoprog" id="ico-progress">Panel ${P.n} of V · ${esc(P.name)}</p>
      <div class="icobar" aria-hidden="true">${ICONO.panels.map((_, k) => `<i class="${k < i || (k === i && shows) ? "done" : k === i ? "now" : ""}"></i>`).join("")}</div>
      <h1 class="h1">${esc(P.name)}</h1>
      ${shows ? `<p class="sub">${esc(P.asks)}. What this panel shows, for now.</p>` : `<p class="lede">${esc(P.lede)}</p>`}`;
  }
  function icoFoot(next, extra) {
    return `${ui.ico.del === "draft" ? `<div class="confirm" role="group" aria-label="Discard this sitting"><p>Discard this sitting? The answers so far are removed from this device.</p>
        <div class="btnrow"><button class="gold-btn" data-act="icodiscard2">Yes, discard it</button><button class="pill" data-act="icokeepgoing">Keep going</button></div></div>` : ""}
      <div class="btnrow mt icofoot"><button class="pill" data-act="icoback">Back</button>${extra || ""}<button class="gold-btn" data-act="iconext">${next}</button></div>
      <p class="note">You can stop at any point. Your place is kept on this device.</p><button class="link quiet" data-act="icodiscard">Discard this sitting</button>`;
  }
  const icoOpt = (kind, i, k, value, checked, text) => `<label class="opt"><input type="radio" id="ico-${kind}-${i}-${k}" name="ico-${kind}-${i}" value="${esc(value)}" data-ico="${kind}" data-i="${i}" ${checked ? "checked" : ""}><span>${esc(text)}</span></label>`;
  const icoQ = (kind, i, text, opts, cls = "") => `<fieldset class="pane q" id="q-${kind}-${i}"><legend><span class="qn" aria-hidden="true">${i + 1}</span><span>${esc(text)}</span></legend><div class="opts ${cls}">${opts}</div></fieldset>`;

  function lampsRow(levels) {
    const part = { dormant: 0.12, steady: 0.5, awake: 1 };
    return `<ul class="lamps7" aria-label="The seven lamps">${ICONO.gifts.map((g) => { const st = icono.lampState(levels[g.id]);
      return `<li class="l-${st}"><span class="lampwrap">${badge("flame", st === "awake")}<svg class="lamp" viewBox="0 0 44 44" aria-hidden="true"><circle class="lt" cx="22" cy="22" r="20"/><circle class="lp" cx="22" cy="22" r="20" style="stroke-dashoffset:${(125.6 - 125.6 * part[st]).toFixed(1)}"/></svg></span><b>${esc(g.name)}</b><span>${esc(ICONO.lamps.states[st])}</span></li>`; }).join("")}</ul>`;
  }

  function IcoIntro() {
    const I = ICONO.intro, last = icoLatest(), soon = last && L.daysBetween(fromISO(last.date), new Date()) < 183;
    return `<h1 class="h1">${esc(I.title)}</h1><p class="lede">${esc(I.lede)}</p>
      <div class="prose">${I.text.map((t) => `<p>${esc(t)}</p>`).join("")}</div>
      <div class="pane pad"><span class="rub">Five panels</span><ol class="panels">${ICONO.panels.map((P) => `<li><span class="pn">${P.n}</span><span><b>${esc(P.name)}</b><span>${esc(P.asks)}</span></span></li>`).join("")}</ol>
        <p class="note">${esc(I.order)}</p></div>
      ${soon ? `<div class="pane lit pad" id="ico-soon"><span class="rub">A gentle word</span><p class="sub">You last sat with this on ${esc(prettyISO(last.date))}. Once a year is enough. A mirror looked into too often shows only the looking. You may still go on.</p></div>` : ""}
      <div class="pane quiet pad center"><span class="rub">Before you begin</span><p class="vtext sm center">${esc(I.prayer)}</p></div>
      <div class="btnrow"><button class="gold-btn" data-act="icostart">Begin with Panel I</button>${last ? `<button class="pill" data-act="icohome">Back to my result</button>` : ""}</div>
      <p class="note">Everything stays on this device. Nothing is sent anywhere. You can pause between panels and come back.</p>`;
  }

  function IcoStep(dr) {
    if (dr.step === "r4" && !icoVice(dr)) dr.step = "p4"; // the Shadow answers did not survive a reload, by design
    const step = dr.step, D = ICONO.dwelling, Lm = ICONO.lamps, Sh = ICONO.shadow, Th = ICONO.threshold;
    let h = icoHead(step);
    if (step === "p1") {
      h += D.questions.map((q, i) => icoQ("d", i, q.q, DWELL_ORDER[i].map((k) => icoOpt("d", i, k, k, dr.d[i] === k, q.a[k][0])).join(""))).join("") + icoFoot("See what this shows");
    } else if (step === "r1") {
      const res = icono.dwelling(dr.d), B = D.bands[res.band];
      h += `<div class="pane lit pad"><span class="rub">${esc(D.lead)}</span><h2 class="h2">${esc(B.name)}</h2><p class="sub">${esc(B.dwellings)}</p><p class="mt">${esc(B.about)}</p><p class="telos">${esc(B.counsel)}</p></div>
        <p class="note">${esc(D.notRank)}</p><p class="note">${esc(D.further)}</p>
        <p class="care">${esc(D.safety)}</p>${crisisNote()}` + icoFoot("Go on to Panel II");
    } else if (step === "p2") {
      h += Lm.statements.map(([, text], i) => icoQ("l", i, text, ICONO.scale.map((label, k) => icoOpt("l", i, k, k, dr.l[i] === k, label)).join(""), "scale")).join("") + icoFoot("See what this shows");
    } else if (step === "r2") {
      const res = icono.lamps(dr.l), name = (id) => icoFind(ICONO.gifts, id).name;
      h += `<div class="pane quiet pad">${lampsRow(res.levels)}</div>
        ${res.awake.length ? `<div class="pane pad"><span class="rub">Awake</span><p class="telos">${res.awake.map((id) => esc(name(id))).join(" · ")}</p>${res.awake.map((id) => `<p class="sub"><b>${esc(name(id))}.</b> ${esc(icoFind(ICONO.gifts, id).is)}</p>`).join("")}</div>` : `<p class="note">${esc(Lm.noneAwake)}</p>`}
        <div class="pane lit pad"><span class="rub">Dormant</span><p>${esc(Lm.teaching)}</p>
          ${res.dormant.length ? `<ul class="petitions">${res.dormant.map((id) => `<li><b>${esc(name(id))}</b><span class="pray">${esc(icoFind(ICONO.gifts, id).petition)}</span></li>`).join("")}</ul>` : `<p class="sub">${esc(Lm.noneDormant)}</p>`}</div>
        <p class="note">The seven gifts of the Holy Spirit: ${esc(ICONO.panels[1].ref)}. A lamp here records what you said about your days. It does not measure grace.</p>` + icoFoot("Go on to Panel III");
    } else if (step === "p3") {
      h += `<div class="scenes" role="group" aria-label="Twelve scenes. Choose four.">${ICONO.scenes.map((sc) => `<label class="scene"><input type="checkbox" id="ico-s-${sc.id}" data-ico="s" value="${esc(sc.id)}" ${dr.s.includes(sc.id) ? "checked" : ""}><span class="glyph">${glyph(sc.id)}</span><span class="sct"><b>${esc(sc.title)}</b><em>${esc(sc.ref)}</em><span>${esc(sc.text)}</span></span></label>`).join("")}</div>
        <p class="note center" id="ico-count" role="status">${dr.s.length} of ${ICONO.icon.pick} chosen</p>` + icoFoot("See what this shows");
    } else if (step === "r3") {
      const res = icono.charisms(dr.s);
      h += `<div class="chosen" aria-hidden="true">${dr.s.map((id) => `<span class="glyph">${glyph(id, 36)}</span>`).join("")}</div>
        ${res.top.map((id) => { const c = icoFind(ICONO.charisms, id); return `<div class="pane pad"><span class="rub">A charism to test</span><h2 class="h2">${esc(c.name)}${c.also ? `<span class="ringsub"> · ${esc(c.also)}</span>` : ""}</h2>
          <ul class="quest">${c.forms.map((f) => `<li>${esc(f)}</li>`).join("")}</ul><p class="oblige"><b>${esc(ICONO.icon.lead)}</b> ${esc(c.offer)}</p></div>`; }).join("")}
        <div class="pane lit pad"><p class="telos">${esc(ICONO.icon.test)}</p><p class="vref">${esc(ICONO.icon.ref)}</p></div>
        <p class="note">You chose scenes, and the scenes lean toward gifts. That leaning is a guess. The Church tests charisms by their fruit and by her pastors, not by attraction alone.</p>` + icoFoot("Go on to Panel IV");
    } else if (step === "p4") {
      h += `<div class="pane quiet pad"><p class="sub">${esc(Sh.skip)}</p><p class="note mt"><b>${esc(Sh.private)}</b></p><div class="btnrow mt"><button class="pill" data-act="icoskip">Skip this panel</button></div></div>
        ${Sh.scenarios.map((sc, i) => icoQ("x", i, sc.q, turned(sc.a.length, i * 2).map((k) => icoOpt("x", i, k, sc.a[k][0], ui.ico.shadow.a[i] === sc.a[k][0], sc.a[k][1])).join("") + icoOpt("x", i, "none", "", false, "None of these."))).join("")}` + icoFoot("See what this shows", `<button class="pill" data-act="icoskip">Skip</button>`);
    } else if (step === "r4") {
      const v = icoVice(dr), V = icoFind(ICONO.vices, v), l = icono.lamps(dr.l), c = icono.charisms(dr.s);
      const pair = l && c ? icono.pairing(v, { lamps: l.levels, charisms: c.top }) : null, F = fieldById(V.practice.field);
      h += `<div class="pane pad"><span class="rub">${esc(Sh.lead)}</span><h2 class="h2">${esc(V.name)}</h2><p class="sub">${esc(V.is)}</p>
          <p class="mt"><span class="rub inl">The opposite virtue</span>${esc(V.virtue)}</p>
          <p class="telos">${esc(V.practice.title)}.</p><p class="note">One small practice of ${esc(lower(V.virtue))}, in the field of ${fname(F)}. Small is the point.</p></div>
        <div class="pane lit pad"><p>${esc(Sh.teaching)}</p>${pair ? `<p class="sub"><b>A likely pairing: ${esc(pair.name)} and ${esc(lower(V.name))}.</b> ${esc(pair.text)}</p>` : ""}</div>
        <p class="gently">${esc(Sh.gently)}</p>
        <div class="pane pad"><label class="check"><input type="checkbox" id="ico-keep" data-ico="keep" ${dr.vice ? "checked" : ""}><span>${esc(Sh.keep)}</span></label><p class="note">${esc(Sh.keepNote)}</p></div>` + icoFoot("Go on to Panel V");
    } else if (step === "p5") {
      h += Th.questions.map((q, i) => icoQ("t", i, q.q, turned(7, i * 3).map((k) => icoOpt("t", i, k, ICONO.registers[k].id, dr.t[i] === ICONO.registers[k].id, q.a[k])).join(""))).join("") + icoFoot("See what this shows");
    } else if (step === "r5") {
      const res = icono.threshold(dr.t);
      h += res.top.map((id, n) => { const R = icoFind(ICONO.registers, id); return `<div class="pane pad"><span class="rub">${n === 0 ? "The likeliest register" : "And close beside it"}</span><h2 class="h2">${esc(R.name)}</h2><p>${esc(R.is)}</p>
          <dl class="facts"><div><dt>A patron</dt><dd>${esc(R.patron)}</dd></div><div><dt>A Doctor ${esc(Th.company)}</dt><dd>${esc(R.doctor)}</dd></div></dl></div>`; }).join("")
        + `<div class="pane lit pad"><p style="margin:0">${esc(Th.note)}</p></div>` + icoFoot("Put the five together");
    }
    return h;
  }

  // What is said about one stored result: plain strings, ready for esc().
  function icoWords(r) {
    const sum = icono.lampSummary(r.lamps), names = (list, ids) => ids.map((id) => icoFind(list, id).name).join(", ");
    return { band: ICONO.dwelling.bands[r.band].name, awake: names(ICONO.gifts, sum.awake) || "none yet", dormant: names(ICONO.gifts, sum.dormant) || "none",
      charisms: names(ICONO.charisms, r.charisms), registers: names(ICONO.registers, r.registers) };
  }
  function IcoHome() {
    const rs = state.icono.results, r = rs[rs.length - 1], sitting = ui.ico.sitting === r.date;
    const S = icono.synthesis(r, sitting ? ui.ico.shadow.vice : ""), T = ICONO.synthesis, I = ICONO.intro;
    const part = (k, body) => `<div class="pane pad synth"><span class="rub">${esc(T.parts[k])}<span class="from"> · ${esc(T.says[k])}</span></span>${body}</div>`;
    const prev = rs.length > 1 ? rs[rs.length - 2] : null, A = prev ? icoWords(prev) : null, B = icoWords(r);
    const inRule = (title) => state.rule.some((x) => x.text === title);
    const cadWord = { day: "each day", week: "each week", month: "each month", year: "each year" };
    return `<p class="rub icoprog">The Icon Screen · ${esc(prettyISO(r.date))}</p><h1 class="h1">${esc(T.title)}</h1>
      <p class="lede">Five panels, one page. Provisional. Show it to a director, or to the friend who tells you the truth.</p>
      ${part("tone", `<h2 class="h2">${esc(S.tone.band)}</h2><p class="sub">${esc(S.tone.dwellings)}</p><p class="mt">${esc(S.tone.text)}</p>`)}
      ${part("ask", `<div class="pane-in">${lampsRow(S.ask ? icono.lampSummary(r.lamps).levels : {})}</div><h2 class="h2">Ask for ${esc(lower(S.ask.name))}</h2><p class="vtext sm">${esc(S.ask.petition)}</p>
        <p class="sub mt"><b>The prayer that feeds you now</b> (${esc(lower(S.ask.feedsName))} is your brightest lamp): ${esc(lower(S.ask.feeds))}</p>`)}
      ${part("mission", `<h2 class="h2">${esc(B.charisms)}</h2><p class="telos">${esc(S.mission.title)}, ${cadWord[S.mission.cadence]}.</p>
        <p class="note">A standing service for the field of ${fname(fieldById("mission"))}. Change the words until they are true of your life.</p>
        <div class="btnrow mt"><button class="pill gold" data-act="icoadd" data-k="mission" ${inRule(S.mission.title) ? "disabled" : ""}>${inRule(S.mission.title) ? "In my Rule" : "Add the mission item to my Rule"}</button></div>`)}
      ${part("ascetical", S.ascetical ? `<h2 class="h2">${esc(S.ascetical.virtue)}</h2><p class="sub">The tradition would look first at ${esc(lower(S.ascetical.name))}. The remedy is its opposite.</p><p class="telos">${esc(S.ascetical.title)}, ${cadWord[S.ascetical.cadence]}.</p>
        ${S.pairing ? `<p class="sub"><b>A likely pairing: ${esc(S.pairing.name)} and ${esc(lower(S.ascetical.name))}.</b> ${esc(S.pairing.text)}</p>` : ""}
        <p class="note">${S.ascetical.kept ? "Kept on this device, because you asked." : "Shown for this sitting only. It is not saved, and will be gone when you close the app."}</p>
        <div class="btnrow mt"><button class="pill gold" data-act="icoadd" data-k="practice" ${inRule(S.ascetical.title) ? "disabled" : ""}>${inRule(S.ascetical.title) ? "In my Rule" : "Add the practice to my Rule"}</button>${S.ascetical.kept ? `<button class="pill" data-act="icoforget">Forget this result</button>` : ""}</div>`
        : `<p class="sub">${esc(ICONO.shadow.notKept)} Nothing is missing that confession and direction cannot supply.</p>`)}
      ${part("register", `<h2 class="h2">${esc(B.registers)}</h2><dl class="facts"><div><dt>A patron</dt><dd>${esc(S.register.patron)}</dd></div><div><dt>A Doctor ${esc(ICONO.threshold.company)}</dt><dd>${esc(S.register.doctor)}</dd></div></dl>
        ${S.register.also ? `<p class="sub">Close beside it, ${esc(lower(S.register.also.name))}: ${esc(S.register.also.patron)}${S.register.also.doctor !== S.register.also.patron ? ", with " + esc(S.register.also.doctor) : ""}.</p>` : ""}
        <p class="note">This is a register of service. It does not tell you your state of life. No instrument can.</p>
        <div class="btnrow mt"><button class="pill gold" data-act="icosteward">Put patron and gifts on my steward card</button></div>`)}
      ${PREVIEW ? "" : `<div class="btnrow"><button class="gold-btn" data-act="icoprint">Print / save as PDF</button></div>`}
      <div class="lastwords"><p>${esc(I.last[0])}</p><p>${esc(I.last[1])}</p></div>
      ${prev ? `<h2 class="h2 mt">Then and now</h2><div class="pane pad"><table class="thennow"><caption class="vh">The earlier result beside the latest</caption>
        <thead><tr><td></td><th scope="col">${esc(prettyISO(prev.date))}</th><th scope="col">${esc(prettyISO(r.date))}</th></tr></thead><tbody>
        ${[["Dwelling", A.band, B.band], ["Lamps awake", A.awake, B.awake], ["Lamps dormant", A.dormant, B.dormant], ["Charisms", A.charisms, B.charisms], ["Register", A.registers, B.registers]].map(([k, a, b]) => `<tr><th scope="row">${k}</th><td>${esc(a)}</td><td class="${a === b ? "" : "chg"}">${esc(b)}</td></tr>`).join("")}</tbody></table>
        <p class="note mt">A change is not progress or decline. It is a different season. ${rs.length > 2 ? rs.length + " sittings are kept on this device." : ""}</p></div>` : ""}
      <div class="pane quiet pad"><span class="rub">Again, or not at all</span><p class="sub">Everything here stays on this device. It is part of your backup.</p>
        <div class="btnrow mt"><button class="pill" data-act="icoagain">Sit with it again</button><button class="pill" data-act="icodel1">Delete my Icon Screen results</button></div>
        ${ui.ico.del === "results" ? `<div class="confirm mt" role="group" aria-label="Delete my Icon Screen results"><p>Delete every Icon Screen result from this device? This cannot be undone.</p><div class="btnrow"><button class="gold-btn" data-act="icodel2">Yes, delete them</button><button class="pill" data-act="icokeepgoing">Keep them</button></div></div>` : ""}</div>`;
  }
  function Icono() {
    const dr = state.icono.draft;
    if (dr && ui.ico.view !== "intro") return IcoStep(dr);
    if (ui.ico.view === "intro" || !state.icono.results.length) return IcoIntro();
    return IcoHome();
  }
  // One printed page.
  function IconBook() {
    const r = icoLatest(); if (!r) return "";
    const S = icono.synthesis(r, ui.ico.sitting === r.date ? ui.ico.shadow.vice : ""), W = icoWords(r), I = ICONO.intro, T = ICONO.synthesis;
    return `<div class="bp bicon"><p class="bkick">THE ICON SCREEN · ${esc(prettyISO(r.date))}</p><h1>${esc(T.title)}</h1>
      <p><i>Provisional. A description of the material, to be shown to a director or to the friend who tells you the truth.</i></p>
      <div class="ba"><h3>${esc(T.parts.tone)}: ${esc(S.tone.band)} (${esc(S.tone.dwellings)})</h3><p>${esc(S.tone.text)}</p><p>${esc(S.tone.counsel)}</p></div>
      <div class="ba"><h3>${esc(T.parts.ask)}: ${esc(lower(S.ask.name))}</h3><p><i>${esc(S.ask.petition)}</i></p><p>Lamps awake: ${esc(W.awake)}. Dormant: ${esc(W.dormant)}. Dormant is not absent.</p><p>The prayer that feeds you now: ${esc(lower(S.ask.feeds))}</p></div>
      <div class="ba"><h3>${esc(T.parts.mission)}: ${esc(W.charisms)}</h3><p>${esc(S.mission.title)}.</p><p>${esc(ICONO.icon.test)}</p></div>
      ${S.ascetical ? `<div class="ba"><h3>${esc(T.parts.ascetical)}: ${esc(lower(S.ascetical.virtue))}</h3><p>The tradition would look first at ${esc(lower(S.ascetical.name))}. ${esc(S.ascetical.title)}.</p><p>Only a confessor can judge sin. Bring this one sentence to confession and to direction.</p></div>` : ""}
      <div class="ba"><h3>${esc(T.parts.register)}: ${esc(W.registers)}</h3><p>A patron: ${esc(S.register.patron)}. A Doctor ${esc(ICONO.threshold.company)}: ${esc(S.register.doctor)}.</p><p>${esc(ICONO.threshold.note)}</p></div>
      <p class="bend"><i>${esc(I.last[0])}</i></p></div>`;
  }

  function icoShow() {
    render({ nav: true }); window.scrollTo(0, 0);
    const h1 = root.querySelector("main h1"); if (h1) { h1.tabIndex = -1; try { h1.focus({ preventScroll: true }); } catch (e) { /* older browsers */ } }
  }
  function icoTo(step) { const dr = state.icono.draft; if (!dr) return; dr.step = step; ui.ico.del = false; save(); icoShow(); }
  // What is still open on a panel: a message and the first place to look, or null when it is complete.
  function icoOpen(dr) {
    const count = (list) => list.filter((v) => v == null).length, first = (kind, list) => "#q-" + kind + "-" + list.findIndex((v) => v == null);
    const say = (n, one, many) => (n === 1 ? "One " + one + " is still open." : n + " " + many + " are still open.");
    if (dr.step === "p1" && count(dr.d)) return { msg: say(count(dr.d), "question", "questions"), sel: first("d", dr.d) };
    if (dr.step === "p2" && count(dr.l)) return { msg: say(count(dr.l), "statement", "statements"), sel: first("l", dr.l) };
    if (dr.step === "p3" && dr.s.length !== ICONO.icon.pick) return { msg: "Choose four scenes. You have chosen " + dr.s.length + ".", sel: ".scenes" };
    if (dr.step === "p4" && !icono.shadow(ui.ico.shadow.a)) return { msg: "Answer at least four, or skip this panel.", sel: "#q-x-0" };
    if (dr.step === "p5" && count(dr.t)) return { msg: say(count(dr.t), "question", "questions"), sel: first("t", dr.t) };
    return null;
  }
  function icoFinish() {
    const dr = state.icono.draft; if (!dr) return;
    const d = icono.dwelling(dr.d), l = icono.lamps(dr.l), c = icono.charisms(dr.s), t = icono.threshold(dr.t);
    if (!d || !l || !c || !t) { flash("One panel is not finished yet."); return icoTo(!d ? "p1" : !l ? "p2" : !c ? "p3" : "p5"); }
    const res = icono.clean({ date: todayISO(), band: d.band, lamps: l.levels, charisms: c.top, registers: t.top, vice: dr.vice });
    if (!res) return flash("That could not be put together. Nothing was changed.");
    if (!ui.ico.shadow.vice && dr.vice) ui.ico.shadow.vice = dr.vice;
    ui.ico.shadow.a = []; ui.ico.sitting = res.date; ui.ico.view = null; ui.ico.del = false;
    commitIcono({ results: state.icono.results.filter((x) => x.date !== res.date).concat(res), draft: null });
    icoShow();
  }
  // Results go the long way round: merged, normalised, saved.
  function commitIcono(next) { state = normalise(Object.assign({}, state, { icono: next })); save(); }

  function icoAnswer(el) {
    const kind = el.dataset.ico, i = Number(el.dataset.i), dr = state.icono.draft;
    if (kind === "x") { // the Shadow Panel: memory only, never saved
      if (i >= 0 && i < ICONO.shadow.scenarios.length) ui.ico.shadow.a[i] = icono.VICE_IDS.includes(el.value) ? el.value : null;
      return;
    }
    if (!dr) return;
    const n = Number(el.value);
    if (kind === "d" && dr.d[i] !== undefined && ICONO.dwelling.questions[i].a[n]) dr.d[i] = n;
    else if (kind === "l" && dr.l[i] !== undefined && n >= 0 && n <= 3) dr.l[i] = n;
    else if (kind === "t" && dr.t[i] !== undefined && icono.REGISTER_IDS.includes(el.value)) dr.t[i] = el.value;
    else if (kind === "s" && icono.SCENE_IDS.includes(el.value)) {
      if (el.checked) {
        if (dr.s.length >= ICONO.icon.pick) { el.checked = false; return flash("Four scenes only. Let one go to choose another."); }
        if (!dr.s.includes(el.value)) dr.s.push(el.value);
      } else dr.s = dr.s.filter((id) => id !== el.value);
      const c = document.getElementById("ico-count"); if (c) c.textContent = dr.s.length + " of " + ICONO.icon.pick + " chosen";
    } else if (kind === "keep") {
      if (el.checked) dr.vice = icoVice(dr); else { if (!ui.ico.shadow.vice) ui.ico.shadow.vice = dr.vice; dr.vice = ""; }
    } else return;
    save();
  }

  const icoActs = {
    icostart: () => { ui.ico.view = null; ui.ico.shadow = { a: [], vice: "", keep: false }; ui.ico.sitting = ""; ui.ico.del = false;
      commitIcono({ results: state.icono.results, draft: { step: "p1" } }); icoShow(); },
    icohome: () => { ui.ico.view = null; icoShow(); },
    icoagain: () => { ui.ico.view = "intro"; ui.ico.del = false; icoShow(); },
    iconext: () => { const dr = state.icono.draft; if (!dr) return;
      if (dr.step[0] === "p") { const open = icoOpen(dr);
        if (open) { flash(open.msg); const q = root.querySelector(open.sel); if (q) { q.scrollIntoView({ block: "center" }); const f = q.querySelector("input"); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } } return; } }
      if (dr.step === "p4") { ui.ico.shadow.vice = icono.shadow(ui.ico.shadow.a).vice; if (dr.vice) dr.vice = ui.ico.shadow.vice; }
      if (dr.step === "r5") return icoFinish();
      icoTo(ICO_STEPS[ICO_STEPS.indexOf(dr.step) + 1]); },
    icoback: () => { const dr = state.icono.draft; if (!dr) return go("more");
      if (dr.step === "p1") return go("more");
      icoTo(dr.step === "p5" && !icoVice(dr) ? "p4" : ICO_STEPS[ICO_STEPS.indexOf(dr.step) - 1]); },
    icoskip: () => { const dr = state.icono.draft; if (!dr) return; ui.ico.shadow = { a: [], vice: "", keep: false }; dr.vice = ""; icoTo("p5"); flash("Skipped. Nothing is counted against you."); },
    icodiscard: () => { ui.ico.del = "draft"; render(); const y = root.querySelector('[data-act="icodiscard2"]'); if (y) { try { y.focus({ preventScroll: true }); } catch (e) { y.focus(); } y.scrollIntoView({ block: "nearest" }); } },
    icodiscard2: () => { ui.ico.shadow = { a: [], vice: "", keep: false }; ui.ico.del = false; ui.ico.view = null; commitIcono({ results: state.icono.results, draft: null }); icoShow(); flash("This sitting is discarded"); },
    icokeepgoing: () => { ui.ico.del = false; render(); },
    icoadd: (el) => { const r = icoLatest(); if (!r) return; const S = icono.synthesis(r, ui.ico.sitting === r.date ? ui.ico.shadow.vice : ""), item = el.dataset.k === "practice" ? S.ascetical : S.mission;
      if (!item) return; if (state.rule.some((x) => x.text === item.title)) return flash("Already in your Rule");
      addPractice({ title: item.title, field: item.field, cadence: item.cadence, note: "From the Icon Screen" }); render(); flash("Added to your Rule, under " + fieldById(item.field).name); },
    icosteward: () => { const r = icoLatest(); if (!r) return; const S = icono.synthesis(r), next = Object.assign({}, state.steward, { gifts: state.steward.gifts.slice() }); let changed = false;
      if (!next.patron.trim()) { next.patron = S.register.patron; changed = true; }
      r.charisms.map((id) => icoFind(ICONO.charisms, id).name).forEach((name) => { const free = next.gifts.findIndex((g) => !g.trim()); if (free >= 0 && !next.gifts.some((g) => g.trim().toLowerCase() === name.toLowerCase())) { next.gifts[free] = name; changed = true; } });
      if (!changed) return flash("Your steward card already has a patron and three gifts. It was left as it is.");
      commit({ steward: next }); flash("Placed on your steward card, in your Rule"); },
    icoforget: () => { ui.ico.shadow.vice = ""; commitIcono({ results: state.icono.results.map((x) => Object.assign({}, x, { vice: "" })), draft: state.icono.draft }); render(); flash("The Shadow result is forgotten"); },
    icodel1: () => { ui.ico.del = "results"; render(); const y = root.querySelector('[data-act="icodel2"]'); if (y) { try { y.focus({ preventScroll: true }); } catch (e) { y.focus(); } y.scrollIntoView({ block: "nearest" }); } },
    icodel2: () => { icoReset(); commitIcono({ results: [], draft: null }); icoShow(); flash("Your Icon Screen results are deleted"); }
  };

  /* ───────── the Guide, My day and the calendar screen (js/guide.js) ─────────
     They are drawn by that file, with the helpers of this one. What they save goes through IL.api. */
  const showScreen = () => { render({ nav: true }); window.scrollTo(0, 0); const h1 = root.querySelector("main h1"); if (h1) { h1.tabIndex = -1; try { h1.focus({ preventScroll: true }); } catch (e) { /* older browsers */ } } };
  const G = GUIDE ? GUIDE.mount({
    esc, icon, badge, fname, rc, bead, outLink, crisisNote, fmt, pretty, longDate, fromISO, isISO, isTime, todayISO, fieldById, compById, companionOf, periodKey, litDay, normTitle, ruleWeekday,
    WEEKDAYS, CONFESSION, DEFAULT_FLOOR: blank().floor, PREVIEW, root, caps, canSave, saveFile, exportCalendar, calendarEvents, icsEvent, icsWrap, icsStamp,
    state: () => state, ui, save, render, show: showScreen, flash, go, icoLatest: () => icoLatest(),
    print: (kind) => { ui.printKind = kind; ui.printing = true; writeNow(); render(); setTimeout(() => window.print(), 60); }
  }) : null;

  /* ───────── events ───────── */
  const acts = {
    tab: (el) => go(el.dataset.t),
    sub: (el) => go("more", el.dataset.s),
    back: () => go("more"),
    later: (el) => { ui.later[el.dataset.k] = true; render(); },
    reload: () => { writeNow(); location.reload(); },
    toggleprayer: () => { ui.showPrayer = !ui.showPrayer; render(); },
    open: (el) => { const id = el.dataset.f; if (!fieldById(id)) return; ui.open = ui.open === id ? null : id; ui.confirmFocus = null; renderAnchored("#field-" + id); },
    gofield: (el) => { const id = el.dataset.f; if (!fieldById(id)) return; checkDay(); ui.tab = "fields"; ui.sub = null; ui.open = id; render({ nav: true }); pushRoute();
      const c = document.getElementById("field-" + id); if (c) { c.scrollIntoView({ block: "start" }); window.scrollBy(0, -70); const b = c.querySelector(".field-head"); if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* older browsers */ } } } },
    keep: (el) => { const r = state.rule.find((x) => x.id === el.dataset.id); if (!r) return; const k = periodKey(r.cadence); r.done = r.done === k ? null : k; el.setAttribute("aria-pressed", r.done === k ? "true" : "false"); save(); },
    floorkeep: (el) => { const i = Number(el.dataset.i); if (!(i >= 0 && i < 3)) return; state.floorDay.done[i] = !state.floorDay.done[i]; el.setAttribute("aria-pressed", state.floorDay.done[i] ? "true" : "false"); save(); },
    climb: (el) => { const f = fieldById(el.dataset.f); if (!f) return; const r = state.fields[f.id]; if (r.level >= 4) return; r.level += 1; ui.gild = f.id; save(); render(); flash(f.name + ": " + LEVELS[r.level]); setTimeout(() => { ui.gild = null; }, 1500); },
    setlevel: (el) => { const r = state.fields[el.dataset.f], n = Number(el.dataset.l); if (!r || !(n >= 1 && n <= 4)) return; r.level = r.level === n ? n - 1 : n; save(); render(); },
    focus: (el) => { const f = fieldById(el.dataset.f); if (!f) return; if (state.focus && state.focus.field === f.id) return;
      if (state.focus && fieldById(state.focus.field)) { ui.confirmFocus = f.id; render(); const y = root.querySelector('[data-act="focusyes"]'); if (y) { try { y.focus({ preventScroll: true }); } catch (e) { /* older browsers */ } y.scrollIntoView({ block: "nearest" }); } return; }
      setFocusField(f); },
    focusyes: (el) => { const f = fieldById(el.dataset.f); if (f) setFocusField(f); },
    focusno: () => { ui.confirmFocus = null; render(); },
    place: (el) => { const f = fieldById(el.dataset.f); if (!f) return; const text = (state.fields[f.id].spend || "").trim().slice(0, 300); if (!text) return flash("Write your Spend line first");
      const sel = document.getElementById("cad-" + f.id), cad = sel && CADENCES.includes(sel.value) ? sel.value : "weekly";
      addPractice({ title: text, cadence: cad, note: f.name, field: f.id }); flash("Placed in your Rule, " + cad); },
    addrule: () => { const val = (id) => { const n = document.getElementById(id); return n ? n.value : ""; };
      const text = val("new-text").trim().slice(0, 300); if (!text) return flash("Say what the practice is");
      let companion = val("new-comp"), link = "";
      if (companion === "custom") { link = safeURL(val("new-link")); if (!link) return flash("That link is not a web address. Begin it with https://"); }
      else if (!compById(companion)) companion = "";
      const cad = val("new-cad"), time = val("new-time"), field = val("new-field");
      addPractice({ title: text, cadence: cad, time, field, companion, link });
      render(); const t = document.getElementById("new-text"); if (t) t.value = ""; flash("Added to your Rule"); },
    editrule: (el) => { ui.editRule = ui.editRule === el.dataset.id ? null : el.dataset.id; renderAnchored(`[data-act="editrule"][data-id="${cssq(el.dataset.id)}"]`); },
    delrule: (el) => { state.rule = state.rule.filter((r) => r.id !== el.dataset.id); save(); render(); flash("Removed from your Rule"); },
    ics: () => { exportCalendar(); },
    todayview: (el) => { state.prefs.todayView = el.dataset.v === "day" ? "day" : "list"; save(); render(); },
    print: () => { ui.printKind = "rule"; render(); setTimeout(() => window.print(), 60); },
    icoprint: () => { ui.printKind = "icon"; ui.printing = true; writeNow(); render(); setTimeout(() => window.print(), 60); },
    printdiary: (el) => { const sel = document.getElementById("print-range"); ui.printRange = sel && ["day", "week", "month", "all"].includes(sel.value) ? sel.value : "month"; ui.day = isISO(el.dataset.d) ? el.dataset.d : null; ui.printKind = "diary"; ui.printing = true; writeNow(); render(); setTimeout(() => window.print(), 60); },
    diaryview: (el) => { checkDay(); ui.diaryView = el.dataset.v === "examen" ? "examen" : "diary"; render({ nav: true }); window.scrollTo(0, 0); pushRoute(); },
    dayshift: (el) => { const n = Number(el.dataset.n) || 0; ui.day = L.iso(L.shift(fromISO(viewDay()), n)); render(); },
    daytoday: () => { ui.day = null; render(); },
    opendiary: () => go("diary"),
    dayopen: (el) => { if (!isISO(el.dataset.d)) return; ui.day = el.dataset.d; render({ nav: true }); window.scrollTo(0, 0); },
    carry: (el) => { const d = el.dataset.d; if (!isISO(d)) return; const y = jGet(L.iso(L.shift(fromISO(d), -1))).p || {}; setPath("journal." + d + ".p", Object.assign({}, y)); save(); render(); flash("Carried forward"); },
    download: () => { const copy = JSON.parse(JSON.stringify(state)); copy.meta.lastBackup = new Date().toISOString();
      saveFile("illuminated-life-backup-" + todayISO() + ".json", JSON.stringify(copy, null, 2), "application/json").then((ok) => { if (ok) { markBackup(); flash("Backup saved"); } }); },
    copybackup: () => { state.meta.lastBackup = new Date().toISOString(); const text = JSON.stringify(state), out = document.getElementById("backup-out"); if (!out) return; out.hidden = false; out.value = text; out.focus(); out.select(); markBackup();
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => flash("Copied. Paste it somewhere safe."), () => flash("Select the text and copy it.")); },
    importpaste: () => { const n = document.getElementById("backup-in"); restore(n ? n.value : ""); },
    calview: (el) => { ui.calView = ["month", "week", "ahead"].includes(el.dataset.v) ? el.dataset.v : "month"; render(); },
    calshift: (el) => { const c = calMonth(), n = Number(el.dataset.n) === -1 ? -1 : 1, d = new Date(c.y, c.m + n, 1); if (d.getFullYear() < 1970 || d.getFullYear() > 2200) return; ui.cal = { y: d.getFullYear(), m: d.getMonth() }; ui.calFocus = null; render(); },
    weekshift: (el) => { const n = Number(el.dataset.n) === -7 ? -7 : 7; ui.calWeek = L.iso(L.shift(fromISO(ui.calWeek && isISO(ui.calWeek) ? ui.calWeek : todayISO()), n)); render(); },
    caltoday: () => { const n = new Date(); ui.cal = { y: n.getFullYear(), m: n.getMonth() }; ui.calWeek = null; ui.calFocus = todayISO(); render(); focusDay(ui.calFocus); },
    calday: (el) => { if (!isISO(el.dataset.d)) return; ui.calDay = el.dataset.d; ui.calFocus = el.dataset.d; ui.calOpener = focusKey(el); render(); const sh = document.getElementById("daysheet"); if (sh) { try { sh.focus({ preventScroll: true }); } catch (e) { sh.focus(); } } },
    calstep: (el) => { if (!ui.calDay) return; const d = L.shift(fromISO(ui.calDay), Number(el.dataset.n) === -1 ? -1 : 1); if (d.getFullYear() < 1970 || d.getFullYear() > 2200) return; ui.calDay = ui.calFocus = L.iso(d); ui.cal = { y: d.getFullYear(), m: d.getMonth() }; if (ui.calView === "week") ui.calWeek = ui.calDay; render(); },
    calclose: () => closeSheet(),
    ...(G ? G.acts : {}),
    gosteward: () => { go("rule"); const el = document.getElementById("steward"); if (el) { el.scrollIntoView({ block: "start" }); window.scrollBy(0, -70); } },
    ...icoActs,
    erase1: () => { const b = document.getElementById("erase2"); if (b) { b.hidden = false; b.focus(); } },
    erase2: () => { dirty = false; clearTimeout(saveTimer); unreadable = null; try { localStorage.removeItem(KEY); localStorage.removeItem(KEY + "-unreadable"); } catch (e) { /* nothing stored */ } state = blank(); ui.mem = {}; ui.open = null; ui.day = null; icoReset(); go("today"); flash("Erased"); }
  };

  root.addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el && root.contains(el) && Object.prototype.hasOwnProperty.call(acts, el.dataset.act)) acts[el.dataset.act](el); });
  root.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.mem) { ui.mem[el.dataset.mem] = el.value; return; } // kept for this sitting only, never stored
    if (G && G.onInput(el)) return;
    if (el.id === "new-comp") { const l = document.getElementById("new-link"); if (l) l.hidden = el.value !== "custom"; return; }
    if (el.dataset.bind) {
      setPath(el.dataset.bind, el.value); save();
      if (el.dataset.bind.startsWith("treasury.")) refreshTreasury();
      if (el.dataset.bind.startsWith("journal.")) { const h = document.getElementById("handoff"); if (h) h.hidden = !(viewDay() === todayISO() && isEvening() && jHas(jGet(todayISO()))); }
      if (el.dataset.rerender) render();
    }
  });
  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.toggle === "floorMode") { state.floorMode = !!el.checked; save(); render(); }
    if (el.dataset.toggle === "sundayFeasts") { state.prefs.sundayFeasts = !!el.checked; save(); render(); }
    if (el.id === "cal-region") { state.prefs.region = el.value === "nl" ? "nl" : "general"; save(); render(); flash("Calendar: " + L.REGIONS[state.prefs.region]); }
    if (el.id === "cal-jump" && isISO(el.value)) { const d = fromISO(el.value); ui.cal = { y: d.getFullYear(), m: d.getMonth() }; ui.calFocus = el.value; render(); focusDay(el.value); }
    if (el.dataset.ico) icoAnswer(el);
    if (G) G.onChange(el);
    if (el.dataset.check) { setPath(el.dataset.check, !!el.checked); save(); }
    if (el.dataset.link) {
      const r = state.rule.find((x) => x.id === el.dataset.link); if (!r) return;
      const url = safeURL(el.value);
      if (el.value.trim() && !url) { flash("That link is not a web address. Begin it with https://"); return; }
      r.link = url; el.value = url; save();
    }
    if (el.id === "backup-file" && el.files && el.files[0]) {
      if (el.files[0].size > 5000000) { flash("That file is too large to be a backup. Nothing was changed."); return; }
      const fr = new FileReader(); fr.onload = () => restore(String(fr.result)); fr.onerror = () => flash("That file could not be read. Nothing was changed."); fr.readAsText(el.files[0]);
    }
  });

  // Background and foreground: save on the way out, and notice a new day on the way back.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") writeNow();
    else if (checkDay()) render();
  });
  window.addEventListener("focus", () => { if (checkDay()) render(); });
  window.addEventListener("pageshow", () => { if (checkDay()) render(); });
  window.addEventListener("afterprint", () => { if (ui.printing) { ui.printing = false; ui.printKind = "rule"; ui.day = null; render(); } });
  if (G) root.addEventListener("keydown", (e) => G.onKey(e));
  window.addEventListener("popstate", () => { if (readHash()) { checkDay(); if (ui.tab === "diary") ui.day = null; render({ nav: true }); window.scrollTo(0, 0); } });
  // Another tab of the app saved: take its words and show them here.
  window.addEventListener("storage", (e) => {
    if (e.key !== null && e.key !== KEY) return;
    clearTimeout(saveTimer); dirty = false; loadFailed = false; unreadable = null;
    state = load(); render();
  });

  /* ───────── the doorway for other scripts (see the note at the top of this file) ───────── */
  IL.api = {
    getState: () => JSON.parse(JSON.stringify(state)),
    addPractice: (p) => { const r = addPractice(p); if (!r) return null; render(); return r.id; },
    setFloor: (lines) => { const a = Array.isArray(lines) ? lines : []; commit({ floor: [0, 1, 2].map((i) => (typeof a[i] === "string" ? a[i].trim() : state.floor[i])) }); return state.floor.slice(); },
    setSeasonField: (id) => { const f = fieldById(id); if (!f) return false; if (!(state.focus && state.focus.field === f.id)) setFocusField(f); return true; },
    setSteward: (patch) => { const p = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {}, next = Object.assign({}, state.steward);
      ["baptism", "patron", "stateOfLife", "call"].forEach((k) => { if (typeof p[k] === "string") next[k] = p[k]; });
      if (Array.isArray(p.gifts)) next.gifts = [0, 1, 2].map((i) => (typeof p.gifts[i] === "string" ? p.gifts[i] : state.steward.gifts[i]));
      commit({ steward: next }); return Object.assign({}, state.steward, { gifts: state.steward.gifts.slice() }); },
    iconoSummary: () => { const r = icoLatest(); return r ? icono.synthesis(r) : null; },
    makeICS: (opts) => makeICS(opts),
    makeDayICS: (isoDate) => (G ? G.makeDayICS(isoDate) : ""),
    removePractice: (id) => { const n = state.rule.length; state.rule = state.rule.filter((r) => r.id !== id); if (state.rule.length === n) return false; save(); render(); return true; },
    setChurch: (patch) => { const p = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {}, next = Object.assign({}, state.church);
      ["parish", "confession", "ahead", "beside", "behind"].forEach((k) => { if (typeof p[k] === "string") next[k] = p[k]; });
      if (!CONFESSION.includes(next.confession)) next.confession = state.church.confession;
      commit({ church: next }); return Object.assign({}, state.church); },
    setMovements: (id, m) => { const f = fieldById(id), p = m && typeof m === "object" && !Array.isArray(m) ? m : {}; if (!f) return false;
      const next = Object.assign({}, state.fields, { [f.id]: Object.assign({}, state.fields[f.id]) });
      [["receive", "receive"], ["bless", "bless"], ["spend", "spend"], ["return", "ret"]].forEach(([from, to]) => { if (typeof p[from] === "string") next[f.id][to] = p[from]; });
      commit({ fields: next }); return true; },
    setDay: (patch) => { const p = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {}, next = Object.assign({}, state.day);
      ["wake", "workStart", "workEnd", "bed"].forEach((k) => { if (isTime(p[k])) next[k] = p[k]; });
      if (typeof p.workVaries === "boolean") next.workVaries = p.workVaries;
      if (Number.isInteger(p.restDay) && p.restDay >= 0 && p.restDay <= 6) next.restDay = p.restDay;
      commit({ day: next }); return JSON.parse(JSON.stringify(state.day)); },
    setName: (name) => { commit({ prefs: Object.assign({}, state.prefs, { name: typeof name === "string" ? name : "" }) }); return state.prefs.name; },
    addCommitment: (c) => { const o = c && typeof c === "object" ? c : {}, id = uid(), before = state.day.fixed.length;
      commit({ day: Object.assign({}, state.day, { fixed: state.day.fixed.concat([{ id, title: o.title, start: o.start, end: o.end, date: o.date, weekday: o.weekday }]) }) });
      return state.day.fixed.length > before && state.day.fixed.some((x) => x.id === id) ? id : null; },
    removeCommitment: (id) => { const n = state.day.fixed.length; commit({ day: Object.assign({}, state.day, { fixed: state.day.fixed.filter((x) => x.id !== id) }) }); return state.day.fixed.length < n; },
    finishGuide: (made) => { commit({ guide: { done: todayISO(), draft: null, made: Array.isArray(made) ? made : state.guide.made } }); return state.guide.done; },
    batch: (fn) => { batching++; try { if (typeof fn === "function") fn(); } finally { batching--; if (!batching && drawLater) { drawLater = false; render(); } } },
    go: (route) => { const [t, sub] = String(route == null ? "" : route).replace(/^#/, "").split("/"); if (!SCREENS[t]) return false;
      go(t, t === "more" && SUBS[sub] ? sub : null); if (t === "diary" && sub === "examen") acts.diaryview({ dataset: { v: "examen" } }); return true; }
  };

  if (!readHash()) { ui.tab = "today"; }
  render({ nav: true });
  pushRoute(true);
  if (loadFailed) flash("Your saved words could not be read. Nothing has been overwritten. Restore a backup from More.");

  /* sw:start */
  // Offline use, on the real site (and on localhost, for testing).
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!PREVIEW && "serviceWorker" in navigator && (location.protocol === "https:" || local)) {
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (had && !ui.updated) { ui.updated = true; render(); } });
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  /* sw:end */
})();
