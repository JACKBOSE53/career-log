# Firestore セキュリティルール テスト仕様書 & 検証マトリクス

本ドキュメントは、[`firestore.rules`](../firestore.rules) に定義されたアクセス制御ロジックの検証シナリオおよびテスト手順を定めたものです。

---

## 1. 自動テストシナリオ一覧

| ID | 対象コレクション | アクション | 実行ユーザー | 期待結果 | 目的・検証内容 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | `/posts/{postId}` | read | 未認証ユーザー | ❌ **DENY** | 認証なしでのデータ漏洩防止 |
| **TC-02** | `/posts/{postId}` | read | 任意のログインユーザー | ⭕ **ALLOW** | `visibility: 'public'` 投稿の正常閲覧 |
| **TC-03** | `/posts/{postId}` | read | フォローしていないユーザー | ❌ **DENY** | `visibility: 'followers'` 投稿への不正アクセス防止 |
| **TC-04** | `/posts/{postId}` | read | フォロー済みユーザー (`follows` 存在) | ⭕ **ALLOW** | `visibility: 'followers'` 投稿の正規閲覧 |
| **TC-05** | `/posts/{postId}` | read | 投稿者本人以外のユーザー | ❌ **DENY** | `visibility: 'private'` 投稿の完全秘匿 |
| **TC-06** | `/posts/{postId}` | create | ログインユーザー (`userId != auth.uid`) | ❌ **DENY** | 他人名義でのなりすまし投稿防止 |
| **TC-07** | `/posts/{postId}/comments` | create | 親投稿の閲覧権限がないユーザー | ❌ **DENY** | 読めない投稿へのコメント投下防止 |
| **TC-08** | `/users/{uid}/notifications` | create | 他人の `fromUid` を指定したユーザー | ❌ **DENY** | なりすまし通知・スパム送信の防止 |
| **TC-09** | `/users/{uid}/notifications` | create | 正規の `fromUid == auth.uid` と許可された種別 | ⭕ **ALLOW** | 正規のいいね・コメント通知の送信 |
| **TC-10** | `/calendarEvents/{eventId}` | read / write | 所有者以外のユーザー | ❌ **DENY** | 選考予定・カレンダーの完全プライベート保護 |

---

## 2. Firebase Local Emulator による実行方法

Firebase Local Emulator を使って、実サーバーを汚さずにローカルでルールテストを実行できます：

```bash
# 1. Firebase CLI がインストールされている環境でエミュレータを起動
npx firebase emulators:start --only firestore

# 2. ルールユニットテストスイートを実行
npm test
```
