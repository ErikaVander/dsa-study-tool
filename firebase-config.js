/* Firebase web config for DSA Study.
   NOTE: this apiKey is NOT a secret — it only identifies the project. All data
   access is enforced server-side by the Realtime Database security rules
   (see database.rules.json: each user can read/write only /users/$uid). Safe to
   ship publicly. To point the app at a different Firebase project, swap this file. */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCLVt3PD9vmGoe_JrTiCne8heLyFfV-px4",
  authDomain: "dsa-study-tool.firebaseapp.com",
  databaseURL: "https://dsa-study-tool-default-rtdb.firebaseio.com",
  projectId: "dsa-study-tool",
  storageBucket: "dsa-study-tool.firebasestorage.app",
  messagingSenderId: "512429855604",
  appId: "1:512429855604:web:d85c3f1ffb4bd66e671221"
};
