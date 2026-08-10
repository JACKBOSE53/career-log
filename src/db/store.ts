import type {
  User,
  Post,
  Comment,
  Community,
  Notification,
  CountdownEvent,
  WeeklyGoal,
  AchievementBadge,
  CommunityMessage,
} from './mockData';
import {
  INITIAL_USERS,
  INITIAL_POSTS,
  INITIAL_COMMENTS,
  INITIAL_COMMUNITIES,
  INITIAL_NOTIFICATIONS,
  INITIAL_COUNTDOWNS,
  INITIAL_WEEKLY_GOAL,
  INITIAL_BADGES,
  INITIAL_COMMUNITY_MESSAGES,
} from './mockData';

// ─── Storage Keys ────────────────────────────────────────────────────────────
const KEY = {
  CURRENT_USER_ID: 'cl_current_user_id',
  USERS: 'cl_users',
  POSTS: 'cl_posts',
  COMMENTS: 'cl_comments',
  COMMUNITIES: 'cl_communities',
  NOTIFICATIONS: 'cl_notifications',
  LIKED_POSTS: 'cl_liked_posts',
  SAVED_POSTS: 'cl_saved_posts',
  FOLLOWING: 'cl_following',
  JOINED_COMMUNITIES: 'cl_joined_communities',
  COUNTDOWNS: 'cl_countdowns',
  WEEKLY_GOAL: 'cl_weekly_goal',
  BADGES: 'cl_badges',
  COMMUNITY_MESSAGES: 'cl_community_messages',
};

// ─── Generic helpers ─────────────────────────────────────────────────────────
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Initialization ───────────────────────────────────────────────────────────
const SCHEMA_VERSION = 'v8'; // bump this when the data model changes





export function initStore(): void {
  const storedVersion = localStorage.getItem('cl_schema_version');

  // Clear all data if schema version changed
  if (storedVersion !== SCHEMA_VERSION) {
    Object.values(KEY).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('cl_schema_version');
  }

  if (!localStorage.getItem(KEY.USERS)) {
    save(KEY.USERS, INITIAL_USERS);
    save(KEY.POSTS, INITIAL_POSTS);
    save(KEY.COMMENTS, INITIAL_COMMENTS);
    save(KEY.COMMUNITIES, INITIAL_COMMUNITIES);
    save(KEY.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    save(KEY.CURRENT_USER_ID, 'user-me');
    save(KEY.LIKED_POSTS, [] as string[]);
    save(KEY.SAVED_POSTS, [] as string[]);
    save(KEY.FOLLOWING, ['user-2', 'user-3', 'user-4']);
    save(KEY.JOINED_COMMUNITIES, ['comm-1', 'comm-5', 'comm-13']);
    save(KEY.COUNTDOWNS, INITIAL_COUNTDOWNS);
    save(KEY.WEEKLY_GOAL, INITIAL_WEEKLY_GOAL);
    save(KEY.BADGES, INITIAL_BADGES);
    save(KEY.COMMUNITY_MESSAGES, INITIAL_COMMUNITY_MESSAGES);
    localStorage.setItem('cl_schema_version', SCHEMA_VERSION);
  }
}


// ─── User ─────────────────────────────────────────────────────────────────────
export function getCurrentUserId(): string {
  return load(KEY.CURRENT_USER_ID, 'user-me');
}

// Firebase Authenticationのログイン状態が変わった時に、
// このローカルストア(将来Firestoreに置き換わる想定)の「今のユーザー」を切り替える。
export function setCurrentUserId(uid: string): void {
  save(KEY.CURRENT_USER_ID, uid);
}

// Firebase Authで新規サインアップ/初回ログインしたユーザーが
// ローカルのusers一覧にまだ存在しない場合、プロフィールの雛形を作成する。
// (store.ts自体をFirestore対応させる際は、この関数はFirestore側の
//  users/{uid} ドキュメント作成処理に置き換える)
export function ensureUserExists(uid: string, profile: { name: string; email: string }): void {
  const users = getAllUsers();
  if (users.some((u) => u.id === uid)) return;

  const newUser: User = {
    id: uid,
    name: profile.name || '名称未設定',
    handle: `user_${uid.slice(0, 8)}`,
    email: profile.email,
    avatar: (profile.name || profile.email || '?').charAt(0).toUpperCase(),
    university: '',
    grade: '未設定',
    followersCount: 0,
    followingCount: 0,
    joinedAt: new Date().toISOString(),
  };

  save(KEY.USERS, [...users, newUser]);
}

export function getAllUsers(): User[] {
  return load(KEY.USERS, INITIAL_USERS);
}

export function getUserById(id: string): User | undefined {
  return getAllUsers().find((u) => u.id === id);
}

export function getCurrentUser(): User {
  const users = getAllUsers();
  return users.find((u) => u.id === getCurrentUserId()) ?? users[0];
}

export function updateCurrentUser(updates: Partial<User>): User {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === getCurrentUserId());
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...updates };
    save(KEY.USERS, users);
    return users[idx];
  }
  return users[0];
}

// ─── Following ───────────────────────────────────────────────────────────────
export function getFollowing(): string[] {
  return load(KEY.FOLLOWING, []);
}

export function isFollowing(userId: string): boolean {
  return getFollowing().includes(userId);
}

export function toggleFollow(userId: string): boolean {
  const following = getFollowing();
  const users = getAllUsers();
  const targetIdx = users.findIndex((u) => u.id === userId);
  const meIdx = users.findIndex((u) => u.id === getCurrentUserId());

  if (following.includes(userId)) {
    save(KEY.FOLLOWING, following.filter((id) => id !== userId));
    if (targetIdx >= 0) users[targetIdx].followersCount = Math.max(0, users[targetIdx].followersCount - 1);
    if (meIdx >= 0) users[meIdx].followingCount = Math.max(0, users[meIdx].followingCount - 1);
    save(KEY.USERS, users);
    return false;
  } else {
    save(KEY.FOLLOWING, [...following, userId]);
    if (targetIdx >= 0) users[targetIdx].followersCount += 1;
    if (meIdx >= 0) users[meIdx].followingCount += 1;
    save(KEY.USERS, users);

    // Add notification
    const notif: Notification = {
      id: `notif-${Date.now()}`,
      type: 'follow',
      fromUserId: getCurrentUserId(),
      message: `${getCurrentUser().name}さんがあなたをフォローしました`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    addNotification(notif);
    return true;
  }
}

// ─── Posts ────────────────────────────────────────────────────────────────────
export function getAllPosts(): Post[] {
  return load(KEY.POSTS, INITIAL_POSTS);
}

export function getPostById(id: string): Post | undefined {
  return getAllPosts().find((p) => p.id === id);
}

export function getPostsByUser(userId: string): Post[] {
  return getAllPosts()
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// "友達"タブ: 自分とフォロー中のユーザーの投稿 (public + followers)
export function getFriendsPosts(categoryFilter?: string): Post[] {
  const following = getFollowing();
  const myId = getCurrentUserId();
  const allPosts = getAllPosts();

  const visible = allPosts.filter((p) => {
    if (p.userId === myId) return p.visibility !== 'private'; // 自分の投稿は private 以外を表示
    if (following.includes(p.userId)) return p.visibility !== 'private'; // フォロー中は followers/public を表示
    return false;
  });

  const filtered = categoryFilter && categoryFilter !== 'all'
    ? visible.filter((p) => p.category === categoryFilter)
    : visible;

  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// "すべての人"タブ: visibility が 'public' の投稿すべて
export function getPublicPosts(categoryFilter?: string): Post[] {
  const allPosts = getAllPosts();

  const visible = allPosts.filter((p) => p.visibility === 'public');

  const filtered = categoryFilter && categoryFilter !== 'all'
    ? visible.filter((p) => p.category === categoryFilter)
    : visible;

  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// 後方互換のため残す (内部利用)
export function getTimelinePosts(categoryFilter?: string): Post[] {
  return getFriendsPosts(categoryFilter);
}

export interface CreatePostResult {
  post: Post;
  isGoalAchieved: boolean;
  goalTitle?: string;
}

export function createPost(data: Omit<Post, 'id' | 'userId' | 'likesCount' | 'commentsCount' | 'createdAt'>): CreatePostResult {
  const posts = getAllPosts();
  const newPost: Post = {
    ...data,
    id: `post-${Date.now()}`,
    userId: getCurrentUserId(),
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date().toISOString(),
  };
  posts.unshift(newPost);
  save(KEY.POSTS, posts);

  // ── 今週の目標進捗の自動更新 & 達成判定 ──
  let isGoalAchieved = false;
  const currentGoal = getWeeklyGoal();
  const goalCat = currentGoal.category || '全体';

  if (!currentGoal.isCompleted && (goalCat === '全体' || goalCat === newPost.category)) {
    let increment = 1;
    if (currentGoal.targetType === 'minutes') {
      increment = newPost.studyMinutes || 30;
    }
    const newCurrent = (currentGoal.currentValue || 0) + increment;
    const isNowCompleted = newCurrent >= currentGoal.goalValue;

    updateWeeklyGoal({
      currentValue: newCurrent,
      isCompleted: isNowCompleted,
    });

    if (isNowCompleted) {
      isGoalAchieved = true;
    }
  }

  return { post: newPost, isGoalAchieved, goalTitle: currentGoal.title };
}


// ─── Likes ────────────────────────────────────────────────────────────────────
export function getLikedPosts(): string[] {
  return load(KEY.LIKED_POSTS, []);
}

export function isLiked(postId: string): boolean {
  return getLikedPosts().includes(postId);
}

export function toggleLike(postId: string): boolean {
  const liked = getLikedPosts();
  const posts = getAllPosts();
  const idx = posts.findIndex((p) => p.id === postId);

  if (liked.includes(postId)) {
    save(KEY.LIKED_POSTS, liked.filter((id) => id !== postId));
    if (idx >= 0) posts[idx].likesCount = Math.max(0, posts[idx].likesCount - 1);
    save(KEY.POSTS, posts);
    return false;
  } else {
    save(KEY.LIKED_POSTS, [...liked, postId]);
    if (idx >= 0) posts[idx].likesCount += 1;
    save(KEY.POSTS, posts);

    // Add notification if the post belongs to someone else
    const post = posts[idx];
    if (post && post.userId !== getCurrentUserId()) {
      const notif: Notification = {
        id: `notif-${Date.now()}`,
        type: 'like',
        fromUserId: getCurrentUserId(),
        postId,
        message: `${getCurrentUser().name}さんがあなたの投稿にいいねしました`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      addNotification(notif);
    }
    return true;
  }
}

// ─── Saved Posts ──────────────────────────────────────────────────────────────
export function getSavedPosts(): string[] {
  return load(KEY.SAVED_POSTS, []);
}

export function isSaved(postId: string): boolean {
  return getSavedPosts().includes(postId);
}

export function toggleSave(postId: string): boolean {
  const saved = getSavedPosts();
  if (saved.includes(postId)) {
    save(KEY.SAVED_POSTS, saved.filter((id) => id !== postId));
    return false;
  } else {
    save(KEY.SAVED_POSTS, [...saved, postId]);
    return true;
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────
export function getCommentsByPost(postId: string): Comment[] {
  return load<Comment[]>(KEY.COMMENTS, INITIAL_COMMENTS)
    .filter((c) => c.postId === postId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function addComment(postId: string, content: string): Comment {
  const comments = load<Comment[]>(KEY.COMMENTS, INITIAL_COMMENTS);
  const newComment: Comment = {
    id: `c-${Date.now()}`,
    postId,
    userId: getCurrentUserId(),
    content,
    createdAt: new Date().toISOString(),
  };
  comments.push(newComment);
  save(KEY.COMMENTS, comments);

  // Update count
  const posts = getAllPosts();
  const idx = posts.findIndex((p) => p.id === postId);
  if (idx >= 0) {
    posts[idx].commentsCount += 1;
    save(KEY.POSTS, posts);
  }

  // Add notification
  const post = getPostById(postId);
  if (post && post.userId !== getCurrentUserId()) {
    const notif: Notification = {
      id: `notif-${Date.now()}`,
      type: 'comment',
      fromUserId: getCurrentUserId(),
      postId,
      message: `${getCurrentUser().name}さんがあなたの投稿にコメントしました`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    addNotification(notif);
  }

  return newComment;
}

// ─── Communities ──────────────────────────────────────────────────────────────
export function getAllCommunities(): Community[] {
  return load(KEY.COMMUNITIES, INITIAL_COMMUNITIES);
}

export function createCommunity(data: Omit<Community, 'id' | 'memberCount'>): Community {
  const current = getAllCommunities();
  const newComm: Community = {
    ...data,
    id: `comm-${Date.now()}`,
    memberCount: 1,
  };
  const updated = [newComm, ...current];
  save(KEY.COMMUNITIES, updated);
  // 自動的に作成者を参加状態にする
  const joined = load<string[]>(KEY.JOINED_COMMUNITIES, []);
  if (!joined.includes(newComm.id)) {
    save(KEY.JOINED_COMMUNITIES, [newComm.id, ...joined]);
  }
  return newComm;
}

export function getJoinedCommunities(): string[] {
  return load(KEY.JOINED_COMMUNITIES, []);
}

export function isJoinedCommunity(communityId: string): boolean {
  return getJoinedCommunities().includes(communityId);
}


export function toggleJoinCommunity(communityId: string): boolean {
  const joined = getJoinedCommunities();
  const communities = getAllCommunities();
  const idx = communities.findIndex((c) => c.id === communityId);

  if (joined.includes(communityId)) {
    save(KEY.JOINED_COMMUNITIES, joined.filter((id) => id !== communityId));
    if (idx >= 0) communities[idx].memberCount = Math.max(0, communities[idx].memberCount - 1);
    save(KEY.COMMUNITIES, communities);
    return false;
  } else {
    save(KEY.JOINED_COMMUNITIES, [...joined, communityId]);
    if (idx >= 0) communities[idx].memberCount += 1;
    save(KEY.COMMUNITIES, communities);
    return true;
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
export function getNotifications(): Notification[] {
  return load<Notification[]>(KEY.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addNotification(notif: Notification): void {
  const notifs = getNotifications();
  notifs.unshift(notif);
  save(KEY.NOTIFICATIONS, notifs);
}

export function markAllNotificationsRead(): void {
  const notifs = getNotifications().map((n) => ({ ...n, read: true }));
  save(KEY.NOTIFICATIONS, notifs);
}

export function getUnreadCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export function getUserStats(userId: string) {
  const posts = getPostsByUser(userId);
  const esPosts = posts.filter((p) => p.category === 'ES');
  const interviewPosts = posts.filter((p) => p.category === '面接');
  const spiPosts = posts.filter((p) => p.category === 'SPI');
  const obPosts = posts.filter((p) => p.category === 'OB訪問');
  const internPosts = posts.filter((p) => p.category === 'インターン');

  const spiMinutes = spiPosts.reduce((acc, p) => acc + (p.studyMinutes ?? 0), 0);

  // Consecutive days (simple calculation)
  const dates = posts
    .map((p) => new Date(p.createdAt).toDateString())
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort();

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (dates.includes(d.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return {
    totalPosts: posts.length,
    esCount: esPosts.length,
    interviewCount: interviewPosts.length,
    spiMinutes,
    obCount: obPosts.length,
    internCount: internPosts.length,
    streakDays: streak,
  };
}

// ─── Search ───────────────────────────────────────────────────────────────────
export function searchAll(query: string) {
  const q = query.toLowerCase();
  const posts = getAllPosts().filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.company?.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );

  const users = getAllUsers().filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.handle.toLowerCase().includes(q) ||
      u.university.toLowerCase().includes(q)
  );

  const communities = getAllCommunities().filter(
    (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  );

  return { posts, users, communities };
}

// ─── Countdowns ──────────────────────────────────────────────────────────────
export function getCountdowns(): CountdownEvent[] {
  return load(KEY.COUNTDOWNS, INITIAL_COUNTDOWNS);
}

export function addCountdown(event: Omit<CountdownEvent, 'id'>): CountdownEvent[] {
  const current = getCountdowns();
  const newEv: CountdownEvent = {
    ...event,
    id: `cd-${Date.now()}`,
  };
  const updated = [...current, newEv];
  save(KEY.COUNTDOWNS, updated);
  checkAndGenerateReminderNotifications();
  return updated;
}

export function deleteCountdown(id: string): CountdownEvent[] {
  const current = getCountdowns();
  const updated = current.filter((c) => c.id !== id);
  save(KEY.COUNTDOWNS, updated);
  return updated;
}

// ─── 3日前・前日の自動リマインド通知のチェック＆生成 ─────────────────────
export function checkAndGenerateReminderNotifications(): Notification[] {
  const countdowns = getCountdowns();
  const notifications = load<Notification[]>(KEY.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let updated = false;

  countdowns.forEach((ev) => {
    const target = new Date(ev.targetDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 3 || diffDays === 1 || diffDays === 0) {
      const notifId = `reminder-${ev.id}-${diffDays}d`;
      const exists = notifications.some((n) => n.id === notifId);

      if (!exists) {
        let msg = '';
        if (diffDays === 3) {
          msg = `【3日前リマインド】『${ev.title}』まであと3日です！提出や準備を進めましょう。`;
        } else if (diffDays === 1) {
          msg = `【前日リマインド】明日『${ev.title}』の実施・締切日です！時間と場所を確認してください。`;
        } else if (diffDays === 0) {
          msg = `【本日リマインド】本日『${ev.title}』の締切・面接当日です！ファイト！`;
        }

        const newNotif: Notification = {
          id: notifId,
          type: 'reminder',
          fromUserId: 'system',
          message: msg,
          createdAt: new Date().toISOString(),
          read: false,
        };
        notifications.unshift(newNotif);
        updated = true;
      }
    }
  });

  if (updated) {
    save(KEY.NOTIFICATIONS, notifications);
  }
  return notifications;
}

// ─── Weekly Goal ─────────────────────────────────────────────────────────────
export function getWeeklyGoal(): WeeklyGoal {
  return load(KEY.WEEKLY_GOAL, INITIAL_WEEKLY_GOAL);
}

export function updateWeeklyGoal(goal: Partial<WeeklyGoal>): WeeklyGoal {
  const current = getWeeklyGoal();
  const updated = { ...current, ...goal };
  save(KEY.WEEKLY_GOAL, updated);
  return updated;
}

// ─── Badges ──────────────────────────────────────────────────────────────────
export function getBadges(): AchievementBadge[] {
  return load(KEY.BADGES, INITIAL_BADGES);
}

// ─── Community Messages ──────────────────────────────────────────────────────
export function getCommunityMessages(communityId: string): CommunityMessage[] {
  const all = load<CommunityMessage[]>(KEY.COMMUNITY_MESSAGES, INITIAL_COMMUNITY_MESSAGES);
  return all
    .filter((m) => m.communityId === communityId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function addCommunityMessage(communityId: string, content: string): CommunityMessage {
  const all = load<CommunityMessage[]>(KEY.COMMUNITY_MESSAGES, INITIAL_COMMUNITY_MESSAGES);
  const newMsg: CommunityMessage = {
    id: `cm-${Date.now()}`,
    communityId,
    userId: getCurrentUserId(),
    content,
    createdAt: new Date().toISOString(),
  };
  all.push(newMsg);
  save(KEY.COMMUNITY_MESSAGES, all);
  return newMsg;
}


