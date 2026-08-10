import { useState, useEffect, useRef } from 'react';
import {
  Heart, MessageCircle, Bookmark, Share2, Building2,
  Clock, ChevronDown, ChevronUp, Send, X, MoreHorizontal, Trash
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Category } from '../db/mockData';
import { useUserProfile } from '../hooks/useUserProfile';
import type { FirestorePost } from '../db/firestore';
import { formatFirestoreDate } from '../db/firestore';

import {
  isSaved, toggleSave,
  getCurrentUser,
  isFollowing, toggleFollow,
} from '../db/store';
import { subscribeToComments, addComment, toggleLikePost, type FirestoreComment, deletePost } from '../db/firestore';
import CategoryBadge from './CategoryBadge';

interface PostCardProps {
  post: FirestorePost;
  onUpdate: () => void;
  onProfileClick?: (userId: string) => void;
  showFollowButton?: boolean;
  onFollowUpdate?: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

const PASTEL_CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; badgeBg: string }> = {
  ES: { bg: 'rgba(37, 99, 235, 0.15)', text: '#3B82F6', border: 'rgba(37, 99, 235, 0.4)', badgeBg: 'rgba(37, 99, 235, 0.25)' },
  テスト: { bg: 'rgba(139, 92, 246, 0.15)', text: '#A855F7', border: 'rgba(139, 92, 246, 0.4)', badgeBg: 'rgba(139, 92, 246, 0.25)' },
  面接: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.5)', badgeBg: 'rgba(239, 68, 68, 0.3)' },
  GD: { bg: 'rgba(236, 72, 153, 0.15)', text: '#EC4899', border: 'rgba(236, 72, 153, 0.4)', badgeBg: 'rgba(236, 72, 153, 0.25)' },
  説明会: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.4)', badgeBg: 'rgba(245, 158, 11, 0.25)' },
  OB訪問: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.4)', badgeBg: 'rgba(16, 185, 129, 0.25)' },
  インターン: { bg: 'rgba(249, 115, 22, 0.15)', text: '#F97316', border: 'rgba(249, 115, 22, 0.4)', badgeBg: 'rgba(249, 115, 22, 0.25)' },
  その他: { bg: 'rgba(100, 116, 139, 0.15)', text: '#94A3B8', border: 'rgba(100, 116, 139, 0.4)', badgeBg: 'rgba(100, 116, 139, 0.25)' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時間前`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}日前`;
  return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

export default function PostCard({ post, onUpdate, onProfileClick, showFollowButton = true, onFollowUpdate, onToast }: PostCardProps) {
  const { currentUser } = useAuth();
  const myId = currentUser?.uid;
  const { profile: author, loading: authorLoading } = useUserProfile(post.userId);
  const [liked, setLiked] = useState(post.likedUserIds?.includes(currentUser?.uid || '') || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [saved, setSaved] = useState(isSaved(post.id || ''));
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [comments, setComments] = useState<FirestoreComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [following, setFollowing] = useState(isFollowing(post.userId));
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [needsExpand, setNeedsExpand] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  function handleFollowClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!author?.id) return;
    const result = toggleFollow(author.id);
    setFollowing(result);
    onToast?.(result ? `${author.name}さんをフォローしました！` : `${author.name}さんのフォローを解除しました`, 'success');
    onFollowUpdate?.();
    onUpdate();
  }

  async function handleDelete() {
    if (!post.id) return;
    if (confirm('この投稿を取り消しますか？')) {
      await deletePost(post.id);
      onToast?.('投稿を取り消しました', 'success');
      setShowMenu(false);
      onUpdate();
    }
  }

  useEffect(() => {
    setLiked(post.likedUserIds?.includes(myId || '') || false);
    setSaved(isSaved(post.id || ''));
    setLikesCount(post.likesCount);
    setCommentsCount(post.commentsCount);
    
    if (post.id) {
      const unsubscribe = subscribeToComments(post.id, (fetchedComments) => {
        setComments(fetchedComments);
      });
      return () => unsubscribe();
    }
  }, [post, myId]);

  useEffect(() => {
    if (textRef.current) {
      setNeedsExpand(textRef.current.scrollHeight > 80);
    }
  }, [post.content]);

  async function handleLike() {
    if (!post.id || !myId) return;
    const isCurrentlyLiked = liked;
    const newLiked = !isCurrentlyLiked;
    setLiked(newLiked);
    setLikesCount((c) => newLiked ? c + 1 : Math.max(0, c - 1));
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 600);
    
    await toggleLikePost(post.id, myId, isCurrentlyLiked);
    onToast?.(newLiked ? 'いいねしました！' : 'いいねを取り消しました', 'success');
    onUpdate();
  }

  function handleSave() {
    const result = toggleSave(post.id || '');
    setSaved(result);
    onToast?.(result ? 'ブックマークに保存しました！' : 'ブックマークを解除しました', 'success');
    onUpdate();
  }

  function handleShare() {
    const url = `${window.location.origin}/#post-${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      onToast?.('投稿リンクをコピーしました！', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleComment() {
    if (!commentInput.trim() || !post.id || !myId) return;
    await addComment(post.id, myId, commentInput.trim());
    setCommentInput('');
    onToast?.('コメントを送信しました！', 'success');
    onUpdate();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleComment();
    }
  }

  if (!author) return null;

  return (
    <article className="card card-hover animate-fadeInUp" id={`post-${post.id}`} style={{ marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <button
            className="avatar avatar-md"
            onClick={() => onProfileClick?.(post.userId)}
            title={author.name}
            style={{ flexShrink: 0, cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}
          >
            <span style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem',
            }}>
              {author.avatar}
            </span>
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => onProfileClick?.(post.userId)}
                style={{ fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer', border: 'none', background: 'none', padding: 0, color: 'var(--text-primary)' }}
              >
                {author.name}
              </button>
              {post.userId === myId && (
                <span className="badge" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-light)' }}>自分</span>
              )}
              {showFollowButton && post.userId !== myId && (
                <button
                  onClick={handleFollowClick}
                  style={{
                    padding: '2px 10px',
                    borderRadius: 'var(--border-radius-full)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    ...(following
                      ? { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }
                      : { background: 'var(--color-primary)', color: 'white', border: 'none' }
                    ),
                  }}
                  aria-label={following ? 'フォロー中' : 'フォローする'}
                >
                  {following ? 'フォロー中' : '+ フォロー'}
                </button>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {timeAgo(formatFirestoreDate(post.createdAt))}
            </div>
          </div>

          {/* 三点リーダー (自分のみ削除可能) */}
          {(post.userId === myId || post.userId === 'user-me') && (
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="btn btn-ghost btn-sm btn-icon"
                style={{ color: 'var(--text-muted)', padding: 4 }}
                aria-label="メニュー"
              >
                <MoreHorizontal size={18} />
              </button>
              {showMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%',
                  background: 'var(--bg-surface-2)', border: '1px solid var(--border-color)',
                  borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 30, minWidth: 120, overflow: 'hidden'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', border: 'none', background: 'none',
                      color: '#EF4444', fontSize: '0.8rem', fontWeight: 600,
                      cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    <Trash size={14} />
                    取り消す
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 感想・本文コメント (一番上に表示) */}
        <div style={{ position: 'relative', marginBottom: 10, marginTop: 4 }}>
          <p
            ref={textRef}
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              lineHeight: 1.65,
              whiteSpace: 'pre-line',
              maxHeight: expanded ? 'none' : '90px',
              overflow: expanded ? 'visible' : 'hidden',
              transition: 'max-height 0.3s ease',
            }}
          >
            {post.content}
          </p>
          {!expanded && needsExpand && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 30,
              background: 'linear-gradient(transparent, var(--bg-surface))',
            }} />
          )}
        </div>

        {needsExpand && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 500, marginBottom: 10, border: 'none', background: 'none', cursor: 'pointer' }}
          >
            {expanded ? <><ChevronUp size={14} /> 折りたたむ</> : <><ChevronDown size={14} /> 続きを読む</>}
          </button>
        )}

        {/* Image (ある場合) */}
        {post.imageUrl && (
          <div style={{ marginBottom: 12, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <img src={post.imageUrl} alt="投稿画像" style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />
          </div>
        )}

        {/* タグの色がついた「ひとつの大きなタグ風ブロック」 (内容のタグ ＋ 取り組み時間) */}
        {(() => {
          const style = PASTEL_CATEGORY_STYLES[post.category] || PASTEL_CATEGORY_STYLES['その他'];
          return (
            <div style={{
              background: style.bg,
              border: `1.5px solid ${style.border}`,
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
              {/* 左側: カテゴリ ＋ 面接ステップタグ (内容のタグ) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  background: style.badgeBg,
                  color: style.text,
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                }}>
                  {post.category}
                </span>
                {post.tags && post.tags.length > 0 && (
                  <span style={{
                    background: 'var(--bg-surface)',
                    color: style.text,
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    border: `1px solid ${style.border}`,
                  }}>
                    {post.tags[0]}
                  </span>
                )}
              </div>

              {/* 右側: 取り組み時間 */}
              {post.studyMinutes ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: style.text,
                }}>
                  <Clock size={14} />
                  <span>
                    {(() => {
                      const rounded = Math.ceil(post.studyMinutes);
                      if (rounded >= 60) {
                        return `${Math.floor(rounded / 60)}時間 ${rounded % 60 > 0 ? `${rounded % 60}分` : ''}`;
                      }
                      return `${rounded}分`;
                    })()}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: style.text, opacity: 0.8 }}>記録完了</span>
              )}
            </div>
          );
        })()}

        {/* Divider */}
        <hr className="divider" style={{ marginBottom: 12 }} />

        {/* Action Bar (保存とシェアは削除、いいねとコメントのみ) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Like */}
          <button
            onClick={handleLike}
            className="btn btn-ghost btn-sm"
            style={{
              gap: 6,
              color: liked ? '#EF4444' : 'var(--text-muted)',
              fontWeight: liked ? 700 : 500,
              fontSize: '0.8125rem',
            }}
            aria-label="いいね"
          >
            <Heart
              size={16}
              fill={liked ? '#EF4444' : 'none'}
              style={{
                animation: likeAnimating ? 'heartBeat 0.6s ease' : 'none',
                transition: 'transform var(--transition-spring)',
              }}
            />
            {likesCount > 0 && <span>{likesCount}</span>}
          </button>

          {/* Comment */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="btn btn-ghost btn-sm"
            style={{ gap: 6, color: showComments ? 'var(--color-primary)' : 'var(--text-muted)', fontSize: '0.8125rem' }}
            aria-label="コメント"
          >
            <MessageCircle size={16} />
            {commentsCount > 0 && <span>{commentsCount}</span>}
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12, animation: 'fadeInUp 0.2s ease' }}>
            {comments.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                まだコメントがありません
              </p>
            )}
            {comments.map((c) => (
              <CommentItem key={c.id || c.createdAt.toString()} comment={c} />
            ))}

            {/* Comment Input */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, minWidth: 0 }}>
              <span style={{ fontSize: '1rem', flexShrink: 0, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', borderRadius: '50%', color: 'white', fontWeight: 'bold' }}>
                {currentUser?.displayName?.[0] || 'U'}
              </span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="コメントを追加..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{ borderRadius: 'var(--border-radius-full)', padding: '8px 16px', fontSize: '0.875rem' }}
                />
                <button
                  onClick={handleComment}
                  className="btn btn-primary btn-sm"
                  disabled={!commentInput.trim()}
                  style={{ borderRadius: 'var(--border-radius-full)', flexShrink: 0 }}
                  aria-label="送信"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function CommentItem({ comment }: { comment: FirestoreComment }) {
  const { profile, loading } = useUserProfile(comment.userId);

  if (loading) return <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>読み込み中...</div>;
  if (!profile) return null;

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: '1rem', flexShrink: 0, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-2)', borderRadius: '50%', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
        {profile.name?.[0] || 'U'}
      </span>
      <div style={{ flex: 1, background: 'var(--bg-surface-2)', borderRadius: 12, padding: '8px 12px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{profile.name}</span>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{comment.content}</p>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
          {timeAgo(formatFirestoreDate(comment.createdAt))}
        </span>
      </div>
    </div>
  );
}
