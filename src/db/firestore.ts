import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Category } from './mockData';

export interface UserProfile {
  id: string;
  name: string; // ニックネーム
  email: string;
  university: string;
  grade: string;
  avatar: string;
  targetIndustry?: string; // 志望業界
  bio?: string;           // 自己紹介・目標メモ
  profileVisibility?: 'public' | 'followers' | 'private'; // 全体公開 | 友達だけ | 個人だけ
  followersCount: number;
  followingCount: number;
  joinedAt: Date;
}

export interface FirestorePost {
  id?: string;
  userId: string;
  category: Category;
  company?: string;
  title: string;
  content: string;
  tags: string[];
  studyMinutes?: number;
  imageUrl?: string;
  date?: string; // YYYY-MM-DD
  visibility?: 'public' | 'followers' | 'private'; // 公開範囲
  likesCount: number;
  commentsCount: number;
  likedUserIds?: string[]; // いいねしたユーザーのID配列
  createdAt: Timestamp | Date;
}

export interface FirestoreComment {
  id?: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: Timestamp | Date;
}

// ─── Follow Request ──────────────────────────────────────────────────────────
export interface FirestoreFollowRequest {
  id?: string;
  fromUid: string;
  toUid: string;
  fromName?: string;
  fromAvatar?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp | Date;
}

/** フォローリクエストを送信する */
export async function sendFollowRequest(
  fromUid: string,
  toUid: string,
  fromName?: string,
  fromAvatar?: string,
): Promise<{ directlyFollowed: boolean; error?: string }> {
  if (fromUid === toUid) return { directlyFollowed: false };

  // 送信者の名前・アバターをFirestoreのユーザー文書から直接取得
  let senderName = fromName;
  let senderAvatar = fromAvatar;

  try {
    const senderSnap = await getDoc(doc(db, 'users', fromUid));
    if (senderSnap.exists()) {
      const data = senderSnap.data();
      if (data.name) senderName = data.name;
      if (data.avatar) senderAvatar = data.avatar;
    }
  } catch (e) {
    console.warn('Failed to fetch sender profile:', e);
  }

  // 相手の公開設定（profileVisibility）を確認する
  let targetVisibility: 'public' | 'followers' | 'private' = 'public';
  try {
    const targetSnap = await getDoc(doc(db, 'users', toUid));
    if (targetSnap.exists()) {
      const targetData = targetSnap.data();
      targetVisibility = targetData.profileVisibility || 'public';
    }
  } catch (e) {
    console.warn('Failed to fetch target user profile visibility:', e);
  }

  // A. 公開アカウントの場合：リクエストを送らず直接フォロー完了！
  if (targetVisibility === 'public') {
    try {
      // 1. サブコレクションにフォロー情報を登録
      await setDoc(doc(db, `users/${fromUid}/following`, toUid), { createdAt: serverTimestamp() });
      await setDoc(doc(db, `users/${toUid}/followers`, fromUid), { createdAt: serverTimestamp() });

      // 2. トップレベルの follows コレクションに登録
      const followId = `${fromUid}_${toUid}`;
      await setDoc(doc(db, 'follows', followId), {
        followerId: fromUid,
        followingId: toUid,
        createdAt: serverTimestamp(),
      });

      // 3. フォロー・フォロワー数のカウントアップ
      await updateDoc(doc(db, 'users', toUid), { followersCount: increment(1) });
      await updateDoc(doc(db, 'users', fromUid), { followingCount: increment(1) });

      // 4. 相手へのフォロー完了通知を送信
      await createFirestoreNotification({
        userId: toUid,
        fromUid: fromUid,
        fromName: senderName || 'ユーザー',
        fromAvatar: senderAvatar || '',
        type: 'follow_accept',
        content: 'あなたをフォローしました',
      });

      return { directlyFollowed: true };
    } catch (e) {
      console.error('Direct follow failed, falling back to follow request:', e);
      return { directlyFollowed: false, error: (e as Error).message };
    }
  }

  // B. 鍵垢（followers / private）の場合：従来通り承認待ちリクエストを送信
  const reqData = {
    fromUid,
    toUid,
    fromName: senderName || 'ユーザー',
    fromAvatar: senderAvatar || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  // 1. サブコレクション: users/{toUid}/followRequests/{fromUid}
  try {
    await setDoc(doc(db, `users/${toUid}/followRequests`, fromUid), reqData, { merge: true });
  } catch (e) {
    console.warn('Subcollection followRequest set failed:', e);
  }

  // 2. トップレベル: followRequests コレクション
  try {
    const existing = query(
      collection(db, 'followRequests'),
      where('fromUid', '==', fromUid),
      where('toUid', '==', toUid),
      where('status', '==', 'pending'),
    );
    const snap = await getDocs(existing);
    if (snap.empty) {
      await addDoc(collection(db, 'followRequests'), reqData);
    }
  } catch (e) {
    console.warn('Top level followRequest add failed:', e);
  }

  return { directlyFollowed: false };
}

/** 自分宛の未承認フォローリクエストをリアルタイム購読 */
export function subscribeToFollowRequests(
  myUid: string,
  callback: (requests: FirestoreFollowRequest[]) => void,
) {
  // サブコレクション users/{myUid}/followRequests を最優先購読
  const subRef = collection(db, `users/${myUid}/followRequests`);
  return onSnapshot(subRef, (snapshot) => {
    const requests = snapshot.docs
      .map((d) => ({
        ...d.data(),
        id: d.id,
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
      }) as FirestoreFollowRequest)
      .filter((r) => r.status === 'pending');
    callback(requests);
  }, (err) => {
    console.warn('Subcollection followRequests snapshot error, fallback to top-level:', err);
    const q = query(
      collection(db, 'followRequests'),
      where('toUid', '==', myUid),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
      })) as FirestoreFollowRequest[];
      callback(requests);
    });
  });
}

/** フォローリクエストが送信済みか確認 */
export async function hasPendingFollowRequest(fromUid: string, toUid: string): Promise<boolean> {
  if (!fromUid || !toUid) return false;
  try {
    const subSnap = await getDoc(doc(db, `users/${toUid}/followRequests`, fromUid));
    if (subSnap.exists() && subSnap.data().status === 'pending') return true;
  } catch (e) {}

  try {
    const q = query(
      collection(db, 'followRequests'),
      where('fromUid', '==', fromUid),
      where('toUid', '==', toUid),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (e) {
    return false;
  }
}

/** フォローリクエストを承認する */
export async function approveFollowRequest(
  requestId: string,
  fromUid: string,
  toUid: string,
): Promise<void> {
  // 1. users/{toUid}/followRequests/{fromUid} と followRequests/{requestId} を削除/acceptedへ
  try {
    await deleteDoc(doc(db, `users/${toUid}/followRequests`, fromUid));
  } catch (e) {}
  try {
    await updateDoc(doc(db, 'followRequests', requestId), { status: 'accepted' });
  } catch (e) {}

  // 2. サブコレクション: users/{fromUid}/following/{toUid} & users/{toUid}/followers/{fromUid}
  try {
    await setDoc(doc(db, `users/${fromUid}/following`, toUid), { createdAt: serverTimestamp() });
    await setDoc(doc(db, `users/${toUid}/followers`, fromUid), { createdAt: serverTimestamp() });
  } catch (e) {
    console.warn('Failed to set subcollection follow docs:', e);
  }

  // 3. トップレベル: follows/{fromUid}_{toUid}
  const followId = `${fromUid}_${toUid}`;
  try {
    await setDoc(doc(db, 'follows', followId), {
      followerId: fromUid,
      followingId: toUid,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Failed to set follows doc:', e);
  }

  // 4. フォロワー数/フォロー中数の更新
  try {
    await updateDoc(doc(db, 'users', toUid), { followersCount: increment(1) });
    await updateDoc(doc(db, 'users', fromUid), { followingCount: increment(1) });
  } catch (e) {}

  // 5. 申請元ユーザーへ承認通知を送る
  try {
    const approverSnap = await getDoc(doc(db, 'users', toUid));
    const approverName = approverSnap.exists() ? approverSnap.data().name : 'ユーザー';
    const approverAvatar = approverSnap.exists() ? approverSnap.data().avatar : '';
    await createFirestoreNotification({
      userId: fromUid,
      fromUid: toUid,
      fromName: approverName,
      fromAvatar: approverAvatar,
      type: 'follow_accept',
      content: 'フォローリクエストが承認されました！',
    });
  } catch (e) {}
}

/** フォローリクエストを拒否する */
export async function rejectFollowRequest(requestId: string, fromUid?: string, toUid?: string): Promise<void> {
  if (toUid && fromUid) {
    try {
      await deleteDoc(doc(db, `users/${toUid}/followRequests`, fromUid));
    } catch (e) {}
  }
  try {
    await updateDoc(doc(db, 'followRequests', requestId), { status: 'rejected' });
  } catch (e) {}
}

/** 自分が特定ユーザーをフォロー済みか確認 */
export async function isFollowingFirestore(
  myUid: string,
  targetUid: string,
): Promise<boolean> {
  if (!myUid || !targetUid) return false;
  try {
    const subSnap = await getDoc(doc(db, `users/${myUid}/following`, targetUid));
    if (subSnap.exists()) return true;
  } catch (e) {}

  const followId = `${myUid}_${targetUid}`;
  const snap = await getDoc(doc(db, 'follows', followId));
  return snap.exists();
}

/** 自分が特定ユーザーをフォロー済みかリアルタイム監視 */
export function subscribeToFollowingState(
  myUid: string,
  targetUid: string,
  callback: (isFollowing: boolean) => void
) {
  if (!myUid || !targetUid) {
    callback(false);
    return () => {};
  }
  
  const followId = `${myUid}_${targetUid}`;
  return onSnapshot(doc(db, 'follows', followId), (snap) => {
    callback(snap.exists());
  }, (err) => {
    console.warn('Failed to subscribe following state:', err);
    callback(false);
  });
}

/** 特定ユーザーへの未承認フォローリクエストがあるかリアルタイム監視 */
export function subscribeToFollowRequestState(
  fromUid: string,
  toUid: string,
  callback: (isPending: boolean) => void
) {
  if (!fromUid || !toUid) {
    callback(false);
    return () => {};
  }

  return onSnapshot(doc(db, `users/${toUid}/followRequests`, fromUid), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback(data.status === 'pending');
    } else {
      callback(false);
    }
  }, (err) => {
    console.warn('Failed to subscribe follow request state:', err);
    callback(false);
  });
}

/** フォロー解除 */
export async function unfollowUser(
  myUid: string,
  targetUid: string,
): Promise<void> {
  // 1. サブコレクション削除
  try {
    await deleteDoc(doc(db, `users/${myUid}/following`, targetUid));
    await deleteDoc(doc(db, `users/${targetUid}/followers`, myUid));
  } catch (e) {}

  // 2. トップレベル削除
  const followId = `${myUid}_${targetUid}`;
  try {
    await deleteDoc(doc(db, 'follows', followId));
  } catch (e) {}

  // 3. カウント更新
  try {
    await updateDoc(doc(db, 'users', targetUid), { followersCount: increment(-1) });
    await updateDoc(doc(db, 'users', myUid), { followingCount: increment(-1) });
  } catch (e) {}
}

/** 自分がフォロー中のユーザーID一覧をリアルタイム購読 */
export function subscribeToFollowingUids(
  myUid: string,
  callback: (followingUids: string[]) => void,
) {
  const subRef = collection(db, `users/${myUid}/following`);
  return onSnapshot(subRef, (snapshot) => {
    const uids = snapshot.docs.map((d) => d.id);
    callback(uids);
  }, (err) => {
    const q = query(collection(db, 'follows'), where('followerId', '==', myUid));
    return onSnapshot(q, (snapshot) => {
      const uids = snapshot.docs.map((d) => d.data().followingId as string);
      callback(uids);
    });
  });
}

/** ユーザー検索 (Firestore実データ) */
export async function searchUsersFirestore(queryText: string): Promise<UserProfile[]> {
  if (!queryText.trim()) return [];
  const q = query(collection(db, 'users'));
  const snap = await getDocs(q);
  const lower = queryText.toLowerCase();
  return snap.docs
    .map((d) => ({ ...d.data(), id: d.id } as UserProfile))
    .filter((u) => {
      const name = (u.name || '').toLowerCase();
      const univ = (u.university || '').toLowerCase();
      const grade = (u.grade || '').toLowerCase();
      const industry = (u.targetIndustry || '').toLowerCase();
      return name.includes(lower) || univ.includes(lower) || grade.includes(lower) || industry.includes(lower);
    });
}

// ─── Firestore Notifications ──────────────────────────────────────────────────
export interface FirestoreNotificationData {
  id?: string;
  userId: string; // 通知受け取りユーザー
  fromUid: string;
  fromName: string;
  fromAvatar?: string;
  type: 'like' | 'comment' | 'follow_accept' | 'follow_request';
  postId?: string;
  content?: string;
  read: boolean;
  createdAt: Timestamp | Date;
}

export async function createFirestoreNotification(data: Omit<FirestoreNotificationData, 'id' | 'read' | 'createdAt'>) {
  if (data.userId === data.fromUid) return; // 自分のアクションなら通知しない
  const ref = collection(db, `users/${data.userId}/notifications`);
  await addDoc(ref, {
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: FirestoreNotificationData[]) => void,
) {
  const q = query(
    collection(db, `users/${userId}/notifications`),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      createdAt: d.data().createdAt?.toDate?.() || new Date(),
    })) as FirestoreNotificationData[];
    callback(list);
  });
}

export async function markNotificationReadFirestore(userId: string, notificationId: string) {
  const ref = doc(db, `users/${userId}/notifications`, notificationId);
  await updateDoc(ref, { read: true, isRead: true });
}

export async function markAllNotificationsReadFirestore(userId: string) {
  const ref = collection(db, `users/${userId}/notifications`);
  const snap = await getDocs(ref);
  const batch = writeBatch(db);
  let count = 0;
  snap.docs.forEach((d) => {
    const data = d.data();
    if (!data.read || data.isRead === false) {
      batch.update(d.ref, { read: true, isRead: true });
      count++;
    }
  });
  if (count > 0) {
    await batch.commit();
  }
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export async function createUserProfile(uid: string, data: Partial<UserProfile>) {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    ...data,
    joinedAt: serverTimestamp(),
    followersCount: 0,
    followingCount: 0,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + uid, // デフォルトアバター
  }, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    const data = snap.data();
    return {
      ...data,
      id: snap.id,
      joinedAt: data.joinedAt?.toDate() || new Date(),
    } as UserProfile;
  }
  return null;
}

export function subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback({
        ...data,
        id: snap.id,
        joinedAt: data.joinedAt?.toDate() || new Date(),
      } as UserProfile);
    } else {
      callback(null);
    }
  });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, data, { merge: true });
}

// ─── Local Backup Storage ───────────────────────────────────────────────────
const LOCAL_POSTS_KEY = 'career_log_local_posts_v2';

export function getLocalPosts(): FirestorePost[] {
  try {
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((p: Record<string, unknown>) => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt as string) : new Date(),
    }));
  } catch (e) {
    return [];
  }
}

export function notifyDataUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('career_log_data_updated'));
  }
}

export function saveLocalPost(post: FirestorePost) {
  try {
    const existing = getLocalPosts();
    const updated = [post, ...existing.filter((p) => p.id !== post.id)];
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(updated));
    notifyDataUpdated();
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
}

// ─── Posts ────────────────────────────────────────────────────────────────────
export async function createPost(postData: Omit<FirestorePost, 'id' | 'createdAt' | 'likesCount' | 'commentsCount'>) {
  const postsRef = collection(db, 'posts');
  const cleanData: Record<string, unknown> = {
    likesCount: 0,
    commentsCount: 0,
    likedUserIds: [],
    createdAt: serverTimestamp(),
  };

  Object.entries(postData).forEach(([key, val]) => {
    if (val !== undefined) {
      cleanData[key] = val;
    }
  });

  await addDoc(postsRef, cleanData);
  notifyDataUpdated();
}

function getMillis(dateVal: Timestamp | Date | string | number | { toDate?: () => Date; seconds?: number } | null | undefined): number {
  if (!dateVal) return 0;
  if (dateVal instanceof Date) return dateVal.getTime();
  if (typeof dateVal === 'object' && 'toDate' in dateVal && typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
  if (typeof dateVal === 'object' && 'seconds' in dateVal && typeof dateVal.seconds === 'number') return dateVal.seconds * 1000;
  return new Date(dateVal as string | number).getTime() || 0;
}

// Firestoreの 'in' フィルタは一度に指定できる値の数に上限があるため、分割して複数クエリにする
const FIRESTORE_IN_LIMIT = 30;
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function mapPostSnapshot(snapshot: import('firebase/firestore').QuerySnapshot): FirestorePost[] {
  return snapshot.docs.map(doc => {
    const data = doc.data();
    const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    return { ...data, id: doc.id, createdAt: date };
  }) as FirestorePost[];
}

export function subscribeToTimelinePosts(
  currentUserId: string | undefined,
  // 実際にフォロー中のユーザーIDリスト。'followers'限定投稿はこのリストに含まれる
  // ユーザーのものだけをクエリする（セキュリティルールがフォロー関係を検証するため、
  // フォローしていないユーザーの'followers'投稿を含む幅広いクエリは拒否される）
  followingUids: string[],
  callback: (posts: FirestorePost[]) => void
) {
  const postsCollection = collection(db, 'posts');
  const unsubscribes: (() => void)[] = [];
  const resultsMap = new Map<string, FirestorePost[]>();

  const triggerMerge = () => {
    const allPostsMap = new Map<string, FirestorePost>();
    resultsMap.forEach((postsList) => {
      postsList.forEach((p) => { if (p.id) allPostsMap.set(p.id, p); });
    });
    const merged = Array.from(allPostsMap.values()).sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
    callback(merged);
  };

  // 1. 全体公開 (public)
  const qPublic = query(postsCollection, where('visibility', '==', 'public'));
  const unsubPublic = onSnapshot(qPublic, (snapshot) => {
    resultsMap.set('public', mapPostSnapshot(snapshot));
    triggerMerge();
  }, (err) => {
    console.warn('subscribeToTimelinePosts public error:', err);
    resultsMap.set('public', []);
    triggerMerge();
  });
  unsubscribes.push(unsubPublic);

  if (currentUserId) {
    // 2. 自分の全投稿
    const qMine = query(postsCollection, where('userId', '==', currentUserId));
    const unsubMine = onSnapshot(qMine, (snapshot) => {
      resultsMap.set('mine', mapPostSnapshot(snapshot));
      triggerMerge();
    }, (err) => {
      console.warn('subscribeToTimelinePosts mine error:', err);
      resultsMap.set('mine', []);
      triggerMerge();
    });
    unsubscribes.push(unsubMine);

    // 3. フォロー中ユーザーの「友達限定 (followers)」投稿
    // 自分が実際にフォローしているユーザーIDだけに絞ってクエリする
    const followedOnly = followingUids.filter((uid) => uid && uid !== currentUserId);
    const chunks = chunkArray(followedOnly, FIRESTORE_IN_LIMIT);
    chunks.forEach((chunk, idx) => {
      if (chunk.length === 0) return;
      const key = `followers-${idx}`;
      const qFollowers = query(
        postsCollection,
        where('userId', 'in', chunk),
        where('visibility', '==', 'followers')
      );
      const unsub = onSnapshot(qFollowers, (snapshot) => {
        resultsMap.set(key, mapPostSnapshot(snapshot));
        triggerMerge();
      }, (err) => {
        console.warn(`subscribeToTimelinePosts followers[${idx}] error:`, err);
        resultsMap.set(key, []);
        triggerMerge();
      });
      unsubscribes.push(unsub);
    });
  }

  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
}

export function formatFirestoreDateLocal(date: Timestamp | Date | string | number | { toDate?: () => Date } | null | undefined): string {
  try {
    if (!date) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    const d = date instanceof Date 
      ? date 
      : (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function' ? date.toDate() : new Date(date as string | number));
    if (isNaN(d.getTime())) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    console.warn('formatFirestoreDateLocal error:', e);
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}

export function getPostDateStr(post: { date?: string; createdAt?: Timestamp | Date | string | number | { toDate?: () => Date } | null }): string {
  if (post.date && /^\d{4}-\d{2}-\d{2}$/.test(post.date)) {
    return post.date;
  }
  return formatFirestoreDateLocal(post.createdAt);
}

export function subscribeToUserPosts(
  userId: string,
  currentUserId: string | undefined,
  isFollowingFriend: boolean,
  callback: (posts: FirestorePost[]) => void
) {
  const postsCollection = collection(db, 'posts');

  const isSelf = !userId || userId === currentUserId || userId === 'user-me' || (!!currentUserId && userId === currentUserId);

  // A. 自分の投稿を取得する場合：
  // orderBy を使わない（serverTimestamp() 確定前のドキュメントが除外されるのを防ぐ）
  // ソートは JS 側で行い、記録直後に即座に即時集計されるようにする
  if (isSelf) {
    const targetUid = userId === 'user-me' ? (currentUserId || 'user-me') : userId;
    const q = query(postsCollection, where('userId', '==', targetUid));
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        return { ...data, id: doc.id, createdAt: date };
      }) as FirestorePost[];
      const sorted = posts.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
      callback(sorted);
    }, (err) => {
      console.warn('Firestore user posts subscribe error:', err);
      callback([]);
    });
  }

  // B. お友達（フォロー承認済み）の投稿を取得する場合：
  // セキュリティルール（visibility の一致）を完全に満たしつつ、複合インデックス未作成エラーを回避するため、
  // orderBy を排除した等価(==)サブクエリに分解して並列購読し、フロントエンド側で結合・ソートする
  if (isFollowingFriend) {
    const unsubscribes: (() => void)[] = [];
    const resultsMap = new Map<string, FirestorePost[]>();

    const triggerMerge = () => {
      const allPostsMap = new Map<string, FirestorePost>();
      resultsMap.forEach((postsList) => {
        postsList.forEach((p) => { if (p.id) allPostsMap.set(p.id, p); });
      });
      const merged = Array.from(allPostsMap.values()).sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
      callback(merged);
    };

    const runSubQuery = (key: string, queryObj: import('firebase/firestore').Query) => {
      const unsub = onSnapshot(queryObj, (snapshot: import('firebase/firestore').QuerySnapshot) => {
        const posts = snapshot.docs.map(doc => {
          const data = doc.data();
          const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          return { ...data, id: doc.id, createdAt: date };
        }) as FirestorePost[];
        resultsMap.set(key, posts);
        triggerMerge();
      }, (err: Error) => {
        console.warn(`Firestore user posts sub-query (${key}) error:`, err);
        resultsMap.set(key, []);
        triggerMerge();
      });
      unsubscribes.push(unsub);
    };

    // orderBy を外すことで、複合インデックスの作成が不要になる
    const qPublic = query(postsCollection, where('userId', '==', userId), where('visibility', '==', 'public'));
    const qNull = query(postsCollection, where('userId', '==', userId), where('visibility', '==', null));
    const qFollowers = query(postsCollection, where('userId', '==', userId), where('visibility', '==', 'followers'));

    runSubQuery('public', qPublic);
    runSubQuery('null', qNull);
    runSubQuery('followers', qFollowers);

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }

  // C. まだフォローしていない他人の場合：
  // セキュリティ保護のため何も取得しない
  callback([]);
  return () => {};
}

export async function toggleLikePost(postId: string, userId: string, currentlyLiked: boolean) {
  // local-post はローカルストレージ側のデータのため Firestore 操作をスキップ
  if (postId.startsWith('local-post-')) return;

  const postRef = doc(db, 'posts', postId);
  if (currentlyLiked) {
    // arrayRemove を使うことで競合状態を防ぐ（getDoc 不要）
    await updateDoc(postRef, {
      likedUserIds: arrayRemove(userId),
      likesCount: increment(-1),
    });
  } else {
    await updateDoc(postRef, {
      likedUserIds: arrayUnion(userId),
      likesCount: increment(1),
    });

    // 投稿者へいいね通知を送る
    try {
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postData = postSnap.data();
        const postAuthorId = postData.userId;
        const likerSnap = await getDoc(doc(db, 'users', userId));
        const likerName = likerSnap.exists() ? likerSnap.data().name : 'ユーザー';
        const likerAvatar = likerSnap.exists() ? likerSnap.data().avatar : '';

        await createFirestoreNotification({
          userId: postAuthorId,
          fromUid: userId,
          fromName: likerName,
          fromAvatar: likerAvatar,
          type: 'like',
          postId: postId,
          content: 'あなたの投稿にいいねしました',
        });
      }
    } catch (err) {
      console.warn('Failed to send like notification:', err);
    }
  }
}

export async function deletePost(postId: string) {
  // 1. ローカルストレージから削除
  try {
    const existing = getLocalPosts();
    const updated = existing.filter((p) => p.id !== postId);
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(updated));
    notifyDataUpdated();
  } catch (e) {
    console.error('Failed to delete from local storage', e);
  }

  // 2. Firestoreから削除
  if (!postId.startsWith('local-post-')) {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (e) {
      console.warn('Failed to delete post from Firestore:', e);
    }
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────
export async function addComment(postId: string, userId: string, content: string) {
  const commentsRef = collection(db, `posts/${postId}/comments`);
  await addDoc(commentsRef, {
    postId,
    userId,
    content,
    createdAt: serverTimestamp(),
  });

  // 投稿のコメント数を増やす
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, {
    commentsCount: increment(1)
  });

  // 投稿者へコメント通知を送る
  try {
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      const postData = postSnap.data();
      const postAuthorId = postData.userId;
      const commenterSnap = await getDoc(doc(db, 'users', userId));
      const commenterName = commenterSnap.exists() ? commenterSnap.data().name : 'ユーザー';
      const commenterAvatar = commenterSnap.exists() ? commenterSnap.data().avatar : '';

      await createFirestoreNotification({
        userId: postAuthorId,
        fromUid: userId,
        fromName: commenterName,
        fromAvatar: commenterAvatar,
        type: 'comment',
        postId: postId,
        content: `コメント: 「${content.slice(0, 30)}${content.length > 30 ? '...' : ''}」`,
      });
    }
  } catch (err) {
    console.warn('Failed to send comment notification:', err);
  }
}

export function subscribeToComments(postId: string, callback: (comments: FirestoreComment[]) => void) {
  const colRef = collection(db, `posts/${postId}/comments`);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const comments = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        let createdAtDate = new Date();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdAtDate = data.createdAt.toDate();
        } else if (data.createdAt instanceof Date) {
          createdAtDate = data.createdAt;
        }
        return {
          ...data,
          id: docSnap.id,
          createdAt: createdAtDate,
        } as FirestoreComment;
      });

      const getTimeMs = (val: Timestamp | Date | string | number | { toDate?: () => Date } | null | undefined) => {
        if (!val) return 0;
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'object' && 'toDate' in val && typeof val.toDate === 'function') return val.toDate().getTime();
        return new Date(val as string | number).getTime() || 0;
      };

      // JS側で作成日時順（昇順）にソート
      comments.sort((a, b) => getTimeMs(a.createdAt) - getTimeMs(b.createdAt));

      callback(comments);
    },
    (err) => {
      console.warn('Failed to subscribe comments:', err);
      callback([]);
    }
  );
}

export async function deleteNotificationFirestore(userId: string, notifId: string) {
  try {
    const ref = doc(db, 'users', userId, 'notifications', notifId);
    await deleteDoc(ref);
    notifyDataUpdated();
  } catch (err) {
    console.warn('deleteNotificationFirestore error:', err);
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
// FirestoreのTimestamp型を文字列に変換（UI表示用）
export function formatFirestoreDate(date: Timestamp | Date | string | number | { toDate?: () => Date } | null | undefined): string {
  if (!date) return '';
  try {
    const d = date instanceof Date 
      ? date 
      : (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function' ? date.toDate() : new Date(date as string | number));
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch (e) {
    console.warn('formatFirestoreDate error:', e);
    return '';
  }
}



// ─── Calendar Events ──────────────────────────────────────────────────────────
export interface FirestoreCalendarEvent {
  id?: string;
  userId: string;
  title: string;
  company?: string;
  date: string;       // 開始日 'YYYY-MM-DD'
  endDate?: string;    // 終了日 'YYYY-MM-DD'
  time?: string;      // 開始時間 'HH:mm'
  endTime?: string;   // 終了時間 'HH:mm'
  category: string;
  priority?: 'high' | 'medium' | 'low';
  location?: string;
  url?: string;
  memo?: string;
  isAllDay?: boolean;
  alarm?: string;
  step?: string;
  completed?: boolean; // 完了マーク
  createdAt: Timestamp | Date;
}

const LOCAL_CALENDAR_EVENTS_KEY = 'career_log_local_calendar_events_v1';

function getLocalCalendarEvents(): FirestoreCalendarEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_CALENDAR_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalCalendarEvents(events: FirestoreCalendarEvent[]) {
  try {
    localStorage.setItem(LOCAL_CALENDAR_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn('Failed to save local calendar events:', e);
  }
}

export async function addCalendarEvent(userId: string, event: Omit<FirestoreCalendarEvent, 'id' | 'userId' | 'createdAt'>) {
  const effectiveUid = userId || 'user-me';
  const newId = 'cal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newEvent: FirestoreCalendarEvent = {
    ...event,
    id: newId,
    userId: effectiveUid,
    createdAt: new Date(),
  };

  // 1. ローカルストレージに即時保存 (100%成功保証)
  const locals = getLocalCalendarEvents();
  locals.push(newEvent);
  saveLocalCalendarEvents(locals);
  notifyDataUpdated();

  // 2. Firestoreに保存
  try {
    const ref = collection(db, 'calendarEvents');
    await addDoc(ref, {
      ...event,
      userId: effectiveUid,
      createdAt: serverTimestamp(),
    });
    notifyDataUpdated();
  } catch (err) {
    console.warn('addCalendarEvent Firestore notice (saved locally):', err);
  }
}

export async function deleteCalendarEvent(eventId: string) {
  // 1. ローカルストレージから削除
  const locals = getLocalCalendarEvents().filter(e => e.id !== eventId);
  saveLocalCalendarEvents(locals);
  notifyDataUpdated();

  // 2. Firestoreから削除
  try {
    if (!eventId.startsWith('cal_')) {
      await deleteDoc(doc(db, 'calendarEvents', eventId));
    }
    notifyDataUpdated();
  } catch (err) {
    console.warn('deleteCalendarEvent Firestore error:', err);
  }
}

export async function updateCalendarEvent(eventId: string, updatedData: Partial<FirestoreCalendarEvent>) {
  // 1. ローカルストレージ内のデータを更新
  const locals = getLocalCalendarEvents();
  const index = locals.findIndex(e => e.id === eventId);
  if (index !== -1) {
    locals[index] = { ...locals[index], ...updatedData };
    saveLocalCalendarEvents(locals);
  }
  notifyDataUpdated();

  // 2. Firestore内のデータを更新
  try {
    if (!eventId.startsWith('cal_')) {
      const ref = doc(db, 'calendarEvents', eventId);
      await updateDoc(ref, updatedData);
    }
    notifyDataUpdated();
  } catch (err) {
    console.warn('updateCalendarEvent Firestore notice:', err);
  }
}

export function subscribeToCalendarEvents(userId: string, callback: (events: FirestoreCalendarEvent[]) => void) {
  const effectiveUid = userId || 'user-me';
  const q = query(
    collection(db, 'calendarEvents'),
    where('userId', '==', effectiveUid)
  );

  return onSnapshot(q, (snapshot) => {
    const fsEvents = snapshot.docs.map(d => ({
      ...d.data(),
      id: d.id,
      createdAt: d.data().createdAt?.toDate() || new Date(),
    })) as FirestoreCalendarEvent[];

    const locals = getLocalCalendarEvents();
    const map = new Map<string, FirestoreCalendarEvent>();
    locals.forEach(e => map.set(e.id || (e.title + e.date), e));
    fsEvents.forEach(e => map.set(e.id || (e.title + e.date), e));

    const merged = Array.from(map.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
    callback(merged);
  }, (err) => {
    console.warn('subscribeToCalendarEvents fallback to local:', err);
    const locals = getLocalCalendarEvents();
    callback(locals);
  });
}

// ─── Weekly Goals ────────────────────────────────────────────────────────────
export interface FirestoreWeeklyGoal {
  id?: string;
  userId: string;
  targetCategory: string;
  targetMinutes?: number;
  targetCount?: number;
}

export async function setWeeklyGoal(
  userId: string,
  targetCategory: string,
  targetMinutes?: number,
  targetCount?: number
) {
  const ref = doc(db, 'weeklyGoals', userId);
  const data: Record<string, any> = {
    userId,
    targetCategory,
    updatedAt: serverTimestamp(),
  };
  if (targetMinutes !== undefined) data.targetMinutes = targetMinutes;
  if (targetCount !== undefined) data.targetCount = targetCount;

  await setDoc(ref, data, { merge: true });
  notifyDataUpdated();
}

export function subscribeToWeeklyGoal(userId: string, callback: (goal: FirestoreWeeklyGoal | null) => void) {
  return onSnapshot(doc(db, 'weeklyGoals', userId), (snap) => {
    if (snap.exists()) {
      callback({ ...snap.data(), id: snap.id } as FirestoreWeeklyGoal);
    } else {
      callback(null);
    }
  });
}
