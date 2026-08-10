import { useState, useEffect, useRef } from 'react';
import {
  Edit2, X, Save, GraduationCap,
  Calendar, Camera, Check, ChevronDown, ChevronUp, BarChart2, MessageSquare, Mail, Share2, Copy, Link, Shield, UserPlus, UserCheck,
} from 'lucide-react';
import type { JobStatus } from '../db/mockData';
import { JOB_STATUS_CONFIG, CATEGORIES } from '../db/mockData';
import {
  getUserById, getUserStats, getPostsByUser, getCurrentUserId,
  isFollowing, toggleFollow, updateCurrentUser,
} from '../db/store';
import PostCard from './PostCard';
import ReportSection from './ReportSection';

interface ProfileViewProps {
  userId: string;
  onClose?: () => void;
  onUpdate: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function ProfileView({ userId, onClose, onUpdate, onToast }: ProfileViewProps) {
  const [user, setUser] = useState(getUserById(userId));
  const [stats, setStats] = useState(getUserStats(userId));
  const [posts, setPosts] = useState(getPostsByUser(userId));
  const [following, setFollowing] = useState(isFollowing(userId));
  const isMe = userId === getCurrentUserId();

  // プロフィール下部タブ (レポート / 投稿一覧)
  const [profileTab, setProfileTab] = useState<'report' | 'posts'>('report');

  // シェア・プロフィール交換モーダル用
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // 本人登録フォーム (編集用)
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name ?? '',
    university: user?.university ?? '',
    grade: user?.grade ?? '',
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? '',
    defaultVisibility: (user?.defaultVisibility ?? 'public') as 'public' | 'followers' | 'private',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = getUserById(userId);
    setUser(u);
    setStats(getUserStats(userId));
    setPosts(getPostsByUser(userId));
    setFollowing(isFollowing(userId));
    setEditForm({
      name: u?.name ?? '',
      university: u?.university ?? '',
      grade: u?.grade ?? '26卒 (大学3年)',
      email: u?.email ?? '',
      avatarUrl: u?.avatarUrl ?? '',
      defaultVisibility: (u?.defaultVisibility ?? 'public') as 'public' | 'followers' | 'private',
    });
  }, [userId]);

  function handleFollow() {
    const result = toggleFollow(userId);
    setFollowing(result);
    setUser(getUserById(userId));
    onUpdate();
  }

  function handleSaveProfile() {
    if (!editForm.name.trim()) {
      onToast?.('ニックネームを入力してください', 'error');
      return;
    }
    updateCurrentUser({
      name: editForm.name.trim(),
      university: editForm.university.trim(),
      grade: editForm.grade.trim(),
      email: editForm.email.trim(),
      avatarUrl: editForm.avatarUrl,
      defaultVisibility: editForm.defaultVisibility,
    });
    setUser(getUserById(userId));
    setEditing(false);
    onUpdate();
    onToast?.('プロフィール情報を更新しました', 'success');
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditForm((f) => ({ ...f, avatarUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function copyProfileLink() {
    const url = `${window.location.origin}/profile/@${user?.handle ?? 'user'}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!user) return null;

  return (
    <div style={{ animation: 'fadeIn 0.2s ease', paddingBottom: 40 }}>
      {/* ── Banner ── */}
      <div style={{
        height: 130,
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #334155 100%)',
        position: 'relative',
      }}>
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{
              position: 'absolute', top: 12, left: 12,
              color: 'white', background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%', backdropFilter: 'blur(4px)',
            }}
            aria-label="戻る"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ padding: '0 20px 0' }}>
        {/* ── Avatar row ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -44, marginBottom: 14 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              background: (editing && editForm.avatarUrl)
                ? undefined
                : 'linear-gradient(135deg, #0F172A, #334155)',
              backgroundImage: (editing && editForm.avatarUrl)
                ? `url(${editForm.avatarUrl})`
                : (!editing && user.avatarUrl ? `url(${user.avatarUrl})` : undefined),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 800, color: 'white',
              border: '4px solid white',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}>
              {!(editing ? editForm.avatarUrl : user.avatarUrl) && user.name.substring(0, 1).toUpperCase()}
            </div>
            {/* Upload image button */}
            {editing && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 0, right: -4,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--color-primary)', color: 'white',
                    border: '2px solid white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                  title="アイコン画像を変更"
                >
                  <Camera size={14} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              </>
            )}
          </div>

          {/* Action buttons (自分用 vs 他人用) */}
          <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
            {isMe ? (
              /* 【自分用 (個人用) アクションボタン】 */
              editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="btn btn-secondary btn-sm">
                    キャンセル
                  </button>
                  <button onClick={handleSaveProfile} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                    <Save size={14} /> 保存
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowShareModal(true)} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                    <Share2 size={14} /> プロフィールをシェア
                  </button>
                  <button onClick={() => setEditing(true)} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                    <Edit2 size={14} /> 編集
                  </button>
                </>
              )
            ) : (
              /* 【他人用 アクションボタン】 */
              <button
                onClick={handleFollow}
                className={following ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                style={{ gap: 6, padding: '8px 18px', borderRadius: 99 }}
              >
                {following ? (
                  <>
                    <UserCheck size={14} /> フォロー中
                  </>
                ) : (
                  <>
                    <UserPlus size={14} /> フォローする
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── 本人登録フォーム (編集モード: 自分のみ) ── */}
        {isMe && editing ? (
          <div className="card" style={{ padding: 18, marginBottom: 20, animation: 'fadeInUp 0.15s ease' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)' }}>
              本人登録情報の編集
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0 16px' }}>
              {/* 1. ニックネーム */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  ニックネーム <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例: 高木 悠太"
                  style={{ fontSize: '0.875rem' }}
                />
              </div>

              {/* 2. 通っている大学 */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  大学名
                </label>
                <input
                  className="input"
                  value={editForm.university}
                  onChange={(e) => setEditForm((f) => ({ ...f, university: e.target.value }))}
                  placeholder="例: 早稲田大学"
                  style={{ fontSize: '0.875rem' }}
                />
              </div>

              {/* 3. 学年 */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  学年 (卒業年)
                </label>
                <input
                  className="input"
                  value={editForm.grade}
                  onChange={(e) => setEditForm((f) => ({ ...f, grade: e.target.value }))}
                  placeholder="例: 26卒 (大学3年)"
                  style={{ fontSize: '0.875rem' }}
                />
              </div>

              {/* ── 基本ログイン情報 ── */}
              <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-surface-2)', border: '1px solid var(--border-color)', marginTop: 4 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  🔒 基本アカウント情報
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="yuta@example.com"
                    style={{ fontSize: '0.825rem' }}
                  />
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  パスワードの変更は、ログイン方法の設定から行えます。
                </div>
              </div>

              {/* デフォルトの投稿公開設定 */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  デフォルトの投稿公開設定
                </label>
                <select
                  className="input"
                  value={editForm.defaultVisibility || 'public'}
                  onChange={(e) => setEditForm((f) => ({ ...f, defaultVisibility: e.target.value as any }))}
                  style={{ fontSize: '0.875rem' }}
                >
                  <option value="public">全体公開 (すべてのユーザー)</option>
                  <option value="followers">フォロワーのみ公開</option>
                  <option value="private">非公開 (自分のみ)</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* ── 本人情報 (閲覧モード: ニックネーム・大学・学年) ── */
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 2 }}>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{user.name}</h1>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>@{user.handle}</p>

            {/* 公開情報: 大学・学年のみ (メールアドレスは完全非公開) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <GraduationCap size={16} color="var(--color-primary)" />
                {user.university || '大学未設定'}・{user.grade || '学年未設定'}
              </span>
            </div>
          </div>
        )}

        {/* ── ★ プロフィール専用タブ（レポート欄 / 投稿一覧） ★ ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
          borderBottom: '1px solid var(--border-color)', marginBottom: 16,
        }}>
          <button
            onClick={() => setProfileTab('report')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '12px 0', border: 'none', background: 'transparent',
              fontFamily: 'inherit', fontWeight: profileTab === 'report' ? 700 : 500,
              fontSize: '0.9rem',
              color: profileTab === 'report' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: profileTab === 'report' ? '3px solid var(--color-primary)' : '3px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <BarChart2 size={16} />
            レポート欄
          </button>

          <button
            onClick={() => setProfileTab('posts')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '12px 0', border: 'none', background: 'transparent',
              fontFamily: 'inherit', fontWeight: profileTab === 'posts' ? 700 : 500,
              fontSize: '0.9rem',
              color: profileTab === 'posts' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: profileTab === 'posts' ? '3px solid var(--color-primary)' : '3px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <MessageSquare size={16} />
            投稿一覧 ({posts.length})
          </button>
        </div>

        {/* ── 【1】レポート欄タブの中身 (完全版ReportSection) ── */}
        {profileTab === 'report' && (
          <div style={{ animation: 'fadeIn 0.15s ease' }}>
            <ReportSection onUpdate={onUpdate} hideHeaderTab={true} />
          </div>
        )}

        {/* ── 【2】投稿一覧タブの中身 ── */}
        {profileTab === 'posts' && (
          <div style={{ animation: 'fadeIn 0.15s ease' }}>
            {posts.length === 0 ? (
              <div className="empty-state" style={{ paddingTop: 40, paddingBottom: 40 }}>
                <p className="empty-state-title">まだ投稿がありません</p>
                <p className="empty-state-desc">「記録する」から就活の取り組みを投稿しよう！</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} onUpdate={onUpdate} />
              ))
            )}
          </div>
        )}
      </div>

      {/* ── プロフィールをシェア / アカウント交換モーダル ── */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content animate-scaleUp" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>プロフィールをシェア・交換</h3>
              <button onClick={() => setShowShareModal(false)} className="btn btn-ghost btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
                background: 'linear-gradient(135deg, #0F172A, #334155)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', fontWeight: 800, color: 'white',
              }}>
                {user.name.substring(0, 1).toUpperCase()}
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{user.name}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{user.handle} ・ {user.university} {user.grade}</p>
            </div>

            {/* 共有URLコピー */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                あなたの専用プロフィールリンク
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  readOnly
                  className="input"
                  value={`${window.location.origin}/profile/@${user.handle}`}
                  style={{ fontSize: '0.8rem', flex: 1 }}
                />
                <button
                  onClick={copyProfileLink}
                  className="btn btn-primary"
                  style={{ flexShrink: 0, gap: 6 }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'コピー完了' : 'コピー'}
                </button>
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              LINEやX(Twitter)に貼り付けて友達にアカウントをシェアしよう！
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
