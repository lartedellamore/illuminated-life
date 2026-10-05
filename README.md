# Illuminated Life

A Catholic rule of life across twelve fields of stewardship: a website, the book *Illuminated: The Image of God, Embodied* (59 pages, PDF), and its companion app.

Live: https://lartedellamore.github.io/illuminated-life/

> One Master entrusts one steward with twelve fields in three rings:
> Person (Body, Mind, Soul, Heart), Household (Time, Money, Work, Home), World (Creation, Speech, Beauty and Making, Mission).
> In every field the same four movements take place: **receive, bless, spend, return.**

## What it does

| Screen | What you do there |
| --- | --- |
| **Today** | See the rose window (twelve petals, one per field), your field for the season, and today's practices. Floor mode reduces the day to three lines for hard weeks. |
| **Fields** | Open any of the twelve fields: what it is for, its disorder, questions to examine, the four movements, and a ladder of four rungs. |
| **Rule** | Your floor, your daily, weekly, monthly and yearly practices, your parish and your three people, and the precepts of the Church. Export to your calendar or print as a booklet. |
| **Diary** | Seven things you are grateful for, three you are praying for, one act of service, and where you saw light. Save it as a PDF. The evening Examen lives here too. |
| **More** | The Steward's Model, the season review, the Church's year, the Treasury, prayers, and backup. |

## Design promises

1. It lights and never scores. No points, no streaks.
2. A lit petal records a practice kept. It does not measure grace.
3. It asks about one field at a time.
4. You can always begin again without penalty.
5. It sends you out of itself: to your parish, your confessor, your friends and the poor.
6. Everything stays on your own device. Nothing is sent anywhere. There are no accounts, no analytics and no trackers.

## How it is built

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies. Open `index.html` (the website) or `app.html` (the app) in a browser and it runs.

```
index.html              the website (landing page for the book and the app)
404.html                the page shown for a wrong address
css/site.css            the website's styles
robots.txt, sitemap.xml for search engines
app.html                the app's page shell
css/styles.css          the app's design system (colours, type, components; light and dark)
book/illuminated.pdf    the book (59 pages)
assets/                 cover, screenshots and the share image (og.jpg) used by the website
assets/fonts/           Cormorant Garamond and Inter, hosted here (no Google Fonts)
js/data.js              every word the app says: fields, laws, prayers, verses
js/liturgy.js           the Church's year: Easter, the seasons, the feasts
js/app.js               state, screens and events
sw.js                   offline cache (works once the site is on https)
manifest.webmanifest    lets a phone install it to the home screen
icons/                  the rose window icon (icon.svg, and PNGs at 32, 180, 192 and 512 pixels)
docs/BRIDGE.md          how each chapter of the book becomes a screen
```

To change the wording, edit `js/data.js`. You do not need to touch the logic.

## Put it online with GitHub Pages

1. Create a new repository on GitHub (for example `illuminated-life`).
2. Upload everything in this folder, or push it:
   ```
   git remote add origin https://github.com/YOUR-NAME/illuminated-life.git
   git push -u origin main
   ```
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the app is live at `https://YOUR-NAME.github.io/illuminated-life/`.
5. On a phone, open that address and choose **Add to Home Screen**.

When you publish changes later, raise the `VERSION` in `sw.js` so installed phones pick up the update.

## Companions

The app links out to the prayer apps people already use: Laudate, Divine Office, Ascension and Hallow. These are independent works. Illuminated Life is not affiliated with them.

## Where your data lives

In the browser's local storage, on the device you use. Clearing browser data erases it, so use **More → Keep my words safe** to save a backup file. A backup can be restored on another device.

## Theology and authority

The app follows Sacred Scripture and the Catechism of the Catholic Church, and Catechism paragraph numbers are shown so each claim can be checked. It is a private work of formation, not an official text of the Church. It carries no imprimatur. The text awaits review by a priest, and it is submitted to the Church's judgement. The liturgical calendar is a simplified general Roman calendar; local calendars differ.

The app is not a spiritual director, a confessor or a diagnosis.

## Rights

© Wietske Hoencamp. All rights reserved unless a licence is added here.
