// index.js
import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.22.1/firebase-auth.js";
import { setDoc, doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.22.1/firebase-firestore.js";

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const statusEl = document.getElementById("status");

function usernameNormalize(u) {
  return u.trim().toLowerCase().replace(/\s+/g,'_');
}

signupBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  if(!username || !password) { statusEl.textContent="Enter username & password"; return; }

  const uname = usernameNormalize(username);
  const email = `${uname}@chat.local`;

  try {
    const userCred = await createUserWithEmailAndPassword(auth,email,password);

    await setDoc(doc(db,"users",userCred.user.uid),{
      username,
      usernameLower:uname,
      createdAt:serverTimestamp()
    });

    const globalRef = doc(db,"chats","global");
    const globalSnap = await getDoc(globalRef);
    if(!globalSnap.exists()){
      await setDoc(globalRef,{
        name:"🌍 Global Chat",
        isGroup:true,
        members:[userCred.user.uid],
        createdAt:serverTimestamp()
      });
    } else if(!globalSnap.data().members.includes(userCred.user.uid)){
      await updateDoc(globalRef,{members:arrayUnion(userCred.user.uid)});
    }

    statusEl.textContent="Signup successful! Redirecting...";
    setTimeout(()=>location.href="chat.html",500);
  } catch(err){
    statusEl.textContent = "Error: "+err.message;
  }
});

loginBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  if(!username || !password) { statusEl.textContent="Enter username & password"; return; }

  const uname = usernameNormalize(username);
  const email = `${uname}@chat.local`;

  try{
    await signInWithEmailAndPassword(auth,email,password);
    statusEl.textContent="Login successful! Redirecting...";
    setTimeout(()=>location.href="chat.html",500);
  } catch(err){
    statusEl.textContent = "Error: "+err.message;
  }
});
