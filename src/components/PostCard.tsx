import { useState, useEffect, useRef } from 'react';
import {
  Heart, MessageCircle, Bookmark, Share2, Building2,
  Clock, ChevronDown, ChevronUp, Send, X
} from 'lucide-react';
import type {
  Post, User,
} from '../db/mockData';

import {
  isLiked, toggleLike, isSaved, toggleSave,
  getCommentsByPost, addComment, getUserById,
  getCurrentUserId, getCurrentUser,
  isFollowing, toggleFollow,
} from '../db/store';
import CategoryBadge from './CategoryBadge';

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
  onProfileClick?: (userId: string) => void;
  showFollowButton?: boolean;
  onFollowUpdate?: () => void;
}

const PASTEL_CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; badgeBg: string }> = {
  ES: { bg: '#1E3A8A28', text: '#60A5FA', border: '#1E40AF55', badgeBg: '#1E3A8A55' },
  SPI: { bg: '#4C1D9528', text: '#C084FC', border: '#5B21B655', badgeBg: '#4C1D9555' },
  WEBテスト: { bg: '#07598528', text: '#38BDF8', border: '#0369A155', badgeBg: '#07598555' },
  面接: { bg: '#88133728', text: '#FB7185', border: '#9F123955', badgeBg: '#88133755' },
  OB訪問: { bg: '#78350F28', text: '#FBBF24', border: '#92400E55', badgeBg: '#78350F55' },
  説明会: { bg: '#064E3B28', text: '#34D399', border: '#065F4655', badgeBg: '#064E3B55' },
  自己分析: { bg: '#312E8128', text: '#818CF8', border: '#3730A355', badgeBg: '#312E8155' },
  GD: { bg: '#83184328', text: '#F472B6', border: '#9D174D55', badgeBg: '#83184355' },
  インターン: { bg: '#7C2D1228', text: '#FB923C', border: '#9A341255', badgeBg: '#7C2D1255' },
  その他: { bg: '#1E293B44', text: '#94A3B8', border: '#33415555', badgeBg: '#1E293B66' },
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

export default function PostCard({ post, onUpdate, onProfileClick, showFollowButton, onFollowUpdate }: PostCardProps) {
  const [liked, setLiked] = useState(() => isLiked(post.id));
  const [saved, setSaved] = useState(() => isSaved(post.id));
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(getCommentsByPost(post.id));
  const [commentInput, setCommentInput] = useState('');
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [needsExpand, setNeedsExpand] = useState(false);
  const [following, setFollowing] = useState(() => isFollowing(post.userId));

  const author = getUserById(post.userId);
  const myId = getCurrentUserId();

  function handleFollowClick(e: React.MouseEvent) {
    e.stopPropagation();
    const result = toggleFollow(post.userId);
    setFollowing(result);
    onFollowUpdate?.();
    onUpdate();
  }

  useEffect(() => {
    setLiked(isLiked(post.id));
    setSaved(isSaved(post.id));
    setLikesCount(post.likesCount);
    setComments(getCommentsByPost(post.id));
    setCommentsCount(post.commentsCount);
  }, [post]);

  useEffect(() => {
    if (textRef.current) {
      setNeedsExpand(textRef.current.scrollHeight > 80);
    }
  }, [post.content]);

  function handleLike() {
    const result = toggleLike(post.id);
    setLiked(result);
    setLikesCount((c) => result ? c + 1 : Math.max(0, c - 1));
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 600);
    onUpdate();
  }

  function handleSave() {
    const result = toggleSave(post.id);
    setSaved(result);
    onUpdate();
  }

  function handleShare() {
    const url = `${window.location.origin}/#post-${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleComment() {
    if (!commentInput.trim()) return;
    addComment(post.id, commentInput.trim());
    setComments(getCommentsByPost(post.id));
    setCommentsCount((c) => c + 1);
    setCommentInput('');
    onUpdate();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleComment();
    }
  }

  if (!author) return null;

  return (
    <article className="card card-hover animate-fadeInUp" id={`post-${post.id}`} style={{ marginBottom: 12 }}>
      <div style={{ padding: '16px 20px' }}>
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
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{author.handle}</span>
              {post.userId === myId && (
                <span className="badge" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-light)' }}>自分</span>
              )}
              {/* フォローボタン: すべての人タブで自分以外に表示 */}
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
                      : { background: 'var(--gradient-primary)', color: 'white', border: 'none', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }
                    ),
                  }}
                  aria-label={following ? 'フォロー中' : 'フォローする'}
                >
                  {following ? 'フォロー中' : '+ フォロー'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{author.university}</span>
              <span style={{ color: 'var(--border-color)', fontSize: '0.75rem' }}>·</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(post.createdAt)}</span>
            </div>
          </div>

          <CategoryBadge category={post.category} />
        </div>

        {/* 記号なし・目が疲れない淡いトーンの「取り組み内容＆時間」カード */}
        {(() => {
          const style = PASTEL_CATEGORY_STYLES[post.category] || PASTEL_CATEGORY_STYLES['その他'];
          return (
            <div style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderRadius: 16,
              padding: '14px 18px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: style.text, marginBottom: 2 }}>
                  {post.category} の取り組み
                </div>
                {post.studyMinutes ? (
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: style.text }}>
                    取り組み時間 {post.studyMinutes >= 60
                      ? `${Math.floor(post.studyMinutes / 60)}時間 ${post.studyMinutes % 60 > 0 ? `${post.studyMinutes % 60}分` : ''}`
                      : `${post.studyMinutes}分`}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: style.text }}>
                    活動内容を記録
                  </div>
                )}
              </div>

              <span style={{
                background: style.badgeBg,
                color: style.text,
                padding: '4px 12px',
                borderRadius: 99,
                fontSize: '0.75rem',
                fontWeight: 600,
                border: `1px solid ${style.border}`,
              }}>
                {post.category}
              </span>
            </div>
          );
        })()}



        {/* Content */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <p
            ref={textRef}
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
              maxHeight: expanded ? 'none' : '80px',
              overflow: expanded ? 'visible' : 'hidden',
              transition: 'max-height 0.3s ease',
            }}
          >
            {post.content}
          </p>
          {!expanded && needsExpand && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
              background: 'linear-gradient(transparent, white)',
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

        {/* Image */}
        {post.imageUrl && (
          <div style={{ marginBottom: 12, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <img src={post.imageUrl} alt="投稿画像" style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />
          </div>
        )}



        {/* Divider */}
        <hr className="divider" style={{ marginBottom: 12 }} />

        {/* Action Bar */}
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

          {/* Save */}
          <button
            onClick={handleSave}
            className="btn btn-ghost btn-sm btn-icon"
            style={{ color: saved ? '#F59E0B' : 'var(--text-muted)' }}
            aria-label="保存"
          >
            <Bookmark size={16} fill={saved ? '#F59E0B' : 'none'} />
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="btn btn-ghost btn-sm btn-icon"
            style={{ color: copied ? '#10B981' : 'var(--text-muted)', marginLeft: 'auto' }}
            aria-label="シェア"
          >
            {copied ? <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>コピー済</span> : <Share2 size={16} />}
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
            {comments.map((c) => {
              const commenter = getUserById(c.userId);
              if (!commenter) return null;
              return (
                <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-2)', borderRadius: '50%', border: '1px solid var(--border-color)' }}>
                    {commenter.avatar}
                  </span>
                  <div style={{ flex: 1, background: 'var(--bg-surface-2)', borderRadius: 12, padding: '8px 12px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{commenter.name}</span>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{c.content}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>{timeAgo(c.createdAt)}</span>
                  </div>
                </div>
              );
            })}

            {/* Comment Input */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: '1rem', flexShrink: 0, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', borderRadius: '50%' }}>
                {getCurrentUserAvatar()}
              </span>
              <div style={{ flex: 1, display: 'flex', gap: 8 }}>
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

function getCurrentUserAvatar(): string {
  return getCurrentUser().avatar;
}
