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

## Current state (2026-07-17)
Done & user-verified: git + relocate; device-agnostic fetch loader + PWA; Firebase
anonymous + Google auth; cross-device sync; quiz-attempt persistence; live flashcard
sync. All four original goals met (any-device access, cross-device flashcards,
Claude can still author locally, in-browser code execution preserved).

**Phase 3 Stage 3a — per-user profile store + lesson-answer sync (DONE & USER-VERIFIED
2026-07-17, commit 7cfccea):** new in-memory `profile` (localStorage `study-tool-profile-v1` +
cloud `/users/$uid/profile`), holding `lessonAnswers[lessonId][exerciseId] = code`.
Mirrors the quiz-attempts pattern: synced on sign-in (`cloud.loadProfile`) + debounced
push (`scheduleProfileSync`/`pushProfile`), NOT a live listener (so a remote change
can't re-render a lesson mid-typing). `lessonAnswers` is stored as a JSON **string** —
lesson ids (`lesson-1.2`) and exercise ids (`1.2-e1`) contain `.`, which RTDB forbids
in keys (same reason attempts are stringified). Textarea `blur` → `setLessonAnswer()`;
`hydrateLessonAnswers()` copies stored answers onto lesson objects before render.
Verified: node --check clean; REST roundtrip with real dotted ids; cross-user read
401-denied; USER-VERIFIED cross-device (typed a lesson answer on laptop, saw it on
phone after reload). SW bumped v3→v4. (Deploy gotcha hit once: the Pages build for
7cfccea hung ~15 min then errored — GitHub-side, not the code; `gh api -X POST
repos/.../pages/builds` requeued it and it built. Watch for stuck Pages builds.)

**Phase 3 Stage 3b — live progress bar from global tree + per-user overlay (DONE &
USER-VERIFIED 2026-07-17, commit e600a25):** curriculum skeleton (structure only, 7 phases / 61 chapters)
extracted into repo-committed **`curriculum.json`** (regenerate from private/SYLLABUS.md
when chapters change — same spirit as gen_manifest). Per-user completion is the overlay
`profile.progress[chapterId] = {done}`, stored stringified in the cloud profile (chapter
ids contain '.'). Progress bar now renders from `buildCurriculumItems()` (global tree +
overlay merged) so it works on EVERY device — the old bar read SYLLABUS.md, which isn't
deployed. Author-mode bridge: connecting the local folder parses SYLLABUS.md (now found in
`private/`, with root fallback) and folds checkbox state into the synced overlay via
`seedProgressFromSyllabus()` (NON-destructive — seeds only chapters absent from the
overlay, so it migrates initial state once but never clobbers an in-app toggle).
**In-app toggle (folded in from 3c per user request):** clicking the header progress bar
opens `openCurriculumPanel()` — a modal of phases/chapters with checkboxes; toggling calls
`setChapterDone()` → overlay → syncs to every device incl. phone (no author mode / no
SYLLABUS.md needed). This is now the primary way to set progress; SYLLABUS.md is just the
one-time seed + notes. `curriculum.json` added to SW precache; SW bumped v4→v5.
Verified: node --check; curriculum.json structure-only; merge logic (Erika's 1.1–1.5 done
maps correctly, 7 phase-start dots, no orphan ids); REST roundtrip of stringified progress;
toggle-vs-reseed logic (re-seed does not revert a toggle). USER-VERIFIED cross-device:
checked 1.1–1.5 in the in-app panel (left 1.3.5 unchecked), bar filled and synced to phone.

**Phase 3 Stage 3c — IN PROGRESS (systematic sweep of remaining profile/curriculum items).**
- **Known/unknown mastery per chapter (code done, awaiting UI-verify):** the curriculum
  overlay `profile.progress[id]` went from `{done:bool}` to `{status}` where status ∈
  known/learning/none. `normalizeProgress()` migrates legacy `{done}` (idempotent; runs on
  local load + after cloud merge). Panel rows now have a Learning/Known segmented control
  (click active → clears to none); header dots render green=known, amber=learning; label =
  "known/total". `setChapterStatus()` replaces setChapterDone; author-mode seed marks only
  checked chapters "known" (non-destructive). SW v5→v6. Verified: node --check + logic test
  (migration, set/clear, seed-known-only vs cleared).

- **Study log + notes (code done, awaiting UI-verify):** `profile.sessionLog` (array of
  `{id,date,lesson,topics,problems,notes}`) + `profile.notes` (`{goal,currentStatus,
  troubleAreas,strengths}` free text), both stringified in the cloud profile. New "Log"
  header button → `openStudyLog()` modal: editable note textareas (save on blur) + a
  session-log list you can add to / delete from on any device. Author-mode seeds both from
  private/SYLLABUS.md (`parseSyllabusNotesAndLog` → `seedNotesFromSyllabus`, non-destructive;
  session-log ids are STABLE "syl-N" so re-seeding on a 2nd author device dedupes via the
  union-by-id cloud merge). Notes merge remote-wins-per-field; sessionLog unions by id.
  SW v6→v7. Verified: node --check; parser vs real SYLLABUS.md (11 entries, 4 note sections,
  no leaked header rows); dedup logic; REST roundtrip of sessionLog+notes.

## What's next (remaining 3c sweep, tasks tracked in the session task list)
- Review queue (SRS concept queue) in-app.
- Overlay+patch tree editing (insert/reorder/skip) + `treeMode` custom-mode escape hatch.
- Versioned global-update review flow.
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
  users. Currently `v7`.
- **Browser test MCPs are unreliable here** (Preview/Chrome disconnect; the in-app
  Browser pane blocks localhost). Verify instead via: `node --check` on the extracted
  inline JS for syntax; the Firebase REST API for data/security paths (identitytoolkit
  `accounts:signUp` for an anon token, then RTDB `<db>/<path>.json?auth=<idToken>`);
  and hand interactive/signed-in UI flows to the user to verify.
- Local dev: `python3 -m http.server` from the repo root (must be http, not file://).
- Deeper design rationale + full build history live in Claude's auto-memory
  (`MEMORY.md` → `architecture-direction.md`, `data-model-global-vs-peruser.md`).
