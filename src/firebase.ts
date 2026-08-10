import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebaseコンソール > プロジェクトの設定 > 全般 から取得できる値を
// .env(このリポジトリのルート)に設定してください。
// 例は .env.example を参照。
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA-gR3vrMlfTnqv7cKvoPa4lJADSQlS7cA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "career-log-cff62.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "career-log-cff62",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "career-log-cff62.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "14962512963",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:14962512963:web:cef457ed16e4eb383c70f6",
};

// 必須の値が欠けている場合は、原因が分かりやすいように早めにエラーを出す
const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `[firebase] 環境変数が設定されていません: ${missingKeys.join(', ')}\n` +
      '.env.example を参考に .env を作成してください。'
  );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
