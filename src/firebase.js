
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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