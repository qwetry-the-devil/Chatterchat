// chat.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc
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
const chatListEl = document.getElementById("chatList");
const chatNameEl = document.getElementById("chatName");
const messagesEl = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const logoutBtn = document.getElementById("logoutBtn");

const newChatBtn = document.getElementById("newChatBtn");
const newChatModal = document.getElementById("newChatModal");
const closeModalBtn = document.getElementById("closeModal");
const newChatForm = document.getElementById("newChatForm");
const newChatNameInput = document.getElementById("newChatName");
const newChatUsersInput = document.getElementById("newChatUsers");

/* State */
let currentUser = null;
let currentChatId = null;
let unsubscribeMessages = null;
let chatCache = {}; // cache chat metadata

/* Helpers */
function escapeHtml(s){
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
function formatTimeWithSeconds(ts){
  // ts is a Firestore Timestamp
  if(!ts) return '';
  const d = ts.toDate();
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' });
}

/* Auth check */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "index.html";
    return;
  }
  currentUser = user;
  await loadChats();
});

/* Load chats the user is a member of */
async function loadChats(){
  chatListEl.innerHTML = '';

  // query chats where members array contains currentUser.uid
  const q = query(collection(db, "chats"), where("members", "array-contains", currentUser.uid));
  const snap = await getDocs(q);

  // Put global chat at top if present
  const rows = [];
  snap.forEach(ds => {
    const d = ds.data();
    d._id = ds.id;
    rows.push(d);
    chatCache[ds.id] = d;
  });

  // ensure global exists in list and is first
  rows.sort((a,b)=>{
    if(a._id === 'global') return -1;
    if(b._id === 'global') return 1;
    return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
  });

  rows.forEach(chat => {
    const li = document.createElement('li');
    li.dataset.chatId = chat._id;
    const name = chat._id === 'global' ? '🌍 Global Chat' : (chat.name || 'Unnamed Chat');
    li.innerHTML = `<span class="chat-name">${escapeHtml(name)}</span>
                    <span class="chat-meta">${(chat.lastMessageAt?.toDate?.().toLocaleTimeString() || '')}</span>`;
    li.addEventListener('click', async ()=> {
      // fetch up-to-date chat data
      const chatRef = doc(db,'chats',chat._id);
      const chatSnap = await getDoc(chatRef);
      const chatData = chatSnap.exists() ? chatSnap.data() : chat;
      switchChat(chat._id, chatData);
    });
    chatListEl.appendChild(li);
  });

  // if there is a global chat and no currentChatId, auto-open it
  if(rows.length){
    const first = rows[0];
    switchChat(first._id, first);
  }
}

/* Switch chat and subscribe to messages */
async function switchChat(chatId, chatData){
  currentChatId = chatId;
  chatNameEl.textContent = chatId === 'global' ? '🌍 Global Chat' : (chatData.name || 'Chat');

  // update members array to include user (so the chat shows in their list)
  try {
    await updateDoc(doc(db,'chats',chatId), { members: Array.from(new Set([...(chatData.members||[]), currentUser.uid])) });
  } catch (err) {
    // ignore if update fails for read-only global etc.
  }

  if(unsubscribeMessages) unsubscribeMessages();
  clearMessages();

  const msgsCol = collection(db, 'chats', chatId, 'messages');
  const q = query(msgsCol, orderBy('createdAt','asc'));
  unsubscribeMessages = onSnapshot(q, snap=>{
    clearMessages();
    snap.forEach(dsnap=>{
      const m = dsnap.data();
      renderMessage(m, m.senderId === currentUser.uid);
    });
  }, err => {
    console.error("messages onSnapshot error:", err);
  });
}

/* Render one message */
function renderMessage(m){
  const mine = m.senderId === currentUser.uid;
  const div = document.createElement('div');
  div.className = 'message ' + (mine ? 'mine' : 'their');

  const user = escapeHtml(m.username || 'anon');
  const time = formatTimeWithSeconds(m.createdAt);

  div.innerHTML = `<div class="meta"><strong>${user}</strong> <span style="color:var(--muted)">•</span> <span>${escapeHtml(time)}</span></div>
                   <div class="body">${escapeHtml(m.text || '')}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

}
function clearMessages(){ messagesEl.innerHTML = ''; }

/* Send message */
messageForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(!currentChatId) return;
  const text = messageInput.value.trim();
  if(!text) return;

  try {
    await addDoc(collection(db,'chats',currentChatId,'messages'), {
      text,
      senderId: currentUser.uid,
      username: (currentUser.displayName || currentUser.email?.split('@')[0] || 'anon'),
      createdAt: serverTimestamp()
    });

    // update lastMessageAt and lastMessage on chat root
    const chatRef = doc(db,'chats',currentChatId);
    await updateDoc(chatRef, {
      lastMessage: text.slice(0,120),
      lastMessageAt: serverTimestamp()
    });
    messageInput.value = '';
  } catch (err) {
    console.error("send message error:", err);
    alert("Failed to send message.");
  }
});

/* Logout */
logoutBtn.addEventListener('click', async ()=>{
  await signOut(auth);
  location.href = 'index.html';
});

/* New chat modal controls & create */
newChatBtn?.addEventListener('click', ()=> newChatModal.classList.remove('hidden'));
closeModalBtn?.addEventListener('click', ()=> newChatModal.classList.add('hidden'));

newChatForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = newChatNameInput.value.trim();
  const rawUsers = newChatUsersInput.value.trim();
  const usernames = rawUsers ? rawUsers.split(',').map(s=>s.trim()).filter(Boolean) : [];

  // Resolve usernames to UIDs
  const members = [currentUser.uid];
  for (const uname of usernames) {
    // try to find user by username field
    const q = query(collection(db,'users'), where('username','==', uname));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      if(!members.includes(docSnap.id)) members.push(docSnap.id);
    });
  }

  // Create chat
  try {
    const chatRef = await addDoc(collection(db,'chats'), {
      name: name || 'New Chat',
      members,
      isGroup: members.length > 2,
      createdAt: serverTimestamp()
    });

    // close modal & reload list & open the new chat
    newChatForm.reset();
    newChatModal.classList.add('hidden');
    await loadChats();

    // open it directly
    const chatSnap = await getDoc(doc(db,'chats',chatRef.id));
    if(chatSnap.exists()){
      switchChat(chatRef.id, chatSnap.data());
    }
  } catch (err) {
    console.error("create chat error:", err);
    alert("Failed to create chat.");
  }
});
