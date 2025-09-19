import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
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

// ---- State ----
let currentUser = null;
let currentChatId = null;
let unsubscribeMessages = null;

// ---- Auth ----
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  await loadChats();
});

// ---- Load chats ----
async function loadChats() {
  chatListEl.innerHTML = "";

  const q = query(collection(db, "chats"), where("members", "array-contains", currentUser.uid));
  const snap = await getDocs(q);

  snap.forEach((docSnap) => {
    const chat = docSnap.data();
    const li = document.createElement("li");

    if (docSnap.id === "global") {
      li.textContent = "🌍 Global Chat";
    } else {
      li.textContent = chat.name || "Unnamed Chat";
    }

    li.onclick = () => switchChat(docSnap.id, chat);
    chatListEl.appendChild(li);
  });
}

// ---- Switch chat ----
function switchChat(chatId, chatData) {
  currentChatId = chatId;
  chatNameEl.textContent = chatData.name || "Chat";
  clearMessages();

  if (unsubscribeMessages) unsubscribeMessages();

  const msgCol = collection(db, "chats", chatId, "messages");
  const q = query(msgCol, orderBy("createdAt", "asc"));

  unsubscribeMessages = onSnapshot(q, (snap) => {
    clearMessages();
    snap.forEach((docSnap) => {
      const msg = docSnap.data();
      renderMessage(msg, msg.senderId === currentUser.uid);
    });
  });
}

// ---- Messages ----
function renderMessage(msg, mine) {
  const div = document.createElement("div");
  div.className = "message " + (mine ? "mine" : "their");
  div.textContent = msg.text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function clearMessages() {
  messagesEl.innerHTML = "";
}

// ---- Send message ----
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentChatId) return;
  const msgText = messageInput.value.trim();
  if (!msgText) return;

  const msgCol = collection(db, "chats", currentChatId, "messages");
  await addDoc(msgCol, {
    text: msgText,
    senderId: currentUser.uid,
    createdAt: serverTimestamp(),
  });
  messageInput.value = "";
});

// ---- Logout ----
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ---- Modal controls ----
newChatBtn.addEventListener("click", () => newChatModal.classList.remove("hidden"));
closeModalBtn.addEventListener("click", () => newChatModal.classList.add("hidden"));

newChatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const chatName = newChatNameInput.value.trim();
  const usernames = newChatUsersInput.value.split(",").map((u) => u.trim()).filter((u) => u);
  if (!chatName) return;

  let memberIds = [currentUser.uid];
  for (let uname of usernames) {
    const userSnap = await getDocs(query(collection(db, "users"), where("username", "==", uname)));
    if (!userSnap.empty) {
      userSnap.forEach((docSnap) => {
        if (!memberIds.includes(docSnap.id)) memberIds.push(docSnap.id);
      });
    }
  }

  await setDoc(doc(collection(db, "chats")), {
    name: chatName,
    members: memberIds,
    isGroup: memberIds.length > 2,
    createdAt: serverTimestamp(),
  });

  newChatForm.reset();
  newChatModal.classList.add("hidden");
  await loadChats();
});
