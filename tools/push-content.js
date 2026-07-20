#!/usr/bin/env node
/**
 * Push content straight into a user's Realtime DB (Admin SDK) — no in-app import.
 *   --flashcards <deck.json|dir>  → merged into /users/<uid>/state  (cards + categories by id)
 *   --lessons    <file|dir>       → merged into /users/<uid>/content (lessons map by id)
 *   --quizzes    <file|dir>       → merged into /users/<uid>/content (quizzes map by id)
 *
 * Merges (never clobbers existing items), backs up the node first, and supports --dry-run.
 * --uid is auto-detected if there's exactly one real (non-anonymous) account.
 * The service-account key stays a local file (tools/service-account.json); never printed/committed.
 *
 * Examples:
 *   node tools/push-content.js --flashcards private/interview-prep/qa-flashcards.json --dry-run
 *   node tools/push-content.js --lessons private/interview-prep/qa-fundamentals.json
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase, ServerValue } = require("firebase-admin/database");

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const DRY = argv.includes("--dry-run");
let UID = flag("--uid");
const FLASH = flag("--flashcards"), LESSONS = flag("--lessons"), QUIZZES = flag("--quizzes");
if (!FLASH && !LESSONS && !QUIZZES) { console.error("Nothing to push. Use --flashcards / --lessons / --quizzes."); process.exit(1); }

const sa = require(path.join(__dirname, "service-account.json"));
initializeApp({ credential: cert(sa), databaseURL: "https://dsa-study-tool-default-rtdb.firebaseio.com" });
const db = getDatabase();

function collect(p, kind) {
  if (!p) return [];
  const full = path.resolve(p);
  const files = fs.statSync(full).isDirectory()
    ? fs.readdirSync(full).filter((f) => f.endsWith(".json")).map((f) => path.join(full, f))
    : [full];
  return files
    .filter((f) => (kind === "quiz" ? /quiz/i.test(path.basename(f)) : kind === "lesson" ? !/quiz/i.test(path.basename(f)) : true))
    .map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
}
const parseMap = (s) => { try { return typeof s === "string" ? JSON.parse(s) : (s || {}); } catch (e) { return {}; } };
const byId = (arr) => { const m = {}; (arr || []).forEach((x) => { if (x && x.id) m[x.id] = x; }); return m; };

(async () => {
  if (!UID) {
    const users = [];
    let t; do { const r = await getAuth().listUsers(1000, t); users.push(...r.users); t = r.pageToken; } while (t);
    const real = users.filter((u) => (u.providerData && u.providerData.length) || u.email);
    if (real.length !== 1) { console.error(`Could not auto-pick uid (${real.length} real accounts). Pass --uid.`); process.exit(1); }
    UID = real[0].uid;
    console.log(`auto-detected uid: ${UID} (${real[0].email})`);
  }

  const log = [];

  // ----- flashcards -> /state (merge cards + categories by id) -----
  if (FLASH) {
    const decks = collect(FLASH, "any");
    const ref = db.ref(`users/${UID}/state`);
    const state = (await ref.once("value")).val() || {};
    const cards = byId(state.cards), cats = byId(state.categories);
    let addedC = 0, addedK = 0;
    decks.forEach((d) => {
      (d.categories || []).forEach((c) => { if (c.id && !cats[c.id]) { cats[c.id] = c; addedK++; } });
      (d.cards || []).forEach((c) => { if (c.id && !cards[c.id]) { cards[c.id] = c; addedC++; } });
    });
    log.push({ kind: "flashcards", node: "state", added: `${addedC} cards, ${addedK} categories`,
      write: async () => {
        const backup = path.join(__dirname, `content-backup-${UID.slice(0, 6)}-state.json`);
        fs.writeFileSync(backup, JSON.stringify(state, null, 2));
        await ref.set({ ...state, categories: Object.values(cats), cards: Object.values(cards),
          reviewQueue: state.reviewQueue || [], writerId: "admin-push", updatedAt: ServerValue.TIMESTAMP });
      } });
  }

  // ----- lessons / quizzes -> /content (merge maps by id) -----
  if (LESSONS || QUIZZES) {
    const ref = db.ref(`users/${UID}/content`);
    const content = (await ref.once("value")).val() || {};
    const lessons = parseMap(content.lessons), quizzes = parseMap(content.quizzes);
    const addedL = [], addedQ = [];
    collect(LESSONS, "lesson").forEach((d) => { if (d.id) { addedL.push(d.id + (lessons[d.id] ? " (overwrite)" : "")); lessons[d.id] = d; } });
    collect(QUIZZES, "quiz").forEach((d) => { if (d.id) { addedQ.push(d.id + (quizzes[d.id] ? " (overwrite)" : "")); quizzes[d.id] = d; } });
    log.push({ kind: "content", node: "content", added: `lessons [${addedL.join(", ") || "-"}], quizzes [${addedQ.join(", ") || "-"}]`,
      write: async () => {
        const backup = path.join(__dirname, `content-backup-${UID.slice(0, 6)}-content.json`);
        fs.writeFileSync(backup, JSON.stringify(content, null, 2));
        await ref.set({ schemaVersion: content.schemaVersion || 1, updatedAt: ServerValue.TIMESTAMP,
          lessons: JSON.stringify(lessons), quizzes: JSON.stringify(quizzes) });
      } });
  }

  console.log(`\n${DRY ? "DRY RUN" : "WRITE"} — user ${UID}`);
  log.forEach((l) => console.log(`  ${l.kind} -> /${l.node}: ${l.added}`));
  if (DRY) { console.log("\n(dry run — nothing written)\n"); process.exit(0); }
  for (const l of log) await l.write();
  console.log("\n✓ written (node backed up first). Flashcards appear live; lessons on reload.\n");
  process.exit(0);
})().catch((e) => { console.error("Push failed:", e.message); process.exit(1); });
