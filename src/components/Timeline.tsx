import { useState, useEffect, useRef } from 'react';
import { Plus, RefreshCw, Users, Globe, Timer } from 'lucide-react';
import { subscribeToPosts, getLocalPosts, subscribeToFollowingUids, type FirestorePost } from '../db/firestore';
import { isFollowing } from '../db/store';
import { useAuth } from '../contexts/AuthContext';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import StudyTimerModal from './StudyTimerModal';

interface TimelineProps {
  onUpdate: () => void;
  onProfileClick: (userId: string) => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

type FeedTab = 'friends' | 'everyone';

export default function Timeline({ onUpdate, onProfileClick, onToast }: TimelineProps) {
  const [feedTab, setFeedTab] = useState<FeedTab>('everyone');
  const [posts, setPosts] = useState<FirestorePost[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const { currentUser } = useAuth();
  const myId = currentUser?.uid;

  const latestFirestorePosts = useRef<FirestorePost[]>([]);

  const mergeAndSetPosts = (firestorePosts: FirestorePost[]) => {
    const currentLocals = getLocalPosts();
    const map = new Map<string, FirestorePost>();
    currentLocals.forEach((p) => { if (p.id) map.set(p.id, p); });
    firestorePosts.forEach((p) => { if (p.id) map.set(p.id, p); });
    
    const sorted = Array.from(map.values()).sort((a, b) => {
      const getMillis = (dateVal: any) => {
        if (!dateVal) return 0;
        if (dateVal instanceof Date) return dateVal.getTime();
        if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
        return new Date(dateVal).getTime() || 0;
      };
      return getMillis(b.createdAt) - getMillis(a.createdAt);
    });
    setPosts(sorted);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPosts((allPosts) => {
      latestFirestorePosts.current = allPosts;
      mergeAndSetPosts(allPosts);
    });

    const handleAutoUpdate = () => {
      mergeAndSetPosts(latestFirestorePosts.current);
    };

    window.addEventListener('career_log_data_updated', handleAutoUpdate);
    return () => {
      unsubscribe();
      window.removeEventListener('career_log_data_updated', handleAutoUpdate);
    };
  }, []);

  useEffect(() => {
    if (!myId) return;
    const unsub = subscribeToFollowingUids(myId, (uids) => {
      setFollowingUids(uids);
    });
    return () => unsub();
  }, [myId]);

  // ユーザー指示に基づく厳格なプライバシーフィルター
  const filteredPosts = posts.filter((post) => {
    if (post.visibility === 'private') return false; // 個人限定は非表示

    if (feedTab === 'everyone') {
      // 「全員のタイムライン(みんなのひろば)」: 全体公開(public/未設定)のみ表示！
      return post.visibility === 'public' || !post.visibility;
    } else {
      // 「友達のタイムライン」: 自分の投稿またはフォロー中の友達で、public か followers のものを表示！
      const isMyPost = post.userId === myId || post.userId === 'user-me';
      const isFriend = followingUids.includes(post.userId) || isFollowing(post.userId);
      return (isMyPost || isFriend) && (post.visibility === 'public' || post.visibility === 'followers' || !post.visibility);
    }
  });

  function handlePostCreated() {
    setShowModal(false);
    mergeAndSetPosts(latestFirestorePosts.current);
    onUpdate();
  }

  function handleFeedTabChange(tab: FeedTab) {
    setFeedTab(tab);
  }

  return (
    <div>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky', top: 0,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        zIndex: 10,
        borderBottom: '1px solid var(--border-color)',
        marginBottom: 16,
        paddingTop: 8,
      }}>
        {/* Top row: title + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 10px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>タイムライン</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowTimerModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ gap: 6, borderRadius: 99 }}
            >
              <Timer size={15} /> タイマー
            </button>
            <button
              onClick={() => {}} // Firestoreの場合は自動同期なのでリロード不要
              className="btn btn-ghost btn-icon btn-sm"
              style={{ color: 'var(--text-muted)', opacity: 0.5, cursor: 'not-allowed' }}
              aria-label="自動同期中"
              title="Firestoreでリアルタイム同期中です"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary btn-sm"
              style={{ gap: 6, borderRadius: 99 }}
            >
              <Plus size={15} /> 記録する
            </button>
          </div>
        </div>

        {/* Feed tabs: 私のひろば / みんなのひろば */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <button
            onClick={() => handleFeedTabChange('friends')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 0',
              fontFamily: 'inherit',
              fontWeight: feedTab === 'friends' ? 700 : 500,
              fontSize: '0.875rem',
              border: 'none',
              borderBottom: feedTab === 'friends'
                ? '2px solid var(--color-primary)'
                : '2px solid transparent',
              color: feedTab === 'friends' ? 'var(--color-primary)' : 'var(--text-muted)',
              background: feedTab === 'friends' ? 'var(--color-primary-glow)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            id="tab-friends"
          >
            <Users size={15} />
            私のひろば
          </button>
          <button
            onClick={() => handleFeedTabChange('everyone')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 0',
              fontFamily: 'inherit',
              fontWeight: feedTab === 'everyone' ? 700 : 500,
              fontSize: '0.875rem',
              border: 'none',
              borderBottom: feedTab === 'everyone'
                ? '2px solid var(--color-primary)'
                : '2px solid transparent',
              color: feedTab === 'everyone' ? 'var(--color-primary)' : 'var(--text-muted)',
              background: feedTab === 'everyone' ? 'var(--color-primary-glow)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            id="tab-everyone"
          >
            <Globe size={15} />
            みんなのひろば
          </button>
        </div>
      </div>

      {/* Feed label */}
      {!loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 12,
          padding: '8px 14px',
          background: feedTab === 'friends' ? '#F1F5F9' : '#F0FDF4',
          borderRadius: 12,
          border: `1px solid ${feedTab === 'friends' ? '#CBD5E1' : '#BBF7D0'}`,
        }}>
          {feedTab === 'friends' ? (
            <>
              <Users size={14} style={{ color: '#0F172A' }} />
              <span style={{ fontSize: '0.8rem', color: '#1E293B', fontWeight: 600 }}>
                フォロー中の人の投稿
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: 'auto' }}>
                {posts.length}件
              </span>
            </>
          ) : (
            <>
              <Globe size={14} style={{ color: '#16A34A' }} />
              <span style={{ fontSize: '0.8rem', color: '#15803D', fontWeight: 600 }}>
                全体公開の投稿
              </span>
              <span style={{ fontSize: '0.75rem', color: '#16A34A', marginLeft: 'auto' }}>
                {posts.length}件
              </span>
            </>
          )}
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 14, width: '40%' }} />
                  <div className="skeleton" style={{ height: 12, width: '25%' }} />
                </div>
              </div>
              <div className="skeleton" style={{ height: 14, width: '80%' }} />
              <div className="skeleton" style={{ height: 60 }} />
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <span className="empty-state-icon">
            {feedTab === 'friends' ? '' : ''}
          </span>
          <p className="empty-state-title">
            {feedTab === 'friends' ? 'フォロー中の人の投稿がありません' : '全体公開の投稿がありません'}
          </p>
          <p className="empty-state-desc">
            {feedTab === 'friends'
              ? '「全員のタイムライン」タブで他の就活生を見つけてフォローしよう！'
              : 'プロフィールや投稿で「全体公開」に設定された投稿が表示されます'}
          </p>
          {feedTab === 'friends' && (
            <button
              onClick={() => handleFeedTabChange('everyone')}
              className="btn btn-secondary"
              style={{ marginTop: 8, gap: 6 }}
            >
              <Globe size={15} />
              全員のタイムラインを見る
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            style={{ marginTop: feedTab === 'friends' ? 0 : 8 }}
          >
            <Plus size={16} /> 最初の記録をしよう！
          </button>
        </div>
      ) : (
        filteredPosts.map((post, i) => (
          <div key={post.id} style={{ animationDelay: `${i * 0.04}s` }}>
            <PostCard
              post={post}
              onUpdate={onUpdate}
              onProfileClick={onProfileClick}
              showFollowButton={feedTab === 'everyone'}
              onFollowUpdate={onUpdate}
              onToast={onToast}
            />
          </div>
        ))
      )}

      {/* Modal */}
      {showModal && (
        <CreatePostModal
          onClose={() => setShowModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}

      {/* Timer Modal */}
      {showTimerModal && (
        <StudyTimerModal
          onClose={() => setShowTimerModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}
