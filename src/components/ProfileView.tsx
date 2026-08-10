import { useState, useEffect, useRef } from 'react';
import {
  Edit2, X, Save, GraduationCap,
  Calendar, Camera, Check, ChevronDown, ChevronUp, BarChart2, MessageSquare, Mail, Share2, Copy, Link, Shield, UserPlus, UserCheck,
} from 'lucide-react';
import type { JobStatus } from '../db/mockData';
import { JOB_STATUS_CONFIG, CATEGORIES } from '../db/mockData';
import {
  isFollowing, toggleFollow,
} from '../db/store';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToUserPosts,
  updateUserProfile,
  sendFollowRequest,
  unfollowUser,
  isFollowingFirestore,
  type FirestorePost,
} from '../db/firestore';
import PostCard from './PostCard';
import ReportSection from './ReportSection';

export const INDUSTRY_OPTIONS = [
  'メーカー', '商社', 'IT・Web・通信', 'コンサル・シンクタンク',
  '金融・保険', '広告・マスコミ・エンタメ', '不動産・建設',
  'インフラ・エネルギー・交通', 'サービス・人材・教育', '医療・医薬品', '公務員・団体'
];

interface ProfileViewProps {
  userId: string;
  onClose?: () => void;
  onUpdate: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function ProfileView({ userId, onClose, onUpdate, onToast }: ProfileViewProps) {
  const { profile: user, loading: userLoading } = useUserProfile(userId);
  const { currentUser, profile: myProfile } = useAuth();
  const [posts, setPosts] = useState<FirestorePost[]>([]);
  const [following, setFollowing] = useState(isFollowing(userId));
  const [followLoading, setFollowLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const isMe = userId === currentUser?.uid;

  // プロフィール下部タブ (レポート / 投稿一覧)
  const [profileTab, setProfileTab] = useState<'report' | 'posts'>('report');

  // シェア・プロフィール交換モーダル用
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // 本人登録フォーム (編集用)
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    university: string;
    grade: string;
    email: string;
    avatar: string;
    targetIndustry: string;
    bio: string;
    profileVisibility: 'public' | 'followers' | 'private';
  }>({
    name: '',
    university: '',
    grade: '26卒',
    email: '',
    avatar: '',
    targetIndustry: '',
    bio: '',
    profileVisibility: 'public',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !currentUser) return;
    // Firestore側のフォロー状態を確認
    isFollowingFirestore(currentUser.uid, userId).then((result) => {
      setFollowing(result);
    });
    setEditForm({
      name: user.name ?? '',
      university: user.university ?? '',
      grade: user.grade ?? '26卒',
      email: user.email ?? '',
      avatar: user.avatar ?? '',
      targetIndustry: user.targetIndustry ?? '',
      bio: user.bio ?? '',
      profileVisibility: user.profileVisibility ?? 'public',
    });
  }, [userId, user]);

  useEffect(() => {
    const unsubscribe = subscribeToUserPosts(userId, (newPosts) => {
      setPosts(newPosts);
    });
    return () => unsubscribe();
  }, [userId]);

  async function handleFollow() {
    if (!currentUser || followLoading) return;
    if (following) {
      setShowUnfollowConfirm(true);
      return;
    }
    setFollowLoading(true);
    try {
      // Firestoreにフォローリクエストを送信 (自分の名前・アバターを渡す)
      await sendFollowRequest(
        currentUser.uid,
        userId,
        myProfile?.name || currentUser.displayName || undefined,
        myProfile?.avatar || currentUser.photoURL || undefined,
      );
      setRequestSent(true);
      onToast?.('フォローリクエストを送信しました！', 'success');
      onUpdate();
    } catch (e) {
      console.error(e);
      onToast?.('エラーが発生しました', 'error');
    } finally {
      setFollowLoading(false);
    }
  }

  async function confirmUnfollow() {
    if (!currentUser) return;
    setShowUnfollowConfirm(false);
    setFollowLoading(true);
    try {
      await unfollowUser(currentUser.uid, userId);
      setFollowing(false);
      setRequestSent(false);
      onToast?.('フォローを解除しました', 'success');
      onUpdate();
    } catch (e) {
      console.error(e);
      onToast?.('エラーが発生しました', 'error');
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!editForm.name.trim()) {
      onToast?.('ニックネームを入力してください', 'error');
      return;
    }
    if (!currentUser) return;
    await updateUserProfile(currentUser.uid, {
      name: editForm.name.trim(),
      university: editForm.university.trim(),
      grade: editForm.grade.trim(),
      avatar: editForm.avatar,
      targetIndustry: editForm.targetIndustry.trim(),
      bio: editForm.bio.trim(),
      profileVisibility: editForm.profileVisibility,
    });
    setEditing(false);
    onUpdate();
    onToast?.('プロフィール情報を更新しました', 'success');
  }

  // 画像調整モーダル用ステート
  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropOffsetX, setCropOffsetX] = useState<number>(0);
  const [cropOffsetY, setCropOffsetY] = useState<number>(0);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setCropModalSrc(ev.target.result as string);
        setCropZoom(1);
        setCropOffsetX(0);
        setCropOffsetY(0);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function applyCroppedImage() {
    if (!cropModalSrc) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        const baseScale = Math.max(size / img.width, size / img.height);
        const finalScale = baseScale * cropZoom;
        const drawWidth = img.width * finalScale;
        const drawHeight = img.height * finalScale;
        const drawX = (size - drawWidth) / 2 + cropOffsetX * 1.5;
        const drawY = (size - drawHeight) / 2 + cropOffsetY * 1.5;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        const resultUrl = canvas.toDataURL('image/jpeg', 0.88);
        setEditForm((f) => ({ ...f, avatar: resultUrl }));
        setCropModalSrc(null);
      }
    };
    img.src = cropModalSrc;
  }

  function toggleIndustry(ind: string) {
    const currentList = editForm.targetIndustry
      ? editForm.targetIndustry.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const exists = currentList.includes(ind);
    const updated = exists ? currentList.filter((s) => s !== ind) : [...currentList, ind];
    setEditForm((f) => ({ ...f, targetIndustry: updated.join(', ') }));
  }

  function copyProfileLink() {
    const uid = user?.id ?? userId;
    const url = `${window.location.origin}${window.location.pathname}?profile=${uid}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!user) return null;

  const isOwnProfile = currentUser?.uid === userId;
  const isPrivate = !isOwnProfile && user.profileVisibility === 'private';
  const isFollowersOnly = !isOwnProfile && user.profileVisibility === 'followers' && !following;

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

      <div style={{ padding: '0 16px 0' }}>
        {/* ── Avatar row ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -44, marginBottom: 14 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              background: (editing && editForm.avatar)
                ? undefined
                : 'linear-gradient(135deg, #0F172A, #334155)',
              backgroundImage: editing && editForm.avatar
                ? `url(${editForm.avatar})`
                : (!editing && user.avatar ? `url(${user.avatar})` : undefined),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 800, color: 'white',
              border: '4px solid white',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}>
              {!(editing ? editForm.avatar : user.avatar) && user.name.substring(0, 1).toUpperCase()}
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

              {/* 4. 志望業界 (タグで複数選択可能) */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  志望業界 (タップして選択)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                  {INDUSTRY_OPTIONS.map((ind) => {
                    const currentList = editForm.targetIndustry
                      ? editForm.targetIndustry.split(',').map((s) => s.trim()).filter(Boolean)
                      : [];
                    const isSelected = currentList.includes(ind);
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => toggleIndustry(ind)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 99,
                          border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--color-primary)' : 'var(--bg-surface-2)',
                          color: isSelected ? 'white' : 'var(--text-secondary)',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}{ind}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. 自己紹介・目標 */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  自己紹介・目標メモ
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="例: IT業界志望です！夏インターンに向けてWEBテスト・面接対策に力を入れています。"
                  style={{ fontSize: '0.875rem', resize: 'vertical' }}
                />
              </div>

              {/* 6. マイページの公開範囲設定 */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  🔒 マイページの公開範囲
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { id: 'public', label: '🌐 全体に公開', desc: '全ユーザー閲覧可' },
                    { id: 'followers', label: '👥 友達だけ', desc: 'フォロワー限定' },
                    { id: 'private', label: '🔒 個人だけ', desc: '自分のみ（非公開）' },
                  ].map((opt) => {
                    const isSelected = (editForm.profileVisibility || 'public') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEditForm((f) => ({ ...f, profileVisibility: opt.id as any }))}
                        style={{
                          padding: '10px 6px', borderRadius: 12, textAlign: 'center',
                          border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-surface-2)',
                          color: isSelected ? 'var(--color-primary)' : 'var(--text-primary)',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{opt.label}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
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
                    readOnly
                    style={{ fontSize: '0.825rem', opacity: 0.7 }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── 本人情報 (閲覧モード: ニックネーム・大学・学年・志望業界・自己紹介) ── */
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 2 }}>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{user.name}</h1>
            </div>

            {/* 公開情報: 大学・学年・志望業界タグ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <GraduationCap size={16} color="var(--color-primary)" />
                  {user.university || '大学未設定'}・{user.grade || '学年未設定'}
                </span>
              </div>
              {user.targetIndustry && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>🎯 志望業界:</span>
                  {user.targetIndustry.split(',').map((s) => s.trim()).filter(Boolean).map((ind) => (
                    <span key={ind} style={{
                      padding: '3px 10px', borderRadius: 99,
                      background: 'rgba(59, 130, 246, 0.12)', color: '#60A5FA',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {ind}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 自己紹介 */}
            {user.bio && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', background: 'var(--bg-surface-2)', padding: '10px 14px', borderRadius: 12, marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {user.bio}
              </p>
            )}
          </div>
        )}

        {/* ── ★ プロフィール専用タブ（レポート欄 / 投稿一覧）は本人のみに表示 ★ ── */}
        {!isOwnProfile ? (
          <div className="card" style={{ padding: '28px 20px', textAlign: 'center', margin: '20px 0', background: 'var(--bg-surface-2)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔒</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              取り組みレポート・投稿内容は非公開です
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              プライバシー保護のため、取り組み時間レポートや過去の投稿一覧は本人のみに表示されます。
            </p>
          </div>
        ) : (isPrivate || isFollowersOnly) ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', margin: '20px 0', border: '1px dashed var(--border-color)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
              {isPrivate ? '🔒' : '👥'}
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              {isPrivate ? 'このアカウントは非公開です' : 'フォロワー限定公開のアカウントです'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              {isPrivate
                ? '公開範囲が「非公開」に設定されています。フォローリクエストを送ると、承認後にプロフィールの詳細が見られるようになります。'
                : 'フォローが承認されると、投稿や取り組みレポートを見られるようになります！'}
            </p>
            {/* フォローリクエストボタン */}
            {!following && !requestSent && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className="btn btn-primary"
                style={{ gap: 8, borderRadius: 99, padding: '10px 24px' }}
              >
                <UserPlus size={16} />
                {followLoading ? '送信中...' : 'フォローリクエストを送る'}
              </button>
            )}
            {requestSent && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(16,185,129,0.12)', color: '#10B981',
                border: '1px solid rgba(16,185,129,0.3)',
                padding: '10px 20px', borderRadius: 99, fontSize: '0.88rem', fontWeight: 700,
              }}>
                <Check size={15} />
                リクエスト送信済み
              </div>
            )}
          </div>
        ) : (
          <>
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
        </>
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {user.id}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.university} {user.grade}</p>
            </div>

            {/* 共有URLコピー ＆ LINEで直接送信 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                あなたの専用プロフィールリンク
              </label>
              
              <button
                onClick={() => {
                  const url = `${window.location.origin}/profile/${user.id}`;
                  const text = encodeURIComponent(`CareerLogで一緒に就活しよう！僕/私のプロフィールはこちら👇\n${url}`);
                  window.open(`https://line.me/R/msg/text/?${text}`, '_blank');
                }}
                style={{
                  width: '100%', padding: '12px 0', fontSize: '0.9rem', fontWeight: 800,
                  borderRadius: 12, border: 'none', background: '#06C755', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(6, 199, 85, 0.25)',
                  marginBottom: 10, transition: 'all 0.15s',
                }}
              >
                💬 LINEで友達に直接送る
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  readOnly
                  className="input"
                  value={`${window.location.origin}/profile/${user.id}`}
                  style={{ fontSize: '0.8rem', flex: 1 }}
                />
                <button
                  onClick={copyProfileLink}
                  className="btn btn-secondary"
                  style={{ flexShrink: 0, gap: 6 }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'コピー完了' : 'URLコピー'}
                </button>
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              LINEで送るボタンをタップすると、そのままLINEアプリが開いて送信相手を選べます！
            </p>
          </div>
        </div>
      )}

      {/* ── 画像サイズ・切り抜き位置調整モーダル ── */}
      {cropModalSrc && (
        <div className="modal-overlay" onClick={() => setCropModalSrc(null)}>
          <div className="modal-content animate-scaleUp" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>アイコンのサイズ・位置の微調整</h3>
              <button onClick={() => setCropModalSrc(null)} className="btn btn-ghost btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* 円形プレビュー */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{
                width: 140, height: 140, borderRadius: '50%',
                overflow: 'hidden', border: '3px solid var(--color-primary)',
                position: 'relative', background: '#0F172A',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}>
                <img
                  src={cropModalSrc}
                  alt="プレビュー"
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transform: `scale(${cropZoom}) translate(${cropOffsetX}px, ${cropOffsetY}px)`,
                    transition: 'transform 0.05s ease-out',
                  }}
                />
              </div>
            </div>

            {/* スライダーコントロール群 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {/* 🔍 拡大・縮小 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>🔍 画像の拡大・縮小</span>
                  <span>{Math.round(cropZoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                />
              </div>

              {/* ↔️ 左右の位置 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>↔️ 左右の位置</span>
                  <span>{cropOffsetX}px</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="1"
                  value={cropOffsetX}
                  onChange={(e) => setCropOffsetX(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                />
              </div>

              {/* ↕️ 上下の位置 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>↕️ 上下の位置</span>
                  <span>{cropOffsetY}px</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="1"
                  value={cropOffsetY}
                  onChange={(e) => setCropOffsetY(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                />
              </div>
            </div>

            {/* アクションボタン */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setCropModalSrc(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                キャンセル
              </button>
              <button
                onClick={applyCroppedImage}
                className="btn btn-primary"
                style={{ flex: 1.5, fontWeight: 700 }}
              >
                このサイズで適用
              </button>
            </div>
          </div>
        </div>
      )}
      {/* フォロー解除確認ダイアログ */}
      {showUnfollowConfirm && (
        <div className="modal-overlay" onClick={() => setShowUnfollowConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, padding: 24, textAlign: 'center', borderRadius: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              フォローを解除しますか？
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              @{user.name} さんの限定投稿や更新情報が見られなくなります。
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowUnfollowConfirm(false)}
                className="btn btn-secondary"
                style={{ flex: 1, borderRadius: 12 }}
              >
                キャンセル
              </button>
              <button
                onClick={confirmUnfollow}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                  background: '#EF4444', color: 'white', fontWeight: 700, fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                解除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
