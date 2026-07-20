# Self-hosting your own instance

This app is a static single-page app (`index.html`) on GitHub Pages, backed by a Firebase
project (Auth + Realtime Database) and in-browser Python (Pyodide). You can run your own copy
for free. Nothing here is secret — the Firebase `apiKey` is safe to ship publicly because all
access is enforced by the database security rules.

Budget ~20 minutes. You need a GitHub account and a Google account.

---

## 1. Fork the repo
- Fork `github.com/ErikaVander/dsa-study-tool` to your own GitHub account (or clone and push to
  a new repo).

## 2. Create a Firebase project
1. Go to the [Firebase console](https://console.firebase.google.com) → **Add project**. Name it
   anything; you can disable Google Analytics.
2. **Add a Web app** (`</>` icon). Copy the config object it shows you.

## 3. Enable Authentication
- Console → **Build → Authentication → Get started**.
- Enable **Anonymous** (Sign-in method → Anonymous → Enable). This is the no-friction default
  sign-in.
- Enable **Google** (Sign-in method → Google → Enable; set a support email). This is what links
  a user's devices together.
- **Authentication → Settings → Authorized domains → Add domain**: add your GitHub Pages host,
  e.g. `yourname.github.io`. (Sign-in popups are rejected from unlisted domains.)

## 4. Create the Realtime Database
- Console → **Build → Realtime Database → Create Database**. Pick a region (e.g. `us-central1`).
  Start in **locked mode** — the rules in the next step are the real security.
- Note the database URL, e.g. `https://YOUR-PROJECT-default-rtdb.firebaseio.com`.

## 5. Deploy the security rules
The rules are the *entire* security model (the repo is public), so get them right. From
`database.rules.json` in this repo:
```json
{ "rules": { ".read": false, ".write": false,
    "users": { "$uid": {
      ".read": "auth != null && auth.uid === $uid",
      ".write": "auth != null && auth.uid === $uid" } } } }
```
Paste them into console → Realtime Database → **Rules** → Publish. (Each user can read/write
ONLY their own `/users/$uid` subtree; global content is read-only because it's served from the
repo, not the DB.)

## 6. Point the app at your project
Edit **`firebase-config.js`** with the values from step 2:
```js
window.FIREBASE_CONFIG = {
  apiKey: "…", authDomain: "YOUR-PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR-PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR-PROJECT", storageBucket: "YOUR-PROJECT.firebasestorage.app",
  messagingSenderId: "…", appId: "…"
};
```
Also update `databaseURL` in **`tools/purge-anon-users.js`** if you'll use that cleanup script.

## 7. Publish with GitHub Pages
- Repo → **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch
  `main`, folder `/ (root)`. Save.
- Your site goes live at `https://yourname.github.io/your-repo/` in a minute or two.
- Confirm the domain you set matches what you added in step 3.

## 8. Verify it works
- Open your live URL. You should sign in anonymously automatically (a cloud-status indicator
  shows "Synced"), see the **Big O** seed lesson/quiz/flashcards, and be able to run Python in
  an exercise.
- Click **Sign in** → Google → confirm the popup works (proves your authorized domain is right).
- Bump `VERSION` in `sw.js` on any deploy you want users to pick up promptly (the service worker
  caches; otherwise a change needs ~2 reloads).

---

## What ships vs. what's per-user
- **Ships in the repo (global, all users):** app code, the curriculum skeleton
  (`curriculum.json`), the methodology (`GLOBAL_LAYER.md`), and the **seed content** — the Big O
  lesson/quiz/flashcards. New accounts get their own editable CLONE of the seed.
- **Per-user (Firebase `/users/$uid`):** each user's flashcards (`/state`), quiz attempts
  (`/attempts`), profile (`/profile` — progress, notes, review queue, curriculum overlay), and
  their cloned content (`/content`). This is private to each user by the security rules.

## Authoring more content (optional, power-user)
Content can be authored on a Chromium desktop via the **Connect** button (File System Access
API) to a local folder, or with Claude Code following the schemas + author-ahead ritual in
[`GLOBAL_LAYER.md`](GLOBAL_LAYER.md) and [`CLAUDE.md`](CLAUDE.md). After adding/removing content
files, regenerate the manifest: `python3 tools/gen_manifest.py`.

## Costs
The Firebase **Spark** (free) tier is enough to start (~100 concurrent DB connections). If you
outgrow it, **Blaze** (pay-as-you-go) scales up; a low-traffic study app stays effectively free.
GitHub Pages and Pyodide are free.
