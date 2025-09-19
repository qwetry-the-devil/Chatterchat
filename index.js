
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, setDoc, doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase config
// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";

import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

  apiKey: "AIzaSyAU1SHuBd24zNgP11D6aOPV3w0YFxz8bso",

  authDomain: "cchhatteerr.firebaseapp.com",

  projectId: "cchhatteerr",

  storageBucket: "cchhatteerr.firebasestorage.app",

  messagingSenderId: "462333840338",

  appId: "1:462333840338:web:81b2a196992783a7ea160b",

  measurementId: "G-H9M070PFZB"

};



};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const statusEl = document.getElementById("status");

function usernameNormalize(u) {
  return u.trim().toLowerCase().replace(/\s+/g,'_');
}

signupBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  if(!username || !password) { statusEl.textContent="Enter username and password"; return; }

  const uname = usernameNormalize(username);
  const email = `${uname}@chat.local`;

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", userCred.user.uid), {
      username,
      usernameLower: uname,
      createdAt: serverTimestamp()
    });

    const globalRef = doc(db, "chats", "global");
    const globalSnap = await getDoc(globalRef);
    if (!globalSnap.exists()) {
      await setDoc(globalRef, {
        name: "🌍 Global Chat",
        isGroup: true,
        members: [userCred.user.uid],
        createdAt: serverTimestamp()
      });
    } else if(!globalSnap.data().members.includes(userCred.user.uid)){
      await updateDoc(globalRef, { members: arrayUnion(userCred.user.uid) });
    }

    statusEl.textContent = "Signup successful! Redirecting...";
    setTimeout(()=>location.href="chat.html",500);
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  }
});

loginBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  if(!username || !password) { statusEl.textContent="Enter username and password"; return; }

  const uname = usernameNormalize(username);
  const email = `${uname}@chat.local`;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    statusEl.textContent = "Login successful! Redirecting...";
    setTimeout(()=>location.href="chat.html",500);
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  }
});
