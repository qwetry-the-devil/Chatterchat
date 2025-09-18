// ... keep previous imports + Firebase config + state

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---- Elements ----
const newChatBtn = document.getElementById("newChatBtn");
const newChatModal = document.getElementById("newChatModal");
const closeModalBtn = document.getElementById("closeModal");
const newChatForm = document.getElementById("newChatForm");
const newChatNameInput = document.getElementById("newChatName");
const newChatUsersInput = document.getElementById("newChatUsers");

// ---- Open/close modal ----
newChatBtn.addEventListener("click", () => {
  newChatModal.classList.remove("hidden");
});
closeModalBtn.addEventListener("click", () => {
  newChatModal.classList.add("hidden");
});

// ---- Create new chat ----
newChatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const chatName = newChatNameInput.value.trim();
  const usernames = newChatUsersInput.value.split(",").map((u) => u.trim()).filter((u) => u);

  if (!chatName) return;

  // Always include current user
  let memberIds = [currentUser.uid];

  // Lookup usernames -> get UIDs
  for (let uname of usernames) {
    const q = query(collection(db, "users"), where("username", "==", uname));
    const snap = await getDocs(q);
    if (!snap.empty) {
      snap.forEach((docSnap) => {
        if (!memberIds.includes(docSnap.id)) {
          memberIds.push(docSnap.id);
        }
      });
    }
  }

  // Create chat doc
  await addDoc(collection(db, "chats"), {
    name: chatName,
    members: memberIds,
    isGroup: memberIds.length > 2,
    createdAt: serverTimestamp(),
  });

  // Reset + close
  newChatForm.reset();
  newChatModal.classList.add("hidden");

  // Reload chats
  await loadChats();
});
