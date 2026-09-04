/**
 * Firestore セキュリティルール 検証スイート
 *
 * 実行:  npm test
 *
 * 【重要】このファイルの目的は「機能が動くこと」の確認ではありません。
 *   攻撃者が何をできないかを、機械的に証明することです。
 *   テストが落ちたとき、firestore.rules を緩めて通してはいけません。
 *   落ちている場合、欠陥はルール側にあります。
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── 登場人物 ────────────────────────────────────────────────────────────
const ALICE = 'alice';     // 鍵アカウント（被害者）
const BOB = 'bob';         // ALICE に正規承認された フォロワー
const MALLORY = 'mallory'; // 攻撃者
const CAROL = 'carol';     // 公開アカウント

let testEnv: RulesTestEnvironment;

const db = (uid?: string): Firestore =>
  (uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext()).firestore();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'career-log-rules-test',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const s = ctx.firestore();

    // 公開プロフィール
    await setDoc(doc(s, 'publicProfiles', ALICE), {
      name: 'Alice', university: 'A大学', grade: '3年', profileVisibility: 'followers',
    });
    await setDoc(doc(s, 'publicProfiles', BOB), { name: 'Bob', profileVisibility: 'followers' });
    await setDoc(doc(s, 'publicProfiles', MALLORY), { name: 'Mallory', profileVisibility: 'public' });
    await setDoc(doc(s, 'publicProfiles', CAROL), { name: 'Carol', profileVisibility: 'public' });

    // 非公開プロフィール（個人情報）
    await setDoc(doc(s, 'users', ALICE), { email: 'alice@example.com', name: 'Alice' });
    await setDoc(doc(s, 'users', MALLORY), { email: 'mallory@example.com', name: 'Mallory' });

    // ALICE の投稿 3種
    const base = { userId: ALICE, title: 'ES提出', content: '本日3社提出', tags: [], likesCount: 0, commentsCount: 0, likedUserIds: [] };
    await setDoc(doc(s, 'posts', 'alice_public'), { ...base, visibility: 'public' });
    await setDoc(doc(s, 'posts', 'alice_followers'), { ...base, visibility: 'followers' });
    await setDoc(doc(s, 'posts', 'alice_private'), { ...base, visibility: 'private' });

    // BOB は正規の手順で ALICE をフォロー済み
    await setDoc(doc(s, 'follows', `${BOB}_${ALICE}`), { followerId: BOB, followingId: ALICE });

    // MALLORY → ALICE の未承認リクエスト
    await setDoc(doc(s, 'followRequests', `${MALLORY}_${ALICE}`), {
      fromUid: MALLORY, toUid: ALICE, status: 'pending',
    });

    // ALICE のカレンダー
    await setDoc(doc(s, 'calendarEvents', 'alice_event'), { userId: ALICE, title: '最終面接' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 既存仕様（rules-verification.md TC-01〜TC-10）
// ═══════════════════════════════════════════════════════════════════════════
describe('投稿の公開範囲', () => {
  it('TC-01: 未認証ユーザーは投稿を読めない', async () => {
    await assertFails(getDoc(doc(db(), 'posts', 'alice_public')));
  });

  it('TC-02: ログインユーザーは public 投稿を読める', async () => {
    await assertSucceeds(getDoc(doc(db(MALLORY), 'posts', 'alice_public')));
  });

  it('TC-03: 非フォロワーは followers 投稿を読めない', async () => {
    await assertFails(getDoc(doc(db(MALLORY), 'posts', 'alice_followers')));
  });

  it('TC-04: 正規フォロワーは followers 投稿を読める', async () => {
    await assertSucceeds(getDoc(doc(db(BOB), 'posts', 'alice_followers')));
  });

  it('TC-05: 本人以外は private 投稿を読めない', async () => {
    await assertFails(getDoc(doc(db(BOB), 'posts', 'alice_private')));
  });

  it('TC-06: 他人名義の投稿は作成できない', async () => {
    await assertFails(
      addDoc(collection(db(MALLORY), 'posts'), {
        userId: ALICE, title: 'なりすまし', content: 'x', tags: [],
        visibility: 'public', likesCount: 0, commentsCount: 0, likedUserIds: [],
        createdAt: serverTimestamp(),
      })
    );
  });

  it('TC-07: 読めない投稿にはコメントできない', async () => {
    await assertFails(
      addDoc(collection(db(MALLORY), 'posts/alice_followers/comments'), {
        userId: MALLORY, content: 'コメント', createdAt: serverTimestamp(),
      })
    );
  });
});

describe('通知', () => {
  it('TC-08: fromUid を偽装した通知は作成できない', async () => {
    await assertFails(
      addDoc(collection(db(MALLORY), `users/${ALICE}/notifications`), {
        userId: ALICE, fromUid: BOB, fromName: 'Bob', type: 'like',
        read: false, createdAt: serverTimestamp(),
      })
    );
  });

  it('TC-09: 正規の通知は作成できる', async () => {
    await assertSucceeds(
      addDoc(collection(db(MALLORY), `users/${ALICE}/notifications`), {
        userId: ALICE, fromUid: MALLORY, fromName: 'Mallory', type: 'like',
        read: false, createdAt: serverTimestamp(),
      })
    );
  });
});

describe('カレンダー', () => {
  it('TC-10: 他人の選考予定は読めない', async () => {
    await assertFails(getDoc(doc(db(MALLORY), 'calendarEvents', 'alice_event')));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ★ 攻撃シナリオ（旧ルールでは全て通ってしまう＝失敗する）
// ═══════════════════════════════════════════════════════════════════════════
describe('★ 攻撃シナリオ', () => {
  it('TC-11: 攻撃者は follows ドキュメントを捏造できない', async () => {
    // 旧ルールは followerId == auth.uid しか見ておらず、
    // ドキュメントIDとの整合性を検証していなかった。
    await assertFails(
      setDoc(doc(db(MALLORY), 'follows', `${MALLORY}_${ALICE}`), {
        followerId: MALLORY, followingId: ALICE, createdAt: serverTimestamp(),
      })
    );
  });

  it('TC-12: 捏造を試みた後も、鍵アカウントの投稿は読めない', async () => {
    await assertFails(
      setDoc(doc(db(MALLORY), 'follows', `${MALLORY}_${ALICE}`), {
        followerId: MALLORY, followingId: ALICE, createdAt: serverTimestamp(),
      })
    );
    await assertFails(getDoc(doc(db(MALLORY), 'posts', 'alice_followers')));
  });

  it('TC-12b: 中身を細工したID偽造も通らない', async () => {
    // ID は MALLORY_ALICE だが中身は別人、という食い違いパターン
    await assertFails(
      setDoc(doc(db(MALLORY), 'follows', `${MALLORY}_${ALICE}`), {
        followerId: MALLORY, followingId: MALLORY, createdAt: serverTimestamp(),
      })
    );
  });

  it('TC-13: 申請者は自分のフォローリクエストを承認できない', async () => {
    await assertFails(
      updateDoc(doc(db(MALLORY), 'followRequests', `${MALLORY}_${ALICE}`), {
        status: 'accepted',
      })
    );
  });

  it('TC-14: 他人の users ドキュメント（email）は読めない', async () => {
    await assertFails(getDoc(doc(db(MALLORY), 'users', ALICE)));
  });

  it('TC-15: 他人の followersCount は改ざんできない', async () => {
    await assertFails(
      updateDoc(doc(db(MALLORY), 'publicProfiles', ALICE), { followersCount: 99999 })
    );
  });

  it('TC-16: 巨大な投稿は作成できない', async () => {
    await assertFails(
      addDoc(collection(db(MALLORY), 'posts'), {
        userId: MALLORY, title: 'x', content: 'あ'.repeat(50000), tags: [],
        visibility: 'public', likesCount: 0, commentsCount: 0, likedUserIds: [],
        createdAt: serverTimestamp(),
      })
    );
  });

  it('TC-17: いいね数の水増しはできない', async () => {
    await assertFails(
      updateDoc(doc(db(MALLORY), 'posts', 'alice_public'), {
        likedUserIds: [MALLORY, BOB, CAROL], likesCount: 3,
      })
    );
  });

  it('TC-18: 通知欄に長文（フィッシング文面）を投函できない', async () => {
    await assertFails(
      addDoc(collection(db(MALLORY), `users/${ALICE}/notifications`), {
        userId: ALICE, fromUid: MALLORY, fromName: '運営', type: 'like',
        content: '【重要】アカウント確認のため以下URLからログインしてください。'.repeat(20),
        read: false, createdAt: serverTimestamp(),
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 正常系（修正後も機能が壊れていないことの確認）
// ═══════════════════════════════════════════════════════════════════════════
describe('正常系', () => {
  it('TC-19: 公開アカウントは承認なしで直接フォローできる', async () => {
    await assertSucceeds(
      setDoc(doc(db(MALLORY), 'follows', `${MALLORY}_${CAROL}`), {
        followerId: MALLORY, followingId: CAROL, createdAt: serverTimestamp(),
      })
    );
  });

  it('TC-20: 鍵アカウント本人が承認すればフォローが成立する', async () => {
    // ① ALICE が承認
    await assertSucceeds(
      updateDoc(doc(db(ALICE), 'followRequests', `${MALLORY}_${ALICE}`), {
        status: 'accepted',
      })
    );
    // ② ALICE 本人が follows を作成（クライアント実装もこの順序にすること）
    await assertSucceeds(
      setDoc(doc(db(ALICE), 'follows', `${MALLORY}_${ALICE}`), {
        followerId: MALLORY, followingId: ALICE, createdAt: serverTimestamp(),
      })
    );
    // ③ 以降、MALLORY は正規に followers 投稿を読める
    await assertSucceeds(getDoc(doc(db(MALLORY), 'posts', 'alice_followers')));
  });

  it('TC-21: 本人は自分の users ドキュメントを読める', async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), 'users', ALICE)));
  });

  it('TC-22: 公開プロフィールはログインユーザーが読める', async () => {
    await assertSucceeds(getDoc(doc(db(MALLORY), 'publicProfiles', ALICE)));
  });

  it('TC-23: 正規のいいねトグルは通る', async () => {
    await assertSucceeds(
      updateDoc(doc(db(MALLORY), 'posts', 'alice_public'), {
        likedUserIds: [MALLORY], likesCount: 1,
      })
    );
  });
});
