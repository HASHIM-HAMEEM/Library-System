import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDhZEmFLE7K50uKX1a0dDOuQy2iSmbxbVQ",
  authDomain: "iqralibrary2025.firebaseapp.com",
  projectId: "iqralibrary2025",
  storageBucket: "iqralibrary2025.firebasestorage.app",
  messagingSenderId: "572676592022",
  appId: "1:572676592022:web:fade189e19a7a3bec1cdb7",
  measurementId: "G-6NWJKSPY51"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;