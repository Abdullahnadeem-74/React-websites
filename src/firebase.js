import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyByfXzImSVR4kM84zJvBGqGvJB3vauFMt4",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "app-investment-5168b.firebaseapp.com",
  databaseURL: "https://app-investment-5168b-default-rtdb.firebaseio.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "app-investment-5168b",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "app-investment-5168b.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1021208366558",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:1021208366558:web:2413b4da7b03e60a89a14f"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { database, auth };