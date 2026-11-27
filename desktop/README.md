# Illuminated Life for Mac and Windows

The web app, wrapped in its own window with Tauri. Nothing in the app itself changes.

- `src-tauri/`: the small wrapper (window size, name, icon).
- `dist/` is made during the build: a copy of the web app from the repository root.

GitHub builds both versions (see `.github/workflows/desktop.yml`). The results are
unsigned trial builds: Mac and Windows will warn that the maker is unknown.
Signing needs an Apple Developer account and a Windows code-signing certificate.
