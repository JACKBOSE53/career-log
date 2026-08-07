import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
  Clock, Trash2, X, AlertCircle, CheckCircle2, MapPin, Bell,
} from 'lucide-react';
import { getCountdowns, addCountdown, deleteCountdown, getPostsByUser, getCurrentUserId, checkAndGenerateReminderNotifications } from '../db/store';
import type { CountdownEvent } from '../db/mockData';
import VerticalTimePicker from './VerticalTimePicker';

interface CalendarSectionProps {
  onUpdate: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ES: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' },
  SPI: { bg: 'rgba(168, 85, 247, 0.12)', text: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' },
  WEBテスト: { bg: 'rgba(14, 165, 233, 0.12)', text: '#38BDF8', border: 'rgba(14, 165, 233, 0.3)' },
  面接: { bg: 'rgba(244, 63, 94, 0.12)', text: '#FB7185', border: 'rgba(244, 63, 94, 0.3)' },
  OB訪問: { bg: 'rgba(245, 158, 11, 0.12)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)' },
  説明会: { bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.3)' },
  自己分析: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818CF8', border: 'rgba(99, 102, 241, 0.3)' },
  GD: { bg: 'rgba(236, 72, 153, 0.12)', text: '#F472B6', border: 'rgba(236, 72, 153, 0.3)' },
  インターン: { bg: 'rgba(249, 115, 22, 0.12)', text: '#FB923C', border: 'rgba(249, 115, 22, 0.3)' },
  その他: { bg: 'rgba(148, 163, 184, 0.12)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' },
};

function getCategoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS['その他'];
}

export default function CalendarSection({ onUpdate, onToast }: CalendarSectionProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [countdowns, setCountdowns] = useState<CountdownEvent[]>(() => getCountdowns());
  const myPosts = getPostsByUser(getCurrentUserId());

  useEffect(() => {
    // 画面表示時に3日前・前日のリマインド通知を全自動生成
    checkAndGenerateReminderNotifications();
    onUpdate();
  }, []);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(selectedDateStr);
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('ES');
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

  function handleAddEvent() {
    if (!newDate) {
      onToast?.('予定日を選択してください', 'error');
      return;
    }
    const finalTitle = newTitle.trim() || `${newCategory}`;
    const updated = addCountdown({
      title: finalTitle,
      targetDate: newDate,
      category: newCategory,
      time: newTime.trim() || undefined,
      location: newLocation.trim() || undefined,
      priority: newPriority,
    });
    setCountdowns(updated);
    setShowAddModal(false);
    setNewTitle('');
    setNewTime('');
    setNewLocation('');
    onUpdate();
    onToast?.('カレンダーに登録されました', 'success');
  }

  function handleDeleteEvent(id: string) {
    const updated = deleteCountdown(id);
    setCountdowns(updated);
    onUpdate();
    onToast?.('予定を削除しました', 'success');
  }

  // 選択中の日付に該当するカウントダウンイベントと投稿記録
  const selectedEvents = countdowns.filter((cd) => cd.targetDate === selectedDateStr);
  const selectedPosts = myPosts.filter((p) => p.createdAt.startsWith(selectedDateStr));

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
    const dayPosts = myPosts.filter((p) => p.createdAt.startsWith(dStr));
    calendarCells.push({
      day: d,
      dateStr: dStr,
      events: dayEvents,
      posts: dayPosts,
      isToday: dStr === new Date().toISOString().split('T')[0],
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

                        {/* 優先度カテゴリー表示 (高め / 普通 / 低め) */}
                        {ev.priority === 'high' && (
                          <span style={{ background: '#88133755', color: '#F87171', border: '1px solid #9F1239', padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800 }}>
                            🔴 優先度高め
                          </span>
                        )}
                        {ev.priority === 'medium' && (
                          <span style={{ background: '#78350F55', color: '#FBBF24', border: '1px solid #92400E', padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700 }}>
                            🟡 優先度普通
                          </span>
                        )}
                        {ev.priority === 'low' && (
                          <span style={{ background: '#1E293B', color: '#94A3B8', border: '1px solid #334155', padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 600 }}>
                            🟢 優先度低め
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


        {/* ── 3. 🏆 優先順位ごとの枠組み（🔴 優先度高め / 🟡 優先度普通 / 🟢 優先度低め） ── */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            🏆 優先度別の枠組みグループ
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { id: 'high', title: '🔴 優先度高め (第一志望・本命)', color: '#F87171', border: '#9F1239', bg: '#88133722' },
              { id: 'medium', title: '🟡 優先度普通 (志望度中)', color: '#FBBF24', border: '#92400E', bg: '#78350F22' },
              { id: 'low', title: '🟢 優先度低め (滑り止め・念のため)', color: '#94A3B8', border: '#334155', bg: '#1E293B33' },
            ].map((group) => {
              const groupEvents = countdowns.filter((ev) => (ev.priority || 'high') === group.id);
              const today = new Date(); today.setHours(0, 0, 0, 0);

              return (
                <div key={group.id} style={{
                  padding: 14, borderRadius: 14,
                  background: group.bg, border: `1px solid ${group.border}`,
                }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 800, color: group.color, marginBottom: 10 }}>
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
                            padding: '10px 12px', borderRadius: 10,
                            background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                            opacity: isPast ? 0.6 : 1,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                              {/* 締切までの日数表示 */}
                              <span style={{
                                background: isPast ? '#334155' : daysLeft === 0 ? '#DC2626' : 'var(--color-primary-glow)',
                                color: isPast ? '#94A3B8' : daysLeft === 0 ? 'white' : 'var(--color-primary)',
                                border: `1px solid ${isPast ? '#334155' : 'var(--color-primary)'}`,
                                padding: '1px 7px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800, flexShrink: 0,
                              }}>
                                {isPast ? '終了' : daysLeft === 0 ? '本日締切!' : `あと ${daysLeft} 日`}
                              </span>

                              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isPast ? '#94A3B8' : 'var(--text-primary)', textDecoration: isPast ? 'line-through' : 'none' }}>
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
              {/* 1. 予定の項目選択 (記録と同じワンタップカラーチップ) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  1. 予定の項目 <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(タップしてテーマカラーを決定)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    'ES', 'SPI', 'WEBテスト', '面接', 'OB訪問',
                    '説明会', '自己分析', 'GD', 'インターン', 'その他'
                  ].map((cat) => {
                    const style = getCategoryStyle(cat);
                    const isSelected = newCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        style={{
                          padding: '6px 13px', borderRadius: 99,
                          fontSize: '0.78rem', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: isSelected ? style.text : 'var(--bg-surface-2)',
                          color: isSelected ? '#FFFFFF' : style.text,
                          border: `1.5px solid ${isSelected ? style.text : style.border}`,
                          boxShadow: isSelected ? `0 0 10px ${style.text}55` : 'none',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. 予定の企業名・タイトル (任意) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  2. 企業名・詳細 <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(任意・未入力の場合はカテゴリ名になります)</span>
                </label>
                <input
                  className="input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={`例: リクルート / サイバーエージェント (空欄でもOK)`}
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

              {/* 4. 優先度の選択 (最重要 / 普通 / 低) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                  4. 優先度 <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(志望度・本命度の指定)</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { id: 'high' as const, label: '🔴 優先度高め', color: '#F87171', bg: '#88133744', border: '#9F1239' },
                    { id: 'medium' as const, label: '🟡 優先度普通', color: '#FBBF24', bg: '#78350F44', border: '#92400E' },
                    { id: 'low' as const, label: '🟢 優先度低め', color: '#94A3B8', bg: '#1E293B', border: '#334155' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPriority(p.id)}
                      style={{
                        padding: '9px 4px', borderRadius: 10,
                        border: `1.5px solid ${newPriority === p.id ? p.color : 'var(--border-color)'}`,
                        background: newPriority === p.id ? p.bg : 'var(--bg-surface-2)',
                        color: newPriority === p.id ? p.color : 'var(--text-secondary)',
                        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.15s', textAlign: 'center',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
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
