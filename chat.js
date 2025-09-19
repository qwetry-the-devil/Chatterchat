import { initializeApp } from "https://www.gstatic.com/firebasejs/11.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc, arrayUnion, onSnapshot, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.22.1/firebase-firestore.js";

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
    senderId: currentUser.uid
