# The bridge: from book to app

Every screen is a chapter of *Illuminated: The Image of God, Embodied* (59 pages) in working form.

| In the book | In the app | In the code |
| --- | --- | --- |
| 1. One Light | The rose window on Today | `rose()` in `js/app.js` |
| 2. The Light Made Flesh | Diary → Examen, step 5: sin, wound, limit | `IL.EXAMEN` in `js/data.js` |
| 3. Taken into a Body | Rule: parish, confession, three people | `Rule()`, `state.church` |
| 4. One Steward | The season's field (about ninety days) | `state.focus` |
| 5. The Twelve Fields | Fields | `IL.FIELDS` |
| 6. The Steward's Model | The four movements in each field; More → The Steward's Model | `IL.MOVES`, `IL.RINGS`, `IL.LAWS` |
| 7. The Craft of Change | Rule and Today: fixed times, small practices, the floor | `state.rule`, `state.floor` |
| 8. When the Light Seems to Go Out | Floor mode | `state.floorMode` |
| 10. Build Your Own Illuminated Life | Begin here → Season review → Fields → Rule | `Review()` |
| 6. The Steward's Model (receive, ask, spend, return) | Diary: seven thanks, three prayers, one act of service, where I saw light | `Diary()`, `state.journal` |
| Prayers; the Church's year | More → Prayers; More → The Church's year | `IL.PRAYERS`, `js/liturgy.js` |

## The model in the data

- **Three rings**: Person (I to IV), Household (V to VIII), World (IX to XII).
- **Four movements** in every field: Receive, Bless, Spend, Return. *Spend* can be placed straight into the Rule.
- **Five lights** per field: not yet begun, kindled, shining, burning, radiant. A light records practice. It does not measure grace.
- **Six laws**: grace first; gift before task; the picture of the Master; one field at a time; begin again; the test is love of neighbour.

## Companions

The app links out to the prayer apps people already use (Laudate, Divine Office, Ascension, Hallow). These are independent works, and Illuminated Life is not affiliated with them.

## A note on authority

The book and the app are a private work of formation. They are not an official text of the Church and carry no imprimatur. The text awaits review by a priest and is submitted to the Church's judgement.
