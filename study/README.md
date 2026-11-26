# Recall Study App

A single-file study app built on the two best-supported study methods: retrieval practice and spaced repetition.

- **Today**: exam countdown, cards due, a three-step session.
- **Recall**: answer from memory, reveal, rate. Cards you know return after 1, 3, 7, 14, 30, 60 and 120 days; cards you miss return in 10 minutes.
- **Cards**: add cards one at a time or paste many as `question | answer` lines.
- **Progress**: predicted versus actual recall, recall by chapter, weakest chapter, streak.

Data is stored in the browser's localStorage on one device. Use the backup on the setup screen to move it.

Open `study/index.html` directly, or serve the repository and visit `/study/`.

## Added

- **Points and levels**, a multiple-choice **sprint** warm-up, and light animations (off when the device asks for reduced motion).
- **Make cards from a PDF**: reads up to 30 pages in the browser and asks Claude to write cards. This only works when the app is opened inside Claude; on a plain web host the option explains that and stays hidden.
