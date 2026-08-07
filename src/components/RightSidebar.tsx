import { useState } from 'react';
import { getAllUsers, getCurrentUserId, isFollowing, toggleFollow, getUserStats } from '../db/store';

interface RightSidebarProps {
  onUpdate: () => void;
  onProfileClick: (userId: string) => void;
}

export default function RightSidebar({ onUpdate, onProfileClick }: RightSidebarProps) {
  const myId = getCurrentUserId();
  const allUsers = getAllUsers().filter((u) => u.id !== myId);
  const [followStates, setFollowStates] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    allUsers.forEach((u) => { map[u.id] = isFollowing(u.id); });
    return map;
  });

  function handleFollow(userId: string) {
    const result = toggleFollow(userId);
    setFollowStates((s) => ({ ...s, [userId]: result }));
    onUpdate();
  }

  const suggestions = allUsers.filter((u) => !followStates[u.id]).slice(0, 3);
  const following = allUsers.filter((u) => followStates[u.id]).slice(0, 5);

  return (
    <aside style={{
      width: 280,
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
      padding: '24px 16px',
      overflowY: 'auto',
      borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
    }}>


      {/* Suggested Users */}
      {suggestions.length > 0 && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 14 }}> おすすめユーザー</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {suggestions.map((user) => {
              const stats = getUserStats(user.id);
              return (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => onProfileClick(user.id)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                      {user.avatar}
                    </span>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button
                      onClick={() => onProfileClick(user.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, width: '100%' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                    </button>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{stats.totalPosts}件の投稿</div>
                  </div>
                  <button
                    onClick={() => handleFollow(user.id)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.7rem', padding: '5px 10px', borderRadius: 'var(--border-radius-full)', flexShrink: 0 }}
                  >
                    フォロー
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Following Activity */}
      {following.length > 0 && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 14 }}> フォロー中のアクティビティ</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {following.map((user) => {
              const stats = getUserStats(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => onProfileClick(user.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none',
                    cursor: 'pointer', textAlign: 'left', padding: '4px 0', fontFamily: 'inherit', width: '100%',
                  }}
                >
                  <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', flexShrink: 0 }}>
                    {user.avatar}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                       {stats.totalPosts}投稿 ·  {stats.streakDays}日連続
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'center', padding: '8px 0' }}>
        CareerLog © 2025<br />
        「就活を、孤独な戦いから<br />仲間と成長する体験へ。」
      </p>
    </aside>
  );
}
