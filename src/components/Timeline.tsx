import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Plus, RefreshCw, Users, Globe, Timer, ChevronDown, Loader2 } from 'lucide-react';
import {
  subscribeToTimelinePosts,
  getLocalPosts,
  subscribeToFollowingUids,
  fetchOlderPublicPosts,
  TIMELINE_PAGE_SIZE,
  type FirestorePost,
} from '../db/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { isFollowing } from '../db/store';
import { useAuth } from '../contexts/AuthContext';
import PostCard from './PostCard';

const CreatePostModal = lazy(() => import('./CreatePostModal'));
const StudyTimerModal = lazy(() => import('./StudyTimerModal'));

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
  const [lastPublicDoc, setLastPublicDoc] = useState<QueryDocumentSnapshot | undefined>(undefined);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { currentUser } = useAuth();
  const myId = currentUser?.uid;

  const latestFirestorePosts = useRef<FirestorePost[]>([]);
  const hasPaginatedRef = useRef<boolean>(false);

  const mergeAndSetPosts = (firestorePosts: FirestorePost[]) => {
    const currentLocals = getLocalPosts();
    const map = new Map<string, FirestorePost>();
    currentLocals.forEach((p) => { if (p.id) map.set(p.id, p); });
    firestorePosts.forEach((p) => { if (p.id) map.set(p.id, p); });
    
    const sorted = Array.from(map.values()).sort((a, b) => {
      const getMillis = (dateVal: import('firebase/firestore').Timestamp | Date | string | number | { toDate?: () => Date } | null | undefined) => {
        if (!dateVal) return new Date().getTime();
        if (dateVal instanceof Date) return dateVal.getTime();
        if (typeof dateVal === 'object' && 'toDate' in dateVal && typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
        return new Date(dateVal as string | number).getTime() || new Date().getTime();
      };
      return getMillis(b.createdAt) - getMillis(a.createdAt);
    });
    setPosts(sorted);
    setLoading(false);
  };

  useEffect(() => {
    if (!myId) return;
    const unsub = subscribeToFollowingUids(myId, (uids) => {
      setFollowingUids(uids);
    });
    return () => unsub();
  }, [myId]);

  // followingUids が確定してから投稿を購読する（'followers'限定投稿のクエリを
  // 実際にフォロー中のユーザーだけに絞るため、Firestoreのセキュリティルール上必須）
  const followingUidsKey = followingUids.slice().sort().join(',');

  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    hasPaginatedRef.current = false;

    const unsubscribe = subscribeToTimelinePosts(myId, followingUids, (allPosts, lastDoc) => {
      // 修正点1: 過去にページングで読み込んだ投稿を消さないよう、idベースで既存データとマージ
      const map = new Map<string, FirestorePost>();
      latestFirestorePosts.current.forEach((p) => { if (p.id) map.set(p.id, p); });
      allPosts.forEach((p) => { if (p.id) map.set(p.id, p); });
      const merged = Array.from(map.values());
      latestFirestorePosts.current = merged;

      // 修正点2: ページングを一度も呼んでいない時だけリアルタイム側のカーソルを採用
      // （ページング済みの場合は、ユーザーが読み進めた最深部のカーソルを保護・維持する）
      if (!hasPaginatedRef.current) {
        setLastPublicDoc(lastDoc);
        if (!lastDoc) {
          setHasMore(false);
        }
      }

      mergeAndSetPosts(merged);
    });

    const handleAutoUpdate = () => {
      mergeAndSetPosts(latestFirestorePosts.current);
    };

    window.addEventListener('career_log_data_updated', handleAutoUpdate);
    return () => {
      unsubscribe();
      window.removeEventListener('career_log_data_updated', handleAutoUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, followingUidsKey]);

  const handleLoadMore = async () => {
    if (!lastPublicDoc || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    hasPaginatedRef.current = true; // ページング実行フラグをONにし、リアルタイム巻き戻しを防止

    try {
      const res = await fetchOlderPublicPosts(lastPublicDoc, TIMELINE_PAGE_SIZE);
      if (res.posts.length === 0 || !res.lastDoc) {
        setHasMore(false);
      }
      setLastPublicDoc(res.lastDoc);
      const combined = [...latestFirestorePosts.current, ...res.posts];
      latestFirestorePosts.current = combined;
      mergeAndSetPosts(combined);
    } catch (err) {
      console.error('Failed to load older posts:', err);
      if (onToast) {
        onToast('過去の投稿の取得に失敗しました', 'error');
      }
    } finally {
      setLoadingOlder(false);
    }
  };

  // ユーザー指示に基づく厳格なプライバシー＆公開範囲サブフィルター
  const filteredPosts = posts.filter((post) => {
    let isTabAllowed = false;
    if (feedTab === 'everyone') {
      // みんなの広場: public のみ表示
      isTabAllowed = post.visibility === 'public' || !post.visibility;
    } else {
      // 私のひろば: 自分 + フォロー中の人の投稿
      const isMyPost = post.userId === myId || post.userId === 'user-me';
      const isFriend = followingUids.includes(post.userId) || isFollowing(post.userId);
      if (isMyPost) {
        isTabAllowed = true;
      } else if (isFriend) {
        isTabAllowed = post.visibility === 'public' || post.visibility === 'followers' || !post.visibility;
      }
    }

    return isTabAllowed;
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

      {/* Pagination Load More */}
      {feedTab === 'everyone' && hasMore && lastPublicDoc && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, marginBottom: 32 }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingOlder}
            className="btn btn-secondary"
            style={{
              padding: '10px 24px',
              borderRadius: 99,
              fontSize: '0.875rem',
              fontWeight: 600,
              gap: 8,
              cursor: loadingOlder ? 'not-allowed' : 'pointer',
            }}
          >
            {loadingOlder ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>読み込み中...</span>
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                <span>もっと見る（過去の投稿を読み込む）</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Modal with Suspense */}
      <Suspense fallback={null}>
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
      </Suspense>
    </div>
  );
}
