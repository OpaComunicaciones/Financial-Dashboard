import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDt244pUy7QjH4kUG9zviGgDn6dITivek0",
  authDomain: "restofin-pro.firebaseapp.com",
  projectId: "restofin-pro",
  storageBucket: "restofin-pro.firebasestorage.app",
  messagingSenderId: "776597202994",
  appId: "1:776597202994:web:72db22ee3d5f6a8830742b",
  measurementId: "G-JS4XT3GEYX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
