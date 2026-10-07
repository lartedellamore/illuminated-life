/* Illuminated Life · content
   Everything the app says lives in this file, so the words can be edited
   without touching the logic in app.js. */

window.IL = window.IL || {};

IL.RINGS = [
  { id: "person", colour: "person", colourName: "ruby", name: "The Person", says: "What I am", hours: "I to IV",
    sub: "the temple", subRef: "1 Corinthians 6:19",
    gloss: "Body, mind, soul and heart: the four with which we are asked to love God (Mark 12:30). They come first because the self is the first thing entrusted to you, and you cannot give what you have not received." },
  { id: "household", colour: "household", colourName: "sapphire", name: "The Household", says: "What I keep", hours: "V to VIII",
    sub: "the house", subRef: "the domestic church, Catechism 1655-1657",
    gloss: "Time, finance, work and home. The steward of the Gospel is the manager of a household. Here love takes structure, or stays a feeling." },
  { id: "world", colour: "world", colourName: "emerald", name: "The World", says: "What I give", hours: "IX to XII",
    sub: "the field", subRef: "Matthew 13:38",
    gloss: "Creation, speech, beauty and mission. The neighbour, widened to the earth itself. Here the light leaves your hands." }
];

/* The centre of the rose is kept in gold. It belongs to no ring. */
IL.CENTRE = { name: "The centre", says: "Not yours to light", sub: "Christ, the lamp", subRef: "Revelation 21:23" };

/* The picture of the model: a parish church. Lamp, temple, house, field. */
IL.PICTURE = {
  title: "Lamp, temple, house, field",
  text: "Think of a parish church. At its heart a lamp burns before the tabernacle. Christ is there, and that is the centre. Around him stands the temple, which is you. Around the temple is the house: the home, the domestic church. Beyond the doors lies the field: the field is the world, and every Mass ends by sending us into it. Lamp, temple, house, field.",
  alt: "A line drawing of a small church. A lamp burns before the tabernacle at its heart. Around the lamp is an arch, the temple. Around the arch are the walls and roof, the house. Outside the door lie the furrows of the field."
};

/* Christ at the centre: the figures of Scripture that the model leans on. Each: title, text, reference, and an optional caution. */
IL.CHRIST = {
  intro: "God's own plan is to unite all things in Christ (Ephesians 1:10). In him all things hold together (Colossians 1:17). All things are yours, and you are Christ's, and Christ is God's (1 Corinthians 3:21-23).",
  cards: [
    { title: "The new Adam", text: "The first man was set in a garden to till it and keep it, and did not keep it. Christ was obedient in a garden, and on Easter morning was taken for the gardener.", ref: "Genesis 2:15; Romans 5:14; John 20:15" },
    { title: "The true Temple", text: "He spoke of the temple of his body. In the city to come the Lamb is the temple and the lamp, and we are built into him as living stones.", ref: "John 2:21; Revelation 21:22-23; 1 Peter 2:5" },
    { title: "Joseph", text: "Sold by his brothers, raised up, set over another's house, he fed the nations with bread.", ref: "Genesis 39-41" },
    { title: "The Son over the house", text: "Moses was faithful in God's house as a servant. Christ is faithful over it as a Son, and we are that house.", ref: "Hebrews 3:5-6" },
    { title: "The keeper of the key", text: "Eliakim the steward received the key of the house of David. The risen Christ holds it.", ref: "Isaiah 22:20-22; Revelation 3:7" },
    { title: "The twelve stones", caution: "An application, not a figure Scripture itself draws", text: "The high priest carried twelve stones on his heart before the Lord. They are the twelve tribes, fulfilled in the Church. Take courage from them: you do not carry your twelve fields alone.", ref: "Exodus 28:21, 29" }
  ]
};

/* Three threads that run through all twelve fields. They are also the three parts of the steward card on the Rule screen. */
IL.THREADS = [
  { id: "temple", name: "The temple", says: "what you are",
    text: "Before you hold anything, you are held. By Baptism you are a temple of the Holy Spirit and a member of Christ (CCC 1265)." },
  { id: "calling", name: "The calling", says: "the shape your life is given",
    text: "Each one should lead the life the Lord has assigned (1 Corinthians 7:17). Your state of life decides what faithfulness means in every field. It is discerned in prayer, over time, with the Church, never by an app." },
  { id: "gifts", name: "The gifts", says: "what you bring",
    text: "As each has received a gift, use it to serve one another (1 Peter 4:10). Charisms are given through you for others (CCC 799-801). A gift kept for oneself is a buried talent." }
];
IL.THREADS_LINE = "And first of all we are stewards of the mysteries of God (1 Corinthians 4:1). The faith itself is the first treasure. It lives in the field of the Soul and is given away in Mission.";
IL.STATES_OF_LIFE = [["", "Not set"], ["single", "Single"], ["married", "Married"], ["widowed", "Widowed"], ["consecrated", "Consecrated"], ["ordained", "Ordained"], ["discerning", "Discerning"]];

/* The three ring colours are a memory aid, like the glass of a rose window.
   They are not the Church's liturgical colours. The values live in css/styles.css. */
IL.COLOUR_NOTE = "The three colours mark the three rings: ruby for the Person, sapphire for the Household, emerald for the World. Gold is kept for the centre. They are a memory aid, like the glass of a rose window, and are not the Church's liturgical colours.";

IL.LEVELS = ["Not yet begun", "Kindled", "Shining", "Burning", "Radiant"];

IL.MOVES = [
  { id: "receive", verse: { t: "For who distinguisheth thee? Or what hast thou that thou hast not received? And if thou hast received, why dost thou glory, as if thou hadst not received it?", r: "1 Corinthians 4:7" }, name: "Receive", verb: "He took", ask: "What have I been given here? Thank God for it by name.",
    ph: "One sentence of thanks. This was not mine first.",
    prayer: "Lord, I did not make this and I did not earn it. Thank you." },
  { id: "bless", verse: { t: "Seek ye therefore first the kingdom of God, and his justice, and all these things shall be added unto you.", r: "Matthew 6:33" }, name: "Bless", verb: "He blessed", ask: "What is this field for, and where does it stand among my loves?",
    ph: "What it is for. What it must never outrank.",
    prayer: "Lord, put this in its place beneath you." },
  { id: "spend", verse: { t: "And calling his ten servants, he gave them ten pounds, and said to them: Trade till I come.", r: "Luke 19:13" }, name: "Spend", verb: "He broke", ask: "What one small practice will put it to work? Give it a time and a place.",
    ph: "A practice small enough for my worst week, with a time and a place.",
    prayer: "Lord, give me the courage to put it to work." },
  { id: "ret", verse: { t: "Who am I, and what is my people, that we should be able to promise thee all these things? All things are thine: and we have given thee what we received of thy hand.", r: "1 Chronicles 29:14" }, name: "Return", verb: "He gave", ask: "To whom is this given, and when will I review it before God?",
    ph: "Who receives this. The date I will look at it again.",
    prayer: "Lord, here is what you gave me, and what I did with it. Take both." }
];

IL.FIELDS = [
  { id: "body", n: "I", name: "Body", ring: "person", icon: "lily",
    holds: "The body, a temple of the Holy Spirit: sleep, food, movement, medical care, rest, sexuality.",
    end: "A body lived in as a temple and spent in love: rested, fed, strong enough to serve, and received as a gift.",
    disorder: "Neglect on one side, the cult of the body on the other. Both treat the body as something other than you.",
    examine: ["Am I sleeping enough to be patient with people?", "Do I eat seated and gratefully, without punishing or numbing myself?", "Is there care I have been putting off: a doctor, a dentist, a rest?"],
    rungs: ["A fixed bedtime, with the phone charging outside the bedroom", "Meals at a table with grace said, and a daily walk outdoors", "Strength built twice a week, and overdue appointments booked", "Rest, food and movement kept ordinarily, as thanksgiving"],
    radiant: "You live in your body without war. It is neither your project nor your enemy.",
    verse: { t: "Your body is a temple of the Holy Spirit. So glorify God in your body.", r: "1 Corinthians 6:19-20" },
    ccc: "364, 1004, 2288-2289",
    care: "If food or exercise has ever been a place of illness for you, choose your practices here with your clinician, and never use food as penance." },

  { id: "mind", n: "II", name: "Mind", ring: "person", icon: "book",
    holds: "Attention, study, formation, imagination, everything you let in.",
    end: "A mind that loves the truth: attentive, well fed, able to be corrected, and at home in the faith it professes.",
    disorder: "Attention sold by the minute, and a faith that stopped learning long ago.",
    examine: ["Who decides what enters my mind each day: me, or a feed?", "What have I read this year that corrected me?", "Could I explain what I believe, fairly, to someone who disagrees?"],
    rungs: ["Twenty minutes of real reading before any screen", "One serious book always in progress, a chapter a week", "Chosen inputs: a short list of what I follow, pruned each season", "I read in order to love better, and it shows"],
    radiant: "Your attention is yours to give, and you give it to what is true.",
    verse: { t: "Whatever is true, whatever is honourable, whatever is lovely, think about these things.", r: "Philippians 4:8" },
    ccc: "158, 2500" },

  { id: "soul", n: "III", name: "Soul", ring: "person", icon: "flame",
    holds: "The faith itself, received and handed on: prayer, Scripture, sacraments, confession, silence, spiritual direction.",
    end: "Friendship with God as the breath of the day: fixed, unhurried, and kept most of all when it is dry.",
    disorder: "Bursts of intensity, then collapse. Prayer only when the mood arrives.",
    examine: ["Did I keep the time on the days it gave me nothing?", "When did I last confess: a date kept, or a crisis?", "Do I let him speak, or do I fill the whole silence?"],
    rungs: ["Two minutes, morning and night, in the same place", "Fifteen minutes daily with the Gospel of the day, and Sunday Mass unhurried", "Confession on a set interval, and one person who guides me", "Prayer is no longer a slot in the day. It is the shape of it"],
    radiant: "Dryness no longer threatens your prayer. You come for him, and not for the feeling.",
    verse: { t: "Your face, Lord, do I seek.", r: "Psalm 27:8" },
    ccc: "1324, 2697-2699" },

  { id: "heart", n: "IV", name: "Heart", ring: "person", icon: "heart",
    holds: "Marriage and family, friendship, community, emotional honesty.",
    end: "To know and be known: present to the people given to you, honest about what you feel, and faithful over years.",
    disorder: "Widely liked, and known by no one. Present in the room, absent in attention.",
    examine: ["Who knows the whole truth about me?", "Whom do I owe a visit, a call, an apology?", "Do the people at my table get my attention, or my leftovers?"],
    rungs: ["One unhurried hour a week, in person, in the calendar", "Three people named: one ahead of me, one beside me, one I am helping along", "The hard, kind, honest conversation I have been avoiding", "I am reliably present, and I let those who love me correct me"],
    radiant: "You are known, and the people entrusted to you know they come first.",
    verse: { t: "Love one another as I have loved you.", r: "John 15:12" },
    ccc: "1829, 2197, 2205" },

  { id: "time", n: "V", name: "Time", ring: "household", icon: "calendar",
    holds: "The calendar, commitments, rhythm, rest, the word no.",
    end: "Days that tell the truth about what you love: first hours for first things, and a day of rest kept holy.",
    disorder: "A life of reaction, where the urgent always defeats the important.",
    examine: ["If a stranger read my week, what would they say I love?", "What did I say yes to out of fear?", "Is there empty space in my week on purpose?"],
    rungs: ["The day of rest blocked in the calendar before anything else", "Three anchors fixed: morning offering, midday pause, evening examen", "A weekly review, and one hour of empty space protected", "My calendar and my loves agree, and I can say no without guilt"],
    radiant: "You are unhurried. People feel that you have time for them.",
    verse: { t: "Teach us to number our days, that we may gain a heart of wisdom.", r: "Psalm 90:12" },
    ccc: "2184-2185, 2698" },

  { id: "money", n: "VI", name: "Finance", ring: "household", icon: "coin",
    holds: "Earning, spending, saving, giving, debt.",
    end: "Goods held as a trustee: known to the cent, given first, enough for those who depend on you, and never your security.",
    disorder: "Vagueness, which is usually avoidance dressed as detachment. Or anxiety, which is trust placed in a balance.",
    examine: ["Do I know what came in last month, and what I gave?", "Is there a debt or a bill I am not looking at?", "What would I refuse to give up if God asked for it?"],
    rungs: ["One hour with the figures: what came in, and what went out", "Giving set aside first, by a proportion decided in advance", "A written plan for debt, and a modest reserve begun", "I know my numbers, give gladly, and am content with enough"],
    radiant: "Your finances have become a tool of love and have stopped being a source of fear.",
    verse: { t: "Where your treasure is, there will your heart be also.", r: "Matthew 6:21" },
    ccc: "2402-2405, 2443-2449" },

  { id: "work", n: "VII", name: "Work", ring: "household", icon: "wheat",
    holds: "Labour, craft, profession, study, excellence.",
    end: "Work done well and offered: honest, on time, a share in God's own making, and laid down at the day's end.",
    disorder: "Work as identity. Rest feels like theft, and failure like being erased.",
    examine: ["Does my work serve a real good that I could name without embarrassment?", "Do I treat the people around my work as ends?", "Does my work leave me able to pray, and to love the people at home?"],
    rungs: ["A shutdown ritual: tomorrow's first task written, the laptop closed", "One protected block each day for the work that matters most", "One thing finished properly each week, because quality is a moral matter", "I work hard and stop gladly, and my worth does not ride on the result"],
    radiant: "You do excellent work, and could lose it without losing yourself.",
    verse: { t: "Whatever you do, work heartily, as for the Lord.", r: "Colossians 3:23" },
    ccc: "2427-2428" },

  { id: "home", n: "VIII", name: "Home", ring: "household", icon: "lamp",
    holds: "Your physical space, order, hospitality, daily beauty.",
    end: "A home that is a small church: ordered enough to think in, beautiful enough to rest in, and open enough to receive a guest.",
    disorder: "The space that quietly drains you every day and is never addressed.",
    examine: ["Could I welcome someone tonight without an emergency?", "Which corner have I stopped seeing?", "Is there a place in my home set apart for prayer?"],
    rungs: ["Ten minutes resetting one room each evening", "A prayer corner, and one beautiful thing in each room", "Papers, bills and civic duties given one fixed hour a week", "Someone welcomed at my table at least once a month"],
    radiant: "Your home receives people. It serves the life lived in it, and not the other way round.",
    verse: { t: "As for me and my house, we will serve the Lord.", r: "Joshua 24:15" },
    ccc: "1655-1657, 2223" },

  { id: "creation", n: "IX", name: "Creation", ring: "world", icon: "leaf",
    holds: "The earth, animals, food, energy, what you buy and from whom.",
    end: "To live on the earth as a grateful tenant: taking what is needed, wasting little, and leaving it better for those who come after.",
    disorder: "Treating it as someone else's issue. Or as a politics, when it is first a discipline.",
    examine: ["What did my household throw away this week?", "Do I know where my food and my clothes come from?", "When did I last simply look at something God made?"],
    rungs: ["One meal a week cooked wholly from what is already in the house", "Buy less and better: one purchase delayed for thirty days", "Waste noticed and reduced; something grown, mended or shared", "Simplicity has become a quiet joy and has stopped being a rule"],
    radiant: "You use the world with gratitude and restraint, and you notice it.",
    verse: { t: "The Lord God took the man and put him in the garden, to till it and keep it.", r: "Genesis 2:15" },
    ccc: "2415-2418" },

  { id: "speech", n: "X", name: "Speech", ring: "world", icon: "pen",
    holds: "Words, honesty, promises, gossip, silence, everything you publish.",
    end: "Words that can be trusted: true, kind, necessary, and the same in the room as out of it.",
    disorder: "The pious feed and the unguarded conversation. Truth without love, or niceness without truth.",
    examine: ["Would I have said it if they were in the room?", "Did I keep my word this week, in small things?", "What did I post, and whom did it serve?"],
    rungs: ["One day a week with no comment on anyone who is absent", "Promises written down, and kept or honestly released", "The hard thing said kindly, to the person's face", "Where I have harmed a reputation, I repair it"],
    radiant: "People trust your word, and are safe when they are not in the room.",
    verse: { t: "Let your speech always be gracious, seasoned with salt.", r: "Colossians 4:6" },
    ccc: "2475-2487" },

  { id: "beauty", n: "XI", name: "Beauty and Making", ring: "world", icon: "star",
    holds: "Art, music, craft, writing, garden, song, the work of your hands.",
    end: "To make and receive beautiful things as praise: gifts used, craft honoured, and the maker forgotten in the making.",
    disorder: "\"No time for that any more.\" Or beauty kept for the self, a mirror facing the wrong way.",
    examine: ["When did I last make something just because it was good?", "Which gift of mine is sitting in storage?", "Would this work please me as much with someone else's name on it?"],
    rungs: ["Thirty protected minutes a week at my craft", "Beauty received on purpose each week: music, a gallery, a poem, a walk", "One finished piece each season, given away", "Making has become prayer, and my gifts are in use for others"],
    radiant: "Your gifts are in circulation. Your work is a window, and not a monument.",
    verse: { t: "One thing I ask of the Lord: to gaze upon the beauty of the Lord.", r: "Psalm 27:4" },
    ccc: "2500-2502" },

  { id: "mission", n: "XII", name: "Mission", ring: "world", icon: "seeds",
    holds: "Service, witness, the poor, your particular contribution.",
    end: "To meet Christ in the least, and to give away what you were given: one real service, in person, sized to your strength.",
    disorder: "A mission that lives in a plan and never in an appointment. Or service used to avoid the people at home.",
    examine: ["Whom, by name, did I serve this month?", "Do I know one poor person as a friend?", "Is my service costing the people entrusted to me?"],
    rungs: ["One recurring hour of service, small enough to keep", "Direct contact: I know by name someone I serve", "My particular gift named, and put to work for others", "I receive from those I serve, and they have changed me"],
    radiant: "The poor are not your project. They are your friends and your teachers.",
    verse: { t: "As you did it to one of the least of these my brothers, you did it to me.", r: "Matthew 25:40" },
    ccc: "905, 2443-2449" }
];

/* The ring a field belongs to (and so its colour). Null for an unknown field. */
IL.ringOf = function (fieldId) {
  const f = IL.FIELDS.find((x) => x.id === fieldId);
  return (f && IL.RINGS.find((R) => R.id === f.ring)) || null;
};

IL.LAWS = [
  ["Grace comes first, always.", "Every good act begins in God's initiative. Even our preparing to receive grace is already a work of grace. Effort is real, and it is always a response."],
  ["Gift comes before task.", "Your worth was settled before the work began. The steward works from dignity and not toward it."],
  ["The picture of the Master governs everything.", "The servant who buried his talent said: I knew you to be a hard man, and I was afraid. When a field has gone dark, look first at what you believe God is like there."],
  ["One field at a time.", "God teaches by stages. Choose one field for a season of about ninety days. Add nothing new in the other eleven. Their ordinary duties still hold."],
  ["Begin again, without penalty.", "No streaks, no score, nothing to catch up. When you fall, you begin again where you are. His mercies are new every morning."],
  ["The test is love of neighbour.", "Every inner gain must show in the outer ring. If you are surer of God's favour and less patient at your own table, nothing has happened yet."]
];

IL.PRECEPTS = [
  "Attend Mass on Sundays and holy days of obligation, and rest from servile labour.",
  "Confess your sins at least once a year.",
  "Receive the Eucharist at least during the Easter season.",
  "Observe the days of fasting and abstinence set by the Church.",
  "Help to provide for the needs of the Church, each according to their ability."
];

IL.PRAYERS = [
  ["Morning offering", "Father, everything I will touch today is yours before it is mine. I receive this day from your hand. Set my loves in order. Let me spend what you have given, and bring it back to you tonight. Through Christ our Lord. Amen."],
  ["To the Holy Spirit", "Come, Holy Spirit. I cannot set my own loves in order. Pour the love of God into my heart, and make me quick to follow where you lead. Amen."],
  ["For the temple of my body", "Holy Spirit, you dwell in this body, and it was bought at a price. Teach me to live in it as your temple: to rest it, to feed it with thanks, to keep it pure, and to spend it in love. I look for the resurrection of the body. Amen."],
  ["For the field I have been avoiding", "Master, you entrusted this to me, and I have buried it because I was afraid. You are not a hard master. Show me the first small thing, and stay with me while I do it. Amen."],
  ["In a dark season", "God beyond feeling, I do not sense you. I choose you anyway. Let that count as prayer. Amen."],
  ["At night", "Into your hands, Lord, I commend my spirit. What I finished is yours. What I did not finish is yours too. Amen."]
];

IL.VERSES = [
  { t: "Come to him and be enlightened, and your faces shall not be confounded.", r: "Psalm 33:6 (Douay)" },
  { t: "It is required of stewards that they be found faithful.", r: "1 Corinthians 4:2" },
  { t: "Well done, good and faithful servant. Enter into the joy of your master.", r: "Matthew 25:21" },
  { t: "What do you have that you did not receive?", r: "1 Corinthians 4:7" },
  { t: "Whoever is faithful in a very little is faithful also in much.", r: "Luke 16:10" },
  { t: "As each has received a gift, use it to serve one another, as good stewards of God's varied grace.", r: "1 Peter 4:10" },
  { t: "If your eye is sound, your whole body will be full of light.", r: "Matthew 6:22" },
  { t: "The light shines in the darkness, and the darkness has not overcome it.", r: "John 1:5" },
  { t: "His mercies never come to an end; they are new every morning.", r: "Lamentations 3:22-23" },
  { t: "Apart from me you can do nothing.", r: "John 15:5" },
  { t: "Present your bodies as a living sacrifice, holy and acceptable to God.", r: "Romans 12:1" },
  { t: "You are the light of the world.", r: "Matthew 5:14" },
  { t: "Be still, and know that I am God.", r: "Psalm 46:10" },
  { t: "My grace is sufficient for you, for my power is made perfect in weakness.", r: "2 Corinthians 12:9" },
  { t: "Do not be anxious about tomorrow.", r: "Matthew 6:34" },
  { t: "Unless the Lord builds the house, those who build it labour in vain.", r: "Psalm 127:1" },
  { t: "One thing is necessary.", r: "Luke 10:42" },
  { t: "Give, and it will be given to you.", r: "Luke 6:38" },
  { t: "Be doers of the word, and not hearers only.", r: "James 1:22" },
  { t: "We are being changed into his likeness, from one degree of glory to another.", r: "2 Corinthians 3:18" }
];

IL.EXAMEN = [
  { id: "settle", name: "Settle", text: "Feet on the floor. Three slow breaths, breathing out longer than in. Say: I am here. I am in your presence." },
  { id: "thanks", name: "Give thanks", text: "Name one good thing from today, however small. Always begin here.", field: "thanks", ph: "One good thing." },
  { id: "light", name: "Ask for light", text: "Lord, show me today as you saw it, with your eyes, which are kinder than mine." },
  { id: "review", name: "Walk through the day", text: "Where were you most alive and most yourself? Where were you tight, afraid or false? Notice. Do not prosecute.", field: "alive", ph: "Where I was alive.", field2: "tight", ph2: "Where I was tight or false." },
  { id: "sort", name: "Tell them apart", text: "Of the hard moments: which was sin, a free choice against love? Which was a wound, an old alarm going off? Which was simply a limit: tiredness, hunger, being a creature? A word is enough. You may leave these blank.", mem: "mercy", memLabel: "For mercy", memPh: "A word is enough.",
    memNote: "Sin goes on to confession. A confessor judges what you cannot.", memSmall: "This line is not saved.",
    field2: "wound", ph2: "Wound: for healing.", field3: "limit", ph3: "Limit: for rest." },
  { id: "mercy", name: "Receive mercy", text: "For sin, ask forgiveness and accept it, once. For the wound, ask for healing. For the limit, ask for rest." },
  { id: "tomorrow", name: "Look ahead", text: "One thing tomorrow asks of you. Name it, and ask for grace for that one thing.", field: "tomorrow", ph: "Tomorrow's one thing." },
  { id: "close", name: "Close", text: "Into your hands I commend my spirit. Then stop." }
];

IL.BUCKETS = [
  ["First fruits", "Given before anything else is allocated: tithe and alms.", 10],
  ["Justice", "Debts, taxes, obligations. Owed, not chosen.", 15],
  ["Providence", "Savings, reserve, insurance. Prudence, not fear.", 10],
  ["Necessities", "Housing, food, transport, health.", 45],
  ["Vocation", "Study, tools, formation, the work itself.", 10],
  ["Gladness", "Beauty, feasting, gifts, hospitality.", 10]
];

IL.DEFAULT_RULE = [
  ["daily", "Morning offering", "07:00", "Before the phone. Offer the day.", "soul"],
  ["daily", "Midday pause", "12:00", "The Angelus, or one breath and a word.", "soul"],
  ["daily", "Evening examen", "21:30", "Five minutes, in God's presence, before sleep.", "time"],
  ["weekly", "Sunday Mass", "", "Let the week bend around it.", "soul"],
  ["weekly", "The day of rest", "", "One day in which nothing is produced.", "time"],
  ["weekly", "One unhurried hour with someone who knows me", "", "In person, in the calendar.", "heart"],
  ["monthly", "Confession", "", "A date kept, not a crisis.", "soul"],
  ["monthly", "One hour with the figures", "", "What came in, what went out, what was given.", "money"],
  ["yearly", "A retreat, even a short one", "", "Silence, with the phone left behind.", "soul"]
];

/* Companions: other Catholic apps that give the prayers themselves.
   Independent works. Text links only, to each app's own public page. */
IL.COMPANIONS = [
  { id: "laudate", name: "Laudate",
    good: "The readings of the day, common prayers, the rosary and an examination of conscience, in many languages. Free.",
    fields: ["soul", "mind"], anchors: "Morning and midday",
    url: "https://apps.apple.com/us/app/laudate-1-catholic-app/id499428207",
    where: "App Store page. On Android, search your app store for Laudate." },
  { id: "divineoffice", name: "Divine Office",
    good: "The Liturgy of the Hours for each day, with audio you can pray along with.",
    fields: ["soul", "time"], anchors: "Morning, evening and night",
    url: "https://divineoffice.org/", where: "divineoffice.org" },
  { id: "ascension", name: "Ascension",
    good: "The Bible in a Year, the Catechism in a Year, and the daily readings with reflections.",
    fields: ["mind", "soul"], anchors: "Morning, or a fixed reading time",
    url: "https://ascensionpress.com/pages/ascension-app", where: "ascensionpress.com" },
  { id: "hallow", name: "Hallow",
    good: "Guided audio prayer: the rosary, Lectio Divina, and prayer before sleep.",
    fields: ["soul", "body"], anchors: "Any anchor, and the last minutes before sleep",
    url: "https://hallow.com/", where: "hallow.com" }
];

/* Quiet suggestions beside the three anchors on Today. */
IL.ANCHOR_HINTS = {
  morning: [["Morning Prayer", "divineoffice"], ["The readings of the day", "laudate"]],
  midday: [["The readings of the day", "laudate"], ["Today's Bible in a Year", "ascension"]],
  evening: [["Evening Prayer", "divineoffice"], ["Guided prayer before sleep", "hallow"]]
};
