# OpenSpace Skill Manager — SaaS 発売前要件定義書

**バージョン:** 2.0  
**作成日:** 2026-04-08  
**ステータス:** 分析完了・実装待ち  
**対象ブランチ:** `claude/saas-requirements-analysis-aXnAQ`

---

## 1. 現状サマリー

OpenSpace Skill Manager（OSM）は、Claude Code の SKILL.md ファイルを一元管理するプラットフォームとして、コア機能の実装がほぼ完了している。ただし、**SaaS として一般公開・商用運用するためには下記の未解決問題を必ず対処する必要がある**。

### 1.1 技術スタック（実装済み）

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 19 + Vite 7 + Tailwind 4 + wouter |
| バックエンド | Express 4 + tRPC 11 |
| ORM / DB | Drizzle ORM + PostgreSQL（pgTable） |
| 認証 | Manus OAuth / ローカル認証（JWT Cookie） |
| インフラ | Docker Compose / Railway / Vercel |
| AI機能 | Forge API / Gemini（オプション） |

### 1.2 実装済み機能

- マイスキル CRUD・バージョン管理（DAG）・品質スコア
- スキル広場（コミュニティスキル検索・インポート）
- GitHub 同期（手動・自動・クロール）
- Agent連携（AIマージ・差分インポート・MCP設定生成）
- スキル進化提案エンジン（LLM ベース）
- Claude Code リアルタイムモニター
- 管理者パネル（ユーザー管理・プランUI・収益UIのスタブ）
- ローカル認証 + Manus OAuth の両対応

---

## 2. 発見されたバグ・エラー

### 2.1 クリティカル：DB エンジン不整合

**内容：**
- `drizzle/schema.ts` は `pgTable`（PostgreSQL）を使用
- `docker-compose.yml` は `mysql:8.0` イメージを定義
- `.env.example` の `DATABASE_URL` は `mysql://` スキームを使用

```
# schema.ts（実装）
import { pgTable } from "drizzle-orm/pg-core";   ← PostgreSQL

# docker-compose.yml（インフラ）
image: mysql:8.0                                   ← MySQL 不整合！

# .env.example
DATABASE_URL=mysql://user:password@host:3306/openspace ← MySQL
```

**影響：** docker-compose での起動時にマイグレーションが失敗する。本番デプロイで DATABASE_URL に MySQL を指定すると全 API がクラッシュする。

**対応：** `docker-compose.yml` と `.env.example` を PostgreSQL に統一する。

---

### 2.2 TypeScript コンパイルエラー（3件）

`pnpm check` 実行時に以下のエラーが発生する：

```
error TS2688: Cannot find type definition file for 'node'.
error TS2688: Cannot find type definition file for 'vite/client'.
tsconfig.json(16,5): error TS5101: Option 'baseUrl' is deprecated
  and will stop functioning in TypeScript 7.0.
```

**原因と対応：**

| エラー | 原因 | 対応 |
|--------|------|------|
| `@types/node` not found | `@types/node` がインストールされていない可能性（または tsconfig のスコープ問題） | `pnpm add -D @types/node` および tsconfig の `types` 設定を見直す |
| `vite/client` not found | `vite` の型定義参照が broken | `/// <reference types="vite/client" />` を `client/src/vite-env.d.ts` に移動 |
| `baseUrl` deprecated | TypeScript 6+ で `baseUrl` 単独使用が非推奨 | `"ignoreDeprecations": "5.0"` を追加 または `paths` のみに移行 |

---

### 2.3 ローカル認証のセキュリティ問題

`server/_core/local-auth.ts:44` にてパスワードを **平文比較** している：

```typescript
if (password !== ENV.localAdminPassword) {  // 平文比較
```

また `LOCAL_ADMIN_PASSWORD` は環境変数からそのまま読み取るため、ログに漏れるリスクがある。

**対応：** `bcrypt` / `argon2` によるパスワードハッシュ化、またはローカル認証は開発専用と明示してプロダクション環境で無効化するガードを追加する。

---

### 2.4 外部サービストークンの平文保存

`user_integrations.token`（および `user_settings.integrations` JSON）に GitHub PAT・Claude API キー等を **暗号化なしで** DB に保存している。

```typescript
// drizzle/schema.ts
token: text("token"),   // 暗号化なし
```

**対応：** AES-256-GCM 等で保存前に暗号化し、読み取り時に復号する。暗号化キーは `JWT_SECRET` とは別に `ENCRYPTION_KEY` 環境変数で管理する。

---

### 2.5 docker-compose.yml のデフォルト認証情報

```yaml
JWT_SECRET: change-me-to-a-random-secret   # ← 要変更の旨が記載されているが強制されない
LOCAL_ADMIN_PASSWORD: changeme              # ← 弱いデフォルト値
MYSQL_ROOT_PASSWORD: rootpassword           # ← 弱いデフォルト値
```

**対応：** 起動時に `JWT_SECRET` が変更されていない場合はサーバーを起動拒否する。

---

## 3. SaaS 発売に必要な未実装機能

### 3.1 課金・サブスクリプション管理（高優先度）

**現状：** `AdminSettings.tsx` の「プラン管理」「収益ダッシュボード」はUI スタブ。

```tsx
// AdminSettings.tsx:246
<p>Stripe連携による課金管理は今後実装予定です。</p>

// RevenueSection
const dummyMetrics = [  // ← ダミーデータ
  { label: "今月の収益", value: "¥—", sub: "Stripe未連携" },
```

**必要な実装：**

| 項目 | 内容 |
|------|------|
| DB | `plans` テーブル（planId, name, price, limits）、`user_subscriptions` テーブル |
| API | `admin.createPlan` / `admin.updatePlan` |
| Stripe連携 | Checkout Session・Webhook・Customer Portal |
| Webhook処理 | `checkout.session.completed` / `customer.subscription.deleted` |
| プラン制限適用 | `protectedProcedure` でプラン制限をチェックするミドルウェア |
| UI | プラン選択ページ（`/pricing`）・支払い成功/失敗ページ |

---

### 3.2 ユーザー自己登録フロー（高優先度）

**現状：** ローカル認証では `kazgamada@gmail.com` と `LOCAL_ADMIN_EMAIL` の 2 アカウントのみがログイン可能。一般ユーザーの登録手段がない。

```typescript
// local-auth.ts:40
if (!isOwnerEmail && !isAdminEmail) {
  return res.status(401).json({ error: "..." });  // 登録不可
}
```

**Manus OAuth 使用時：** OAuth 経由で登録は可能だが、招待制か公開かが不明。

**必要な実装：**
- メールアドレス＋パスワードによるセルフサインアップ（ローカル認証モード）
- メール認証（確認メール送信）
- パスワードリセットフロー
- または Manus OAuth のみに一本化してローカル認証の範囲を明確化

---

### 3.3 メール送信システム（高優先度）

**現状：** `user_settings.emailDigest`・`notifyOnRepair`・`notifyOnDegradation` カラムは存在するが、メール送信の実装がゼロ。

**必要な実装：**
- メール送信サービス選定（SendGrid / Resend / SES）
- メールテンプレート（登録確認・パスワードリセット・スキル劣化通知・ダイジェスト）
- `server/email.ts` 送信ヘルパー作成
- 通知トリガーポイントへのメール送信呼び出し追加

---

### 3.4 API レート制限（高優先度）

**現状：** GitHub クロールには `crawlRateLimitMs` が設定されているが、**tRPC API エンドポイント自体に対するレート制限がない**。

```typescript
// server/_core/index.ts — レート制限なし
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, ... }));
```

**必要な実装：**
- `express-rate-limit` の導入
- 認証エンドポイント（ログイン）：10回/分
- 一般 API：100回/分/ユーザー
- AI 系エンドポイント（mergeSkillsWithAI, recommend 等）：10回/分/ユーザー

---

### 3.5 CORS 設定（高優先度）

**現状：** Express サーバーに CORS ミドルウェアが設定されていない。

```typescript
// server/_core/index.ts — cors() の呼び出しなし
```

**必要な実装：**
- `cors` パッケージの導入
- 許可オリジンを環境変数 `ALLOWED_ORIGINS` で制御
- プリフライトリクエスト対応

---

### 3.6 法的要件ページ（高優先度）

**現状：** 該当ページなし。

**必要な実装：**
- `/privacy` — プライバシーポリシー
- `/terms` — 利用規約
- `/cookies` — Cookie ポリシー
- Cookie 同意バナー（GDPR / 日本の個人情報保護法対応）
- フッターへのリンク追加

---

### 3.7 未実装の外部サービス連携（中優先度）

**現状：** 設定UIは存在するが、バックエンド処理が未実装：

| サービス | UI | バックエンド | 備考 |
|---------|----|-----------|----|
| Google Drive | 設定UI あり | 未実装 | `saveIntegration` で保存のみ |
| ローカルフォルダー | 設定UI あり | 未実装 | サーバーサイドパス読み取り不要か再検討 |

---

### 3.8 セキュリティヘッダー（中優先度）

**現状：** `helmet.js` が導入されていない。

**必要な実装：**
- `helmet` 導入（CSP, HSTS, X-Frame-Options 等）
- CSP の `script-src` に Vite の nonce 対応

---

### 3.9 スケジューラーのシングルインスタンス問題（中優先度）

**現状：** `server/_core/index.ts` の `setInterval`/`setTimeout` がプロセス内で動作。複数インスタンス起動時に重複実行される。

```typescript
// index.ts — プロセス内スケジューラー（スケールアウト時に重複）
setInterval(syncAllSources, 6 * 60 * 60 * 1000);
setInterval(githubAutoSync, 60 * 60 * 1000);
setTimeout(runGithubCrawl, 5 * 60 * 1000);
```

**必要な実装：**
- ジョブキュー（BullMQ + Redis）への移行、または
- 分散ロック（Redis SET NX）でシングル実行を保証

---

### 3.10 エラー監視・ロギング（中優先度）

**現状：** `console.log` / `console.error` のみ。本番障害の原因追跡が困難。

**必要な実装：**
- エラー追跡：Sentry（または LogRocket）の導入
- 構造化ロギング：`pino` の導入
- ヘルスチェック強化：`/api/health` で DB 疎通・空き容量も返す

---

### 3.11 管理者機能の完成（中優先度）

**現状：**

| 機能 | 状態 |
|------|------|
| ユーザー一覧・ロール変更 | 実装済み |
| プラン定義の CRUD | UIスタブ（`toast.info("準備中")` 表示） |
| 収益ダッシュボード | ダミーデータ表示 |
| 全スキル一覧・管理 | `admin.allSkills` は実装済み |
| ユーザー停止・削除 | 未実装 |

---

### 3.12 環境変数の検証（低優先度）

**現状：** `server/_core/env.ts` は `?? ""` フォールバックのみで必須チェックなし。

```typescript
export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",  // 空文字でも起動する
  databaseUrl: process.env.DATABASE_URL ?? "", // 同上
```

**対応：** `zod` の `z.object({...}).parse(process.env)` で起動時にバリデーション。

---

## 4. 非機能要件（SaaS 運用向け）

### 4.1 セキュリティ要件

| 要件 | 現状 | 優先度 |
|------|------|--------|
| トークン暗号化（AES-256-GCM） | 未対応 | 高 |
| パスワードハッシュ（bcrypt/argon2） | 未対応 | 高 |
| API レート制限 | 未対応 | 高 |
| CORS 設定 | 未対応 | 高 |
| セキュリティヘッダー（helmet） | 未対応 | 中 |
| JWT の `iss`/`aud` 検証強化 | 未確認 | 中 |
| 入力サニタイズ（XSS対策） | tRPC の zod バリデーションで部分対応 | 中 |

### 4.2 パフォーマンス要件

| 要件 | 現状 | 優先度 |
|------|------|--------|
| DB インデックス（userId, skillId等） | スキーマに未定義 | 中 |
| スキル一覧のページネーション | `cursor` 未実装（全件取得） | 中 |
| 画像/アセットの CDN 配信 | 未設定 | 低 |

### 4.3 可観測性要件

| 要件 | 現状 | 優先度 |
|------|------|--------|
| エラー追跡（Sentry） | 未対応 | 中 |
| 構造化ロギング（pino） | 未対応 | 中 |
| アップタイム監視 | 未設定 | 低 |

---

## 5. 優先度別実装ロードマップ

### Phase 1（必須・リリースブロッカー）

1. **DB エンジン統一**：`docker-compose.yml` + `.env.example` を PostgreSQL に変更
2. **TypeScript エラー修正**：tsconfig 修正 + `@types/node`/`vite/client` 解決
3. **CORS 設定**：`cors` ミドルウェア追加
4. **API レート制限**：`express-rate-limit` 導入
5. **セキュリティヘッダー**：`helmet` 導入
6. **起動時シークレット検証**：`JWT_SECRET` 未設定/デフォルト値の場合にサーバー起動拒否
7. **法的ページ**：利用規約・プライバシーポリシーの最低限の記載

### Phase 2（収益化・ユーザー獲得に必要）

8. **ユーザー自己登録 + メール認証**
9. **パスワードリセットフロー**
10. **メール送信システム**（Resend / SendGrid）
11. **トークン暗号化**（AES-256-GCM）
12. **Stripe 連携**（Checkout + Webhook + Customer Portal）
13. **プラン制限ミドルウェア**

### Phase 3（運用品質向上）

14. **Sentry エラー追跡**
15. **構造化ロギング（pino）**
16. **スケジューラーのジョブキュー化**（BullMQ + Redis）
17. **DB インデックス追加**
18. **スキル一覧のカーソルページネーション**

### Phase 4（機能拡充）

19. **Google Drive 連携の実装**
20. **収益ダッシュボードの実装**（Stripe API 連携）
21. **管理者機能の完成**（ユーザー停止・削除）
22. **CI/CD パイプライン**（GitHub Actions）

---

## 6. 環境変数一覧（最終版）

現在の `.env.example` に追加が必要な変数：

```env
# ── 既存 ──────────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/openspace   # ← mysql → pg に変更
JWT_SECRET=replace-with-a-random-secret-32-chars-minimum
LOCAL_ADMIN_EMAIL=admin@example.com
LOCAL_ADMIN_PASSWORD=changeme

# ── 追加必須 ──────────────────────────────────────────────────────────────────
ENCRYPTION_KEY=replace-with-32-byte-hex-key   # トークン暗号化用
ALLOWED_ORIGINS=https://yourdomain.com        # CORS 許可オリジン

# ── 追加推奨 ──────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
SENTRY_DSN=https://...@sentry.io/...
```

---

## 7. テスト状況

| テストスイート | テスト数 | 状態 |
|--------------|---------|------|
| auth (RBAC, protected/admin手続き) | 17件 | 通過済み |
| community.sources CRUD | 6件 | 通過済み |
| claude.recommend / generateMcpConfig | 複数 | 通過済み |
| claude-monitor.detectPatterns | 13件 | 通過済み |
| skill-evolution.calcSimilarityScore | 9件 | 通過済み |
| 合計 | **74件** | **全通過** |

**不足しているテスト：**
- 課金フロー（Stripe Webhook）
- レート制限
- トークン暗号化/復号
- メール送信
- セキュリティヘッダーの存在確認

---

## 8. DB テーブル一覧（現状 + 追加必要）

| テーブル名 | 状態 | 備考 |
|-----------|------|------|
| `users` | 実装済み | |
| `skills` | 実装済み | |
| `skill_versions` | 実装済み | |
| `execution_logs` | 実装済み | |
| `skill_sources` | 実装済み | |
| `community_skills` | 実装済み | |
| `health_thresholds` | 実装済み | |
| `user_settings` | 実装済み | |
| `user_integrations` | 実装済み | トークン暗号化が必要 |
| `github_sync_logs` | 実装済み | |
| `claude_monitor_sessions` | 実装済み | |
| `skill_suggestions` | 実装済み | |
| `skill_evolution_proposals` | 実装済み | |
| `plans` | **未実装** | Stripe連携時に追加 |
| `user_subscriptions` | **未実装** | Stripe連携時に追加 |
| `email_verifications` | **未実装** | セルフ登録実装時に追加 |
| `password_reset_tokens` | **未実装** | パスワードリセット実装時に追加 |

---

*本要件定義書は 2026-04-08 時点のコードベース分析に基づいて作成されました。*  
*分析対象ブランチ: `main`（コミット時点）*
