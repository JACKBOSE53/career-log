import { useState } from 'react';
import { Eye, EyeOff, Check, ArrowLeft, ArrowRight, UserCheck, Shield, Sparkles, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createUserProfile } from '../db/firestore';

interface SignupWizardProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

const GRADUATION_YEARS = ['25卒', '26卒', '27卒', '28卒', '29卒', 'その他'];

const INDUSTRY_OPTIONS = [
  'IT・通信・Web',
  'メーカー・製造',
  '金融・保険',
  'コンサルティング',
  '商社（総合・専門）',
  'マスコミ・広告',
  '人材・教育',
  '不動産・建設',
  'インフラ・エネルギー',
  '小売・サービス',
  '公務員・団体',
  'その他',
];

export default function SignupWizard({
  onSwitchToLogin,
  onOpenTerms,
  onOpenPrivacy,
}: SignupWizardProps) {
  const { signup } = useAuth();

  // ── ステップ管理 (1〜4) ───────────────────────────────────
  const [step, setStep] = useState<number>(1);

  // ── フォームステート ─────────────────────────────────────────
  // Step 1: 基本情報① (認証)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: 基本情報② (プロフィール基本)
  const [nickname, setNickname] = useState('');
  const [university, setUniversity] = useState('');
  const [grade, setGrade] = useState('');

  // Step 3: 志望業界・公開範囲
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'followers' | 'private'>('public');

  // ── 共通状態 ──────────────────────────────────────────────
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── エラーメッセージの日本語化 ──────────────────────────────
  function getFriendlyErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に登録されています。ログインをお試しください。';
      case 'auth/invalid-email':
        return '正しいメールアドレスの形式で入力してください。';
      case 'auth/weak-password':
        return 'パスワードは6文字以上で設定してください。';
      case 'auth/network-request-failed':
        return '通信エラーが発生しました。ネットワーク接続をご確認ください。';
      default:
        return '登録に失敗しました。もう一度お試しください。';
    }
  }

  // ── バリデーション & 次へ ──────────────────────────────────
  function handleNextStep() {
    setError('');

    if (step === 1) {
      if (!email.trim() || !email.includes('@')) {
        return setError('有効なメールアドレスを入力してください');
      }
      if (password.length < 6) {
        return setError('パスワードは6文字以上で入力してください');
      }
      if (password !== passwordConfirm) {
        return setError('パスワードが一致しません');
      }
      setStep(2);
    } else if (step === 2) {
      if (!nickname.trim()) {
        return setError('ニックネームを入力してください');
      }
      if (!university.trim()) {
        return setError('大学名を入力してください');
      }
      if (!grade) {
        return setError('卒業予定年（学年）を選択してください');
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  }

  function handlePrevStep() {
    setError('');
    if (step > 1) {
      setStep(step - 1);
    }
  }

  function toggleIndustry(ind: string) {
    if (selectedIndustries.includes(ind)) {
      setSelectedIndustries(selectedIndustries.filter((i) => i !== ind));
    } else {
      setSelectedIndustries([...selectedIndustries, ind]);
    }
  }

  // ── 最終送信（アカウント作成 ＆ プロフィール保存）────────────
  async function handleFinalSubmit() {
    setError('');
    setLoading(true);

    try {
      // 1. Firebase Authentication アカウント作成
      const user = await signup(email.trim(), password, nickname.trim());

      // 2. Firestore に完全なプロフィール情報を保存
      await createUserProfile(user.uid, {
        id: user.uid,
        name: nickname.trim(),
        email: email.trim(),
        university: university.trim(),
        grade,
        targetIndustry: selectedIndustries.join(', '),
        bio: bio.trim(),
        profileVisibility,
      });

      // 成功時は画面を再読み込みしてメイン画面へ誘導
      window.location.reload();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      console.error('SignupWizard error:', err);
      const friendlyMsg = getFriendlyErrorMessage(code);
      setError(friendlyMsg);

      // メール重複などの認証エラー時はステップ1へ戻して再入力を促す
      if (code.startsWith('auth/')) {
        setStep(1);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── スタイル定義 ──────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    color: '#0F172A',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '8px',
  };

  const stepLabels = ['基本情報①', '基本情報②', '志望業界', '入力確認'];

  return (
    <div style={{ width: '100%' }}>
      {/* ── ステッパーUI ────────────────────────────────────── */}
      <div style={{ marginBottom: 28, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {/* 背景ライン */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '24px',
            right: '24px',
            height: '2px',
            background: '#E2E8F0',
            zIndex: 0,
          }} />
          {/* 進捗ライン */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '24px',
            width: `${((step - 1) / (stepLabels.length - 1)) * 88}%`,
            height: '2px',
            background: 'linear-gradient(90deg, #EA580C 0%, #F97316 100%)',
            zIndex: 1,
            transition: 'width 0.3s ease',
          }} />

          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isDone = step > stepNum;
            const isCurrent = step === stepNum;

            return (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  zIndex: 2,
                  position: 'relative',
                  cursor: isDone ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (isDone) setStep(stepNum);
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                  background: isDone
                    ? '#EA580C'
                    : isCurrent
                    ? '#FFF7ED'
                    : '#FFFFFF',
                  color: isDone
                    ? '#FFFFFF'
                    : isCurrent
                    ? '#EA580C'
                    : '#94A3B8',
                  border: isDone
                    ? '2px solid #EA580C'
                    : isCurrent
                    ? '2px solid #EA580C'
                    : '2px solid #E2E8F0',
                  boxShadow: isCurrent ? '0 0 0 3px rgba(234, 88, 12, 0.15)' : 'none',
                }}>
                  {isDone ? <Check size={16} strokeWidth={3} /> : stepNum}
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#EA580C' : isDone ? '#475569' : '#94A3B8',
                  whiteSpace: 'nowrap',
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── エラーアラート ──────────────────────────────────── */}
      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          color: '#DC2626',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '13px',
          marginBottom: '20px',
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* ── 各ステップのコンテンツ ────────────────────────────── */}
      <div>
        {/* STEP 1: メール & パスワード */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>
                メールアドレス <span style={{ color: '#EA580C' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@univ.ac.jp"
                autoComplete="email"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#EA580C')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div>
              <label style={labelStyle}>
                パスワード <span style={{ color: '#EA580C' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上の半角英数"
                  autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={(e) => (e.target.style.borderColor = '#EA580C')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: '#94A3B8', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                パスワード（確認） <span style={{ color: '#EA580C' }}>*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="もう一度入力してください"
                autoComplete="new-password"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#EA580C')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>
          </div>
        )}

        {/* STEP 2: ニックネーム・大学名・卒業予定年 */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={labelStyle}>
                ニックネーム <span style={{ color: '#EA580C' }}>*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例: たろう"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#EA580C')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
              <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                他の就活生に表示される名前です（後からいつでも変更できます）
              </span>
            </div>

            <div>
              <label style={labelStyle}>
                大学名 <span style={{ color: '#EA580C' }}>*</span>
              </label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="例: ○○大学"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#EA580C')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div>
              <label style={labelStyle}>
                卒業予定年（学年） <span style={{ color: '#EA580C' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {GRADUATION_YEARS.map((y) => {
                  const isSelected = grade === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setGrade(y)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #EA580C' : '1px solid #E2E8F0',
                        background: isSelected ? '#FFF7ED' : '#FFFFFF',
                        color: isSelected ? '#EA580C' : '#334155',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: 志望業界・自己紹介・公開範囲 */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={labelStyle}>
                志望業界 <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 400 }}>（複数選択可・任意）</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '4px 0' }}>
                {INDUSTRY_OPTIONS.map((ind) => {
                  const isSelected = selectedIndustries.includes(ind);
                  return (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => toggleIndustry(ind)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '99px',
                        border: isSelected ? '1px solid #EA580C' : '1px solid #E2E8F0',
                        background: isSelected ? '#FFF7ED' : '#FFFFFF',
                        color: isSelected ? '#EA580C' : '#475569',
                        fontSize: '12px',
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? `✓ ${ind}` : ind}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                自己紹介・目標メモ <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 400 }}>（任意）</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="例: サマーインターンに向けてWebテスト対策中です！"
                rows={2}
                style={{
                  ...inputStyle,
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
                onFocus={(e) => (e.target.style.borderColor = '#EA580C')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div>
              <label style={labelStyle}>
                マイページの公開範囲
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { value: 'public', label: '全体公開 (おすすめ)', desc: '他の就活生と繋がり励まし合えます' },
                  { value: 'followers', label: 'フォロワー限定', desc: 'あなたが承認した友達のみ閲覧できます' },
                  { value: 'private', label: '自分のみ (非公開)', desc: '個人専用の非公開ログとして利用します' },
                ].map((opt) => {
                  const isSelected = profileVisibility === opt.value;
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: isSelected ? '1px solid #EA580C' : '1px solid #E2E8F0',
                        background: isSelected ? '#FFF7ED' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={opt.value}
                        checked={isSelected}
                        onChange={() => setProfileVisibility(opt.value as 'public' | 'followers' | 'private')}
                        style={{ marginTop: '3px', accentColor: '#EA580C' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#EA580C' : '#1E293B' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {opt.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: 入力内容確認 */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              {/* アカウント情報 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Shield size={14} color="#EA580C" /> アカウント情報
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{ background: 'none', border: 'none', color: '#EA580C', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    編集
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: '#0F172A', paddingLeft: '19px' }}>
                  {email} / パスワード設定済み
                </div>
              </div>

              {/* 基本情報 */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <UserCheck size={14} color="#EA580C" /> 基本プロフィール
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    style={{ background: 'none', border: 'none', color: '#EA580C', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    編集
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: '#0F172A', paddingLeft: '19px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div><strong>名前:</strong> {nickname}</div>
                  <div><strong>大学:</strong> {university} ({grade})</div>
                </div>
              </div>

              {/* 志望業界 & 公開設定 */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Building2 size={14} color="#EA580C" /> 就活設定
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    style={{ background: 'none', border: 'none', color: '#EA580C', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    編集
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: '#0F172A', paddingLeft: '19px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>
                    <strong>志望業界:</strong> {selectedIndustries.length > 0 ? selectedIndustries.join(', ') : '未選択'}
                  </div>
                  {bio && <div><strong>自己紹介:</strong> {bio}</div>}
                  <div>
                    <strong>公開範囲:</strong>{' '}
                    {profileVisibility === 'public' ? '全体公開' : profileVisibility === 'followers' ? 'フォロワー限定' : '非公開'}
                  </div>
                </div>
              </div>
            </div>

            {/* 規約同意の案内 */}
            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.6, textAlign: 'center', margin: '4px 0 0' }}>
              登録ボタンを押すことで、
              <button
                type="button"
                onClick={onOpenTerms}
                style={{ background: 'none', border: 'none', color: '#EA580C', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '12px' }}
              >
                利用規約
              </button>
              および
              <button
                type="button"
                onClick={onOpenPrivacy}
                style={{ background: 'none', border: 'none', color: '#EA580C', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '12px' }}
              >
                プライバシーポリシー
              </button>
              に同意したものとみなされます。
            </p>
          </div>
        )}
      </div>

      {/* ── ナビゲーションボタン（戻る・次へ・作成） ──────────── */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        {step > 1 && (
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={loading}
            style={{
              flex: 1,
              padding: '13px',
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '12px',
              color: '#475569',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.2s ease',
            }}
          >
            <ArrowLeft size={16} /> 戻る
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={handleNextStep}
            style={{
              flex: step > 1 ? 2 : 1,
              padding: '13px',
              background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            次へ <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={loading}
            style={{
              flex: 2,
              padding: '13px',
              background: loading
                ? '#94A3B8'
                : 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(234, 88, 12, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? (
              <span>アカウントを作成中...</span>
            ) : (
              <>
                <Sparkles size={16} /> アカウントを作成
              </>
            )}
          </button>
        )}
      </div>

      {/* ── ログインへの切替リンク ──────────────────────────── */}
      {onSwitchToLogin && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748B' }}>
            すでにアカウントをお持ちですか？{' '}
          </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#EA580C',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ログイン
          </button>
        </div>
      )}
    </div>
  );
}
