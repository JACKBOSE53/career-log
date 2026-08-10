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
    background: '#0B0F17', border: '1px solid #26334D',
    borderRadius: '12px', color: '#F8FAFC', fontSize: '15px',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', color: '#CBD5E1', fontSize: '13px',
    fontWeight: 600, marginBottom: '8px',
  };
  const fieldStyle: React.CSSProperties = { marginBottom: '20px' };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0B0F17 0%, #141C2B 50%, #0B0F17 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Inter', 'Noto Sans JP', sans-serif",
    }}>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 8px' }}>
            プロフィールを作成
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>
            アプリ上で公開されるあなたのプロフィールです。
          </p>
        </div>

        <div style={{
          background: 'rgba(20, 28, 43, 0.97)', backdropFilter: 'blur(20px)',
          border: '1px solid #26334D', borderRadius: '24px',
          padding: '32px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={fieldStyle}>
              <label style={labelStyle}>ニックネーム <span style={{ color: '#E06D53' }}>*</span></label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                placeholder="例: たろう" required style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#E06D53')}
                onBlur={(e) => (e.target.style.borderColor = '#26334D')} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>大学名 <span style={{ color: '#E06D53' }}>*</span></label>
              <input type="text" value={university} onChange={(e) => setUniversity(e.target.value)}
                placeholder="例: 東京大学" required style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#E06D53')}
                onBlur={(e) => (e.target.style.borderColor = '#26334D')} />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={labelStyle}>卒業予定年 <span style={{ color: '#E06D53' }}>*</span></label>
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
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px', padding: '12px 14px',
                color: '#FCA5A5', fontSize: '13px', marginBottom: '16px',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
              background: loading ? '#1E293B' : 'linear-gradient(135deg, #C4533A 0%, #E06D53 100%)',
              color: loading ? '#64748B' : '#fff', fontSize: '16px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 8px 24px rgba(224,109,83,0.35)',
              transition: 'all 0.2s', letterSpacing: '0.3px',
            }}>
              {loading ? '保存中...' : 'はじめる'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
