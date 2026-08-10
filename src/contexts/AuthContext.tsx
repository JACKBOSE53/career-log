import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase';
import { ensureUserExists, setCurrentUserId } from '../db/store';

interface AuthContextValue {
  currentUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Firebaseのエラーコードを、日本語のわかりやすいメッセージに変換する
function toFriendlyMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'このメールアドレスは既に登録されています';
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません';
    case 'auth/weak-password':
      return 'パスワードは6文字以上にしてください';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'メールアドレスまたはパスワードが正しくありません';
    case 'auth/too-many-requests':
      return '試行回数が多すぎます。しばらくしてから再度お試しください';
    default:
      return '認証中にエラーが発生しました。もう一度お試しください';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ローカルストア(将来Firestoreに置き換え予定)側のプロフィールを用意し、
        // 「今のユーザー」をFirebase Authのuidに切り替える
        ensureUserExists(user.uid, {
          name: user.displayName ?? user.email?.split('@')[0] ?? '',
          email: user.email ?? '',
        });
        setCurrentUserId(user.uid);
      }
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signUp(email: string, password: string, name: string) {
    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      ensureUserExists(credential.user.uid, { name, email });
      setCurrentUserId(credential.user.uid);
      setCurrentUser(credential.user);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setError(toFriendlyMessage(code));
      throw e;
    }
  }

  async function logIn(email: string, password: string) {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setError(toFriendlyMessage(code));
      throw e;
    }
  }

  async function logOut() {
    setError(null);
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, error, signUp, logIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
