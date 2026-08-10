/* ==========================================================================
   Firebase config — free Google cloud database
   Paste your project keys from Firebase Console → Project settings → Your apps
   ========================================================================== */

const FirebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://PASTE_YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "PASTE_YOUR_PROJECT",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};

function isFirebaseConfigured() {
  return (
    FirebaseConfig.apiKey &&
    !FirebaseConfig.apiKey.includes("PASTE_") &&
    FirebaseConfig.databaseURL &&
    !FirebaseConfig.databaseURL.includes("PASTE_")
  );
}
