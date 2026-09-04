import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LegalModal from '../components/LegalModal';
import SignupWizard from './SignupWizard';

type Tab = 'login' | 'signup';

export default function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>('login');

  // ── 規約モーダル状態 ───────────────────────────────────────
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);

  // ── ログインフォーム状態 ──────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      await login(loginEmail, loginPassword);
    } catch (err: unknown) {
      setError(getErrorMessage((err as { code?: string }).code ?? ''));
    }
    setLoading(false);
  }

  function getErrorMessage(code: string): string {
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
      return 'メールアドレスまたはパスワードが正しくありません';
    if (code === 'auth/invalid-email') return 'メールアドレスの形式が正しくありません';
    return 'エラーが発生しました。もう一度お試しください';
  }

  // ── スタイル共通 ──────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    background: '#FFFFFF', border: '1px solid #E2E8F0',
    borderRadius: '12px', color: '#0F172A', fontSize: '15px',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', color: '#475569', fontSize: '13px',
    fontWeight: 600, marginBottom: '8px',
  };
  const fieldStyle: React.CSSProperties = { marginBottom: '16px' };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 50%, #E2E8F0 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Inter', 'Noto Sans JP', sans-serif",
    }}>
      {/* 背景装飾 */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234,88,12,0.05) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.04) 0%, transparent 70%)',
        }} />
      </div>

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: tab === 'signup' ? '500px' : '440px',
        transition: 'max-width 0.25s ease',
      }}>
        {/* ロゴ */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
            boxShadow: '0 8px 32px rgba(234,88,12,0.25)',
            marginBottom: '16px', fontSize: '28px',
          }}>📋</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            CareerLog
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            就活をSNSで、仲間と一緒に。
          </p>
        </div>

        {/* カード */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(20px)',
          border: '1px solid #E2E8F0', borderRadius: '24px',
          padding: '36px', boxShadow: '0 20px 48px rgba(15, 23, 42, 0.08)',
        }}>
          {/* タブ */}
          <div style={{
            display: 'flex', background: '#F1F5F9',
            borderRadius: '12px', padding: '4px', marginBottom: '28px',
          }}>
            {(['login', 'signup'] as Tab[]).map((t) => (
              <button key={t} onClick={() => handleTabChange(t)} style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                background: tab === t ? 'linear-gradient(135deg, #EA580C, #F97316)' : 'transparent',
                color: tab === t ? '#fff' : '#64748B',
                boxShadow: tab === t ? '0 4px 12px rgba(234,88,12,0.25)' : 'none',
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
                  onFocus={(e) => (e.target.style.borderColor = '#EA580C')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>パスワード</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="パスワードを入力" required style={{ ...inputStyle, paddingRight: 40 }}
                    onFocus={(e) => (e.target.style.borderColor = '#EA580C')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4, display: 'flex'
                  }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && <ErrorBox message={error} />}
              <SubmitButton loading={loading} label="ログイン" />
            </form>
          )}

          {/* ─── 新規登録ウィザード ─────────────────────────── */}
          {tab === 'signup' && (
            <SignupWizard
              onSwitchToLogin={() => handleTabChange('login')}
              onOpenTerms={() => setLegalModalType('terms')}
              onOpenPrivacy={() => setLegalModalType('privacy')}
            />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: '20px', fontSize: '12px', color: '#64748B' }}>
          <button type="button" onClick={() => setLegalModalType('terms')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', textDecoration: 'underline' }}>
            利用規約
          </button>
          <span>•</span>
          <button type="button" onClick={() => setLegalModalType('privacy')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', textDecoration: 'underline' }}>
            プライバシーポリシー
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#64748B', fontSize: '12px', marginTop: '8px' }}>
          © 2026 CareerLog. All rights reserved.
        </p>
      </div>

      {legalModalType && (
        <LegalModal type={legalModalType} onClose={() => setLegalModalType(null)} />
      )}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '10px', padding: '12px 14px',
      color: '#DC2626', fontSize: '13px', marginBottom: '16px',
    }}>
      ⚠️ {message}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading} style={{
      width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
      background: loading ? '#E2E8F0' : 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
      color: loading ? '#94A3B8' : '#fff',
      fontSize: '16px', fontWeight: 700,
      cursor: loading ? 'not-allowed' : 'pointer',
      boxShadow: loading ? 'none' : '0 8px 24px rgba(234,88,12,0.25)',
      transition: 'all 0.2s', letterSpacing: '0.3px',
    }}>
      {loading ? '処理中...' : label}
    </button>
  );
}
