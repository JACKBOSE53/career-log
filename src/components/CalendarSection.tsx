import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
  Clock, Trash2, X, AlertCircle, CheckCircle2, MapPin, Bell,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToUserPosts,
  subscribeToCalendarEvents,
  addCalendarEvent,
  deleteCalendarEvent,
  formatFirestoreDate,
  type FirestorePost,
  type FirestoreCalendarEvent,
} from '../db/firestore';
import { CATEGORIES, INTERVIEW_SUB_TAGS, type CountdownEvent } from '../db/mockData';
import VerticalTimePicker from './VerticalTimePicker';

import { getLocalDateStr } from '../utils/dateUtils';

interface CalendarSectionProps {
  onUpdate: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ES: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' },
  テスト: { bg: 'rgba(168, 85, 247, 0.12)', text: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' },
  '1次面接': { bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' },
  '2次面接': { bg: 'rgba(220, 38, 38, 0.15)', text: '#EF4444', border: 'rgba(220, 38, 38, 0.35)' },
  '最終面接': { bg: 'rgba(185, 28, 28, 0.2)', text: '#DC2626', border: 'rgba(185, 28, 28, 0.4)' },
  'AI・動画面接': { bg: 'rgba(6, 182, 212, 0.12)', text: '#22D3EE', border: 'rgba(6, 182, 212, 0.3)' },
  '面談・リクルーター': { bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.3)' },
  GD: { bg: 'rgba(236, 72, 153, 0.12)', text: '#F472B6', border: 'rgba(236, 72, 153, 0.3)' },
  説明会: { bg: 'rgba(245, 158, 11, 0.12)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)' },
  OB訪問: { bg: 'rgba(217, 119, 6, 0.12)', text: '#F59E0B', border: 'rgba(217, 119, 6, 0.3)' },
  インターン: { bg: 'rgba(249, 115, 22, 0.12)', text: '#FB923C', border: 'rgba(249, 115, 22, 0.3)' },
  その他: { bg: 'rgba(148, 163, 184, 0.12)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' },
};

function getCategoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS['その他'];
}

export default function CalendarSection({ onUpdate, onToast }: CalendarSectionProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => getLocalDateStr());
  const [countdowns, setCountdowns] = useState<CountdownEvent[]>([]);
  const { currentUser } = useAuth();
  const [myPosts, setMyPosts] = useState<FirestorePost[]>([]);

  // 1分ごとに日付変更をチェックして自動で今日に更新
  useEffect(() => {
    const timer = setInterval(() => {
      const today = getLocalDateStr();
      if (today !== selectedDateStr) {
        setSelectedDateStr(today);
        setCurrentDate(new Date());
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [selectedDateStr]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubPosts = subscribeToUserPosts(currentUser.uid, (posts) => {
      setMyPosts(posts);
    });
    const unsubEvents = subscribeToCalendarEvents(currentUser.uid, (events) => {
      const mapped: CountdownEvent[] = events.map(e => ({
        id: e.id || '',
        title: e.title,
        company: e.company,
        targetDate: e.date,
        category: e.category,
        time: e.time,
        location: e.location,
        priority: e.priority || 'high',
      }));
      setCountdowns(mapped);
    });
    return () => {
      unsubPosts();
      unsubEvents();
    };
  }, [currentUser]);

  useEffect(() => {
    onUpdate();
  }, []);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<string>('ES');
  const [newDate, setNewDate] = useState(() => getLocalDateStr());
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('high');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // 月の第一日の曜日と最終日
  const firstDay = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  async function handleAddEvent() {
    if (!newDate) {
      onToast?.('予定日を選択してください', 'error');
      return;
    }
    if (!currentUser) return;
    const finalTitle = newTitle.trim() || `${newCategory}`;
    const eventData = {
      title: finalTitle,
      company: newCompany.trim() || undefined,
      date: newDate,
      category: newCategory,
      priority: newPriority,
      time: newTime.trim() || undefined,
      location: newLocation.trim() || undefined,
    };

    // Firestoreに保存 → onSnapshotが自動発火し画面に反映
    setShowAddModal(false);
    setNewCompany('');
    setNewTitle('');
    setNewTime('');
    setNewLocation('');

    await addCalendarEvent(currentUser.uid, eventData);
    onToast?.('カレンダーに登録されました！', 'success');
    onUpdate();
  }

  async function handleDeleteEvent(id: string) {
    await deleteCalendarEvent(id);
    onUpdate();
    onToast?.('予定を削除しました', 'success');
  }

  // 選択中の日付に該当するカウントダウンイベントと投稿記録
  const selectedEvents = countdowns.filter((cd) => cd.targetDate === selectedDateStr);
  const selectedPosts = myPosts.filter((p) => formatFirestoreDate(p.createdAt).startsWith(selectedDateStr));

  // カレンダーマスの生成
  const calendarCells = [];
  // 空白セル
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }
  // 日付セル
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = countdowns.filter((cd) => cd.targetDate === dStr);
    const dayPosts = myPosts.filter((p) => formatFirestoreDate(p.createdAt).startsWith(dStr));
    calendarCells.push({
      day: d,
      dateStr: dStr,
      events: dayEvents,
      posts: dayPosts,
      isToday: dStr === getLocalDateStr(),
      isSelected: dStr === selectedDateStr,
    });
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease', paddingBottom: 40 }}>
      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        zIndex: 10,
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '12px 16px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              就活カレンダー
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>選考締切・面接・予定を月間で一元管理</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 99,
                fontSize: '0.68rem', fontWeight: 700,
                background: '#78350F44', color: '#FBBF24', border: '1px solid #92400E55',
              }}>
                <Bell size={10} /> 3日前・前日リマインドON
              </span>
            </div>
          </div>
          <button
            onClick={() => { setNewDate(selectedDateStr); setShowAddModal(true); }}
            className="btn btn-primary btn-sm"
            style={{ gap: 6 }}
          >
            <Plus size={16} /> 予定を追加
          </button>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* ── Month Controls ── */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={prevMonth} className="btn btn-ghost btn-icon btn-sm" aria-label="前月">
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
              {year}年 {month + 1}月
            </h2>
            <button onClick={nextMonth} className="btn btn-ghost btn-icon btn-sm" aria-label="次月">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 8 }}>
            {dayNames.map((name, i) => (
              <div key={name} style={{
                fontSize: '0.75rem', fontWeight: 700,
                color: i === 0 ? '#EF4444' : i === 6 ? '#2563EB' : 'var(--text-muted)',
              }}>
                {name}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} style={{ height: 52 }} />;
              }
              const hasItems = cell.events.length > 0 || cell.posts.length > 0;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  style={{
                    height: 54, padding: '4px 2px', borderRadius: 10,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: cell.isSelected ? 'var(--color-primary-glow)' : cell.isToday ? '#1E293B' : 'transparent',
                    border: `1.5px solid ${cell.isSelected ? 'var(--color-primary)' : cell.isToday ? 'var(--color-primary)' : 'transparent'}`,
                  }}
                >
                  <span style={{
                    fontSize: '0.8rem', fontWeight: cell.isSelected || cell.isToday ? 800 : 500,
                    color: cell.isSelected || cell.isToday ? 'var(--color-primary)' : 'var(--text-primary)',
                  }}>
                    {cell.day}
                  </span>

                  {/* ドットインジケーター */}
                  <div style={{ display: 'flex', gap: 2, height: 12, alignItems: 'center' }}>
                    {cell.events.slice(0, 3).map((ev) => {
                      const style = getCategoryStyle(ev.category);
                      return (
                        <div key={ev.id} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: style.text,
                        }} />
                      );
                    })}
                    {cell.posts.length > 0 && cell.events.length < 3 && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 選択された日の詳細カード (選考予定のみ) ── */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarIcon size={16} color="var(--color-primary)" />
              {selectedDateStr} の予定
            </h3>
            <button
              onClick={() => { setNewDate(selectedDateStr); setShowAddModal(true); }}
              className="btn btn-secondary btn-sm"
              style={{ gap: 4, fontSize: '0.75rem' }}
            >
              <Plus size={14} /> 予定追加
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              この日の選考予定はありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedEvents.map((ev) => {
                const style = getCategoryStyle(ev.category);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const target = new Date(ev.targetDate);
                target.setHours(0, 0, 0, 0);
                const diffTime = target.getTime() - today.getTime();
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isPast = daysLeft < 0;

                return (
                  <div key={ev.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 14,
                    background: isPast ? '#1E293B44' : style.bg,
                    border: `1px solid ${isPast ? '#33415555' : style.border}`,
                    opacity: isPast ? 0.7 : 1,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        {/* 締め切りカウントダウン表示 */}
                        {isPast ? (
                          <span style={{ background: '#334155', color: '#94A3B8', padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700 }}>
                            終了
                          </span>
                        ) : daysLeft === 0 ? (
                          <span style={{ background: '#DC2626', color: 'white', padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800 }}>
                            🔥 本日締切!
                          </span>
                        ) : (
                          <span style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800 }}>
                            ⏳ あと {daysLeft} 日
                          </span>
                        )}

                        {/* 志望度表示 (第一志望群 / 第二志望群 / 練習) */}
                        {ev.priority === 'high' && (
                          <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800 }}>
                            第一志望群
                          </span>
                        )}
                        {ev.priority === 'medium' && (
                          <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700 }}>
                            第二志望群
                          </span>
                        )}
                        {ev.priority === 'low' && (
                          <span style={{ background: 'var(--bg-surface-2)', color: '#94A3B8', border: '1px solid var(--border-color)', padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 600 }}>
                            練習
                          </span>
                        )}

                        <span className="badge" style={{ background: 'var(--bg-surface)', color: isPast ? '#94A3B8' : style.text, border: `1px solid ${isPast ? '#334155' : style.border}`, fontSize: '0.68rem', fontWeight: 700 }}>
                          {ev.category}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.925rem', color: isPast ? '#94A3B8' : 'var(--text-primary)', textDecoration: isPast ? 'line-through' : 'none' }}>
                        {ev.title}
                      </div>

                      {ev.time && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} color="var(--text-muted)" /> {ev.time}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: 'var(--text-muted)' }}
                      title="削除"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 3. 志望度別選考グループ（絵文字なし・シンプルデザイン） ── */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)' }}>
            志望度別選考グループ
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { id: 'high', title: '第一志望群 (本命選考)', color: '#EF4444' },
              { id: 'medium', title: '第二志望群 (併願選考)', color: '#F59E0B' },
              { id: 'low', title: '練習・面接慣れ (情報収集)', color: '#94A3B8' },
            ].map((group) => {
              const groupEvents = countdowns.filter((ev) => (ev.priority || 'high') === group.id);
              const today = new Date(); today.setHours(0, 0, 0, 0);

              return (
                <div key={group.id} style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: 'var(--bg-surface-2)', border: '1px solid var(--border-color)',
                }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 800, color: group.color, marginBottom: 8 }}>
                    {group.title} ({groupEvents.length}件)
                  </div>

                  {groupEvents.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>該当する予定はありません</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {groupEvents.map((ev) => {
                        const target = new Date(ev.targetDate); target.setHours(0, 0, 0, 0);
                        const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const isPast = daysLeft < 0;

                        return (
                          <div key={ev.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 8,
                            background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                            opacity: isPast ? 0.6 : 1,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                              <span style={{
                                background: isPast ? 'var(--bg-surface-2)' : daysLeft === 0 ? '#EF4444' : 'rgba(59, 130, 246, 0.12)',
                                color: isPast ? 'var(--text-muted)' : daysLeft === 0 ? 'white' : '#60A5FA',
                                border: `1px solid ${isPast ? 'var(--border-color)' : 'rgba(59, 130, 246, 0.3)'}`,
                                padding: '1px 7px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800, flexShrink: 0,
                              }}>
                                {isPast ? '終了' : daysLeft === 0 ? '本日締切' : `あと ${daysLeft} 日`}
                              </span>

                              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isPast ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isPast ? 'line-through' : 'none' }}>
                                {ev.title}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                              {ev.targetDate.replace('-', '/').replace('-', '/')} {ev.time ? `(${ev.time})` : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. 🎯 選考ステップ別グループ管理（1次面接/2次面接/最終面接などステップ単位で管理） ── */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              🎯 選考ステップ別グループ管理
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              「1次面接」「2次面接」「3次〜面接」「最終面接」「ES」「テスト」など、現在抱えている選考段階ごとに予定・企業を整理
            </p>
          </div>

          {(() => {
            const STEP_ORDER = [
              { name: 'ES・書類選考', match: (ev: CountdownEvent) => ev.category === 'ES' || ev.title.includes('ES') },
              { name: 'テスト', match: (ev: CountdownEvent) => ev.category === 'テスト' || ev.title.includes('テスト') || ev.title.includes('SPI') },
              { name: '1次面接', match: (ev: CountdownEvent) => ev.title.includes('1次面接') || ev.title.includes('一次面接') },
              { name: '2次面接', match: (ev: CountdownEvent) => ev.title.includes('2次面接') || ev.title.includes('二次面接') },
              { name: '3次〜面接', match: (ev: CountdownEvent) => ev.title.includes('3次') || ev.title.includes('三次') || ev.title.includes('4次') },
              { name: '最終面接', match: (ev: CountdownEvent) => ev.title.includes('最終面接') || ev.title.includes('役員面接') || ev.title.includes('社長面接') },
              { name: '動画面接・AI面接', match: (ev: CountdownEvent) => ev.title.includes('動画面接') || ev.title.includes('AI面接') },
              { name: '面談・リクルーター', match: (ev: CountdownEvent) => ev.title.includes('面談') || ev.title.includes('リクルーター') },
              { name: 'GD・その他', match: (ev: CountdownEvent) => ev.category === 'GD' || ev.category === '説明会' || ev.category === 'インターン' || ev.category === 'OB訪問' || ev.category === 'その他' },
            ];

            const groupedSteps = STEP_ORDER.map((step) => {
              const items = countdowns.filter((ev) => step.match(ev));
              return { ...step, items };
            }).filter((group) => group.items.length > 0);

            if (groupedSteps.length === 0) {
              return (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                  予定を登録すると、「1次面接」「2次面接」「最終面接」などの選考ステップごとに抱えている企業・予定が自動で整理されます！
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {groupedSteps.map((group) => (
                  <div key={group.name} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-surface-2)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>📍 【{group.name}】</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {group.items.length} 件の予定
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {group.items.map((ev) => {
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        const target = new Date(ev.targetDate); target.setHours(0, 0, 0, 0);
                        const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const isPast = daysLeft < 0;

                        return (
                          <div
                            key={ev.id}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              background: isPast ? 'var(--bg-surface)' : 'rgba(37, 99, 235, 0.12)',
                              border: `1px solid ${isPast ? 'var(--border-color)' : 'rgba(37, 99, 235, 0.35)'}`,
                              opacity: isPast ? 0.6 : 1,
                              minWidth: 140,
                            }}
                          >
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isPast ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                              {ev.company ? `${ev.company}` : ev.title}
                            </div>
                            {ev.company && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 1 }}>
                                {ev.title}
                              </div>
                            )}
                            <div style={{ fontSize: '0.68rem', color: isPast ? 'var(--text-muted)' : '#60A5FA', fontWeight: 700, marginTop: 4 }}>
                              {isPast ? '完了' : daysLeft === 0 ? '本日予定!' : `あと${daysLeft}日`} ({ev.targetDate.slice(5).replace('-', '/')})
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* ── 5. カレンダー本体 ── */}
      </div>

      {/* ── 予定追加モーダル (記録投稿と同じカラフルワンタップ項目選択) ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content animate-scaleUp" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, padding: '26px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>就活の選考予定を追加</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>項目カラーでカレンダーをわかりやすくスマートに整理</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost btn-icon" style={{ padding: 8 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 1. 予定の項目選択 (クリアな8色カラーチップ) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  1. 予定の項目 <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(カラーで分類)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map((c) => {
                    const style = getCategoryStyle(c.id);
                    const isSelected = newCategory === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewCategory(c.id)}
                        style={{
                          padding: '6px 14px', borderRadius: 99,
                          fontSize: '0.82rem', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: isSelected ? style.text : 'var(--bg-surface-2)',
                          color: isSelected ? '#FFFFFF' : style.text,
                          border: `1.5px solid ${isSelected ? style.text : style.border}`,
                        }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                {/* 面接が選択された時のサブタグ選択パネル */}
                {newCategory === '面接' && (
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#EF4444', display: 'block', marginBottom: 6 }}>
                      🗣️ 面接の種類・ステップを選択
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {INTERVIEW_SUB_TAGS.map((tag) => {
                        const isSelected = newTitle.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setNewTitle((prev) => {
                                if (!prev) return tag;
                                const parts = prev.split(' ');
                                return `${parts[0]} ${tag}`;
                              });
                            }}
                            style={{
                              padding: '5px 11px', borderRadius: 8,
                              fontSize: '0.76rem', fontWeight: 700,
                              background: isSelected ? '#EF4444' : 'var(--bg-surface)',
                              color: isSelected ? 'white' : 'var(--text-primary)',
                              border: `1px solid ${isSelected ? '#EF4444' : 'var(--border-color)'}`,
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            {isSelected ? '✓ ' : '+ '}{tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. 企業名入力欄 */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  2. 企業名 <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(選考を受ける企業名を入力)</span>
                </label>
                <input
                  className="input"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="例: トヨタ自動車 / サイバーエージェント / ソニー"
                  style={{ fontSize: '0.9rem', padding: '11px 13px' }}
                />
              </div>

              {/* 3. 予定の詳細タイトル・選考ステップ */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  3. 選考ステップ・詳細 <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(面接時は上のサブタグをタップで簡単入力)</span>
                </label>
                <input
                  className="input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例: 1次面接 / ES締め切り / Webテスト"
                  style={{ fontSize: '0.9rem', padding: '11px 13px' }}
                />
              </div>

              {/* 3. 予定日 */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  3. 予定日 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  className="input"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{ fontSize: '0.875rem', padding: '10px 11px' }}
                />
              </div>

              {/* 4. 志望度の選択 (第一志望群 / 第二志望群 / 練習) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  4. 志望度
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { id: 'high' as const, label: '第一志望群', desc: '最優先・本命' },
                    { id: 'medium' as const, label: '第二志望群', desc: '併願・重要' },
                    { id: 'low' as const, label: '練習・面接慣れ', desc: '情報収集' },
                  ].map((p) => {
                    const isSelected = newPriority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setNewPriority(p.id)}
                        style={{
                          padding: '10px 4px', borderRadius: 10,
                          border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--bg-surface-2)' : 'transparent',
                          color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                          fontSize: '0.78rem', fontWeight: isSelected ? 800 : 500, cursor: 'pointer',
                          transition: 'all 0.15s', textAlign: 'center',
                        }}
                      >
                        <div>{p.label}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. 開始時刻 (縦ドラムスライドピッカー) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  5. 開始時刻 <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(上下スライドで選択)</span>
                </label>
                <VerticalTimePicker
                  initialHour={14}
                  initialMinute={0}
                  minuteStep={1}
                  hourUnit="時"
                  onChange={(h, m) => {
                    const formatted = `${String(h).padStart(2, '0')}時${String(m).padStart(2, '0')}分〜`;
                    setNewTime(formatted);
                  }}
                />
              </div>

              <button
                onClick={handleAddEvent}
                className="btn btn-primary"
                style={{
                  marginTop: 6, padding: '13px 0', fontSize: '0.95rem', fontWeight: 800,
                  borderRadius: 12,
                }}
              >
                カレンダーに予定を保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
