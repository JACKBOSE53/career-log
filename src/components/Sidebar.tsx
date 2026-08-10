import { useState } from 'react';
import { Home, Search, Users, Bell, User, Plus, Sparkles, Calendar, Edit3, Timer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount } from '../db/store';

export type Page = 'home' | 'calendar' | 'search' | 'communities' | 'notifications' | 'profile';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  unreadCount: number;
  onCreatePost: () => void;
  onOpenTimer?: () => void;
}

const NAV_ITEMS = [
  { id: 'home' as Page, label: 'タイムライン', icon: Home },
  { id: 'calendar' as Page, label: 'カレンダー', icon: Calendar },
  { id: 'search' as Page, label: 'さがす', icon: Search },
  { id: 'notifications' as Page, label: '通知', icon: Bell },
  { id: 'profile' as Page, label: 'マイページ', icon: User },
];


export default function Sidebar({ currentPage, onNavigate, unreadCount, onCreatePost, onOpenTimer }: SidebarProps) {
  const { profile: me } = useAuth();
  if (!me) return null;

  return (
    <nav style={{
      width: 260,
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      borderRight: '1px solid rgba(255, 255, 255, 0.12)',
      background: 'var(--bg-base)',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 28, paddingLeft: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              CareerLog
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em' }}>
              キャリアログ
            </div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const showBadge = item.id === 'notifications' && unreadCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              id={`nav-${item.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 16px',
                borderRadius: 14,
                fontFamily: 'inherit',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                background: isActive
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'transparent',
                border: isActive
                  ? '1px solid rgba(255, 255, 255, 0.2)'
                  : '1px solid transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9375rem',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-hover)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Icon
                  size={22}
                  fill={isActive && item.id === 'home' ? 'var(--color-primary)' : 'none'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {showBadge && (
                  <span style={{
                    position: 'absolute',
                    top: -4, right: -6,
                    background: '#EF4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: 16, height: 16,
                    fontSize: '0.6rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700,
                    border: '2px solid white',
                    animation: 'bounceIn 0.4s ease',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {item.label}
              {isActive && (
                <div style={{
                  marginLeft: 'auto',
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--color-primary)',
                }} />
              )}
            </button>
          );
        })}

        {/* Create Post Button */}
        <button
          onClick={onCreatePost}
          id="sidebar-create-post"
          className="btn btn-primary"
          style={{
            marginTop: 8,
            width: '100%',
            borderRadius: 14,
            padding: '12px 16px',
            gap: 10,
            fontSize: '0.9375rem',
            justifyContent: 'flex-start',
          }}
        >
          <Plus size={20} />
          就活を記録する
        </button>

        {/* Study Timer Button */}
        {onOpenTimer && (
          <button
            onClick={onOpenTimer}
            className="btn btn-secondary"
            style={{
              marginTop: 8,
              width: '100%',
              borderRadius: 14,
              padding: '10px 16px',
              gap: 10,
              fontSize: '0.875rem',
              justifyContent: 'flex-start',
            }}
          >
            <Timer size={18} />
            就活集中タイマー
          </button>
        )}
      </div>

      {/* Profile Footer */}
      <button
        onClick={() => onNavigate('profile')}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px',
          borderRadius: 14,
          border: 'none',
          background: 'var(--bg-surface-2)',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          width: '100%',
          marginTop: 12,
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; }}
      >
        <span style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', flexShrink: 0,
        }}>
          {me.avatar}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {me.name}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {me.university}
          </div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} title="オンライン" />
      </button>
    </nav>
  );
}

/* ── Mobile Bottom Nav ────────────────────────────────────────── */
interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  unreadCount: number;
}

export function BottomNav({ currentPage, onNavigate, unreadCount }: BottomNavProps) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(11, 15, 23, 0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.15)',
      display: 'flex',
      zIndex: 200,
      padding: '8px 0 env(safe-area-inset-bottom)',
    }}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        const showBadge = item.id === 'notifications' && unreadCount > 0;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '6px 0', border: 'none', background: 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              position: 'relative',
              padding: '4px 14px',
              borderRadius: 99,
              background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={20} color={isActive ? '#FFFFFF' : 'var(--text-muted)'} />
              {showBadge && (
                <span style={{
                  position: 'absolute', top: 2, right: 10,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#EF4444',
                }} />
              )}
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: isActive ? 700 : 500 }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
