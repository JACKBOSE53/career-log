import { useState, useEffect } from 'react';
import {
  Bell, Mail, Plus, Target, Calendar,
  Trash2, X, AlertCircle, Clock, MapPin,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToUserPosts,
  subscribeToCalendarEvents,
  subscribeToWeeklyGoal,
  setWeeklyGoal as setFirestoreWeeklyGoal,
  addCalendarEvent,
  deleteCalendarEvent,
  formatFirestoreDateLocal,
  getPostDateStr,
  type FirestorePost,
  type FirestoreCalendarEvent,
  type FirestoreWeeklyGoal,
} from '../db/firestore';
import { CATEGORIES } from '../db/mockData';
import type { CountdownEvent, WeeklyGoal, Category } from '../db/mockData';
import VerticalTimePicker from './VerticalTimePicker';
import VerticalNumberPicker from './VerticalNumberPicker';

import { getLocalDateStr, getMondayOfCurrentWeek } from '../utils/dateUtils';

function safeGetDate(dateVal: any): Date {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  const parsed = new Date(dateVal);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

interface ReportSectionProps {
  onUpdate: () => void;
  onNavigateTimeline?: () => void;
  onNavigateNotifications?: () => void;
  hideHeaderTab?: boolean;
  onToast?: (message: string, type: 'success' | 'error') => void;
  userId?: string;
}

// 7日間の日付ラベルを生成 (例: 2/24 月 〜 3/2 日)
function getPast7Days() {
  const days = [];
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      dateStr: `${d.getMonth() + 1}/${d.getDate()}`,
      dayName: dayNames[d.getDay()],
      isToday: i === 0,
      isoDate: d.toISOString().split('T')[0],
    });
  }
  return days;
}

// 残り日数の計算
function getDaysRemaining(targetDateStr: string): number {
  const target = new Date(targetDateStr).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  const diff = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// 直近の月曜日を取得 (YYYY-MM-DD)
function getRecentMondayStr(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// 月曜日ラベルフォーマット (例: 8/3(月)週)
function formatMondayLabel(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(月)週`;
}

export default function ReportSection({ onUpdate, onNavigateTimeline, onNavigateNotifications, hideHeaderTab, onToast, userId }: ReportSectionProps) {
  const { profile: me, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'record' | 'timeline'>('record');
  const [periodFilter, setPeriodFilter] = useState<'week' | 'month' | 'total'>('week');
  const [summaryPeriod, setSummaryPeriod] = useState<'month' | 'total'>('total');

  // Store states
  const [countdowns, setCountdowns] = useState<CountdownEvent[]>([]);
  const [weeklyGoalData, setWeeklyGoalData] = useState<FirestoreWeeklyGoal | null>(null);
  const [myPosts, setMyPosts] = useState<FirestorePost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // 表示対象のIDと、自分のレポートかどうかの判定
  const targetUid = userId || currentUser?.uid;
  const isOwnReport = !userId || userId === currentUser?.uid;

  // Firestoreから対象ユーザーのデータを選択的に取得
  useEffect(() => {
    if (!currentUser || !targetUid) return;
    setPostsLoading(true);

    // 投稿の購読 (他人の場合はセキュリティルール適合クエリを呼ぶ)
    const unsubPosts = subscribeToUserPosts(
      targetUid,
      currentUser.uid,
      true,
      (posts) => {
        setMyPosts(posts);
        setPostsLoading(false);
      }
    );

    // カレンダーイベントと週次目標は本人しかアクセス権がないため、自分のレポートのときのみ購読する
    let unsubEvents = () => {};
    let unsubGoal = () => {};

    if (isOwnReport) {
      unsubEvents = subscribeToCalendarEvents(currentUser.uid, (events) => {
        const mapped: CountdownEvent[] = events.map(e => ({
          id: e.id || '',
          title: e.title,
          targetDate: e.date,
          category: e.category,
          time: e.time,
          location: e.location,
          priority: 'high',
        }));
        setCountdowns(mapped);
      });

      unsubGoal = subscribeToWeeklyGoal(currentUser.uid, (goal) => {
        setWeeklyGoalData(goal);
      });
    }

    return () => {
      unsubPosts();
      unsubEvents();
      unsubGoal();
    };
  }, [currentUser, targetUid, isOwnReport]);

  // Modal states
  const [showAddCountdown, setShowAddCountdown] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newCdTitle, setNewCdTitle] = useState('');
  const [newCdDate, setNewCdDate] = useState('');
  const [newCdTime, setNewCdTime] = useState('');
  const [newCdLocation, setNewCdLocation] = useState('');
  const [newCdCategory, setNewCdCategory] = useState('ES');

  // Edit Goal states
  const currentWeeklyTargetCategory = weeklyGoalData?.targetCategory ?? '全体';
  const currentWeeklyTargetMinutes = weeklyGoalData?.targetMinutes ?? 120;
  const currentWeeklyTargetCount = weeklyGoalData?.targetCount ?? 0;

  const [goalCategory, setGoalCategory] = useState<string>(currentWeeklyTargetCategory);
  const [goalTargetMinutes, setGoalTargetMinutes] = useState<number>(currentWeeklyTargetMinutes);
  const [goalTargetCount, setGoalTargetCount] = useState<number>(currentWeeklyTargetCount);

  useEffect(() => {
    if (weeklyGoalData) {
      setGoalCategory(weeklyGoalData.targetCategory);
      setGoalTargetMinutes(weeklyGoalData.targetMinutes ?? 120);
      setGoalTargetCount(weeklyGoalData.targetCount ?? 0);
    }
  }, [weeklyGoalData]);

  // 計算値: 今日・今月・累計の取り組み時間
  const todayStr = getLocalDateStr();
  const thisMonthStr = todayStr.substring(0, 7);

  const todayMins = myPosts
    .filter((p) => getPostDateStr(p).startsWith(todayStr))
    .reduce((acc, p) => acc + (p.studyMinutes || 0), 0);

  const monthMins = myPosts
    .filter((p) => getPostDateStr(p).startsWith(thisMonthStr))
    .reduce((acc, p) => acc + (p.studyMinutes || 0), 0);

  const totalMins = myPosts.reduce((acc, p) => acc + (p.studyMinutes || 0), 0);

  // 分を「〇時間 〇分」のフォーマットに統一する関数
  function formatHoursMins(totalMins: number): string {
    if (totalMins <= 0) return '0時間 0分';
    const rounded = Math.ceil(totalMins);
    const hrs = Math.floor(rounded / 60);
    const mins = rounded % 60;
    if (hrs === 0) return `${mins}分`;
    if (mins === 0) return `${hrs}時間`;
    return `${hrs}時間 ${mins}分`;
  }

  // 7日間の日別学習時間とカテゴリ別内訳 (多色グラフィックグラフ用)
  const CATEGORY_COLOR_MAP: Record<string, string> = {
    ES: '#3B82F6', // ブルー
    テスト: '#A855F7', // パープル
    面接: '#EF4444', // パッションレッド
    GD: '#EC4899', // ピンク
    説明会: '#F59E0B', // アンバー
    OB訪問: '#10B981', // エメラルドグリーン
    インターン: '#F97316', // オレンジ
    その他: '#94A3B8', // スレートグレー
  };

  // 期間フィルター ('week' | 'month' | 'total') に応じた動的投稿抽出
  const filteredPosts = myPosts.filter((p) => {
    if (periodFilter === 'week') {
      const d = safeGetDate(p.createdAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return d >= sevenDaysAgo;
    }
    if (periodFilter === 'month') {
      return formatFirestoreDateLocal(p.createdAt).startsWith(thisMonthStr);
    }
    return true; // total
  });

  // 期間フィルター ('week' | 'month' | 'total') に応じた棒グラフデータの完全動的生成
  let chartData: { label: string; mins: number; breakdown: Record<string, number>; isToday?: boolean }[] = [];

  if (periodFilter === 'week') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedPostDates = myPosts
      .map((p) => safeGetDate(p.createdAt))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const firstDate = sortedPostDates.length > 0 ? new Date(sortedPostDates[0]) : new Date();
    firstDate.setHours(0, 0, 0, 0);

    const elapsedDays = Math.max(
      1,
      Math.min(7, Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    );

    const activeDaysList = [];
    for (let i = elapsedDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isoDate = getLocalDateStr(d);
      const isToday = i === 0;
      const dayLabel = isToday ? '今日' : `${d.getMonth() + 1}/${d.getDate()}`;
      activeDaysList.push({ isoDate, label: dayLabel, isToday });
    }

    chartData = activeDaysList.map((day) => {
      const dayPosts = myPosts.filter((p) => getPostDateStr(p).startsWith(day.isoDate));
      const mins = dayPosts.reduce((acc, p) => acc + (p.studyMinutes || 0), 0);
      const breakdown: Record<string, number> = {};
      dayPosts.forEach((p) => {
        const cat = p.category || 'その他';
        breakdown[cat] = (breakdown[cat] || 0) + (p.studyMinutes || 30);
      });
      return { label: day.label, mins, breakdown, isToday: day.isToday };
    });
  } else if (periodFilter === 'month') {
    const now = new Date();
    const sortedPostDates = myPosts
      .map((p) => safeGetDate(p.createdAt))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const firstDate = sortedPostDates.length > 0 ? new Date(sortedPostDates[0]) : new Date();
    const diffWeeks = Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const elapsedWeeks = Math.max(1, Math.min(7, diffWeeks));

    const weeks = [];
    for (let i = elapsedWeeks - 1; i >= 0; i--) {
      const end = new Date(now); end.setDate(now.getDate() - i * 7);
      const start = new Date(end); start.setDate(end.getDate() - 6);
      const label = i === 0 ? '今週' : `${i}週前`;
      weeks.push({ startDate: start, endDate: end, label, isCurrent: i === 0 });
    }

    chartData = weeks.map((w) => {
      const weekPosts = myPosts.filter((p) => {
        const d = safeGetDate(p.createdAt);
        return d >= w.startDate && d <= w.endDate;
      });

      const mins = weekPosts.reduce((acc, p) => acc + (p.studyMinutes || 0), 0);
      const breakdown: Record<string, number> = {};
      weekPosts.forEach((p) => {
        const cat = p.category || 'その他';
        breakdown[cat] = (breakdown[cat] || 0) + (p.studyMinutes || 30);
      });
      return { label: w.label, mins, breakdown, isToday: w.isCurrent };
    });
  } else {
    // 【累計】最初の記録月〜今月までの経過月数に応じて 1ヶ月ずつ追加表示 (最大7本)
    const now = new Date();
    const sortedPostDates = myPosts
      .map((p) => p.createdAt instanceof Date ? p.createdAt : (p.createdAt as any).toDate())
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const firstDate = sortedPostDates.length > 0 ? new Date(sortedPostDates[0]) : new Date();

    const monthsDiff = (now.getFullYear() - firstDate.getFullYear()) * 12 + (now.getMonth() - firstDate.getMonth()) + 1;
    const elapsedMonths = Math.max(1, Math.min(7, monthsDiff));

    const pastMonths = [];
    for (let i = elapsedMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = i === 0 ? '今月' : `${d.getMonth() + 1}月`;
      pastMonths.push({ mStr, label, isCurrent: i === 0 });
    }
    
    chartData = [];
    const limit = Math.min(7, pastMonths.length);
    for (let i = 0; i < limit; i++) {
      const m = pastMonths[limit - 1 - i];
      const mPosts = myPosts.filter((p) => formatFirestoreDateLocal(p.createdAt).startsWith(m.mStr));
      const mins = mPosts.reduce((acc, p) => acc + (p.studyMinutes || 0), 0);
      const breakdown: Record<string, number> = {};
      mPosts.forEach((p) => {
        const cat = p.category || 'その他';
        breakdown[cat] = (breakdown[cat] || 0) + (p.studyMinutes || 30);
      });
      chartData.push({ label: m.label, mins, breakdown, isToday: m.isCurrent });
    }
  }

  const maxChartMins = Math.max(...chartData.map((d) => d.mins), 60);

  // 選択中の期間 (periodFilter) に連動したタグ（項目）ごとの取り組み時間集計
  const categoryDurations: Record<string, number> = {};
  filteredPosts.forEach((p) => {
    const catName = p.category || 'その他';
    const mins = p.studyMinutes || 30;
    categoryDurations[catName] = (categoryDurations[catName] || 0) + mins;
  });

  const totalCategoryMins = Object.values(categoryDurations).reduce((a, b) => a + b, 0);

  // 定量実績のカウント（対象タグ: ES / 面接 / OB訪問 / 内定）
  const targetSummaryPosts = myPosts.filter((p) => {
    if (summaryPeriod === 'month') {
      return getPostDateStr(p).startsWith(thisMonthStr);
    }
    return true; // total
  });

  const esCount = targetSummaryPosts.filter((p) => p.category === 'ES').length;
  const obCount = targetSummaryPosts.filter((p) => p.category === 'OB訪問').length;
  const interviewCount = targetSummaryPosts.filter((p) => p.category === '面接').length;
  const offerCount = targetSummaryPosts.filter((p) => p.category === '内定' || p.title.includes('内定')).length;

  // 今週の目標達成度 (時間 & 件数)
  const thisWeekPosts = myPosts.filter((p) => {
    const d = safeGetDate(p.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return d >= sevenDaysAgo && (currentWeeklyTargetCategory === '全体' || p.category === currentWeeklyTargetCategory);
  });
  const thisWeekMins = thisWeekPosts.reduce((acc, p) => acc + (p.studyMinutes || 0), 0);
  const thisWeekCount = thisWeekPosts.length;

  const timeProgressPct = currentWeeklyTargetMinutes > 0 ? Math.min(100, Math.round((thisWeekMins / currentWeeklyTargetMinutes) * 100)) : 0;
  const countProgressPct = currentWeeklyTargetCount > 0 ? Math.min(100, Math.round((thisWeekCount / currentWeeklyTargetCount) * 100)) : 0;

  async function handleAddCountdown() {
    if (!newCdTitle.trim() || !newCdDate || !currentUser) return;
    await addCalendarEvent(currentUser.uid, {
      title: newCdTitle.trim(),
      date: newCdDate,
      category: newCdCategory,
      time: newCdTime.trim() || undefined,
      location: newCdLocation.trim() || undefined,
    });
    setShowAddCountdown(false);
    setNewCdTitle('');
    setNewCdDate('');
    setNewCdTime('');
    setNewCdLocation('');
    onUpdate();
  }

  async function handleDeleteCd(id: string) {
    await deleteCalendarEvent(id);
    onUpdate();
  }

  async function handleSaveGoal() {
    if (!currentUser) return;
    await setFirestoreWeeklyGoal(
      currentUser.uid,
      goalCategory,
      Number(goalTargetMinutes) || 0,
      Number(goalTargetCount) || 0
    );
    setShowGoalModal(false);
    onUpdate();
    onToast?.('今週の目標を保存しました', 'success');
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease', paddingBottom: 40 }}>
      {/* ── 0. ヘッダー ── */}
      {!hideHeaderTab && (
        <div style={{
          position: 'sticky', top: 0,
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          zIndex: 20,
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
            {/* 左: ユーザーアバター + タイトル */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', color: 'white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              }}>
                {currentUser?.displayName?.[0] || 'U'}
              </div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                レポート
              </h1>
            </div>

            {/* 右: 通知ベル + メッセージ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={onNavigateNotifications}
                style={{
                  position: 'relative', border: 'none', background: 'var(--bg-surface-2)',
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)',
                }}
                aria-label="通知"
              >
                <Bell size={18} />
              </button>

              <button
                style={{
                  position: 'relative', border: 'none', background: 'var(--bg-surface-2)',
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)',
                }}
                aria-label="お知らせ"
              >
                <Mail size={18} />
              </button>
            </div>
          </div>

          {/* ── 1. 上部タブ切り替え (記録 / タイムライン) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveTab('record')}
              style={{
                padding: '12px 0', border: 'none', background: 'transparent',
                fontFamily: 'inherit', fontWeight: activeTab === 'record' ? 700 : 500,
                fontSize: '0.95rem',
                color: activeTab === 'record' ? 'var(--color-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'record' ? '3px solid var(--color-primary)' : '3px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              記録
            </button>
            <button
              onClick={() => {
                setActiveTab('timeline');
                onNavigateTimeline?.();
              }}
              style={{
                padding: '12px 0', border: 'none', background: 'transparent',
                fontFamily: 'inherit', fontWeight: activeTab === 'timeline' ? 700 : 500,
                fontSize: '0.95rem',
                color: activeTab === 'timeline' ? 'var(--color-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'timeline' ? '3px solid var(--color-primary)' : '3px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              タイムライン
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: '16px 16px 0' }}>
        {/* ── 2. 就活取り組み実績（定量実績サマリー） 就活取り組み推移の上に配置 ── */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              就活取り組み実績
            </h2>
            <div style={{ display: 'flex', background: 'var(--bg-surface-2)', padding: 3, borderRadius: 8 }}>
              {(['month', 'total'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSummaryPeriod(p)}
                  style={{
                    border: 'none', padding: '4px 10px', borderRadius: 6,
                    fontSize: '0.72rem', fontWeight: summaryPeriod === p ? 700 : 500,
                    background: summaryPeriod === p ? 'white' : 'transparent',
                    color: summaryPeriod === p ? 'var(--color-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {p === 'month' ? '今月' : '累計'}
                </button>
              ))}
            </div>
          </div>

          {/* 定量実績グリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'OB訪問', value: obCount, unit: '社', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
              { label: 'ES提出', value: obCount === 0 && esCount === 0 ? 0 : esCount, unit: '社', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
              { label: '面接', value: interviewCount, unit: '回', color: '#E11D48', bg: '#FFF1F2', border: '#FECDD3' },
              { label: '内定', value: offerCount, unit: '社', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', highlight: true },
            ].map((item) => (
              <div key={item.label} style={{
                padding: '12px 6px', borderRadius: 12,
                background: item.bg, border: `1.5px solid ${item.highlight ? 'var(--color-primary)' : item.border}`,
                textAlign: 'center',
                boxShadow: item.highlight ? 'var(--shadow-sm)' : 'none',
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: item.color, marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: item.color }}>
                  {item.value} <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. 就活取り組み推移 (大人っぽく洗練されたVIPスレートデザイン) ── */}
        <div className="card" style={{ padding: 20, marginBottom: 16, border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                就活取り組み推移
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {periodFilter === 'week' ? `記録開始から ${chartData.length} 日目の取り組み時間` : periodFilter === 'month' ? '今月の総時間の推移' : 'これまでの全期間累計'}
              </p>
            </div>

            {/* 期間切り替え (洗練されたスレートカプセルボタン) */}
            <div style={{ display: 'flex', background: 'var(--bg-surface-2)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['week', 'month', 'total'] as const).map((p) => {
                const isActive = periodFilter === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPeriodFilter(p)}
                    style={{
                      padding: '5px 12px', borderRadius: 8,
                      fontSize: '0.75rem', fontWeight: isActive ? 800 : 500,
                      background: isActive ? 'var(--bg-surface)' : 'transparent',
                      color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                      border: isActive ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                  >
                    {p === 'week' ? '週' : p === 'month' ? '月' : '累計'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* サマリー数値 (タップで対象の期間・グラフへ動的切り替え) */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
            marginBottom: 22, textAlign: 'center',
          }}>
            {/* 今日 / 週 */}
            <div
              onClick={() => setPeriodFilter('week')}
              style={{
                background: periodFilter === 'week' ? 'var(--color-primary-glow)' : 'var(--bg-surface-2)',
                padding: '12px 6px', borderRadius: 14,
                border: `1.5px solid ${periodFilter === 'week' ? 'var(--color-primary)' : 'var(--border-color)'}`,
                cursor: 'pointer', transition: 'all 0.2s ease',
                userSelect: 'none',
              }}
              title="タップして直近7日間の日別グラフを表示"
            >
              <div style={{ fontSize: '0.68rem', color: periodFilter === 'week' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: 700, marginBottom: 3 }}>
                今日 {periodFilter === 'week' ? '(週表示中)' : ''}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {formatHoursMins(todayMins)}
              </div>
            </div>

            {/* 今月 */}
            <div
              onClick={() => setPeriodFilter('month')}
              style={{
                background: periodFilter === 'month' ? 'var(--color-primary-glow)' : 'var(--bg-surface-2)',
                padding: '12px 6px', borderRadius: 14,
                border: `1.5px solid ${periodFilter === 'month' ? 'var(--color-primary)' : 'var(--border-color)'}`,
                cursor: 'pointer', transition: 'all 0.2s ease',
                userSelect: 'none',
              }}
              title="タップして今月の週別グラフを表示"
            >
              <div style={{ fontSize: '0.68rem', color: periodFilter === 'month' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: 700, marginBottom: 3 }}>
                今月 {periodFilter === 'month' ? '(月表示中)' : ''}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                {formatHoursMins(monthMins)}
              </div>
            </div>

            {/* 全累計 */}
            <div
              onClick={() => setPeriodFilter('total')}
              style={{
                background: periodFilter === 'total' ? 'var(--color-primary-glow)' : 'var(--bg-surface-2)',
                padding: '12px 6px', borderRadius: 14,
                border: `1.5px solid ${periodFilter === 'total' ? 'var(--color-primary)' : 'var(--border-color)'}`,
                cursor: 'pointer', transition: 'all 0.2s ease',
                userSelect: 'none',
              }}
              title="タップして全期間の月別グラフを表示"
            >
              <div style={{ fontSize: '0.68rem', color: periodFilter === 'total' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: 700, marginBottom: 3 }}>
                全累計 {periodFilter === 'total' ? '(累計表示中)' : ''}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F8FAFC' }}>
                {formatHoursMins(totalMins)}
              </div>
            </div>
          </div>

          {/* 棒グラフ (クッキリ見やすいスタックバーチャート) */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${chartData.length}, 1fr)`, gap: 10, height: 140, alignItems: 'flex-end', zIndex: 1 }}>
            {chartData.map((d) => {
              const heightPct = d.mins > 0 ? Math.max((d.mins / maxChartMins) * 100, 15) : 8;
              const entries = Object.entries(d.breakdown);

              return (
                <div key={d.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  {/* 上部時間ラベル */}
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: d.mins > 0 ? 'var(--color-primary)' : 'transparent', marginBottom: 6, whiteSpace: 'nowrap' }}>
                    {d.mins > 0 ? formatHoursMins(d.mins) : ''}
                  </div>

                  {/* クッキリ立った棒グラフバー */}
                  <div style={{
                    width: '100%', maxWidth: 28,
                    height: `${heightPct}%`,
                    borderRadius: '8px 8px 4px 4px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    background: d.mins > 0 ? 'transparent' : 'var(--bg-surface-2)',
                    border: d.isToday ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    transition: 'all 0.3s ease',
                    boxShadow: d.isToday ? '0 0 10px rgba(37, 99, 235, 0.25)' : 'none',
                  }}>
                    {d.mins > 0 ? (
                      entries.map(([cat, m]) => {
                        const segPct = (m / d.mins) * 100;
                        const color = CATEGORY_COLOR_MAP[cat] || '#2563EB';
                        return (
                          <div
                            key={cat}
                            title={`${cat}: ${formatHoursMins(m)}`}
                            style={{
                              width: '100%',
                              height: `${segPct}%`,
                              background: color,
                              transition: 'height 0.3s ease',
                            }}
                          />
                        );
                      })
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface-2)', opacity: 0.4 }} />
                    )}
                  </div>

                  {/* 日付ラベル */}
                  <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: d.isToday ? 800 : 600,
                      color: d.isToday ? 'var(--color-primary)' : 'var(--text-secondary)',
                    }}>
                      {d.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── ★ 選択期間に連動したタグごとの取り組み時間 (超シンプルテキスト表示) ── */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {Object.keys(categoryDurations).length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center' }}>
                {Object.entries(categoryDurations).map(([cat, mins]) => {
                  const color = CATEGORY_COLOR_MAP[cat] || '#94A3B8';
                  return (
                    <div key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color, fontSize: '0.68rem' }}>●</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {cat}
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {formatHoursMins(mins)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {periodFilter === 'week' ? '今週の記録はありません' : periodFilter === 'month' ? '今月の記録はありません' : '記録がありません'}
              </div>
            )}
          </div>
        </div>





        {/* ── 6. 今週の目標 ── */}
        {isOwnReport && (
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            {!weeklyGoalData ? (
              /* 未設定時の登録誘導デザイン */
              <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.12)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 10px', border: '1px solid rgba(59, 130, 246, 0.3)',
                }}>
                  <Target size={24} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  今週の目標を設定してみよう！
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                  1週間の取り組み目標時間を決めてモチベーションを高めよう
                </p>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700, borderRadius: 99, gap: 6 }}
                >
                  <Plus size={16} /> 目標を設定する
                </button>
              </div>
            ) : (
              /* 設定済み時のプログレス表示 */
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      今週の目標 ({currentWeeklyTargetCategory})
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowGoalModal(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: 4, fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    <Target size={14} /> 編集
                  </button>
                </div>

                {/* 週次目標の進捗表示 (時間 & 件数) */}
                {(() => {
                  const mainPct = currentWeeklyTargetMinutes > 0 ? timeProgressPct : countProgressPct;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* 円形プログレスリング */}
                      <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                        <svg width="72" height="72" viewBox="0 0 72 72">
                          <circle cx="36" cy="36" r="30" stroke="var(--border-color)" strokeWidth="6" fill="transparent" />
                          <circle
                            cx="36" cy="36" r="30"
                            stroke={mainPct >= 100 ? '#16A34A' : '#3B82F6'}
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 30}
                            strokeDashoffset={2 * Math.PI * 30 * (1 - mainPct / 100)}
                            strokeLinecap="round"
                            transform="rotate(-90 36 36)"
                            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                          />
                        </svg>
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {mainPct}%
                          </span>
                        </div>
                      </div>

                      <div style={{ flex: 1 }}>
                        {currentWeeklyTargetMinutes > 0 && (
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                            時間目標: {formatHoursMins(thisWeekMins)} / {formatHoursMins(currentWeeklyTargetMinutes)}
                          </div>
                        )}
                        {currentWeeklyTargetCount > 0 && (
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            件数目標: {thisWeekCount}件 / {currentWeeklyTargetCount}件
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── カウントダウン追加モーダル ── */}
      {/* ── カウントダウン予定追加モーダル (大きくて見やすいUI) ── */}
      {showAddCountdown && (
        <div className="modal-overlay" onClick={() => setShowAddCountdown(false)}>
          <div className="modal-content animate-scaleUp" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, padding: '28px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>大切な選考予定を追加</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>残り日数をカウントダウン表示する目標予定を設定します</p>
              </div>
              <button onClick={() => setShowAddCountdown(false)} className="btn btn-ghost btn-icon" style={{ padding: 8 }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  1. 予定タイトル <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  className="input"
                  value={newCdTitle}
                  onChange={(e) => setNewCdTitle(e.target.value)}
                  placeholder="例: リクルート 本選考ES締切"
                  style={{ fontSize: '0.95rem', padding: '12px 14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                    2. 目標日付 <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={newCdDate}
                    onChange={(e) => setNewCdDate(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '11px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                    3. カテゴリ
                  </label>
                  <select
                    className="input"
                    value={newCdCategory}
                    onChange={(e) => setNewCdCategory(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '11px 12px' }}
                  >
                    <option value="ES">ES締切</option>
                    <option value="WEBテスト">WEBテスト</option>
                    <option value="面接">面接日</option>
                    <option value="インターン">インターン/ジョブ</option>
                    <option value="OB訪問">OB訪問</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
              </div>

              {/* 4. 時間 (縦ドラムスライドピッカー) */}
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  4. 時間 <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(上下スライドで時間・分を選択)</span>
                </label>
                <VerticalTimePicker
                  initialHour={14}
                  initialMinute={0}
                  minuteStep={5}
                  onChange={(_h, _m, formatted) => setNewCdTime(`${formatted}〜`)}
                />
              </div>

              {/* 5. 場所・URL */}
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  5. 場所・URL <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(任意)</span>
                </label>
                <input
                  className="input"
                  value={newCdLocation}
                  onChange={(e) => setNewCdLocation(e.target.value)}
                  placeholder="例: オンライン(Zoom) / テストセンター"
                  style={{ fontSize: '0.9rem', padding: '12px 14px' }}
                />
              </div>

              <button
                onClick={handleAddCountdown}
                className="btn btn-primary"
                style={{
                  marginTop: 6, padding: '14px 0', fontSize: '1rem', fontWeight: 800,
                  borderRadius: 14,
                }}
              >
                カウントダウン予定を保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 今週の目標設定モーダル (上下スライドピッカー方式) ── */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal-content animate-scaleUp" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>今週の目標をセット</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 2 }}>項目と目標値（時間/件数）を上下スライドで選択</p>
              </div>
              <button onClick={() => setShowGoalModal(false)} className="btn btn-ghost btn-icon" style={{ padding: 6 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* 1. 項目をタップ選択 */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  1. 目標項目を選択
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[{ id: '全体', label: '全体' }, ...CATEGORIES].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setGoalCategory(cat.id)}
                      style={{
                        padding: '6px 14px', borderRadius: 99,
                        border: `1.5px solid ${goalCategory === cat.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        background: goalCategory === cat.id ? 'var(--color-primary)' : 'var(--bg-surface-2)',
                        color: goalCategory === cat.id ? 'white' : 'var(--text-primary)',
                        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 目標時間ピッカー ＆ 直接数字入力 */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  2. 目標取り組み時間を設定
                </label>
                
                {/* 2-A. 直接数字入力 (時間 & 分) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      max="100"
                      value={Math.floor(goalTargetMinutes / 60)}
                      onChange={(e) => {
                        const h = Math.max(0, Number(e.target.value) || 0);
                        const m = goalTargetMinutes % 60;
                        setGoalTargetMinutes(h * 60 + m);
                      }}
                      style={{ width: 75, padding: '8px 10px', fontSize: '1rem', fontWeight: 700, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>時間</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      max="59"
                      step="5"
                      value={goalTargetMinutes % 60}
                      onChange={(e) => {
                        const m = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                        const h = Math.floor(goalTargetMinutes / 60);
                        setGoalTargetMinutes(h * 60 + m);
                      }}
                      style={{ width: 75, padding: '8px 10px', fontSize: '1rem', fontWeight: 700, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>分</span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 800, marginLeft: 'auto' }}>
                    合計: {Math.floor(goalTargetMinutes / 60)}時間{goalTargetMinutes % 60}分
                  </div>
                </div>

                {/* 2-B. クイック時間選択ボタン */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {[
                    { label: '30分', mins: 30 },
                    { label: '1時間', mins: 60 },
                    { label: '2時間', mins: 120 },
                    { label: '3時間', mins: 180 },
                    { label: '5時間', mins: 300 },
                    { label: '10時間', mins: 600 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setGoalTargetMinutes(p.mins)}
                      style={{
                        padding: '4px 10px', borderRadius: 8,
                        border: `1px solid ${goalTargetMinutes === p.mins ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        background: goalTargetMinutes === p.mins ? 'var(--color-primary)' : 'var(--bg-surface-2)',
                        color: goalTargetMinutes === p.mins ? 'white' : 'var(--text-secondary)',
                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* 2-C. スライドピッカー */}
                <VerticalTimePicker
                  initialHour={Math.floor(goalTargetMinutes / 60)}
                  initialMinute={goalTargetMinutes % 60}
                  minuteStep={5}
                  onChange={(h, m) => {
                    const totalMins = h * 60 + m;
                    setGoalTargetMinutes(totalMins >= 0 ? totalMins : 0);
                  }}
                />
              </div>

              {/* 3. 目標件数入力 */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  3. 目標件数を設定 (任意、0で時間のみ目標)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    max="100"
                    value={goalTargetCount || ''}
                    onChange={(e) => setGoalTargetCount(Number(e.target.value) || 0)}
                    placeholder="例: 3"
                    style={{ width: 120, padding: '10px 14px', fontSize: '0.95rem' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>社 / 回</span>
                </div>
              </div>

              {/* 決定ボタン */}
              <button
                onClick={handleSaveGoal}
                className="btn btn-primary"
                style={{
                  width: '100%', marginTop: 4, padding: '14px 0',
                  fontSize: '1rem', fontWeight: 800, borderRadius: 14,
                }}
              >
                この目標をセットする
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
