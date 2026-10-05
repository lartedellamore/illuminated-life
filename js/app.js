/* Illuminated Life · the app
   Plain JavaScript, no build step, no dependencies.
   State lives in one object, saved to this browser only (localStorage).
   Screens are functions that return HTML strings; one click handler reads data-act.
   Every value that comes from the user or from a backup passes through esc() on its way into HTML. */

(function () {
  "use strict";
  const { RINGS, LEVELS, MOVES, FIELDS, LAWS, PRECEPTS, PRAYERS, VERSES, EXAMEN, BUCKETS, DEFAULT_RULE, COMPANIONS, ANCHOR_HINTS } = IL;
  const L = IL.liturgy;
  const KEY = "illuminated-life-v1";
  const LOCALE = "en-GB"; // one fixed locale, so dates read the same on every device
  const PREVIEW = window.IL_HOST === "preview"; // set only in the hosted preview, where files and printing are blocked
  const root = document.getElementById("app");

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

  function blank() {
    const fields = {};
    FIELDS.forEach((f) => { fields[f.id] = { level: 0, receive: "", bless: "", spend: "", ret: "", act: "" }; });
    return {
      v: 1, fields, focus: null,
      rule: DEFAULT_RULE.map(([cadence, text, time, note, field]) => ({ id: uid(), cadence, text, time, note, field, done: null, companion: "", link: "" })),
      floor: ["Two minutes of prayer, morning and night", "Sunday Mass", "One honest conversation a week"],
      floorMode: false, floorDay: { date: "", done: [false, false, false] },
      church: { parish: "", confession: "monthly", ahead: "", beside: "", behind: "", shownTo: "", shownOn: "" },
      diary: {}, journal: {},
      treasury: { currency: "€", income: "", buckets: BUCKETS.map(([name, note, pct]) => ({ name, note, pct })) },
      prefs: { pdfVerse: true }, meta: { lastBackup: "" }
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
          companion, link: companion === "custom" ? link : ""
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

    const pf = obj(src.prefs); base.prefs.pdfVerse = pf.pdfVerse !== false;
    const me = obj(src.meta); base.meta.lastBackup = typeof me.lastBackup === "string" && !isNaN(Date.parse(me.lastBackup)) ? new Date(Date.parse(me.lastBackup)).toISOString() : "";
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
    printKind: "rule", printRange: "month", today: todayISO(), mem: {}, later: {}, confirmFocus: null, editRule: null, updated: false
  };

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
    shield: "M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6Z"
  };
  const icon = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="${n === "more" ? 2.6 : 1.5}" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[n] || ICONS.spark}"/></svg>`;
  const badge = (n, gold) => `<span class="badge ${gold ? "gold" : ""}">${icon(n)}</span>`;

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
    const arc = (from, to) => { const [x1, y1] = pt(92, from), [x2, y2] = pt(92, to); return `<path class="arc" d="M${x1.toFixed(1)} ${y1.toFixed(1)}A92 92 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`; };
    const petal = "M100 32C111 45 111 63 100 78C89 63 89 45 100 32Z";
    const petals = FIELDS.map((f, i) => {
      const deg = (i + 1) * 30, lvl = state.fields[f.id].level, [nx, ny] = pt(78, deg);
      const focus = state.focus && state.focus.field === f.id ? 1 : 0;
      return `<g class="p" data-act="gofield" data-f="${esc(f.id)}" data-focus="${focus}">
        <g transform="rotate(${deg} 100 100)"><path class="petal-line" d="${petal}"/><path class="petal-fill" d="${petal}" style="opacity:${lvl / 4}"/></g>
        <text class="num" x="${nx.toFixed(1)}" y="${(ny + 3.2).toFixed(1)}" text-anchor="middle">${f.n}</text></g>`;
    }).join("");
    return `<svg class="rose" viewBox="0 0 200 200" role="img" aria-label="${esc(roseLabel())}">
      <circle class="ring" cx="100" cy="100" r="86"/>${arc(19, 131)}${arc(139, 251)}${arc(259, 371)}
      ${petals}<circle class="halo" cx="100" cy="100" r="17"/><circle class="core" cx="100" cy="100" r="10"/></svg>`;
  }

  /* ───────── shared pieces ───────── */
  function keepRow(r, doneNow, act, extra) {
    const f = r.field ? fieldById(r.field) : null, c = companionOf(r);
    const btn = (cls) => `<button class="${cls} row keep" data-act="${act}" ${extra} aria-pressed="${doneNow ? "true" : "false"}">
      ${badge(f ? f.icon : "flame")}
      <span class="rowtext"><b>${esc(r.text)}</b><span>${esc([r.time, r.note].filter(Boolean).join(" · "))}</span></span>
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

  function upcomingFeasts(n) {
    const now = new Date(), t = todayISO();
    return L.feasts(now.getFullYear()).concat(L.feasts(now.getFullYear() + 1)).filter((x) => x.date >= t).slice(0, n);
  }
  const feastName = (u) => esc(u.name) + (u.moved ? ` <span class="moved">(moved this year)</span>` : "");

  /* ───────── Today ───────── */
  function anchorHints(now) {
    const h = now.getHours(), key = h < 11 ? "morning" : h < 16 ? "midday" : "evening";
    const bits = (ANCHOR_HINTS[key] || []).map(([what, id]) => { const c = compById(id); return c ? `${esc(what)} in ${outLink(c.url, c.name, "out inl")}` : ""; }).filter(Boolean);
    if (!bits.length) return "";
    return `<p class="note hint">${{ morning: "This morning", midday: "At midday", evening: "This evening" }[key]}, if it helps: ${bits.join(", or ")}. <button class="link sm" data-act="sub" data-s="companions">About companions</button></p>`;
  }
  function Today() {
    const now = new Date(), d = todayISO(), S = L.SEASONS[L.seasonOn(now)];
    const v = verseFor(now);
    const feast = L.feasts(now.getFullYear()).find((x) => x.date === d);
    const started = state.focus || FIELDS.some((f) => state.fields[f.id].level > 0);
    const F = state.focus ? fieldById(state.focus.field) : null;
    let h = `<section class="stack">
      <div class="pane quiet verse"><h1 class="rub center"><span class="vh">Today, </span>${esc(fmt(now, { weekday: "long", day: "numeric", month: "long" }))}</h1>
        <p class="vtext">“${esc(v.t)}”</p><p class="vref">${esc(v.r)}${feast ? " · " + esc(feast.name) : ""}</p></div>
      <div class="pane quiet rosepane">${rose()}
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
      h += `<button class="pane row link-row field focus" data-act="gofield" data-f="${esc(F.id)}">${badge(F.icon, true)}
        <span class="rowtext"><b>${esc(F.name)} · day ${day} of about ninety</b>
        <span>${r.spend ? "Spend: " + esc(r.spend) : "Write its four movements: receive, bless, spend, return."}</span>
        ${r.act ? `<span>Next act: ${esc(r.act)}</span>` : ""}</span>${icon("chev", 18)}</button>
        ${day >= 90 && !ui.later.season ? `<div class="pane lit pad"><span class="rub">The season is complete</span><p>Ninety days with one field. Give thanks, look again at the twelve, and ask which field is next.</p><div class="btnrow"><button class="gold-btn" data-act="sub" data-s="review">Review the season</button><button class="pill" data-act="later" data-k="season">Later</button></div></div>` : ""}`;
    }

    const jt = jGet(d), nThanks = Object.values(jt.g || {}).filter(Boolean).length;
    h += `<button class="pane row link-row" data-act="opendiary">${badge("pen", nThanks > 0)}<span class="rowtext"><b>Today's diary</b><span>${nThanks ? "Begun. Seven thanks, three prayers, one act of service." : "Seven thanks, three prayers, one act of service."}</span></span>${icon("chev", 18)}</button>`;
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
    let h = `<div class="pane field ${open ? "open" : ""} ${isFocus ? "focus" : ""} ${ui.gild === f.id ? "gilding" : ""}" id="field-${esc(f.id)}">
      <button class="row field-head" data-act="open" data-f="${esc(f.id)}" aria-expanded="${open}" aria-controls="fieldbody-${esc(f.id)}">
        <span class="lampwrap">${badge(f.icon, lvl > 0)}<svg class="lamp" viewBox="0 0 44 44" aria-hidden="true"><circle class="lt" cx="22" cy="22" r="20"/><circle class="lp" cx="22" cy="22" r="20" style="stroke-dashoffset:${125.6 - 125.6 * (lvl / 4)}"/></svg></span>
        <span class="rowtext"><b>${f.n} · ${esc(f.name)}</b><span>${LEVELS[lvl]}${isFocus ? " · this season's field" : ""}</span></span>
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
      <p><button class="link" data-act="sub" data-s="model">How the model works</button></p>
      ${RINGS.map((R) => `<div class="ringhead"><span class="rub">${R.says} · ${R.hours}</span><h2 class="h2">${R.name}</h2><p class="sub">${esc(R.gloss)}</p></div>
        ${FIELDS.filter((f) => f.ring === R.id).map(fieldCard).join("")}`).join("")}</section>`;
  }

  /* ───────── Rule ───────── */
  function Rule() {
    const group = (c, title) => {
      const rows = state.rule.filter((r) => r.cadence === c);
      return `<h2 class="h2 mt">${title}</h2>${rows.length ? `<div class="pane">${rows.map((r) => {
        const f = r.field ? fieldById(r.field) : null, comp = companionOf(r), edit = ui.editRule === r.id, id = esc(r.id);
        return `<div class="rulerow"><div class="row">${badge(f ? f.icon : "flame")}<span class="rowtext"><b>${esc(r.text)}</b><span>${esc([f ? f.name : "", r.time, r.note].filter(Boolean).join(" · "))}</span>${comp ? `<span class="withc">With ${esc(comp.name)}</span>` : ""}</span>
          <button class="icobtn" data-act="editrule" data-id="${id}" aria-expanded="${edit}" aria-label="Companion for ${esc(r.text)}">${icon("pen", 18)}</button><button class="icobtn" data-act="delrule" data-id="${id}" aria-label="Remove ${esc(r.text)}">${icon("trash", 18)}</button></div>
          ${edit ? `<div class="ruleedit"><label class="fieldset"><span class="lab">Companion app</span><select class="in" id="rc-${id}" data-bind="rule:${id}:companion" data-rerender="1">${companionOptions(r.companion)}</select></label>
            ${r.companion === "custom" ? `<label class="fieldset"><span class="lab">Link</span><input class="in" id="rl-${id}" type="url" inputmode="url" autocomplete="off" data-link="${id}" value="${esc(r.link)}" placeholder="https://"></label>` : ""}
            <p class="note">Today will show a small link beside this practice. The link opens the other app or its website.</p></div>` : ""}</div>`;
      }).join("")}</div>` : `<p class="sub">Nothing here yet.</p>`}`;
    };
    const c = state.church;
    return `<section class="stack"><h1 class="h1">Rule of Life</h1>
      <p class="lede">A trellis, not a cage. Small enough to keep in your worst week.</p>
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
      ${PREVIEW ? `<p class="note">In the full app you can add your Rule to your calendar and print it.</p>` : `<div class="btnrow mt"><button class="gold-btn" data-act="ics">Add my Rule to my calendar</button><button class="pill gold" data-act="print">Print my Rule</button></div><p class="note">The calendar file opens in Apple Calendar, Google Calendar or Outlook. There is only one life, so use your one calendar.</p>`}
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
        ${d === t ? `<span class="tag">Today</span>` : `<button class="pill gold" data-act="daytoday">Today</button>`}</div>
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
        return `<div class="ba bday"><h2>${esc(longDate(k))}</h2>
          ${list(x.g).length ? `<h3>I am grateful for</h3><ol>${list(x.g).map((v) => `<li>${esc(v)}</li>`).join("")}</ol>` : ""}
          ${list(x.p).length ? `<h3>I am praying for</h3><ul>${list(x.p).map((v) => `<li>${esc(v)}</li>`).join("")}</ul>` : ""}
          ${x.service ? `<h3>An act of service</h3><p>${esc(x.service)}${x.serviceDone ? " (done)" : ""}</p>` : ""}
          ${x.light ? `<h3>Where I saw light</h3><p>${esc(x.light)}</p>` : ""}
          ${x.word ? `<h3>A word I am carrying</h3><p><i>${esc(x.word)}</i></p>` : state.prefs.pdfVerse ? `<h3>The verse of the day</h3><p><i>${esc(vv.t)}</i> (${esc(vv.r)})</p>` : ""}</div>`; }).join("") : "<p>No diary pages in this range yet.</p>"}</div>`;
  }

  /* ───────── More ───────── */
  const MORE = [
    ["model", "The Steward's Model", "One Master, twelve fields, four movements, six laws", "spark"],
    ["review", "Season review", "Walk the twelve fields and choose one", "grid"],
    ["year", "The Church's year", "The season, and the feasts ahead", "calendar"],
    ["treasury", "The Treasury", "First fruits, and an order for the rest", "coin"],
    ["prayers", "Prayers of the steward", "Morning, night, and the hard days", "flame"],
    ["companions", "Companions", "Other Catholic apps that give you the prayers themselves", "star"],
    ["backup", "Keep my words safe", "Back up, restore, or erase what is on this device", "shield"],
    ["about", "About this app", "What it is, and what it must never become", "book"]
  ];
  const SUBS = { model: Model, review: Review, year: Year, treasury: Treasury, prayers: Prayers, companions: Companions, backup: Backup, about: About };
  function More() {
    if (!ui.sub || !SUBS[ui.sub]) return `<section class="stack"><h1 class="h1">More</h1><p class="lede">The model beneath the app, and the tools around it.</p>
      ${MORE.map(([id, t, s, ic]) => `<button class="pane row link-row" data-act="sub" data-s="${id}">${badge(ic, id === "model")}<span class="rowtext"><b>${t}</b><span>${s}</span></span>${icon("chev", 18)}</button>`).join("")}</section>`;
    return `<section class="stack">${back()}${SUBS[ui.sub]()}</section>`;
  }

  function Model() {
    return `<h1 class="h1">The Steward's Model</h1>
      <p class="lede">One Master entrusts one steward with twelve fields in three rings. In every field the same four movements take place.</p>
      <div class="pane quiet rosepane">${rose()}<div><span class="rub">Read it like a clock</span><p class="sub">Hours I to IV are the Person: what I am. V to VIII are the Household: what I keep. IX to XII are the World: what I give. The centre is not yours to light. It is the Master, who is light.</p></div></div>
      <h2 class="h2 mt">The centre</h2><div class="prose"><p>At the centre is not a goal or a best self. It is a Person. The servant who buried his talent said: I knew you to be a hard man, and I was afraid (Matthew 25:24-25). His failure began with a false picture of the master. Fear buries. Trust invests.</p></div>
      <h2 class="h2 mt">Three rings</h2>${RINGS.map((R) => `<div class="pane pad"><span class="rub">${R.says}</span><h3 class="h3">${R.name}</h3><p class="sub">${esc(R.gloss)}</p></div>`).join("")}
      <p class="note">The rings are an order of flow and not a ranking of worth. Inner serves outer.</p>
      <h2 class="h2 mt">Four movements</h2><div class="prose"><p>They echo what the Lord did with bread: he took, blessed, broke and gave (Matthew 26:26). By baptism you share in Christ's priesthood, and your work, prayer, family life and rest become an offering joined to his (Catechism 901; Romans 12:1).</p></div>
      <div class="moves">${MOVES.map((m) => `<div class="move"><div class="mh"><b>${m.name}</b><em>${m.verb}</em></div><p>${esc(m.ask)}</p><p class="note">${esc(m.prayer)}</p></div>`).join("")}</div>
      <h2 class="h2 mt">Six laws</h2><div class="pane pad"><ol class="laws">${LAWS.map(([a, b]) => `<li><b>${esc(a)}</b>${esc(b)}</li>`).join("")}</ol></div>
      <h2 class="h2 mt">What the lamps do not show</h2><div class="pane lit pad prose"><p>A lit petal records a practice kept. It does not measure grace, and no one can read the state of their soul from a chart (Catechism 2005). Grave sin breaks communion with God, and what restores it is not a habit but the sacrament of Reconciliation.</p><p>The rings, the movements and the rose are this app's way of arranging what the Church teaches. They are aids to memory, not doctrines.</p></div>`;
  }

  function Review() {
    return `<h1 class="h1">Season review</h1><p class="lede">A glance, not a verdict. Be quick and honest, then choose one field.</p>
      <div class="pane pad">${FIELDS.map((f) => { const lvl = state.fields[f.id].level, isF = state.focus && state.focus.field === f.id, id = esc(f.id);
        return `<div class="reviewrow"><span class="nm"><b>${f.n} · ${esc(f.name)}</b><span id="lv-${id}">${LEVELS[lvl]}</span></span>
          <span class="dots5" role="group" aria-label="${esc(f.name)}: light">${[1, 2, 3, 4].map((n) => `<button data-act="setlevel" data-f="${id}" data-l="${n}" aria-pressed="${lvl >= n}" aria-label="${esc(f.name)}: ${LEVELS[n]}"></button>`).join("")}</span>
          <button class="pill ${isF ? "gold" : ""}" data-act="focus" data-f="${id}" aria-pressed="${isF ? "true" : "false"}" aria-label="${isF ? esc(f.name) + " is this season's field" : "Choose " + esc(f.name) + " for this season"}">${isF ? "This season" : "Choose"}</button>
          ${!isF && ui.confirmFocus === f.id ? focusControl(f) : ""}</div>`; }).join("")}</div>
      <p class="note">Tap a lit dot again to dim it. Usually the field to choose is the dimmest one, or the one you skimmed. Choose one. Add nothing new in the other eleven. Their ordinary duties still hold.</p>
      <p class="note">The lights record practices kept. They do not measure grace or the state of your soul.</p>
      <p class="creed">Master, make me faithful in the field I have been avoiding.</p>`;
  }

  function Year() {
    const now = new Date(), key = L.seasonOn(now), S = L.SEASONS[key], t = todayISO();
    return `<h1 class="h1">The Church's year</h1>
      <div class="pane lit pad"><span class="rub">Now · ${esc(S.colour)}</span><h2 class="h2">${esc(S.name)}</h2><p>${esc(S.asks)}</p>${S.more ? `<p>${esc(S.more)}</p>` : ""}</div>
      <h2 class="h2 mt">The feasts ahead</h2><div class="pane pad">${upcomingFeasts(16).map((u) => `<div class="fline ${u.date === t ? "today" : ""}"><span>${feastName(u)}</span><span class="fd">${esc(pretty(fromISO(u.date)))}</span></div>`).join("")}</div>
      <p class="note">A simplified general Roman calendar. In many countries the Epiphany, the Ascension and Corpus Christi are moved to a Sunday. The calendar of your own diocese governs.</p>
      <p class="note">When St Joseph, the Annunciation or the Immaculate Conception meets a Sunday of Lent or Advent, Holy Week or the Easter Octave, it is kept on another day. Those dates are marked as moved.</p>`;
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
        <div class="btnrow mt">${PREVIEW ? "" : `<button class="gold-btn" data-act="download">Save a backup file</button>`}<button class="pill gold" data-act="copybackup">Copy my backup as text</button></div>
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
      <h2 class="h2 mt">What it must never become</h2><p>It is not a spiritual director, a confessor or a diagnosis. It cannot absolve, and it cannot discern a vocation. If you carry trauma, depression, addiction or disordered eating, please work with a qualified professional, and let this accompany that work.</p>
      <p>If the app ever feels like a judge and not a trellis, switch on floor mode, or close it for a season. The anchors are enough.</p>
      <h2 class="h2 mt">If you are in crisis</h2><div class="pane quiet pad"><p>This app is not medical or pastoral care. If you are thinking of harming yourself, contact your doctor or a crisis line now.</p><p>In the Netherlands: 113 Suicide Prevention, call <a class="out inl" href="tel:113">113</a> or <a class="out inl" href="tel:08000113">0800-0113</a>, or <a class="out inl" href="https://www.113.nl/" target="_blank" rel="noopener noreferrer">113.nl</a>.</p><p style="margin:0">Elsewhere, call your local emergency number.</p></div>
      <h2 class="h2 mt">On authority</h2><p>This app is a private work. It is not an official text of the Church, and it carries no imprimatur. Use it alongside a parish, a confessor and the sacraments, never in place of them.</p><p>It is meant to agree in every point with Sacred Scripture and the Magisterium, and it is submitted to the Church's judgement. Catechism numbers are given so that each claim can be checked.</p>
      <h2 class="h2 mt">Other apps</h2><p>The apps named under Companions are independent works. We are not affiliated with them, and their names belong to their owners.</p></div>
      <p class="creed">Come to him and be enlightened.</p>`;
  }

  /* ───────── the printed pages ───────── */
  function Book() {
    if (ui.printKind === "diary") return DiaryBook();
    const F = state.focus ? fieldById(state.focus.field) : null, c = state.church;
    const by = (cad) => state.rule.filter((r) => r.cadence === cad).map((r) => `<p>${esc([r.time, r.text].filter(Boolean).join("  "))}</p>`).join("");
    return `<div class="bp bcover"><p>A RULE OF LIFE</p><h1>Illuminated Life</h1><p><i>Receive, bless, spend, return.</i></p><p>${esc(fmt(new Date(), { day: "numeric", month: "long", year: "numeric" }))}</p></div>
      <div class="bp"><h2>My floor</h2>${state.floor.filter(Boolean).map((t, i) => `<p>${i + 1}. ${esc(t)}</p>`).join("")}
        <h2 style="margin-top:18pt">My rule of life</h2><h3>Each day</h3>${by("daily")}<h3>Each week</h3>${by("weekly")}<h3>Each month</h3>${by("monthly")}<h3>Each year</h3>${by("yearly")}
        <h3>In the Body</h3><p>Parish: ${esc(c.parish)}</p><p>Confession: ${esc(c.confession)}</p><p>Ahead of me: ${esc(c.ahead)}   Beside me: ${esc(c.beside)}   Behind me: ${esc(c.behind)}</p><p>Shown to: ${esc(c.shownTo)} ${esc(c.shownOn)}</p></div>
      <div class="bp"><h2>The twelve fields</h2>${F ? `<p><i>This season's field: ${esc(F.name)}</i></p>` : ""}
        ${FIELDS.map((f) => { const r = state.fields[f.id]; return `<div class="ba"><h3>${f.n}. ${esc(f.name)} · ${LEVELS[r.level]}</h3>${MOVES.filter((m) => r[m.id]).map((m) => `<p><b>${m.name}.</b> ${esc(r[m.id])}</p>`).join("")}${r.act ? `<p><b>Next act.</b> ${esc(r.act)}</p>` : ""}</div>`; }).join("")}</div>`;
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
  function render(opts) {
    const o = opts || {}, keep = focusKey(document.activeElement), y = window.scrollY;
    const S = L.SEASONS[L.seasonOn(new Date())];
    const screen = (SCREENS[ui.tab] || Today)();
    root.innerHTML = `<header class="top">${PREVIEW ? `<span class="mark">Illuminated Life</span>` : `<a class="mark" href="index.html" title="About the book and the app">Illuminated Life</a>`}<span class="season-chip">${esc(S.name)}</span></header>
      <main class="body ${o.nav ? "rise" : ""}" id="main">${screen}</main>
      <div class="toast" id="toast" role="status" ${ui.toast ? "" : "hidden"}>${esc(ui.toast || "")}</div>
      ${ui.updated && !ui.later.update ? `<div class="update" id="update" role="status"><span>Updated.</span><button class="link" data-act="reload">Reload</button><button class="link dim" data-act="later" data-k="update">Later</button></div>` : ""}
      <nav class="tabbar" aria-label="Sections">${NAV.map(([id, label, ic]) => `<button data-act="tab" data-t="${id}" ${ui.tab === id ? 'aria-current="page"' : ""}>${icon(ic, 22)}<span>${label}</span></button>`).join("")}</nav>
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
    ui.tab = SCREENS[tab] ? tab : "today"; ui.sub = sub || null; ui.confirmFocus = null; ui.editRule = null;
    if (ui.tab === "diary") { ui.day = null; ui.diaryView = "diary"; } // the Diary tab always opens on today's page
    render({ nav: true }); window.scrollTo(0, 0); pushRoute();
    // If the control that was pressed is gone, put focus on the new screen's heading.
    const h1 = root.querySelector("main h1");
    if (h1 && !root.contains(document.activeElement)) { h1.tabIndex = -1; try { h1.focus({ preventScroll: true }); } catch (e) { /* older browsers */ } }
  }

  /* ───────── files ───────── */
  function download(name, text, mime) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  // RFC 5545: CRLF line ends, lines folded at 75 octets, text escaped.
  function icsFold(line) {
    const enc = window.TextEncoder ? new TextEncoder() : null, size = (ch) => (enc ? enc.encode(ch).length : 3);
    const out = []; let cur = "", n = 0;
    for (const ch of line) { const b = size(ch); if (n + b > 75) { out.push(cur); cur = " " + ch; n = 1 + b; } else { cur += ch; n += b; } }
    out.push(cur); return out.join("\r\n");
  }
  const icsText = (s) => String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  function makeICS() {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", now = new Date();
    const WD = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"], WDN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const ymd = (d) => L.iso(d).replace(/-/g, "");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Illuminated Life//Rule of Life//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:" + icsText("Rule of life")];
    state.rule.forEach((r, i) => {
      let start = new Date(now.getFullYear(), now.getMonth(), now.getDate()), rrule = "FREQ=DAILY";
      if (r.cadence === "weekly") {
        const named = WDN.findIndex((n) => r.text.toLowerCase().includes(n)); // "Sunday Mass" lands on a Sunday
        if (named >= 0) start = L.shift(start, (named - start.getDay() + 7) % 7);
        rrule = "FREQ=WEEKLY;BYDAY=" + WD[start.getDay()];
      } else if (r.cadence === "monthly") {
        if (start.getDate() > 28) start = new Date(start.getFullYear(), start.getMonth(), 28); // a day every month has
        rrule = "FREQ=MONTHLY;BYMONTHDAY=" + start.getDate();
      } else if (r.cadence === "yearly") {
        if (start.getMonth() === 1 && start.getDate() === 29) start = new Date(start.getFullYear(), 1, 28);
        rrule = "FREQ=YEARLY;BYMONTH=" + (start.getMonth() + 1) + ";BYMONTHDAY=" + start.getDate();
      }
      const id = /^[a-z0-9]{1,16}$/i.test(r.id) ? r.id : "r" + i, c = companionOf(r);
      lines.push("BEGIN:VEVENT", "UID:" + id + "@illuminated-life", "DTSTAMP:" + stamp);
      if (/^\d\d:\d\d$/.test(r.time)) lines.push("DTSTART:" + ymd(start) + "T" + r.time.replace(":", "") + "00", "DURATION:PT15M");
      else lines.push("DTSTART;VALUE=DATE:" + ymd(start));
      lines.push("RRULE:" + rrule, "SUMMARY:" + icsText(r.text));
      if (r.note) lines.push("DESCRIPTION:" + icsText(r.note));
      if (c) lines.push("URL:" + c.url.replace(/[\r\n]/g, ""));
      lines.push("TRANSP:TRANSPARENT", "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.map(icsFold).join("\r\n") + "\r\n";
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
    state = next; ui.open = null; ui.day = null; ui.mem = {};
    go("today"); flash("Restored");
  }
  function markBackup() { state.meta.lastBackup = new Date().toISOString(); save(); const el = document.getElementById("last-backup"); if (el) el.textContent = "Last backup: " + fmt(new Date(), { day: "numeric", month: "long", year: "numeric" }); }
  function setFocusField(f) { state.focus = { field: f.id, since: todayISO() }; ui.confirmFocus = null; delete ui.later.season; save(); render(); flash(f.name + " is your field for this season"); }

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
      state.rule.push({ id: uid(), cadence: cad, text, time: "", note: f.name, field: f.id, done: null, companion: "", link: "" }); save(); flash("Placed in your Rule, " + cad); },
    addrule: () => { const val = (id) => { const n = document.getElementById(id); return n ? n.value : ""; };
      const text = val("new-text").trim().slice(0, 300); if (!text) return flash("Say what the practice is");
      let companion = val("new-comp"), link = "";
      if (companion === "custom") { link = safeURL(val("new-link")); if (!link) return flash("That link is not a web address. Begin it with https://"); }
      else if (!compById(companion)) companion = "";
      const cad = val("new-cad"), time = val("new-time"), field = val("new-field");
      state.rule.push({ id: uid(), cadence: CADENCES.includes(cad) ? cad : "daily", text, time: /^\d\d:\d\d$/.test(time) ? time : "", note: "", field: fieldById(field) ? field : "", done: null, companion, link });
      save(); render(); const t = document.getElementById("new-text"); if (t) t.value = ""; flash("Added to your Rule"); },
    editrule: (el) => { ui.editRule = ui.editRule === el.dataset.id ? null : el.dataset.id; renderAnchored(`[data-act="editrule"][data-id="${cssq(el.dataset.id)}"]`); },
    delrule: (el) => { state.rule = state.rule.filter((r) => r.id !== el.dataset.id); save(); render(); flash("Removed from your Rule"); },
    ics: () => { download("illuminated-life-rule.ics", makeICS(), "text/calendar;charset=utf-8"); flash("Calendar file saved. Open it to add your Rule."); },
    print: () => { ui.printKind = "rule"; render(); setTimeout(() => window.print(), 60); },
    printdiary: (el) => { const sel = document.getElementById("print-range"); ui.printRange = sel && ["day", "week", "month", "all"].includes(sel.value) ? sel.value : "month"; ui.day = isISO(el.dataset.d) ? el.dataset.d : null; ui.printKind = "diary"; ui.printing = true; writeNow(); render(); setTimeout(() => window.print(), 60); },
    diaryview: (el) => { checkDay(); ui.diaryView = el.dataset.v === "examen" ? "examen" : "diary"; render({ nav: true }); window.scrollTo(0, 0); pushRoute(); },
    dayshift: (el) => { const n = Number(el.dataset.n) || 0; ui.day = L.iso(L.shift(fromISO(viewDay()), n)); render(); },
    daytoday: () => { ui.day = null; render(); },
    opendiary: () => go("diary"),
    dayopen: (el) => { if (!isISO(el.dataset.d)) return; ui.day = el.dataset.d; render({ nav: true }); window.scrollTo(0, 0); },
    carry: (el) => { const d = el.dataset.d; if (!isISO(d)) return; const y = jGet(L.iso(L.shift(fromISO(d), -1))).p || {}; setPath("journal." + d + ".p", Object.assign({}, y)); save(); render(); flash("Carried forward"); },
    download: () => { state.meta.lastBackup = new Date().toISOString(); download("illuminated-life-backup-" + todayISO() + ".json", JSON.stringify(state, null, 2), "application/json"); markBackup(); flash("Backup saved"); },
    copybackup: () => { state.meta.lastBackup = new Date().toISOString(); const text = JSON.stringify(state), out = document.getElementById("backup-out"); if (!out) return; out.hidden = false; out.value = text; out.focus(); out.select(); markBackup();
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => flash("Copied. Paste it somewhere safe."), () => flash("Select the text and copy it.")); },
    importpaste: () => { const n = document.getElementById("backup-in"); restore(n ? n.value : ""); },
    erase1: () => { const b = document.getElementById("erase2"); if (b) { b.hidden = false; b.focus(); } },
    erase2: () => { dirty = false; clearTimeout(saveTimer); unreadable = null; try { localStorage.removeItem(KEY); localStorage.removeItem(KEY + "-unreadable"); } catch (e) { /* nothing stored */ } state = blank(); ui.mem = {}; ui.open = null; ui.day = null; go("today"); flash("Erased"); }
  };

  root.addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el && root.contains(el) && Object.prototype.hasOwnProperty.call(acts, el.dataset.act)) acts[el.dataset.act](el); });
  root.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.mem) { ui.mem[el.dataset.mem] = el.value; return; } // kept for this sitting only, never stored
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
  window.addEventListener("popstate", () => { if (readHash()) { checkDay(); if (ui.tab === "diary") ui.day = null; render({ nav: true }); window.scrollTo(0, 0); } });
  // Another tab of the app saved: take its words and show them here.
  window.addEventListener("storage", (e) => {
    if (e.key !== null && e.key !== KEY) return;
    clearTimeout(saveTimer); dirty = false; loadFailed = false; unreadable = null;
    state = load(); render();
  });

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
