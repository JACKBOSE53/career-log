export type Category =
  | 'ES'
  | 'テスト'
  | '面接'
  | 'GD'
  | '説明会'
  | 'OB訪問'
  | 'インターン'
  | 'その他';

export type InterviewSubTag =
  | '1次面接'
  | '2次面接'
  | '3次〜面接'
  | '最終面接'
  | '動画面接'
  | 'AI面接'
  | '面談・リクルーター';

export const INTERVIEW_SUB_TAGS: InterviewSubTag[] = [
  '1次面接',
  '2次面接',
  '3次〜面接',
  '最終面接',
  '動画面接',
  'AI面接',
  '面談・リクルーター',
];

export const CATEGORIES: { id: Category; label: string; emoji: string; color: string }[] = [
  { id: 'ES', label: 'ES', emoji: '', color: '#2563EB' },             // 鮮やかブルー
  { id: 'テスト', label: 'テスト', emoji: '', color: '#8B5CF6' },       // 鮮やかパープル
  { id: '面接', label: '面接', emoji: '', color: '#EF4444' },         // 鮮やかレッド
  { id: 'GD', label: 'GD', emoji: '', color: '#EC4899' },             // 鮮やかピンク
  { id: '説明会', label: '説明会', emoji: '', color: '#F59E0B' },       // 鮮やかアンバー
  { id: 'OB訪問', label: 'OB訪問', emoji: '', color: '#10B981' },     // 鮮やかエメラルド
  { id: 'インターン', label: 'インターン', emoji: '', color: '#F97316' }, // 鮮やかオレンジ
  { id: 'その他', label: 'その他', emoji: '', color: '#64748B' },     // スレートグレー
];

export type JobStatus = '就活中' | '内定承諾済み' | '活動休止中' | 'OB/OG' | '未設定';

export const JOB_STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  '就活中':     { label: '就活中',     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', emoji: '' },
  '内定承諾済み': { label: '内定承諾済み', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', emoji: '' },
  '活動休止中':  { label: '活動休止中',  color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', emoji: '' },
  'OB/OG':     { label: 'OB/OG',     color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', emoji: '' },
  '未設定':     { label: '',          color: '#9CA3AF', bg: '#F3F4F6', border: '#E5E7EB', emoji: '' },
};

export interface User {
  id: string;
  name: string; // ニックネーム
  handle: string;
  email: string; // メールアドレス
  password?: string; // パスワード
  avatar: string;
  avatarUrl?: string;
  university: string; // 大学名
  grade: string; // 学年 (例: 大学3年 / 26卒)
  defaultVisibility?: 'public' | 'followers' | 'private'; // デフォルトの投稿公開設定
  followersCount: number;
  followingCount: number;
  joinedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  category: Category;
  company?: string;
  title: string;
  content: string;
  imageUrl?: string;
  tags: string[];
  studyMinutes?: number;
  visibility: 'public' | 'followers' | 'private';
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export interface Community {
  id: string;
  type: 'university' | 'industry' | 'company' | 'event';
  name: string;
  description: string;
  memberCount: number;
  emoji: string;
  color: string;
  allowedUniversity?: string; // 特定大学限定の場合 (例: '早稲田大学')
  isPrivate?: boolean; // 「私のひろば」(プライベート・自作ルーム)
  createdBy?: string; // 作成者のユーザーID
}

export interface CommunityMessage {
  id: string;
  communityId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export const INITIAL_COMMUNITY_MESSAGES: CommunityMessage[] = [
  { id: 'cm-1', communityId: 'comm-1', userId: 'user-me', content: '早稲田3年生の皆さんよろしくお願いします！ES添削し合いましょう', createdAt: '2024-10-15T10:00:00Z' },
  { id: 'cm-2', communityId: 'comm-1', userId: 'user-3', content: '商学部です！リクルートのジョブ受ける方いますか？', createdAt: '2024-10-15T10:15:00Z' },
  { id: 'cm-3', communityId: 'comm-2', userId: 'user-2', content: '慶應生限定ルームです。金融志望の方情報交換しましょう！', createdAt: '2024-10-10T12:00:00Z' },
  { id: 'cm-4', communityId: 'comm-5', userId: 'user-me', content: 'IT業界のWebテスト対策でおすすめの参考書ありますか？', createdAt: '2024-10-18T14:30:00Z' },
  { id: 'cm-5', communityId: 'comm-5', userId: 'user-3', content: '玉手箱は青本を3周すればかなり解けるようになりますよ！', createdAt: '2024-10-18T15:00:00Z' },
];


export interface CountdownEvent {
  id: string;
  title: string;
  company?: string;
  targetDate: string; // YYYY-MM-DD
  category: string;
  time?: string; // 例: '14:00〜15:30'
  location?: string; // 例: 'オンライン (Zoom)' / 'テストセンター新宿'
  priority?: 'high' | 'medium' | 'low'; // 第一志望群 / 第二志望群 / 練習
}

export interface WeeklyGoal {
  title: string;
  category?: Category | '全体';
  startDate?: string; // e.g. '2026-08-03' (Monday)
  targetType: 'minutes' | 'count';
  goalValue: number; // e.g. 180 (mins) or 3 (companies)
  currentValue: number;
  unit: string;
  isCompleted?: boolean;
}

export interface AchievementBadge {
  id: string;
  title: string;
  emoji: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  category?: 'es' | 'ob' | 'interview' | 'offer' | 'streak';
}

export const INITIAL_COUNTDOWNS: CountdownEvent[] = [
  { id: 'cd-1', title: 'リクルート 本選考ES締切', targetDate: '2026-08-15', category: 'ES', time: '23:59まで', location: 'マイページ', priority: 'high' },
  { id: 'cd-2', title: 'サイバーエージェント 一次面接', targetDate: '2026-08-20', category: '面接', time: '14:00〜15:00', location: 'オンライン (Zoom)', priority: 'high' },
  { id: 'cd-3', title: 'アクセンチュア WEBテスト受験', targetDate: '2026-08-25', category: 'WEBテスト', time: '18:00〜', location: '自宅 / マイページ', priority: 'medium' },
  { id: 'cd-4', title: '野村総合研究所 ジョブ開催', targetDate: '2026-09-01', category: 'インターン', time: '10:00〜18:00', location: '東京本社 3F', priority: 'low' },
];

export const INITIAL_WEEKLY_GOAL: WeeklyGoal = {
  title: '今週の就活アクション 3回達成',
  targetType: 'count',
  goalValue: 3,
  currentValue: 2,
  unit: '回',
};

export const INITIAL_BADGES: AchievementBadge[] = [
  { id: 'b-1', title: 'ファーストES', emoji: '', description: '初めてES提出を記録した', unlocked: true, unlockedAt: '2024-10-02' },
  { id: 'b-2', title: 'OB訪問マスター', emoji: '', description: 'OB/OG訪問を5回以上実施した', unlocked: true, unlockedAt: '2024-11-15' },
  { id: 'b-3', title: '面接突破王', emoji: '', description: '面接を3回以上達成した', unlocked: true, unlockedAt: '2024-12-10' },
  { id: 'b-4', title: '初内定獲得！', emoji: '', description: '念願の内定を1社獲得した', unlocked: true, unlockedAt: '2025-01-20', category: 'offer' },
  { id: 'b-5', title: '7日連続記録', emoji: '', description: '7日間連続で就活記録を付けた', unlocked: true, unlockedAt: '2024-10-15', category: 'streak' },
  { id: 'b-6', title: '10社エントリー', emoji: '', description: 'ES10社以上提出達成', unlocked: false, category: 'es' },
];


export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'reminder';
  fromUserId: string;
  postId?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export const INITIAL_USERS: User[] = [
  {
    id: 'user-me',
    name: '高木 悠太',
    handle: 'yuta_careerlog',
    email: 'yuta@example.com',
    password: 'password123',
    avatar: 'Y',
    university: '早稲田大学',
    grade: '26卒 (大学3年)',
    followersCount: 0,
    followingCount: 0,
    joinedAt: new Date().toISOString(),
  },
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post-init-1',
    userId: 'user-me',
    category: 'ES',
    title: 'CareerLogでの記録をスタートしました！',
    content: '今日から就活の取り組み時間・行動量を記録して、自己管理を徹底していきます！目指せ志望企業内定',
    tags: ['ES', '就活スタート', 'CareerLog'],
    studyMinutes: 45,
    visibility: 'public',
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_COMMENTS: Comment[] = [];


export const INITIAL_COMMUNITIES: Community[] = [
  { id: 'comm-1', type: 'university', name: '早稲田大学', description: '早大生の就活情報交換の場', memberCount: 342, emoji: 'U', color: '#DC2626', allowedUniversity: '早稲田大学' },
  { id: 'comm-2', type: 'university', name: '慶應義塾大学', description: '慶大生のキャリア情報共有', memberCount: 289, emoji: 'U', color: '#1E40AF', allowedUniversity: '慶應義塾大学' },
  { id: 'comm-3', type: 'university', name: '東京大学', description: '東大生の就活・キャリア相談', memberCount: 178, emoji: 'U', color: '#4C1D95', allowedUniversity: '東京大学' },
  { id: 'comm-4', type: 'university', name: '明治大学', description: '明大生の就活応援コミュニティ', memberCount: 267, emoji: 'U', color: '#D97706', allowedUniversity: '明治大学' },

  { id: 'comm-5', type: 'industry', name: 'IT・通信業界', description: 'IT/テック系就活の情報共有', memberCount: 891, emoji: 'I', color: '#0284C7' },
  { id: 'comm-6', type: 'industry', name: '金融・証券業界', description: '金融業界を目指す就活生のコミュニティ', memberCount: 634, emoji: 'I', color: '#059669' },
  { id: 'comm-7', type: 'industry', name: 'コンサルティング業界', description: 'コンサル就活の情報共有・ケース練習', memberCount: 712, emoji: 'I', color: '#7C3AED' },
  { id: 'comm-8', type: 'industry', name: '広告・メディア業界', description: '広告・メディア志望の就活生', memberCount: 445, emoji: 'I', color: '#DB2777' },
  { id: 'comm-9', type: 'company', name: 'リクルート', description: 'リクルート志望者の情報交換', memberCount: 234, emoji: 'C', color: '#EF4444' },
  { id: 'comm-10', type: 'company', name: 'サイバーエージェント', description: 'CA志望者の交流の場', memberCount: 198, emoji: 'C', color: '#3B82F6' },
  { id: 'comm-11', type: 'company', name: 'メルカリ', description: 'メルカリ志望者コミュニティ', memberCount: 156, emoji: 'C', color: '#F97316' },
  { id: 'comm-12', type: 'event', name: 'インターン2025夏', description: '2025年夏インターン情報共有', memberCount: 1243, emoji: 'E', color: '#FBBF24' },
  { id: 'comm-13', type: 'event', name: 'SPI勉強会', description: 'SPI対策の情報共有・勉強仲間', memberCount: 867, emoji: 'E', color: '#8B5CF6' },
  { id: 'comm-14', type: 'event', name: 'ES添削し合おう', description: 'ES相互レビューコミュニティ', memberCount: 543, emoji: 'E', color: '#10B981' },
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'like',
    fromUserId: 'user-2',
    postId: 'post-9',
    message: '山田 花音さんがあなたの投稿にいいねしました',
    createdAt: '2024-11-15T20:05:00Z',
    read: false,
  },
  {
    id: 'notif-2',
    type: 'comment',
    fromUserId: 'user-3',
    postId: 'post-10',
    message: '田中 颯さんがあなたの投稿にコメントしました',
    createdAt: '2024-11-15T21:10:00Z',
    read: false,
  },
  {
    id: 'notif-3',
    type: 'follow',
    fromUserId: 'user-4',
    message: '中村 あおいさんがあなたをフォローしました',
    createdAt: '2024-11-14T12:00:00Z',
    read: true,
  },
  {
    id: 'notif-4',
    type: 'like',
    fromUserId: 'user-5',
    postId: 'post-9',
    message: '小林 健さんがあなたの投稿にいいねしました',
    createdAt: '2024-11-13T19:00:00Z',
    read: true,
  },
];
