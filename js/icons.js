/* Illuminated Life · the Icon Screen
   The identity instrument from Accedite et Illuminamini, chapters 19 and 20: a mirror in five panels.
   This file holds the words (IL.ICONO) and the scoring (IL.icono). The screens are in app.js.

   The scoring functions are pure: the same answers always give the same result, and they touch
   neither the page nor the saved state. They can be tested on their own.

   A priest should read every item here before it is used widely. The items were written for this app.
   They are not taken from a published instrument. */

window.IL = window.IL || {};

(function (IL) {
  "use strict";

  const ICONO = {};

  ICONO.intro = {
    title: "The Icon Screen",
    lede: "An iconography of the steward, in five panels. About twenty minutes, once a year.",
    text: [
      "This is a mirror in five panels, not a personality test. It never tells you what you are. It shows what is strong now, what is under strain now, and where the tradition would look next.",
      "Every result comes with an obligation, because gifts are for the Body and not for the self. Every result is provisional: show it to a director or to the friend who tells you the truth.",
      "It is not a diagnosis, a horoscope or a vocational verdict. Never use it to decide a marriage, a religious vocation or a medical question."
    ],
    order: "The order of the panels is itself the teaching: where you are, what you were given, what it is for, what obstructs it, where it is going.",
    prayer: "Holy Spirit, show me what you have actually given me, and what I have been pretending. Amen.",
    last: ["A result is not an identity. It is a description of the material, and the material is not the statue.", "Do this once a year, not once a month. Advent or your baptismal anniversary are good markers."]
  };

  ICONO.panels = [
    { id: "dwelling", n: "I", name: "The Dwelling", asks: "Where you are", lede: "Six questions about ordinary days. Choose the answer nearest to what usually happens, not to what you would like to happen.", ref: "St Teresa of Ávila, The Interior Castle" },
    { id: "lamps", n: "II", name: "The Seven Lamps", asks: "What you were given", lede: "Fourteen plain statements. Say how often each is true of you now. Nobody is watching, and nothing here is a score.", ref: "Isaiah 11:2-3; Catechism 1830-1831" },
    { id: "icon", n: "III", name: "The Icon Screen", asks: "What it is for", lede: "Twelve scenes from the Gospels. Do not ask which describes you. Ask which draw you: where you would stand and stay. Choose four.", ref: "1 Corinthians 12:4-7; Catechism 799-801, 2003" },
    { id: "shadow", n: "IV", name: "The Shadow Panel", asks: "What obstructs it", lede: "Eight ordinary moments. In each, choose the one most like you on a bad day. Leave blank any that do not fit.", ref: "Catechism 1866" },
    { id: "threshold", n: "V", name: "The Threshold", asks: "Where it is going", lede: "Eight questions about the register in which you serve. Choose what is truest, not what is most admirable.", ref: "1 Corinthians 7:17" }
  ];

  /* ── Panel I · The Dwelling ──
     Each answer carries d: the dwelling place it leans toward, from 1 to 4. Nothing above 4 is ever scored. */
  ICONO.dwelling = {
    questions: [
      { q: "When I sit down to pray, what usually happens?", a: [
        ["I rarely sit down. Prayer happens in snatches, if at all.", 1],
        ["My mind runs to my tasks and my phone, and I often give up early.", 1],
        ["I want to pray and I fight to stay. Some days I win, some days I do not.", 2],
        ["I keep my time faithfully and say my prayers well. It seldom surprises me.", 3],
        ["I mostly grow quiet. There is little to say, and I stay."
          , 4]] },
      { q: "When a plan I cared about is thwarted:", a: [
        ["I am angry or flat for days, and I do not think of God in it at all.", 1],
        ["I am upset, and after a while I remember to pray about it.", 2],
        ["I stay composed, but inside I am unsettled far more than the thing deserves.", 3],
        ["It stings, and fairly soon I can let it go and ask what is being asked of me.", 4]] },
      { q: "When someone criticises me:", a: [
        ["I defend myself at once, or turn the fault back on them.", 1],
        ["It hurts for a long time and I replay it. Sometimes I bring it to prayer.", 2],
        ["I take it politely. Privately I feel I did not deserve it, given how hard I try.", 3],
        ["I can usually look for what is true in it, and it does not shake me for long.", 4]] },
      { q: "My life of faith, in an ordinary week:", a: [
        ["Sunday Mass at most, and little else.", 1],
        ["I have begun again several times. I keep starting and slipping.", 2],
        ["It is well ordered. I keep my practices, and would feel uneasy without them.", 3],
        ["It has grown simpler. Fewer practices, and more of God in the ordinary hours.", 4]] },
      { q: "When prayer is dry and gives me nothing:", a: [
        ["I stop, and come back when the mood returns.", 1],
        ["I struggle on for a while, then drift to something easier.", 2],
        ["I keep the time out of duty, and wonder what I am doing wrong.", 3],
        ["I stay. I have learned that he is not less present because I feel less.", 4]] },
      { q: "What most often pulls me away from God?", a: [
        ["I rarely notice. Days pass without my thinking of him.", 1],
        ["Old habits and attachments that I know by name and keep returning to.", 2],
        ["My own plans for a good life. I would like God to bless them as they are.", 3],
        ["Small self-seeking that I only notice afterwards, even in good works.", 4]] }
    ],
    bands: {
      first: { name: "The first rooms", dwellings: "dwellings 1 and 2",
        about: "Here a person is learning to know themselves and to hear the call. The will is divided, distraction is loud, and perseverance is the whole work.",
        counsel: "Keep one small, fixed time of prayer each day, and protect your sleep. In that time look at God, then at yourself, then at God again. When you slip, begin again gently.",
        tone: "Gentle and small. A few fixed times, early nights, and nothing heroic. Structure is your friend now." },
      ordered: { name: "The ordered house", dwellings: "dwelling 3",
        about: "Here life is well arranged and sin is avoided with care. Yet the self is still quietly in charge, and small reversals disturb it more than they should.",
        counsel: "Your life is in good order, and that is a real gift. The hidden trap is control. Accept interruptions as visits. Leave one space each week unoptimised. Find a real director, and let that person tell you things.",
        tone: "Bracing. You do not need more structure. You need less control: fewer plans, and more interruptions welcomed." },
      inner: { name: "The inner rooms", dwellings: "dwelling 4 and beyond",
        about: "Here prayer begins to be received more than made. There is a quiet that you did not produce and cannot keep by effort.",
        counsel: "Keep prayer simple. Do not chase experiences, and do not talk about them, except to a director. The test is never what you feel. It is love of neighbour and good works.",
        tone: "Simple and quiet. Little structure beyond the Church's own. Stay close to a director and to ordinary service." }
    },
    lead: "The counsel that probably fits you now",
    notRank: "This is not a rank, and the rooms are not a ladder climbed by effort. People move back and forth between them over a lifetime. Read it as a word of counsel for this season.",
    further: "What lies further in is God's to give and a director's to recognise, not an app's.",
    safety: "Dryness that comes with panic, numbness, self-hatred or thoughts of harming yourself is an injury, not a dark night. Get help today."
  };

  /* ── Panel II · The Seven Lamps ──
     Two statements for each gift of the Holy Spirit, each rated 0 to 3. */
  ICONO.scale = ["Rarely", "Sometimes", "Often", "Almost always"];
  ICONO.gifts = [
    { id: "wisdom", name: "Wisdom", is: "A taste for God, and seeing things as he sees them.",
      petition: "Holy Spirit, give me a taste for God above every other good.", feeds: "Silent prayer before the Blessed Sacrament." },
    { id: "understanding", name: "Understanding", is: "Insight into the truths of the faith.",
      petition: "Holy Spirit, open to me the faith I profess.", feeds: "Lectio divina, slowly, with the Gospel of the day." },
    { id: "counsel", name: "Counsel", is: "Light for the next decision.",
      petition: "Holy Spirit, show me the next right step, and make me willing to take advice.", feeds: "The daily examen, and an honest word with a director." },
    { id: "fortitude", name: "Fortitude", is: "Steadiness when the good is hard.",
      petition: "Holy Spirit, make me steady when the good is hard.", feeds: "The Stations of the Cross, and the psalms of trust." },
    { id: "knowledge", name: "Knowledge", is: "Seeing created things at their true worth.",
      petition: "Holy Spirit, teach me the true worth of created things.", feeds: "Thanksgiving, named thing by thing." },
    { id: "piety", name: "Piety", is: "The trust of a child toward the Father.",
      petition: "Holy Spirit, teach me to say Father, and to mean it.", feeds: "The Our Father prayed slowly, and the Rosary." },
    { id: "fear", name: "Fear of the Lord", is: "Awe before God, and dread of wounding love.",
      petition: "Holy Spirit, give me a holy awe, and a dread of wounding love.", feeds: "Adoration, and praise that asks for nothing." }
  ];
  ICONO.lamps = {
    statements: [
      ["wisdom", "I find that I want God himself, and not only the things he gives."],
      ["counsel", "When I must decide, I ask for light and for advice before I act."],
      ["fortitude", "I keep doing what is right when it costs me comfort or approval."],
      ["piety", "I turn to God as to a Father, simply, the way a child speaks."],
      ["understanding", "A line of Scripture or of the Creed sometimes opens, and I see what it means for my life."],
      ["knowledge", "I can enjoy good things without clinging to them."],
      ["fear", "The thought of offending someone who loves me this much restrains me more than the fear of being caught."],
      ["wisdom", "When I weigh a choice, I ask how it will look from the end of my life, before God."],
      ["piety", "I treat the people around me as his children, including the ones who irritate me."],
      ["understanding", "At Mass I follow what is being done at the altar, and it matters to me."],
      ["fortitude", "I finish hard things, and I can bear what cannot be changed without growing bitter."],
      ["counsel", "Faced with a hard choice, I can wait without forcing an answer until the next step is clear."],
      ["knowledge", "I see my work, my finances and my possessions as gifts that point beyond themselves."],
      ["fear", "In church, or before something great and holy, I grow quiet and small, and I am glad to."]
    ],
    states: { awake: "awake", steady: "burning low", dormant: "dormant" },
    teaching: "Dormant is not absent. These are gifts given in Baptism and Confirmation. The response to a low lamp is not discouragement but asking.",
    noneDormant: "No lamp looks dormant just now. Give thanks, and keep asking. The gifts are never finished.",
    noneAwake: "No lamp looks bright just now. That is a common season, and not a verdict. Ask, and keep the small fixed times."
  };

  /* ── Panel III · The Icon Screen proper ──
     Each scene leans toward one or more charisms. The weights are a judgement, and are open to correction. */
  ICONO.charisms = [
    { id: "service", name: "Service", also: "helps",
      forms: ["Seeing what needs doing, and doing it without being asked.", "Setting up, clearing away, driving, carrying.", "Making other people's work possible."],
      offer: "ask your parish or a neighbour which job nobody wants, and take it once.",
      mission: { title: "One hour of practical help, where the parish or a neighbour needs it", cadence: "month" } },
    { id: "mercy", name: "Mercy", also: "",
      forms: ["Noticing the one who is suffering.", "Staying beside the sick, the grieving and the ashamed.", "Being unafraid of mess."],
      offer: "visit one person who is ill, housebound or grieving.",
      mission: { title: "A visit to someone sick, housebound or grieving", cadence: "month" } },
    { id: "hospitality", name: "Hospitality", also: "",
      forms: ["Opening your door and your table.", "Making the stranger feel expected.", "Remembering names, and who was missing."],
      offer: "invite to your table someone who usually eats alone.",
      mission: { title: "Someone welcomed at my table, beginning with those who eat alone", cadence: "month" } },
    { id: "teaching", name: "Teaching", also: "",
      forms: ["Explaining the faith so that it becomes clear.", "Preparing carefully.", "Patience with the same question asked twice."],
      offer: "offer to help with catechesis, sacramental preparation or a small group in your parish.",
      mission: { title: "One hour handing on the faith: catechesis, a group, or one person", cadence: "week" } },
    { id: "encouragement", name: "Encouragement", also: "",
      forms: ["The right word at the right time.", "Seeing the good in someone, and saying it.", "Walking with a person through a long stretch."],
      offer: "write one letter by hand to someone who is losing heart.",
      mission: { title: "One letter or call to someone who is losing heart", cadence: "week" } },
    { id: "evangelisation", name: "Evangelisation", also: "",
      forms: ["Speaking of Christ naturally to those who do not know him.", "Inviting, and bearing the awkwardness.", "Pointing away from yourself."],
      offer: "invite one person, by name, to come with you to Mass or to a meal where faith can be spoken of.",
      mission: { title: "One person invited by name: to Mass, to a meal, to a conversation about Christ", cadence: "month" } },
    { id: "intercession", name: "Intercession", also: "",
      forms: ["Carrying other people before God, faithfully and unseen.", "Keeping a list, and keeping to it.", "Staying when prayer is long."],
      offer: "ask three people what they need prayer for, and pray for them daily for thirty days.",
      mission: { title: "Ten minutes of prayer for a written list of people", cadence: "day" } },
    { id: "giving", name: "Giving", also: "",
      forms: ["Giving gladly, quietly and in proportion.", "Noticing a need before being asked.", "Holding money and time loosely."],
      offer: "give something that costs you, in secret, to a person or a work you know by name.",
      mission: { title: "A gift set aside for a person or work I know by name, and given quietly", cadence: "month" } },
    { id: "craft", name: "Craftsmanship", also: "making",
      forms: ["Making and mending with care.", "Skill of hand put at the service of worship, home and neighbour.", "Work that is finished properly."],
      offer: "make, mend or build one thing for your parish, or for someone who cannot do it themselves.",
      mission: { title: "One thing made or mended for the parish, or for someone who cannot", cadence: "month" } },
    { id: "shepherding", name: "Shepherding", also: "leadership",
      forms: ["Gathering people and keeping them together.", "Taking responsibility when no one else does.", "Seeing who is missing."],
      offer: "notice who has stopped coming, and go and find one of them.",
      mission: { title: "One person who has drifted away sought out, and asked how they are", cadence: "month" } }
  ];
  ICONO.scenes = [
    { id: "visitation", title: "The Visitation", ref: "Luke 1:39-56", text: "Mary goes in haste to her cousin, and her greeting fills the house with joy.", w: { encouragement: 3, service: 2 } },
    { id: "cana", title: "The Wedding at Cana", ref: "John 2:1-11", text: "Mary sees that the wine has run out, and quietly tells her Son.", w: { intercession: 3, hospitality: 2 } },
    { id: "emmaus", title: "The Road to Emmaus", ref: "Luke 24:13-35", text: "A stranger walks beside two sad disciples, opens the Scriptures, and is known in the breaking of the bread.", w: { teaching: 3, encouragement: 1, hospitality: 1 } },
    { id: "john", title: "John in the desert", ref: "John 1:19-34", text: "A voice in the wilderness points away from himself, to the Lamb of God.", w: { evangelisation: 3, teaching: 1 } },
    { id: "bethany", title: "Martha and Mary at Bethany", ref: "Luke 10:38-42", text: "One sister opens the house and serves. The other sits at the Lord's feet and listens.", w: { hospitality: 3, intercession: 2, service: 1 } },
    { id: "samaritan", title: "The Good Samaritan", ref: "Luke 10:25-37", text: "A traveller stops for a wounded stranger, binds his wounds, and pays for his keep.", w: { mercy: 3, giving: 1, service: 1 } },
    { id: "feet", title: "The washing of the feet", ref: "John 13:1-17", text: "The Master kneels with a towel and a basin, and washes his disciples' feet.", w: { service: 3, mercy: 1, shepherding: 1 } },
    { id: "peter", title: "Peter's catch", ref: "John 21:1-19", text: "After a night of empty nets the catch is full, and Peter is told: feed my sheep.", w: { shepherding: 3, evangelisation: 1 } },
    { id: "magdalene", title: "Mary Magdalene at the tomb", ref: "John 20:11-18", text: "She stays weeping in the garden, hears her name, and is sent: go and tell.", w: { evangelisation: 3, encouragement: 1 } },
    { id: "mite", title: "The widow's mite", ref: "Mark 12:41-44", text: "A poor widow puts in two small coins, and it is everything she has.", w: { giving: 3, intercession: 1 } },
    { id: "loaves", title: "The boy with five loaves", ref: "John 6:1-14", text: "A boy hands over his small lunch, and five thousand are fed.", w: { giving: 3, service: 1, hospitality: 1 } },
    { id: "nazareth", title: "Joseph the carpenter", ref: "Matthew 13:55; Luke 2:51-52", text: "Years at the bench in Nazareth, unseen, making good things for a household.", w: { craft: 3, service: 1 } }
  ];
  ICONO.icon = {
    pick: 4,
    lead: "This is given for others. One place to offer it this month:",
    test: "A charism you claim and no one has experienced is not yet a charism. Ask the people you have served.",
    ref: "1 Corinthians 12:4-7; Catechism 799-801, 2003"
  };

  /* ── Panel IV · The Shadow Panel ──
     Each reaction leans toward one capital vice (Catechism 1866). Not every scenario carries all seven. */
  ICONO.vices = [
    { id: "pride", name: "Pride", is: "Placing oneself at the centre: needing to be right, or to be seen.",
      virtue: "Humility", practice: { title: "Once a day, let someone else be right, or leave a good deed unmentioned", field: "heart", cadence: "day" } },
    { id: "avarice", name: "Avarice", is: "Looking to money and possessions for the safety that only God gives.",
      virtue: "Generosity", practice: { title: "Each week, give something away before I count what is left", field: "money", cadence: "week" } },
    { id: "envy", name: "Envy", is: "Sadness at another person's good.",
      virtue: "Kindness and gratitude", practice: { title: "Each day, thank God by name for one good thing that belongs to someone else", field: "heart", cadence: "day" } },
    { id: "wrath", name: "Wrath", is: "Anger that has slipped the rein of love and of justice.",
      virtue: "Patience and meekness", practice: { title: "When anger rises, ten slow breaths before I answer", field: "speech", cadence: "day" } },
    { id: "lust", name: "Lust", is: "Using persons, in thought or in act, for one's own comfort.",
      virtue: "Chastity", practice: { title: "Each evening, the phone outside the bedroom, and a prayer by name for the people I met today", field: "body", cadence: "day" } },
    { id: "gluttony", name: "Gluttony", is: "Using food, drink or other pleasure to numb or to fill.",
      virtue: "Temperance", practice: { title: "One meal a day seated and unhurried, with grace said, stopping at enough", field: "body", cadence: "day" } },
    { id: "sloth", name: "Sloth", also: "acedia", is: "Heaviness toward the good, and above all toward God. The tradition also calls it acedia.",
      virtue: "Diligence", practice: { title: "The first duty of the day at its set time, for five minutes, before anything else", field: "time", cadence: "day" } }
  ];
  ICONO.shadow = {
    scenarios: [
      { q: "A long, hard day is finally over. On a bad day I:", a: [
        ["pride", "Tell myself that nobody else could have carried what I carried."],
        ["avarice", "Check my accounts or my orders, and feel calmer when the numbers are up."],
        ["envy", "Scroll through other people's easier lives, and feel the difference."],
        ["wrath", "Snap at whoever is nearest."],
        ["lust", "Look for comfort in fantasy, or in someone's attention, to feel wanted."],
        ["gluttony", "Numb it with food, drink or the screen, well past enough."],
        ["sloth", "Sink down and let the evening go, prayer included."]] },
      { q: "Someone is praised for a thing I could have done:", a: [
        ["pride", "I note, privately, the ways I would have done it better."],
        ["avarice", "I count what it will bring them: the money, the position."],
        ["envy", "I feel their gain as my loss, and find it hard to be glad."],
        ["wrath", "I go cold or sharp with them for the rest of the day."],
        ["gluttony", "I console myself with a treat I had not planned."],
        ["sloth", "I think: why bother trying at all."]] },
      { q: "Someone needs my help at an inconvenient moment:", a: [
        ["pride", "I help, and make sure it is noticed."],
        ["avarice", "I work out what it will cost me, and give the least that will do."],
        ["envy", "I think that nobody ever does this for me."],
        ["wrath", "I help with a hard face, and they can feel it."],
        ["gluttony", "I say later, because I do not want my meal or my programme interrupted."],
        ["sloth", "I say I am busy, though I am not."]] },
      { q: "I am alone and tired, and no one will know what I do:", a: [
        ["pride", "I plan how to appear more impressive."],
        ["avarice", "I browse, and buy things I do not need."],
        ["envy", "I look up the people I measure myself against."],
        ["wrath", "I replay an old injury and argue it through again."],
        ["lust", "I go looking for images or company that use another person for my comfort."],
        ["gluttony", "I eat or drink without hunger, and keep going."],
        ["sloth", "I do nothing at all, for hours, and feel worse."]] },
      { q: "I am corrected, fairly, by someone with the right to do it:", a: [
        ["pride", "I explain why they have not understood."],
        ["envy", "I think of others who get away with worse."],
        ["wrath", "I flare up, then or later."],
        ["lust", "I turn to someone who finds me attractive, to feel better about myself."],
        ["gluttony", "I soothe the sting with something sweet or strong."],
        ["sloth", "I agree, and change nothing."]] },
      { q: "Unexpected money or a free weekend arrives:", a: [
        ["pride", "I use it on what will improve how I look to others."],
        ["avarice", "I keep it all, and feel safer."],
        ["envy", "I notice at once that others got more."],
        ["lust", "I think first of an indulgence I would not want my family or my confessor to see."],
        ["gluttony", "I spend it on pleasure, more than I can enjoy."],
        ["sloth", "I let it leak away, with nothing to show."]] },
      { q: "The time for prayer comes round, and I do not feel like it:", a: [
        ["pride", "I think I am doing well enough without it."],
        ["avarice", "I use the time for work, because work produces something."],
        ["envy", "I think of people whose prayer seems to come easily, and feel left out."],
        ["wrath", "I go, and spend the time arguing with someone in my head."],
        ["lust", "My mind drifts to daydreams about someone, and I let it."],
        ["gluttony", "I reach for a snack, a drink or my phone first, and the time is gone."],
        ["sloth", "I skip it. Tomorrow."]] },
      { q: "A person close to me lets me down:", a: [
        ["pride", "I decide I never really needed them."],
        ["avarice", "I keep a ledger of all I have given them, and resolve to give less."],
        ["envy", "I compare them with other people's better friends and families."],
        ["wrath", "I let them have it, or freeze them out."],
        ["lust", "I look elsewhere for warmth, in ways I would not say aloud."],
        ["gluttony", "I comfort myself with food, drink or hours of watching."],
        ["sloth", "I withdraw, and stop making any effort."]] }
    ],
    /* The likely pairing of a gift and its shadow. Our own application of an old saying. Only shown when that gift or charism is strong. */
    pairs: [
      ["pride", "gift", "knowledge", "Knowing much, and needing to be the one who knows."],
      ["pride", "gift", "understanding", "Seeing clearly, and looking down on those who do not."],
      ["pride", "charism", "teaching", "The teacher who can no longer be taught."],
      ["pride", "charism", "shepherding", "Leading, and needing to be followed."],
      ["pride", "gift", "piety", "Devotion that wants to be seen. The tradition calls it vainglory, and counts it the daughter of pride."],
      ["wrath", "gift", "fortitude", "Strength for the good, turned on the people who stand in the way."],
      ["wrath", "charism", "evangelisation", "Zeal that has lost its patience."],
      ["envy", "charism", "encouragement", "An eye for the good in others, soured by comparison."],
      ["envy", "gift", "counsel", "Seeing what is best, and resenting those who have it."],
      ["avarice", "charism", "giving", "Care for what is entrusted, turned into keeping."],
      ["avarice", "charism", "craft", "Love of good things, turned into owning them."],
      ["avarice", "gift", "knowledge", "Knowing the worth of things, and holding on to them."],
      ["lust", "charism", "mercy", "A warm heart that draws close, and then takes."],
      ["lust", "charism", "hospitality", "Warmth that wants to be wanted."],
      ["gluttony", "charism", "hospitality", "Love of the table, without its measure."],
      ["gluttony", "gift", "piety", "A taste for consolation, sought in the wrong place."],
      ["sloth", "charism", "intercession", "A quiet spirit that has withdrawn from the work."],
      ["sloth", "gift", "wisdom", "Love of stillness, turned into avoidance."],
      ["sloth", "gift", "fear", "Awe turned into paralysis: so afraid of doing wrong that nothing is done."],
      ["sloth", "charism", "service", "Service that ran on your own strength, and has run out."]
    ],
    lead: "Where the tradition would look first",
    teaching: "Your dominant vice is nearly always the shadow of your dominant gift. The remedy is the opposite virtue, not the suppression of the gift.",
    gently: "Read this gently. Rise gently and begin again. Bring this one sentence to confession and to direction. Only a confessor can judge sin; this panel cannot.",
    skip: "People want to skip this panel. You may. Nothing is lost, and nothing is counted against you.",
    private: "Your answers on this page are never saved. They are held only while this screen is open.",
    keep: "Keep this result on this device",
    keepNote: "Unticked, the result is shown to you now and then forgotten. Ticked, only the one-line result is kept, never your answers.",
    notKept: "The Shadow result was not kept. That was your choice, and a good one to be free to make."
  };

  /* ── Panel V · The Threshold ──
     Every question offers one answer for each register, in the order of ICONO.registers. The screen rotates the order. */
  ICONO.registers = [
    { id: "contemplative", name: "Contemplative", is: "You serve first by prayer. Tie that prayer to named people, so that it does not become a hiding place.",
      patron: "St Teresa of Ávila", doctor: "St John of the Cross" },
    { id: "missionary", name: "Missionary", is: "You serve by going, and by speaking of Christ where he is not known. Stay rooted in prayer, or the going becomes restlessness.",
      patron: "St Francis Xavier", doctor: "St Thérèse of Lisieux, patroness of the missions" },
    { id: "creative", name: "Creative and prophetic", is: "You serve by making, and by saying what is true in a way that can be seen. Let the work be a window, and not a monument.",
      patron: "St Hildegard of Bingen", doctor: "St Hildegard of Bingen" },
    { id: "pastoral", name: "Pastoral and healing", is: "You serve by staying beside people who are hurting. Let yourself be cared for too.",
      patron: "St Francis de Sales", doctor: "St Francis de Sales" },
    { id: "teaching", name: "Teaching", is: "You serve by making the faith clear. Keep learning, and stay a pupil.",
      patron: "St Thomas Aquinas", doctor: "St Thomas Aquinas" },
    { id: "building", name: "Building", is: "You serve by founding, ordering and making things last. Build for others to inherit, and be ready to hand it on.",
      patron: "St Benedict", doctor: "St Gregory the Great" },
    { id: "hidden", name: "Hidden and ordinary", is: "You serve in the daily round: home, work and the people given to you. This is Nazareth, and it is not second best.",
      patron: "St Joseph", doctor: "St Thérèse of Lisieux" }
  ];
  ICONO.threshold = {
    questions: [
      { q: "A free day with no duties. I would most gladly:", a: [
        "Spend long hours in silence, in a church or alone outdoors.", "Go somewhere new, and meet people unlike me.", "Make something: write, paint, compose, design.",
        "Visit someone who is having a hard time.", "Read deeply, and work out how to explain it.", "Get a project organised and moving.", "Be at home, doing ordinary things well for the people I love."] },
      { q: "People most often come to me for:", a: [
        "Prayer, and a quiet place to be.", "A push to go out and try.", "A new way of seeing the thing.",
        "A listening ear when they are hurting.", "An explanation they can understand.", "Getting something started, and making it last.", "Steady, practical help that makes no noise."] },
      { q: "What grieves me most, in the Church and in the world:", a: [
        "That God is so little loved, and so seldom adored.", "That so many have never been told the Gospel.", "Ugliness and falsehood passed off as normal.",
        "The wounded whom nobody stops for.", "Confusion, and the faith badly explained.", "Good works that collapse for want of structure.", "Homes and daily duties neglected for grander things."] },
      { q: "The saints I am drawn to are mostly:", a: [
        "Hermits, monks and mystics.", "Missionaries, and martyrs who crossed borders.", "Poets and artists, and those who spoke hard truths to their age.",
        "Confessors and healers, friends of the sick and the poor.", "The great teachers and Doctors.", "Founders and reformers.", "Hidden saints: parents, workers, people nobody noticed."] },
      { q: "I lose track of time when I am:", a: [
        "Praying, or simply still.", "Talking about the faith with someone far from it.", "Making something that did not exist before.",
        "Sitting with one person and their trouble.", "Studying, or preparing to teach.", "Planning, organising, and watching a work take shape.", "Cooking, mending, tending: the work of an ordinary day."] },
      { q: "If I had one year to give entirely to God, I would:", a: [
        "Live it in a monastery, or a place of silence.", "Go wherever the need for the Gospel is greatest.", "Make one true and beautiful work.",
        "Serve the sick, the dying or the broken-hearted.", "Study the faith, and teach it.", "Found or rebuild something that would outlast me.", "Live my present life more faithfully, where I am."] },
      { q: "The hardest thing to give up would be:", a: [
        "My time alone with God.", "The freedom to go where I am sent.", "My craft and my voice.",
        "The people I look after.", "My books and my students.", "The work I am building.", "My home and its daily round."] },
      { q: "At the end, I would most like it said that I:", a: [
        "Prayed, and held others up before God.", "Brought Christ to people who did not know him.", "Showed people something true that they could not unsee.",
        "Bound up wounds.", "Made the faith clear.", "Left something standing that serves others.", "Was faithful in small things, and loved the people given to me."] }
    ],
    note: "This does not tell you your state of life. No instrument can. Marriage, priesthood, consecrated life and the single life are discerned in prayer, over time, with a director, in community. Read this as the register in which you are likely to serve, whatever your state.",
    company: "to keep company with for a year"
  };

  ICONO.synthesis = {
    title: "Putting the five together",
    parts: { tone: "The tone", ask: "What to ask for", mission: "The mission", ascetical: "The practice", register: "The register" },
    says: { tone: "from the Dwelling", ask: "from the Seven Lamps", mission: "from the Icon Screen", ascetical: "from the Shadow Panel", register: "from the Threshold" }
  };

  /* Small line glyphs for the twelve scenes, drawn for this app on a 48 by 48 grid. One stroke weight, no fill. */
  const jar = (x, y) => `<path d="M${x + 2.5} ${y}h4M${x + 3} ${y}v1.5c-3 1.5-3.5 4-3.5 6.5s1.2 4.5 2.5 5h5c1.3-.5 2.5-2.5 2.5-5s-.5-5-3.5-6.5V${y}"/>`;
  const loaf = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="3.8"/><path d="M${x - 2.4} ${y - 1.2}l1.6 2.4M${x + 0.8} ${y - 1.2}l1.6 2.4"/>`;
  ICONO.glyphs = {
    visitation: `<circle cx="17" cy="12.5" r="3.6"/><circle cx="31" cy="12.5" r="3.6"/><path d="M9.5 40c0-11 2.5-19 7.5-19 3 0 5.2 2.6 7 6.5M38.5 40c0-11-2.5-19-7.5-19-3 0-5.2 2.6-7 6.5M19.5 31h9M6.5 40h35"/>`,
    cana: jar(6, 8) + jar(19, 8) + jar(32, 8) + jar(6, 26) + jar(19, 26) + jar(32, 26),
    emmaus: `<path d="M9 42c6-7 16-9 14-16-1.2-4.2 3-7 7-9M22 42c5-6 14-8 12-15-1-3.6.8-6.6 2.5-9M5 17.5h21M41 17.5h2.5M27.5 17a6.5 6.5 0 0 1 12.5 0M33.8 5.5V8M25.8 8.8l1.8 1.8M41.8 8.8 40 10.6"/>`,
    john: `<path d="M24 41C24 31 23.5 24 25.5 16.5M26.8 6.5V4M24 31c-5-1.5-7.5-5.5-7.5-10.5M24.3 26c4-1.5 6.7-4.5 7.2-9M7 41.5c3-2 5.5-2 8.5 0s5.5 2 8.5 0 5.5-2 8.5 0 5.5 2 8.5 0"/><ellipse cx="26.3" cy="11.5" rx="1.9" ry="5" transform="rotate(8 26.3 11.5)"/>`,
    bethany: `<path d="M8 22.5 24 9l16 13.5M12 19.5V40h24V19.5M20.5 40V30a3.5 3.5 0 0 1 7 0v10M6 40h36M24 13.5v3M22.5 15h3"/>`,
    samaritan: `<path d="M19.5 9h8M21 9v5c-4 2-6.5 5.5-6.5 10.5 0 6 3.7 10 9 10s9-4 9-10c0-5-2.5-8.5-6.5-10.5V9M32 19c3.5 0 5.5 2 5.5 4.8S35.5 28.5 32.3 28.5M17.5 26.5h12M23.5 22.5v8"/><path d="M8.5 37.5c0-1.8 1.7-3.8 1.7-3.8s1.7 2 1.7 3.8a1.7 1.7 0 0 1-3.4 0ZM36.5 39c0-1.5 1.4-3.2 1.4-3.2s1.4 1.7 1.4 3.2a1.4 1.4 0 0 1-2.8 0Z"/>`,
    feet: `<path d="M7 26.5h27c0 7-5.5 11.5-13.5 11.5S7 33.5 7 26.5ZM12.5 31c1.8-1 3.7-1 5.5 0s3.7 1 5.5 0 3.7-1 5.5 0M15.5 38.2V41h10v-2.8M29.5 8h13M32 8v14.5l2.7-1.8 2.8 1.8 2.7-1.8V8M34.8 12v4M37.5 12v4"/>`,
    peter: `<path d="M9 11h26c0 14-4.5 26-13 26S9 25 9 11ZM14 11c1 9 3.5 18 8 26M30 11c-1 9-3.5 18-8 26M22 11v26M10.5 19.5h23M13.5 28h17"/><path d="M32 39c2.8-2.8 7-2.8 10 0-3 2.8-7.2 2.8-10 0Zm0 0-2.5-2.3M32 39l-2.5 2.3"/>`,
    magdalene: `<path d="M4 40h40M7 40c0-15.5 7.5-26 17-26s17 10.5 17 26M17.5 40V30.5a6.5 6.5 0 0 1 13 0V40M24 5v4M13.5 7.5l2 3.2M34.5 7.5l-2 3.2"/><circle cx="35" cy="34" r="5.3"/>`,
    mite: `<circle cx="18" cy="27" r="9"/><circle cx="18" cy="27" r="5.5"/><circle cx="33" cy="18" r="6.5"/><circle cx="33" cy="18" r="3.5"/><path d="M8 41h30"/>`,
    loaves: loaf(13, 15) + loaf(35, 15) + loaf(24, 24.5) + loaf(13, 34) + loaf(35, 34),
    nazareth: `<path d="M5 34h38M10 34v7M38 34v7M11 34v-6.5h20.5l4.5 6.5M14.5 27.5c0-4.5 1.8-6.5 4.3-6.5 2 0 3.2 1.3 3.2 3.2v3.3M29.5 27.5v-3.2M25.5 27.5l-1.8-5.5M37 29.5c3 0 5-1.8 5-4.3S40.5 21 39 21s-2.4 1-2.4 2.2.9 1.9 1.7 1.9"/>`
  };

  IL.ICONO = ICONO;

  /* ───────── scoring: pure functions ───────── */
  const BANDS = ["first", "ordered", "inner"];
  const GIFT_IDS = ICONO.gifts.map((g) => g.id);
  const CHARISM_IDS = ICONO.charisms.map((c) => c.id);
  const VICE_IDS = ICONO.vices.map((v) => v.id);
  const REGISTER_IDS = ICONO.registers.map((r) => r.id);
  const SCENE_IDS = ICONO.scenes.map((s) => s.id);
  const byId = (list, id) => list.find((x) => x.id === id) || null;
  const int = (x) => (typeof x === "number" && isFinite(x) ? Math.round(x) : null);

  // Panel I. answers: six option indexes. Returns one of three bands, or null while a question is open.
  // The band is the plain average of the six leanings. "inner" also needs no answer from the first room.
  // Nothing beyond "inner" can be returned, whatever the answers.
  function dwelling(answers) {
    const qs = ICONO.dwelling.questions, a = Array.isArray(answers) ? answers : [];
    const ds = qs.map((q, i) => { const k = int(a[i]); return k != null && q.a[k] ? q.a[k][1] : null; });
    if (ds.some((d) => d == null)) return null;
    const mean = ds.reduce((n, d) => n + d, 0) / ds.length;
    let band = mean < 2.5 ? "first" : mean < 3.5 ? "ordered" : "inner";
    if (band === "inner" && ds.some((d) => d <= 1)) band = "ordered";
    return { band, mean: Math.round(mean * 100) / 100 };
  }

  // The state of one lamp from its level (0 to 6).
  const lampState = (level) => (level >= 4 ? "awake" : level <= 2 ? "dormant" : "steady");

  // Panel II. answers: fourteen ratings from 0 to 3. Returns a level from 0 to 6 for each gift.
  function lamps(answers) {
    const st = ICONO.lamps.statements, a = Array.isArray(answers) ? answers : [], levels = {};
    GIFT_IDS.forEach((g) => { levels[g] = 0; });
    for (let i = 0; i < st.length; i++) { const v = int(a[i]); if (v == null || v < 0 || v > 3) return null; levels[st[i][0]] += v; }
    return lampSummary(levels);
  }
  // The same summary from stored levels. Ties go to the earlier gift in the Church's list.
  function lampSummary(levels) {
    const lv = {}; GIFT_IDS.forEach((g) => { const v = int(levels && levels[g]); lv[g] = v != null && v >= 0 && v <= 6 ? v : 0; });
    const awake = GIFT_IDS.filter((g) => lampState(lv[g]) === "awake"), dormant = GIFT_IDS.filter((g) => lampState(lv[g]) === "dormant");
    let brightest = GIFT_IDS[0], lowest = GIFT_IDS[0];
    GIFT_IDS.forEach((g) => { if (lv[g] > lv[brightest]) brightest = g; if (lv[g] < lv[lowest]) lowest = g; });
    return { levels: lv, awake, dormant, brightest, lowest };
  }

  // Panel III. picks: the ids of the chosen scenes, in the order they were chosen.
  // The two charisms with the highest weight. Ties go to the charism that appeared first among the picks.
  function charisms(picks) {
    const p = (Array.isArray(picks) ? picks : []).filter((id, i, arr) => SCENE_IDS.includes(id) && arr.indexOf(id) === i);
    if (p.length !== ICONO.icon.pick) return null;
    const totals = {}, order = [];
    p.forEach((id) => { const w = byId(ICONO.scenes, id).w;
      Object.keys(w).sort((x, y) => w[y] - w[x] || CHARISM_IDS.indexOf(x) - CHARISM_IDS.indexOf(y)).forEach((c) => { if (!(c in totals)) { totals[c] = 0; order.push(c); } totals[c] += w[c]; }); });
    const ranked = order.slice().sort((x, y) => totals[y] - totals[x] || order.indexOf(x) - order.indexOf(y));
    return { totals, top: ranked.slice(0, 2) };
  }

  // Panel IV. answers: one vice id for each scenario, or null where it was left blank.
  // The vice chosen most often. Ties go to the one chosen first. Fewer than four answers gives no result.
  function shadow(answers) {
    const a = (Array.isArray(answers) ? answers : []).slice(0, ICONO.shadow.scenarios.length);
    const counts = {}, order = [];
    a.forEach((v, i) => { const sc = ICONO.shadow.scenarios[i]; if (!sc || !sc.a.some((o) => o[0] === v)) return; if (!(v in counts)) { counts[v] = 0; order.push(v); } counts[v] += 1; });
    const answered = order.reduce((n, v) => n + counts[v], 0);
    if (answered < 4) return null;
    const ranked = order.slice().sort((x, y) => counts[y] - counts[x] || order.indexOf(x) - order.indexOf(y));
    return { vice: ranked[0], counts, answered };
  }

  // Panel V. answers: one register id for each question.
  // The likeliest register, and a second if it is within one answer of the first and was chosen at least twice.
  function threshold(answers) {
    const n = ICONO.threshold.questions.length, a = Array.isArray(answers) ? answers.slice(0, n) : [];
    if (a.length < n || a.some((r) => !REGISTER_IDS.includes(r))) return null;
    const counts = {}, order = [];
    a.forEach((r) => { if (!(r in counts)) { counts[r] = 0; order.push(r); } counts[r] += 1; });
    const ranked = order.slice().sort((x, y) => counts[y] - counts[x] || order.indexOf(x) - order.indexOf(y));
    const top = [ranked[0]];
    if (ranked[1] && counts[ranked[1]] >= 2 && counts[ranked[1]] >= counts[ranked[0]] - 1) top.push(ranked[1]);
    return { counts, top };
  }

  // The likely pairing of the root tendency with a strong gift or charism, or null.
  function pairing(vice, result) {
    if (!result || !VICE_IDS.includes(vice)) return null;
    const awake = result.lamps ? lampSummary(result.lamps).awake : [], top = Array.isArray(result.charisms) ? result.charisms : [];
    const hit = ICONO.shadow.pairs.find(([v, kind, id]) => v === vice && (kind === "gift" ? awake.includes(id) : top.includes(id)));
    if (!hit) return null;
    const of = hit[1] === "gift" ? byId(ICONO.gifts, hit[2]) : byId(ICONO.charisms, hit[2]);
    return { kind: hit[1], id: hit[2], name: of.name, text: hit[3] };
  }

  // Is this a well-formed stored result? Used by the app before anything is shown or kept.
  function clean(r) {
    if (!r || typeof r !== "object" || !BANDS.includes(r.band)) return null;
    const date = typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null; if (!date) return null;
    const uniq = (list, allowed, max) => (Array.isArray(list) ? list : []).filter((x, i, arr) => allowed.includes(x) && arr.indexOf(x) === i).slice(0, max);
    const cs = uniq(r.charisms, CHARISM_IDS, 2), rs = uniq(r.registers, REGISTER_IDS, 2);
    if (!cs.length || !rs.length) return null;
    return { date, band: r.band, lamps: lampSummary(r.lamps).levels, charisms: cs, registers: rs, vice: VICE_IDS.includes(r.vice) ? r.vice : "" };
  }

  // Putting the five together. The logic is fixed: the dwelling sets the tone, the gifts say what to ask for,
  // the charisms give the mission, the root tendency gives the practice, the threshold gives the register.
  // result: a stored result. vice: optional, a Shadow result that was not kept and is known only for this sitting.
  function synthesis(result, vice) {
    const r = clean(result); if (!r) return null;
    const v = VICE_IDS.includes(vice) ? vice : r.vice, L = lampSummary(r.lamps);
    const band = ICONO.dwelling.bands[r.band], low = byId(ICONO.gifts, L.lowest), high = byId(ICONO.gifts, L.brightest);
    const c0 = byId(ICONO.charisms, r.charisms[0]), V = v ? byId(ICONO.vices, v) : null;
    const regs = r.registers.map((id) => byId(ICONO.registers, id));
    return {
      date: r.date, band: r.band,
      tone: { band: band.name, dwellings: band.dwellings, text: band.tone, counsel: band.counsel },
      ask: { gift: low.id, name: low.name, petition: low.petition, feedsGift: high.id, feedsName: high.name, feeds: high.feeds, awake: L.awake, dormant: L.dormant },
      mission: { charism: c0.id, name: c0.name, charisms: r.charisms.slice(), title: c0.mission.title, field: "mission", cadence: c0.mission.cadence },
      ascetical: V ? { vice: V.id, name: V.name, virtue: V.virtue, title: V.practice.title, field: V.practice.field, cadence: V.practice.cadence, kept: r.vice === V.id } : null,
      register: { ids: r.registers.slice(), names: regs.map((x) => x.name), patron: regs[0].patron, doctor: regs[0].doctor, also: regs[1] ? { name: regs[1].name, patron: regs[1].patron, doctor: regs[1].doctor } : null },
      pairing: V ? pairing(V.id, r) : null
    };
  }

  IL.icono = { dwelling, lamps, lampSummary, lampState, charisms, shadow, threshold, pairing, synthesis, clean,
    BANDS, GIFT_IDS, CHARISM_IDS, VICE_IDS, REGISTER_IDS, SCENE_IDS };
})(window.IL);
