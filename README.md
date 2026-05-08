# 🗳️ VoteSecure — 300 Level CMP Online Voting System
## Complete Firebase + Vercel Setup Guide

---

## WHAT YOU NEED (all free)
- A Google account
- Node.js installed → https://nodejs.org (download LTS version)
- A GitHub account → https://github.com
- A Vercel account → https://vercel.com (sign up with GitHub)

---

## STEP 1 — Create Your Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → Name it `votesecure-cmp300` → Continue
3. Disable Google Analytics (not needed) → **Create project**
4. Once created, click the **Web icon `</>`** to add a web app
5. Name it `votesecure` → Click **"Register app"**
6. You'll see a `firebaseConfig` object — **copy it**, you'll need it next

---

## STEP 2 — Enable Firestore Database

1. In Firebase Console → left sidebar → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add security rules later)
4. Select a region close to Nigeria (e.g. `europe-west1`) → **Enable**

---

## STEP 3 — Configure the App

Open the project files and edit **two files** with your Firebase credentials:

### File 1: `src/firebase.js`
Replace the placeholder values with your actual config:
```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",       // ← your value
  authDomain:        "votesecure-....firebaseapp.com",
  projectId:         "votesecure-...",
  storageBucket:     "votesecure-....appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...",
};
```

### File 2: `scripts/seed.js`
Paste the same config values into the same fields at the top of this file.

---

## STEP 4 — Install & Seed the Database

Open your terminal/command prompt in the project folder:

```bash
# Install dependencies
 install

# Seed Firestore with election + candidates (run ONCE only)
npm run seed
```

You should see:
```
✅ Election created
✅ Candidate added: Amara Okonkwo
✅ Candidate added: Emeka Nwosu
✅ Candidate added: Fatima Al-Hassan
🎉 Seeding complete!
```

---

## STEP 5 — Test Locally

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

Test with:
- **Student login**: Any ID from `FT23CMP001` to `FT23CMP500`
- **Admin login**: `CourseRep@2025`

Open on **two different browsers** or devices on your WiFi — votes will sync in real time!

---

## STEP 6 — Deploy to Vercel (Get a Public URL)

```bash
# 1. Push project to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/votesecure.git
git push -u origin main

# 2. Go to https://vercel.com
# 3. Click "New Project" → Import your GitHub repo
# 4. Click "Deploy" — Vercel auto-detects Vite
# 5. Done! You get a URL like: https://votesecure-cmp300.vercel.app
```

Share that URL with your entire class — **500 students can vote from any device**.

---

## STEP 7 — Add Firestore Security Rules (Important for Production)

In Firebase Console → Firestore → **Rules** tab, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{studentId} {
      allow read, write: if true; // Lock down with Firebase Auth later
    }

    match /candidates/{id} {
      allow read: if true;
      allow write: if false; // Only seed script / Firebase Console writes
    }

    match /votes/{id} {
      allow create: if true;
      allow read, update, delete: if false;
    }

    match /elections/{id} {
      allow read: if true;
      allow write: if false; // Only via Firebase Console
    }
  }
}
```

---

## CHANGING THE ADMIN PASSWORD

Open `src/App.jsx` line 8:
```js
const ADMIN_PASSWORD = "CourseRep@2025";
```
Change it to anything you want, then redeploy.

---

## PROJECT STRUCTURE

```
votesecure/
├── src/
│   ├── App.jsx          ← All UI components
│   ├── firebase.js      ← Your Firebase config
│   └── main.jsx         ← React entry point
├── scripts/
│   └── seed.js          ← Run once to init Firestore
├── index.html
├── package.json
├── vite.config.js
└── README.md            ← This file
```

---

## HOW THE ONE-VOTE RULE WORKS (Technical)

When a student votes, a **Firestore Transaction** runs atomically:
1. Reads the student's `users/{id}` document
2. If `hasVoted === true` → throws error, vote rejected
3. If `hasVoted === false` → writes the vote + sets `hasVoted = true` simultaneously
4. No two operations can interleave — **race conditions are impossible**

The vote document stores **only** the receipt ID, candidate ID, and timestamp.
The student's identity is **never written to the votes collection**.

---

Built with React + Firebase Firestore + Vite + Vercel
