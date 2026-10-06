/* Illuminated Life · the Church's year
   The General Roman Calendar, computed for any year: the seasons, every Sunday and weekday,
   and the saints (js/calendar-data.js), ordered by the Table of Liturgical Days
   (Universal Norms on the Liturgical Year and the Calendar, 59-61).
   It names the day. It holds no readings and no prayers of the Mass.
   Dioceses, countries and religious orders have their own calendars, which take precedence. */

window.IL = window.IL || {};

(function () {
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  // Whole days, counted from calendar dates in UTC, so a clock change never moves the count.
  const dayNumber = (d) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const dayOfYear = (d) => dayNumber(d) - Math.round(Date.UTC(d.getFullYear(), 0, 0) / 86400000);
  const daysBetween = (a, b) => dayNumber(b) - dayNumber(a);

  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }

  /* ───────── settings ─────────
     region "general": Epiphany 6 January, Ascension on Thursday, Corpus Christi on Thursday,
       unless sunday is true (the three are then kept on Sunday, as many countries do).
     region "nl": Epiphany on the Sunday between 2 and 8 January, Ascension on Thursday,
       Corpus Christi on Sunday, and the proper celebrations of the Netherlands. */
  const REGIONS = { general: "General Roman Calendar", nl: "Netherlands" };
  let current = { region: "general", sunday: false };
  const settings = (o) => {
    const s = o || current, region = s.region === "nl" ? "nl" : "general", sunday = region === "general" && !!s.sunday;
    return { region, sunday, epiphanySunday: region === "nl" || sunday, ascensionSunday: sunday, corpusSunday: region === "nl" || sunday, key: region + (sunday ? "+sun" : "") };
  };
  function use(o) { current = { region: o && o.region === "nl" ? "nl" : "general", sunday: !!(o && o.sunday) }; return settings(); }

  const firstAdvent = (y) => { const x = new Date(y, 11, 25); return shift(x, -((x.getDay() === 0 ? 7 : x.getDay()) + 21)); };

  function plan(y, o) {
    const s = settings(o), E = easter(y), xmas = new Date(y, 11, 25), advent = firstAdvent(y);
    let epiphany = new Date(y, 0, 6), baptism;
    if (s.epiphanySunday) {
      const j2 = new Date(y, 0, 2); epiphany = shift(j2, (7 - j2.getDay()) % 7); // the Sunday from 2 to 8 January
      // When that Sunday is 7 or 8 January, the Baptism of the Lord is kept on the Monday after it.
      baptism = shift(epiphany, epiphany.getDate() >= 7 ? 1 : 7);
    } else baptism = shift(epiphany, epiphany.getDay() === 0 ? 7 : 7 - epiphany.getDay()); // the Sunday after 6 January
    // Holy Family: the Sunday within the octave of Christmas, or 30 December when Christmas is a Sunday.
    const holyFamily = xmas.getDay() === 0 ? new Date(y, 11, 30) : shift(xmas, 7 - xmas.getDay());
    return {
      epiphany, baptism, ash: shift(E, -46), palm: shift(E, -7), holyThu: shift(E, -3), goodFri: shift(E, -2), holySat: shift(E, -1), easter: E,
      mercy: shift(E, 7), ascension: shift(E, s.ascensionSunday ? 42 : 39), pentecost: shift(E, 49), motherOfChurch: shift(E, 50),
      highPriest: shift(E, 53), trinity: shift(E, 56), corpus: shift(E, s.corpusSunday ? 63 : 60), heart: shift(E, 68), immaculateHeart: shift(E, 69),
      king: shift(advent, -7), advent, xmas, holyFamily
    };
  }

  const SEASONS = {
    advent: { name: "Advent", colour: "Violet", asks: "Silence and waiting. Remove one source of noise." },
    christmas: { name: "Christmastide", colour: "White and gold", asks: "Feast without guilt. Keep all the days, to the Baptism of the Lord." },
    lent: { name: "Lent", colour: "Violet", asks: "Prayer, fasting and almsgiving, the three together. Begin with conversion of heart.",
      more: "The Church asks first for conversion of heart. Keep the fast, give the alms, say the prayer, and let the heart follow." },
    triduum: { name: "The Three Days", colour: "White, red, then white", asks: "Clear the calendar. The whole year is built around these days." },
    easter: { name: "Eastertide", colour: "White and gold", asks: "Fifty days of feasting. Rejoicing on purpose is obedience." },
    ordinary: { name: "Ordinary Time", colour: "Green", asks: "The long green stretch where holiness is actually built." }
  };
  const SEASON_SHORT = { advent: "Advent", christmas: "Christmas Time", lent: "Lent", triduum: "the Paschal Triduum", easter: "Easter Time", ordinary: "Ordinary Time" };

  /* ───────── words ───────── */
  const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const ONES = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth"];
  const TENS = { 20: ["Twentieth", "Twenty"], 30: ["Thirtieth", "Thirty"] };
  const ordWord = (n) => (n < 20 ? ONES[n] : n % 10 === 0 ? TENS[n][0] : TENS[n - (n % 10)][1] + "-" + ONES[n % 10].toLowerCase());
  const ordNum = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
  const ROMAN = ["", "I", "II", "III", "IV"];
  const COLOURS = { w: "white", r: "red", v: "violet", g: "green", p: "rose" };
  const RANKS = { solemnity: "Solemnity", feast: "Feast", memorial: "Memorial", optional: "Optional memorial", sunday: "Sunday", weekday: "Weekday", triduum: "Paschal Triduum", commemoration: "Commemoration" };

  /* ───────── precedence: the Table of Liturgical Days ─────────
     1  the Paschal Triduum
     2  Christmas, Epiphany, Ascension, Pentecost; Sundays of Advent, Lent and Easter; Ash Wednesday;
        Monday to Thursday of Holy Week; the days of the Easter octave
     3  solemnities of the general calendar (those of the Lord first), then All Souls
     4  proper solemnities
     5  feasts of the Lord
     6  Sundays of Christmas Time and of Ordinary Time
     7  feasts of the general calendar          8  proper feasts
     9  17 to 24 December, the Christmas octave, the weekdays of Lent
     10 memorials of the general calendar       11 proper memorials
     12 optional memorials                      13 all other weekdays */
  const PREC = { S: 3.1, A: 3.2, L: 5, F: 7, M: 10, O: 12 }, PROPER = { S: 4, L: 8, F: 8, M: 11, O: 12 };
  const RANK_OF = { S: "solemnity", A: "commemoration", L: "feast", F: "feast", M: "memorial", O: "optional" };

  function parseRow(row, proper) {
    const [md, r, c, name] = row.split("|");
    return { m: +md.slice(0, 2), d: +md.slice(2), code: r, rank: RANK_OF[r], lord: r === "L", colour: COLOURS[c], name, prec: (proper ? PROPER : PREC)[r], proper: !!proper };
  }
  const tables = {};
  function sanctoral(region) {
    if (tables[region]) return tables[region];
    const C = IL.CALENDAR || { general: [] };
    let rows = C.general.map((r) => parseRow(r, false));
    const P = region === "nl" ? C.nl : null;
    if (P) {
      const at = (md, word) => (x) => x.m === +md.slice(0, 2) && x.d === +md.slice(2) && x.name.includes(word);
      (P.drop || []).forEach(([md, word]) => { rows = rows.filter((x) => !at(md, word)(x)); });
      (P.raise || []).forEach(([md, word, code]) => { const x = rows.find(at(md, word)); if (x) { x.code = code; x.rank = RANK_OF[code]; x.prec = PROPER[code]; x.proper = true; } });
      rows = rows.concat((P.add || []).map((r) => parseRow(r, true)));
    }
    return (tables[region] = rows);
  }

  /* ───────── the temporal cycle: what each day is before any saint is considered ───────── */
  function temporal(d, y, p, N, prevAdvent) {
    const n = dayNumber(d), dow = d.getDay(), wd = WD[dow], dm = d.getDate() + " " + MONTHS[d.getMonth()];
    const b = { season: "", week: null, name: "", short: "", prec: 13, rank: dow === 0 ? "sunday" : "weekday", colour: "green", psalter: 1 };
    const set = (...o) => Object.assign(b, ...o);
    const wk = (w, of) => `${wd} of the ${ordNum(w)} week ${of}`;

    if (n <= N.baptism) { // Christmas Time, January
      set({ season: "christmas", colour: "white", psalter: (Math.floor((n - prevAdvent) / 7) % 4) + 1 });
      if (d.getMonth() === 0 && d.getDate() === 1) set({ name: "The Octave Day of the Nativity of the Lord", prec: 9, rank: "weekday" });
      else if (n === N.epiphany) set({ name: "The Epiphany of the Lord", rank: "solemnity", prec: 2, lord: true });
      else if (n === N.baptism) set({ name: "The Baptism of the Lord", rank: "feast", prec: 5, lord: true, psalter: 1 });
      else if (dow === 0) set({ name: "Second Sunday after the Nativity", prec: 6 });
      else if (n < N.epiphany) set({ name: `${wd}, ${dm}`, short: "Christmas weekday" });
      else set({ name: `${wd} after Epiphany`, short: `${wd} after Epiphany` });
    } else if (n < N.ash) { // Ordinary Time, first part
      const w = 1 + Math.floor((n - N.week1) / 7);
      set({ season: "ordinary", week: w, psalter: ((w - 1) % 4) + 1 });
      if (dow === 0) set({ name: `${ordWord(w)} Sunday in Ordinary Time`, prec: 6, note: w === 3 ? "Sunday of the Word of God" : "" });
      else set({ name: wk(w, "in Ordinary Time"), short: `${wd} of week ${w}, Ordinary Time` });
    } else if (n < N.holyThu) { // Lent
      const w = n < N.ash + 4 ? 0 : Math.floor((n - (N.ash + 4)) / 7) + 1;
      set({ season: "lent", colour: "violet", week: w || null, prec: 9, psalter: w ? ((w - 1) % 4) + 1 : 4 });
      if (n === N.ash) set({ name: "Ash Wednesday", prec: 2, major: true, note: "A day of fasting and abstinence." });
      else if (!w) set({ name: `${wd} after Ash Wednesday`, short: `${wd} after Ash Wednesday` });
      else if (w === 6) {
        if (dow === 0) set({ name: "Palm Sunday of the Passion of the Lord", prec: 2, colour: "red", major: true });
        else set({ name: `${wd} of Holy Week`, short: `${wd} of Holy Week`, prec: 2 });
      } else if (dow === 0) set({ name: `${ordWord(w)} Sunday of Lent`, prec: 2 });
      else set({ name: wk(w, "of Lent"), short: `${wd} of week ${w}, Lent` });
      if (w === 4 && dow === 0) set({ colour: "rose", note: "Laetare Sunday. Rose may be worn; violet is also permitted." });
    } else if (n < N.easter) { // the Three Days
      set({ season: "triduum", prec: 1, rank: "triduum", psalter: 2, major: true });
      if (n === N.holyThu) set({ name: "Holy Thursday of the Lord's Supper", colour: "white", note: "Lent ends and the Paschal Triduum begins with the evening Mass of the Lord's Supper." });
      else if (n === N.goodFri) set({ name: "Friday of the Passion of the Lord (Good Friday)", colour: "red", note: "A day of fasting and abstinence. No Mass is celebrated today." });
      else set({ name: "Holy Saturday", colour: "violet", note: "No Mass is celebrated during the day. The Easter Vigil, after nightfall, is white." });
    } else if (n <= N.pentecost) { // Easter Time
      const w = Math.floor((n - N.easter) / 7) + 1;
      set({ season: "easter", colour: "white", week: Math.min(w, 7), psalter: ((w - 1) % 4) + 1 });
      if (n === N.easter) set({ name: "Easter Sunday of the Resurrection of the Lord", prec: 1, rank: "solemnity", lord: true });
      else if (w === 1) set({ name: `${wd} within the Octave of Easter`, short: `${wd} of the Easter Octave`, prec: 2, rank: "solemnity", octave: true });
      else if (n === N.pentecost) set({ name: "Pentecost Sunday", prec: 2, rank: "solemnity", colour: "red", week: null });
      else if (n === N.ascension) set({ name: "The Ascension of the Lord", prec: 2, rank: "solemnity", lord: true });
      else if (n === N.mercy) set({ name: "Second Sunday of Easter (or of Divine Mercy)", prec: 2 });
      else if (dow === 0) set({ name: `${ordWord(w)} Sunday of Easter`, prec: 2 });
      else set({ name: wk(w, "of Easter"), short: `${wd} of week ${w}, Easter` });
    } else if (n < N.advent) { // Ordinary Time, after Pentecost: the weeks are counted back from the 34th
      const w = 34 - (N.king - (n - dow)) / 7;
      set({ season: "ordinary", week: w, psalter: ((w - 1) % 4) + 1 });
      const lordly = (name) => set({ name, prec: 3, rank: "solemnity", colour: "white", lord: true });
      if (n === N.trinity) lordly("The Most Holy Trinity");
      else if (n === N.corpus) lordly("The Most Holy Body and Blood of Christ (Corpus Christi)");
      else if (n === N.heart) lordly("The Most Sacred Heart of Jesus");
      else if (n === N.king) lordly("Our Lord Jesus Christ, King of the Universe");
      else if (dow === 0) set({ name: `${ordWord(w)} Sunday in Ordinary Time`, prec: 6, note: w === 33 ? "World Day of the Poor (not a liturgical rank)" : "" });
      else set({ name: wk(w, "in Ordinary Time"), short: `${wd} of week ${w}, Ordinary Time` });
      if (dow === 0 && b.rank === "solemnity") b.sunday = `${ordWord(w)} Sunday in Ordinary Time`;
    } else if (n < N.xmas) { // Advent
      const w = Math.floor((n - N.advent) / 7) + 1;
      set({ season: "advent", colour: "violet", week: w, psalter: ((w - 1) % 4) + 1 });
      if (dow === 0) set({ name: `${ordWord(w)} Sunday of Advent`, prec: 2, major: w === 1 }, w === 3 ? { colour: "rose", note: "Gaudete Sunday. Rose may be worn; violet is also permitted." } : {});
      else if (d.getDate() >= 17) set({ name: `${dm} (${wd} of Advent)`, short: `${dm}, Advent`, prec: 9 });
      else set({ name: wk(w, "of Advent"), short: `${wd} of week ${w}, Advent` });
    } else { // Christmas Time, December
      set({ season: "christmas", colour: "white", psalter: (Math.floor((n - N.advent) / 7) % 4) + 1 });
      if (n === N.xmas) set({ name: "The Nativity of the Lord (Christmas)", prec: 2, rank: "solemnity", lord: true });
      else if (n === N.holyFamily) set({ name: "The Holy Family of Jesus, Mary and Joseph", prec: 5, rank: "feast", lord: true });
      else { const k = d.getDate() - 24; set({ name: `${ordWord(k)} Day within the Octave of the Nativity of the Lord`, short: `${ordWord(k)} day of the Christmas Octave`, prec: 9 }); }
    }
    if (!b.short) b.short = b.name;
    return b;
  }

  /* ───────── one whole year ───────── */
  const cache = {};
  function year(y, o) {
    const s = settings(o), key = y + ":" + s.key;
    if (cache[key]) return cache[key];
    const p = plan(y, s), N = {};
    Object.keys(p).forEach((k) => { N[k] = dayNumber(p[k]); });
    N.week1 = N.baptism - p.baptism.getDay(); // the Sunday that opens the first week of Ordinary Time
    const prevAdvent = dayNumber(firstAdvent(y - 1)), jan1 = dayNumber(new Date(y, 0, 1));
    const days = [];
    for (let d = new Date(y, 0, 1); d.getFullYear() === y; d = shift(d, 1)) days.push({ date: d, base: temporal(d, y, p, N, prevAdvent), cands: [] });
    const at = (n) => days[n - jan1];

    // The saints, each on its own date.
    const solemn = [];
    sanctoral(s.region).forEach((r) => {
      const dt = new Date(y, r.m - 1, r.d); if (dt.getMonth() !== r.m - 1) return; // no 29 February entries, but be safe
      const c = Object.assign({}, r, { n: dayNumber(dt) });
      if (c.code === "S") solemn.push(c); else at(c.n).cands.push(c);
    });
    const movable = (n, code, name, extra) => at(n).cands.push(Object.assign({ n, code, rank: RANK_OF[code], colour: "white", name, prec: PREC[code] }, extra));
    movable(N.motherOfChurch, "M", "The Blessed Virgin Mary, Mother of the Church", { marian: true });
    movable(N.immaculateHeart, "M", "The Immaculate Heart of the Blessed Virgin Mary", { marian: true });
    if (s.region === "nl" && IL.CALENDAR && IL.CALENDAR.nl.highPriest) movable(N.highPriest, "F", "Our Lord Jesus Christ, the Eternal High Priest", { prec: PROPER.F, lord: true, proper: true });

    // Solemnities: one that meets a higher day is moved to the nearest free day (Universal Norms 60).
    const taken = (n) => at(n).cands.some((c) => c.prec <= 8);
    const blocked = (c, n) => at(n).base.prec < c.prec || at(n).cands.some((x) => x.code === "S");
    const free = (n) => at(n) && at(n).base.prec >= 9 && !taken(n);
    solemn.sort((a, b) => a.n - b.n).forEach((c) => {
      let n = c.n;
      if (c.m === 3 && c.d === 19 && n >= N.palm && n < N.easter) n = N.palm - 1; // St Joseph in Holy Week: the Saturday before Palm Sunday
      else if (c.m === 3 && c.d === 25 && n >= N.palm && n <= N.mercy) n = N.mercy + 1; // the Annunciation: the Monday after the Second Sunday of Easter
      else if (blocked(c, n)) {
        if (c.m === 6 && c.d === 24 && n === N.heart) n -= 1; // the Baptist gives way to the Sacred Heart and is kept the day before (as in 2022)
        else { n += 1; while (at(n) && !free(n)) n += 1; if (!at(n)) n = c.n; }
      }
      const placed = Object.assign({}, c, { n });
      if (n !== c.n) { placed.movedFrom = iso(at(c.n).date); (at(c.n).away = at(c.n).away || []).push({ name: c.name, to: iso(at(n).date) }); }
      at(n).cands.push(placed);
    });

    const litYear = (n) => (n >= N.advent ? y + 1 : y);
    const out = days.map(({ date, base, cands, away }) => {
      const n = dayNumber(date), ly = litYear(n);
      cands.sort((a, b) => a.prec - b.prec);
      const mems = cands.filter((c) => c.code === "M"), opts = cands.filter((c) => c.code === "O");
      const top = cands[0] && cands[0].code !== "O" && cands[0].prec < base.prec ? cands[0] : null;
      let primary = null, optional = [], omitted = [];
      const asOption = (c, was) => ({ name: c.name, colour: c.colour, commemoration: base.prec === 9, memorial: !!was });
      if (top && top.code === "M") {
        // Two memorials on one day: the two movable memorials of Our Lady prevail (Notification of the Congregation
        // for Divine Worship, 24 March 2018, which replaced the 1998 rule that made both optional).
        primary = mems.find((c) => c.marian) || top; omitted = mems.filter((c) => c !== primary).map((c) => c.name);
      } else if (top) { primary = top; omitted = cands.filter((c) => c !== top && c.code !== "O").map((c) => c.name); }
      else if (base.prec === 9) optional = mems.map((c) => asOption(c, true)).concat(opts.map((c) => asOption(c))); // Lent, late Advent, Christmas octave: a commemoration at most
      else if (base.prec === 13) optional = opts.map((c) => asOption(c));
      else omitted = cands.filter((c) => c.code !== "O").map((c) => c.name);

      const day = {
        iso: iso(date), date, dow: date.getDay(), season: base.season, seasonName: SEASON_SHORT[base.season], week: base.week,
        psalter: base.psalter, psalterWeek: ROMAN[base.psalter], sundayCycle: "CAB"[ly % 3], weekdayCycle: ly % 2 ? "I" : "II", liturgicalYear: ly,
        name: base.name, rank: base.rank, colour: base.colour, colourLabel: base.colour, lord: !!base.lord, major: !!base.major,
        weekday: base.name, weekdayShort: base.short, optional, omitted, note: base.note || "", moved: null, away: away || [], inPlaceOf: base.sunday || "", proper: false
      };
      if (primary) {
        Object.assign(day, { name: primary.name, rank: primary.rank, colour: primary.colour, colourLabel: primary.colour, lord: !!primary.lord, proper: !!primary.proper, note: "" });
        if (primary.code === "A") day.colourLabel = "violet or black";
        if (primary.movedFrom) day.moved = { from: primary.movedFrom };
        if (date.getDay() === 0 && base.rank === "sunday") day.inPlaceOf = base.name;
      }
      day.rankLabel = RANKS[day.rank];
      return day;
    });
    return (cache[key] = { year: y, region: s.region, settings: s, plan: p, days: out });
  }

  const day = (d, o) => year(d.getFullYear(), o).days[dayOfYear(d) - 1];
  const seasonOn = (d, o) => day(d, o).season;

  // The greater days of a year: solemnities, feasts, and the days the seasons turn on.
  function feasts(y, o) {
    return year(y, o).days.filter((d) => (d.rank === "solemnity" && !/Octave of Easter/.test(d.name)) || d.rank === "feast" || d.rank === "triduum" || d.rank === "commemoration" || d.major)
      .map((d) => { const f = { date: d.iso, name: d.name, rank: d.rank, lord: d.lord }; if (d.moved) f.moved = true; return f; });
  }
  // The principal celebrations, for "jump to".
  function principal(y, o) {
    const p = plan(y, o);
    return [["Epiphany", p.epiphany], ["Baptism of the Lord", p.baptism], ["Ash Wednesday", p.ash], ["Palm Sunday", p.palm], ["Holy Thursday", p.holyThu], ["Good Friday", p.goodFri],
      ["Easter Sunday", p.easter], ["Ascension", p.ascension], ["Pentecost", p.pentecost], ["Trinity Sunday", p.trinity], ["Corpus Christi", p.corpus], ["Sacred Heart", p.heart],
      ["Assumption", new Date(y, 7, 15)], ["All Saints", new Date(y, 10, 1)], ["Christ the King", p.king], ["First Sunday of Advent", p.advent], ["Christmas", p.xmas]]
      .map(([name, d]) => ({ name, date: iso(d) }));
  }

  // "St Irenaeus, Bishop, Martyr and Doctor" becomes "St Irenaeus": the name without the titles, for small places.
  const TITLES = "Bishops?|Priests?|Popes?|Virgin|Martyrs?|Abbot|Religious|Deacon|Hermit|Monk|Doctors?";
  const shortName = (name) => (/\(All Souls\)/.test(name) ? "All Souls" : String(name)
    .replace(new RegExp(", (?:" + TITLES + ")(?:,? and (?:" + TITLES + "))?(?=,|$)", "g"), "").replace(/, and /g, " and ").trim());
  // One line for a day, in two parts: what is kept, and the weekday beneath it.
  function line(d) {
    const own = d.name !== d.weekday;
    if (own) {
      const rank = d.rank === "commemoration" ? "" : ", " + d.rankLabel.toLowerCase();
      return { title: shortName(d.name) + rank, sub: d.inPlaceOf || d.dow === 0 ? "" : d.weekdayShort };
    }
    if (d.optional.length) {
      const kind = d.optional[0].commemoration ? "commemoration" : "optional memorial";
      return { title: shortName(d.optional[0].name) + (d.optional.length > 1 ? " and " + (d.optional.length - 1) + " more" : "") + ", " + kind, sub: d.weekdayShort };
    }
    return { title: d.weekdayShort, sub: "" };
  }
  const lineText = (d) => { const l = line(d); return l.title + (l.sub ? " · " + l.sub : ""); };

  IL.liturgy = { iso, shift, dayOfYear, daysBetween, easter, plan, SEASONS, REGIONS, RANKS, seasonOn, feasts, year, day, principal, use, settings, shortName, line, lineText };
})();
