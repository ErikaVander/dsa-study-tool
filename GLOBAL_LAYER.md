# Global layer — shared by ALL users

This file is the study tool's **global layer**: the methodology, pedagogy, algorithm, and
seed content that apply to *every* user of the app. It is committed to the repo (public) and
loaded/followed in every session. It was migrated here from the creator's private Claude
memory so the workflow is portable to anyone who self-hosts or authors with Claude — it no
longer depends on one person's local memory.

**Core data-model rule (settled 2026-06-10): everything is global-by-default, per-user-overridable.**
- **Global layer (this repo):** mission, curriculum tree skeleton (`curriculum.json`), SRS
  algorithm, this methodology/pedagogy, the operating instructions for Claude (`CLAUDE.md`),
  and the **seed content** below.
- **Per-user layer (Firebase `/users/$uid/profile`):** that user's status, session log, SRS
  review queue, trouble areas, strengths, known/unknown, their own lessons/quizzes/flashcards,
  and their individual learning traits. **The per-user profile IS that user's memory** — Claude
  does not keep per-user notes in local memory.
- **On clash, per-user wins** — via the curriculum overlay/patch (`treeOverlay`, `treeMode`)
  and the versioned global-update review flow (a user's patch on a field both overrides it and
  flags "don't auto-update me here").

---

## Seed content (global sample, cloned per user)

Individual lessons/quizzes/flashcards are **per-user, not shared** — on signup, the seed set
below is **cloned into the user's own space** so they can edit/delete it without affecting
anyone else. The seed set is the one canonical example every user starts from.

**Seed set = the Big O sample** (the full-curriculum Path A build is a later phase):
- **Lesson:** `lessons/Lesson_1.1.json` (Big O Notation & Complexity Analysis)
- **Quiz:** `quizzes/bigo-recognition/` (id `quiz-bigo-mc`)
- **Flashcards:** the `bigo-*` concept cards (`bigo-hierarchy`, `bigo-map`, `bigo-n-plus-m`,
  `bigo-rules`, `bigo-recognition`, …)

> **Legacy note:** the repo currently also ships the creator's other lessons/quizzes/flashcards
> (1.2–1.5, 1.3.5, and non-Big-O quizzes/decks). Those are the creator's **per-user** content,
> served from the repo only because per-user *content* storage in Firebase isn't built yet
> (today only flashcard state, quiz attempts, and the profile live per-user in Firebase; lesson
> and quiz **content** is still repo-loaded read-only). When per-user content storage lands,
> only the seed set stays global and the rest moves to each user's space. Do NOT delete the
> creator's content before then — it would break their live access.

---

## SRS algorithm (global)

Spaced-repetition intervals: **1 → 2 → 4 → 8 → 16** (sessions). **Nail it → interval doubles;
struggle → reset to 1.** After 16 it's considered locked in. (Implemented in the app's review
queue: `srsNextInterval`/`reviewItem`, session-number based.)

---

## Pedagogy principles (global method — apply to any user)

- **Recognition ≠ recall.** Weight the user's self-rating over the multiple-choice auto-grade.
  MC-correct + low self-rating = *not learned* (it only tested recognition) → route to
  flashcards/code production. The diagnostic for "do they know it" is whether they can
  *produce the code cold*, not whether the explanation feels familiar.
- **Teach to the gap, not the syllabus.** BEFORE authoring a lesson, ask "do you already know
  <concept>?" If yes, the lesson body is a **syntax/idioms toolkit in collapsible sections**,
  concept ≈ 0 (re-explaining known material wastes time — expertise-reversal effect). A genuine
  *algorithm/problem-solving* exercise still gets a real reasoning rep — don't hand over the
  logic as if it were syntax. *(Whether a given user's gap is syntax vs. concept is a per-user
  trait, recorded in their profile — not assumed globally.)*
- **Worked-example → close → reproduce.** For already-known concepts, put the full worked
  solution in a collapsed `collapsible`; the user studies it, closes it, and reproduces from
  memory (worked-example effect + retrieval practice).
- **Quizzes teach, not just grade.** Every quiz question anchors its explanation in a concrete
  worked example with real values flowing through (abstract definitions don't land). "Show
  answer" explains + visualizes; "+ Flashcard" builds a self-contained card.
- **Prefer reliable grading.** `text` grading is brittle (exact string match) — prefer `mc`
  or `code` with tests. Don't write text questions whose prompt has to spell out the answer
  shape to be answerable (make those `mc`).

---

## Authoring schemas (global)

### Lesson (`lessons/Lesson_<num>.json`)
Fields: `id`, `title`, `date` (sorts lessons; new lesson needs `date` ≥ prior), `summary`,
`sessionNotes`, `intro` (renders as "Key concepts"), `sectionConcepts` (section → concept slug
for flashcards), `body[]`, `testSetup`, `exercises[]`, `reviewItemsAdded[]`, `qa[]`.
- **Body block types:** `prose` (`heading` optional), `code` (`runnable:true` adds a Run
  button), `diagram` (monospace `<pre>`, keep alignment-light), `collapsible`
  (`{heading, open, blocks:[…]}` → `<details>`, collapsed unless `open:true` — use for the
  concept refresher and worked-example sections).
- **Exercises:** `{id, title, prompt, userAnswer, critique, concept, tests[]}`. The "My answer"
  textarea renders only if `userAnswer` is defined — seed code exercises with a stub so the box
  + Pyodide runner appear. `tests[]` are `assert` snippets run after `testSetup` + the user's
  code in a shared namespace. Fill `critique` AFTER the user attempts. `qa[]` =
  `{timestamp, q, a}` appended post-session.
- **⚠️ NEVER overwrite a lesson with a full `Write`** — use targeted `Edit`s on specific
  fields. A full rewrite once clobbered a user's saved answers (their answers live only in that
  file; they save via the lesson's Update button).

### Quiz (`quizzes/<slug>/definition.json`, kept SEPARATE from lessons)
Every question needs, beyond `prompt`/`options`/`correct`/`type`/`concept`:
- `explanation` (REQUIRED) — the *why*, anchored in a concrete worked example (real values).
- `visual` (optional) — a small, alignment-light ASCII diagram (rendered monospace).
- `cardBack` (optional) — a very concise flashcard back (falls back to `explanation`).
- **`code` questions also need** `starter` (function stub prefilled in the editor), `tests`
  (assert snippets), `testSetup` (shared scaffolding: `ListNode`, `to_list`, …). Phrase the
  prompt as a concrete testable function so asserts can check it.

### Flashcards
Cards carry an exact `concept` slug matching the source quiz/lesson `definition.json` slug
(e.g. Big O cards use `bigo-hierarchy`) — don't invent new slugs. Import merges by id (doesn't
replace). See the app's Import/Export and the `flashcard-format` conventions.

---

## Author-ahead ritual (global)

The end-of-session author-ahead workflow is documented as a standing operating instruction in
[CLAUDE.md](CLAUDE.md) ("Author-ahead ritual (Phase 4)"). It is global: it applies to every
user on the Claude-authoring path.
