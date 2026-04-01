# OpenSpace Skill Manager — 要件定義書

**バージョン:** 1.0  
**作成日:** 2026-04-01  
**対象リポジトリ:** openspace-skill-manager  
**技術スタック:** React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL/TiDB

---

## 1. プロダクト概要

OpenSpace Skill Manager（以下 OSM）は、Claude Code で使用する **SKILL.md ファイルを一元管理・進化させるプラットフォーム**である。ユーザーは自分のスキルを登録・バージョン管理し、コミュニティやGitHubから新しいスキルを発見・インポートし、AIによるマージや進化提案を通じてスキルの品質を継続的に向上させることができる。

### 1.1 解決する課題

Claude Code のスキル（SKILL.md）は個人のローカル環境に散在しており、バージョン管理・品質監視・他者のスキルとの統合が困難である。OSM はこの課題を解決するために、スキルのライフサイクル全体（作成→監視→修復→進化→共有）を一つのプラットフォームで管理する。

### 1.2 主要ユーザー

| ロール | 説明 | 主な利用機能 |
|--------|------|-------------|
| **一般ユーザー** | Claude Code を日常的に使用する開発者 | マイスキル管理・スキル広場・Agent連携 |
| **管理者（admin）** | プラットフォーム運営者 | ユーザー管理・プラン管理・収益ダッシュボード |

---

## 2. 機能要件

### 2.1 認証・アカウント管理

OSM は Manus OAuth を認証基盤として採用する。ユーザーは Manus アカウントでログインし、セッションは JWT によって管理される。

**実装済み機能：**

- Manus OAuth によるログイン（`/api/oauth/callback`）
- セッション Cookie による認証状態の維持
- ロールベースアクセス制御（`user` / `admin`）
- 管理者専用プロシージャ（`adminProcedure`）による API ガード

**DB テーブル：`users`**

| カラム | 型 | 説明 |
|--------|----|------|
| `id` | INT AUTO_INCREMENT | 主キー |
| `openId` | VARCHAR(64) UNIQUE | Manus OAuth の識別子 |
| `name` | TEXT | 表示名 |
| `email` | VARCHAR(320) UNIQUE | メールアドレス |
| `loginMethod` | VARCHAR(64) | ログイン方式 |
| `role` | ENUM('user','admin') | ロール（デフォルト: user） |
| `createdAt` | TIMESTAMP | 作成日時 |
| `lastSignedIn` | TIMESTAMP | 最終ログイン日時 |

---

### 2.2 マイスキル管理

ユーザーが保有するスキルの CRUD・バージョン管理・ヘルス監視を行う中核機能。

#### 2.2.1 スキルのデータモデル

**DB テーブル：`skills`（マスター）**

| カラム | 型 | 説明 |
|--------|----|------|
| `id` | VARCHAR(64) | 主キー（UUID） |
| `name` | VARCHAR(255) | スキル名 |
| `description` | TEXT | 説明文 |
| `category` | VARCHAR(64) | カテゴリ |
| `authorId` | INT | 作成者 users.id |
| `isLocal` | BOOLEAN | ローカルスキルか否か |
| `isPublic` | BOOLEAN | スキル広場への公開フラグ |
| `tags` | TEXT | JSON 配列（例: `["Read","Bash"]`） |
| `allowedTools` | TEXT | JSON 配列（SKILL.md の allowed-tools） |
| `sourceRepo` | VARCHAR(512) | GitHub インポート元 URL |
| `mergedFrom` | TEXT | AI マージ元スキル ID の JSON 配列 |
| `badge` | VARCHAR(16) | `null` / `new` / `repaired` / `derived` |
| `stars` | INT | スター数 |
| `downloadCount` | INT | ダウンロード数 |
| `currentVersionId` | VARCHAR(64) | 最新バージョン ID |

**DB テーブル：`skill_versions`（DAG モデル）**

| カラム | 型 | 説明 |
|--------|----|------|
| `id` | VARCHAR(64) | 主キー |
| `skillId` | VARCHAR(64) | 親スキル ID |
| `version` | VARCHAR(32) | バージョン番号（例: `v3.2.1`） |
| `parentId` | VARCHAR(64) | 前バージョン ID（DAG の親） |
| `evolutionType` | ENUM | `create` / `fix` / `derive` / `capture` |
| `triggerType` | ENUM | `manual` / `analysis` / `degradation` / `monitor` |
| `qualityScore` | FLOAT | 品質スコア（0–100） |
| `successRate` | FLOAT | 実行成功率（0–1） |
| `codeContent` | TEXT | SKILL.md の全文 |
| `changeLog` | TEXT | 変更ログ |

#### 2.2.2 品質スコアの計算ロジック

品質スコア（`qualityScore`）は以下の条件に応じて算出・更新される。

| 条件 | スコア |
|------|--------|
| GitHub クロール取得時 | `Math.min(100, calcCrawlRank() × 5)` |
| 手動修復（`triggerRepair`）時 | 現在値 + 5pt |
| 自動修復（`degradation` トリガー）時 | 現在値 + 10pt |
| 進化提案適用時 | `evolutionScore`（LLM が 0–100 で評価） |
| 手動登録・インポート時 | 初期値 50pt |

`calcCrawlRank` の計算式（`rankBy = "composite"` の場合）：

```
rank = Math.log1p(stars) × 3 + Math.log1p(forks) × 1.5 + freshness × 2
freshness: 30日以内=1.0 / 90日以内=0.7 / 365日以内=0.3 / それ以上=0.1
```

**ヘルス判定基準：**

| スコア範囲 | ステータス | 表示色 |
|-----------|-----------|--------|
| 80 以上 | Healthy | 緑 |
| 60–79 | Warning | 黄 |
| 1–59 | Critical | 赤 |

#### 2.2.3 スキル一覧・詳細

- スキル一覧（`/skills`）：リスト表示 / タイル表示の切り替え、カテゴリ・タグ・ステータスフィルター
- スキル詳細（`/skills/:id`）：バージョン履歴、実行ログ、進化提案一覧
- ヘルスモニター（`/skills/health`）：品質スコア・成功率・最終使用日の一覧監視

#### 2.2.4 tRPC API（`skills` ルーター）

| プロシージャ | 種別 | 説明 |
|-------------|------|------|
| `skills.list` | protected query | ユーザーのスキル一覧取得 |
| `skills.get` | protected query | スキル詳細取得 |
| `skills.create` | protected mutation | スキル新規作成 |
| `skills.update` | protected mutation | スキル更新 |
| `skills.delete` | protected mutation | スキル削除 |
| `skills.versions` | protected query | バージョン履歴取得 |
| `skills.derive` | protected mutation | 派生スキル作成 |
| `skills.fix` | protected mutation | 手動修復（+5pt） |
| `skills.revert` | protected mutation | 旧バージョンへのロールバック |
| `skills.upload` | protected mutation | ファイルアップロードによるインポート |
| `skills.logs` | protected query | 実行ログ取得 |
| `skills.genealogy` | protected query | 系譜グラフデータ取得 |

---

### 2.3 スキル広場（コミュニティ）

GitHub リポジトリや外部ソースから同期されたスキルを検索・閲覧・インストールする機能。

#### 2.3.1 データモデル

**DB テーブル：`community_skills`**

| カラム | 型 | 説明 |
|--------|----|------|
| `id` | VARCHAR(64) | 主キー |
| `name` | VARCHAR(255) | スキル名 |
| `author` | VARCHAR(128) | 作者名 |
| `qualityScore` | FLOAT | 品質スコア |
| `stars` | INT | GitHub スター数 |
| `downloads` | INT | インストール数 |
| `crawlRank` | FLOAT | クロールランク |
| `crawlSource` | VARCHAR(32) | `manual` / `github_crawl` |
| `sourceId` | INT | skill_sources.id への参照 |
| `upstreamSha` | VARCHAR(64) | GitHub blob SHA（変更検知用） |

**DB テーブル：`skill_sources`（同期元リポジトリ）**

| カラム | 型 | 説明 |
|--------|----|------|
| `id` | INT | 主キー |
| `repoOwner` | VARCHAR(128) | リポジトリオーナー |
| `repoName` | VARCHAR(128) | リポジトリ名 |
| `skillsPath` | VARCHAR(512) | スキルファイルのパス |
| `autoSync` | BOOLEAN | 自動同期フラグ |
| `syncIntervalHours` | INT | 同期間隔（時間） |
| `lastSyncStatus` | ENUM | `idle`/`syncing`/`success`/`error` |

#### 2.3.2 tRPC API（`community` ルーター）

| プロシージャ | 種別 | 説明 |
|-------------|------|------|
| `community.list` | public query | スキル一覧（フィルター付き） |
| `community.search` | public query | 全文検索（BM25 スコアリング） |
| `community.install` | protected mutation | マイスキルへのインストール |
| `community.listSources` | public query | 同期元ソース一覧 |
| `community.addSource` | protected mutation | ソース追加 |
| `community.removeSource` | protected mutation | ソース削除 |
| `community.syncSource` | protected mutation | 手動同期実行 |
| `community.getCrawlStats` | public query | クロール統計取得 |

---

### 2.4 Agent連携（ClaudeIntegration）

Claude Code との連携を強化する 6 つの機能モジュール。ルート `/claude/:tab` でアクセス。

| タブ ID | 機能名 | 説明 |
|---------|--------|------|
| `merge` | AIマージ | 複数の SKILL.md を LLM で統合・品質向上 |
| `diff` | 差分インポート | バージョン履歴を保持して既存スキルを更新 |
| `tags` | 自動タグ付け | `allowed-tools` フィールドからタグを自動生成 |
| `single` | 単体インポート | SKILL.md テキストを直接貼り付けて登録 |
| `smart` | スマート起動 | BM25 スコアリングで最適スキルを自動推薦 |
| `mcp` | MCP設定 | `~/.claude.json` 用の MCP 設定 JSON を自動生成 |

#### 2.4.1 tRPC API（`claude` ルーター）

| プロシージャ | 種別 | 説明 |
|-------------|------|------|
| `claude.importSkillMd` | protected mutation | 単体インポート |
| `claude.importBatch` | protected mutation | 一括インポート |
| `claude.mergeSkillsWithAI` | protected mutation | AI マージ（LLM 呼び出し） |
| `claude.diffImport` | protected mutation | 差分インポート（バージョン作成） |
| `claude.importFromGithub` | protected mutation | GitHub URL からインポート |
| `claude.recommend` | protected mutation | スマート起動（BM25 推薦） |
| `claude.generateSkillMd` | protected mutation | SKILL.md 自動生成 |
| `claude.generateMcpConfig` | protected mutation | MCP 設定 JSON 生成 |
| `claude.scanMyGithubRepos` | protected mutation | GitHub リポジトリスキャン |
| `claude.parseMcpConfig` | protected mutation | 既存 MCP 設定のパース |

---

### 2.5 設定（UserSettings）

3 カラム構造（DashboardLayout 左サイドバー → 第 2 カラム縦メニュー → コンテンツ）で構成される設定ページ。ルート `/settings/*` でアクセス。

#### 2.5.1 ページ構成

| ルート | 第 2 カラム選択 | 内容 |
|--------|----------------|------|
| `/settings/account` | — | ユーザーアカウント（プロフィール・テーマ） |
| `/settings/integrations/github` | GitHub連携 | GitHub アクセストークン設定 |
| `/settings/integrations/claude` | Claude Code連携 | MCP トークン・パス設定 |
| `/settings/integrations/googleDrive` | Google Drive連携 | Drive API トークン設定 |
| `/settings/integrations/localFolder` | ローカルフォルダー | ローカルパス設定 |
| `/settings/wizard/sync` | 同期スケジュール | 同期間隔・ブランチ設定 |
| `/settings/wizard/repair` | 修復設定 | 劣化閾値・自動修復設定 |
| `/settings/wizard/evolution` | 進化提案 | 類似度閾値・チェック間隔 |
| `/settings/wizard/watchlist` | 監視先リスト | 監視リポジトリ一覧管理 |
| `/settings/wizard/crawl` | 回遊設定 | クロール条件・フィルター設定 |
| `/settings/wizard/notify` | 通知設定 | 修復・劣化・コミュニティ通知 |
| `/settings/manual` | — | Agent連携（AIマージ・差分等 6 項目へのリンク） |

#### 2.5.2 外部サービス連携（`user_integrations` テーブル）

複数アカウント対応の連携テーブル。1 ユーザーが同一サービスを複数登録可能。

| カラム | 型 | 説明 |
|--------|----|------|
| `serviceType` | VARCHAR(32) | `claude` / `github` / `google_drive` / `local_folder` |
| `label` | VARCHAR(128) | ユーザー定義ラベル（例: "仕事用GitHub"） |
| `token` | TEXT | APIキー・トークン（暗号化推奨） |
| `config` | TEXT | サービス固有設定（JSON） |
| `status` | VARCHAR(32) | `connected` / `disconnected` / `error` |
| `lastTestedAt` | TIMESTAMP | 最終接続テスト日時 |

#### 2.5.3 ユーザー設定（`user_settings` テーブル）

| 設定グループ | カラム | デフォルト値 | 説明 |
|-------------|--------|-------------|------|
| 外観 | `theme` | `dark` | テーマ（dark/light） |
| 外観 | `language` | `ja` | 表示言語 |
| 通知 | `notifyOnRepair` | `true` | 修復時通知 |
| 通知 | `notifyOnDegradation` | `true` | 劣化時通知 |
| 通知 | `notifyOnCommunity` | `false` | コミュニティ更新通知 |
| 同期 | `autoSyncGithub` | `false` | GitHub 自動同期 |
| 同期 | `githubSyncFrequencyHours` | `24` | 同期間隔（時間） |
| 同期 | `syncIntervalHours` | `24` | スキル同期間隔 |
| 同期 | `syncBranch` | `main` | 同期対象ブランチ |
| 進化 | `evolutionSimilarityThreshold` | `70` | 類似度閾値（%） |
| 進化 | `evolutionCheckIntervalHours` | `24` | チェック間隔（時間） |
| 回遊 | `crawlEnabled` | `true` | クロール有効フラグ |
| 回遊 | `crawlIntervalHours` | `24` | クロール間隔（時間） |
| 回遊 | `crawlMinStars` | `0` | 最低スター数フィルター |
| 回遊 | `crawlMinForks` | `0` | 最低フォーク数フィルター |
| 回遊 | `crawlDailyLimit` | `100` | 1 日あたり最大取得件数 |
| 回遊 | `crawlRankBy` | `composite` | ランキング基準 |
| 回遊 | `crawlDuplicatePolicy` | `update` | 重複時の処理（skip/update/version） |

#### 2.5.4 tRPC API（`settings` ルーター）

| プロシージャ | 説明 |
|-------------|------|
| `settings.get` | 設定取得 |
| `settings.update` | 設定更新 |
| `settings.getIntegrations` | 連携一覧取得 |
| `settings.saveIntegration` | 連携設定保存 |
| `settings.testIntegration` | 接続テスト実行 |
| `settings.disconnectIntegration` | 連携解除 |
| `settings.setAutoSyncGithub` | GitHub 自動同期 ON/OFF |
| `settings.triggerGithubSync` | 手動同期実行 |
| `settings.getGithubSyncLogs` | 同期ログ取得 |
| `settings.getSyncSettings` / `saveSyncSettings` | 同期設定 CRUD |
| `settings.getEvolutionSettings` / `saveEvolutionSettings` | 進化設定 CRUD |
| `settings.getCrawlSettings` / `saveCrawlSettings` | 回遊設定 CRUD |
| `settings.getPublicWatchList` / `savePublicWatchList` | 監視先リスト CRUD |

---

### 2.6 ダッシュボード

ユーザーのスキル全体状況を一覧表示するホーム画面（`/dashboard`）。

**表示情報：**

- スキル総数・ヘルス別内訳（Healthy / Warning / Critical）
- 直近の活動タイムライン（バージョン作成・修復・進化適用）
- 推薦スキルカード（スキル広場からの提案）
- GitHub 同期ステータス

**tRPC API（`dashboard` ルーター）：**

| プロシージャ | 説明 |
|-------------|------|
| `dashboard.stats` | 統計サマリー取得 |
| `dashboard.timeline` | 活動タイムライン取得 |
| `dashboard.monitorProject` | プロジェクト監視 |

---

### 2.7 スキル進化エンジン

LLM を活用してスキルの自動改善提案を生成するバックグラウンドエンジン。

**DB テーブル：`skill_evolution_proposals`**

| カラム | 型 | 説明 |
|--------|----|------|
| `mySkillId` | VARCHAR(64) | 進化対象スキル |
| `publicSkillIds` | TEXT | 合成に使用する公開スキル ID（JSON） |
| `mergedContent` | TEXT | 合成後の SKILL.md 全文 |
| `reason` | TEXT | 進化の理由 |
| `evolutionScore` | INT | 進化スコア（0–100） |
| `status` | ENUM | `pending` / `applied` / `dismissed` |

**主要関数（`server/skill-evolution.ts`）：**

- `calcSimilarityScore(skillA, skillB)` — BM25 ベースの類似度計算
- `findEvolutionCandidates(userId)` — 進化候補スキルの検索
- `mergeSkillsWithEvolution(mySkill, publicSkills)` — LLM によるスキル統合
- `detectAndSaveEvolutionProposals(userId)` — 提案の自動検出・保存

---

### 2.8 GitHub 自動同期

ユーザーの GitHub リポジトリを定期スキャンし、SKILL.md ファイルを自動インポートする機能。

**DB テーブル：`github_sync_logs`**

| カラム | 型 | 説明 |
|--------|----|------|
| `status` | ENUM | `running` / `success` / `error` |
| `reposScanned` | INT | スキャン済みリポジトリ数 |
| `skillsFound` | INT | 発見スキル数 |
| `created` | INT | 新規作成数 |
| `updated` | INT | 更新数 |
| `skipped` | INT | スキップ数 |

**動作仕様：**

- `server/github-autosync.ts` がサーバー起動時にスケジューラーを開始
- 各ユーザーの `githubSyncFrequencyHours` 設定に基づいて定期実行
- `autoSyncGithub = true` のユーザーのみ対象

---

### 2.9 Claude Monitor（実験的機能）

Claude Code のリアルタイム活動を監視し、スキル提案を生成するモニタリング機能。

**DB テーブル：`claude_monitor_sessions`**

| カラム | 型 | 説明 |
|--------|----|------|
| `sessionLabel` | VARCHAR(255) | セッション識別子 |
| `activityLog` | TEXT | 活動ログ（JSON 配列） |
| `detectedPatterns` | TEXT | 検出パターン（JSON） |

**DB テーブル：`skill_suggestions`**

| カラム | 型 | 説明 |
|--------|----|------|
| `reason` | TEXT | 提案理由 |
| `source` | VARCHAR(32) | `my_skills` / `community` / `github_crawl` |
| `status` | ENUM | `pending` / `installed` / `dismissed` |
| `confidence` | INT | 信頼スコア（0–100） |

---

### 2.10 管理者パネル（AdminSettings）

`admin` ロールを持つユーザーのみアクセス可能（`/admin/*`）。

| タブ | ルート | 機能 |
|------|--------|------|
| ユーザー・ロール管理 | `/admin/users` | 登録ユーザー一覧・ロール変更 |
| プラン管理 | `/admin/plans` | サブスクリプションプラン管理 |
| 収益ダッシュボード | `/admin/revenue` | 収益・課金状況の概要 |

**tRPC API（`admin` ルーター）：**

- `admin.users` — ユーザー一覧取得
- `admin.updateUserRole` — ロール変更（user ↔ admin）

---

## 3. 非機能要件

### 3.1 認証・セキュリティ

- すべての機密操作は `protectedProcedure` でガードされる
- 管理者専用操作は `ctx.user.role === "admin"` チェックを必須とする
- 外部サービスのトークン（GitHub PAT・Claude APIキー等）は `user_integrations.token` に保存（将来的な暗号化対応を推奨）
- OAuth リダイレクト URL は `window.location.origin` を使用し、ハードコードを禁止する

### 3.2 パフォーマンス

- GitHub クロールには `crawlRateLimitMs`（デフォルト 500ms）のレート制限を設ける
- `crawlDailyLimit`（デフォルト 100 件）で 1 日あたりの取得件数を制限する
- スキル一覧は Drizzle ORM のクエリヘルパーを通じてインデックスを活用する

### 3.3 データ整合性

- スキルバージョンは `skill_versions.parentId` による DAG 構造で管理する
- スキル削除時は `ON DELETE CASCADE` により関連バージョン・実行ログを連動削除する
- タイムスタンプはすべて UTC で保存し、フロントエンドでローカルタイムゾーンに変換する

---

## 4. 画面遷移図

```
/ (Dashboard)
├── /skills
│   └── /skills/:id (SkillDetail)
├── /community
│   └── /community/sources
├── /claude
│   ├── /claude/merge
│   ├── /claude/diff
│   ├── /claude/tags
│   ├── /claude/single
│   ├── /claude/smart
│   └── /claude/mcp
├── /settings
│   ├── /settings/account
│   ├── /settings/integrations/:svc
│   │   ├── github
│   │   ├── claude
│   │   ├── googleDrive
│   │   └── localFolder
│   ├── /settings/wizard/:step
│   │   ├── sync
│   │   ├── repair
│   │   ├── evolution
│   │   ├── watchlist
│   │   ├── crawl
│   │   └── notify
│   └── /settings/manual
└── /admin (admin ロールのみ)
    ├── /admin/users
    ├── /admin/plans
    └── /admin/revenue
```

---

## 5. DB テーブル一覧

| テーブル名 | 用途 |
|-----------|------|
| `users` | ユーザーアカウント |
| `skills` | スキルマスター |
| `skill_versions` | スキルバージョン（DAG） |
| `execution_logs` | スキル実行ログ |
| `skill_sources` | 外部同期元リポジトリ |
| `community_skills` | スキル広場キャッシュ |
| `health_thresholds` | ヘルス閾値設定 |
| `user_settings` | ユーザー設定 |
| `user_integrations` | 外部サービス連携 |
| `github_sync_logs` | GitHub 同期ログ |
| `claude_monitor_sessions` | Claude モニターセッション |
| `skill_suggestions` | スキル提案 |
| `skill_evolution_proposals` | スキル進化提案 |

---

## 6. tRPC ルーター一覧

| ルーター | 主な責務 |
|---------|---------|
| `auth` | ログイン・ログアウト・ユーザー情報 |
| `skills` | マイスキル CRUD・バージョン管理・修復 |
| `community` | スキル広場・ソース管理・クロール |
| `health` | ヘルス監視・閾値設定・修復トリガー |
| `dashboard` | 統計・タイムライン・プロジェクト監視 |
| `storage` | ストレージ概要・バージョン管理・同期 |
| `claude` | Agent連携（マージ・差分・推薦・MCP） |
| `settings` | ユーザー設定・連携管理・同期設定 |
| `admin` | ユーザー管理・ロール変更 |
| `monitor` | Claude モニター・スキル提案 |
| `system` | オーナー通知 |

---

## 7. 今後の実装候補

以下の機能は現時点では未実装または部分実装であり、今後のロードマップとして検討する。

| 優先度 | 機能 | 概要 |
|--------|------|------|
| 高 | 品質スコア計算の集約 | 分散している計算ロジックを `server/quality-score.ts` に統合し、内訳データを API で返す |
| 高 | 外部サービス連携の接続テスト強化 | GitHub / Claude / Google Drive の疎通確認を実際の API 呼び出しで検証 |
| 中 | スコア履歴グラフ | スキル詳細ページに品質スコアの時系列推移グラフを追加 |
| 中 | Google Drive 連携の実装 | Google Drive API を使ったスキルファイル取得の実装 |
| 中 | ローカルフォルダー連携の実装 | サーバーサイドでのローカルパス読み取り実装 |
| 低 | スコア閾値アラート通知 | スコアが 60 を下回ったスキルを検出し、ダッシュボード通知またはメール通知 |
| 低 | プラン管理・課金システム | Stripe 連携によるサブスクリプション管理 |
| 低 | 収益ダッシュボードの実装 | 管理者向け収益・課金状況の可視化 |

---

*本要件定義書は 2026-04-01 時点の実装状況を反映しています。*
