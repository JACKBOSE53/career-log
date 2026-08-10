import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from 'firebase/auth';
import { createUserProfile } from '../db/firestore';

export default function OnboardingPage() {
  const { currentUser } = useAuth();
  const [nickname, setNickname] = useState('');
  const [university, setUniversity] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) return setError('ニックネームを入力してください');
    if (!university.trim()) return setError('大学名を入力してください');
    if (!grade) return setError('学年（卒年）を選択してください');

    setLoading(true);
    try {
      if (currentUser) {
        // FirebaseAuth の displayName を更新
        await updateProfile(currentUser, { displayName: nickname });
        
        await createUserProfile(currentUser.uid, {
          name: nickname,
          email: currentUser.email || '',
          university,
          grade,
        });

        // 画面をリロードしてApp.tsxの条件分岐を再評価
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setError('プロフィールの保存に失敗しました');
    }
    setLoading(false);
  }

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
  const fieldStyle: React.CSSProperties = { marginBottom: '20px' };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 50%, #E2E8F0 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Inter', 'Noto Sans JP', sans-serif",
    }}>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
            プロフィールを作成
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            アプリ上で公開されるあなたのプロフィールです。
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(20px)',
          border: '1px solid #E2E8F0', borderRadius: '24px',
          padding: '32px', boxShadow: '0 20px 48px rgba(15, 23, 42, 0.08)',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={fieldStyle}>
              <label style={labelStyle}>ニックネーム <span style={{ color: '#EA580C' }}>*</span></label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                placeholder="例: たろう" required style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#EA580C')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>大学名 <span style={{ color: '#EA580C' }}>*</span></label>
              <input type="text" value={university} onChange={(e) => setUniversity(e.target.value)}
                placeholder="例: 東京大学" required style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#EA580C')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')} />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={labelStyle}>卒業予定年 <span style={{ color: '#EA580C' }}>*</span></label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)} required style={{
                ...inputStyle, appearance: 'none',
              }}>
                <option value="" disabled>選択してください</option>
                <option value="25卒">25卒</option>
                <option value="26卒">26卒</option>
                <option value="27卒">27卒</option>
                <option value="28卒">28卒</option>
                <option value="その他">その他</option>
              </select>
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '10px', padding: '12px 14px',
                color: '#DC2626', fontSize: '13px', marginBottom: '16px',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
              background: loading ? '#E2E8F0' : 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
              color: loading ? '#94A3B8' : '#fff',
              fontSize: '16px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 8px 24px rgba(234,88,12,0.25)',
              transition: 'all 0.2s',
            }}>
              {loading ? '保存中...' : 'プロフィールを保存'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
