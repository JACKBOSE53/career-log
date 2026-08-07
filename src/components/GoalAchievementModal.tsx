import { Trophy, CheckCircle2 } from 'lucide-react';

interface GoalAchievementModalProps {
  goalTitle: string;
  onClose: () => void;
}

export default function GoalAchievementModal({ goalTitle, onClose }: GoalAchievementModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 420,
          padding: '32px 24px',
          textAlign: 'center',
          borderRadius: 24,
        }}
      >
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--color-primary-glow)',
          margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trophy size={40} color="var(--color-primary)" />
        </div>

        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
          GOAL ACHIEVED
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>
          🎉 目標達成！！
        </h2>

        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          今週の目標「<strong style={{ color: 'var(--text-primary)' }}>{goalTitle}</strong>」が見事達成されました！
        </p>

        <div style={{
          background: 'var(--bg-surface-2)',
          borderRadius: 14, padding: '12px 16px', marginBottom: 20,
          fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <CheckCircle2 size={16} color="#10B981" />
          マイページのレポートに達成実績が保存されました
        </div>

        <button
          onClick={onClose}
          className="btn btn-primary"
          style={{
            width: '100%', padding: '12px 0', fontSize: '0.95rem', fontWeight: 800,
            borderRadius: 14,
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
