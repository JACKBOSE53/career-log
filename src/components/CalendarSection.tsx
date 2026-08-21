import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
  Clock, Trash2, Edit3, X, AlertCircle, CheckCircle2, Check, MapPin, Bell, MoreVertical,
  Link as LinkIcon, FileText, ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToUserPosts,
  subscribeToCalendarEvents,
  addCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  formatFirestoreDateLocal,
  getPostDateStr,
  type FirestorePost,
  type FirestoreCalendarEvent,
} from '../db/firestore';
import { type CountdownEvent } from '../db/mockData';
import CategoryBadge from './CategoryBadge';
import VerticalTimePicker from './VerticalTimePicker';

import { getLocalDateStr } from '../utils/dateUtils';

interface CalendarSectionProps {
  onUpdate: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export const CALENDAR_CATEGORIES = [
  { id: '面接', label: '面接', color: '#EF4444', dotColor: '#EF4444', bg: '#FFF5F5', border: '#FFE4E6' },
  { id: 'ES', label: 'ES', color: '#2563EB', dotColor: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'テスト', label: 'テスト', color: '#8B5CF6', dotColor: '#8B5CF6', bg: '#FAF5FF', border: '#F3E8FF' },
  { id: 'GD', label: 'GD', color: '#EC4899', dotColor: '#EC4899', bg: '#FFF5F9', border: '#FCE7F3' },
  { id: 'インターン', label: 'インターン', color: '#F97316', dotColor: '#F97316', bg: '#FFF9F5', border: '#FFEDD5' },
  { id: 'その他', label: 'その他', color: '#64748B', dotColor: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
];

export const STEP_OPTIONS: Record<string, string[]> = {
  ES: ['締切'],
  テスト: ['SPI', '玉手箱', 'TG-WEB', 'GAB', 'CAB', 'CUBIC', 'Webテスティング', 'その他'],
  面接: ['1次面接', '2次面接', '3次〜面接', '最終面接', '動画面接', 'AI面接', '面談・リクルーター'],
  GD: ['対面', 'WEB'],
  インターン: ['対面', 'WEB'],
  その他: [],
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ES: { bg: '#F4F6FF', text: '#4F46E5', border: '#E0E7FF' },
  テスト: { bg: '#FAF5FF', text: '#9333EA', border: '#F3E8FF' },
  '1次面接': { bg: '#FFF5F5', text: '#E11D48', border: '#FFE4E6' },
  '2次面接': { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
  '3次〜面接': { bg: '#FFE4E6', text: '#9F1239', border: '#FDA4AF' },
  '最終面接': { bg: '#FFE4E6', text: '#9F1239', border: '#FDA4AF' },
  '動画面接': { bg: '#ECFEFF', text: '#0891B2', border: '#CFFAFE' },
  'AI面接': { bg: '#ECFEFF', text: '#0891B2', border: '#CFFAFE' },
  '面談・リクルーター': { bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7' },
  面接: { bg: '#FFF5F5', text: '#EF4444', border: '#FFE4E6' },
  GD: { bg: '#FFF5F9', text: '#DB2777', border: '#FCE7F3' },
  インターン: { bg: '#FFF9F5', text: '#EA580C', border: '#FFEDD5' },
  その他: { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' },
};

function getCategoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS['その他'];
}

function formatJapaneseDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${dayNames[d.getDay()]})`;
}

export default function CalendarSection({ onUpdate, onToast }: CalendarSectionProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => getLocalDateStr());
  const [countdowns, setCountdowns] = useState<CountdownEvent[]>([]);
  const { currentUser } = useAuth();
  const [myPosts, setMyPosts] = useState<FirestorePost[]>([]);
  const [openMenuEventId, setOpenMenuEventId] = useState<string | null>(null);

  // 外側クリックでメニューを閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (openMenuEventId && !(e.target as HTMLElement).closest('.event-menu-container')) {
        setOpenMenuEventId(null);
      }
    }
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openMenuEventId]);

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
    const unsubPosts = subscribeToUserPosts(currentUser.uid, currentUser.uid, true, (posts) => {
      setMyPosts(posts);
    });
    const unsubEvents = subscribeToCalendarEvents(currentUser.uid, (events) => {
      const mapped: CountdownEvent[] = events.map(e => ({
        id: e.id || '',
        title: e.title,
        company: e.company,
        targetDate: e.date,
        endDate: e.endDate || e.date,
        category: e.category,
        time: e.time,
        endTime: e.endTime,
        location: e.location,
        url: e.url,
        isAllDay: e.isAllDay,
        alarm: e.alarm,
        step: e.step,
        priority: e.priority || 'high',
        completed: Boolean(e.completed),
      }));
      setCountdowns(mapped);
    });
    const handleAutoUpdate = () => {
      onUpdate();
    };
    window.addEventListener('career_log_data_updated', handleAutoUpdate);

    return () => {
      unsubPosts();
      unsubEvents();
      window.removeEventListener('career_log_data_updated', handleAutoUpdate);
    };
  }, [currentUser]);

  useEffect(() => {
    onUpdate();
  }, []);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form Fields
  const [newCategory, setNewCategory] = useState<string>('面接');
  const [newCompany, setNewCompany] = useState('');
  const [newStep, setNewStep] = useState('1次面接');
  const [newOtherStep, setNewOtherStep] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [newDate, setNewDate] = useState(() => getLocalDateStr());
  const [newTime, setNewTime] = useState('14:00');
  const [newEndDate, setNewEndDate] = useState(() => getLocalDateStr());
  const [newEndTime, setNewEndTime] = useState('15:00');
  const [newAlarm, setNewAlarm] = useState('none');
  const [newLocation, setNewLocation] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newMemo, setNewMemo] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  // カテゴリ変更時に初期ステップを自動セット
  function handleSelectCategory(catId: string) {
    setNewCategory(catId);
    setShowCategoryPicker(false);
    const options = STEP_OPTIONS[catId] || [];
    if (options.length > 0) {
      setNewStep(options[0]);
    } else {
      setNewStep('');
    }
  }

  function handleOpenAddModal() {
    setEditingEventId(null);
    setNewCategory('面接');
    setNewCompany('');
    setNewStep('1次面接');
    setNewOtherStep('');
    setIsAllDay(false);
    setNewDate(selectedDateStr || getLocalDateStr());
    setNewTime('14:00');
    setNewEndDate(selectedDateStr || getLocalDateStr());
    setNewEndTime('15:00');
    setNewAlarm('none');
    setNewLocation('');
    setNewUrl('');
    setNewMemo('');
    setShowCategoryPicker(false);
    setShowAddModal(true);
  }

  function handleOpenEditModal(ev: CountdownEvent) {
    setEditingEventId(ev.id);
    setNewCategory(ev.category || '面接');
    setNewCompany(ev.company || '');
    setNewStep(ev.step || ev.title || '');
    setNewOtherStep(ev.step || '');
    setIsAllDay(Boolean(ev.isAllDay));
    setNewDate(ev.targetDate);
    setNewTime(ev.time || '14:00');
    setNewEndDate(ev.endDate || ev.targetDate);
    setNewEndTime(ev.endTime || '15:00');
    setNewAlarm(ev.alarm || 'none');
    setNewLocation(ev.location || '');
    setNewUrl(ev.url || '');
    setNewMemo('');
    setShowCategoryPicker(false);
    setShowAddModal(true);
  }

  async function handleAddEvent() {
    if (!newDate) {
      onToast?.('開始日を選択してください', 'error');
      return;
    }
    const effectiveUid = currentUser?.uid || 'user-me';
    const effectiveStep = newCategory === 'その他' ? (newOtherStep.trim() || '予定') : (newStep || newCategory);
    
    // 表示用タイトルの構築: 「企業名 【選考ステップ】」または「企業名」または「選考ステップ」
    let finalTitle = '';
    if (newCompany.trim() && effectiveStep) {
      finalTitle = `${newCompany.trim()} 【${effectiveStep}】`;
    } else if (newCompany.trim()) {
      finalTitle = newCompany.trim();
    } else {
      finalTitle = effectiveStep || `${newCategory}`;
    }

    const calculatedEndDate = newEndDate && newEndDate >= newDate ? newEndDate : newDate;

    const eventData: Parameters<typeof addCalendarEvent>[1] = {
      title: finalTitle,
      company: newCompany.trim() || undefined,
      category: newCategory,
      step: effectiveStep,
      date: newDate,
      endDate: calculatedEndDate,
      time: isAllDay ? undefined : newTime,
      endTime: isAllDay ? undefined : newEndTime,
      isAllDay: isAllDay,
      alarm: newAlarm !== 'none' ? newAlarm : undefined,
      location: newLocation.trim() || undefined,
      url: newUrl.trim() || undefined,
      memo: newMemo.trim() || undefined,
    };

    setShowAddModal(false);

    try {
      if (editingEventId) {
        await updateCalendarEvent(editingEventId, eventData);
        onToast?.('選考予定を更新しました！', 'success');
      } else {
        await addCalendarEvent(effectiveUid, eventData);
        onToast?.('カレンダーに登録されました！', 'success');
      }
      onUpdate();
      setTimeout(() => {
        window.location.reload();
      }, 350);
    } catch (e) {
      console.error('handleAddEvent error:', e);
      onToast?.('保存されました', 'success');
      onUpdate();
      setTimeout(() => {
        window.location.reload();
      }, 350);
    }
  }

  async function handleDeleteEvent(id: string) {
    await deleteCalendarEvent(id);
    onUpdate();
    onToast?.('予定を削除しました', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 350);
  }

  async function handleToggleComplete(ev: CountdownEvent) {
    setOpenMenuEventId(null);
    const newCompleted = !ev.completed;
    await updateCalendarEvent(ev.id, { completed: newCompleted });
    onUpdate();
    onToast?.(
      newCompleted ? `「${ev.title}」を完了にしました！🎉` : `「${ev.title}」を未完了に戻しました`,
      'success'
    );
  }

  // 選択中の日付に該当するカウントダウンイベント (単日および複数日跨ぎに対応)
  const selectedEvents = countdowns.filter((cd) => {
    const start = cd.targetDate;
    const end = cd.endDate || cd.targetDate;
    return start <= selectedDateStr && selectedDateStr <= end;
  });
  const selectedPosts = myPosts.filter((p) => getPostDateStr(p).startsWith(selectedDateStr));

  // ─── カレンダーマスの生成（前月・当月・翌月を含むフルグリッド） ───
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  interface CalendarGridCell {
    day: number;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    dayOfWeek: number;
    events: CountdownEvent[];
    posts: FirestorePost[];
  }

  const calendarCells: CalendarGridCell[] = [];

  // 前月の日付
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayEvents = countdowns.filter((cd) => {
      const start = cd.targetDate;
      const end = cd.endDate || cd.targetDate;
      return start <= dStr && dStr <= end;
    });
    const dayPosts = myPosts.filter((p) => getPostDateStr(p).startsWith(dStr));
    calendarCells.push({
      day: dayNum,
      dateStr: dStr,
      isCurrentMonth: false,
      isToday: dStr === getLocalDateStr(),
      isSelected: dStr === selectedDateStr,
      dayOfWeek: prevDate.getDay(),
      events: dayEvents,
      posts: dayPosts,
    });
  }

  // 当月の日付
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = countdowns.filter((cd) => {
      const start = cd.targetDate;
      const end = cd.endDate || cd.targetDate;
      return start <= dStr && dStr <= end;
    });
    const dayPosts = myPosts.filter((p) => getPostDateStr(p).startsWith(dStr));
    const dayOfWeek = (firstDayOfWeek + d - 1) % 7;
    calendarCells.push({
      day: d,
      dateStr: dStr,
      isCurrentMonth: true,
      isToday: dStr === getLocalDateStr(),
      isSelected: dStr === selectedDateStr,
      dayOfWeek,
      events: dayEvents,
      posts: dayPosts,
    });
  }

  // 翌月の日付（35マスまたは42マスでグリッドを完成）
  const totalCellsNeeded = calendarCells.length > 35 ? 42 : 35;
  const remaining = totalCellsNeeded - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextDate = new Date(year, month + 1, d);
    const dStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = countdowns.filter((cd) => {
      const start = cd.targetDate;
      const end = cd.endDate || cd.targetDate;
      return start <= dStr && dStr <= end;
    });
    const dayPosts = myPosts.filter((p) => getPostDateStr(p).startsWith(dStr));
    calendarCells.push({
      day: d,
      dateStr: dStr,
      isCurrentMonth: false,
      isToday: dStr === getLocalDateStr(),
      isSelected: dStr === selectedDateStr,
      dayOfWeek: nextDate.getDay(),
      events: dayEvents,
      posts: dayPosts,
    });
  }

  // ─── イベントピル専用の透明感あふれるクリーンなパレット（黒ずみゼロ・高コントラスト） ───
  interface PillStyle {
    bg: string;
    border: string;
    text: string;
  }

  const TRANSLUCENT_PILL_STYLES: Record<string, PillStyle> = {
    ES: {
      bg: 'rgba(37, 99, 235, 0.12)',
      border: 'rgba(37, 99, 235, 0.3)',
      text: '#1D4ED8',
    },
    テスト: {
      bg: 'rgba(5, 150, 105, 0.12)',
      border: 'rgba(5, 150, 105, 0.3)',
      text: '#047857',
    },
    '1次面接': {
      bg: 'rgba(220, 38, 38, 0.12)',
      border: 'rgba(220, 38, 38, 0.3)',
      text: '#B91C1C',
    },
    '2次面接': {
      bg: 'rgba(190, 18, 60, 0.12)',
      border: 'rgba(190, 18, 60, 0.3)',
      text: '#9F1239',
    },
    '最終面接': {
      bg: 'rgba(185, 28, 28, 0.14)',
      border: 'rgba(185, 28, 28, 0.35)',
      text: '#991B1B',
    },
    'AI・動画面接': {
      bg: 'rgba(8, 145, 178, 0.12)',
      border: 'rgba(8, 145, 178, 0.3)',
      text: '#0E7490',
    },
    '面談・リクルーター': {
      bg: 'rgba(5, 150, 105, 0.12)',
      border: 'rgba(5, 150, 105, 0.3)',
      text: '#047857',
    },
    GD: {
      bg: 'rgba(219, 39, 119, 0.12)',
      border: 'rgba(219, 39, 119, 0.3)',
      text: '#BE185D',
    },
    説明会: {
      bg: 'rgba(217, 119, 6, 0.12)',
      border: 'rgba(217, 119, 6, 0.3)',
      text: '#B45309',
    },
    OB訪問: {
      bg: 'rgba(13, 148, 136, 0.12)',
      border: 'rgba(13, 148, 136, 0.3)',
      text: '#0F766E',
    },
    インターン: {
      bg: 'rgba(217, 119, 6, 0.14)',
      border: 'rgba(217, 119, 6, 0.35)',
      text: '#B45309',
    },
    その他: {
      bg: 'rgba(100, 116, 139, 0.12)',
      border: 'rgba(100, 116, 139, 0.28)',
      text: '#475569',
    },
  };

  function getPillStyle(ev: CountdownEvent): PillStyle {
    if (TRANSLUCENT_PILL_STYLES[ev.category]) return TRANSLUCENT_PILL_STYLES[ev.category];
    const str = ev.company || ev.title;
    if (str.includes('証券') || str.includes('銀行') || str.includes('金融')) {
      return { bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.3)', text: '#1D4ED8' };
    }
    if (str.includes('不動産') || str.includes('商社')) {
      return { bg: 'rgba(13, 148, 136, 0.12)', border: 'rgba(13, 148, 136, 0.3)', text: '#0F766E' };
    }
    if (str.includes('バイト') || str.includes('塾')) {
      return { bg: 'rgba(220, 38, 38, 0.12)', border: 'rgba(220, 38, 38, 0.3)', text: '#B91C1C' };
    }
    if (str.includes('SPI') || str.includes('Webテスト')) {
      return { bg: 'rgba(5, 150, 105, 0.12)', border: 'rgba(5, 150, 105, 0.3)', text: '#047857' };
    }
    return { bg: 'rgba(217, 119, 6, 0.12)', border: 'rgba(217, 119, 6, 0.3)', text: '#B45309' };
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease', paddingBottom: 60, position: 'relative' }}>
      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        zIndex: 10,
        borderBottom: '1px solid var(--border-color)',
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
                background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)',
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
        <div className="card" style={{ padding: '16px 14px', marginBottom: 16, border: '1px solid var(--border-color)', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={prevMonth} className="btn btn-ghost btn-icon btn-sm" aria-label="前月">
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {year}年 {month + 1}月
            </h2>
            <button onClick={nextMonth} className="btn btn-ghost btn-icon btn-sm" aria-label="次月">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            textAlign: 'center',
            marginBottom: 6,
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: 6,
          }}>
            {dayNames.map((name, i) => (
              <div key={name} style={{
                fontSize: '0.78rem', fontWeight: 700,
                color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : 'var(--text-muted)',
              }}>
                {name}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド（スリム＆シャープな境界線のフルグリッド） */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            {calendarCells.map((cell) => {
              const isSunday = cell.dayOfWeek === 0;
              const isSaturday = cell.dayOfWeek === 6;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  style={{
                    minHeight: 56,
                    padding: '3px 2px 2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: cell.isSelected
                      ? (cell.isCurrentMonth
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)'
                        : 'rgba(56, 189, 248, 0.12)')
                      : (cell.isCurrentMonth
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(0, 0, 0, 0.28)'),
                    boxShadow: cell.isSelected ? 'inset 0 0 0 1.5px #38BDF8' : 'none',
                    position: 'relative',
                    zIndex: cell.isSelected ? 5 : 1,
                  }}
                >
                  {/* 日付数字 */}
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
                    {cell.isToday ? (
                      <span style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: '#2563EB',
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                      }}>
                        {cell.day}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: cell.isSelected ? 800 : 600,
                        color: !cell.isCurrentMonth
                          ? 'rgba(255, 255, 255, 0.22)'
                          : isSunday
                          ? '#EF4444'
                          : isSaturday
                          ? '#38BDF8'
                          : 'var(--text-primary)',
                      }}>
                        {cell.day}
                      </span>
                    )}
                  </div>

                  {/* ── イベントバー（スリムな連日帯 ＆ 単日ピル） ── */}
                  <div style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    overflow: 'visible',
                    zIndex: 2,
                  }}>
                    {cell.events.slice(0, 2).map((ev) => {
                      const style = getPillStyle(ev);
                      const isMulti = Boolean(ev.endDate && ev.endDate !== ev.targetDate);
                      const isStart = cell.dateStr === ev.targetDate;
                      const isEnd = cell.dateStr === (ev.endDate || ev.targetDate);
                      const isWeekStart = cell.dayOfWeek === 0;
                      const isWeekEnd = cell.dayOfWeek === 6;

                      // タイトルの短縮表示（会社名またはタイトル、完了時はチェック付き）
                      const displayTitle = (ev.completed ? '✔ ' : '') + (ev.company || ev.title);

                      if (isMulti) {
                        // 連日イベント
                        const shouldShowText = isStart || isWeekStart || cell.day === 1;

                        return (
                          <div
                            key={ev.id}
                            style={{
                              height: 15,
                              background: style.bg,
                              color: style.text,
                              borderTop: `1px solid ${style.border}`,
                              borderBottom: `1px solid ${style.border}`,
                              borderLeft: (isStart && isEnd) || isStart || isWeekStart ? `1px solid ${style.border}` : 'none',
                              borderRight: (isStart && isEnd) || isEnd || isWeekEnd ? `1px solid ${style.border}` : 'none',
                              borderRadius: isStart && isEnd
                                ? 3
                                : isStart || isWeekStart
                                ? '3px 0 0 3px'
                                : isEnd || isWeekEnd
                                ? '0 3px 3px 0'
                                : 0,
                              marginLeft: isStart || isWeekStart ? 0 : -3,
                              marginRight: isEnd || isWeekEnd ? 0 : -3,
                              width: isStart && isEnd
                                ? '100%'
                                : isStart || isWeekStart
                                ? 'calc(100% + 3px)'
                                : isEnd || isWeekEnd
                                ? 'calc(100% + 3px)'
                                : 'calc(100% + 6px)',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              padding: '0 2px',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              lineHeight: '13px',
                            }}
                            title={`${ev.title} (${ev.company || ''} ${ev.targetDate}〜${ev.endDate})`}
                          >
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: shouldShowText ? 'inline-block' : 'none',
                              width: '100%',
                              textAlign: 'center',
                            }}>
                              {displayTitle}
                            </span>
                          </div>
                        );
                      }

                      // 単日イベント
                      return (
                        <div
                          key={ev.id}
                          style={{
                            height: 15,
                            width: '100%',
                            background: style.bg,
                            color: style.text,
                            border: `1px solid ${style.border}`,
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '0 2px',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            lineHeight: '13px',
                          }}
                          title={`${ev.title} (${ev.category})`}
                        >
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            width: '100%',
                            textAlign: 'center',
                          }}>
                            {displayTitle}
                          </span>
                        </div>
                      );
                    })}

                    {cell.events.length > 2 && (
                      <div style={{
                        fontSize: '0.58rem',
                        fontWeight: 800,
                        color: 'var(--color-primary, #38BDF8)',
                        textAlign: 'center',
                        lineHeight: 1,
                        marginTop: 1,
                      }}>
                        +{cell.events.length - 2}
                      </div>
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

                        {/* 完了マーク表示 */}
                        {ev.completed && (
                          <span style={{
                            background: '#10B981',
                            color: 'white',
                            padding: '1px 8px',
                            borderRadius: 99,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                          }}>
                            <Check size={11} strokeWidth={3} /> 完了
                          </span>
                        )}

                        <span className="badge" style={{ background: 'var(--bg-surface)', color: isPast ? '#94A3B8' : style.text, border: `1px solid ${isPast ? '#334155' : style.border}`, fontSize: '0.68rem', fontWeight: 700 }}>
                          {ev.category}
                        </span>
                      </div>

                      <div style={{
                        fontWeight: 700,
                        fontSize: '0.925rem',
                        color: ev.completed ? 'var(--text-muted)' : isPast ? '#94A3B8' : 'var(--text-primary)',
                        textDecoration: ev.completed || isPast ? 'line-through' : 'none',
                        opacity: ev.completed ? 0.75 : 1,
                      }}>
                        {ev.title}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {(ev.time || ev.endTime) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <Clock size={12} color="var(--color-primary)" />
                            {ev.time ? (ev.endTime ? `${ev.time} 〜 ${ev.endTime}` : `${ev.time} 開始`) : `〜 ${ev.endTime}`}
                          </span>
                        )}
                        {ev.endDate && ev.endDate !== ev.targetDate && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', fontWeight: 700 }}>
                            🗓 期間: {ev.targetDate.slice(5).replace('-', '/')} 〜 {ev.endDate.slice(5).replace('-', '/')}
                          </span>
                        )}
                        {ev.location && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={12} /> {ev.location}
                          </span>
                        )}
                        {ev.url && (
                          <a
                            href={ev.url.startsWith('http') ? ev.url : `https://${ev.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', textDecoration: 'underline' }}
                          >
                            <LinkIcon size={12} /> リンク
                          </a>
                        )}
                      </div>
                    </div>

                    {/* ── アクションボタン群（完了・編集・削除） ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {/* 完了ボタン（直接タップ可能） */}
                      <button
                        onClick={() => handleToggleComplete(ev)}
                        className="btn btn-sm"
                        style={{
                          background: ev.completed ? '#10B981' : 'rgba(16, 185, 129, 0.12)',
                          color: ev.completed ? '#FFFFFF' : '#10B981',
                          border: `1px solid ${ev.completed ? '#10B981' : 'rgba(16, 185, 129, 0.35)'}`,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: 8,
                          gap: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'all 0.15s ease',
                        }}
                        title={ev.completed ? '未完了に戻す' : '完了マークをつける'}
                      >
                        <Check size={14} strokeWidth={2.5} />
                        {ev.completed ? '完了' : '完了にする'}
                      </button>

                      {/* 編集ボタン */}
                      <button
                        onClick={() => handleOpenEditModal(ev)}
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--color-primary)', padding: '6px 8px' }}
                        title="予定を編集"
                      >
                        <Edit3 size={16} />
                      </button>

                      {/* 予定を消す（カレンダーからのみ可能） */}
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--text-muted)', padding: '6px 8px' }}
                        title="カレンダーから予定を削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 3. 🎯 選考ステップ別グループ管理（ES/テスト/面接/GD/インターン等） ── */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              🎯 選考ステップ別グループ管理
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              「ES」「テスト」「1次面接〜最終面接」「GD」「インターン」など、選考段階ごとに予定・企業を整理
            </p>
          </div>

          {(() => {
            const STEP_ORDER = [
              { name: 'ES・書類選考', match: (ev: CountdownEvent) => ev.category === 'ES' || ev.title.includes('ES') || ev.title.includes('締切') },
              { name: 'テスト・適性検査', match: (ev: CountdownEvent) => ev.category === 'テスト' || ev.title.includes('テスト') || ev.title.includes('SPI') || ev.title.includes('玉手箱') || ev.title.includes('TG-WEB') || ev.title.includes('GAB') || ev.title.includes('CAB') },
              { name: '1次面接', match: (ev: CountdownEvent) => ev.title.includes('1次面接') || ev.title.includes('一次面接') },
              { name: '2次面接', match: (ev: CountdownEvent) => ev.title.includes('2次面接') || ev.title.includes('二次面接') },
              { name: '3次〜面接', match: (ev: CountdownEvent) => ev.title.includes('3次') || ev.title.includes('三次') || ev.title.includes('4次') },
              { name: '最終面接', match: (ev: CountdownEvent) => ev.title.includes('最終面接') || ev.title.includes('役員面接') || ev.title.includes('社長面接') },
              { name: '動画面接・AI面接', match: (ev: CountdownEvent) => ev.title.includes('動画面接') || ev.title.includes('AI面接') },
              { name: '面談・リクルーター', match: (ev: CountdownEvent) => ev.title.includes('面談') || ev.title.includes('リクルーター') },
              { name: 'GD (グループディスカッション)', match: (ev: CountdownEvent) => ev.category === 'GD' || ev.title.includes('GD') },
              { name: 'インターン', match: (ev: CountdownEvent) => ev.category === 'インターン' || ev.title.includes('インターン') },
              { name: 'その他', match: (ev: CountdownEvent) => ev.category === 'その他' },
            ];

            const groupedSteps = STEP_ORDER.map((step) => {
              const items = countdowns.filter((ev) => step.match(ev));
              return { ...step, items };
            }).filter((group) => group.items.length > 0);

            if (groupedSteps.length === 0) {
              return (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                  予定を登録すると、「1次面接」「テスト」「ES」などの選考ステップごとに抱えている企業・予定が自動で整理されます！
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
                                {ev.step || ev.title}
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

        {/* ── 4. カレンダー本体 ── */}
      </div>

      {/* ── 新・選考予定追加/編集モーダル (iOS/TimeTree風カードデザイン) ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)} style={{ alignItems: 'center', zIndex: 1000 }}>
          <div
            className="modal-content animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 460,
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '20px 18px',
              borderRadius: 24,
              background: '#121826',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
              color: '#F8FAFC',
            }}
          >
            {/* Top Bar Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 18, borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: 12,
            }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  border: 'none', background: 'transparent',
                  color: '#94A3B8', fontSize: '0.925rem', fontWeight: 600,
                  cursor: 'pointer', padding: '4px 6px',
                }}
              >
                キャンセル
              </button>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                {editingEventId ? '予定を編集' : '新しい予定'}
              </h3>
              <button
                type="button"
                onClick={handleAddEvent}
                style={{
                  border: 'none', background: 'transparent',
                  color: 'var(--color-primary, #38BDF8)', fontSize: '0.95rem', fontWeight: 800,
                  cursor: 'pointer', padding: '4px 6px',
                }}
              >
                保存
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* ── 1. カレンダー (カテゴリ/タグ選択) ── */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                overflow: 'hidden',
              }}>
                <div
                  onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 16px', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#E2E8F0' }}>
                    カレンダー
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF',
                    }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: CALENDAR_CATEGORIES.find(c => c.id === newCategory)?.dotColor || '#EF4444',
                      }} />
                      {newCategory}
                    </span>
                    <ChevronRightIcon size={18} color="#64748B" />
                  </div>
                </div>

                {/* カテゴリ選択ドロワー/チップ一覧 */}
                {showCategoryPicker && (
                  <div style={{
                    padding: '10px 14px 14px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                  }}>
                    {CALENDAR_CATEGORIES.map((c) => {
                      const isSelected = newCategory === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCategory(c.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '10px 8px', borderRadius: 10,
                            border: `1.5px solid ${isSelected ? c.color : 'rgba(255, 255, 255, 0.1)'}`,
                            background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                            color: '#FFFFFF', fontSize: '0.825rem', fontWeight: isSelected ? 800 : 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dotColor }} />
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── 2. タイトル（企業名） ── */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '4px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="タイトル (企業名)"
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    padding: '11px 0',
                  }}
                />
                <Clock size={18} color="#64748B" />
              </div>

              {/* ── 3. 選考ステップ (カテゴリ連動) ── */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: 8 }}>
                  選考ステップ
                </div>

                {newCategory === 'その他' ? (
                  <input
                    type="text"
                    value={newOtherStep}
                    onChange={(e) => setNewOtherStep(e.target.value)}
                    placeholder="選考内容・予定の詳細を入力"
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      outline: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      padding: '8px 12px',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(STEP_OPTIONS[newCategory] || []).map((stepOpt) => {
                      const isSelected = newStep === stepOpt;
                      return (
                        <button
                          key={stepOpt}
                          type="button"
                          onClick={() => setNewStep(stepOpt)}
                          style={{
                            padding: '6px 13px', borderRadius: 99,
                            fontSize: '0.8rem', fontWeight: isSelected ? 800 : 600,
                            background: isSelected ? 'var(--color-primary, #38BDF8)' : 'rgba(255, 255, 255, 0.06)',
                            color: isSelected ? '#0F172A' : '#E2E8F0',
                            border: `1px solid ${isSelected ? 'var(--color-primary, #38BDF8)' : 'rgba(255, 255, 255, 0.1)'}`,
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {stepOpt}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── 4. 日時・期間設定 (iOS グループスタイル) ── */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                overflow: 'hidden',
              }}>
                {/* 終日予定 トグル */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#E2E8F0' }}>
                    終日予定
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAllDay(!isAllDay)}
                    style={{
                      width: 48, height: 28, borderRadius: 14,
                      background: isAllDay ? '#10B981' : 'rgba(255, 255, 255, 0.2)',
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background 0.2s ease', padding: 2,
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#FFFFFF',
                      transform: isAllDay ? 'translateX(20px)' : 'translateX(0)',
                      transition: 'transform 0.2s ease',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
                    }} />
                  </button>
                </div>

                {/* 開始日時 */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#E2E8F0' }}>
                    開始
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => {
                        setNewDate(e.target.value);
                        if (newEndDate < e.target.value) setNewEndDate(e.target.value);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 8, color: '#FFFFFF',
                        fontSize: '0.85rem', fontWeight: 700, padding: '5px 8px',
                        outline: 'none', cursor: 'pointer',
                      }}
                    />
                    {!isAllDay && (
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 8, color: '#FFFFFF',
                          fontSize: '0.85rem', fontWeight: 700, padding: '5px 8px',
                          outline: 'none', cursor: 'pointer',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* 終了日時 */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                }}>
                  <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#E2E8F0' }}>
                    終了
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="date"
                      value={newEndDate}
                      min={newDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 8, color: '#FFFFFF',
                        fontSize: '0.85rem', fontWeight: 700, padding: '5px 8px',
                        outline: 'none', cursor: 'pointer',
                      }}
                    />
                    {!isAllDay && (
                      <input
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 8, color: '#FFFFFF',
                          fontSize: '0.85rem', fontWeight: 700, padding: '5px 8px',
                          outline: 'none', cursor: 'pointer',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* ── 5. 通知アラーム ── */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#E2E8F0' }}>
                  通知アラーム
                </span>
                <select
                  value={newAlarm}
                  onChange={(e) => setNewAlarm(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    textAlignLast: 'right',
                  }}
                >
                  <option value="none" style={{ background: '#1E293B', color: '#FFF' }}>なし</option>
                  <option value="10min" style={{ background: '#1E293B', color: '#FFF' }}>10分前</option>
                  <option value="1hour" style={{ background: '#1E293B', color: '#FFF' }}>1時間前</option>
                  <option value="1day" style={{ background: '#1E293B', color: '#FFF' }}>1日前</option>
                </select>
              </div>

              {/* ── 6. 詳細情報 (場所 / URL / メモ) ── */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <MapPin size={16} color="#64748B" />
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="場所 (例: オンラインZoom / 本社ビル)"
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      outline: 'none', color: '#FFFFFF', fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <LinkIcon size={16} color="#64748B" />
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="URL (面接リンク / マイページ)"
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      outline: 'none', color: '#FFFFFF', fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 16px',
                }}>
                  <FileText size={16} color="#64748B" style={{ marginTop: 3 }} />
                  <textarea
                    value={newMemo}
                    onChange={(e) => setNewMemo(e.target.value)}
                    placeholder="メモ"
                    rows={2}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      outline: 'none', color: '#FFFFFF', fontSize: '0.9rem',
                      resize: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Bottom Large Save Button */}
              <button
                type="button"
                onClick={handleAddEvent}
                style={{
                  marginTop: 6,
                  height: 48,
                  borderRadius: 24,
                  background: '#E2E8F0',
                  color: '#0F172A',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                  transition: 'transform 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#E2E8F0'; }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Action Button (FAB: ＋ボタン) ── */}
      <button
        onClick={() => { setNewDate(selectedDateStr); setShowAddModal(true); }}
        aria-label="予定を追加"
        style={{
          position: 'fixed',
          bottom: 84,
          right: 20,
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #334155, #1E293B)',
          color: '#FFFFFF',
          border: '1.5px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 80,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}
