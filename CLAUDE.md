# DSA Study Tool

Cloud-synced DSA interview-prep study tool: a single-page app (`index.html`) on
GitHub Pages, backed by Firebase, with in-browser Python.

## Where things live
- **Work HERE:** `~/projects/study-tool`. The app was moved out of Google Drive —
  do **not** edit the old Drive copy (`.../My Drive/study-tool`), which is now just a backup.
- **Repo:** https://github.com/ErikaVander/dsa-study-tool (public). **Live:**
  https://erikavander.github.io/dsa-study-tool/ (Pages deploys from `main` root).
- **`private/`** (gitignored): the user's real personal study data — SYLLABUS.md,
  quiz attempts, saved answers. NEVER commit it; it's destined for Firebase, not the repo.

## Architecture
- Static app; lessons/quizzes/flashcards loaded via `fetch()` + `manifest.json`
  (regenerate with `python3 tools/gen_manifest.py` after adding/removing content).
- Python runs client-side via **Pyodide** (background-preloaded; skipped on mobile).
- **PWA:** `manifest.webmanifest`, `sw.js`, `icons/`.
- **Firebase** project `dsa-study-tool`: Anonymous + Google auth, Realtime Database.
  Per-user data at `/users/$uid/`. Security rules in `database.rules.json` (each user
  reads/writes ONLY their own subtree — this is the entire security model).
  `firebase-config.js` holds the public `apiKey` (safe to ship; rules enforce security).
- **Cloud sync** = the `cloud` module in `index.html`: flashcard state at
  `/users/$uid/state` (LIVE-synced via .on listener), quiz attempts at
  `/users/$uid/attempts/$quizId/$attemptId` (stored as JSON strings; synced on reload).

## Current state (2026-07-15)
Done & user-verified: git + relocate; device-agnostic fetch loader + PWA; Firebase
anonymous + Google auth; cross-device sync; quiz-attempt persistence; live flashcard
sync. All four original goals met (any-device access, cross-device flashcards,
Claude can still author locally, in-browser code execution preserved).

## What's next
- **Bigger Phase 3 (data model):** split the global "operating syllabus" from
  per-user profiles; overlay+patch curriculum tree with `treeMode` custom-mode
  escape hatch; move the per-user PROGRESS profile (known/unknown, review queue,
  session log) into the cloud; sync lesson answers.
- Phase 4 author-ahead session workflow; Phase 5 global-update review system;
  Phase 6 onboarding playbook (so others can self-host); Phase 7 donations;
  Phase 8 email/newsletter.
- Cleanup: purge throwaway anonymous users created during sign-in testing.

## Gotchas & conventions
- **Never call `signInAnonymously()` unconditionally at startup** — only from the
  `onAuthStateChanged` `!user` branch. Otherwise it races with restoring a persisted
  Google session and clobbers it (drops users to anonymous on every reload).
- **Bump `VERSION` in `sw.js` on every deploy that must propagate.** The service
  worker caches stale-while-revalidate, so otherwise changes need ~2 reloads to reach
  users. Currently `v3`.
- **Browser test MCPs are unreliable here** (Preview/Chrome disconnect; the in-app
  Browser pane blocks localhost). Verify instead via: `node --check` on the extracted
  inline JS for syntax; the Firebase REST API for data/security paths (identitytoolkit
  `accounts:signUp` for an anon token, then RTDB `<db>/<path>.json?auth=<idToken>`);
  and hand interactive/signed-in UI flows to the user to verify.
- Local dev: `python3 -m http.server` from the repo root (must be http, not file://).
- Deeper design rationale + full build history live in Claude's auto-memory
  (`MEMORY.md` → `architecture-direction.md`, `data-model-global-vs-peruser.md`).
