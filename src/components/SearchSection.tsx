import { useState, useEffect } from 'react';
import { Search, X, UserPlus, UserCheck } from 'lucide-react';
import { CATEGORIES, INTERVIEW_SUB_TAGS } from '../db/mockData';
import {
  searchUsersFirestore,
  isFollowingFirestore,
  sendFollowRequest,
  unfollowUser,
  subscribeToCommunities,
  subscribeToPosts,
  subscribeToUserProfile,
  type UserProfile,
  type FirestorePost,
  type FirestoreCommunity,
} from '../db/firestore';
import { useAuth } from '../contexts/AuthContext';
import PostCard from './PostCard';
import CategoryBadge from './CategoryBadge';

interface SearchSectionProps {
  onUpdate: () => void;
  onProfileClick: (userId: string) => void;
}

export default function SearchSection({ onUpdate, onProfileClick }: SearchSectionProps) {
  const [query, setQuery] = useState('');
  const [allPosts, setAllPosts] = useState<FirestorePost[]>([]);
  const [allCommunities, setAllCommunities] = useState<FirestoreCommunity[]>([]);
  const [results, setResults] = useState<{ posts: FirestorePost[]; users: UserProfile[]; communities: FirestoreCommunity[] } | null>(null);
  const [tab, setTab] = useState<'posts' | 'users' | 'companies'>('posts');

  useEffect(() => {
    const unsubPosts = subscribeToPosts(setAllPosts);
    const unsubComm = subscribeToCommunities(setAllCommunities);
    return () => {
      unsubPosts();
      unsubComm();
    };
  }, []);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults(null);
      return;
    }
    const cleanQ = q.trim();
    const firestoreUsers = await searchUsersFirestore(cleanQ);
    const matchedPosts = allPosts.filter(
      (p) => p.title.includes(cleanQ) || p.content.includes(cleanQ)
    );
    const matchedComm = allCommunities.filter(
      (c) => c.name.includes(cleanQ) || c.description.includes(cleanQ)
    );
    
    setResults({
      posts: matchedPosts,
      users: firestoreUsers,
      communities: matchedComm,
    });
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease', paddingBottom: 40 }}>
      {/* Search Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg-base)', paddingBottom: 16,
        borderBottom: '1px solid var(--border-color)',
        marginBottom: 20,
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: 12, paddingTop: 4 }}>検索</h2>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            id="search-input"
            className="input"
            placeholder="企業名、1次面接、最終面接、SPI、テスト、キーワードで検索..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ paddingLeft: 40, paddingRight: 40, borderRadius: 'var(--border-radius-full)' }}
          />
          {query && (
            <button
              onClick={() => handleSearch('')}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}
              aria-label="クリア"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {!results ? (
        /* Discovery view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* カテゴリから探す */}
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>取り組みカテゴリから探す</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSearch(cat.id)}
                  className="card card-hover"
                  style={{
                    padding: 10, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <CategoryBadge category={cat.id} />
                </button>
              ))}
            </div>
          </div>

          {/* 面接ステップから探す */}
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🗣️</span>
              <span>面接ステップから探す</span>
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {INTERVIEW_SUB_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleSearch(tag)}
                  style={{
                    padding: '8px 14px', borderRadius: 10,
                    fontSize: '0.8125rem', fontWeight: 800,
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  🔍 {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Search Results */
        <div>
          <div className="tabs" style={{ marginBottom: 16 }}>
            <button className={`tab-item ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>
              投稿 {results.posts.length > 0 && <span className="badge" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>{results.posts.length}</span>}
            </button>
            <button className={`tab-item ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
              ユーザー {results.users.length > 0 && <span className="badge" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>{results.users.length}</span>}
            </button>
            <button className={`tab-item ${tab === 'companies' ? 'active' : ''}`} onClick={() => setTab('companies')}>
              企業・コミュニティ {results.communities.length > 0 && <span className="badge" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>{results.communities.length}</span>}
            </button>
          </div>

          {tab === 'posts' && (
            results.posts.length === 0
              ? <div className="empty-state"><span className="empty-state-icon"></span><p className="empty-state-title">「{query}」に関連する投稿が見つかりませんでした</p></div>
              : results.posts.map((post) => (
                <PostCard key={post.id} post={post as any} onUpdate={onUpdate} onProfileClick={onProfileClick} />
              ))
          )}

          {tab === 'users' && (
            results.users.length === 0
              ? <div className="empty-state"><span className="empty-state-icon"></span><p className="empty-state-title">「{query}」に関連するユーザーが見つかりませんでした</p></div>
              : results.users.map((user) => <UserSearchCard key={user.id} user={user} onProfileClick={onProfileClick} onUpdate={onUpdate} />)
          )}

          {tab === 'companies' && (
            results.communities.length === 0
              ? <div className="empty-state"><span className="empty-state-icon">🏢</span><p className="empty-state-title">「{query}」に関連する企業・コミュニティが見つかりませんでした</p></div>
              : results.communities.map((comm) => <CommunitySearchCard key={comm.id} community={comm} />)
          )}
        </div>
      )}
    </div>
  );
}

function UserSearchCard({ user, onProfileClick, onUpdate }: { user: UserProfile; onProfileClick: (id: string) => void; onUpdate: () => void }) {
  const { currentUser } = useAuth();
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    isFollowingFirestore(currentUser.uid, user.id).then((res) => {
      setFollowing(res);
    });
    const unsubscribe = subscribeToUserProfile(currentUser.uid, (profile: UserProfile | null) => {
      setMyProfile(profile);
    });
    return () => unsubscribe();
  }, [currentUser, user.id]);

  async function handleFollowClick() {
    if (!currentUser || loading) return;
    if (following) {
      setShowConfirmModal(true);
    } else {
      setLoading(true);
      try {
        await sendFollowRequest(
          currentUser.uid,
          user.id,
          myProfile?.name || currentUser.displayName || undefined,
          myProfile?.avatar || currentUser.photoURL || undefined,
        );
        setRequestSent(true);
      } finally {
        setLoading(false);
      }
    }
  }

  async function confirmUnfollow() {
    if (!currentUser) return;
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await unfollowUser(currentUser.uid, user.id);
      setFollowing(false);
      setRequestSent(false);
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="card" style={{ padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onProfileClick(user.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}>
          {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:')) ? (
            <img src={user.avatar} alt={user.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', color: 'white', fontWeight: 'bold' }}>
              {user.avatar || user.name?.[0] || 'U'}
            </span>
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button onClick={() => onProfileClick(user.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{user.name}</div>
          </button>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.university || '大学未設定'} · {user.grade || '26卒'}</div>
        </div>

        {currentUser?.uid !== user.id && (
          <button
            onClick={handleFollowClick}
            disabled={loading}
            className={following ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
            style={{ flexShrink: 0, gap: 4 }}
          >
            {following ? (
              <>
                <UserCheck size={14} /> フォロー中
              </>
            ) : requestSent ? (
              '送信済み'
            ) : (
              <>
                <UserPlus size={14} /> リクエスト
              </>
            )}
          </button>
        )}
      </div>

      {/* フォロー解除確認ダイアログ */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, padding: 24, textAlign: 'center', borderRadius: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              フォローを解除しますか？
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              @{user.name} さんの限定投稿や更新情報が見られなくなります。
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirmModal(false)}
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
    </>
  );
}

function CommunitySearchCard({ community }: { community: FirestoreCommunity }) {
  const TYPE_LABELS: Record<string, string> = { university: '大学', industry: '業界', company: '企業', event: 'イベント' };
  return (
    <div className="card" style={{ padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${community.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', border: `1px solid ${community.color}30`, flexShrink: 0 }}>
          {community.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{community.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{community.memberCount.toLocaleString()}人 · {TYPE_LABELS[community.type]}</div>
        </div>
      </div>
    </div>
  );
}
