// app.js (ES module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* =========================
   Replace with your config
   (this is the config you posted)
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyAU1SHuBd24zNgP11D6aOPV3w0YFxz8bso",
  authDomain: "cchhatteerr.firebaseapp.com",
  projectId: "cchhatteerr",
  storageBucket: "cchhatteerr.firebasestorage.app",
  messagingSenderId: "462333840338",
  appId: "1:462333840338:web:81b2a196992783a7ea160b",
  measurementId: "G-H9M070PFZB"
};

/* ===== init ===== */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===== DOM ===== */
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const signupUsername = document.getElementById('signupUsername');
const signupPassword = document.getElementById('signupPassword');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const messagesArea = document.getElementById('messages-area');

const authSection = document.getElementById('auth');
const chatSection = document.getElementById('chat');
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const logoutBtn = document.getElementById('logoutBtn');
const meName = document.getElementById('meName');

let currentUsername = null;
let messagesUnsub = null;

/* ===== helpers ===== */
function showInfo(text, timeout = 4000) {
  messagesArea.hidden = false;
  messagesArea.textContent = text;
  if (timeout > 0) setTimeout(() => { messagesArea.hidden = true; }, timeout);
}
function usernameNormalize(u) {
  return u.trim().toLowerCase().replace(/\s+/g, '_');
}
function usernameValid(u) {
  // only letters, numbers, underscore, hyphen; 3-30 chars
  return /^[a-z0-9_\-]{3,30}$/.test(u);
}
function fakeEmailFor(usernameLower) {
  return `${usernameLower}@chat.local`;
}
function escapeText(s) {
  // simple escape to avoid HTML injection when inserting via innerHTML
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/* ===== Signup ===== */
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const raw = signupUsername.value || '';
  const pass = signupPassword.value || '';
  const usernameLower = usernameNormalize(raw);

  if (!usernameValid(usernameLower)) {
    showInfo('Username must be 3–30 chars: letters, numbers, underscores or hyphens.');
    return;
  }
  if (pass.length < 6) {
    showInfo('Password must be at least 6 characters.');
    return;
  }

  try {
    // check uniqueness
    const q = query(collection(db, 'users'), where('usernameLower', '==', usernameLower));
    const snap = await getDocs(q);
    if (!snap.empty) {
      showInfo('Username already taken. Try another.');
      return;
    }

    const fakeEmail = fakeEmailFor(usernameLower);
    const cred = await createUserWithEmailAndPassword(auth, fakeEmail, pass);

    // set displayName and user doc
    await updateProfile(cred.user, { displayName: raw.trim() });
    await setDoc(doc(db, 'users', cred.user.uid), {
      username: raw.trim(),
      usernameLower,
      createdAt: serverTimestamp()
    });

    // clear inputs
    signupUsername.value = '';
    signupPassword.value = '';
    showInfo('Signup successful — you are logged in.', 2500);

  } catch (err) {
    console.error('Signup error', err);
    showInfo('Signup failed: ' + (err.message || err.code));
  }
});

/* ===== Login ===== */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const raw = loginUsername.value || '';
  const pass = loginPassword.value || '';
  const usernameLower = usernameNormalize(raw);

  if (!usernameValid(usernameLower)) {
    showInfo('Invalid username format.');
    return;
  }

  try {
    const fakeEmail = fakeEmailFor(usernameLower);
    await signInWithEmailAndPassword(auth, fakeEmail, pass);

    // clear inputs
    loginUsername.value = '';
    loginPassword.value = '';
    showInfo('Logged in.', 1400);

  } catch (err) {
    console.error('Login error', err);
    showInfo('Login failed: Invalid username or password.');
  }
});

/* ===== Auth state ===== */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // get the user doc to read exact username
    try {
      const uDoc = await getDoc(doc(db, 'users', user.uid));
      if (uDoc.exists()) {
        const ud = uDoc.data();
        currentUsername = ud.username || user.displayName || user.email?.split('@')[0];
      } else {
        // fallback: use displayName or email
        currentUsername = user.displayName || user.email?.split('@')[0] || 'you';
      }
    } catch (err) {
      console.error('Error reading user doc', err);
      currentUsername = user.displayName || user.email?.split('@')[0] || 'you';
    }

    // show UI
    authSection.hidden = true;
    chatSection.hidden = false;
    meName.textContent = currentUsername;
    messagesDiv.innerHTML = '';
    startMessagesListener();

  } else {
    // signed out
    currentUsername = null;
    authSection.hidden = false;
    chatSection.hidden = true;
    if (messagesUnsub) messagesUnsub();
    messagesDiv.innerHTML = '';
  }
});

/* ===== Logout ===== */
logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

/* ===== Messages listener (global chat) ===== */
function startMessagesListener() {
  const msgsCol = collection(db, 'messages');
  const q = query(msgsCol, orderBy('createdAt', 'asc'));
  if (messagesUnsub) messagesUnsub();
  messagesUnsub = onSnapshot(q, (snap) => {
    messagesDiv.innerHTML = '';
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const name = escapeText(d.username || 'anon');
      const text = escapeText(d.text || '');
      const ts = d.createdAt ? d.createdAt.toDate().toLocaleString() : '';
      const div = document.createElement('div');
      div.className = 'msg';
      div.innerHTML = `<strong>${name}</strong> <small>${ts}</small><div>${text}</div>`;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, (err) => {
    console.error('Messages onSnapshot error', err);
    showInfo('Failed to load messages.');
  });
}

/* ===== Send message ===== */
messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = (messageInput.value || '').trim();
  if (!text) return;
  if (!auth.currentUser) {
    showInfo('Not signed in.');
    return;
  }
  try {
    await addDoc(collection(db, 'messages'), {
      uid: auth.currentUser.uid,
      username: currentUsername || auth.currentUser.displayName || auth.currentUser.email?.split('@')[0],
      text,
      createdAt: serverTimestamp()
    });
    messageInput.value = '';
  } catch (err) {
    console.error('Send message error', err);
    showInfo('Failed to send message.');
  }
});
