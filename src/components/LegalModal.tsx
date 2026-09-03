import { X, Shield, FileText } from 'lucide-react';

interface LegalModalProps {
  type: 'terms' | 'privacy';
  onClose: () => void;
}

export default function LegalModal({ type, onClose }: LegalModalProps) {
  const isTerms = type === 'terms';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 600,
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
          padding: 0,
          overflow: 'hidden',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-surface-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isTerms ? <FileText size={18} color="#2563EB" /> : <Shield size={18} color="#10B981" />}
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {isTerms ? '利用規約' : 'プライバシーポリシー'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon btn-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          fontSize: '0.85rem',
          lineHeight: 1.75,
          color: 'var(--text-primary)',
        }}>
          {isTerms ? (
            <div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                本利用規約は、CareerLog（以下「本サービス」）の利用条件を定めるものです。
              </p>

              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginTop: 16, marginBottom: 6, color: '#2563EB' }}>
                第1条（適用）
              </h4>
              <p>ユーザーは、本サービスの利用を開始した時点で、本規約の内容に同意したものとみなされます。</p>

              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginTop: 16, marginBottom: 6, color: '#2563EB' }}>
                第2条（禁止事項）
              </h4>
              <ul style={{ paddingLeft: 20, margin: '6px 0' }}>
                <li><strong>秘密保持義務（NDA）違反</strong>: 企業の選考やインターン等で守秘義務のある情報の公開・漏洩。</li>
                <li><strong>他者への誹謗中傷・プライバシー侵害</strong>。</li>
                <li><strong>虚偽の経歴・選考結果の流布</strong>。</li>
                <li><strong>不正アクセスおよびサービス妨害行為</strong>。</li>
              </ul>

              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginTop: 16, marginBottom: 6, color: '#2563EB' }}>
                第3条（免責事項）
              </h4>
              <p>
                本サービスは就職活動の記録・共有を支援するツールであり、ユーザーの内定獲得や選考通過を保証するものではありません。
                また、ユーザー間または求人企業との紛争について運営者は責任を負いません。
              </p>

              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginTop: 16, marginBottom: 6, color: '#2563EB' }}>
                第4条（規約の変更）
              </h4>
              <p>運営者は必要に応じて本規約を変更できるものとし、変更後に本サービスを利用した時点で同意したものとみなされます。</p>

              <div style={{ marginTop: 24, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                制定日: 2026年9月4日
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                CareerLog（以下「本サービス」）は、ユーザーの個人情報の保護を重要視し、以下の方針に基づいて取り扱います。
              </p>

              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginTop: 16, marginBottom: 6, color: '#10B981' }}>
                1. 収集する情報
              </h4>
              <p>
                氏名（ニックネーム）、メールアドレス、大学名、学年、志望業界、自己紹介、就活記録（ES、面接、テスト等のカテゴリ・メモ・時間）、カレンダー予定、フォロー関係。
              </p>

              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginTop: 16, marginBottom: 6, color: '#10B981' }}>
                2. 利用目的
              </h4>
              <p>
                本人認証、タイムライン表示、マイページの活動統計・推移グラフ作成、カレンダー機能の提供、不具合対応およびサービスの改善のために利用します。
              </p>

              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginTop: 16, marginBottom: 6, color: '#10B981' }}>
                3. 第三者提供および外部クラウド
              </h4>
              <p>
                法令に基づく場合を除き、無断で第三者に提供することはありません。インフラとして Google Firebase（Firestore/Auth）および Vercel を利用しています。
              </p>

              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginTop: 16, marginBottom: 6, color: '#10B981' }}>
                4. 公開範囲の管理
              </h4>
              <p>
                ユーザーは投稿やプロフィールごとに公開範囲（全体公開 / フォロワー限定 / 非公開）を設定できます。
              </p>

              <div style={{ marginTop: 24, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                制定日: 2026年9月4日
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--bg-surface-2)',
        }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ borderRadius: 10, padding: '6px 18px' }}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
