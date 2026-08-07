import { useState } from 'react';
import { Bell, BellOff, Heart, MessageCircle, UserPlus } from 'lucide-react';
import { getNotifications, markAllNotificationsRead, getUserById, getPostById, getUnreadCount } from '../db/store';
import type { Notification } from '../db/mockData';

interface NotificationSectionProps {
  onUpdate: () => void;
  onProfileClick: (userId: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時間前`;
  const days = Math.floor(hrs / 24);
  return `${days}日前`;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  like: <Heart size={14} fill="#EF4444" color="#EF4444" />,
  comment: <MessageCircle size={14} color="#3B82F6" />,
  follow: <UserPlus size={14} color="#10B981" />,
  reminder: <Bell size={14} color="#F59E0B" fill="#F59E0B" />,
};

const TYPE_COLOR: Record<string, string> = {
  like: '#EF444420',
  comment: '#3B82F620',
  follow: '#10B98120',
  reminder: '#F59E0B20',
};

export default function NotificationSection({ onUpdate, onProfileClick }: NotificationSectionProps) {
  const [notifications, setNotifications] = useState<Notification[]>(getNotifications());
  const [unread, setUnread] = useState(getUnreadCount());

  function handleMarkAllRead() {
    markAllNotificationsRead();
    setNotifications(getNotifications());
    setUnread(0);
    onUpdate();
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingTop: 4 }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: 2 }}>通知</h2>
          {unread > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              {unread}件の未読通知
            </p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn btn-ghost btn-sm"
            style={{ gap: 6, color: 'var(--text-secondary)', fontSize: '0.8rem' }}
          >
            <BellOff size={14} />
            すべて既読にする
          </button>
        )}
      </div>

      {/* Daily reminder card */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
        borderRadius: 16,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
      }}>
        <span style={{ fontSize: '1.75rem', flexShrink: 0 }}></span>
        <div>
          <p style={{ fontWeight: 700, color: 'white', marginBottom: 2 }}>今日の就活を記録しよう</p>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)' }}>
            毎日20時にリマインダーをお届けします。継続が大切です！
          </p>
        </div>
        <Bell size={20} style={{ color: 'rgba(255,255,255,0.7)', marginLeft: 'auto', flexShrink: 0 }} />
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon"></span>
          <p className="empty-state-title">通知はまだありません</p>
          <p className="empty-state-desc">フォローしたり投稿すると通知が届きます</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((notif) => {
            const fromUser = getUserById(notif.fromUserId);
            if (!fromUser) return null;
            const post = notif.postId ? getPostById(notif.postId) : undefined;

            return (
              <div
                key={notif.id}
                className="card"
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  background: notif.read ? 'var(--bg-surface)' : `${TYPE_COLOR[notif.type]}`,
                  borderLeft: notif.read ? 'none' : `3px solid ${notif.type === 'like' ? '#EF4444' : notif.type === 'comment' ? '#3B82F6' : '#10B981'}`,
                  animation: 'fadeInUp 0.2s ease',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                onClick={() => onProfileClick(notif.fromUserId)}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    {fromUser.avatar}
                  </span>
                  <span style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'white', border: '1.5px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {TYPE_ICON[notif.type]}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                    <strong>{fromUser.name}</strong>
                    {notif.type === 'like' && 'さんがあなたの投稿にいいねしました ️'}
                    {notif.type === 'comment' && 'さんがあなたの投稿にコメントしました '}
                    {notif.type === 'follow' && 'さんがあなたをフォローしました '}
                  </p>
                  {post && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      「{post.title}」
                    </p>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    {timeAgo(notif.createdAt)}
                  </span>
                </div>

                {!notif.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
