import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---- Firebase config ----
const firebaseConfig = {
  apiKey: "AIzaSyAU1SHuBd24zNgP11D6aOPV3w0YFxz8bso",
  authDomain: "cchhatteerr.firebaseapp.com",
  projectId: "cchhatteerr",
  storageBucket: "cchhatteerr.firebasestorage.app",
  messagingSenderId: "462333840338",
  appId: "1:462333840338:web:81b2a196992783a7ea160b",
  measurementId: "G-H9M070PFZB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ---- Elements ----
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

// ---- Login ----
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  try {
    const email = username + "@chat.local"; // fake email
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "chat.html";
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

// ---- Signup ----
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value.trim();
  try {
    const email = username + "@chat.local"; // fake email
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    // Save user
    const userRef = doc(db, "users", userCred.user.uid);
    await setDoc(userRef, { username, createdAt: Date.now() });

    // Add to global chat
    const globalRef = doc(db, "chats", "global");
    await updateDoc(globalRef, {
      members: arrayUnion(userCred.user.uid)
    });

    window.location.href = "chat.html";
  } catch (err) {
    alert("Signup failed: " + err.message);
  }
});
