import { useState } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';
import { searchAll, isFollowing, toggleFollow } from '../db/store';
import type { Post, User, Community } from '../db/mockData';

import PostCard from './PostCard';
import CategoryBadge from './CategoryBadge';

interface SearchSectionProps {
  onUpdate: () => void;
  onProfileClick: (userId: string) => void;
}

const HOT_TAGS = ['SPI', 'ES', 'リクルート', 'インターン2025', 'OB訪問', 'メルカリ', 'コンサル', '自己分析'];

export default function SearchSection({ onUpdate, onProfileClick }: SearchSectionProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ posts: Post[]; users: User[]; communities: Community[] } | null>(null);
  const [tab, setTab] = useState<'posts' | 'users' | 'communities'>('posts');

  function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults(null);
      return;
    }
    setResults(searchAll(q.trim()));
  }

  return (
    <div>
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
            placeholder="企業、タグ、ユーザー、投稿を検索..."
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
        <div>


          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 12 }}>カテゴリから探す</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {['ES', 'SPI', '面接', 'OB訪問', '説明会', '自己分析', 'GD', 'インターン', 'その他'].map((cat) => (
              <button
                key={cat}
                onClick={() => handleSearch(cat)}
                className="card card-hover"
                style={{
                  padding: 16, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <CategoryBadge category={cat as any} />
              </button>
            ))}
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
            <button className={`tab-item ${tab === 'communities' ? 'active' : ''}`} onClick={() => setTab('communities')}>
              コミュニティ {results.communities.length > 0 && <span className="badge" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>{results.communities.length}</span>}
            </button>
          </div>

          {tab === 'posts' && (
            results.posts.length === 0
              ? <div className="empty-state"><span className="empty-state-icon"></span><p className="empty-state-title">投稿が見つかりませんでした</p></div>
              : results.posts.map((post) => (
                <PostCard key={post.id} post={post} onUpdate={onUpdate} onProfileClick={onProfileClick} />
              ))
          )}

          {tab === 'users' && (
            results.users.length === 0
              ? <div className="empty-state"><span className="empty-state-icon"></span><p className="empty-state-title">ユーザーが見つかりませんでした</p></div>
              : results.users.map((user) => <UserSearchCard key={user.id} user={user} onProfileClick={onProfileClick} onUpdate={onUpdate} />)
          )}

          {tab === 'communities' && (
            results.communities.length === 0
              ? <div className="empty-state"><span className="empty-state-icon">️</span><p className="empty-state-title">コミュニティが見つかりませんでした</p></div>
              : results.communities.map((comm) => <CommunitySearchCard key={comm.id} community={comm} />)
          )}
        </div>
      )}
    </div>
  );
}

function UserSearchCard({ user, onProfileClick, onUpdate }: { user: User; onProfileClick: (id: string) => void; onUpdate: () => void }) {
  const [following, setFollowing] = useState(isFollowing(user.id));

  function handleFollow() {
    const result = toggleFollow(user.id);
    setFollowing(result);
    onUpdate();
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={() => onProfileClick(user.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}>
        <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
          {user.avatar}
        </span>
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <button onClick={() => onProfileClick(user.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{user.name}</div>
        </button>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.university} · {user.grade}</div>
      </div>
      <button
        onClick={handleFollow}
        className={following ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
        style={{ flexShrink: 0 }}
      >
        {following ? 'フォロー中' : 'フォロー'}
      </button>
    </div>
  );
}

function CommunitySearchCard({ community }: { community: Community }) {
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
