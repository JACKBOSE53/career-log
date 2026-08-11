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
      const notifData = {
        type: 'follow_accept',
        fromUid: fromUid,
        fromName: senderName || 'ユーザー',
        fromAvatar: senderAvatar || '',
        text: 'あなたをフォローしました',
        createdAt: serverTimestamp(),
        isRead: false,
      };
      await addDoc(collection(db, `users/${toUid}/notifications`), notifData);

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
  const q = query(collection(db, `users/${userId}/notifications`), orderBy('createdAt', 'desc'));
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
  await updateDoc(ref, { read: true });
}

export async function markAllNotificationsReadFirestore(userId: string) {
  const q = query(collection(db, `users/${userId}/notifications`), where('read', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { read: true });
  });
  await batch.commit();
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
    return parsed.map((p: any) => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
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
  await addDoc(postsRef, {
    ...postData,
    likesCount: 0,
    commentsCount: 0,
    likedUserIds: [],
    createdAt: serverTimestamp(),
  });
}

function getMillis(dateVal: any): number {
  if (!dateVal) return 0;
  if (dateVal instanceof Date) return dateVal.getTime();
  if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
  if (typeof dateVal.seconds === 'number') return dateVal.seconds * 1000;
  return new Date(dateVal).getTime() || 0;
}

export function subscribeToPosts(callback: (posts: FirestorePost[]) => void) {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => {
      const data = doc.data();
      const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      return { ...data, id: doc.id, createdAt: date };
    }) as FirestorePost[];
    callback(posts);
  }, (err) => {
    console.warn('Firestore subscribe error:', err);
    callback([]);
  });
}

export function subscribeToUserPosts(
  userId: string,
  currentUserId: string | undefined,
  isFollowingFriend: boolean,
  callback: (posts: FirestorePost[]) => void
) {
  const localUserPosts = getLocalPosts().filter((p) => p.userId === userId || userId === 'user-me');
  callback(localUserPosts);

  const postsCollection = collection(db, 'posts');

  // A. 自分の投稿を取得する場合：
  // orderBy を使わない（serverTimestamp() 確定前のドキュメントが除外されるため）
  // localStorage マージも廃止し、Firestore データのみを使用する（デバイス間の表示差異を防ぐ）
  if (userId === currentUserId) {
    const q = query(postsCollection, where('userId', '==', userId));
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
  const q = query(collection(db, `posts/${postId}/comments`), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as FirestoreComment[];
    callback(comments);
  });
}

// ─── Utilities ────────────────────────────────────────────────────────────────
// FirestoreのTimestamp型を文字列に変換（UI表示用）
export function formatFirestoreDate(date: any): string {
  if (!date) return '';
  try {
    const d = date instanceof Date 
      ? date 
      : (typeof date.toDate === 'function' ? date.toDate() : new Date(date));
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch (e) {
    console.warn('formatFirestoreDate error:', e);
    return '';
  }
}

export function formatFirestoreDateLocal(date: any): string {
  if (!date) return '';
  try {
    const d = date instanceof Date 
      ? date 
      : (typeof date.toDate === 'function' ? date.toDate() : new Date(date));
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    console.warn('formatFirestoreDateLocal error:', e);
    return '';
  }
}

// ─── Calendar Events ──────────────────────────────────────────────────────────
export interface FirestoreCalendarEvent {
  id?: string;
  userId: string;
  title: string;
  company?: string;
  date: string;       // 'YYYY-MM-DD'
  time?: string;
  category: string;
  priority?: 'high' | 'medium' | 'low';
  location?: string;
  memo?: string;
  createdAt: Timestamp | Date;
}

export async function addCalendarEvent(userId: string, event: Omit<FirestoreCalendarEvent, 'id' | 'userId' | 'createdAt'>) {
  const ref = collection(db, 'calendarEvents');
  await addDoc(ref, {
    ...event,
    userId,
    createdAt: serverTimestamp(),
  });
  notifyDataUpdated();
}

export async function deleteCalendarEvent(eventId: string) {
  await deleteDoc(doc(db, 'calendarEvents', eventId));
}

export function subscribeToCalendarEvents(userId: string, callback: (events: FirestoreCalendarEvent[]) => void) {
  const q = query(
    collection(db, 'calendarEvents'),
    where('userId', '==', userId),
    orderBy('date', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(d => ({
      ...d.data(),
      id: d.id,
      createdAt: d.data().createdAt?.toDate() || new Date(),
    })) as FirestoreCalendarEvent[];
    callback(events);
  });
}

// ─── Weekly Goals ────────────────────────────────────────────────────────────
export interface FirestoreWeeklyGoal {
  id?: string;
  userId: string;
  targetCategory: string;
  targetMinutes: number;
}

export async function setWeeklyGoal(userId: string, targetCategory: string, targetMinutes: number) {
  const ref = doc(db, 'weeklyGoals', userId);
  await setDoc(ref, {
    userId,
    targetCategory,
    targetMinutes,
    updatedAt: serverTimestamp(),
  }, { merge: true });
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
