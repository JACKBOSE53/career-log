import { useState, useRef } from 'react';
import { X, Globe, Lock, EyeOff, Clock, Image as ImageIcon } from 'lucide-react';
import { CATEGORIES, INTERVIEW_SUB_TAGS } from '../db/mockData';
import type { Category } from '../db/mockData';
import { createPost } from '../db/firestore';
import { useAuth } from '../contexts/AuthContext';
import CategoryBadge from './CategoryBadge';
import VerticalTimePicker from './VerticalTimePicker';
import GoalAchievementModal from './GoalAchievementModal';
import { getLocalDateStr } from '../utils/dateUtils';

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated: () => void;
  defaultCategory?: Category;
  defaultStudySeconds?: number;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function CreatePostModal({ onClose, onPostCreated, defaultCategory, defaultStudySeconds, onToast }: CreatePostModalProps) {
  const [category, setCategory] = useState<Category>(defaultCategory ?? 'ES');
  const [selectedSubTag, setSelectedSubTag] = useState<string>('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  // タイマーからの遷移でない場合は手動入力用に使うステート
  const [studyMinutes, setStudyMinutes] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');

  const [step, setStep] = useState<'category' | 'details'>(defaultStudySeconds !== undefined ? 'details' : 'category');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentUser, profile } = useAuth();
  const effectiveVisibility = profile?.profileVisibility || 'public';

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 500; // 超軽量化（高画質を維持しつつ数10KBに圧縮）
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.70); // 高圧縮（完全0円用）
          setImageUrl(compressed);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  const [achievedGoalTitle, setAchievedGoalTitle] = useState<string | null>(null);

  async function handleSubmit() {
    if (!currentUser) {
      if (onToast) onToast('投稿するにはログインが必要です', 'error');
      return;
    }

    const trimmedContent = content.trim();
    const userId = currentUser.uid;
    const finalContent = trimmedContent || (selectedSubTag ? `${selectedSubTag}を行いました` : `${category}の活動を記録しました`);

    setSubmitting(true);

    const autoTitle = selectedSubTag
      ? `【${selectedSubTag}】${finalContent.length > 15 ? finalContent.substring(0, 15) + '...' : finalContent}`
      : (finalContent.length > 20 ? finalContent.substring(0, 20) + '...' : finalContent);

    const finalStudyMinutes = defaultStudySeconds !== undefined 
      ? defaultStudySeconds / 60 
      : (studyMinutes ? Number(studyMinutes) : undefined);

    const todayStr = getLocalDateStr();
    const postPayload: Record<string, any> = {
      userId,
      userName: currentUser.displayName || 'ユーザー',
      userAvatar: currentUser.photoURL || '',
      category,
      title: autoTitle,
      content: finalContent,
      tags: selectedSubTag ? [selectedSubTag] : [],
      visibility: effectiveVisibility,
      date: todayStr,
    };

    if (finalStudyMinutes !== undefined && !isNaN(finalStudyMinutes)) {
      postPayload.studyMinutes = finalStudyMinutes;
    }
    if (imageUrl) {
      postPayload.imageUrl = imageUrl;
    }

    try {
      await createPost(postPayload as any);
      setSubmitting(false);
      if (onToast) onToast('投稿が完了しました！', 'success');
      onPostCreated();
      onClose();
    } catch (e: any) {
      console.error('Post creation error:', e);
      setSubmitting(false);
      if (onToast) onToast(`投稿に失敗しました: ${e.message || '権限エラー'}`, 'error');
    }
  }

  const isValid = true;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)',
          position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1,
          borderRadius: '24px 24px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.25rem', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', borderRadius: '50%', color: 'white', fontWeight: 'bold' }}>
              {currentUser?.displayName?.[0] || 'U'}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{currentUser?.displayName || 'ユーザー'}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-secondary)' }} aria-label="閉じる">
            <X size={20} />
          </button>
        </div>

        {step === 'category' ? (
          /* Category Selection */
          <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>カテゴリを選択</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 20 }}>今日の就活活動の種類を選んでください</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    setStep('details');
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 6, padding: '16px 8px',
                    border: `2px solid ${cat.id === category ? cat.color : 'var(--border-color)'}`,
                    borderRadius: 16,
                    background: cat.id === category ? `${cat.color}10` : 'var(--bg-surface-2)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '1.75rem' }}>{cat.emoji}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: cat.id === category ? cat.color : 'var(--text-secondary)' }}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Details */
          <div style={{ padding: 24 }}>
            {/* Back to category */}
            <button
              onClick={() => setStep('category')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, color: 'var(--color-primary)', fontSize: '0.8125rem', fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            >
              ← カテゴリを変更
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <CategoryBadge category={category} />
            </div>

            {/* 面接が選択された時のサブタグ選択パネル */}
            {category === '面接' && (
              <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 14, background: '#FAFAFC', border: '1px solid #F1F5F9' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span>🗣️</span>
                  <span>面接のステップを選択（タップで選択）</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {INTERVIEW_SUB_TAGS.map((tag) => {
                    const isSelected = selectedSubTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedSubTag(tag)}
                        style={{
                          padding: '5px 12px', borderRadius: 20,
                          fontSize: '0.75rem', fontWeight: isSelected ? 600 : 400,
                          background: isSelected ? '#FFF1F2' : '#FFFFFF',
                          color: isSelected ? '#F43F5E' : 'var(--text-secondary)',
                          border: `1px solid ${isSelected ? '#FFE4E6' : '#E2E8F0'}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: 'none',
                        }}
                      >
                        {isSelected ? '✓ ' : ''}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 全カテゴリ共通：取り組み時間ドラムピッカー */}
              <div>
                {defaultStudySeconds !== undefined ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                      計測された集中時間
                    </label>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>
                      {String(Math.floor(defaultStudySeconds / 3600)).padStart(2, '0')}:
                      {String(Math.floor((defaultStudySeconds % 3600) / 60)).padStart(2, '0')}:
                      {String(defaultStudySeconds % 60).padStart(2, '0')}
                    </div>
                  </div>
                ) : (
                  <>
                    <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={16} color="var(--color-primary)" />
                      取り組み時間 (上下スライドで時間・分を選択)
                    </label>
                    <VerticalTimePicker
                      initialHour={0}
                      initialMinute={0}
                      minuteStep={1}
                      onChange={(h, m) => {
                        const totalMins = h * 60 + m;
                        setStudyMinutes(totalMins > 0 ? String(totalMins) : '');
                      }}
                    />
                  </>
                )}
              </div>

              {/* Content */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                  就活の感想・今日の記録 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  className="input textarea"
                  placeholder={category === '面接' ? "例：面接の雰囲気は和やかでした！自己PRの深掘り質問に落ち着いて答えられた。手ごたえや反省点を自由に記録しよう！" : "例：今日の就活アクティビティの記録や感想を自由に書こう！"}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                />
                <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {content.length} 文字
                </div>
              </div>

              {/* Photo Selection / スマホ・PC連動の写真選択 */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                  写真を選択 <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(任意)</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {!imageUrl ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary"
                    style={{
                      width: '100%', padding: '14px 0', borderRadius: 14,
                      fontSize: '0.9rem', fontWeight: 700, gap: 8,
                      border: '1.5px dashed var(--border-color)',
                      background: 'var(--bg-surface-2)',
                    }}
                  >
                    <ImageIcon size={18} color="var(--color-primary)" />
                    写真を選択する
                  </button>
                ) : (
                  <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                    <img
                      src={imageUrl}
                      alt="選択された写真"
                      style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 14, border: '1px solid var(--border-color)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      style={{
                        position: 'absolute', top: 10, right: 10,
                        background: 'rgba(15, 23, 42, 0.75)', color: 'white', border: 'none',
                        borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(4px)',
                      }}
                      title="写真を削除"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>



            </div>
          </div>
        )}

        {/* Footer - Submit */}
        {step === 'details' && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            position: 'sticky', bottom: 0, background: 'var(--bg-surface)', borderRadius: '0 0 24px 24px',
          }}>
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={submitting}
              style={{
                opacity: submitting ? 0.6 : 1,
                width: '100%', padding: '14px 0', fontSize: '1rem', fontWeight: 800,
                borderRadius: 14,
              }}
            >
              {submitting ? '投稿中...' : '投稿する'}
            </button>
          </div>
        )}
      </div>

      {achievedGoalTitle && (
        <GoalAchievementModal
          goalTitle={achievedGoalTitle}
          onClose={() => {
            setAchievedGoalTitle(null);
            onPostCreated();
            onClose();
          }}
        />
      )}
    </div>
  );
}
