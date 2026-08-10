import { useState, useCallback, useEffect } from 'react';
import './App.css';
import Sidebar, { BottomNav } from './components/Sidebar';
import type { Page } from './components/Sidebar';
import Timeline from './components/Timeline';

import CalendarSection from './components/CalendarSection';
import SearchSection from './components/SearchSection';
import CommunitySection from './components/CommunitySection';
import NotificationSection from './components/NotificationSection';
import ProfileView from './components/ProfileView';
import CreatePostModal from './components/CreatePostModal';
import StudyTimerModal from './components/StudyTimerModal';
import { getUnreadCount } from './db/store';
import { useAuth } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';


import ToastNotification, { type ToastState } from './components/ToastNotification';

export default function App() {
  const { currentUser, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(getUnreadCount());
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ログインが完了した(currentUserが確定した)タイミングで、
  // そのユーザーの未読通知数を読み直す
  useEffect(() => {
    if (currentUser) {
      setUnreadCount(getUnreadCount());
    }
  }, [currentUser]);

  const handleUpdate = useCallback(() => {
    setUnreadCount(getUnreadCount());
    setTick((t) => t + 1);
  }, []);

  function handleNavigate(page: Page) {
    setCurrentPage(page);
    setProfileUserId(null);
    if (page === 'notifications') {
      setTimeout(() => setUnreadCount(getUnreadCount()), 200);
    }
  }

  function handleProfileClick(userId: string) {
    setProfileUserId(userId);
    setCurrentPage('profile');
  }

  const triggerToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
  }, []);

  function handlePostCreated() {
    setShowCreateModal(false);
    setCurrentPage('home');
    handleUpdate();
    triggerToast('投稿が完了しました', 'success');
  }

  // Firebase Authの状態を確認中
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #9a9aa5)' }}>
        読み込み中...
      </div>
    );
  }

  // 未ログインならログイン/新規登録画面を表示
  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="app-layout">
      {/* Left Sidebar (desktop) */}
      {!isMobile && (
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          unreadCount={unreadCount}
          onCreatePost={() => setShowCreateModal(true)}
          onOpenTimer={() => setShowTimerModal(true)}
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        <div className="content-inner">
          {/* Page views */}
          {currentPage === 'home' && (
            <Timeline
              key={`timeline-${tick}`}
              onUpdate={handleUpdate}
              onProfileClick={handleProfileClick}
            />
          )}

          {currentPage === 'calendar' && (
            <CalendarSection onUpdate={handleUpdate} onToast={triggerToast} />
          )}

          {currentPage === 'search' && (
            <SearchSection
              onUpdate={handleUpdate}
              onProfileClick={handleProfileClick}
            />
          )}

          {currentPage === 'communities' && (
            <CommunitySection onUpdate={handleUpdate} />
          )}

          {currentPage === 'notifications' && (
            <NotificationSection
              onUpdate={handleUpdate}
              onProfileClick={handleProfileClick}
            />
          )}

          {currentPage === 'profile' && (
            <ProfileView
              key={profileUserId ?? 'me'}
              userId={profileUserId ?? 'user-me'}
              onClose={profileUserId ? () => { setProfileUserId(null); setCurrentPage('home'); } : undefined}
              onUpdate={handleUpdate}
              onToast={triggerToast}
            />
          )}
        </div>
      </main>


      {/* Mobile Bottom Nav */}
      {isMobile && (
        <BottomNav
          currentPage={currentPage}
          onNavigate={handleNavigate}
          unreadCount={unreadCount}
        />
      )}

      {/* Global Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
          onToast={triggerToast}
        />
      )}

      {/* Global Study Timer Modal */}
      {showTimerModal && (
        <StudyTimerModal
          onClose={() => setShowTimerModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}

      {/* Global Top Toast Notification Bar */}
      <ToastNotification
        toast={toast}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
    </div>
  );
}
