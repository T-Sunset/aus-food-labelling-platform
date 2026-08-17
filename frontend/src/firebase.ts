// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCndZw0I4pcS9mo2KDoP2sQnwlycx9iFYI",
  authDomain: "chadderton-food-labeller.firebaseapp.com",
  projectId: "chadderton-food-labeller",
  storageBucket: "chadderton-food-labeller.firebasestorage.app",
  messagingSenderId: "237826842508",
  appId: "1:237826842508:web:e35c956fb08904f14f80a9",
  measurementId: "G-TXFS7PJHP5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Exports
export const auth = getAuth(app);
export const db = getFirestore(app);