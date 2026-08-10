import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'login' | 'signup';

export default function LoginPage() {
  const { logIn, signUp } = useAuth();
  const [tab, setTab] = useState<Tab>('login');

  // ── ログインフォーム状態 ──────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // ── 新規登録フォーム状態 ─────────────────────────────────────
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleTabChange(t: Tab) {
    setTab(t);
    setError('');
  }

  // ── ログイン処理 ─────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await logIn(loginEmail, loginPassword);
    } catch (err: unknown) {
      setError(getErrorMessage((err as { code?: string }).code ?? ''));
    }
    setLoading(false);
  }

  // ── 新規登録処理 ─────────────────────────────────────────────
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (signupPassword.length < 6) return setError('パスワードは6文字以上で入力してください');
    if (signupPassword !== signupPasswordConfirm) return setError('パスワードが一致しません');

    setLoading(true);
    try {
      // プロフィール設定（ニックネーム等）は登録後に別画面で行うため、ここでは空文字を渡す
      await signUp(signupEmail, signupPassword, "");
    } catch (err: unknown) {
      setError(getErrorMessage((err as { code?: string }).code ?? ''));
    }
    setLoading(false);
  }

  function getErrorMessage(code: string): string {
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
      return 'メールアドレスまたはパスワードが正しくありません';
    if (code === 'auth/email-already-in-use') return 'このメールアドレスはすでに登録されています';
    if (code === 'auth/weak-password') return 'パスワードは6文字以上で入力してください';
    if (code === 'auth/invalid-email') return 'メールアドレスの形式が正しくありません';
    return 'エラーが発生しました。もう一度お試しください';
  }

  // ── スタイル共通 ──────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    background: '#0B0F17', border: '1px solid #26334D',
    borderRadius: '12px', color: '#F8FAFC', fontSize: '15px',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', color: '#CBD5E1', fontSize: '13px',
    fontWeight: 600, marginBottom: '8px',
  };
  const fieldStyle: React.CSSProperties = { marginBottom: '16px' };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0B0F17 0%, #141C2B 50%, #0B0F17 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Inter', 'Noto Sans JP', sans-serif",
    }}>
      {/* 背景装飾 */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224,109,83,0.08) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px' }}>
        {/* ロゴ */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #C4533A 0%, #E06D53 100%)',
            boxShadow: '0 8px 32px rgba(224,109,83,0.35)',
            marginBottom: '16px', fontSize: '28px',
          }}>📋</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            CareerLog
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>
            就活をSNSで、仲間と一緒に。
          </p>
        </div>

        {/* カード */}
        <div style={{
          background: 'rgba(20, 28, 43, 0.97)', backdropFilter: 'blur(20px)',
          border: '1px solid #26334D', borderRadius: '24px',
          padding: '36px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          {/* タブ */}
          <div style={{
            display: 'flex', background: '#0B0F17',
            borderRadius: '12px', padding: '4px', marginBottom: '28px',
          }}>
            {(['login', 'signup'] as Tab[]).map((t) => (
              <button key={t} onClick={() => handleTabChange(t)} style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                background: tab === t ? 'linear-gradient(135deg, #C4533A, #E06D53)' : 'transparent',
                color: tab === t ? '#fff' : '#94A3B8',
                boxShadow: tab === t ? '0 4px 12px rgba(224,109,83,0.3)' : 'none',
              }}>
                {t === 'login' ? 'ログイン' : '新規登録'}
              </button>
            ))}
          </div>

          {/* ─── ログインフォーム ─────────────────────────────── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={fieldStyle}>
                <label style={labelStyle}>メールアドレス</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="your@email.com" required style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#E06D53')}
                  onBlur={(e) => (e.target.style.borderColor = '#26334D')} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>パスワード</label>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••" required style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#E06D53')}
                  onBlur={(e) => (e.target.style.borderColor = '#26334D')} />
              </div>
              {error && <ErrorBox message={error} />}
              <SubmitButton loading={loading} label="ログイン" />
            </form>
          )}

          {/* ─── 新規登録フォーム ─────────────────────────────── */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup}>
              <div style={fieldStyle}>
                <label style={labelStyle}>メールアドレス</label>
                <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="your@email.com" required style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#E06D53')}
                  onBlur={(e) => (e.target.style.borderColor = '#26334D')} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>パスワード <span style={{ color: '#64748B', fontWeight: 400 }}>（6文字以上）</span></label>
                <input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="••••••••" required style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#E06D53')}
                  onBlur={(e) => (e.target.style.borderColor = '#26334D')} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>パスワード（確認）</label>
                <input type="password" value={signupPasswordConfirm} onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                  placeholder="••••••••" required style={{
                    ...inputStyle,
                    borderColor: signupPasswordConfirm && signupPassword !== signupPasswordConfirm
                      ? '#EF4444' : '#26334D',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#E06D53')}
                  onBlur={(e) => {
                    e.target.style.borderColor =
                      signupPasswordConfirm && signupPassword !== signupPasswordConfirm
                        ? '#EF4444' : '#26334D';
                  }} />
                {signupPasswordConfirm && signupPassword !== signupPasswordConfirm && (
                  <p style={{ color: '#FCA5A5', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>
                    パスワードが一致していません
                  </p>
                )}
              </div>

              {error && <ErrorBox message={error} />}
              <SubmitButton loading={loading} label="アカウントを作成" />

              <p style={{ color: '#475569', fontSize: '12px', textAlign: 'center', marginTop: '16px', marginBottom: 0 }}>
                登録後はプロフィール設定画面へ進みます。
              </p>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#334155', fontSize: '12px', marginTop: '24px' }}>
          © 2025 CareerLog. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: '10px', padding: '12px 14px',
      color: '#FCA5A5', fontSize: '13px', marginBottom: '16px',
    }}>
      ⚠️ {message}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading} style={{
      width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
      background: loading ? '#1E293B' : 'linear-gradient(135deg, #C4533A 0%, #E06D53 100%)',
      color: loading ? '#64748B' : '#fff',
      fontSize: '16px', fontWeight: 700,
      cursor: loading ? 'not-allowed' : 'pointer',
      boxShadow: loading ? 'none' : '0 8px 24px rgba(224,109,83,0.35)',
      transition: 'all 0.2s', letterSpacing: '0.3px',
    }}>
      {loading ? '処理中...' : label}
    </button>
  );
}
