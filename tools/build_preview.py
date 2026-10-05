#!/usr/bin/env python3
"""Build preview/illuminated-life.html: the whole app in one file.

Run from anywhere:  python3 tools/build_preview.py

It reads app.html, inlines the local stylesheet and scripts, and writes only
what belongs inside a page body (no doctype, html, head or body tags), because
the preview host wraps it. window.IL_HOST = "preview" is set before the
scripts, and the service worker block (between sw:start and sw:end in
js/app.js) is left out.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "app.html").read_text(encoding="utf-8")

title = re.search(r"<title>.*?</title>", html, re.S).group(0)
styles, fonts = [], []
for tag in re.findall(r"<link\b[^>]*>", html):
    if 'rel="stylesheet"' not in tag:
        continue
    href = re.search(r'href="([^"]+)"', tag).group(1)
    if re.match(r"https?://", href):
        fonts.append(tag)
    else:
        styles.append((ROOT / href).read_text(encoding="utf-8"))

scripts = []
for src in re.findall(r'<script\s+src="([^"]+)"\s*>\s*</script>', html):
    js = (ROOT / src).read_text(encoding="utf-8")
    js = re.sub(r"[ \t]*/\* sw:start \*/.*?/\* sw:end \*/\n?", "", js, flags=re.S)
    scripts.append(js.replace("</script", "<\\/script"))

out = "\n".join(
    [title, *fonts, "<style>", *styles, "</style>", '<div id="app"></div>',
     '<script>window.IL_HOST = "preview";</script>', "<script>", *scripts, "</script>", ""]
)
assert "serviceWorker" not in out, "the service worker block was not removed"
dest = ROOT / "preview" / "illuminated-life.html"
dest.parent.mkdir(exist_ok=True)
dest.write_text(out, encoding="utf-8")
print(f"wrote {dest.relative_to(ROOT)} ({len(out.encode('utf-8'))} bytes)")
