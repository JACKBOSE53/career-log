import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA-gR3vrMlfTnqv7cKvoPa4lJADSQlS7cA",
  authDomain: "career-log-cff62.firebaseapp.com",
  projectId: "career-log-cff62",
  storageBucket: "career-log-cff62.firebasestorage.app",
  messagingSenderId: "14962512963",
  appId: "1:14962512963:web:cef457ed16e4eb383c70f6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snap = await getDocs(collection(db, 'posts'));
  console.log(`Total posts: ${snap.size}`);
  snap.docs.forEach((doc) => {
    const data = doc.data();
    console.log(`Post ID: ${doc.id}, userId: ${data.userId}, visibility: ${data.visibility}`);
  });
  process.exit(0);
}

check().catch(console.error);
