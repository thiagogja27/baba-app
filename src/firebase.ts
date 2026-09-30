import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: "AIzaSyDU6gLdyi9rB8He_WMy2i55Tt_ZW8IpAkA",
  authDomain: "baba-aebdc.firebaseapp.com",
  databaseURL: "https://baba-aebdc-default-rtdb.firebaseio.com",
  projectId: "baba-aebdc",
  storageBucket: "baba-aebdc.firebasestorage.app",
  messagingSenderId: "759072618623",
  appId: "1:759072618623:web:7349203127a97c7f3c674a",
  measurementId: "G-Y674SLVPDD"
};

export const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
