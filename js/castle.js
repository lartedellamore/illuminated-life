/* Illuminated Life · the Interior Castle
   A short picture to pray with, after St Teresa of Ávila's "Interior Castle" (1577):
   the soul as a castle cut from one clear crystal, seven dwelling places, the King at the centre.

   What it is: one drawing, lit from the gate to the centre in about forty seconds, and the same
   seven dwelling places as an ordinary list beneath it.
   What it must never become: a score. It reads nothing from the person's state and saves nothing.
   It does not say where anyone is.

   How it moves: every part carries its own start time (--d). The stage carries one offset (--o),
   so "watch from here" only changes that one number. With reduced motion the drawing is shown whole
   and still, and the list says everything the captions say.

   The words are this app's own summary. They await a priest's review, like the rest of the text. */
(function () {
  "use strict";
  const IL = (window.IL = window.IL || {});

  const MANSIONS = [
    { n: "I", name: "Know yourself", cap: "You come in by prayer. The rooms are dim, because much from outside still comes in with you.",
      more: "Self-knowledge and humility. Teresa never lets the soul leave this room behind. It is carried into every other." },
    { n: "II", name: "Hear, and stay", cap: "Now you hear him calling: in a homily, a book, a friend, a sorrow. The work here is to stay.",
      more: "Perseverance. The struggle is sharper here, because the call is heard." },
    { n: "III", name: "An ordered life", cap: "Prayer kept, duties done, a careful life. Then dryness asks whether you love God or your own good order.",
      more: "Humility before security. A good life can still be shaken by small trials, and that is how it learns." },
    { n: "IV", name: "The spring", cap: "God begins to give what effort cannot make: a quiet that rises like water from its own spring.",
      more: "The prayer of quiet. Here love matters more than much thinking." },
    { n: "V", name: "The silkworm", cap: "Union. The silkworm spins its cocoon and dies, and a small white butterfly comes out.",
      more: "Teresa's test of this union is plain, and it is not a feeling. It is love of neighbour." },
    { n: "VI", name: "Betrothal", cap: "Great longing and great trials together. The soul is made ready, and cannot do it for herself.",
      more: "Purification. Much is given here and much is suffered, and both come from the same love." },
    { n: "VII", name: "The King's room", cap: "A peace at the centre that stays, even in hard work. Martha and Mary go together now.",
      more: "The spiritual marriage. Prayer is for this: that good works be born of it, always." }
  ];
  const INTRO = { name: "The soul is a castle", cap: "Cut from one clear crystal, with many rooms. At its centre lives the King." };
  const OUTRO = { name: "The door is prayer", cap: "The sun at the centre was shining the whole time." };

  /* ───────── the drawing ───────── */
  const CX = 160, CY = 160, N = 7, SEG = (2 * Math.PI) / N;
  const RADII = [146, 126, 106, 86, 66, 46, 28];
  const T_IN = 3.2, T_STEP = 4.6, T_OUT = 6; // seconds: the opening, each dwelling place, the close
  const at = (k) => T_IN + k * T_STEP; // when dwelling place k (0 to 6) is entered; at(7) is the close
  const TOTAL = at(N) + T_OUT;
  const f1 = (x) => x.toFixed(1);

  // Seven-sided walls. Each wall is turned a little further than the one outside it, so the castle winds inward like a cut gem.
  const TWIST = SEG / 7;
  const turn = (k) => k * TWIST - Math.PI / 2;
  const corner = (k, i) => [CX + RADII[k] * Math.cos(turn(k) + i * SEG), CY + RADII[k] * Math.sin(turn(k) + i * SEG)];
  const wall = (k) => Array.from({ length: N }, (_, i) => corner(k, i).map(f1).join(",")).join(" ");
  // One dwelling place: the band between its own wall and the next one in (the seventh reaches the centre).
  const band = (k) => [k, k + 1].filter((j) => j < N).map((j) => "M" + wall(j).replace(/ /g, "L") + "Z").join("");
  // Where each wall crosses the path that runs straight up from the gate.
  const doorY = (k) => {
    let off = (Math.PI / 2 - (turn(k) + SEG / 2)) % SEG; if (off < 0) off += SEG; if (off > SEG / 2) off = SEG - off; // the angle to the nearest side's midpoint
    return CY + (RADII[k] * Math.cos(SEG / 2)) / Math.cos(off);
  };
  // Where the small light rests inside each dwelling place.
  const restY = (k) => (k < N - 1 ? (doorY(k) + doorY(k + 1)) / 2 : CY + 20);

  function facets() {
    let d = "";
    for (let k = 0; k < N - 1; k++) for (let i = 0; i < N; i++) {
      const [x, y] = corner(k, i), a = corner(k + 1, i), b = corner(k + 1, (i + N - 1) % N);
      d += `M${f1(x)} ${f1(y)}L${f1(a[0])} ${f1(a[1])}M${f1(x)} ${f1(y)}L${f1(b[0])} ${f1(b[1])}`;
    }
    return d;
  }
  const door = (k) => { const y = doorY(k), w = k < 5 ? 4 : 3; return `M${CX - w} ${f1(y + 4)}V${f1(y - 2)}Q${CX - w} ${f1(y - 7)} ${CX} ${f1(y - 9.5)}Q${CX + w} ${f1(y - 7)} ${CX + w} ${f1(y - 2)}V${f1(y + 4)}Z`; };
  function rays() {
    let d = "";
    for (let i = 0; i < 14; i++) { const a = (i * Math.PI) / 7 + Math.PI / 14, r1 = 17, r2 = i % 2 ? 150 : 132;
      d += `M${f1(CX + r1 * Math.cos(a))} ${f1(CY + r1 * Math.sin(a))}L${f1(CX + r2 * Math.cos(a))} ${f1(CY + r2 * Math.sin(a))}`; }
    return d;
  }
  // The small light: in at the gate, a rest in each dwelling place, and at the end into the sun.
  function lightPath() {
    const pc = (t) => ((t / TOTAL) * 100).toFixed(2) + "%", y0 = CY + 164, to = (y) => `transform:translateY(${f1(y - CY)}px)`;
    const k = [`0%{${to(y0)};opacity:0}`, `${pc(1.4)}{${to(y0)};opacity:0}`, `${pc(2.4)}{${to(y0)};opacity:1}`];
    let prev = y0;
    for (let i = 0; i < N; i++) { k.push(`${pc(at(i))}{${to(prev)};opacity:1}`, `${pc(at(i) + 1.6)}{${to(restY(i))};opacity:1}`); prev = restY(i); }
    k.push(`${pc(at(N))}{${to(prev)};opacity:1}`, `${pc(at(N) + 1.6)}{${to(CY)};opacity:1}`, `${pc(at(N) + 2.6)}{${to(CY)};opacity:0}`, `100%{${to(CY)};opacity:0}`);
    return `@keyframes cst-light{${k.join("")}}`;
  }
  const delay = (t) => `style="--d:${t.toFixed(1)}s"`;

  function drawing() {
    let h = `<svg class="cst-svg" viewBox="0 0 320 336" role="img" aria-label="A castle of clear crystal, seen from above: seven walls, one inside the other, each with a small door, and a golden sun at the centre. A small light enters at the gate and goes inward, and each dwelling place brightens as it is entered.">
      <style>${lightPath()}</style>`;
    h += `<polygon class="cst-dim" points="${wall(0)}"/>`;
    for (let k = 0; k < N; k++) h += `<path class="cst-band cst-b${k + 1}" fill-rule="evenodd" ${delay(at(k))} d="${band(k)}"/>`;
    h += `<path class="cst-facet" d="${facets()}"/>`;
    for (let k = 0; k < N; k++) h += `<polygon class="cst-wall${k ? "" : " outer"}" points="${wall(k)}"/>`;
    h += `<path class="cst-rays" ${delay(at(N) + 1.4)} d="${rays()}"/>`;
    for (let k = 0; k < N; k++) h += `<path class="cst-door" d="${door(k)}"/><path class="cst-door lit" ${delay(at(k))} d="${door(k)}"/>`;
    h += `<circle class="cst-halo" ${delay(at(N) + 1.4)} cx="${CX}" cy="${CY}" r="24"/><circle class="cst-sun" cx="${CX}" cy="${CY}" r="10"/>
      <g class="cst-light" style="--d:0s;--l:${TOTAL.toFixed(1)}s"><circle class="glow" cx="${CX}" cy="${CY}" r="8"/><circle class="core" cx="${CX}" cy="${CY}" r="3.2"/></g></svg>`;
    return h;
  }

  /* ───────── the screen ─────────
     o.from: null to play from the opening, or 0 to 6 to watch from that dwelling place. */
  function screen(o) {
    const esc = o.esc, from = Number.isInteger(o.from) && o.from >= 0 && o.from < N ? o.from : null;
    const offset = from == null ? 0 : at(from) - 0.3;
    const caps = [Object.assign({ d: 0.3, l: T_IN - 0.3 }, INTRO)]
      .concat(MANSIONS.map((m, k) => ({ d: at(k), l: T_STEP, name: m.n + " · " + m.name, cap: m.cap })))
      .concat([Object.assign({ d: at(N), l: T_OUT, last: true }, OUTRO)]);
    return `<h1 class="h1">The Interior Castle</h1>
      <div class="pane cst" id="castle" style="--o:${offset.toFixed(1)}s">
        ${drawing()}
        <div class="cst-bar" aria-hidden="true">${MANSIONS.map((m, k) => `<i ${delay(at(k))}></i>`).join("")}</div>
        <div class="cst-caps" aria-hidden="true">${caps.map((c) => `<p class="cst-cap${c.last ? " last" : ""}" style="--d:${c.d.toFixed(1)}s;--l:${c.l.toFixed(1)}s"><b>${esc(c.name)}</b><span>${esc(c.cap)}</span></p>`).join("")}</div>
        <div class="btnrow cst-acts"><button class="pill" data-act="castlepause" aria-pressed="false">Pause</button><button class="pill" data-act="castleagain">From the beginning</button></div>
      </div>
      <p class="lede">St Teresa of Ávila saw the soul as a castle cut from one clear crystal, with many rooms, and the King living at its centre. The way in is prayer, and the way goes inward.</p>
      <h2 class="h2 mt">The seven dwelling places</h2>
      <ol class="pane cst-list">${MANSIONS.map((m, k) => `<li><button class="row link-row" data-act="castlego" data-k="${k}" aria-label="${esc(m.n + ". " + m.name + ". " + m.cap + " " + m.more)} Watch from here.">
        <span class="badge cst-n cst-b${k + 1}">${m.n}</span><span class="rowtext"><b>${esc(m.name)}</b><span>${esc(m.cap)}</span><span class="cst-more">${esc(m.more)}</span></span></button></li>`).join("")}</ol>
      <div class="pane lit pad"><span class="rub">The door is prayer</span>
        <p>Nothing here needs to be reached. It is entered, a little each day, and the first room is never left behind.</p>
        <div class="btnrow"><button class="gold-btn" data-act="sub" data-s="prayers">Open the prayers</button><button class="pill gold" data-act="castleexamen">The evening Examen</button></div></div>
      <div class="pane quiet pad"><span class="rub">Read this first</span>
        <p>This is a picture to pray with. The app does not place you in it, and you should not place yourself. Teresa says the rooms do not lie in a row, that God leads each soul by its own way, and that he gives when he wills and to whom he wills.</p>
        <p>Her test is not what is felt in prayer. It is how you love your neighbour.</p>
        <p class="note">The words are this app's own summary of <i>The Interior Castle</i> (1577) and await a priest's review. Read the book itself, with your confessor or director.</p></div>`;
  }

  IL.castle = { screen, MANSIONS, TOTAL };
})();
