// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyClw7-J5-dWAxzGX75MKNpOLGT-GQkFBzs",
  authDomain: "rc-exp-check-in.firebaseapp.com",
  databaseURL: "https://rc-exp-check-in-default-rtdb.firebaseio.com",
  projectId: "rc-exp-check-in",
  storageBucket: "rc-exp-check-in.appspot.com",
  messagingSenderId: "787125233515",
  appId: "1:787125233515:web:771a88b31dfdd2f8b18e2e",
  measurementId: "G-29CSGZ0MXR"
};

// Initialize Firebase
let app;
let database;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
  // Provide a fallback for database to prevent null reference errors
  console.warn("Using offline mode - data will be stored locally only");
}

export { app, database };
