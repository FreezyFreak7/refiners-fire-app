import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCztmRyb0jyXyIp9UttpGTf02Ary7Z238c",
  authDomain: "verseup-d8893.firebaseapp.com",
  projectId: "verseup-d8893",
  storageBucket: "verseup-d8893.firebasestorage.app",
  messagingSenderId: "726450046786",
  appId: "1:726450046786:web:88334592b82dd6341c2adb",
  measurementId: "G-435MHGNLOH"
};

const app = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);