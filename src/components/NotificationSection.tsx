import { useState } from 'react';
import { Bell, BellOff, Heart, MessageCircle, UserPlus, Users, Calendar, Sparkles, Share2, Check, X, CheckCircle } from 'lucide-react';
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

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToCalendarEvents,
  subscribeToFollowRequests,
  approveFollowRequest,
  rejectFollowRequest,
  subscribeToNotifications,
  markAllNotificationsReadFirestore,
  type FirestoreFollowRequest,
  type FirestoreNotificationData,
} from '../db/firestore';
import { getLocalDateStr } from '../utils/dateUtils';

export default function NotificationSection({ onUpdate, onProfileClick }: NotificationSectionProps) {
  const [notifications, setNotifications] = useState<Notification[]>(getNotifications());
  const [unread, setUnread] = useState(getUnreadCount());
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

  async function handleApprove(req: FirestoreFollowRequest) {
    if (!req.id) return;
    setProcessingIds((prev) => new Set(prev).add(req.id!));
    try {
      await approveFollowRequest(req.id, req.fromUid, req.toUid);
    } finally {
      setProcessingIds((prev) => { const next = new Set(prev); next.delete(req.id!); return next; });
    }
  }

  async function handleReject(req: FirestoreFollowRequest) {
    if (!req.id) return;
    setProcessingIds((prev) => new Set(prev).add(req.id!));
    try {
      await rejectFollowRequest(req.id);
    } finally {
      setProcessingIds((prev) => { const next = new Set(prev); next.delete(req.id!); return next; });
    }
  }

  function handleMarkAllRead() {
    markAllNotificationsRead();
    if (currentUser) {
      markAllNotificationsReadFirestore(currentUser.uid);
    }
    setNotifications(getNotifications());
    setUnread(0);
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

      {/* ── Sub Navigation Tabs ── */}
      <div className="tabs" style={{ marginBottom: 20 }}>
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

      {/* ── フォローリクエスト表示 (tab === 'all' で件数がある場合、または tab === 'requests') ── */}
      {(tab === 'requests' || (tab === 'all' && followRequests.length > 0)) && (
        <div className="card" style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.08))',
          border: '1.5px solid rgba(16,185,129,0.3)',
          borderRadius: 20,
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg,#10B981,#06B6D4)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <UserPlus size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>フォローリクエスト</h3>
                <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700 }}>
                  {followRequests.length > 0 ? `${followRequests.length}件の未承認リクエスト` : '新しいリクエストはありません'}
                </span>
              </div>
            </div>
          </div>

          {followRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                ✨ 現在届いているフォローリクエストはありません
              </p>
              <p style={{ fontSize: '0.75rem', marginTop: 4 }}>
                非公開アカウント宛てに他ユーザーからフォロー申請が届くと、ここに一覧表示され「承認」「拒否」を選択できるようになります。
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {followRequests.map((req) => {
                const isProcessing = processingIds.has(req.id ?? '');
                return (
                  <div key={req.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--bg-surface-2)', borderRadius: 14,
                    padding: '12px 14px',
                  }}>
                    {/* アバターとユーザー名 (クリックでプロフィール閲覧) */}
                    <div
                      onClick={() => onProfileClick(req.fromUid)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}
                    >
                      {req.fromAvatar ? (
                        <img
                          src={req.fromAvatar}
                          alt={req.fromName}
                          style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 42, height: 42, borderRadius: '50%',
                          background: 'var(--color-primary-glow)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <UserPlus size={20} color="var(--color-primary)" />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.fromName || 'ユーザー'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>フォローをリクエストしています</p>
                      </div>
                    </div>

                    {/* ボタン */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={isProcessing}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '7px 14px', borderRadius: 10, border: 'none',
                          background: '#10B981', color: 'white',
                          fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                          opacity: isProcessing ? 0.5 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        <CheckCircle size={14} />
                        承認
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        disabled={isProcessing}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '7px 12px', borderRadius: 10,
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-muted)',
                          fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                          opacity: isProcessing ? 0.5 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        <X size={14} />
                        拒否
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 1. SNS機能全面アピール ＆ 友達招待カード ── */}
      <div className="card" style={{
        padding: '18px 20px',
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(139, 92, 246, 0.1))',
        border: '1.5px solid rgba(59, 130, 246, 0.3)',
        borderRadius: 20,
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--color-primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Users size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              仲間と高め合う！就活SNSへようこそ🎉
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>
              つながる · 応援する · 一緒に合格をつかむ
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
          1人で抱えがちな就活も、仲間と一緒なら乗り越えられる！投稿に「いいね」や「コメント」をしてアドバイスを交換したり、同じ志望業界の友達をフォローしてモチベーションを高め合おう！
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleLineShare}
            style={{
              flex: 1.2, padding: '10px 0', fontSize: '0.85rem', fontWeight: 800,
              borderRadius: 12, border: 'none', background: '#06C755', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(6, 199, 85, 0.25)',
              transition: 'all 0.15s',
            }}
          >
            💬 LINEで友達を誘う
          </button>

          <button
            onClick={handleShareApp}
            className="btn btn-secondary"
            style={{ flex: 0.8, padding: '10px 12px', fontSize: '0.82rem', fontWeight: 700, borderRadius: 12, gap: 6 }}
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? 'コピー完了' : 'URLコピー'}
          </button>
        </div>
      </div>

      {/* ── 2. カレンダー優先度 ＆ 3日前・前日アラーム通知機能カード ── */}
      <div className="card" style={{
        padding: '18px 20px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(239, 68, 68, 0.08))',
        border: '1.5px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 20,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#F59E0B', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Calendar size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              スマートカレンダー ＆ アラーム通知⏰
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 700 }}>
              選考までのカウントダウン · うっかり忘れゼロへ！
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ color: '#F59E0B', fontWeight: 800 }}>📌 優先順位 ＆ カウントダウン表示:</span>
            <span>面接やWEBテストなどの重要度（優先度）を設定可能！本番まで「あと〇日」とひと目で把握できます。</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ color: '#EF4444', fontWeight: 800 }}>⏰ 3日前 ＆ 前日の自動アラーム通知:</span>
            <span>大切な予定に近づくと、【3日前】と【前日】にリマインド通知でお知らせ！本番直前まで準備を逃しません。</span>
          </div>
        </div>
      </div>

      {/* ── 3. 今すぐ使える！カンタン3ステップ ── */}
      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Sparkles size={18} color="var(--color-primary)" />
        <span>CareerLogのカンタン使い方ガイド 📖</span>
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-surface-2)', color: 'var(--color-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            1
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>「記録する」で日々の就活を投稿</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>タイマー機能や手動入力で、ES・テスト対策・面接の時間を記録しよう！</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-surface-2)', color: 'var(--color-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            2
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>「カレンダー」で選考日程を登録</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>優先度を設定し、本番選考までの「あと〇日」カウントダウンとリマインド通知を活用！</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-surface-2)', color: 'var(--color-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            3
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>タイムラインで仲間に「いいね」＆フォロー</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>同じ志望業界の友達と繋がって、互いの進捗にいいねやコメントでエールを贈ろう！</div>
          </div>
        </div>
      </div>

      {/* ── カレンダーから自動検出されたリアルタイムアラーム通知 ── */}
      {calendarReminders.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bell size={18} color="#EF4444" />
            <span>【自動アラーム通知】選考リマインダー ({calendarReminders.length})</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {calendarReminders.map((rem) => {
              const isToday = rem.daysLeft === 0;
              const isTomorrow = rem.daysLeft === 1;
              const isHigh = rem.priority === 'high';

              return (
                <div
                  key={rem.id}
                  className="card"
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    background: isToday ? 'rgba(239, 68, 68, 0.12)' : isTomorrow ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.1)',
                    borderLeft: `4px solid ${isToday ? '#EF4444' : isTomorrow ? '#F59E0B' : '#3B82F6'}`,
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: isToday ? '#EF4444' : isTomorrow ? '#F59E0B' : '#3B82F6',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontWeight: 800, fontSize: '0.82rem'
                  }}>
                    {isToday ? '今日' : isTomorrow ? '前日' : '3日前'}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {rem.title} ({rem.category})
                      </span>
                      {isHigh && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontWeight: 800, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          第一志望群
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {isToday ? '⚠️ 本日選考当日です！最終準備を完了して全力を尽くそう！' : isTomorrow ? '⏰ 明日が選考日です！持ち物と面接対策の最終確認を行おう！' : '📅 選考3日前です！準備を進めよう！'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
        通知履歴
      </h3>

      {/* Notification List */}
      {firestoreNotifs.length === 0 && notifications.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🔔</span>
          <p className="empty-state-title">新着通知はまだありません</p>
          <p className="empty-state-desc">仲間をフォローしたり投稿にいいね・コメントがつくとここに届きます！</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Firestore リアルタイム通知 */}
          {firestoreNotifs.map((notif) => (
            <div
              key={notif.id}
              className="card"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                background: notif.read ? 'var(--bg-surface)' : 'rgba(224, 109, 83, 0.1)',
                borderLeft: notif.read ? 'none' : '3px solid var(--color-primary)',
                animation: 'fadeInUp 0.2s ease',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onClick={() => onProfileClick(notif.fromUid)}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {notif.fromAvatar ? (
                  <img src={notif.fromAvatar} alt={notif.fromName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: 'white', fontWeight: 'bold' }}>
                    {notif.fromName?.[0] || 'U'}
                  </span>
                )}
                <span style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'white', border: '1.5px solid var(--border-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {notif.type === 'like' ? <Heart size={11} fill="#EF4444" color="#EF4444" /> : notif.type === 'comment' ? <MessageCircle size={11} color="#3B82F6" /> : <UserPlus size={11} color="#10B981" />}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  <strong>{notif.fromName || 'ユーザー'}</strong>
                  {notif.type === 'like' && 'さんがあなたの投稿にいいねしました 💖'}
                  {notif.type === 'comment' && 'さんがあなたの投稿にコメントしました 💬'}
                  {notif.type === 'follow_accept' && 'さんがフォローリクエストを承認しました 🎉'}
                  {notif.type === 'follow_request' && 'さんがフォローをリクエストしています 👤'}
                </p>
                {notif.content && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {notif.content}
                  </p>
                )}
              </div>

              {!notif.read && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: 4 }} />
              )}
            </div>
          ))}

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
                    {notif.type === 'like' && 'さんがあなたの投稿にいいねしました 💖'}
                    {notif.type === 'comment' && 'さんがあなたの投稿にコメントしました 💬'}
                    {notif.type === 'follow' && 'さんがあなたをフォローしました 👤'}
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
