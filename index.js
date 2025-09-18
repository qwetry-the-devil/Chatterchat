// index.js
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
  query,
  where,
  getDocs,
  serverTimestamp
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

/* ===== DOM ===== */
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const signupUsername = document.getElementById('signupUsername');
const signupPassword = document.getElementById('signupPassword');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const messagesArea = document.getElementById('messages-area');

const authSection = document.getElementById('auth');
const lobbySection = document.getElementById('lobby');
const chatList = document.getElementById('chatList');
const meName = document.getElementById('meName');
const logoutBtn = document.getElementById('logoutBtn');

let currentUsername = null;
let currentUid = null;

/* ===== Helpers ===== */
function showInfo(text, timeout = 4000){
  messagesArea.hidden = false;
  messagesArea.textContent = text;
  if(timeout>0) setTimeout(()=>messagesArea.hidden=true, timeout);
}
function usernameNormalize(u){
  return u.trim().toLowerCase().replace(/\s+/g,'_');
}
function usernameValid(u){
  return /^[a-z0-9_\-]{3,30}$/.test(u);
}
function fakeEmailFor(u){ return `${u}@chat.local`; }

/* ===== Signup ===== */
signupForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const raw = signupUsername.value;
  const pass = signupPassword.value;
  const uNorm = usernameNormalize(raw);
  if(!usernameValid(uNorm)){ showInfo("Username invalid (3-30 letters/numbers/_/-)"); return;}
  if(pass.length<6){ showInfo("Password must be 6+ chars"); return;}

  try{
    const q = query(collection(db,'users'), where('usernameLower','==', uNorm));
    const snap = await getDocs(q);
    if(!snap.empty){ showInfo("Username taken"); return; }

    const cred = await createUserWithEmailAndPassword(auth, fakeEmailFor(uNorm), pass);
    await updateProfile(cred.user,{displayName:raw});
    await setDoc(doc(db,'users',cred.user.uid),{
      username: raw,
      usernameLower: uNorm,
      createdAt: serverTimestamp()
    });
    signupUsername.value = '';
    signupPassword.value = '';
    showInfo('Signup success', 2500);
  }catch(err){
    console.error(err);
    showInfo('Signup failed');
  }
});

/* ===== Login ===== */
loginForm.addEventListener('submit', async(e)=>{
  e.preventDefault();
  const raw = loginUsername.value;
  const pass = loginPassword.value;
  const uNorm = usernameNormalize(raw);
  if(!usernameValid(uNorm)){ showInfo("Invalid username"); return; }

  try{
    await signInWithEmailAndPassword(auth, fakeEmailFor(uNorm), pass);
    loginUsername.value=''; loginPassword.value='';
  }catch(err){
    console.error(err);
    showInfo("Login failed");
  }
});

/* ===== Auth state ===== */
onAuthStateChanged(auth, async(user)=>{
  if(user){
    currentUid = user.uid;
    const uDoc = await getDocs(query(collection(db,'users'),where('usernameLower','==',usernameNormalize(user.displayName || user.email.split('@')[0]))));
    if(!uDoc.empty){
      currentUsername = uDoc.docs[0].data().username;
    }else{ currentUsername = user.displayName || 'Anon'; }
    meName.textContent = currentUsername;
    authSection.hidden = true;
    lobbySection.hidden = false;
    loadChatList();
  }else{
    currentUid=null; currentUsername=null;
    authSection.hidden = false;
    lobbySection.hidden = true;
  }
});

/* ===== Logout ===== */
logoutBtn.addEventListener('click', ()=>signOut(auth));

/* ===== Chat creation ===== */
document.getElementById('newPrivateBtn').addEventListener('click', async()=>{
  const target = prompt("Enter username for private chat:");
  if(!target) return;
  const tNorm = usernameNormalize(target);
  const q = query(collection(db,'users'), where('usernameLower','==',tNorm));
  const snap = await getDocs(q);
  if(snap.empty){ showInfo("User not found"); return;}
  const targetUid = snap.docs[0].id;
  const chatId = [currentUid,targetUid].sort().join("_");
  // create chat doc
  await setDoc(doc(db,'chats',chatId),{
    type:'private',
    members:[currentUid,targetUid],
    createdAt: serverTimestamp(),
    name:`Private: ${currentUsername} + ${target}`
  });
  window.location.href = `chat.html?chatId=${chatId}`;
});

document.getElementById('newGroupBtn').addEventListener('click', async()=>{
  const gName = prompt("Enter group chat name:");
  if(!gName) return;
  const chatRef = await addDoc(collection(db,'chats'),{
    type:'group',
    members:[currentUid],
    createdAt:serverTimestamp(),
    name:gName
  });
  window.location.href = `chat.html?chatId=${chatRef.id}`;
});

document.getElementById('globalBtn').addEventListener('click', async()=>{
  const chatRef = await setDoc(doc(db,'chats','global'),{
    type:'global',
    members:[],
    createdAt:serverTimestamp(),
    name:'Global Chat'
  }, {merge:true});
  window.location.href='chat.html?chatId=global';
});

/* ===== Load lobby chat list ===== */
async function loadChatList(){
  chatList.innerHTML='';
  const q = collection(db,'chats');
  const snap = await getDocs(q);
  snap.forEach(docSnap=>{
    const d = docSnap.data();
    if(d.type==='private' && !d.members.includes(currentUid)) return;
    if(d.type==='group' && !d.members.includes(currentUid)) return;
    const li = document.createElement('li');
    li.textContent = d.name || 'Chat';
    li.addEventListener('click', ()=> window.location.href=`chat.html?chatId=${docSnap.id}`);
    chatList.appendChild(li);
  });
}
