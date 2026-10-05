/* Illuminated Life · the app
   Plain JavaScript, no build step, no dependencies.
   State lives in one object, saved to this browser only (localStorage).
   Screens are functions that return HTML strings; one click handler reads data-act. */

(function () {
  "use strict";
  const { RINGS, LEVELS, MOVES, FIELDS, LAWS, PRECEPTS, PRAYERS, VERSES, EXAMEN, BUCKETS, DEFAULT_RULE } = IL;
  const L = IL.liturgy;
  const KEY = "illuminated-life-v1";
  const PREVIEW = window.IL_HOST === "preview"; // set only in the hosted preview, where files and printing are blocked
  const root = document.getElementById("app");

  /* ───────── helpers ───────── */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const todayISO = () => L.iso(new Date());
  const fieldById = (id) => FIELDS.find((f) => f.id === id);
  const pretty = (d) => d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
  const fromISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);

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

  /* ───────── state ───────── */
  function blank() {
    const fields = {};
    FIELDS.forEach((f) => { fields[f.id] = { level: 0, receive: "", bless: "", spend: "", ret: "", act: "" }; });
    return {
      v: 1, fields, focus: null,
      rule: DEFAULT_RULE.map(([cadence, text, time, note, field]) => ({ id: uid(), cadence, text, time, note, field, done: null })),
      floor: ["Two minutes of prayer, morning and night", "Sunday Mass", "One honest conversation a week"],
      floorMode: false, floorDay: { date: "", done: [false, false, false] },
      church: { parish: "", confession: "monthly", ahead: "", beside: "", behind: "", shownTo: "", shownOn: "" },
      diary: {},
      treasury: { currency: "€", income: "", buckets: BUCKETS.map(([name, note, pct]) => ({ name, note, pct })) }
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const saved = JSON.parse(raw), base = blank();
      const merged = Object.assign(base, saved);
      FIELDS.forEach((f) => { merged.fields[f.id] = Object.assign({ level: 0, receive: "", bless: "", spend: "", ret: "", act: "" }, (saved.fields || {})[f.id]); });
      return merged;
    } catch (e) { return blank(); }
  }
  let state = load();
  let saveTimer = null, storageOK = true, dirty = false;
  function writeNow() {
    clearTimeout(saveTimer); if (!dirty) return; dirty = false;
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; }
    catch (e) { if (storageOK) flash("Could not save on this device. Copy a backup from More."); storageOK = false; }
  }
  function save() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(writeNow, 350); }
  // Never lose the last keystroke when the app is closed or put in the background.
  window.addEventListener("pagehide", writeNow);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") writeNow(); });
  const ui = { tab: "today", sub: null, open: null, gild: null, toast: null, showPrayer: false };

  function setPath(path, value) {
    if (path.startsWith("rule:")) {
      const [, id, key] = path.split(":");
      const r = state.rule.find((x) => x.id === id); if (r) r[key] = value; return;
    }
    const parts = path.split("."); let o = state;
    for (let i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null) o[parts[i]] = {}; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = value;
  }
  function flash(msg) {
    ui.toast = msg; const el = document.getElementById("toast");
    if (el) { el.textContent = msg; el.hidden = false; }
    clearTimeout(flash.t); flash.t = setTimeout(() => { ui.toast = null; const e2 = document.getElementById("toast"); if (e2) e2.hidden = true; }, 2800);
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
  const icon = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${n === "more" ? 2.6 : 1.5}" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[n] || ICONS.spark}"/></svg>`;
  const badge = (n, gold) => `<span class="badge ${gold ? "gold" : ""}">${icon(n)}</span>`;

  /* ───────── the rose window: twelve petals, numbered like the hours ───────── */
  function rose() {
    const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return [100 + r * Math.sin(a), 100 - r * Math.cos(a)]; };
    const arc = (from, to) => { const [x1, y1] = pt(92, from), [x2, y2] = pt(92, to); return `<path class="arc" d="M${x1.toFixed(1)} ${y1.toFixed(1)}A92 92 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`; };
    const petal = "M100 32C111 45 111 63 100 78C89 63 89 45 100 32Z";
    const petals = FIELDS.map((f, i) => {
      const deg = (i + 1) * 30, lvl = state.fields[f.id].level, [nx, ny] = pt(78, deg);
      const focus = state.focus && state.focus.field === f.id ? 1 : 0;
      return `<g class="p" role="button" tabindex="0" data-act="gofield" data-f="${f.id}" data-focus="${focus}" aria-label="${esc(f.name)}: ${LEVELS[lvl]}${focus ? ", this season's field" : ""}">
        <g transform="rotate(${deg} 100 100)"><path class="petal-line" d="${petal}"/><path class="petal-fill" d="${petal}" style="opacity:${lvl / 4}"/></g>
        <text class="num" x="${nx.toFixed(1)}" y="${(ny + 3.2).toFixed(1)}" text-anchor="middle">${f.n}</text></g>`;
    }).join("");
    return `<svg class="rose" viewBox="0 0 200 200" role="group" aria-label="The twelve fields. Each petal is one field.">
      <circle class="ring" cx="100" cy="100" r="86"/>${arc(19, 131)}${arc(139, 251)}${arc(259, 371)}
      ${petals}<circle class="halo" cx="100" cy="100" r="17"/><circle class="core" cx="100" cy="100" r="10"/></svg>`;
  }

  /* ───────── shared pieces ───────── */
  function keepRow(r, doneNow, act, extra) {
    const f = r.field ? fieldById(r.field) : null;
    return `<button class="pane row keep" data-act="${act}" ${extra} aria-pressed="${doneNow ? "true" : "false"}">
      ${badge(f ? f.icon : "flame")}
      <span class="rowtext"><b>${esc(r.text)}</b><span>${esc([r.time, r.note].filter(Boolean).join(" · "))}</span></span>
      <span class="ringc" aria-hidden="true"><svg viewBox="0 0 36 36"><circle class="rt" cx="18" cy="18" r="15"/><circle class="rp" cx="18" cy="18" r="15"/></svg>
      <svg class="tick" viewBox="0 0 24 24"><path d="m7 12.5 3.4 3.4L17 9"/></svg></span></button>`;
  }
  const input = (bind, value, ph, label, cls = "") => `<label class="fieldset">${label ? `<span class="lab">${label}</span>` : ""}<input class="in ${cls}" id="i-${bind.replace(/[^a-z0-9]/gi, "-")}" data-bind="${bind}" value="${esc(value)}" placeholder="${esc(ph || "")}"></label>`;
  const area = (bind, value, ph, label, rows = 2) => `<label class="fieldset">${label ? `<span class="lab">${label}</span>` : ""}<textarea class="in" id="t-${bind.replace(/[^a-z0-9]/gi, "-")}" rows="${rows}" data-bind="${bind}" placeholder="${esc(ph || "")}">${esc(value)}</textarea></label>`;
  const back = () => `<button class="back" data-act="back">${icon("chev", 16)} Back</button>`;

  function upcomingFeasts(n) {
    const now = new Date(), t = todayISO();
    return L.feasts(now.getFullYear()).concat(L.feasts(now.getFullYear() + 1)).filter((x) => x.date >= t).slice(0, n);
  }

  /* ───────── Today ───────── */
  function Today() {
    const now = new Date(), d = todayISO(), S = L.SEASONS[L.seasonOn(now)];
    const v = VERSES[Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000) % VERSES.length];
    const feast = L.feasts(now.getFullYear()).find((x) => x.date === d);
    const started = state.focus || FIELDS.some((f) => state.fields[f.id].level > 0);
    const F = state.focus ? fieldById(state.focus.field) : null;
    let h = `<section class="stack rise">
      <div class="pane quiet verse"><span class="rub center">${esc(now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }))}</span>
        <p class="vtext">“${esc(v.t)}”</p><p class="vref">${esc(v.r)}${feast ? " · " + esc(feast.name) : ""}</p></div>
      <div class="pane quiet rosepane">${rose()}
        <div><span class="rub">Twelve fields, one steward</span>
          <h2 class="h2">${F ? "This season: " + esc(F.name) : "Everything you hold, on one page"}</h2>
          <p class="sub">Each petal is a field, numbered like the hours. A petal brightens as its practices are kept. It records practice. It does not measure grace.</p>
          <p class="mt"><button class="link" data-act="tab" data-t="fields">Open the fields</button></p></div></div>`;

    if (!started) {
      h += `<div class="pane lit pad"><span class="rub">Begin here</span><h2 class="h2">Three small steps</h2>
        <ol class="plain"><li><b>Pray first.</b> Ask to see what you have been given, and where you are being asked.</li>
        <li><b>Walk the twelve fields.</b> A quick, honest glance at each.</li>
        <li><b>Choose one field</b> for this season, and leave the other eleven alone.</li></ol>
        <div class="btnrow mt"><button class="gold-btn" data-act="sub" data-s="review">Walk the twelve fields</button>
        <button class="pill gold" data-act="toggleprayer">${ui.showPrayer ? "Hide the prayer" : "A prayer to begin"}</button></div>
        ${ui.showPrayer ? `<p class="vtext sm">Lord, show me what you have given me, and where you are asking. Make me faithful in the field I have been avoiding. Amen.</p>` : ""}</div>`;
    }
    if (F) {
      const day = Math.max(1, daysBetween(fromISO(state.focus.since), now) + 1), r = state.fields[F.id];
      h += `<button class="pane row link-row field focus" data-act="gofield" data-f="${F.id}">${badge(F.icon, true)}
        <span class="rowtext"><b>${esc(F.name)} · day ${day} of about ninety</b>
        <span>${r.spend ? "Spend: " + esc(r.spend) : "Write its four movements: receive, bless, spend, return."}</span>
        ${r.act ? `<span>Next act: ${esc(r.act)}</span>` : ""}</span>${icon("chev", 18)}</button>
        ${day >= 90 ? `<div class="pane lit pad"><span class="rub">The season is complete</span><p>Ninety days with one field. Give thanks, look again at the twelve, and ask which field is next.</p><button class="gold-btn" data-act="sub" data-s="review">Review the season</button></div>` : ""}`;
    }

    h += `<div class="pane pad switchrow"><div><b>Floor mode</b><p class="note">For hard weeks. Today shows only your three floor lines. Nothing is counted against you.</p></div>
      <label class="switch"><input type="checkbox" id="floor-mode" data-toggle="floorMode" ${state.floorMode ? "checked" : ""} aria-label="Floor mode"><span></span></label></div>`;

    if (state.floorMode) {
      if (state.floorDay.date !== d) state.floorDay = { date: d, done: [false, false, false] };
      h += `<div class="secrow"><h2 class="h2">Your floor</h2><button class="pill" data-act="tab" data-t="rule">Edit</button></div>`;
      h += state.floor.map((t, i) => t ? keepRow({ text: t, note: "", time: "" }, state.floorDay.done[i], "floorkeep", `data-i="${i}"`) : "").join("");
      h += `<p class="creed">The absence of feeling is not the absence of God.</p>`;
    } else {
      const daily = state.rule.filter((r) => r.cadence === "daily").sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
      h += `<div class="secrow"><h2 class="h2">Today</h2><button class="pill" data-act="tab" data-t="rule">Edit the rule</button></div>`;
      h += daily.length ? daily.map((r) => keepRow(r, r.done === periodKey("daily"), "keep", `data-id="${r.id}"`)).join("") : `<p class="sub">No daily practices yet. Add one in your Rule.</p>`;
      const longer = state.rule.filter((r) => r.cadence === "weekly" || r.cadence === "monthly");
      if (longer.length) {
        h += `<h2 class="h2 mt">This week and this month</h2>`;
        h += longer.map((r) => keepRow(Object.assign({}, r, { note: [r.cadence, r.note].filter(Boolean).join(" · ") }), r.done === periodKey(r.cadence), "keep", `data-id="${r.id}"`)).join("");
      }
    }
    const up = upcomingFeasts(3);
    h += `<h2 class="h2 mt">The Church's year</h2><div class="pane pad">${up.map((u) => {
      const n = daysBetween(now, fromISO(u.date));
      return `<div class="fline"><span>${esc(u.name)}</span><span class="fd">${n === 0 ? "today" : n === 1 ? "tomorrow" : pretty(fromISO(u.date))}</span></div>`;
    }).join("")}</div>
      <p class="creed">${esc(S.name)}. ${esc(S.asks)}</p></section>`;
    return h;
  }

  /* ───────── Fields ───────── */
  function fieldCard(f) {
    const r = state.fields[f.id], lvl = r.level, open = ui.open === f.id;
    const isFocus = state.focus && state.focus.field === f.id;
    let h = `<div class="pane field ${open ? "open" : ""} ${isFocus ? "focus" : ""} ${ui.gild === f.id ? "gilding" : ""}" id="field-${f.id}">
      <button class="row field-head" data-act="open" data-f="${f.id}" aria-expanded="${open}">
        <span class="lampwrap">${badge(f.icon, lvl > 0)}<svg class="lamp" viewBox="0 0 44 44" aria-hidden="true"><circle class="lt" cx="22" cy="22" r="20"/><circle class="lp" cx="22" cy="22" r="20" style="stroke-dashoffset:${125.6 - 125.6 * (lvl / 4)}"/></svg></span>
        <span class="rowtext"><b>${f.n} · ${esc(f.name)}</b><span>${LEVELS[lvl]}${isFocus ? " · this season's field" : ""}</span></span>
        <span class="chev">${icon("chev", 18)}</span></button>`;
    if (!open) return h + `</div>`;
    h += `<div class="field-body">
      <p class="sub">${esc(f.holds)}</p>
      <span class="rub">What it is for</span><p class="telos">${esc(f.end)}</p>
      <span class="rub">The disorder to watch for</span><p class="disorder">${esc(f.disorder)}</p>
      ${f.care ? `<p class="care">${esc(f.care)}</p>` : ""}
      <span class="rub">Examine</span><ul class="quest">${f.examine.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>
      <span class="rub">The four movements</span>
      <div class="moves">${MOVES.map((m) => `<div class="move"><div class="mh"><b>${m.name}</b><em>${m.verb}</em></div><p>${esc(m.ask)}</p>
        <textarea class="in" rows="2" id="mv-${f.id}-${m.id}" data-bind="fields.${f.id}.${m.id}" placeholder="${esc(m.ph)}" aria-label="${m.name}: ${esc(f.name)}">${esc(r[m.id])}</textarea>
        ${m.id === "spend" ? `<div class="btnrow mt"><select class="in fix" id="cad-${f.id}" aria-label="How often" style="width:auto"><option value="daily">daily</option><option value="weekly" selected>weekly</option><option value="monthly">monthly</option></select><button class="pill gold" data-act="place" data-f="${f.id}">Place this in my Rule</button></div>` : ""}</div>`).join("")}</div>
      <span class="rub">The ladder</span>
      <ol class="ladder">${f.rungs.map((t, i) => `<li class="${i < lvl ? "done" : i === lvl ? "now" : ""}"><span class="rn">${i + 1}</span><span class="rt2">${esc(t)}</span>${i === lvl ? `<button class="pill gold" data-act="climb" data-f="${f.id}">Kept</button>` : ""}</li>`).join("")}</ol>
      <p class="mastery"><span class="rub inl">Radiant looks like</span>${esc(f.radiant)}</p>
      ${area(`fields.${f.id}.act`, r.act, "Small, dated, possible this week.", "My one next act")}
      <div class="btnrow">${isFocus ? `<span class="tag">This season's field</span>` : `<button class="gold-btn" data-act="focus" data-f="${f.id}">Make this my field for the season</button>`}</div>
      <blockquote class="quote">“${esc(f.verse.t)}”<cite>${esc(f.verse.r)} · Catechism ${esc(f.ccc)}</cite></blockquote>
    </div></div>`;
    return h;
  }
  function Fields() {
    return `<section class="stack rise"><h1 class="h1">The Twelve Fields</h1>
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
        const f = r.field ? fieldById(r.field) : null;
        return `<div class="row">${badge(f ? f.icon : "flame")}<span class="rowtext"><b>${esc(r.text)}</b><span>${esc([r.time, r.note].filter(Boolean).join(" · "))}</span></span>
          ${f ? `<span class="tag">${esc(f.name)}</span>` : ""}<button class="icobtn" data-act="delrule" data-id="${r.id}" aria-label="Remove ${esc(r.text)}">${icon("trash", 18)}</button></div>`;
      }).join("")}</div>` : `<p class="sub">Nothing here yet.</p>`}`;
    };
    const c = state.church;
    return `<section class="stack rise"><h1 class="h1">Rule of Life</h1>
      <p class="lede">A trellis, not a cage. Small enough to keep in your worst week.</p>
      <div class="pane lit pad"><span class="rub">The floor</span><p class="sub">Three lines you will keep when everything else falls away. Decide them now, in a good hour.</p>
        <div class="mt">${[0, 1, 2].map((i) => input(`floor.${i}`, state.floor[i], "A line of your floor", `Line ${i + 1}`)).join("")}</div></div>
      ${group("daily", "Each day")}${group("weekly", "Each week")}${group("monthly", "Each month")}${group("yearly", "Each year")}
      <div class="pane pad mt"><span class="rub">Add a practice</span>
        <div class="frow"><input class="in" id="new-text" placeholder="What, exactly" aria-label="Practice"><input class="in tm fix" id="new-time" type="time" aria-label="Time"></div>
        <div class="frow"><select class="in" id="new-cad" aria-label="How often"><option value="daily">daily</option><option value="weekly">weekly</option><option value="monthly">monthly</option><option value="yearly">yearly</option></select>
          <select class="in" id="new-field" aria-label="Field">${FIELDS.map((f) => `<option value="${f.id}">${f.name}</option>`).join("")}</select>
          <button class="gold-btn fix" data-act="addrule">Add</button></div>
        <p class="note">Give it a time and a place. One new practice at a time.</p></div>
      <h2 class="h2 mt">In the Body</h2>
      <div class="pane pad"><p class="sub">No one is saved alone. Name the places and people that hold you.</p><div class="mt">
        ${input("church.parish", c.parish, "By name, not Catholicism in general", "My parish")}
        <label class="fieldset"><span class="lab">Confession</span><select class="in" id="conf" data-bind="church.confession">${["every two weeks", "monthly", "every two months", "each season"].map((o) => `<option ${c.confession === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>
        ${input("church.ahead", c.ahead, "A director, a confessor, an older witness", "Someone ahead of me")}
        ${input("church.beside", c.beside, "A friend who knows the truth and says it", "Someone beside me")}
        ${input("church.behind", c.behind, "Someone I am helping along", "Someone behind me")}
        <div class="frow">${input("church.shownTo", c.shownTo, "A rule written alone is a rumour", "I have shown this rule to")}${input("church.shownOn", c.shownOn, "date", "On")}</div></div></div>
      <h2 class="h2 mt">The Church's own minimum</h2>
      <div class="pane pad"><p class="sub">The five precepts are the floor beneath every floor (Catechism 2041-2043).</p><ol class="plain mt">${PRECEPTS.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></div>
      ${PREVIEW ? `<p class="note">In the full app you can add your rule to your calendar and print it as a booklet.</p>` : `<div class="btnrow mt"><button class="gold-btn" data-act="ics">Add my rule to my calendar</button><button class="pill gold" data-act="print">Print my rule</button></div><p class="note">The calendar file opens in Apple Calendar, Google Calendar or Outlook. There is only one life, so use your one calendar.</p>`}
    </section>`;
  }

  /* ───────── Examen ───────── */
  function Examen() {
    const d = todayISO(), e = state.diary[d] || {};
    const past = Object.keys(state.diary).filter((k) => k !== d && Object.values(state.diary[k]).some(Boolean)).sort().reverse().slice(0, 60);
    return `<section class="stack rise"><h1 class="h1">Evening Examen</h1>
      <p class="lede">Five minutes. Gentle. This is medicine, not an audit. If a step distresses you, skip it.</p>
      <div class="pane pad">${EXAMEN.map((s, i) => `<div class="step"><h3 class="h3"><span class="n">${i + 1}</span>${s.name}</h3><p>${esc(s.text)}</p>
        ${s.field ? area(`diary.${d}.${s.field}`, e[s.field], s.ph, "") : ""}${s.field2 ? area(`diary.${d}.${s.field2}`, e[s.field2], s.ph2, "") : ""}${s.field3 ? area(`diary.${d}.${s.field3}`, e[s.field3], s.ph3, "") : ""}</div>`).join("")}</div>
      <p class="note">What you write stays on this device. The examen never replaces confession, and grave sin belongs there.</p>
      ${past.length ? `<h2 class="h2 mt">Earlier evenings</h2><div class="pane pad">${past.map((k) => { const x = state.diary[k];
        return `<details class="entry"><summary>${esc(fromISO(k).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</summary>
        ${[["Thanks", x.thanks], ["Alive", x.alive], ["Tight", x.tight], ["Sin", x.sin], ["Wound", x.wound], ["Limit", x.limit], ["Tomorrow", x.tomorrow]].filter((p) => p[1]).map((p) => `<p><span class="rub inl">${p[0]}</span>${esc(p[1])}</p>`).join("")}</details>`; }).join("")}</div>` : ""}
    </section>`;
  }

  /* ───────── More ───────── */
  const MORE = [
    ["model", "The Steward's Model", "One Master, twelve fields, four movements, six laws", "spark"],
    ["review", "Season review", "Walk the twelve fields and choose one", "grid"],
    ["year", "The Church's year", "The season, and the feasts ahead", "calendar"],
    ["treasury", "The Treasury", "First fruits, and an order for the rest", "coin"],
    ["prayers", "Prayers of the steward", "Morning, night, and the hard days", "flame"],
    ["backup", "Keep my words safe", "Back up, restore, or erase what is on this device", "shield"],
    ["about", "About this app", "What it is, and what it must never become", "book"]
  ];
  function More() {
    if (!ui.sub) return `<section class="stack rise"><h1 class="h1">More</h1><p class="lede">The model beneath the app, and the tools around it.</p>
      ${MORE.map(([id, t, s, ic]) => `<button class="pane row link-row" data-act="sub" data-s="${id}">${badge(ic, id === "model")}<span class="rowtext"><b>${t}</b><span>${s}</span></span>${icon("chev", 18)}</button>`).join("")}</section>`;
    return `<section class="stack rise">${back()}${({ model: Model, review: Review, year: Year, treasury: Treasury, prayers: Prayers, backup: Backup, about: About }[ui.sub] || Model)()}</section>`;
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
      <div class="pane pad">${FIELDS.map((f) => { const lvl = state.fields[f.id].level;
        return `<div class="reviewrow"><span class="nm"><b>${f.n} · ${esc(f.name)}</b><span id="lv-${f.id}">${LEVELS[lvl]}</span></span>
          <span class="dots5" role="group" aria-label="${esc(f.name)}: light">${[1, 2, 3, 4].map((n) => `<button data-act="setlevel" data-f="${f.id}" data-l="${n}" aria-pressed="${lvl >= n}" aria-label="${LEVELS[n]}"></button>`).join("")}</span>
          <button class="pill ${state.focus && state.focus.field === f.id ? "gold" : ""}" data-act="focus" data-f="${f.id}">${state.focus && state.focus.field === f.id ? "This season" : "Choose"}</button></div>`; }).join("")}</div>
      <p class="note">Tap a lit dot again to dim it. Usually the field to choose is the dimmest one, or the one you skimmed.</p>
      <p class="creed">Master, make me faithful in the field I have been avoiding.</p>`;
  }

  function Year() {
    const now = new Date(), key = L.seasonOn(now), S = L.SEASONS[key], t = todayISO();
    return `<h1 class="h1">The Church's year</h1>
      <div class="pane lit pad"><span class="rub">Now · ${esc(S.colour)}</span><h2 class="h2">${esc(S.name)}</h2><p>${esc(S.asks)}</p></div>
      <h2 class="h2 mt">The feasts ahead</h2><div class="pane pad">${upcomingFeasts(16).map((u) => `<div class="fline ${u.date === t ? "today" : ""}"><span>${esc(u.name)}</span><span class="fd">${pretty(fromISO(u.date))}</span></div>`).join("")}</div>
      <p class="note">A simplified general Roman calendar. Your diocese may keep some feasts on other days.</p>`;
  }

  function bucketAmount(b) { const inc = parseFloat(String(state.treasury.income).replace(",", ".")) || 0; return (inc * (parseFloat(b.pct) || 0)) / 100; }
  const money = (n) => esc(state.treasury.currency) + (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  function Treasury() {
    const T = state.treasury, total = T.buckets.reduce((n, b) => n + (parseFloat(b.pct) || 0), 0);
    return `<h1 class="h1">The Treasury</h1><p class="lede">Give first. Then let every euro be told where to go.</p>
      <div class="pane pad"><div class="frow">${input("treasury.income", T.income, "0", "Income this month", "num")}${input("treasury.currency", T.currency, "€", "Currency", "num")}</div>
      ${T.buckets.map((b, i) => `<div class="bucket"><span><b>${esc(b.name)}</b><span class="note" style="display:block">${esc(b.note)}</span></span>
        <input class="in pc" id="pc-${i}" inputmode="decimal" data-bind="treasury.buckets.${i}.pct" data-live="treasury" value="${esc(b.pct)}" aria-label="${esc(b.name)} percent">
        <span class="amt" data-amt="${i}">${money(bucketAmount(b))}</span></div>`).join("")}
      <p class="note mt" id="pct-total">${total === 100 ? "The six parts make one hundred." : "The parts add up to " + total + ". Adjust them to make one hundred."}</p></div>
      <p class="note">The proportions are a starting pattern, not a rule of the Church. Set them with someone you trust. This is not financial advice.</p>
      <p class="creed">Where your treasure is, there will your heart be also.</p>`;
  }
  function refreshTreasury() {
    state.treasury.buckets.forEach((b, i) => { const el = root.querySelector(`[data-amt="${i}"]`); if (el) el.innerHTML = money(bucketAmount(b)); });
    const total = state.treasury.buckets.reduce((n, b) => n + (parseFloat(b.pct) || 0), 0), el = document.getElementById("pct-total");
    if (el) el.textContent = total === 100 ? "The six parts make one hundred." : "The parts add up to " + total + ". Adjust them to make one hundred.";
  }

  function Prayers() {
    return `<h1 class="h1">Prayers of the steward</h1><p class="sub">Written for private use. They are not liturgical texts.</p>
      ${PRAYERS.map(([t, p]) => `<div class="pane pad"><span class="rub">${esc(t)}</span><p class="vtext sm">${esc(p)}</p></div>`).join("")}
      <div class="pane pad"><span class="rub">The four movements</span>${MOVES.map((m) => `<p><b>${m.name}.</b> ${esc(m.prayer)}</p>`).join("")}</div>`;
  }

  function Backup() {
    return `<h1 class="h1">Keep my words safe</h1><p class="lede">Everything you write lives only in this browser, on this device. Nothing is sent anywhere.</p>
      <div class="pane pad"><span class="rub">Back up</span><p class="sub">Clearing your browser data erases the app's memory. Keep a copy.</p>
        <div class="btnrow mt">${PREVIEW ? "" : `<button class="gold-btn" data-act="download">Save a backup file</button>`}<button class="pill gold" data-act="copybackup">Copy my backup as text</button></div>
        <textarea class="in mt" id="backup-out" rows="3" readonly hidden aria-label="Backup text"></textarea></div>
      <div class="pane pad"><span class="rub">Restore</span><p class="sub">Paste a backup here, or choose a backup file. This replaces what is on this device.</p>
        <textarea class="in mt" id="backup-in" rows="3" placeholder="Paste your backup text" aria-label="Paste a backup"></textarea>
        <div class="btnrow mt"><button class="pill gold" data-act="importpaste">Restore from this text</button><input type="file" id="backup-file" accept="application/json,.json" aria-label="Choose a backup file"></div></div>
      <div class="pane pad"><span class="rub">Erase</span><p class="sub">Remove everything this app has stored on this device.</p>
        <div class="btnrow mt"><button class="pill" data-act="erase1">Erase everything</button><button class="pill" id="erase2" data-act="erase2" hidden>Yes, erase it all</button></div></div>`;
  }

  function About() {
    return `<h1 class="h1">About this app</h1><div class="prose">
      <p class="lede">Self-knowledge in the presence of God, turned into scheduled love.</p>
      <p>Illuminated Life is the companion to the booklet <i>Illuminated: The Image of God, Embodied</i>. Every screen is a chapter of that booklet in working form. Read the theology first. Without it, this is only a task list with a candle on it.</p>
      <h2 class="h2 mt">What it promises</h2><ul class="plain"><li>It lights, and never scores. Dignity is not a metric.</li><li>It asks about one field. The other eleven stay quiet.</li><li>It lets you begin again without penalty.</li><li>It sends you out of itself: to your parish, your confessor, your friends and the poor.</li><li>It keeps your words on your own device.</li></ul>
      <h2 class="h2 mt">What it must never become</h2><p>It is not a spiritual director, a confessor or a diagnosis. It cannot absolve, and it cannot discern a vocation. If you carry trauma, depression, addiction, disordered eating or thoughts of harming yourself, please work with a qualified professional, and let this accompany that work.</p>
      <p>If the app ever feels like a judge and not a trellis, switch on floor mode, or close it for a season. The anchors are enough.</p>
      <h2 class="h2 mt">On authority</h2><p>This is a private work of formation. It is not an official text of the Church. It is meant to agree in every point with Sacred Scripture and the Magisterium, and it is submitted to the Church's judgement. Catechism numbers are given so that each claim can be checked.</p></div>
      <p class="creed">Come to him and be enlightened.</p>`;
  }

  /* ───────── the printed booklet ───────── */
  function Book() {
    const F = state.focus ? fieldById(state.focus.field) : null, c = state.church;
    const by = (cad) => state.rule.filter((r) => r.cadence === cad).map((r) => `<p>${esc([r.time, r.text].filter(Boolean).join("  "))}</p>`).join("");
    return `<div class="bp bcover"><p>A RULE OF LIFE</p><h1>Illuminated Life</h1><p><i>Receive, bless, spend, return.</i></p><p>${esc(new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }))}</p></div>
      <div class="bp"><h2>My floor</h2>${state.floor.filter(Boolean).map((t, i) => `<p>${i + 1}. ${esc(t)}</p>`).join("")}
        <h2 style="margin-top:18pt">My rule</h2><h3>Each day</h3>${by("daily")}<h3>Each week</h3>${by("weekly")}<h3>Each month</h3>${by("monthly")}<h3>Each year</h3>${by("yearly")}
        <h3>In the Body</h3><p>Parish: ${esc(c.parish)}</p><p>Confession: ${esc(c.confession)}</p><p>Ahead of me: ${esc(c.ahead)}   Beside me: ${esc(c.beside)}   Behind me: ${esc(c.behind)}</p><p>Shown to: ${esc(c.shownTo)} ${esc(c.shownOn)}</p></div>
      <div class="bp"><h2>The twelve fields</h2>${F ? `<p><i>This season's field: ${esc(F.name)}</i></p>` : ""}
        ${FIELDS.map((f) => { const r = state.fields[f.id]; return `<div class="ba"><h3>${f.n}. ${esc(f.name)} · ${LEVELS[r.level]}</h3>${MOVES.filter((m) => r[m.id]).map((m) => `<p><b>${m.name}.</b> ${esc(r[m.id])}</p>`).join("")}${r.act ? `<p><b>Next act.</b> ${esc(r.act)}</p>` : ""}</div>`; }).join("")}</div>`;
  }

  /* ───────── render ───────── */
  const NAV = [["today", "Today", "calendar"], ["fields", "Fields", "grid"], ["rule", "Rule", "scroll"], ["examen", "Examen", "moon"], ["more", "More", "more"]];
  function render() {
    const S = L.SEASONS[L.seasonOn(new Date())];
    const screen = { today: Today, fields: Fields, rule: Rule, examen: Examen, more: More }[ui.tab]();
    root.innerHTML = `<header class="top"><span class="mark">Illuminated Life</span><span class="season-chip">${esc(S.name)}</span></header>
      <main class="body" id="main">${screen}</main>
      <div class="toast" id="toast" role="status" ${ui.toast ? "" : "hidden"}>${esc(ui.toast || "")}</div>
      <nav class="tabbar" aria-label="Sections">${NAV.map(([id, label, ic]) => `<button data-act="tab" data-t="${id}" ${ui.tab === id ? 'aria-current="page"' : ""}>${icon(ic, 22)}<span>${label}</span></button>`).join("")}</nav>
      <div class="book" aria-hidden="true">${Book()}</div>`;
  }
  function go(tab, sub) { ui.tab = tab; ui.sub = sub || null; render(); window.scrollTo(0, 0); }

  /* ───────── files ───────── */
  function download(name, text, mime) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function makeICS() {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", day = todayISO().replace(/-/g, "");
    const freq = { daily: "DAILY", weekly: "WEEKLY", monthly: "MONTHLY", yearly: "YEARLY" };
    const clean = (s) => String(s || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
    const ev = state.rule.map((r) => {
      const lines = ["BEGIN:VEVENT", "UID:" + r.id + "@illuminated-life", "DTSTAMP:" + stamp];
      if (r.time) { const t = r.time.replace(":", "") + "00"; lines.push("DTSTART:" + day + "T" + t, "DURATION:PT15M"); }
      else lines.push("DTSTART;VALUE=DATE:" + day);
      lines.push("RRULE:FREQ=" + freq[r.cadence], "SUMMARY:" + clean(r.text), "DESCRIPTION:" + clean(r.note), "END:VEVENT");
      return lines.join("\r\n");
    });
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Illuminated Life//Rule of Life//EN", "CALSCALE:GREGORIAN"].concat(ev, ["END:VCALENDAR"]).join("\r\n");
  }
  function restore(text) {
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== "object" || !data.fields || !Array.isArray(data.rule)) throw new Error("shape");
      dirty = false; localStorage.setItem(KEY, JSON.stringify(data)); state = load(); go("today"); flash("Restored");
    } catch (e) { flash("That is not a backup from this app. Nothing was changed."); }
  }

  /* ───────── events ───────── */
  const acts = {
    tab: (el) => go(el.dataset.t),
    sub: (el) => go("more", el.dataset.s),
    back: () => go("more"),
    toggleprayer: () => { ui.showPrayer = !ui.showPrayer; render(); },
    open: (el) => { ui.open = ui.open === el.dataset.f ? null : el.dataset.f; render(); },
    gofield: (el) => { ui.tab = "fields"; ui.sub = null; ui.open = el.dataset.f; render(); const c = document.getElementById("field-" + el.dataset.f); if (c) c.scrollIntoView({ block: "start" }); window.scrollBy(0, -70); },
    keep: (el) => { const r = state.rule.find((x) => x.id === el.dataset.id); if (!r) return; const k = periodKey(r.cadence); r.done = r.done === k ? null : k; el.setAttribute("aria-pressed", r.done === k ? "true" : "false"); save(); },
    floorkeep: (el) => { const i = Number(el.dataset.i); state.floorDay.done[i] = !state.floorDay.done[i]; el.setAttribute("aria-pressed", state.floorDay.done[i] ? "true" : "false"); save(); },
    climb: (el) => { const f = fieldById(el.dataset.f), r = state.fields[f.id]; if (r.level >= 4) return; r.level += 1; ui.gild = f.id; save(); render(); flash(f.name + ": " + LEVELS[r.level]); setTimeout(() => { ui.gild = null; }, 1500); },
    setlevel: (el) => { const r = state.fields[el.dataset.f], n = Number(el.dataset.l); r.level = r.level === n ? n - 1 : n; save(); render(); },
    focus: (el) => { const f = fieldById(el.dataset.f); if (state.focus && state.focus.field === f.id) return; state.focus = { field: f.id, since: todayISO() }; save(); render(); flash(f.name + " is your field for this season"); },
    place: (el) => { const f = fieldById(el.dataset.f), text = (state.fields[f.id].spend || "").trim(); if (!text) return flash("Write your Spend line first");
      const cad = document.getElementById("cad-" + f.id).value; state.rule.push({ id: uid(), cadence: cad, text, time: "", note: f.name, field: f.id, done: null }); save(); flash("Placed in your Rule, " + cad); },
    addrule: () => { const text = document.getElementById("new-text").value.trim(); if (!text) return flash("Say what the practice is");
      state.rule.push({ id: uid(), cadence: document.getElementById("new-cad").value, text, time: document.getElementById("new-time").value, note: "", field: document.getElementById("new-field").value, done: null }); save(); render(); flash("Added to your Rule"); },
    delrule: (el) => { state.rule = state.rule.filter((r) => r.id !== el.dataset.id); save(); render(); },
    ics: () => { download("illuminated-life-rule.ics", makeICS(), "text/calendar"); flash("Calendar file saved. Open it to add your rule."); },
    print: () => window.print(),
    download: () => { download("illuminated-life-backup-" + todayISO() + ".json", JSON.stringify(state, null, 2), "application/json"); flash("Backup saved"); },
    copybackup: () => { const text = JSON.stringify(state), out = document.getElementById("backup-out"); out.hidden = false; out.value = text; out.focus(); out.select();
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => flash("Copied. Paste it somewhere safe."), () => flash("Select the text and copy it.")); },
    importpaste: () => restore(document.getElementById("backup-in").value),
    erase1: () => { document.getElementById("erase2").hidden = false; },
    erase2: () => { dirty = false; clearTimeout(saveTimer); try { localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ } state = blank(); go("today"); flash("Erased"); }
  };

  root.addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el && acts[el.dataset.act]) acts[el.dataset.act](el); });
  root.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
  root.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.bind) { setPath(el.dataset.bind, el.value); save(); if (el.dataset.live === "treasury" || el.dataset.bind.startsWith("treasury.")) refreshTreasury(); }
  });
  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.toggle) { state[el.dataset.toggle] = el.checked; save(); render(); }
    if (el.id === "backup-file" && el.files[0]) { const fr = new FileReader(); fr.onload = () => restore(String(fr.result)); fr.readAsText(el.files[0]); }
  });

  render();

  // Offline use, on the real site only.
  if (!PREVIEW && "serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
