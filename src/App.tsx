import { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import Sidebar, { BottomNav } from './components/Sidebar';
import type { Page } from './components/Sidebar';
import Timeline from './components/Timeline';

import CalendarSection from './components/CalendarSection';
import SearchSection from './components/SearchSection';
import NotificationSection from './components/NotificationSection';
import ProfileView from './components/ProfileView';
import CreatePostModal from './components/CreatePostModal';
import StudyTimerModal from './components/StudyTimerModal';
import { subscribeToNotifications, subscribeToFollowRequests } from './db/firestore';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';

import ToastNotification, { type ToastState } from './components/ToastNotification';

export default function App() {
  const { currentUser, profile, loading, logout } = useAuth();

  // ── 認証ローディング中 ──────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0B0F17',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          border: '3px solid #26334D', borderTopColor: '#E06D53',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── 未ログイン ────────────────────────────────────────────────
  if (!currentUser) return <LoginPage />;

  // ── プロフィール未設定（オンボーディング） ──────────────────
  if (!currentUser.displayName || !profile) return <OnboardingPage />;

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Firestoreの未読通知数をリアルタイムに反映（通知 + フォローリクエストの合計）
  const notifCountRef = useRef(0);
  const reqCountRef = useRef(0);

  useEffect(() => {
    if (!currentUser) return;

    const unsubNotifs = subscribeToNotifications(currentUser.uid, (notifs) => {
      notifCountRef.current = notifs.filter((n) => !n.read).length;
      setUnreadCount(notifCountRef.current + reqCountRef.current);
    });

    const unsubReqs = subscribeToFollowRequests(currentUser.uid, (reqs) => {
      reqCountRef.current = reqs.length;
      setUnreadCount(notifCountRef.current + reqCountRef.current);
    });

    return () => {
      unsubNotifs();
      unsubReqs();
    };
  }, [currentUser]);

  // URLの ?profile=xxx を読み取って自動遷移
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const profileUid = params.get('profile');
    if (profileUid) {
      setProfileUserId(profileUid);
      setCurrentPage('profile');
      // URLからパラメータを除去（ブラウザ履歴は汚さない）
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleUpdate = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  function handleNavigate(page: Page) {
    setCurrentPage(page);
    setProfileUserId(null);
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
              onUpdate={handleUpdate}
              onProfileClick={handleProfileClick}
              onToast={triggerToast}
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


          {currentPage === 'notifications' && (
            <NotificationSection
              onUpdate={handleUpdate}
              onProfileClick={handleProfileClick}
            />
          )}

          {currentPage === 'profile' && (
            <ProfileView
              key={profileUserId ?? currentUser.uid}
              userId={profileUserId ?? currentUser.uid}
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
          onToast={triggerToast}
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
