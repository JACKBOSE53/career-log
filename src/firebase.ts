import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA-gR3vrMlfTnqv7cKvoPa4lJADSQlS7cA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "career-log-cff62.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "career-log-cff62",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "career-log-cff62.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "14962512963",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:14962512963:web:cef457ed16e4eb383c70f6"
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);

// 認証（セッションをローカルに永続保存 → 再ログイン不要）
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// データベース
export const db = getFirestore(app);

export default app;
