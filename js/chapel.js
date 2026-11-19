/* Illuminated Life · the chapel
   The Interior Castle shown at the door, the sticker shelf, and the six commitments.
   Content and drawings only. The logic that awards a sticker or opens the castle lives in app.js. */

window.IL = window.IL || {};

/* ── The Interior Castle ──
   After St Teresa of Avila (1577): the soul is a castle of many dwellings, and at its centre the King dwells.
   Drawn as seven nested rooms in the seven field colours, with a small light walking inward to the centre.
   An original drawing made for this app; the words are a paraphrase, not a quotation. */
IL.CASTLE = {
  title: "The Interior Castle",
  line: "The soul is a castle with many dwellings, and at its centre the King dwells.",
  after: "After St Teresa of Avila, The Interior Castle, 1577",
  svg: function () {
    // Seven diamonds, outer to inner, in the colours of fields 1 to 7. The gold centre is field 0.
    const rooms = [1, 2, 3, 4, 5, 6, 7].map((k, i) => { const r = 150 - i * 18; return `<rect class="room r${k}" x="${160 - r}" y="${160 - r}" width="${2 * r}" height="${2 * r}" rx="${Math.max(6, r / 5)}" transform="rotate(45 160 160)" style="--d:${i * 0.55}s"/>`; }).join("");
    // The path the light walks: in from the top gate, one quarter turn per room, to the centre.
    const path = "M160 18 L160 48 L190 78 L160 106 L132 136 L160 160";
    return `<svg class="castle-svg" viewBox="0 0 320 320" role="img" aria-label="${IL.CASTLE.title}: seven nested rooms, and a small light walking inward to a gold centre.">
      <defs><radialGradient id="cglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#F2DFA3" stop-opacity="1"/><stop offset="1" stop-color="#F2DFA3" stop-opacity="0"/></radialGradient></defs>
      ${rooms}
      <path class="way" d="${path}"/>
      <circle class="king-halo" cx="160" cy="160" r="40" fill="url(#cglow)"/>
      <circle class="king" cx="160" cy="160" r="9"/>
      <g class="soul"><circle r="7" class="soul-glow"/><circle r="3.4" class="soul-core"/>
        <animateMotion dur="5.6s" begin="0.4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1" path="${path}"/></g>
    </svg>`;
  }
};

/* ── The sticker shelf ──
   Small gifts, never scores. A sticker is given once, for a first: the first time a field is lit, the first evening in the diary,
   the first season chosen. It records that something began. It measures nothing. */
IL.STICKERS = [
  { id: "castle", name: "The castle", icon: "castle", field: "soul", line: "You came in. The King was already here." },
  { id: "field-soul", name: "The lamp", icon: "flame", field: "soul", line: "The first light in the sanctuary. Everything else is lit from here." },
  { id: "field-bodymind", name: "The lily", icon: "lily", field: "bodymind", line: "Consider the lilies. The body and the mind are a temple, and the temple is kept." },
  { id: "field-heart", name: "The heart", icon: "heart", field: "heart", line: "Love one another as I have loved you." },
  { id: "field-home", name: "The lamp in the window", icon: "lamp", field: "home", line: "As for me and my house, we will serve the Lord." },
  { id: "field-work", name: "The wheat", icon: "wheat", field: "work", line: "Whatever you do, work heartily, as for the Lord." },
  { id: "field-creation", name: "The leaf", icon: "leaf", field: "creation", line: "To till it and keep it." },
  { id: "field-mission", name: "The seeds", icon: "seeds", field: "mission", line: "As you did it to one of the least of these, you did it to me." },
  { id: "field-vocation", name: "The star", icon: "star", field: "vocation", line: "Each one should lead the life the Lord has assigned." },
  { id: "season", name: "The first season", icon: "spark", field: "soul", line: "One field, ninety days. God teaches by stages." },
  { id: "diary", name: "The first evening", icon: "pen", field: "heart", line: "Seven thanks, three prayers, one act of service. The day returned." },
  { id: "calendar", name: "Handed over", icon: "send", field: "home", line: "The Rule has left the app and entered your days." },
  { id: "radiant", name: "Radiant", icon: "shield", field: "vocation", line: "A whole ladder climbed. Not a score: a practice that has become a habit, and a habit that has become you." }
];

/* ── Six commitments: a doorway, not a destination ──
   What the app promises the Church, in the Church's own terms: digital tools can attract people to a fuller life of faith,
   but cannot replace the sacraments, the liturgy or real community. Written to be read by a parish priest. */
IL.COMMITMENTS = {
  title: "A doorway, not a destination",
  lede: "The Church has said that the digital world can be a portal of truth and faith, and also that nothing on a screen can replace the sacraments, the liturgy or a real community. This app is built on both halves of that sentence.",
  items: [
    ["It leads out of itself.", "Every path in this app ends at a door: Sunday Mass, confession, a parish, a priest, a friend, the poor. If it ever keeps you inside, it has failed. There is no streak to protect and no reason to open it twice."],
    ["Nothing here is a sacrament.", "A kept practice is not grace, a lit lamp is not the state of a soul, and no screen absolves. The app says so on every screen that could be misread, and it sends you to the sacrament instead."],
    ["Accompaniment, never dependence.", "The Guide asks fixed questions and gives you back your own words. A coach or a director may help you keep a Rule; neither stands between you and God. Missionary disciples accompany missionary disciples."],
    ["The faith, plainly, in freedom.", "The teaching is stated as the Church states it, with the Catechism cited where it can be checked. Questions and doubts are welcome. Nobody is pressed, recruited or sold a lifestyle."],
    ["Measured by fruit, not by use.", "The app keeps no account, collects no data and counts no downloads. The only measure that matters is outside it: more prayer, the sacraments sought, a parish joined, a neighbour loved, the Gospel shared with greater maturity."],
    ["Under the Church's judgement.", "A private work, without imprimatur, read by a priest before it grows, and submitted to the judgement of the Church. Where it and the Church differ, the Church is right, and the app will be changed."]
  ],
  close: "Although the virtual cannot substitute for real community or the incarnational reality of the sacraments, it can complement them and attract people to a fuller experience of the life of faith. That is the whole ambition of this app."
};
