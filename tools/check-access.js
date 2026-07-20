#!/usr/bin/env node
/**
 * READ-ONLY access check: confirms the Admin key works, finds the real (non-anon) user(s),
 * and reports what's under /users/<uid>. Writes NOTHING. (firebase-admin v14 modular API.)
 */
"use strict";
const path = require("path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");
const sa = require(path.join(__dirname, "service-account.json"));

initializeApp({ credential: cert(sa), databaseURL: "https://dsa-study-tool-default-rtdb.firebaseio.com" });
const auth = getAuth();
const db = getDatabase();
const parseKeys = (s) => { try { return Object.keys(JSON.parse(s || "{}")); } catch (e) { return []; } };

(async () => {
  const users = [];
  let token;
  do { const r = await auth.listUsers(1000, token); users.push(...r.users); token = r.pageToken; } while (token);
  const real = users.filter((u) => (u.providerData && u.providerData.length) || u.email);
  console.log(`total users: ${users.length} | real (non-anon): ${real.length}`);
  for (const u of real) {
    const val = (await db.ref(`users/${u.uid}`).once("value")).val() || {};
    console.log(`\n  uid = ${u.uid}`);
    console.log(`  email = ${u.email || "?"} | provider = ${((u.providerData[0] || {}).providerId) || "?"}`);
    console.log(`  /users node children: ${Object.keys(val).join(", ") || "(none)"}`);
    if (val.content) {
      const L = parseKeys(val.content.lessons), Q = parseKeys(val.content.quizzes);
      console.log(`  content: ${L.length} lessons [${L.join(", ")}] | ${Q.length} quizzes [${Q.join(", ")}]`);
    }
    if (val.state) {
      const nCards = Array.isArray(val.state.cards) ? val.state.cards.length : 0;
      const nCats = Array.isArray(val.state.categories) ? val.state.categories.length : 0;
      console.log(`  state (flashcards): ${nCards} cards, ${nCats} categories`);
    }
  }
  console.log("\n(read-only — nothing was written)");
  process.exit(0);
})().catch((e) => { console.error("Access check FAILED:", e.message); process.exit(1); });
