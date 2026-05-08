// scripts/seed.js
// Run ONCE after Firebase setup: node scripts/seed.js
// Fill in your Firebase credentials below first.

import { initializeApp }    from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

// ── PASTE YOUR FIREBASE CONFIG HERE ──────────────────────────────────────────
const firebaseConfig = {
  // Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAW6n1DIvt_DQ5S1Fm0x7DJ9m8vbT8mqUY",
  authDomain: "online-voting-system-b6d46.firebaseapp.com",
  databaseURL: "https://online-voting-system-b6d46-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "online-voting-system-b6d46",
  storageBucket: "online-voting-system-b6d46.firebasestorage.app",
  messagingSenderId: "67401834582",
  appId: "1:67401834582:web:e070e49aa1bb36badf9bf7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

async function seed() {
  console.log("\n🌱 Seeding Firestore...\n");

  await setDoc(doc(db, "elections", "cmp300_2025"), {
    title: "300 LEVEL CMP ONLINE VOTING SYSTEM",
    status: "open",
    totalStudents: 500,
    totalVotes: 0,
    winnerId: null,
    createdAt: serverTimestamp(),
  });
  console.log("✅ Election created");

  const candidates = [
    { id:"c1", name:"enduranrance santu ekumifi",   avatar:"AO", color:"#1a6b4a", votes:0, position:"Course Representative", manifesto:"I will bridge the gap between students and lecturers by creating a weekly open-door session. My focus is on early exam timetables, better lab access, and a student welfare fund for those struggling with fees." },
    { id:"c2", name:"muhammad yusuf madaki",     avatar:"EN", color:"#1a3d6b", votes:0, position:"Course Representative", manifesto:"Three priorities: transparent communication, a digital notice board for all class updates, and negotiating with faculty for grace periods during personal emergencies. Your voice deserves to be heard." },
    { id:"c3", name:"aisha yahuza muhammad",avatar:"FA", color:"#6b1a4a", votes:0, position:"Course Representative", manifesto:"I bring 2 years of student council experience. I will establish a mentorship program pairing finalists with 100-level students, fight for air-conditioned classrooms, and publish monthly rep reports to the class." },
  ];

  for (const c of candidates) {
    const { id, ...data } = c;
    await setDoc(doc(db, "candidates", id), { ...data, createdAt: serverTimestamp() });
    console.log(`✅ Candidate: ${c.name}`);
  }

  await setDoc(doc(db, "users", "FT23CMP001"), {
    name:"Test Student", matric:"FT23CMP001", email:"test@university.edu.ng",
    hasVoted:false, createdAt:serverTimestamp(),
  });
  console.log("✅ Test account: FT23CMP001");

  console.log("\n🎉 Done! Run: npm run dev\n");
  process.exit(0);
}

seed().catch(e => { console.error("❌ Failed:", e.message); process.exit(1); });
