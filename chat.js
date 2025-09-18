// chat.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ===== Firebase Config ===== */
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
const auth = getAuth(app);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get('chatId');
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const chatName = document.getElementById('chatName');
const backBtn = document.getElementById('backBtn');

let currentUsername=null;
let currentUid=null;

/* ===== Auth state ===== */
onAuthStateChanged(auth, async(user)=>{
  if(!user){ window.location.href='index.html'; return;}
  currentUid = user.uid;
  currentUsername = user.displayName || user.email.split('@')[0];

  // load chat info
  const chatRef = doc(db,'chats',chatId);
  const chatSnap = await getDoc(chatRef);
  if(!chatSnap.exists()){ alert("Chat not found"); window.location.href='index.html'; return;}
  const chatData = chatSnap.data();
  chatName.textContent = chatData.name || 'Chat';

  startMessageListener(chatId);
});

/* ===== Back button ===== */
backBtn.addEventListener('click',()=>window.location.href='index.html');

/* ===== Send message ===== */
messageForm.addEventListener('submit', async(e)=>{
  e.preventDefault();
  const text = messageInput.value.trim();
  if(!text) return;
  await addDoc(collection(db,'chats',chatId,'messages'),{
    uid:currentUid,
    username:currentUsername,
    text,
    createdAt:serverTimestamp()
  });

  // add current user to members if not there (for global or group)
  const chatRef = doc(db,'chats',chatId);
  await updateDoc(chatRef,{members:arrayUnion(currentUid)});

  messageInput.value='';
});

/* ===== Listen messages ===== */
function startMessageListener(chatId){
  const msgsCol = collection(db,'chats',chatId,'messages');
  const q = query(msgsCol, orderBy('createdAt','asc'));
  onSnapshot(q, snap=>{
    messagesDiv.innerHTML='';
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      const div = document.createElement('div');
      div.className='msg';
      const time = d.createdAt ? d.createdAt.toDate().toLocaleTimeString() : '';
      div.innerHTML = `<strong>${d.username}</strong> <small>${time}</small><div>${d.text}</div>`;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}
