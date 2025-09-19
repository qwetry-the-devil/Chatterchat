// index.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  query,
  collection,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ========== Firebase config (your provided config) ========== */
const firebaseConfig = {
  apiKey: "AIzaSyAU1SHuBd24zNgP11D6aOPV3w0YFxz8bso",
  authDomain: "cchhatteerr.firebaseapp.com",
  projectId: "cchhatteerr",
  storageBucket: "cchhatteerr.firebasestorage.app",
  messagingSenderId: "462333840338",
  appId: "1:462333840338:web:81b2a196992783a7ea160b",
  measurementId: "G-H9M070PFZB"
};
/* ================================================ */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* Elements */
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

function usernameNormalize(u){
  return u.trim().toLowerCase().replace(/\s+/g,'_');
}
function usernameValid(u){
  return /^[a-z0-9_\-]{3,30}$/.test(u);
}

/* LOGIN */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const uname = usernameNormalize(username);
  if (!usernameValid(uname)) return alert("Invalid username format (3-30 chars: letters/numbers/_/-).");

  try {
    const email = `${uname}@chat.local`;
    await signInWithEmailAndPassword(auth, email, password);
    // go to chat UI
    location.href = "chat.html";
  } catch (err) {
    console.error(err);
    alert("Login failed: " + (err?.message || err?.code || "unknown error"));
  }
});

/* SIGNUP */
// ensure global chat exists
const globalRef = doc(db, "chats", "global");
const globalSnap = await getDoc(globalRef);
if(!globalSnap.exists()){
  await setDoc(globalRef, {
    name: "🌍 Global Chat",
    isGroup: true,
    members: [userCred.user.uid],
    createdAt: serverTimestamp()
  });
} else {
  // add new user if not already member
  const globalData = globalSnap.data();
  if(!globalData.members.includes(userCred.user.uid)){
    await updateDoc(globalRef, { members: arrayUnion(userCred.user.uid) });
  }
}

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usernameRaw = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value;
  const uname = usernameNormalize(usernameRaw);

  if (!usernameValid(uname)) return alert("Invalid username (3-30 letters/numbers/_/-).");
  if (password.length < 6) return alert("Password must be at least 6 characters.");

  try {
    // check uniqueness by querying users collection for usernameLower
    const q = query(collection(db, "users"), where("usernameLower", "==", uname));
    const snap = await getDocs(q);
    if (!snap.empty) return alert("Username already taken.");

    const email = `${uname}@chat.local`;
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    // create users doc
    await setDoc(doc(db, "users", userCred.user.uid), {
      username: usernameRaw,
      usernameLower: uname,
      createdAt: serverTimestamp()
    });

    // ensure global chat exists and add user to it
    const globalRef = doc(db, "chats", "global");
    try {
      await updateDoc(globalRef, { members: arrayUnion(userCred.user.uid) });
    } catch (err) {
      // if update fails (global doesn't exist), create it
      await setDoc(globalRef, {
        name: "🌍 Global Chat",
        isGroup: true,
        members: [userCred.user.uid],
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    // redirect to chat page
    location.href = "chat.html";
  } catch (err) {
    console.error(err);
    alert("Signup failed: " + (err?.message || err?.code || "unknown error"));
  }
});
