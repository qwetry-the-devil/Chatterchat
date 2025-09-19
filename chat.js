// chat.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.22.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, updateDoc, arrayUnion, onSnapshot, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.22.1/firebase-firestore.js";

let currentUser;
let currentChatId = "global";

const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatListEl = document.getElementById("chatList");

onAuthStateChanged(auth, async user=>{
  if(!user) return location.href="index.html";
  currentUser = user;

  loadChats();
  subscribeMessages();
});

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", e=>{
  if(e.key==="Enter") sendMessage();
});

async function sendMessage(){
  const text = messageInput.value.trim();
  if(!text) return;

  const chatRef = doc(db,'chats',currentChatId);
  const chatSnap = await getDoc(chatRef);

  if(!chatSnap.data().members.includes(currentUser.uid)){
    await updateDoc(chatRef,{members:arrayUnion(currentUser.uid)});
  }

  await addDoc(collection(db,'chats',currentChatId,'messages'),{
    text,
    senderId: currentUser.uid,
    username: currentUser.displayName || currentUser.email.split('@')[0],
    createdAt: serverTimestamp()
  });

  messageInput.value="";
}

function subscribeMessages(){
  const q = query(collection(db,'chats',currentChatId,'messages'),orderBy('createdAt'));
  onSnapshot(q,snap=>{
    messagesEl.innerHTML='';
    snap.forEach(doc=>renderMessage(doc.data()));
  });
}

function renderMessage(m){
  const mine = m.senderId===currentUser.uid;
  const div = document.createElement('div');
  div.className = 'message '+(mine?'mine':'their');

  const user = escapeHtml(m.username||'anon');
  const time = m.createdAt?.toDate ? formatTimeWithSeconds(m.createdAt.toDate()) : '';

  div.innerHTML = `<div class="meta"><strong>${user}</strong> • <span>${time}</span></div>
                   <div class="body">${escapeHtml(m.text||'')}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(text){
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTimeWithSeconds(d){
  const h = d.getHours().toString().padStart(2,'0');
  const m = d.getMinutes().toString().padStart(2,'0');
  const s = d.getSeconds().toString().padStart(2,'0');
  return `${h}:${m}:${s}`;
}

async function loadChats(){
  const chatRef = doc(db,'chats','global');
  const chatSnap = await getDoc(chatRef);
  if(chatSnap.exists()){
    chatListEl.innerHTML = `<li data-id="global">🌍 Global Chat</li>`;
    chatListEl.querySelector('li').classList.add('active');
  }
}

