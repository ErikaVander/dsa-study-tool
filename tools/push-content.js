#!/usr/bin/env node
/**
 * Push lesson/quiz CONTENT straight into a user's Realtime DB node (/users/<uid>/content),
 * using the Admin SDK (bypasses client auth rules). This is how a lesson gets onto YOUR
 * account without an in-app import — you author the JSON, run this, reload the app.
 *
 * It MERGES: existing lessons/quizzes in your content node are preserved; a new item with the
 * same id overwrites that one item only. It also backs up your current content to a local file
 * before writing, and supports a dry run.
 *
 * Setup: same service-account.json as tools/purge-anon-users.js (gitignored).
 *   cd tools && npm install firebase-admin    # if not already
 *
 * Usage:
 *   node tools/push-content.js --uid <YOUR_UID> --lessons ../private/interview-prep --dry-run
 *   node tools/push-content.js --uid <YOUR_UID> --lessons ../private/interview-prep/qa-fundamentals.json
 *   node tools/push-content.js --uid <YOUR_UID> --quizzes ../private/interview-prep/qa-quiz.json
 * Flags:
 *   --uid <uid>        REQUIRED. Your Firebase uid (Auth tab, or the console DB path).
 *   --lessons <path>   A lesson .json file, or a directory of them (any *.json not named *quiz*).
 *   --quizzes <path>   A quiz .json file, or a directory of them.
 *   --dry-run          Show what would change; write nothing.
 *
 * Find your uid: Firebase console -> Authentication -> your Google row -> User UID.
 */

"use strict";
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const argv = process.argv.slice(2);
const getFlag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const UID = getFlag("--uid");
const LESSONS = getFlag("--lessons");
const QUIZZES = getFlag("--quizzes");
const DRY = argv.includes("--dry-run");

if (!UID) { console.error("Missing --uid <YOUR_UID>. Find it in Firebase console -> Authentication."); process.exit(1); }
if (!LESSONS && !QUIZZES) { console.error("Nothing to push. Pass --lessons and/or --quizzes."); process.exit(1); }

const SERVICE_ACCOUNT = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, "service-account.json");
const DATABASE_URL = "https://dsa-study-tool-default-rtdb.firebaseio.com";
let serviceAccount;
try { serviceAccount = require(SERVICE_ACCOUNT); }
catch (e) { console.error(`Could not load service account at ${SERVICE_ACCOUNT}. See tools/purge-anon-users.js setup.`); process.exit(1); }

admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: DATABASE_URL });
const db = admin.database();

// Collect JSON files from a file-or-directory path. `kind` filters by filename for dirs.
function collect(p, kind) {
  if (!p) return [];
  const full = path.resolve(p);
  const stat = fs.statSync(full);
  const files = stat.isDirectory()
    ? fs.readdirSync(full).filter((f) => f.endsWith(".json")).map((f) => path.join(full, f))
    : [full];
  return files
    .filter((f) => (kind === "quiz" ? /quiz/i.test(path.basename(f)) : !/quiz/i.test(path.basename(f))))
    .map((f) => ({ file: f, data: JSON.parse(fs.readFileSync(f, "utf8")) }));
}

const parseMap = (s) => { try { return typeof s === "string" ? JSON.parse(s) : (s || {}); } catch (e) { return {}; } };

(async () => {
  const ref = db.ref(`users/${UID}/content`);
  const remote = (await ref.once("value")).val() || {};
  const lessons = parseMap(remote.lessons);
  const quizzes = parseMap(remote.quizzes);
  const before = { lessons: Object.keys(lessons).length, quizzes: Object.keys(quizzes).length };

  const addedL = [], addedQ = [];
  collect(LESSONS, "lesson").forEach(({ file, data }) => {
    if (!data.id) { console.warn(`  skip (no id): ${file}`); return; }
    addedL.push(`${data.id}${lessons[data.id] ? " (overwrite)" : ""}`);
    lessons[data.id] = data;
  });
  collect(QUIZZES, "quiz").forEach(({ file, data }) => {
    if (!data.id) { console.warn(`  skip (no id): ${file}`); return; }
    addedQ.push(`${data.id}${quizzes[data.id] ? " (overwrite)" : ""}`);
    quizzes[data.id] = data;
  });

  console.log(`\nUser ${UID}`);
  console.log(`  content before: ${before.lessons} lessons, ${before.quizzes} quizzes`);
  console.log(`  adding lessons: ${addedL.join(", ") || "(none)"}`);
  console.log(`  adding quizzes: ${addedQ.join(", ") || "(none)"}`);
  console.log(`  content after:  ${Object.keys(lessons).length} lessons, ${Object.keys(quizzes).length} quizzes`);

  if (DRY) { console.log("\nDry run — nothing written.\n"); process.exit(0); }
  if (!addedL.length && !addedQ.length) { console.log("\nNothing to add.\n"); process.exit(0); }

  // Back up current content before writing.
  const backup = path.join(__dirname, `content-backup-${UID.slice(0, 6)}.json`);
  fs.writeFileSync(backup, JSON.stringify(remote, null, 2));
  console.log(`\n  backed up current content -> ${path.relative(process.cwd(), backup)}`);

  await ref.set({
    schemaVersion: remote.schemaVersion || 1,
    updatedAt: admin.database.ServerValue.TIMESTAMP,
    lessons: JSON.stringify(lessons),
    quizzes: JSON.stringify(quizzes),
  });
  console.log("  ✓ written. Reload the app (signed in) to see the new content.\n");
  process.exit(0);
})().catch((e) => { console.error("Error:", e); process.exit(1); });
