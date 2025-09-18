import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, addDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

/* === CONFIG === */
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  appId: "REPLACE_ME"
};
/* ============= */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* Elements */
const authView = document.getElementById('auth-view');
const mainView = document.getElementById('main-view');
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const userNameEl = document.getElementById('user-name');
const profileName = document.getElementById('profileName');
const chatList = document.getElementById('chatList');
const chatTitle = document.getElementById('chatTitle');
const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const openGlobalBtn = document.getElementById('openGlobal');
const newPrivateChatBtn = document.getElementById('newPrivateChat');
const newGroupChatBtn = document.getElementById('newGroupChat');

let currentUser = null;
let currentChatId = null;
let messagesUnsub = null;
let chatsUnsub = null;

/* username → fake email */
function usernameToEmail(username) {
  return username.toLowerCase() + "@chat.local";
}

/* Signup */
signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value.trim();
  const pass = document.getElementById('signupPassword').value;
  if (!username) return alert("Enter a username");

  const qUser = query(collection(db, 'users'), where('username', '==', username));
  const snap = await getDocs(qUser);
  if (!snap.empty) return alert("Username taken");

  const fakeEmail = usernameToEmail(username);
  const cred = await createUserWithEmailAndPassword(auth, fakeEmail, pass);
  await updateProfile(cred.user, { displayName: username });
  await setDoc(doc(db, 'users', cred.user.uid), {
    username, createdAt: serverTimestamp()
  });
});

/* Login */
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const pass = document.getElementById('loginPassword').value;
  try {
    await signInWithEmailAndPassword(auth, usernameToEmail(username), pass);
  } catch {
    alert("Invalid username or password");
  }
});

/* Auth state */
logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    authView.hidden = true;
    mainView.hidden = false;
    logoutBtn.hidden = false;
    userNameEl.textContent = user.displayName;
    profileName.textContent = user.displayName;
    startChatListListener();
  } else {
    authView.hidden = false;
    mainView.hidden = true;
    logoutBtn.hidden = true;
    userNameEl.textContent = '';
    if (chatsUnsub) chatsUnsub();
    if (messagesUnsub) messagesUnsub();
  }
});

/* Chat List */
function startChatListListener() {
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid), orderBy('lastMessageAt','desc'));
  if (chatsUnsub) chatsUnsub();
  chatsUnsub = onSnapshot(q, snap => {
    chatList.innerHTML = '';
    snap.forEach(docSnap => {
      const chat = docSnap.data();
      const li = document.createElement('li');
      li.textContent = chat.name || (chat.isGroup ? 'Group chat' : 'Private chat');
      li.onclick = () => openChat(docSnap.id, chat);
      chatList.appendChild(li);
    });
  });
}

/* Private chat */
newPrivateChatBtn.addEventListener('click', async () => {
  const uname = prompt("Enter username:");
  if (!uname) return;
  const q = query(collection(db,'users'), where('username','==',uname));
  const s = await getDocs(q);
  if (s.empty) return alert("User not found");
  const other = s.docs[0];
  const participants = [currentUser.uid, other.id].sort();
  const chatId = participants.join('_');
  const chatRef = doc(db,'chats',chatId);
  await setDoc(chatRef, { participants, isGroup:false, name:uname, owner:currentUser.uid, createdAt:serverTimestamp() }, { merge:true });
  openChat(chatId, { name: uname });
});

/* Group chat */
newGroupChatBtn.addEventListener('click', async () => {
  const name = prompt("Group name:");
  if (!name) return;
  const input = prompt("Comma-separated usernames:");
  const unames = input.split(',').map(s=>s.trim()).filter(Boolean);
  const usersRef = collection(db,'users');
  const uids = [currentUser.uid];
  for (const u of unames) {
    const q = query(usersRef, where('username','==',u));
    const s = await getDocs(q);
    if (!s.empty) uids.push(s.docs[0].id);
  }
  const chatRef = await addDoc(collection(db,'chats'), { participants:Array.from(new Set(uids)), isGroup:true, name, owner:currentUser.uid, createdAt:serverTimestamp() });
  openChat(chatRef.id,{name});
});

/* Global chat */
openGlobalBtn.addEventListener('click', async () => {
  const gRef = doc(db,'chats','global');
  await setDoc(gRef,{ name:'Global', isGroup:true },{ merge:true });
  openChat('global',{ name:'Global' });
});

/* Open chat */
function openChat(chatId, chatData={}) {
  currentChatId = chatId;
  chatTitle.textContent = chatData.name || chatId;
  messagesEl.innerHTML='';
  if (messagesUnsub) messagesUnsub();
  const msgsCol = collection(db,'chats',chatId,'messages');
  const msgsQuery = query(msgsCol, orderBy('createdAt'));
  messagesUnsub = onSnapshot(msgsQuery,snap=>{
    messagesEl.innerHTML='';
    snap.forEach(m=>{
      const d=m.data();
      const div=document.createElement('div');
      div.className='message';
      const who=d.senderId===currentUser.uid?'You':d.senderName;
      div.innerHTML=`<strong>${who}</strong> <small>${new Date(d.createdAt?.toMillis?.()||Date.now()).toLocaleTimeString()}</small><div>${d.text||''}</div>`;
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop=messagesEl.scrollHeight;
  });
}

/* Send message */
messageForm.addEventListener('submit', async e=>{
  e.preventDefault();
  if(!currentChatId||!currentUser)return;
  const text=messageInput.value.trim();
  if(!text)return;
  await addDoc(collection(db,'chats',currentChatId,'messages'), {
    senderId: currentUser.uid,
    senderName: currentUser.displayName,
    text,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db,'chats',currentChatId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp()
  });
  messageInput.value='';
});
