import { useState, useRef } from 'react';
import { X, Globe, Lock, EyeOff, Clock, Image as ImageIcon } from 'lucide-react';
import { CATEGORIES } from '../db/mockData';
import type { Category } from '../db/mockData';
import { createPost, getCurrentUser } from '../db/store';
import CategoryBadge from './CategoryBadge';
import VerticalTimePicker from './VerticalTimePicker';
import GoalAchievementModal from './GoalAchievementModal';

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated: () => void;
  defaultCategory?: Category;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function CreatePostModal({ onClose, onPostCreated, defaultCategory }: CreatePostModalProps) {
  const [category, setCategory] = useState<Category>(defaultCategory ?? 'ES');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [studyMinutes, setStudyMinutes] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');

  const [step, setStep] = useState<'category' | 'details'>('category');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const me = getCurrentUser();
  const needsStudyTime = category === 'SPI' || category === '自己分析';

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImageUrl(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  const [achievedGoalTitle, setAchievedGoalTitle] = useState<string | null>(null);

  function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);

    const autoTitle = content.trim().length > 20
      ? content.trim().substring(0, 20) + '...'
      : content.trim();

    setTimeout(() => {
      const res = createPost({
        category,
        title: autoTitle,
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
        tags: [],
        studyMinutes: studyMinutes ? parseInt(studyMinutes) : undefined,
        visibility: me.defaultVisibility || 'public',
      });
      setSubmitting(false);

      if (res.isGoalAchieved) {
        setAchievedGoalTitle(res.goalTitle || '今週の目標');
      } else {
        onPostCreated();
        onClose();
      }
    }, 400);
  }

  const isValid = content.trim().length > 0;

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
            <span style={{ fontSize: '1.25rem', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', borderRadius: '50%' }}>
              {me.avatar}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{me.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{me.handle}</div>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Study time vertical drum picker for SPI/自己分析 */}
              {needsStudyTime && (
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} color="var(--color-primary)" />
                    取り組み時間 (上下スライドで時間・分を選択)
                  </label>
                  <VerticalTimePicker
                    initialHour={1}
                    initialMinute={30}
                    minuteStep={1}
                    onChange={(h, m) => {
                      const totalMins = h * 60 + m;
                      setStudyMinutes(totalMins > 0 ? String(totalMins) : '');
                    }}
                  />
                </div>
              )}

              {/* Content */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                  就活の感想・今日の記録 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  className="input textarea"
                  placeholder="例：今日はSPIの言語領域を解いた！長文読解のスピードをもう少し意識しよう。"
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
              disabled={!isValid || submitting}
              style={{
                opacity: (!isValid || submitting) ? 0.6 : 1,
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
