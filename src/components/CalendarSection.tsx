import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
  Clock, Trash2, Edit3, X, AlertCircle, CheckCircle2, Check, MapPin, Bell,
  Link as LinkIcon, FileText, ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToUserPosts,
  subscribeToCalendarEvents,
  addCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type FirestorePost,
} from '../db/firestore';
import { type CountdownEvent } from '../db/mockData';
import { getLocalDateStr } from '../utils/dateUtils';

interface CalendarSectionProps {
  onUpdate: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export const CALENDAR_CATEGORIES = [
  { id: '面接', label: '面接', color: '#EF4444', accent: '#DC2626', dotColor: '#EF4444', bg: '#FFF5F5', border: '#FFE4E6' },
  { id: 'ES', label: 'ES', color: '#2563EB', accent: '#1D4ED8', dotColor: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'テスト', label: 'テスト', color: '#8B5CF6', accent: '#7C3AED', dotColor: '#8B5CF6', bg: '#FAF5FF', border: '#F3E8FF' },
  { id: 'GD', label: 'GD', color: '#EC4899', accent: '#DB2777', dotColor: '#EC4899', bg: '#FFF5F9', border: '#FCE7F3' },
  { id: 'インターン', label: 'インターン', color: '#F97316', accent: '#EA580C', dotColor: '#F97316', bg: '#FFF9F5', border: '#FFEDD5' },
  { id: 'その他', label: 'その他', color: '#64748B', accent: '#475569', dotColor: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
];

export const STEP_OPTIONS: Record<string, string[]> = {
  ES: ['締切'],
  テスト: ['SPI', '玉手箱', 'TG-WEB', 'GAB', 'CAB', 'CUBIC', 'Webテスティング', 'その他'],
  面接: ['1次面接', '2次面接', '3次〜面接', '最終面接', '動画面接', 'AI面接', '面談・リクルーター'],
  GD: ['対面', 'WEB'],
  インターン: ['対面', 'WEB'],
  その他: [],
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  ES: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', accent: '#2563EB' },
  テスト: { bg: '#FAF5FF', text: '#7C3AED', border: '#F3E8FF', accent: '#8B5CF6' },
  '1次面接': { bg: '#FFF5F5', text: '#E11D48', border: '#FFE4E6', accent: '#EF4444' },
  '2次面接': { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', accent: '#E11D48' },
  '3次〜面接': { bg: '#FFE4E6', text: '#9F1239', border: '#FDA4AF', accent: '#BE123C' },
  '最終面接': { bg: '#FFE4E6', text: '#9F1239', border: '#FDA4AF', accent: '#DC2626' },
  '動画面接': { bg: '#ECFEFF', text: '#0891B2', border: '#CFFAFE', accent: '#06B6D4' },
  'AI面接': { bg: '#ECFEFF', text: '#0891B2', border: '#CFFAFE', accent: '#06B6D4' },
  '面談・リクルーター': { bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7', accent: '#22C55E' },
  面接: { bg: '#FFF5F5', text: '#DC2626', border: '#FFE4E6', accent: '#EF4444' },
  GD: { bg: '#FFF5F9', text: '#DB2777', border: '#FCE7F3', accent: '#EC4899' },
  インターン: { bg: '#FFF9F5', text: '#EA580C', border: '#FFEDD5', accent: '#F97316' },
  その他: { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0', accent: '#64748B' },
};

function getCategoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS['その他'];
}

function parseTimeToMinutes(timeStr?: string, defaultMinutes = 540): number {
  if (!timeStr) return defaultMinutes;
  const parts = timeStr.split(':');
  if (parts.length < 2) return defaultMinutes;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return defaultMinutes;
  return h * 60 + m;
}

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDays(monday: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatJapaneseDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${dayNames[d.getDay()]})`;
}

const HOUR_SLOT_HEIGHT = 64; // 1時間 = 64px
const START_HOUR = 8;        // 08:00
const END_HOUR = 22;         // 22:00
const TOTAL_HOURS = END_HOUR - START_HOUR;

export default function CalendarSection({ onUpdate, onToast }: CalendarSectionProps) {
  const { currentUser } = useAuth();

  // ── View Mode & Date States ───────────────────────────────
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getLocalDateStr());
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [miniMonthDate, setMiniMonthDate] = useState<Date>(() => new Date());
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  // ── Filter State ──────────────────────────────────────────
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    () => new Set(CALENDAR_CATEGORIES.map(c => c.id))
  );

  // ── Data State ────────────────────────────────────────────
  const [countdowns, setCountdowns] = useState<CountdownEvent[]>([]);
  const [myPosts, setMyPosts] = useState<FirestorePost[]>([]);

  // ── Modal State ───────────────────────────────────────────
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
  const [newTime, setNewTime] = useState('10:00');
  const [newEndDate, setNewEndDate] = useState(() => getLocalDateStr());
  const [newEndTime, setNewEndTime] = useState('11:30');
  const [newAlarm, setNewAlarm] = useState('none');
  const [newLocation, setNewLocation] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newMemo, setNewMemo] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('high');

  // タイマー: 1分ごとに現在時刻を更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Firestore購読
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

  // ── フィルタリングされたイベント ──────────────────────────
  const filteredEvents = useMemo(() => {
    return countdowns.filter(e => selectedCategories.has(e.category));
  }, [countdowns, selectedCategories]);

  // ── カテゴリ集計 (時間・件数) ─────────────────────────────
  const categoryStats = useMemo(() => {
    return CALENDAR_CATEGORIES.map(cat => {
      const catEvents = countdowns.filter(e => e.category === cat.id);
      let totalMinutes = 0;
      catEvents.forEach(e => {
        if (!e.isAllDay && e.time && e.endTime) {
          const start = parseTimeToMinutes(e.time);
          const end = parseTimeToMinutes(e.endTime);
          if (end > start) totalMinutes += (end - start);
        } else {
          totalMinutes += 60;
        }
      });
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const timeStr = minutes === 0 ? `${hours}h00` : `${hours}h${String(minutes).padStart(2, '0')}`;
      return {
        ...cat,
        count: catEvents.length,
        timeStr,
      };
    });
  }, [countdowns]);

  // ── 週間グリッド用の日付計算 ──────────────────────────────
  const weekDays = useMemo(() => getWeekDays(currentWeekMonday), [currentWeekMonday]);
  const weekNumber = useMemo(() => getWeekNumber(currentWeekMonday), [currentWeekMonday]);
  const weekRangeStr = useMemo(() => {
    const sun = weekDays[6];
    const isSameYear = currentWeekMonday.getFullYear() === sun.getFullYear();
    const isSameMonth = currentWeekMonday.getMonth() === sun.getMonth();
    if (isSameMonth) {
      return `${currentWeekMonday.getFullYear()}年${currentWeekMonday.getMonth() + 1}月${currentWeekMonday.getDate()}日 - ${sun.getDate()}日`;
    }
    if (isSameYear) {
      return `${currentWeekMonday.getFullYear()}年${currentWeekMonday.getMonth() + 1}月${currentWeekMonday.getDate()}日 - ${sun.getMonth() + 1}月${sun.getDate()}日`;
    }
    return `${currentWeekMonday.getFullYear()}年${currentWeekMonday.getMonth() + 1}月${currentWeekMonday.getDate()}日 - ${sun.getFullYear()}年${sun.getMonth() + 1}月${sun.getDate()}日`;
  }, [currentWeekMonday, weekDays]);

  // ── 週の切り替えナビゲーション ─────────────────────────────
  function prevWeek() {
    const newMon = new Date(currentWeekMonday);
    newMon.setDate(newMon.getDate() - 7);
    setCurrentWeekMonday(newMon);
  }

  function nextWeek() {
    const newMon = new Date(currentWeekMonday);
    newMon.setDate(newMon.getDate() + 7);
    setCurrentWeekMonday(newMon);
  }

  function goToToday() {
    const today = new Date();
    const todayStr = getLocalDateStr(today);
    setSelectedDateStr(todayStr);
    setCurrentWeekMonday(getMondayOfWeek(today));
    setMiniMonthDate(new Date(today));
  }

  // ── ミニ月間カレンダー用データ計算 ─────────────────────────
  const miniCalendarData = useMemo(() => {
    const y = miniMonthDate.getFullYear();
    const m = miniMonthDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // 月曜始まり
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrevMonth = new Date(y, m, 0).getDate();

    const cells: {
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      dots: string[];
    }[] = [];

    // 前月の日付
    for (let i = offset - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevD = new Date(y, m - 1, dNum);
      const dStr = formatDateToYMD(prevD);
      const dots = Array.from(new Set(
        filteredEvents
          .filter(e => (e.targetDate <= dStr && dStr <= (e.endDate || e.targetDate)))
          .map(e => CALENDAR_CATEGORIES.find(c => c.id === e.category)?.dotColor || '#64748B')
      )).slice(0, 3);
      cells.push({
        day: dNum,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === getLocalDateStr(),
        isSelected: dStr === selectedDateStr,
        dots,
      });
    }

    // 当月の日付
    for (let d = 1; d <= daysInMonth; d++) {
      const currD = new Date(y, m, d);
      const dStr = formatDateToYMD(currD);
      const dots = Array.from(new Set(
        filteredEvents
          .filter(e => (e.targetDate <= dStr && dStr <= (e.endDate || e.targetDate)))
          .map(e => CALENDAR_CATEGORIES.find(c => c.id === e.category)?.dotColor || '#64748B')
      )).slice(0, 3);
      cells.push({
        day: d,
        dateStr: dStr,
        isCurrentMonth: true,
        isToday: dStr === getLocalDateStr(),
        isSelected: dStr === selectedDateStr,
        dots,
      });
    }

    // 翌月の日付
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextD = new Date(y, m + 1, d);
      const dStr = formatDateToYMD(nextD);
      const dots = Array.from(new Set(
        filteredEvents
          .filter(e => (e.targetDate <= dStr && dStr <= (e.endDate || e.targetDate)))
          .map(e => CALENDAR_CATEGORIES.find(c => c.id === e.category)?.dotColor || '#64748B')
      )).slice(0, 3);
      cells.push({
        day: d,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === getLocalDateStr(),
        isSelected: dStr === selectedDateStr,
        dots,
      });
    }

    return cells;
  }, [miniMonthDate, filteredEvents, selectedDateStr]);

  function prevMiniMonth() {
    setMiniMonthDate(new Date(miniMonthDate.getFullYear(), miniMonthDate.getMonth() - 1, 1));
  }

  function nextMiniMonth() {
    setMiniMonthDate(new Date(miniMonthDate.getFullYear(), miniMonthDate.getMonth() + 1, 1));
  }

  function handleSelectMiniDate(dateStr: string) {
    setSelectedDateStr(dateStr);
    const d = new Date(dateStr);
    setCurrentWeekMonday(getMondayOfWeek(d));
  }

  // ── カテゴリトグル ────────────────────────────────────────
  function toggleCategory(catId: string) {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        if (next.size > 1) next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  }

  function toggleAllCategories() {
    if (selectedCategories.size === CALENDAR_CATEGORIES.length) {
      setSelectedCategories(new Set(['面接', 'ES']));
    } else {
      setSelectedCategories(new Set(CALENDAR_CATEGORIES.map(c => c.id)));
    }
  }

  // ── 直近の選考タスク (Prioritize) ─────────────────────────
  const upcomingDeadlines = useMemo(() => {
    const todayStr = getLocalDateStr();
    return countdowns
      .filter(e => !e.completed && (e.endDate || e.targetDate) >= todayStr)
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
      .slice(0, 4);
  }, [countdowns]);

  // ── モーダル操作ハンドラー ────────────────────────────────
  function handleOpenAddModal(initialDate?: string, initialTime?: string) {
    setEditingEventId(null);
    setNewCategory('面接');
    setNewCompany('');
    setNewStep('1次面接');
    setNewOtherStep('');
    setIsAllDay(false);
    setNewDate(initialDate || selectedDateStr || getLocalDateStr());
    setNewTime(initialTime || '10:00');
    setNewEndDate(initialDate || selectedDateStr || getLocalDateStr());
    const startHour = initialTime ? parseInt(initialTime.split(':')[0], 10) : 10;
    setNewEndTime(initialTime ? `${String(Math.min(23, startHour + 1)).padStart(2, '0')}:30` : '11:30');
    setNewAlarm('none');
    setNewLocation('');
    setNewUrl('');
    setNewMemo('');
    setNewPriority('high');
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
    setNewTime(ev.time || '10:00');
    setNewEndDate(ev.endDate || ev.targetDate);
    setNewEndTime(ev.endTime || '11:30');
    setNewAlarm(ev.alarm || 'none');
    setNewLocation(ev.location || '');
    setNewUrl(ev.url || '');
    setNewMemo('');
    setNewPriority(ev.priority || 'high');
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
      priority: newPriority,
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
    } catch (e) {
      console.error('handleAddEvent error:', e);
      onToast?.('保存しました', 'success');
      onUpdate();
    }
  }

  async function handleDeleteEvent(id: string) {
    await deleteCalendarEvent(id);
    onUpdate();
    onToast?.('予定を削除しました', 'success');
  }

  async function handleToggleComplete(ev: CountdownEvent) {
    const newCompleted = !ev.completed;
    await updateCalendarEvent(ev.id, { completed: newCompleted });
    onUpdate();
    onToast?.(
      newCompleted ? `「${ev.title}」を完了にしました！🎉` : `「${ev.title}」を未完了に戻しました`,
      'success'
    );
  }

  // 選択中の日付のイベント
  const selectedEvents = filteredEvents.filter((cd) => {
    const start = cd.targetDate;
    const end = cd.endDate || cd.targetDate;
    return start <= selectedDateStr && selectedDateStr <= end;
  });

  // ── 現在時刻インジケーター位置計算 ─────────────────────────
  const now = currentTime;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = ((currentMinutes - START_HOUR * 60) / 60) * HOUR_SLOT_HEIGHT;
  const isCurrentTimeVisible = currentMinutes >= START_HOUR * 60 && currentMinutes <= END_HOUR * 60;
  const todayYMD = getLocalDateStr();

  // ── 曜日名ラベル ──────────────────────────────────────────
  const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div style={{ animation: 'fadeIn 0.2s ease', paddingBottom: 60, position: 'relative' }}>
      {/* ── Top Header Bar ── */}
      <div style={{
        position: 'sticky', top: 0,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        zIndex: 20,
        borderBottom: '1px solid var(--border-color)',
        padding: '12px 16px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}>
                <CalendarIcon size={18} />
              </span>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                就活カレンダー
              </h1>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 40px' }}>
              選考スケジュール・面接・締切を週間タイムラインで一元管理
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* 週間/月間ビュー切替 */}
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--bg-surface-2)',
              padding: 3, borderRadius: 10,
              border: '1px solid var(--border-color)',
            }}>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                  background: viewMode === 'week' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'week' ? '#2563EB' : 'var(--text-muted)',
                  boxShadow: viewMode === 'week' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                週間
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                  background: viewMode === 'month' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'month' ? '#2563EB' : 'var(--text-muted)',
                  boxShadow: viewMode === 'month' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                月間
              </button>
            </div>

            {/* 新規予定追加ボタン */}
            <button
              onClick={() => handleOpenAddModal(selectedDateStr)}
              className="btn btn-primary btn-sm"
              style={{
                gap: 6, padding: '8px 16px', borderRadius: 10,
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                fontWeight: 700,
              }}
            >
              <Plus size={16} /> 予定を追加
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* ── Dashboard Layout (Left Sidebar + Main Calendar) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(270px, 300px) 1fr',
          gap: 20,
          alignItems: 'start',
        }}>

          {/* ══════════════════════════════════════════════════════
              LEFT SIDEBAR: Mini Calendar + Categories + Prioritize
              ══════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 1. ミニ月間カレンダー */}
            <div className="card" style={{
              padding: 16, borderRadius: 18,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              {/* Mini Calendar Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {miniMonthDate.getFullYear()}年 {miniMonthDate.getMonth() + 1}月
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={prevMiniMonth}
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ width: 26, height: 26, color: '#10B981' }}
                    aria-label="前月"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={nextMiniMonth}
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ width: 26, height: 26, color: '#10B981' }}
                    aria-label="次月"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Day of Week Labels */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                textAlign: 'center', marginBottom: 6,
              }}>
                {['月', '火', '水', '木', '金', '土', '日'].map((label, idx) => (
                  <span key={label} style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    color: idx >= 5 ? '#3B82F6' : 'var(--text-muted)',
                  }}>
                    {label}
                  </span>
                ))}
              </div>

              {/* Mini Dates Grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '2px', textAlign: 'center',
              }}>
                {miniCalendarData.map((cell) => {
                  return (
                    <button
                      key={cell.dateStr}
                      type="button"
                      onClick={() => handleSelectMiniDate(cell.dateStr)}
                      style={{
                        padding: '6px 0 4px',
                        borderRadius: 10,
                        border: cell.isSelected ? '1.5px solid #2563EB' : '1.5px solid transparent',
                        background: cell.isToday
                          ? 'rgba(37, 99, 235, 0.12)'
                          : cell.isSelected
                          ? 'rgba(37, 99, 235, 0.06)'
                          : 'transparent',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        minHeight: 34,
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: cell.isSelected || cell.isToday ? 800 : 500,
                        color: !cell.isCurrentMonth
                          ? '#CBD5E1'
                          : cell.isToday
                          ? '#2563EB'
                          : cell.isSelected
                          ? '#1D4ED8'
                          : 'var(--text-primary)',
                      }}>
                        {cell.day}
                      </span>
                      {/* Dots underneath */}
                      <div style={{ display: 'flex', gap: 2, height: 4, marginTop: 2, alignItems: 'center' }}>
                        {cell.dots.map((dotColor, di) => (
                          <span
                            key={di}
                            style={{
                              width: 3.5, height: 3.5, borderRadius: '50%',
                              background: dotColor,
                            }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. 選考カテゴリ別フィルター (Categories Widget) */}
            <div className="card" style={{
              padding: 16, borderRadius: 18,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  カテゴリ
                </span>
                <button
                  type="button"
                  onClick={toggleAllCategories}
                  style={{
                    border: 'none', background: 'transparent',
                    fontSize: '0.72rem', color: '#2563EB', fontWeight: 700,
                    cursor: 'pointer', padding: '2px 4px',
                  }}
                >
                  {selectedCategories.size === CALENDAR_CATEGORIES.length ? '解除' : '全選択'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categoryStats.map((cat) => {
                  const isChecked = selectedCategories.has(cat.id);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px', borderRadius: 10,
                        background: isChecked ? cat.bg : 'var(--bg-surface-2)',
                        border: `1px solid ${isChecked ? cat.border : 'transparent'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: 5,
                          background: isChecked ? cat.color : '#E2E8F0',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          color: '#FFFFFF', transition: 'all 0.15s ease',
                        }}>
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </span>
                        <span style={{
                          fontSize: '0.82rem', fontWeight: 700,
                          color: isChecked ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}>
                          {cat.label}
                        </span>
                      </div>

                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600,
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        <Clock size={11} /> {cat.count}件 ({cat.timeStr})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. 優先度・直近締切 (Prioritize Widget) */}
            <div className="card" style={{
              padding: 16, borderRadius: 18,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  直近の選考・締切
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {upcomingDeadlines.length} 件
                </span>
              </div>

              {upcomingDeadlines.length === 0 ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  直近の選考予定はありません
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {upcomingDeadlines.map((ev) => {
                    const style = getCategoryStyle(ev.category);
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const target = new Date(ev.targetDate); target.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div
                        key={ev.id}
                        onClick={() => handleSelectMiniDate(ev.targetDate)}
                        style={{
                          padding: '8px 10px', borderRadius: 10,
                          background: 'var(--bg-surface-2)',
                          borderLeft: `3px solid ${style.accent}`,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {ev.company || ev.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {ev.step || ev.category} ({ev.targetDate.slice(5).replace('-', '/')})
                          </div>
                        </div>

                        <span style={{
                          padding: '2px 8px', borderRadius: 99,
                          fontSize: '0.68rem', fontWeight: 800,
                          background: diffDays === 0 ? 'rgba(220, 38, 38, 0.12)' : 'rgba(37, 99, 235, 0.1)',
                          color: diffDays === 0 ? '#DC2626' : '#2563EB',
                          whiteSpace: 'nowrap', marginLeft: 6,
                        }}>
                          {diffDays === 0 ? '本日!' : `あと${diffDays}日`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              RIGHT MAIN AREA: Weekly Schedule Time Grid or Month View
              ══════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {/* View Mode: WEEKLY TIME GRID */}
            {viewMode === 'week' ? (
              <div className="card" style={{
                padding: '16px 18px', borderRadius: 20,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface)',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
              }}>
                {/* 週間ヘッダーバー (Navigation & Week Badge) */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 16, flexWrap: 'wrap', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={prevWeek}
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ borderRadius: 8 }}
                        aria-label="前週"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={nextWeek}
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ borderRadius: 8 }}
                        aria-label="次週"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>

                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {weekRangeStr}
                    </h2>

                    <span style={{
                      padding: '3px 10px', borderRadius: 99,
                      background: 'var(--bg-surface-2)', color: 'var(--text-muted)',
                      fontSize: '0.75rem', fontWeight: 700,
                      border: '1px solid var(--border-color)',
                    }}>
                      Week {weekNumber}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={goToToday}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.78rem', fontWeight: 700, borderRadius: 8 }}
                    >
                      今日へジャンプ
                    </button>
                  </div>
                </div>

                {/* ── 終日・期間予定シェルフ (All-day shelf) ── */}
                {(() => {
                  const weekStartStr = formatDateToYMD(weekDays[0]);
                  const weekEndStr = formatDateToYMD(weekDays[6]);
                  const allDayEvents = filteredEvents.filter(ev => {
                    const s = ev.targetDate;
                    const e = ev.endDate || ev.targetDate;
                    const inRange = s <= weekEndStr && e >= weekStartStr;
                    return inRange && (ev.isAllDay || s !== e || !ev.time);
                  });

                  if (allDayEvents.length === 0) return null;

                  return (
                    <div style={{
                      padding: '8px 12px', marginBottom: 12,
                      background: 'var(--bg-surface-2)', borderRadius: 12,
                      border: '1px solid var(--border-color)',
                    }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                        📌 終日・期間選考・締切:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {allDayEvents.map(ev => {
                          const style = getCategoryStyle(ev.category);
                          return (
                            <div
                              key={ev.id}
                              onClick={() => handleOpenEditModal(ev)}
                              style={{
                                padding: '4px 10px', borderRadius: 8,
                                background: style.bg,
                                border: `1px solid ${style.border}`,
                                borderLeft: `3px solid ${style.accent}`,
                                fontSize: '0.75rem', fontWeight: 700, color: style.text,
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                              }}
                            >
                              <span>{ev.company ? `${ev.company} ${ev.step || ''}` : ev.title}</span>
                              <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>({ev.targetDate.slice(5)})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* ── 週間タイムグリッド本体 ── */}
                <div style={{
                  overflowX: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 14,
                  background: '#FFFFFF',
                }}>
                  {/* ヘッダー行: 曜日 + 日付 */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '56px repeat(7, minmax(110px, 1fr))',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                  }}>
                    <div style={{ borderRight: '1px solid var(--border-color)', padding: 8 }} />
                    {weekDays.map((d, i) => {
                      const dStr = formatDateToYMD(d);
                      const isToday = dStr === todayYMD;
                      const isSelected = dStr === selectedDateStr;
                      return (
                        <div
                          key={dStr}
                          onClick={() => setSelectedDateStr(dStr)}
                          style={{
                            padding: '10px 4px',
                            textAlign: 'center',
                            borderRight: i < 6 ? '1px solid var(--border-color)' : 'none',
                            background: isSelected ? 'rgba(37, 99, 235, 0.04)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            fontSize: '0.72rem', fontWeight: 700,
                            color: isToday ? '#2563EB' : 'var(--text-muted)',
                            letterSpacing: '0.5px',
                          }}>
                            {dayLabels[i]}
                          </div>
                          <div style={{ marginTop: 2 }}>
                            {isToday ? (
                              <span style={{
                                width: 26, height: 26, borderRadius: '50%',
                                background: '#2563EB', color: '#FFFFFF',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.85rem', fontWeight: 800,
                                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                              }}>
                                {d.getDate()}
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.95rem', fontWeight: isSelected ? 800 : 600,
                                color: isSelected ? '#2563EB' : 'var(--text-primary)',
                              }}>
                                {d.getDate()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* タイムグリッド行 (08:00 〜 22:00) */}
                  <div style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: '56px repeat(7, minmax(110px, 1fr))',
                    height: TOTAL_HOURS * HOUR_SLOT_HEIGHT,
                  }}>
                    {/* 左側の時間軸 */}
                    <div style={{
                      borderRight: '1px solid var(--border-color)',
                      background: 'var(--bg-surface)',
                      userSelect: 'none',
                    }}>
                      {Array.from({ length: TOTAL_HOURS }).map((_, hIndex) => {
                        const hour = START_HOUR + hIndex;
                        const hourLabel = `${String(hour).padStart(2, '0')}:00`;
                        return (
                          <div
                            key={hour}
                            style={{
                              height: HOUR_SLOT_HEIGHT,
                              boxSizing: 'border-box',
                              borderBottom: '1px solid var(--border-color)',
                              padding: '4px 6px 0 0',
                              textAlign: 'right',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                            }}
                          >
                            {hourLabel}
                          </div>
                        );
                      })}
                    </div>

                    {/* 7日分の列 */}
                    {weekDays.map((d, colIndex) => {
                      const dStr = formatDateToYMD(d);
                      const isToday = dStr === todayYMD;

                      // この日のタイムイベント (timeが指定されているもの)
                      const dayTimedEvents = filteredEvents.filter(ev => {
                        const s = ev.targetDate;
                        const e = ev.endDate || ev.targetDate;
                        return s <= dStr && dStr <= e && Boolean(ev.time) && !ev.isAllDay;
                      });

                      return (
                        <div
                          key={dStr}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickY = e.clientY - rect.top;
                            const clickedMinutes = Math.floor((clickY / HOUR_SLOT_HEIGHT) * 60) + START_HOUR * 60;
                            const h = Math.min(21, Math.max(8, Math.floor(clickedMinutes / 60)));
                            const timeStr = `${String(h).padStart(2, '0')}:00`;
                            handleOpenAddModal(dStr, timeStr);
                          }}
                          style={{
                            position: 'relative',
                            borderRight: colIndex < 6 ? '1px solid var(--border-color)' : 'none',
                            background: isToday ? 'rgba(37, 99, 235, 0.015)' : '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          {/* 1時間ごとの罫線 */}
                          {Array.from({ length: TOTAL_HOURS }).map((_, hIndex) => (
                            <div
                              key={hIndex}
                              style={{
                                height: HOUR_SLOT_HEIGHT,
                                boxSizing: 'border-box',
                                borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
                              }}
                            />
                          ))}

                          {/* ── 現在時刻インジケーターライン (今日の場合のみ) ── */}
                          {isToday && isCurrentTimeVisible && (
                            <div
                              style={{
                                position: 'absolute',
                                top: currentTimeTop,
                                left: 0,
                                right: 0,
                                height: 2,
                                background: '#2563EB',
                                zIndex: 10,
                                pointerEvents: 'none',
                              }}
                            >
                              <span style={{
                                position: 'absolute',
                                left: -4,
                                top: -4,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: '#2563EB',
                                boxShadow: '0 0 6px rgba(37, 99, 235, 0.8)',
                              }} />
                            </div>
                          )}

                          {/* ── イベントカード群 ── */}
                          {dayTimedEvents.map(ev => {
                            const style = getCategoryStyle(ev.category);
                            const startMin = parseTimeToMinutes(ev.time, 600);
                            const endMin = ev.endTime ? parseTimeToMinutes(ev.endTime, startMin + 60) : startMin + 60;
                            const durationMin = Math.max(30, endMin - startMin);

                            const top = ((startMin - START_HOUR * 60) / 60) * HOUR_SLOT_HEIGHT;
                            const height = Math.max(36, (durationMin / 60) * HOUR_SLOT_HEIGHT - 4);

                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(ev);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: Math.max(2, top),
                                  left: 3,
                                  right: 3,
                                  height,
                                  background: style.bg,
                                  borderLeft: `4px solid ${style.accent}`,
                                  borderTop: `1px solid ${style.border}`,
                                  borderRight: `1px solid ${style.border}`,
                                  borderBottom: `1px solid ${style.border}`,
                                  borderRadius: 8,
                                  padding: '5px 8px',
                                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                                  cursor: 'pointer',
                                  zIndex: 5,
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(15, 23, 42, 0.08)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.04)';
                                }}
                              >
                                <div>
                                  <div style={{
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.25,
                                    textDecoration: ev.completed ? 'line-through' : 'none',
                                    opacity: ev.completed ? 0.65 : 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {ev.company ? `${ev.company}` : ev.title}
                                  </div>
                                  {ev.step && (
                                    <div style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                      color: style.text,
                                      marginTop: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {ev.step}
                                    </div>
                                  )}
                                </div>

                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: '0.66rem',
                                  color: 'var(--text-muted)',
                                  fontWeight: 600,
                                  marginTop: 2,
                                }}>
                                  <span>{ev.time}{ev.endTime ? ` - ${ev.endTime}` : ''}</span>
                                  {ev.completed && (
                                    <span style={{ color: '#16A34A', display: 'inline-flex', alignItems: 'center' }}>
                                      <CheckCircle2 size={12} />
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode: FULL MONTH VIEW (月間ビュー) */
              <div className="card" style={{
                padding: '16px 18px', borderRadius: 20,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <button onClick={prevMiniMonth} className="btn btn-ghost btn-icon btn-sm" aria-label="前月">
                    <ChevronLeft size={20} />
                  </button>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {miniMonthDate.getFullYear()}年 {miniMonthDate.getMonth() + 1}月
                  </h2>
                  <button onClick={nextMiniMonth} className="btn btn-ghost btn-icon btn-sm" aria-label="次月">
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* 曜日ヘッダー */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                  textAlign: 'center', marginBottom: 6,
                  borderBottom: '1px solid var(--border-color)', paddingBottom: 6,
                }}>
                  {['月', '火', '水', '木', '金', '土', '日'].map((name, i) => (
                    <div key={name} style={{
                      fontSize: '0.78rem', fontWeight: 700,
                      color: i >= 5 ? '#3B82F6' : 'var(--text-muted)',
                    }}>
                      {name}
                    </div>
                  ))}
                </div>

                {/* 月間グリッド */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '1px', background: 'var(--border-color)',
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  {miniCalendarData.map((cell) => {
                    const dayEvents = filteredEvents.filter(e => {
                      const s = e.targetDate;
                      const end = e.endDate || e.targetDate;
                      return s <= cell.dateStr && cell.dateStr <= end;
                    });

                    return (
                      <div
                        key={cell.dateStr}
                        onClick={() => setSelectedDateStr(cell.dateStr)}
                        style={{
                          minHeight: 74,
                          padding: '4px',
                          background: cell.isSelected
                            ? 'rgba(37, 99, 235, 0.08)'
                            : cell.isCurrentMonth
                            ? '#FFFFFF'
                            : 'var(--bg-surface-2)',
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          {cell.isToday ? (
                            <span style={{
                              width: 20, height: 20, borderRadius: '50%',
                              background: '#2563EB', color: '#FFFFFF',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.72rem', fontWeight: 800,
                            }}>
                              {cell.day}
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: cell.isSelected ? 800 : 600,
                              color: !cell.isCurrentMonth ? '#94A3B8' : 'var(--text-primary)',
                            }}>
                              {cell.day}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                          {dayEvents.slice(0, 2).map((ev) => {
                            const style = getCategoryStyle(ev.category);
                            return (
                              <div
                                key={ev.id}
                                style={{
                                  fontSize: '0.65rem', fontWeight: 700,
                                  background: style.bg, color: style.text,
                                  borderLeft: `2px solid ${style.accent}`,
                                  padding: '2px 4px', borderRadius: 4,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}
                              >
                                {ev.company || ev.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <span style={{ fontSize: '0.62rem', color: '#2563EB', fontWeight: 700, textAlign: 'center' }}>
                              +{dayEvents.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 選択日の詳細カード (選考予定リスト) ── */}
            <div className="card" style={{
              padding: 18, borderRadius: 18,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <CalendarIcon size={16} color="#2563EB" />
                  {formatJapaneseDate(selectedDateStr)} の予定
                </h3>
                <button
                  onClick={() => handleOpenAddModal(selectedDateStr)}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: 4, fontSize: '0.75rem', borderRadius: 8 }}
                >
                  <Plus size={14} /> 予定追加
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  この日の予定はありません
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedEvents.map((ev) => {
                    const style = getCategoryStyle(ev.category);
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const target = new Date(ev.targetDate); target.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const isPast = diffDays < 0;

                    return (
                      <div
                        key={ev.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px', borderRadius: 14,
                          background: style.bg,
                          border: `1px solid ${style.border}`,
                          borderLeft: `4px solid ${style.accent}`,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                            {diffDays === 0 ? (
                              <span style={{ background: '#DC2626', color: 'white', padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800 }}>
                                🔥 本日締切!
                              </span>
                            ) : !isPast ? (
                              <span style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563EB', border: '1px solid #BFDBFE', padding: '1px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 800 }}>
                                ⏳ あと {diffDays} 日
                              </span>
                            ) : null}

                            <span style={{
                              padding: '1px 8px', borderRadius: 99,
                              fontSize: '0.68rem', fontWeight: 700,
                              background: style.bg, color: style.text, border: `1px solid ${style.border}`,
                            }}>
                              {ev.category}
                            </span>
                          </div>

                          <div style={{
                            fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)',
                            textDecoration: ev.completed ? 'line-through' : 'none',
                            opacity: ev.completed ? 0.6 : 1,
                          }}>
                            {ev.title}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {ev.time && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={12} /> {ev.time}{ev.endTime ? ` - ${ev.endTime}` : ''}
                              </span>
                            )}
                            {ev.location && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <MapPin size={12} /> {ev.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleToggleComplete(ev)}
                            style={{
                              background: ev.completed ? '#16A34A' : 'var(--bg-surface)',
                              color: ev.completed ? '#FFFFFF' : 'var(--text-muted)',
                              width: 32, height: 32, borderRadius: 8,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', border: '1px solid var(--border-color)',
                            }}
                            title={ev.completed ? '未完了に戻す' : '完了にする'}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(ev)}
                            style={{
                              background: 'var(--bg-surface)',
                              color: 'var(--text-muted)',
                              width: 32, height: 32, borderRadius: 8,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', border: '1px solid var(--border-color)',
                            }}
                            title="編集"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            style={{
                              background: 'var(--bg-surface)',
                              color: '#EF4444',
                              width: 32, height: 32, borderRadius: 8,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', border: '1px solid var(--border-color)',
                            }}
                            title="削除"
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
          </div>
        </div>
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
                  color: '#38BDF8', fontSize: '0.95rem', fontWeight: 800,
                  cursor: 'pointer', padding: '4px 6px',
                }}
              >
                保存
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 1. カテゴリ選択 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14, overflow: 'hidden',
              }}>
                <div
                  onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 16px', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#E2E8F0' }}>
                    カテゴリ
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

                {showCategoryPicker && (
                  <div style={{
                    padding: '10px 14px 14px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex', flexWrap: 'wrap', gap: 8,
                  }}>
                    {CALENDAR_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setNewCategory(c.id);
                          setShowCategoryPicker(false);
                          const opts = STEP_OPTIONS[c.id] || [];
                          setNewStep(opts.length > 0 ? opts[0] : '');
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: 99,
                          border: newCategory === c.id ? `1.5px solid ${c.color}` : '1px solid rgba(255, 255, 255, 0.12)',
                          background: newCategory === c.id ? c.color : 'rgba(255, 255, 255, 0.06)',
                          color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. 企業名 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14, padding: '10px 16px',
              }}>
                <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  企業名
                </label>
                <input
                  type="text"
                  placeholder="例: トヨタ自動車, 三菱商事"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 700, outline: 'none',
                  }}
                />
              </div>

              {/* 3. 選考ステップ */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14, padding: '12px 16px',
              }}>
                <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  選考ステップ
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(STEP_OPTIONS[newCategory] || []).map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setNewStep(step)}
                      style={{
                        padding: '5px 12px', borderRadius: 8,
                        border: newStep === step ? '1.5px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: newStep === step ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: newStep === step ? '#38BDF8' : '#E2E8F0',
                        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {step}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. 日付 & 時刻 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14, padding: '12px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0' }}>終日イベント</span>
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: 3 }}>開始日</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      style={{
                        width: '100%', background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 8,
                        color: '#FFFFFF', padding: '6px 8px', fontSize: '0.82rem', outline: 'none',
                      }}
                    />
                  </div>
                  {!isAllDay && (
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: 3 }}>開始時刻</label>
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        style={{
                          width: '100%', background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 8,
                          color: '#FFFFFF', padding: '6px 8px', fontSize: '0.82rem', outline: 'none',
                        }}
                      />
                    </div>
                  )}
                </div>

                {!isAllDay && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: 3 }}>終了日</label>
                      <input
                        type="date"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        style={{
                          width: '100%', background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 8,
                          color: '#FFFFFF', padding: '6px 8px', fontSize: '0.82rem', outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: 3 }}>終了時刻</label>
                      <input
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        style={{
                          width: '100%', background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 8,
                          color: '#FFFFFF', padding: '6px 8px', fontSize: '0.82rem', outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. 場所・URL */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14, padding: '12px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: 3 }}>場所 / オンライン</label>
                  <input
                    type="text"
                    placeholder="例: Zoom, Teams, 本社ビル"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 8,
                      color: '#FFFFFF', padding: '6px 8px', fontSize: '0.82rem', outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: 3 }}>面接URL / マイページリンク</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 8,
                      color: '#FFFFFF', padding: '6px 8px', fontSize: '0.82rem', outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
