// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.22.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.22.1/firebase-firestore.js";

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

export const auth = getAuth(app);
export const db = getFirestore(app);
