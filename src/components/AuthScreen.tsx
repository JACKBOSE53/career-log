import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const { signUp, logIn, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, name);
      } else {
        await logIn(email, password);
      }
    } catch {
      // エラーメッセージはuseAuth().errorで表示するのでここでは何もしない
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base, #0b0b0f)',
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: 28,
          borderRadius: 16,
          background: 'var(--bg-surface-2, #16161c)',
          border: '1px solid var(--border-color, #2a2a33)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary, #fff)' }}>
            CareerLog
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9a9aa5)', marginTop: 4 }}>
            努力と挑戦を、仲間と共有しよう
          </div>
        </div>

        {mode === 'signup' && (
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted, #9a9aa5)' }}>ニックネーム</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="高木 悠太"
              required
              style={{ width: '100%', fontSize: '0.9rem', marginTop: 4 }}
            />
          </div>
        )}

        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted, #9a9aa5)' }}>メールアドレス</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="yuta@example.com"
            required
            style={{ width: '100%', fontSize: '0.9rem', marginTop: 4 }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted, #9a9aa5)' }}>パスワード</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6文字以上"
            minLength={6}
            required
            style={{ width: '100%', fontSize: '0.9rem', marginTop: 4 }}
          />
        </div>

        {error && (
          <div style={{ fontSize: '0.78rem', color: '#ef4444' }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{
            marginTop: 4,
            padding: '10px 0',
            borderRadius: 10,
            fontWeight: 700,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? '処理中...' : mode === 'signup' ? '新規登録' : 'ログイン'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted, #9a9aa5)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          {mode === 'signup' ? 'すでにアカウントをお持ちの方はこちら' : 'アカウントをお持ちでない方はこちら'}
        </button>
      </form>
    </div>
  );
}
