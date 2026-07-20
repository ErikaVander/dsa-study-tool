#!/usr/bin/env node
/**
 * Purge throwaway ANONYMOUS Firebase Auth users (+ their orphaned /users/<uid> data).
 *
 * Only deletes users with NO linked provider (i.e. anonymous sign-ins). Any account with a
 * real provider — your Google login (providerData contains google.com), email, etc. — is
 * ALWAYS kept, including an account that started anonymous and was later linked to Google
 * (linking adds a provider, so it no longer counts as anonymous). Your real account is safe.
 *
 * SAFETY: dry-run by default — it only reports. Add --delete to actually remove.
 *
 * Setup (one time):
 *   1. Firebase console → Project settings → Service accounts → "Generate new private key".
 *      Save it as tools/service-account.json (already gitignored — never commit it).
 *   2. cd tools && npm init -y && npm install firebase-admin
 *
 * Usage:
 *   node tools/purge-anon-users.js                 # dry run: how many anon users, how many have data
 *   node tools/purge-anon-users.js --delete        # actually delete anon users + their /users data
 *   node tools/purge-anon-users.js --delete --keep-data   # delete the auth users but LEAVE /users data
 *   node tools/purge-anon-users.js --keep <uid>    # never touch this uid (repeatable; extra safety)
 */

"use strict";
const path = require("path");
const admin = require("firebase-admin");

const args = process.argv.slice(2);
const DO_DELETE = args.includes("--delete");
const KEEP_DATA = args.includes("--keep-data");
const KEEP_UIDS = new Set();
args.forEach((a, i) => { if (a === "--keep" && args[i + 1]) KEEP_UIDS.add(args[i + 1]); });

const SERVICE_ACCOUNT = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, "service-account.json");
const DATABASE_URL = "https://dsa-study-tool-default-rtdb.firebaseio.com";

let serviceAccount;
try {
  serviceAccount = require(SERVICE_ACCOUNT);
} catch (e) {
  console.error(`\n✗ Could not load service account key at:\n  ${SERVICE_ACCOUNT}\n\n` +
    `Generate one in Firebase console → Project settings → Service accounts → "Generate new private key",\n` +
    `save it as tools/service-account.json, then: cd tools && npm install firebase-admin\n`);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: DATABASE_URL });
const auth = admin.auth();
const db = admin.database();

// An anonymous user has no linked identity providers.
const isAnonymous = (u) => (!u.providerData || u.providerData.length === 0) && !u.email && !u.phoneNumber;

async function listAllUsers() {
  const users = [];
  let pageToken;
  do {
    const res = await auth.listUsers(1000, pageToken);
    users.push(...res.users);
    pageToken = res.pageToken;
  } while (pageToken);
  return users;
}

async function hasData(uid) {
  const snap = await db.ref(`users/${uid}`).once("value");
  return snap.exists();
}

(async () => {
  console.log(`\nMode: ${DO_DELETE ? "DELETE" : "DRY RUN (no changes — add --delete to remove)"}`);
  const all = await listAllUsers();
  const anon = all.filter((u) => isAnonymous(u) && !KEEP_UIDS.has(u.uid));
  const kept = all.filter((u) => !isAnonymous(u) || KEEP_UIDS.has(u.uid));

  console.log(`\nTotal users: ${all.length}`);
  console.log(`  Kept (real accounts / --keep):  ${kept.length}`);
  kept.forEach((u) => console.log(`     • ${u.uid}  ${u.email || (u.providerData[0] && u.providerData[0].providerId) || "?"}`));
  console.log(`  Anonymous (deletable):          ${anon.length}`);

  // Flag anon users that still hold /users data, so nothing surprising gets removed.
  let withData = 0;
  for (const u of anon) { if (await hasData(u.uid)) withData++; }
  console.log(`     of which still hold /users/<uid> data: ${withData}` +
    (KEEP_DATA ? "  (data will be LEFT in place)" : DO_DELETE ? "  (data WILL be deleted)" : ""));

  if (!DO_DELETE) {
    console.log(`\nDry run only. Re-run with --delete to remove the ${anon.length} anonymous users.\n`);
    process.exit(0);
  }
  if (!anon.length) { console.log("\nNothing to delete.\n"); process.exit(0); }

  // Delete auth users in batches of 1000 (Admin SDK limit), then their RTDB data.
  let deleted = 0;
  for (let i = 0; i < anon.length; i += 1000) {
    const batch = anon.slice(i, i + 1000).map((u) => u.uid);
    const res = await auth.deleteUsers(batch);
    deleted += res.successCount;
    if (res.failureCount) console.warn(`  ${res.failureCount} failed in this batch`);
    if (!KEEP_DATA) {
      for (const uid of batch) { await db.ref(`users/${uid}`).remove().catch(() => {}); }
    }
  }
  console.log(`\n✓ Deleted ${deleted} anonymous users${KEEP_DATA ? "" : " and their /users data"}. Kept ${kept.length} real account(s).\n`);
  process.exit(0);
})().catch((e) => { console.error("Error:", e); process.exit(1); });
