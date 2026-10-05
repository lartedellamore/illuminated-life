/* Illuminated Life · the Church's year
   A simplified general Roman calendar. It computes the seasons and the
   principal feasts. Local calendars differ: check your diocese. */

window.IL = window.IL || {};

(function () {
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }

  function plan(y) {
    const E = easter(y), xmas = new Date(y, 11, 25);
    // First Sunday of Advent: the fourth Sunday before Christmas.
    const advent = shift(xmas, -((xmas.getDay() === 0 ? 7 : xmas.getDay()) + 21));
    const ep = new Date(y, 0, 6);
    // Baptism of the Lord: the Sunday after 6 January.
    const baptism = shift(ep, ep.getDay() === 0 ? 7 : 7 - ep.getDay());
    return {
      ash: shift(E, -46), palm: shift(E, -7), holyThu: shift(E, -3), goodFri: shift(E, -2), easter: E,
      mercy: shift(E, 7), ascension: shift(E, 39), pentecost: shift(E, 49), trinity: shift(E, 56),
      corpus: shift(E, 60), heart: shift(E, 68), king: shift(advent, -7), advent, baptism, xmas
    };
  }

  const SEASONS = {
    advent: { name: "Advent", colour: "Violet", asks: "Silence and waiting. Remove one source of noise." },
    christmas: { name: "Christmastide", colour: "White and gold", asks: "Feast without guilt. Keep all the days, to the Baptism of the Lord." },
    lent: { name: "Lent", colour: "Violet", asks: "Prayer, fasting and almsgiving: all three, or it is not Lent." },
    triduum: { name: "The Three Days", colour: "Red, then white", asks: "Clear the calendar. The whole year is built around these days." },
    easter: { name: "Eastertide", colour: "White and gold", asks: "Fifty days of feasting. Rejoicing on purpose is obedience." },
    ordinary: { name: "Ordinary Time", colour: "Green", asks: "The long green stretch where holiness is actually built." }
  };

  function seasonOn(dt) {
    const p = plan(dt.getFullYear());
    const at = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const t = at(dt);
    if (t >= at(p.advent) && t < at(p.xmas)) return "advent";
    if (t >= at(p.xmas) || t <= at(p.baptism)) return "christmas";
    if (t >= at(p.ash) && t < at(p.holyThu)) return "lent";
    if (t >= at(p.holyThu) && t < at(p.easter)) return "triduum";
    if (t >= at(p.easter) && t <= at(p.pentecost)) return "easter";
    return "ordinary";
  }

  const FIXED = [
    [1, 1, "Mary, Mother of God"], [1, 6, "The Epiphany"], [1, 24, "St Francis de Sales"], [1, 28, "St Thomas Aquinas"],
    [2, 2, "The Presentation of the Lord"], [3, 19, "St Joseph"], [3, 25, "The Annunciation"],
    [4, 29, "St Catherine of Siena"], [5, 31, "The Visitation"], [6, 24, "The Nativity of John the Baptist"],
    [6, 29, "Sts Peter and Paul"], [7, 11, "St Benedict"], [7, 22, "St Mary Magdalene"], [8, 6, "The Transfiguration"],
    [8, 15, "The Assumption"], [8, 28, "St Augustine"], [9, 14, "The Exaltation of the Cross"],
    [9, 17, "St Hildegard of Bingen"], [9, 30, "St Jerome"], [10, 1, "St Thérèse of Lisieux"],
    [10, 4, "St Francis of Assisi"], [10, 15, "St Teresa of Ávila"], [11, 1, "All Saints"], [11, 2, "All Souls"],
    [12, 8, "The Immaculate Conception"], [12, 14, "St John of the Cross"], [12, 25, "The Nativity of the Lord"]
  ];

  function feasts(y) {
    const p = plan(y);
    const moving = [
      [p.baptism, "The Baptism of the Lord"], [p.ash, "Ash Wednesday"], [p.palm, "Palm Sunday"],
      [p.holyThu, "Holy Thursday"], [p.goodFri, "Good Friday"], [p.easter, "Easter Sunday"],
      [p.mercy, "Divine Mercy Sunday"], [p.ascension, "The Ascension"], [p.pentecost, "Pentecost"],
      [p.trinity, "The Most Holy Trinity"], [p.corpus, "Corpus Christi"], [p.heart, "The Sacred Heart"],
      [p.king, "Christ the King"], [p.advent, "First Sunday of Advent"]
    ].map(([d, name]) => ({ date: iso(d), name }));
    const fixed = FIXED.map(([m, d, name]) => ({ date: iso(new Date(y, m - 1, d)), name }));
    return moving.concat(fixed).sort((a, b) => a.date.localeCompare(b.date));
  }

  IL.liturgy = { iso, shift, easter, plan, SEASONS, seasonOn, feasts };
})();
