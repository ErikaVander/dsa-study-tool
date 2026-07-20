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

## Global vs per-user (the data-model split)
See **[GLOBAL_LAYER.md](GLOBAL_LAYER.md)** — the all-users layer: mission, curriculum skeleton,
SRS algorithm, pedagogy/authoring methodology, and the **seed content** (global sample = the
**Big O** 1.1 lesson + `bigo-recognition` quiz + `bigo-*` flashcards, cloned per user on signup).
Everything is global-by-default, per-user-overridable; the per-user Firebase profile IS that
user's memory. **Seed-clone DONE (v12, USER-VERIFIED no-regression 2026-07-20 — content loads
identically after 2 reloads; note "identical" can't distinguish clone-populated from fail-safe
fallback, so confirm the content node populated before the trim below).** Per-user content
storage now exists at `/users/$uid/content`
(stringified `{lessons,quizzes}` maps) — on a fresh account `cloud.loadContent()` clones the
currently-loaded repo content into the user's space, then merges their copy over the repo
baseline (fail-safe: repo content stays on any error; skipped in author mode). Flashcards were
already per-user via `/state`. REMAINING: the repo still ships the creator's full content as the
clone source; **trim the repo to just the Big O seed** so NEW accounts clone only the sample
(safe to do once existing users have cloned — don't do it before, it'd break their live access).

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

- **Review queue / SRS concept queue (code done, awaiting UI-verify):** `profile.reviewQueue`
  (`[{id,concept,added,lastReviewed,interval,nextReview,status}]`, session-number based) +
  `profile.currentSession`. New "Review" header button → `openReviewQueue()`: due items
  (interval<16 and nextReview≤currentSession) float to top, Nailed doubles interval (cap 16 =
  "locked in"), Struggled resets to 1; session +/- stepper; add/remove concepts. Author-mode
  seeds from the SYLLABUS.md Review Queue table (`parseSyllabusReviewQueue`, stable "rq-N" ids,
  seeds currentSession = max(lastReviewed/added)+1). Cloud: reviewQueue stringified + unioned
  by id; currentSession = max(local,remote). SW v7→v8. Verified: node --check; parser vs real
  SYLLABUS.md (45 items, currentSession→11); SRS transitions (2→4, 8→16, 16 cap, struggle→1);
  REST roundtrip. NOTE: this is distinct from the flashcard `state.reviewQueue` (card-id queue).

- **Overlay+patch tree editing + custom mode (code done, awaiting UI-verify):** the effective
  curriculum = base tree + `profile.treeOverlay` `{added:[{id,title,phaseId,afterId}], hidden,
  renamed, order:{phaseId:[ids]}}`, resolved by `resolveCurriculumPhases(includeHidden)`.
  `buildCurriculumItems()` renders from it (hidden filtered out). Curriculum panel gained an
  "Edit structure" toggle: per-chapter move ↑/↓, rename, skip/hide, delete-custom, and
  "+ Add chapter" per phase. Mode switch: "Customize fully" (`forkCurriculumToCustom` snapshots
  the resolved tree into `profile.customTree`, clears the overlay, sets `treeMode:"custom"` so
  global updates no longer merge) / "Revert to standard" (`revertCurriculumToStandard` clears
  both). Overlay applies on top of the custom base too, so all edit ops share one code path.
  Cloud: treeOverlay (added unioned by id, sub-objects merged) + treeMode + customTree, all
  stringified. SW v8→v9. Verified: node --check; full logic test (add/hide/rename/reorder,
  fork bakes+clears, edit-in-custom, revert restores 3-chapter base); REST roundtrip.

- **Versioned global-update review flow (code done, awaiting UI-verify):** `curriculum.json`
  now carries a `version` (bump it whenever the tree changes). `checkCurriculumUpdate()` runs
  after cloud profile load (or in bootstrap when cloud is off): if `version` > profile.
  seenCurriculumVersion, users with NO structural customization auto-inherit silently; users
  who customized get `openCurriculumUpdateReview()` — a scoped modal showing only the changes
  that touch their customizations (rename-conflict, orphaned hide/anchor, or a whole-tree note
  in custom mode) with Keep mine / Merge / Take new + an "always do this" standing policy
  (`profile.curriculumUpdatePolicy`). First-ever load stores a baseline snapshot silently (no
  prompt). Merge = keep overlay but let global win on co-changed renames and drop refs to
  removed chapters. Cloud syncs seenCurriculumVersion (max), policy, and snapshot. SW v9→v10.
  Verified: node --check; 8-case decision test (auto/prompt/policy/baseline/seen/merge); REST
  roundtrip. NOTE: bumping `version` in curriculum.json is manual — do it on any tree change.

**Phase 3 Stage 3c — hardening pass (commit after independent adversarial review, SW v10→v11).**
Independent review of the full 3c diff found the code sound (no crashes/hoisting/off-by-one/
logic bugs). Fixes applied: (1) **profile data-loss** — the whole profile is one node written
via `.set()`, so a 2nd device's concurrent additions could be clobbered. `pushProfile()` now
does read→union→write: `unionRemoteIntoLocal()` folds in remote-only additions (union arrays by
id, add missing object keys; LOCAL wins on true conflicts; counters take max) before the set.
Residual race is ms (read→write) vs. a whole session. (2) responsive header `@media(max-width:760px)`
— wraps + drops the progress bar to its own row (the new Log/Review buttons crowded mobile).
(3) `loadProfile` wrapped in try/`finally` so the SHARED `_applying` sync guard can't wedge on a
mid-merge throw. (4) `checkCurriculumUpdate` re-checks on Google account switch. (5) `cloud.init`
guarded against double-registering the auth listener when `bootstrap()` re-runs on deck import.
(6) SRS review status string simplified. (7) `.cp-row.learning` CSS. Verified: node --check +
union-merge logic test (reviewer's X/Y scenario: both survive; local-wins-on-conflict; null-safe).

## Author-ahead ritual (Phase 4) — STANDING OPERATING INSTRUCTION (applies to EVERY user)
This is a permanent workflow, not a one-off: in ANY session where Claude authors for a user,
at the END of the session Claude prepares the NEXT session's material so that user never
starts blank. It holds for every user of this app who uses the Claude-authoring path, not
just the creator. Keep the buffer exactly ONE lesson ahead of the user's next-to-study —
don't jump further. Steps:
1. **Retro** — ask what went well / what didn't / what to change; write it into that user's
   profile data (session log, notes, review queue) AND, in author mode, into their
   SYLLABUS.md (the source that seeds the cloud profile).
2. Ask **once**: "Build your next lesson + quiz now?" (skip if the next lesson is already
   buffered).
3. If yes → author the next lesson + its review quiz (+ any flashcards) immediately.
   A pre-built lesson persists; if it later feels too advanced, leave it queued and author a
   remedial recall quiz/lesson as a side-branch instead.
4. **Standing consent** (ask once per user, then remember the preference): yes = author future
   sessions seamlessly; no = author ahead but the user approves each write.

**Hard authoring rules (universal):** (a) BEFORE writing, ask "do you already know
<concept>?" — if yes, the lesson body is a syntax/idioms toolkit in COLLAPSIBLE sections,
concept ≈ 0 (for a user whose gap is code production, not concepts); a genuine algorithm topic
still gets real concept teaching. (b) NEVER full-`Write` a lesson file — use targeted Edits;
a full rewrite once clobbered saved answers. (c) Quiz questions need `explanation` (worked
example w/ real values), `visual` (small ASCII), `cardBack`; code questions need
`starter`/`tests`/`testSetup`. (d) Keep review quizzes SEPARATE (Quizzes tab). Full global
methodology/pedagogy/schemas now live in the repo at **[GLOBAL_LAYER.md](GLOBAL_LAYER.md)**
(migrated out of the creator's private Claude memory so it's portable to all users).

Per-user "what's the next lesson" is NOT tracked here — it's derived per user from their
SYLLABUS.md / profile at session time.

## What's next
- Phase 3 Stage 3c is CODE-COMPLETE + hardened; needs interactive UI-verify pass.
- Phase 5 global-update review system (partly done in 3c); Phase 6 onboarding playbook
  (so others can self-host); Phase 7 donations; Phase 8 email/newsletter.
- Cleanup: purge throwaway anonymous users created during sign-in testing.

## Gotchas & conventions
- **Never call `signInAnonymously()` unconditionally at startup** — only from the
  `onAuthStateChanged` `!user` branch. Otherwise it races with restoring a persisted
  Google session and clobbers it (drops users to anonymous on every reload).
- **Bump `VERSION` in `sw.js` on every deploy that must propagate.** The service
  worker caches stale-while-revalidate, so otherwise changes need ~2 reloads to reach
  users. Currently `v12`.
- **Browser test MCPs are unreliable here** (Preview/Chrome disconnect; the in-app
  Browser pane blocks localhost). Verify instead via: `node --check` on the extracted
  inline JS for syntax; the Firebase REST API for data/security paths (identitytoolkit
  `accounts:signUp` for an anon token, then RTDB `<db>/<path>.json?auth=<idToken>`);
  and hand interactive/signed-in UI flows to the user to verify.
- Local dev: `python3 -m http.server` from the repo root (must be http, not file://).
- Deeper design rationale + full build history live in Claude's auto-memory
  (`MEMORY.md` → `architecture-direction.md`, `data-model-global-vs-peruser.md`).
