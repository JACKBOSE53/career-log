import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Heart, MessageCircle, UserPlus, Users, Calendar, Sparkles, Share2, Check, X, CheckCircle, Trash2, HelpCircle, Info } from 'lucide-react';
import { getNotifications, markAllNotificationsRead, getUserById, getPostById, getUnreadCount } from '../db/store';
import type { Notification } from '../db/mockData';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToCalendarEvents,
  subscribeToFollowRequests,
  approveFollowRequest,
  rejectFollowRequest,
  subscribeToNotifications,
  markAllNotificationsReadFirestore,
  deleteNotificationFirestore,
  deleteCalendarEvent,
  type FirestoreFollowRequest,
  type FirestoreNotificationData,
} from '../db/firestore';
import { getLocalDateStr } from '../utils/dateUtils';

interface NotificationSectionProps {
  onUpdate: () => void;
  onProfileClick: (userId: string) => void;
}

function timeAgo(dateVal: any): string {
  if (!dateVal) return 'たった今';
  let date: Date;
  if (dateVal instanceof Date) {
    date = dateVal;
  } else if (typeof dateVal?.toDate === 'function') {
    date = dateVal.toDate();
  } else {
    date = new Date(dateVal);
  }
  if (isNaN(date.getTime())) return 'たった今';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時間前`;
  const days = Math.floor(hrs / 24);
  return `${days}日前`;
}

export default function NotificationSection({ onUpdate, onProfileClick }: NotificationSectionProps) {
  const [notifications, setNotifications] = useState<Notification[]>(getNotifications());
  const [copied, setCopied] = useState(false);
  const { currentUser } = useAuth();

  const [calendarReminders, setCalendarReminders] = useState<{ id: string; title: string; daysLeft: number; priority?: string; date: string; category: string }[]>([]);
  const [followRequests, setFollowRequests] = useState<FirestoreFollowRequest[]>([]);
  const [firestoreNotifs, setFirestoreNotifs] = useState<FirestoreNotificationData[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'all' | 'requests' | 'reminders'>('all');

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToCalendarEvents(currentUser.uid, (events) => {
      const todayStr = getLocalDateStr();
      const todayMs = new Date(todayStr).getTime();

      const reminders: { id: string; title: string; daysLeft: number; priority?: string; date: string; category: string }[] = [];

      events.forEach((ev) => {
        const evMs = new Date(ev.date).getTime();
        const diffDays = Math.round((evMs - todayMs) / (1000 * 60 * 60 * 24));

        if (diffDays === 3 || diffDays === 1 || diffDays === 0) {
          reminders.push({
            id: ev.id || ev.date + ev.title,
            title: ev.title,
            daysLeft: diffDays,
            priority: ev.priority,
            date: ev.date,
            category: ev.category,
          });
        }
      });

      setCalendarReminders(reminders);
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToFollowRequests(currentUser.uid, (requests) => {
      setFollowRequests(requests);
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, (list) => {
      setFirestoreNotifs(list);
    });
    return () => unsub();
  }, [currentUser]);

  const totalUnread = firestoreNotifs.filter((n) => !n.read).length + followRequests.length;

  async function handleApprove(req: FirestoreFollowRequest) {
    if (!req.id) return;
    setProcessingIds((prev) => new Set(prev).add(req.id!));
    try {
      await approveFollowRequest(req.id, req.fromUid, req.toUid);
      onUpdate();
    } finally {
      setProcessingIds((prev) => { const next = new Set(prev); next.delete(req.id!); return next; });
    }
  }

  async function handleReject(req: FirestoreFollowRequest) {
    if (!req.id) return;
    setProcessingIds((prev) => new Set(prev).add(req.id!));
    try {
      await rejectFollowRequest(req.id);
      onUpdate();
    } finally {
      setProcessingIds((prev) => { const next = new Set(prev); next.delete(req.id!); return next; });
    }
  }

  async function handleDeleteNotification(notifId: string) {
    if (currentUser) {
      await deleteNotificationFirestore(currentUser.uid, notifId);
    }
    setFirestoreNotifs((prev) => prev.filter((n) => n.id !== notifId));
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    onUpdate();
  }

  async function handleDeleteReminder(eventId: string) {
    await deleteCalendarEvent(eventId);
    setCalendarReminders((prev) => prev.filter((r) => r.id !== eventId));
    onUpdate();
  }

  function handleMarkAllRead() {
    markAllNotificationsRead();
    if (currentUser) {
      markAllNotificationsReadFirestore(currentUser.uid);
      setFirestoreNotifs(prev => prev.map(n => ({ ...n, read: true })));
    }
    setNotifications(getNotifications());
    onUpdate();
  }

  function handleLineShare() {
    const url = window.location.origin;
    const text = encodeURIComponent(`就活SNS「CareerLog」で一緒に面接・テスト対策しよう！\n招待リンクはこちら👇\n${url}`);
    window.open(`https://line.me/R/msg/text/?${text}`, '_blank');
  }

  function handleShareApp() {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingTop: 4 }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: 2 }}>お知らせ・通知</h2>
          {totalUnread > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              {totalUnread}件の未読通知
            </p>
          )}
        </div>
        {totalUnread > 0 && (
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

      {/* ── Sub Navigation Tabs ── */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab-item ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          すべて
        </button>
        <button
          className={`tab-item ${tab === 'requests' ? 'active' : ''}`}
          onClick={() => setTab('requests')}
          style={{ gap: 6 }}
        >
          <UserPlus size={15} />
          フォローリクエスト
          {followRequests.length > 0 && (
            <span className="badge" style={{ background: '#10B981', color: 'white', fontSize: '0.7rem' }}>
              {followRequests.length}
            </span>
          )}
        </button>
        <button
          className={`tab-item ${tab === 'reminders' ? 'active' : ''}`}
          onClick={() => setTab('reminders')}
          style={{ gap: 6 }}
        >
          <Calendar size={15} />
          選考アラーム
          {calendarReminders.length > 0 && (
            <span className="badge" style={{ background: '#F59E0B', color: 'white', fontSize: '0.7rem' }}>
              {calendarReminders.length}
            </span>
          )}
        </button>
      </div>

      {/* ── 使い方ガイド・ヘルプパネル (全3タブに常時掲載) ── */}
      {tab === 'all' && (
        <div className="card" style={{
          padding: '14px 16px', marginBottom: 16,
          background: 'var(--bg-surface-2)', border: '1px solid var(--border-color)', borderRadius: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontWeight: 800, fontSize: '0.875rem', marginBottom: 4 }}>
            <Sparkles size={16} /> 全般通知ガイド
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            いいね・コメント・フォロー承認結果など、すべてのアクティビティが届きます。通知をタップすると対象プロフィールへ移動できます。不要な通知はゴミ箱ボタンで削除できます。
          </p>
        </div>
      )}

      {tab === 'requests' && (
        <div className="card" style={{
          padding: '14px 16px', marginBottom: 16,
          background: 'rgba(16, 185, 129, 0.08)', border: '1.5px solid rgba(16, 185, 129, 0.3)', borderRadius: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', fontWeight: 800, fontSize: '0.875rem', marginBottom: 4 }}>
            <UserPlus size={16} /> フォローリクエストガイド
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            非公開アカウント宛てに届いた申請です。「承認」するとお互いの『友達公開』の就活記録がタイムラインに相互共有されます。
          </p>
        </div>
      )}

      {tab === 'reminders' && (
        <div className="card" style={{
          padding: '14px 16px', marginBottom: 16,
          background: 'rgba(245, 158, 11, 0.08)', border: '1.5px solid rgba(245, 158, 11, 0.3)', borderRadius: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F59E0B', fontWeight: 800, fontSize: '0.875rem', marginBottom: 4 }}>
            <Calendar size={16} /> 選考アラームガイド
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            カレンダーに登録された重要選考の締切日・面接当日の「3日前 / 1日前 / 当日」に自動通知されます。企業名・選考内容・日時など必要な情報がコンパクトに集約されています。
          </p>
        </div>
      )}

      {/* ── 1. フォローリクエスト タブ ── */}
      {(tab === 'requests' || (tab === 'all' && followRequests.length > 0)) && (
        <div className="card" style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.06))',
          border: '1.5px solid rgba(16,185,129,0.3)',
          borderRadius: 20,
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg,#10B981,#06B6D4)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <UserPlus size={16} />
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>フォローリクエスト ({followRequests.length})</h3>
            </div>
          </div>

          {followRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              現在届いているフォローリクエストはありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {followRequests.map((req) => {
                const isProcessing = processingIds.has(req.id ?? '');
                return (
                  <div key={req.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--bg-surface-2)', borderRadius: 14,
                    padding: '10px 14px', gap: 10,
                  }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, minWidth: 0 }}
                      onClick={() => onProfileClick(req.fromUid)}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', color: 'white', flexShrink: 0,
                      }}>
                        {req.fromAvatar ? (
                          <img src={req.fromAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          req.fromName?.[0] || 'U'
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {req.fromName || 'ユーザー'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          フォロー申請が届いています
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={isProcessing}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: 8 }}
                      >
                        <Check size={14} /> 承認
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        disabled={isProcessing}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 2. 選考アラーム タブ ── */}
      {(tab === 'reminders' || (tab === 'all' && calendarReminders.length > 0)) && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bell size={18} color="#F59E0B" />
            <span>選考アラーム通知 ({calendarReminders.length})</span>
          </h3>

          {calendarReminders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              現在登録されている選考アラームはありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {calendarReminders.map((rem) => {
                const isToday = rem.daysLeft === 0;
                const isTomorrow = rem.daysLeft === 1;

                return (
                  <div
                    key={rem.id}
                    className="card"
                    style={{
                      padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: isToday ? 'rgba(239, 68, 68, 0.1)' : isTomorrow ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-surface-2)',
                      borderLeft: `4px solid ${isToday ? '#EF4444' : isTomorrow ? '#F59E0B' : '#3B82F6'}`,
                    }}
                  >
                    <div style={{
                      padding: '4px 8px', borderRadius: 6,
                      background: isToday ? '#EF4444' : isTomorrow ? '#F59E0B' : '#3B82F6',
                      color: 'white', fontWeight: 800, fontSize: '0.72rem', flexShrink: 0,
                    }}>
                      {isToday ? '本日選考' : isTomorrow ? '前日' : '3日前'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {rem.title} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({rem.category})</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        予定日: {rem.date} {isToday ? '🔥 本日当日です！' : `(あと${rem.daysLeft}日)`}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: 'var(--text-muted)', padding: 6 }}
                      title="アラームを削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 3. すべての通知履歴 (tab === 'all') ── */}
      {tab === 'all' && (
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
            すべての通知履歴
          </h3>

          {firestoreNotifs.length === 0 && notifications.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🔔</span>
              <p className="empty-state-title">通知履歴はありません</p>
              <p className="empty-state-desc">いいね・コメント・フォローがつくとここに通知が届きます</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {firestoreNotifs.map((notif) => (
                <div
                  key={notif.id}
                  className="card"
                  style={{
                    padding: '12px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12,
                    background: notif.read ? 'var(--bg-surface)' : 'rgba(37, 99, 235, 0.08)',
                    borderLeft: notif.read ? 'none' : '3px solid var(--color-primary)',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => onProfileClick(notif.fromUid)}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.95rem', color: 'white', flexShrink: 0,
                    }}>
                      {notif.fromAvatar ? (
                        <img src={notif.fromAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        notif.fromName?.[0] || 'U'
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {notif.fromName || 'ユーザー'} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{notif.content}</span>
                      </div>
                      {notif.createdAt && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {timeAgo(notif.createdAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notif.id!); }}
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ color: 'var(--text-muted)', padding: 6 }}
                    title="通知を削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
