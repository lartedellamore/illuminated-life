/* Illuminated Life · diary photographs
   Where the photographs are kept, and how they are made ready. Nothing here draws a screen.
   They are too large for localStorage, so they live in IndexedDB, in this browser only:
     database "illuminated-life-photos", one store "photos", keyed by the photograph's id.
     value: { id, day: "YYYY-MM-DD", blob, thumb, w, h, type: "image/jpeg", created }
   The saved state holds only the ordered list of { id, caption } for each day (see normalise in js/app.js).
   Every photograph is drawn onto a canvas, made smaller, and written out again as a JPEG.
   That also removes what the camera wrote into the file, such as the place it was taken.
   Every call returns a promise. None of them touches the saved state. */

(function () {
  "use strict";
  const IL = (window.IL = window.IL || {});
  const DB = "illuminated-life-photos", STORE = "photos";
  const MAX_SIDE = 1600, THUMB_SIDE = 480, QUALITY = 0.82;
  const MAX_FILE = 80 * 1024 * 1024;     // a file from a camera or a library, before it is made smaller
  const MAX_DATA = 12 * 1024 * 1024;     // one photograph inside a backup, as text
  const ID = /^[a-z0-9]{6,24}$/;
  const fail = (code) => { const e = new Error(code); e.code = code; return e; };

  /* ───────── the database ───────── */
  let opening = null;
  // Resolves the open database, or null when this browser window cannot keep photographs.
  function open() {
    if (opening) return opening;
    opening = new Promise((resolve) => {
      let done = false; const end = (db) => { if (!done) { done = true; resolve(db); } };
      try {
        if (!window.indexedDB) return end(null);
        const req = window.indexedDB.open(DB, 1);
        req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" }); };
        req.onsuccess = () => { const db = req.result; db.onversionchange = () => { try { db.close(); } catch (e) { /* already closed */ } }; end(db); };
        req.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); end(null); };
        req.onblocked = () => end(null);
        setTimeout(() => end(null), 5000); // a browser that never answers counts as one that cannot
      } catch (e) { end(null); }
    });
    return opening;
  }
  // One transaction. work(store) may return a function; its value is the answer once the transaction has completed.
  function tx(mode, work) {
    return open().then((db) => new Promise((resolve, reject) => {
      if (!db) return reject(fail("unavailable"));
      let t, read = null;
      try { t = db.transaction(STORE, mode); } catch (e) { return reject(e); }
      t.oncomplete = () => resolve(read ? read() : undefined);
      t.onabort = () => reject(t.error || fail("aborted"));
      try { read = work(t.objectStore(STORE)) || null; } catch (e) { try { t.abort(); } catch (e2) { /* already over */ } reject(e); }
    }));
  }
  // Can a photograph really be written here? Some private windows open the database and then refuse the file.
  let checked = null;
  function ready() {
    if (!checked) checked = tx("readwrite", (s) => { s.put({ id: "-probe", blob: new Blob(["x"], { type: "text/plain" }), created: 0 }); s.delete("-probe"); }).then(() => true, () => false);
    return checked;
  }
  // All of them or none of them: one transaction.
  const putAll = (records) => (records.length ? tx("readwrite", (s) => { records.forEach((r) => s.put(r)); }) : Promise.resolve());
  const getMany = (ids) => (ids.length ? tx("readonly", (s) => { const out = new Array(ids.length); ids.forEach((id, i) => { const r = s.get(id); r.onsuccess = () => { out[i] = r.result || null; }; }); return () => out; }) : Promise.resolve([]));
  const get = (id) => getMany([id]).then((a) => a[0]);
  const remove = (ids) => (ids.length ? tx("readwrite", (s) => { ids.forEach((id) => s.delete(id)); }) : Promise.resolve());
  const clear = () => tx("readwrite", (s) => { s.clear(); });
  // What is kept, without the pictures themselves: [{ id, day, created, bytes }].
  const list = () => tx("readonly", (s) => {
    const out = [], req = s.openCursor();
    req.onsuccess = () => { const c = req.result; if (!c) return; const v = c.value || {};
      out.push({ id: String(c.key), day: v.day, created: v.created, bytes: (v.blob && v.blob.size) || 0 }); c.continue(); };
    return () => out;
  });
  const isQuota = (e) => !!e && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22 || e.code === 1014);

  /* ───────── making a photograph ready ───────── */
  const looksLikeImage = (f) => !!f && (f.type ? /^image\//.test(f.type) && f.type !== "image/svg+xml" : /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp|tiff?)$/i.test(f.name || ""));
  // The picture as something a canvas can draw, turned the right way up (the camera's orientation note is applied).
  function viaElement(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob), img = new Image();
      const done = () => URL.revokeObjectURL(url);
      img.onload = () => (img.naturalWidth && img.naturalHeight ? resolve({ src: img, w: img.naturalWidth, h: img.naturalHeight, close: done }) : (done(), reject(fail("unreadable"))));
      img.onerror = () => { done(); reject(fail("unreadable")); };
      img.src = url;
    });
  }
  async function decode(blob) {
    const fromBitmap = (b) => ({ src: b, w: b.width, h: b.height, close: () => { try { b.close(); } catch (e) { /* older browsers */ } } });
    if (window.createImageBitmap) { try { return fromBitmap(await window.createImageBitmap(blob, { imageOrientation: "from-image" })); } catch (e) { /* try the next way */ } }
    try { return await viaElement(blob); } catch (e) { /* try the last way */ }
    if (window.createImageBitmap) { try { return fromBitmap(await window.createImageBitmap(blob)); } catch (e) { /* it cannot be read */ } }
    throw fail("unreadable");
  }
  function draw(src, sw, sh, side) {
    const k = Math.min(1, side / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); if (!g) throw fail("unreadable");
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); // a see-through picture gets white paper behind it
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(src, 0, 0, w, h);
    return c;
  }
  const toJpeg = (canvas, q) => new Promise((resolve, reject) => {
    try { canvas.toBlob((b) => (b && b.type === "image/jpeg" && b.size > 0 ? resolve(b) : reject(fail("unreadable"))), "image/jpeg", q); } catch (e) { reject(fail("unreadable")); }
  });
  // file: a File or a Blob. Resolves { blob, thumb, w, h }: a JPEG of at most 1600 pixels on its long side, and a small one for the grid.
  // opts.keep: a JPEG that is already small enough is kept as it is (used when a backup is restored, so that it does not fade with each round).
  async function process(file, opts) {
    if (!file || !(file instanceof Blob) || !file.size || file.size > MAX_FILE) throw fail("unreadable");
    const pic = await decode(file);
    try {
      if (!(pic.w > 0 && pic.h > 0)) throw fail("unreadable");
      const keep = !!(opts && opts.keep) && file.type === "image/jpeg" && Math.max(pic.w, pic.h) <= MAX_SIDE;
      const big = draw(pic.src, pic.w, pic.h, MAX_SIDE);
      const blob = keep ? file : await toJpeg(big, QUALITY);
      const thumb = await toJpeg(draw(big, big.width, big.height, THUMB_SIDE), 0.8);
      return { blob, thumb, w: big.width, h: big.height };
    } finally { pic.close(); }
  }

  /* ───────── photographs inside a backup file ───────── */
  const toDataURL = (blob) => new Promise((resolve, reject) => {
    const fr = new FileReader(); fr.onload = () => resolve(String(fr.result)); fr.onerror = () => reject(fail("unreadable")); fr.readAsDataURL(blob);
  });
  // Only a JPEG, PNG or WebP written as base64 is accepted, of a sane size, and only if its first bytes agree with its label.
  // The result is a Blob of bytes. Nothing from the text is ever put into the page.
  function fromDataURL(text) {
    if (typeof text !== "string" || text.length < 64 || text.length > MAX_DATA) throw fail("unreadable");
    const m = /^data:image\/(jpeg|png|webp);base64,/.exec(text.slice(0, 32)); if (!m) throw fail("unreadable");
    const b64 = text.slice(m[0].length); if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw fail("unreadable");
    let bin; try { bin = atob(b64); } catch (e) { throw fail("unreadable"); }
    const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const at = (i, s) => s.split("").every((ch, k) => bytes[i + k] === ch.charCodeAt(0));
    const okay = m[1] === "jpeg" ? bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
      : m[1] === "png" ? bytes[0] === 0x89 && at(1, "PNG") : at(0, "RIFF") && at(8, "WEBP");
    if (!okay) throw fail("unreadable");
    return new Blob([bytes], { type: "image/" + m[1] });
  }
  const newId = () => { let s = "p"; while (s.length < 14) s += Math.random().toString(36).slice(2); return s.slice(0, 14); };

  IL.photos = { ID, PER_DAY: 10, MAX_SIDE, ready, putAll, get, getMany, remove, clear, list, isQuota, looksLikeImage, process, toDataURL, fromDataURL, newId };
})();
