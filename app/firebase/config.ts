import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDDLm9DO9P4oJ0WnFAt8rSJTe5IOTAV3is",
  authDomain: "triplox-contas.firebaseapp.com",
  projectId: "triplox-contas",
  storageBucket: "triplox-contas.firebasestorage.app",
  messagingSenderId: "458894121932",
  appId: "1:458894121932:web:75239d123b2d98268ddb69",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);