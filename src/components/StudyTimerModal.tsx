import { useState, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, X, Clock, CheckCircle2 } from 'lucide-react';
import { CATEGORIES } from '../db/mockData';
import type { Category } from '../db/mockData';
import CreatePostModal from './CreatePostModal';

interface StudyTimerModalProps {
  onClose: () => void;
  onPostCreated: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function StudyTimerModal({ onClose, onPostCreated, onToast }: StudyTimerModalProps) {
  const [category, setCategory] = useState<Category>('テスト');
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (!isRunning && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, seconds]);

  function handleStart() {
    setIsRunning(true);
  }

  function handlePause() {
    setIsRunning(false);
  }

  function handleReset() {
    setIsRunning(false);
    setSeconds(0);
  }

  function handleComplete() {
    setIsRunning(false);
    setShowPostModal(true);
  }

  // 時間フォーマット (00:00:00)
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const timeStr = `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const measuredMinutes = Math.max(1, Math.round(seconds / 60));

  if (showPostModal) {
    return (
      <CreatePostModal
        defaultCategory={category}
        defaultStudySeconds={seconds}
        onClose={() => {
          setShowPostModal(false);
          onClose();
        }}
        onPostCreated={() => {
          onPostCreated();
          onClose();
        }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-scaleUp" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, padding: 28, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={20} color="var(--color-primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>就活集中タイマー</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* カテゴリ選択 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
            集中する取り組みを選択
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  padding: '6px 14px', borderRadius: 99,
                  border: `1.5px solid ${cat.id === category ? cat.color : 'var(--border-color)'}`,
                  background: cat.id === category ? `${cat.color}15` : 'var(--bg-surface-2)',
                  color: cat.id === category ? cat.color : 'var(--text-secondary)',
                  fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 巨大デジタルタイマー表示 */}
        <div style={{
          background: 'var(--bg-surface-2)',
          borderRadius: 24, padding: '32px 20px',
          marginBottom: 24, border: '2px solid var(--border-color)',
          boxShadow: isRunning ? '0 0 24px rgba(15,23,42,0.1)' : 'none',
        }}>
          <div style={{
            fontFamily: 'monospace', fontSize: '3.5rem', fontWeight: 900,
            color: isRunning ? 'var(--color-primary)' : 'var(--text-primary)',
            letterSpacing: 2, lineHeight: 1,
          }}>
            {timeStr}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12, fontWeight: 600 }}>
            {isRunning ? '計測中... 集中して取り組みましょう！' : seconds > 0 ? '一時停止中' : 'スタートボタンを押して計測開始'}
          </div>
        </div>

        {/* コントロールボタン群 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="btn btn-primary"
              style={{
                padding: '14px 28px', fontSize: '1rem', fontWeight: 800,
                borderRadius: 99, gap: 8, flex: 1,
              }}
            >
              <Play size={18} fill="white" /> {seconds === 0 ? 'タイマースタート' : '再開'}
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="btn btn-secondary"
              style={{
                padding: '14px 24px', fontSize: '1rem', fontWeight: 800,
                borderRadius: 99, gap: 8, flex: 1,
              }}
            >
              <Pause size={18} /> 一時停止
            </button>
          )}

          {(!isRunning && seconds > 0) && (
            <button
              onClick={handleReset}
              className="btn btn-ghost btn-icon"
              style={{ padding: 12, borderRadius: '50%', background: 'var(--bg-surface-2)' }}
              title="リセット"
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>

        {/* 完了＆記録ボタン */}
        {(!isRunning && seconds > 0) && (
          <button
            onClick={handleComplete}
            className="btn btn-primary"
            style={{
              width: '100%', marginTop: 16, padding: '14px 0',
              fontSize: '0.95rem', fontWeight: 800, borderRadius: 16,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              gap: 8,
            }}
          >
            <CheckCircle2 size={18} /> この記録を投稿する？
          </button>
        )}
      </div>
    </div>
  );
}
