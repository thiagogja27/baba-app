import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDU6gLdyi9rB8He_WMy2i55Tt_ZW8IpAkA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "baba-aebdc.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://baba-aebdc-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "baba-aebdc",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "baba-aebdc.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "759072618623",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:759072618623:web:7349203127a97c7f3c674a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Y674SLVPDD"
};

export const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
