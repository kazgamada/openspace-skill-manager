# 世界のスキル自動収集システム — 要件定義書

**バージョン:** 1.1  
**作成日:** 2026-04-08  
**更新日:** 2026-04-09（SKILL.md 以外のファイルタイプ追記）  
**担当:** SaaS 機能追加

---

## 1. 目的・背景

### 1.1 現状の課題

現在の OSM のスキル収集は **GitHub Code Search API のみ** に依存しており、以下の限界がある。

| 課題 | 詳細 |
|------|------|
| 発見経路が単一 | GitHub の `SKILL.md` を検索するだけ。X や npm で話題のスキルを見逃す |
| スコアリングが静的 | `log(stars) × 3 + log(forks) × 1.5 + freshness × 2` の固定式 |
| エンゲージメント反映なし | OSM での実際のダウンロード・評価がスコアに影響しない |
| 重複・低品質が混入 | 内容がほぼ同一のスキルが別リポジトリで複数保存される |
| クロールが非効率 | 毎日全件再取得。変更のないファイルも再クロール |

### 1.2 目指す姿

> **「世界中の優れた Claude Code 関連ファイル（スキル・フック・コマンド・エージェント等）を、複数のシグナルを組み合わせて自動収集・ランキングし、ユーザーが最適なアセットを即座に発見・導入できるシステム」**

---

## 2. データソース設計

### 2.1 ソース一覧と取得方式

| ID | ソース | 取得方式 | 更新頻度 | 主要シグナル |
|----|--------|----------|----------|------------|
| `github_search` | GitHub Code Search | REST API | 6時間 | stars, forks, 更新日 |
| `github_trending` | GitHub Trending | スクレイピング | 1日 | 急上昇リポジトリ |
| `x_mentions` | X (Twitter) API v2 | Search API | 1時間 | いいね数, RT数, 投稿者フォロワー数 |
| `npm_packages` | npm Registry | REST API | 1日 | 週次DL数, 依存数 |
| `community_submit` | ユーザー投稿 | OSM 内UI | リアルタイム | OSM内評価 |
| `curated_lists` | 管理者選定リスト | 手動登録 | 随時 | 品質審査済み |

---

### 2.2 GitHub ソース（強化版）

#### 2.2.1 現状との差分

| 項目 | 現状 | 強化版 |
|------|------|--------|
| 検索クエリ | 固定 5 パターン | 動的（ユーザートレンド + カテゴリ別） |
| SHA 追跡 | あり（ファイル単位） | あり + `pushedAt` によるリポジトリ単位スキップ |
| メタデータ | stars, forks, 更新日 | + contributors 数, open issues 数, license |
| 言語フィルター | 設定済み | + 自動言語検出（SKILL.md の記述言語） |

#### 2.2.2 追加取得フィールド

```
repo.contributors_count   — メンテナー活発度
repo.open_issues_count    — 問題対応状況
repo.license.spdx_id      — ライセンス（MIT優先）
repo.topics[]             — GitHub Topics（claude, mcp, skill等）
repo.stargazers_count_7d  — 直近7日のスター増加数（Trending API から）
```

#### 2.2.3 スマートクエリ生成

ユーザーがよく使うカテゴリ（`user_settings.crawlKeywords`）を基に、動的にクエリを生成する。

```
例: category="testing" → "filename:SKILL.md test OR spec OR vitest in:file"
例: category="frontend" → "filename:SKILL.md react OR vue OR component in:file"
```

---

### 2.3 X (Twitter) ソース【新規】

#### 2.3.1 概要

X API v2 の **Recent Search** を使い、Claude Code 関連の SKILL.md への言及を収集する。

#### 2.3.2 検索クエリ（AND/OR組み合わせ）

```
(SKILL.md OR "claude skill" OR "claude code skill") lang:ja OR lang:en -is:retweet
"claude code" (skills OR skill.md) -is:retweet
#ClaudeCode (github.com OR raw.githubusercontent.com)
```

#### 2.3.3 収集データ

| フィールド | 説明 | スコアへの利用 |
|-----------|------|---------------|
| `public_metrics.like_count` | いいね数 | 高 |
| `public_metrics.retweet_count` | RT数 | 高 |
| `public_metrics.reply_count` | リプライ数 | 中 |
| `author.public_metrics.followers_count` | 投稿者フォロワー数 | 高（影響力重み） |
| `entities.urls[].expanded_url` | 含まれる GitHub URL | スキル紐付け |
| `created_at` | 投稿日時 | 鮮度 |

#### 2.3.4 スキル紐付けロジック

1. ポストの URL から `github.com/{owner}/{repo}` を抽出
2. OSM の `community_skills.githubUrl` / `skill_sources` に照合
3. 一致した場合、`x_mentions` テーブルに保存し、スコアに反映

#### 2.3.5 API 制限への対応

| プラン | Search 上限 | 対応 |
|--------|------------|------|
| Free | 1回/15分・月500件 | ベーシック収集のみ |
| Basic ($100/月) | 月100万件 | 本番推奨 |
| Pro ($5000/月) | 月1億件 | 将来検討 |

X API キーは `TWITTER_BEARER_TOKEN` 環境変数で管理。未設定時はこのソースをスキップ。

---

### 2.4 npm ソース【新規】

#### 2.4.1 対象パッケージの特定

npm に公開されている Claude Code 関連パッケージ（`keywords: ["claude", "skill", "mcp"]`）を検索。

```
GET https://registry.npmjs.org/-/v1/search?text=claude+skill&size=100
```

#### 2.4.2 収集データ

| フィールド | 説明 |
|-----------|------|
| `downloads.weekly` | 週次DL数 |
| `package.repository.url` | GitHub URL（スキル紐付け） |
| `package.keywords` | タグとして活用 |
| `score.final` | npm 品質スコア |

#### 2.4.3 スキル紐付け

`package.repository.url` から GitHub URL を抽出し、コード内の `SKILL.md` を取得。

---

### 2.5 コミュニティ投稿ソース【新規】

#### 2.5.1 ユーザー投稿フロー

```
1. ユーザーが「スキルを投稿」ボタンをクリック
2. GitHub URL または SKILL.md テキストを入力
3. OSM が自動でメタデータ取得・品質チェック
4. モデレーションキュー（管理者承認 or 自動承認）
5. スキル広場に掲載
```

#### 2.5.2 自動品質チェック

| チェック項目 | 判定基準 | 不合格時の処理 |
|------------|---------|--------------|
| SKILL.md 構造 | `## Instructions` セクション必須 | 警告表示・投稿可 |
| 最小文字数 | 100文字以上 | エラー・投稿不可 |
| 禁止コンテンツ | 機密情報・個人情報の検出 | 自動拒否 |
| 重複チェック | 既存スキルとの類似度 > 90% | 重複警告・差分インポート提案 |

---

### 2.6 キュレーションリスト【新規】

管理者が手動で「おすすめ」「公式」「今週のピックアップ」を設定できる仕組み。

```
DB テーブル: curated_lists
- id, name, description, skillIds (JSON array)
- type: "featured" | "official" | "weekly_pick"
- validFrom, validTo (表示期間)
```

---

## 3. スコアリング設計

### 3.1 統合スコアリング式（Multi-Signal Ranking）

```
finalScore = w1 × githubScore
           + w2 × xScore
           + w3 × npmScore
           + w4 × osmScore
           + w5 × qualityScore
           + boost × isCurated
```

#### デフォルト重み（調整可能）

| シグナル | 変数 | デフォルト重み | 説明 |
|---------|------|--------------|------|
| GitHub | `w1` | 0.35 | stars, forks, 鮮度 |
| X言及 | `w2` | 0.25 | いいね, RT, 投稿者影響力 |
| npm DL | `w3` | 0.10 | 週次ダウンロード数 |
| OSM内評価 | `w4` | 0.20 | インストール数, 評価 |
| 品質 | `w5` | 0.10 | SKILL.md 構造・長さ・多様性 |
| キュレーション | `boost` | +20pt | 管理者選定ボーナス |

#### 各サブスコアの計算

**GitHub スコア（0–100）:**
```
githubBase = log₁₊(stars)×4 + log₁₊(forks)×2 + freshness×3
           + log₁₊(contributors)×1 + topicBonus×2
freshness: ≤7日=1.0 / ≤30日=0.85 / ≤90日=0.6 / ≤365日=0.3 / それ以上=0.1
topicBonus: "claude" or "mcp" or "skill" in topics → 1.0
githubScore = min(100, githubBase × 3)
```

**X スコア（0–100）:**
```
xBase = 0
for each mention:
  authorWeight = log₁₊(followers) / 10        # 影響力重み
  engageWeight = log₁₊(likes + rt×2)          # エンゲージメント
  recencyWeight = max(0, 1 - daysSince / 30)   # 30日で減衰
  xBase += authorWeight × engageWeight × recencyWeight
xScore = min(100, xBase × 5)
```

**OSM スコア（0–100）:**
```
osmScore = min(100,
  log₁₊(installCount)×15
  + avgRating×10
  + log₁₊(reviewCount)×5
)
```

**品質スコア（0–100）:**
```
qualityScore =
  hasInstructionsSection × 20
  + hasAllowedToolsField × 20
  + contentLength（適切な長さ）× 20   # 100-5000文字が最適
  + hasExamples × 20
  + licenseExists × 10
  + hasChangelog × 10
```

### 3.2 スコアのトレンド補正

```
trendMultiplier = 1.0 + min(1.0, starGrowth7d / max(1, totalStars) × 50)
```

直近 7 日でスター数が 10% 以上増加したスキルには最大 2× のブースト。

---

## 4. データパイプライン設計

### 4.1 収集フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                    Skill Discovery Pipeline                      │
│                                                                  │
│  [GitHub Crawl]──┐                                               │
│  [GitHub Sync] ──┤                                               │
│  [X API]       ──┼──► [Normalizer] ──► [Quality Filter]          │
│  [npm Search]  ──┤         │                    │                │
│  [Community]   ──┘         ▼                    ▼                │
│                      [Deduplicator]      [Rejected Queue]        │
│                            │                                     │
│                            ▼                                     │
│                    [Score Calculator]                            │
│                            │                                     │
│                            ▼                                     │
│                    [community_skills DB]                         │
│                            │                                     │
│                            ▼                                     │
│                    [WebSocket Broadcast]                         │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 スケジュール設計

| ジョブ名 | 頻度 | 優先度 | 備考 |
|---------|------|--------|------|
| `crawl:github:search` | 6時間 | 高 | メインクロール |
| `crawl:github:trending` | 1日 | 中 | GitHub Trending ページ |
| `crawl:x:mentions` | 1時間 | 高 | X API 検索 |
| `crawl:npm:search` | 1日 | 低 | npm 検索 |
| `score:recalculate` | 6時間 | 高 | 全スキルスコア再計算 |
| `dedup:community` | 1日 | 中 | 重複スキル統合 |
| `curated:refresh` | 1週 | 低 | キュレーションリスト更新 |

### 4.3 差分更新の仕組み（効率化）

```
1. リポジトリ単位で pushedAt を記録
2. 前回クロール時の pushedAt と比較
3. 変更なし → スキップ（API コール節約）
4. 変更あり → SHA 差分でファイル単位更新
```

---

## 5. データモデル設計

### 5.1 新規テーブル

#### `skill_x_mentions`

| カラム | 型 | 説明 |
|--------|----|----- |
| `id` | SERIAL | 主キー |
| `communitySkillId` | VARCHAR(64) | 紐付けスキル ID |
| `xPostId` | VARCHAR(64) UNIQUE | X のポスト ID |
| `authorFollowers` | INT | 投稿者フォロワー数 |
| `likeCount` | INT | いいね数 |
| `retweetCount` | INT | RT数 |
| `replyCount` | INT | リプライ数 |
| `score` | REAL | 計算済み影響スコア |
| `postedAt` | TIMESTAMP | 投稿日時 |
| `collectedAt` | TIMESTAMP | 収集日時 |

#### `skill_npm_packages`

| カラム | 型 | 説明 |
|--------|----|----- |
| `id` | SERIAL | 主キー |
| `communitySkillId` | VARCHAR(64) | 紐付けスキル ID |
| `packageName` | VARCHAR(255) UNIQUE | npm パッケージ名 |
| `weeklyDownloads` | INT | 週次DL数 |
| `npmScore` | REAL | npm 品質スコア |
| `lastFetchedAt` | TIMESTAMP | 最終取得日時 |

#### `skill_score_history`

| カラム | 型 | 説明 |
|--------|----|----- |
| `id` | SERIAL | 主キー |
| `communitySkillId` | VARCHAR(64) | スキル ID |
| `score` | REAL | 算出スコア |
| `githubScore` | REAL | GitHub サブスコア |
| `xScore` | REAL | X サブスコア |
| `osmScore` | REAL | OSM サブスコア |
| `recordedAt` | TIMESTAMP | 記録日時 |

#### `curated_lists`

| カラム | 型 | 説明 |
|--------|----|----- |
| `id` | SERIAL | 主キー |
| `name` | VARCHAR(128) | リスト名（例: 今週のピックアップ） |
| `type` | ENUM | `featured` / `official` / `weekly_pick` |
| `skillIds` | TEXT | JSON 配列 |
| `validFrom` | TIMESTAMP | 掲載開始 |
| `validTo` | TIMESTAMP | 掲載終了 |

### 5.2 既存テーブルへの追加カラム

#### `community_skills` に追加

| カラム | 型 | デフォルト | 説明 |
|--------|----|-----------|----- |
| `xMentionScore` | REAL | 0 | X 由来スコア |
| `npmDownloads` | INT | 0 | npm 週次DL数 |
| `osmInstallCount` | INT | 0 | OSM でのインストール実績数 |
| `osmRating` | REAL | 0 | OSM 内評価（0–5） |
| `osmRatingCount` | INT | 0 | 評価件数 |
| `trendScore` | REAL | 0 | トレンドブースト値 |
| `finalScore` | REAL | 0 | 統合スコア（最終ランキング用） |
| `starGrowth7d` | INT | 0 | 直近7日のスター増加数 |
| `isCurated` | BOOLEAN | false | 管理者キュレーション済み |
| `sourceType` | VARCHAR(32) | 'github_crawl' | ソース種別 |
| `contentHash` | VARCHAR(64) | null | SKILL.md の SHA256（重複検出） |

---

## 6. 重複・品質管理

### 6.1 重複検出の多段階チェック

```
Level 1: contentHash による完全一致 → 同一ファイル確定
Level 2: SimHash によるコンテンツ類似度 > 90% → 重複候補
Level 3: タイトル正規化後の文字列一致 → 同名スキル
Level 4: embeddings コサイン類似度 > 0.95 → 意味的重複（将来実装）
```

重複が検出された場合：
- **完全一致**: 低スコア側を非表示・高スコア側にスター数等をマージ
- **類似**: 「似たスキルがあります」として関連スキルに表示

### 6.2 品質フィルタリング

| フィルター | 条件 | アクション |
|----------|------|----------|
| 最低長 | 100文字未満 | 収集スキップ |
| スパム検出 | 同一著者から1日50件以上 | レート制限・アカウント停止 |
| 機密情報 | API KEY, PASSWORD 等のパターン | 自動除外 |
| ライセンス非互換 | GPL のみ（再配布不可） | 警告バッジ表示 |
| 言語フィルター | ユーザー設定の言語以外 | スコアダウン |

---

## 7. API 設計

### 7.1 新規 tRPC エンドポイント

| プロシージャ | 種別 | 説明 |
|------------|------|------|
| `community.listByScore` | public query | 統合スコア降順でスキル一覧 |
| `community.listTrending` | public query | トレンドスコア降順（直近7日急上昇） |
| `community.listCurated` | public query | キュレーションリスト別取得 |
| `community.getScoreDetail` | public query | スキルのスコア内訳取得 |
| `community.submitSkill` | protected mutation | ユーザー投稿 |
| `community.rateSkill` | protected mutation | スキルへの評価（1–5星） |
| `admin.getCrawlSources` | admin query | 全データソース状態一覧 |
| `admin.setCuratedList` | admin mutation | キュレーションリスト設定 |
| `admin.toggleCrawlSource` | admin mutation | ソース有効/無効切り替え |
| `admin.setCrawlWeights` | admin mutation | スコアリング重み係数の調整 |

### 7.2 レスポンス例（`community.listByScore`）

```json
{
  "skills": [
    {
      "id": "abc123",
      "name": "code-reviewer",
      "finalScore": 87.4,
      "scoreBreakdown": {
        "github": 72.1,
        "x": 91.3,
        "osm": 45.0,
        "quality": 88.0
      },
      "trend": { "direction": "up", "growth7d": 142 },
      "xMentions": 23,
      "osmInstallCount": 891,
      "isCurated": true
    }
  ],
  "meta": { "total": 2847, "cursor": "..." }
}
```

---

## 8. 管理者ダッシュボード（収集状況監視）

### 8.1 必要な管理画面

| 画面 | 内容 |
|------|------|
| ソース状態一覧 | 各クロールソースの最終実行・成功/失敗・取得件数 |
| スコアリング調整 | 重み係数のスライダー UI・テスト実行 |
| キュレーション管理 | 週間ピックアップの設定・プレビュー |
| 品質フィルターログ | 除外されたスキルと理由の一覧 |
| トレンドチャート | 過去30日のスキル収集数・スコア分布の推移 |

---

## 9. 環境変数追加

```env
# X (Twitter) API
TWITTER_BEARER_TOKEN=AAAA...        # X API v2 Bearer Token（省略可）

# GitHub Token（クロール用レート上限向上）
GITHUB_CRAWL_TOKEN=ghp_...          # 既存 GITHUB_TOKEN と分離推奨

# スコアリング重み（省略時はデフォルト値）
SCORE_WEIGHT_GITHUB=0.35
SCORE_WEIGHT_X=0.25
SCORE_WEIGHT_NPM=0.10
SCORE_WEIGHT_OSM=0.20
SCORE_WEIGHT_QUALITY=0.10
```

---

## 10. フェーズ別実装計画

### Phase 1（基盤強化）— GitHub クロール改善

- SHA ベース差分更新の導入（`pushedAt` 追跡）
- 追加メタデータ取得（contributors, topics, license）
- 品質スコアの計算ロジック実装（`qualityScore` 計算関数）
- `contentHash` による完全重複検出
- `skill_score_history` テーブル追加・スコア履歴記録

### Phase 2（X 連携）

- `TWITTER_BEARER_TOKEN` 設定時のみ有効化
- `skill_x_mentions` テーブル追加
- X 投稿収集ジョブ実装（1時間毎）
- スキルへの X ポスト紐付けロジック
- X スコアの統合スコアへの反映

### Phase 3（OSM 内エンゲージメント）

- スキル評価機能（1–5星）UI + API
- `osmInstallCount` の正確なカウント（現状 isInstalled フラグのみ）
- トレンドスコア計算（`starGrowth7d` 追跡）
- `community.listTrending` エンドポイント

### Phase 4（npm + キュレーション）

- npm 検索・DL数収集ジョブ
- `curated_lists` テーブル + 管理者 UI
- 重み係数の管理者調整機能

### Phase 5（高度化）

- SimHash による類似重複検出
- セマンティック検索（embedding ベース）
- GitHub Trending スクレイピング
- ライセンス自動検出・フィルター

---

## 11. 懸念事項・制約

| 事項 | 詳細 | 対応方針 |
|------|------|---------|
| X API 費用 | Basic プランで $100/月 | 初期は Free ティアで試験運用 |
| GitHub API レート制限 | 認証済み: 5,000 req/h | GitHub App 認証で上限拡張 |
| npm 検索の精度 | Claude Code 専用パッケージが少ない | 初期は補助シグナルとして軽く扱う |
| X API 廃止リスク | API ポリシー変更リスクあり | ソース無効化で graceful degrade |
| GDPR/個人情報 | X ポストの保存はユーザーの公開情報のみ | ポスト ID と集計値のみ保存・本文は保存しない |

---

## 12. SKILL.md 以外の有用ファイルタイプの収集

### 12.1 Claude Code のファイルエコシステム全体像

Claude Code は SKILL.md 以外にも多数の設定ファイルを持つ。これらを収集することで、ユーザーが「スキルだけでなく開発環境全体」をワンクリックで取り込めるようになる。

```
.claude/
├── settings.json        ← フック・パーミッション設定
├── commands/            ← カスタムスラッシュコマンド
│   ├── commit.md
│   └── review-pr.md
├── agents/              ← エージェント定義
│   └── code-reviewer.md
└── skills/              ← ローカルスキルディレクトリ（既存対応）
    └── my-skill.md

.mcp.json                ← プロジェクトローカル MCP サーバー設定
CLAUDE.md                ← プロジェクト指示書
```

### 12.2 収集対象ファイルタイプ一覧

| ファイルタイプ | パターン | 現状 | 優先度 |
|-------------|---------|------|--------|
| スキル | `SKILL.md` / `.claude/skills/*.md` | **対応済み** | — |
| フック設定 | `.claude/settings.json`（hooks セクション） | **未対応** | 高 |
| カスタムコマンド | `.claude/commands/*.md` | **未対応** | 高 |
| エージェント定義 | `.claude/agents/*.md` | **未対応** | 高 |
| MCP 設定 | `.mcp.json` / `~/.claude.json` | 部分対応（パースのみ） | 中 |
| プロジェクト指示書 | `CLAUDE.md` | **未対応** | 中 |

---

### 12.3 フック設定（`.claude/settings.json` の hooks セクション）

#### 概要

Claude Code の `settings.json` には `hooks` キーに PreToolUse / PostToolUse / Stop 等のライフサイクルフックを定義できる。収集・共有することで「よく使われるフックのレシピ」をコミュニティで流通させられる。

#### 収集データ構造

```json
{
  "hookType": "PostToolUse",
  "matcher": "Write|Edit",
  "command": "prettier --write $FILE",
  "description": "ファイル保存時に自動フォーマット",
  "author": "kazgamada",
  "stars": 142,
  "sourceRepo": "kazgamada/my-claude-config"
}
```

#### 収集ロジック

1. GitHub で `.claude/settings.json` を検索（`filename:settings.json path:.claude`）
2. ファイルをダウンロードして JSON パース
3. `hooks` キーが存在するファイルのみ対象
4. フックコマンドが実行可能・安全か基本チェック（危険コマンドのブロックリスト）
5. フック単位でレコードを作成（1ファイルから複数フックを抽出）

#### スコアリング

```
hookScore = リポジトリの stars × 0.5
          + コマンドの複雑性スコア（pipe/条件分岐で加点）× 0.2
          + 説明文の充実度 × 0.3
```

#### セキュリティ考慮

フックはシェルコマンドを直接実行するため、収集・表示時に以下のチェックが必須：

| チェック | 対象コマンド | 処理 |
|---------|------------|------|
| 危険コマンドブロック | `rm -rf`, `curl ... \| sh`, `eval` 等 | 収集拒否 |
| ネットワーク送信検出 | `curl`, `wget`, `nc` 等を含む | 警告バッジ表示 |
| 秘密情報パターン | `$API_KEY`, `$TOKEN` 等 | マスク表示 |
| ユーザー確認必須 | 上記以外の外部コマンド | インストール前に差分表示 |

---

### 12.4 カスタムスラッシュコマンド（`.claude/commands/*.md`）

#### 概要

`.claude/commands/` ディレクトリに置いた Markdown ファイルが `/filename` でスラッシュコマンドとして呼び出せる。「コミット作成」「PR レビュー」「テスト実行」などの定型タスクを共有できる。

#### 収集データ構造

```json
{
  "commandName": "commit",
  "fileName": "commit.md",
  "description": "変更内容を分析して適切なコミットメッセージを生成",
  "content": "## Instructions\n...",
  "arguments": ["--amend", "--no-verify"],
  "allowedTools": ["Bash(git:*)", "Read"],
  "sourceRepo": "owner/repo",
  "stars": 89
}
```

#### 収集ロジック

1. GitHub で `.claude/commands/` ディレクトリを持つリポジトリを検索
   ```
   filename:*.md path:.claude/commands
   ```
2. ファイル名をコマンド名として使用（拡張子なし）
3. SKILL.md と同様の Markdown パーサーでフロントマターを取得
4. `allowed-tools` フィールドがあればパース

#### 既存スキルとの差異

| 項目 | SKILL.md | コマンド (.claude/commands/) |
|------|----------|---------------------------|
| 呼び出し方 | Claude が自律判断 | `/コマンド名` で明示的呼び出し |
| ファイル名 | 任意 | コマンド名と対応（`commit.md` → `/commit`） |
| 引数 | なし | `$ARGUMENTS` で受け取り可 |
| スコープ | グローバル | プロジェクトローカル or グローバル |

---

### 12.5 エージェント定義（`.claude/agents/*.md`）

#### 概要

`.claude/agents/` ディレクトリに置いた Markdown がサブエージェントとして利用できる。特定ツールセットと専門性を持つエージェントをコミュニティで共有する。

#### 収集データ構造

```json
{
  "agentName": "code-reviewer",
  "description": "コードレビューに特化したエージェント",
  "tools": ["Read", "Grep", "Glob"],
  "systemPrompt": "...",
  "model": "claude-opus-4-6",
  "sourceRepo": "owner/repo",
  "stars": 203
}
```

#### 収集ロジック

1. GitHub で `.claude/agents/` を検索
   ```
   filename:*.md path:.claude/agents
   ```
2. フロントマターから `name`, `description`, `tools`, `model` を取得
3. エージェントの専門分野をカテゴリとして推定（testing, review, docs 等）

#### 品質チェック

| チェック | 内容 |
|---------|------|
| tools 最小化 | 不必要に `Bash` や `Write` を持つエージェントは警告 |
| system prompt 長さ | 50文字未満は品質不足 |
| 禁止指示の検出 | プロンプトインジェクション的な内容の検出 |

---

### 12.6 MCP サーバー設定（`.mcp.json`）

#### 概要

プロジェクトルートの `.mcp.json` や `~/.claude.json` に MCP サーバーの起動設定が書かれる。「おすすめ MCP セット」としてコミュニティで共有する。

#### 現状の対応

`claude.parseMcpConfig` エンドポイントが既に `.mcp.json` のパースに対応している（`routers.ts`）。ただしコミュニティへの公開・検索は未実装。

#### 新規収集ロジック

1. GitHub で `.mcp.json` ファイルを検索
   ```
   filename:.mcp.json
   ```
2. JSON パースして `mcpServers` キーを取得
3. サーバー名・コマンド・URLをメタデータとして保存
4. 危険なコマンド（任意コード実行の可能性）をブロックリストで除外

#### セキュリティ考慮（SKILL.md より厳格）

MCP 設定はサーバー起動コマンドを含むため、フック以上に危険性が高い：

| リスク | 対応 |
|--------|------|
| 任意コード実行 | コマンドの `exec`, `eval`, backtick を禁止 |
| ネットワークエンドポイント | URL スキームを `https://` のみ許可 |
| 環境変数注入 | `$HOME`, `$USER` 以外の変数参照を警告 |
| インストール前確認 | 必ず diff 表示・ユーザー承認を要求 |

---

### 12.7 プロジェクト指示書（`CLAUDE.md`）

#### 概要

リポジトリルートや `.claude/` 内に置いた `CLAUDE.md` は、Claude Code がプロジェクト固有の文脈・ルールを読み込むためのファイル。「特定フレームワーク向け指示書」としてコミュニティで共有できる。

#### 収集データ構造

```json
{
  "fileName": "CLAUDE.md",
  "title": "Next.js 15 プロジェクト指示書",
  "targetFramework": "nextjs",
  "description": "App Router、TypeScript、Tailwind の規約を定義",
  "content": "## Build Commands\n...",
  "wordCount": 420,
  "sourceRepo": "owner/next-template",
  "stars": 67
}
```

#### 収集ロジック

1. GitHub で `CLAUDE.md` を検索
   ```
   filename:CLAUDE.md
   ```
2. フレームワーク自動検出（`package.json` / `go.mod` 等の有無で判定）
3. セクション構造を解析（Build Commands / Project Structure / Conventions 等）
4. 文字数・セクション数で品質スコアを算出

---

### 12.8 アセットタイプ別 DB テーブル設計

SKILL.md 以外のファイルは `community_skills` テーブルとは別に管理する。

#### `community_assets` テーブル（新規・共通）

| カラム | 型 | 説明 |
|--------|----|----- |
| `id` | VARCHAR(64) PK | UUID |
| `assetType` | ENUM | `hook` / `command` / `agent` / `mcp_config` / `claude_md` |
| `name` | VARCHAR(255) | アセット名 |
| `description` | TEXT | 説明文 |
| `content` | TEXT | ファイル本文 |
| `metadata` | TEXT | タイプ別 JSON（tools配列, model, matcher 等） |
| `author` | VARCHAR(128) | GitHubユーザー名 |
| `sourceRepo` | VARCHAR(512) | 元リポジトリ |
| `sourceFile` | VARCHAR(512) | 元ファイルパス |
| `githubUrl` | VARCHAR(512) | GitHub 直リンク |
| `stars` | INT | リポジトリスター数 |
| `finalScore` | REAL | 統合スコア |
| `isCurated` | BOOLEAN | 管理者選定済み |
| `securityFlags` | TEXT | セキュリティ警告の JSON 配列 |
| `isBlocked` | BOOLEAN | セキュリティ理由でブロック |
| `installCount` | INT | OSM でのインストール数 |
| `contentHash` | VARCHAR(64) | SHA256（重複検出） |
| `cachedAt` | TIMESTAMP | 収集日時 |
| `updatedAt` | TIMESTAMP | 最終更新 |

---

### 12.9 アセット別検索・インストール API

| プロシージャ | 説明 |
|------------|------|
| `assets.list` | タイプ別アセット一覧（`assetType` フィルター） |
| `assets.search` | 全文検索（name / description / metadata） |
| `assets.install` | ユーザーのアセットライブラリに追加 |
| `assets.getInstallInstructions` | インストール手順生成（コピペ用コマンド） |
| `assets.preview` | アセット本文・セキュリティ警告プレビュー |
| `admin.blockAsset` | セキュリティ理由でブロック |

---

### 12.10 UI 設計（スキル広場の拡張）

現在「スキル広場」は SKILL.md 専用だが、タイプ切り替えタブを追加する。

```
スキル広場
├── [スキル]      ← 現在の community_skills
├── [フック]      ← hooks (settings.json から抽出)
├── [コマンド]    ← .claude/commands/*.md
├── [エージェント] ← .claude/agents/*.md
├── [MCP]         ← .mcp.json
└── [CLAUDE.md]   ← プロジェクト指示書
```

各タイプに共通の「インストール手順」モーダルを実装：

```
フックのインストール方法:
1. .claude/settings.json を開く
2. 以下を hooks セクションに追加:
   [コードブロック + コピーボタン]
3. Claude Code を再起動
```

---

### 12.11 収集クエリ一覧（GitHub Code Search）

| アセットタイプ | 検索クエリ |
|-------------|-----------|
| フック | `filename:settings.json path:.claude hooks` |
| コマンド | `filename:*.md path:.claude/commands` |
| エージェント | `filename:*.md path:.claude/agents` |
| MCP 設定 | `filename:.mcp.json mcpServers` |
| CLAUDE.md | `filename:CLAUDE.md` |
| スキル（既存） | `filename:SKILL.md` |

---

### 12.12 フェーズ別実装追加

前述の Phase 1〜5 に以下を追加：

| Phase | 追加タスク |
|-------|-----------|
| Phase 2 | `community_assets` テーブル作成・フック収集・コマンド収集 |
| Phase 3 | エージェント収集・スキル広場タブ拡張 UI |
| Phase 4 | MCP 設定収集（セキュリティチェック強化後）・CLAUDE.md 収集 |
| Phase 5 | アセット横断検索・「セット一括インストール」機能 |

---

---

## 13. アセットのリポジトリ保存と外部ツール連携

### 13.1 設計方針

収集したアセットを「**DB（検索・配信）＋ Git リポジトリ（正規ソース・配布）**」の 2 層で管理する。

```
┌─────────────────────────────────────────────────────────────────────┐
│                        2 層アーキテクチャ                             │
│                                                                      │
│  [収集パイプライン]                                                    │
│        │                                                             │
│        ▼                                                             │
│  [PostgreSQL DB]  ←→  高速検索・スコアリング・ユーザー管理              │
│        │                                                             │
│        │ 定期エクスポート（6時間毎）                                    │
│        ▼                                                             │
│  [Git リポジトリ / assets/]  ←→  正規ソース・バージョン管理・配布       │
│        │                                                             │
│        ├──► [Public REST API]   外部ツールから HTTP で取得             │
│        ├──► [MCP Server]        Claude Code から直接クエリ            │
│        ├──► [npm パッケージ]     TypeScript SDK で programmatic アクセス│
│        └──► [CLI ツール]         ターミナルから 1 コマンドでインストール │
└─────────────────────────────────────────────────────────────────────┘
```

**DB が正規ソース** でなく **ファイルが正規ソース** にする理由：
- OSM サーバーが停止していても `git clone` だけで全アセットを取得できる
- Git の差分・履歴がそのままバージョン管理になる
- GitHub 上で PR レビューによるアセット品質管理ができる
- 他ツールが API キー不要でファイルを直接参照できる

---

### 13.2 リポジトリ内ファイル構造

```
assets/                          ← 収集アセットのルート
│
├── index.json                   ← 全アセットの軽量メタデータ一覧
│
├── skills/                      ← SKILL.md
│   ├── _index.json              ← スキル一覧（id, name, score, tags）
│   ├── code-reviewer/
│   │   ├── SKILL.md             ← 本文
│   │   └── meta.json            ← スコア・出典・更新日
│   └── commit-helper/
│       ├── SKILL.md
│       └── meta.json
│
├── hooks/                       ← フック設定
│   ├── _index.json
│   ├── format-on-save/
│   │   ├── hook.json            ← settings.json の hooks エントリ
│   │   └── meta.json
│   └── auto-test/
│       ├── hook.json
│       └── meta.json
│
├── commands/                    ← カスタムスラッシュコマンド
│   ├── _index.json
│   ├── commit/
│   │   ├── command.md
│   │   └── meta.json
│   └── review-pr/
│       ├── command.md
│       └── meta.json
│
├── agents/                      ← エージェント定義
│   ├── _index.json
│   ├── code-reviewer/
│   │   ├── agent.md
│   │   └── meta.json
│   └── test-writer/
│       ├── agent.md
│       └── meta.json
│
├── mcp/                         ← MCP サーバー設定
│   ├── _index.json
│   ├── github-mcp/
│   │   ├── config.json          ← .mcp.json エントリ
│   │   └── meta.json
│   └── filesystem-mcp/
│       ├── config.json
│       └── meta.json
│
└── claude-md/                   ← プロジェクト指示書テンプレート
    ├── _index.json
    ├── nextjs-app-router/
    │   ├── CLAUDE.md
    │   └── meta.json
    └── rust-cli/
        ├── CLAUDE.md
        └── meta.json
```

#### `meta.json` の共通フォーマット

```json
{
  "id": "code-reviewer-abc123",
  "assetType": "skill",
  "name": "code-reviewer",
  "description": "コードレビューに特化したスキル",
  "author": "kazgamada",
  "sourceRepo": "kazgamada/claude-skills",
  "sourceFile": ".claude/skills/code-reviewer.md",
  "githubUrl": "https://github.com/...",
  "stars": 142,
  "forks": 23,
  "finalScore": 87.4,
  "scoreBreakdown": {
    "github": 72.1, "x": 45.0, "osm": 91.3, "quality": 88.0
  },
  "tags": ["code-review", "typescript", "Read", "Grep"],
  "category": "development",
  "isCurated": false,
  "securityFlags": [],
  "installCount": 891,
  "osmRating": 4.3,
  "license": "MIT",
  "collectedAt": "2026-04-09T00:00:00Z",
  "updatedAt": "2026-04-09T06:00:00Z"
}
```

#### `assets/index.json` の構造（全アセット一覧）

```json
{
  "version": "1",
  "generatedAt": "2026-04-09T06:00:00Z",
  "stats": {
    "skills": 2847,
    "hooks": 312,
    "commands": 189,
    "agents": 94,
    "mcp": 67,
    "claudeMd": 231
  },
  "assets": [
    {
      "id": "code-reviewer-abc123",
      "assetType": "skill",
      "name": "code-reviewer",
      "finalScore": 87.4,
      "tags": ["code-review"],
      "path": "assets/skills/code-reviewer"
    }
  ]
}
```

---

### 13.3 DB → ファイル エクスポートパイプライン

#### エクスポートジョブ（`server/asset-exporter.ts`）

```
トリガー: 6時間毎の定期実行 + 手動（管理者パネルから）

処理フロー:
1. DB から全 community_assets を finalScore 降順でフェッチ
2. assetType 別にディレクトリを整理
3. 各アセットを {name}/content.* + meta.json に書き出し
4. _index.json を更新
5. assets/index.json を再生成
6. git add assets/ && git commit --author="osm-bot" && git push
```

#### 差分コミットの戦略

- **新規アセット**: `feat(assets): add {name} [{type}]`
- **スコア更新のみ**: `chore(assets): update scores ({N} assets)`（バッチコミット）
- **削除**: `chore(assets): remove {name} (blocked/duplicate)`

スコアのみの変更は 1 日 1 回まとめてコミットし、Git 履歴を汚さない。

---

### 13.4 Public REST API（`/api/v1`）

tRPC とは別に、**認証不要の REST API** を追加する。外部ツールが API キーなしで利用できることを最優先とする。

#### エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/v1/assets` | 全タイプ横断一覧（クエリパラメータでフィルター） |
| `GET` | `/api/v1/assets/:type` | タイプ別一覧（`skills` / `hooks` / `commands` 等） |
| `GET` | `/api/v1/assets/:type/:id` | 単体取得（本文 + メタデータ） |
| `GET` | `/api/v1/assets/search` | 全文検索（`?q=keyword&type=skill&limit=20`） |
| `GET` | `/api/v1/assets/trending` | 直近 7 日の急上昇アセット |
| `GET` | `/api/v1/assets/curated` | 管理者キュレーション済みアセット |
| `GET` | `/api/v1/index.json` | `assets/index.json` をそのまま返す |
| `GET` | `/api/v1/stats` | 収集統計（総数・タイプ別・更新日時） |

#### クエリパラメータ共通仕様

```
?type=skill,hook             ← 複数タイプフィルター
?q=code+review               ← 全文検索
?tags=typescript,react       ← タグフィルター
?category=development        ← カテゴリフィルター
?sort=score|stars|installs|updated  ← ソート順
?order=desc|asc
?limit=20&cursor=xxx         ← カーソルページネーション
?minScore=70                 ← 最低スコアフィルター
?curated=true                ← キュレーション済みのみ
```

#### レスポンス例（`GET /api/v1/assets/skills`）

```json
{
  "assets": [
    {
      "id": "code-reviewer-abc123",
      "name": "code-reviewer",
      "description": "...",
      "finalScore": 87.4,
      "installPath": "assets/skills/code-reviewer",
      "rawUrl": "https://raw.githubusercontent.com/kazgamada/openspace-skill-manager/main/assets/skills/code-reviewer/SKILL.md",
      "tags": ["code-review"],
      "stars": 142,
      "installCount": 891
    }
  ],
  "meta": {
    "total": 2847,
    "cursor": "eyJpZCI6...",
    "generatedAt": "2026-04-09T06:00:00Z"
  }
}
```

#### CORS・レート制限

- CORS: `*`（完全公開）
- レート制限: 60 req/分/IP（認証なしのため厳しめ）
- キャッシュ: `Cache-Control: public, max-age=300`（5 分）

---

### 13.5 MCP サーバー化（OSM を Claude Code から直接クエリ）

OSM 自体を MCP サーバーとして公開することで、Claude Code が **会話中にリアルタイムでスキルを検索・インストール** できるようになる。

#### MCP サーバー定義（`server/mcp-server.ts`）

```
提供するツール:
- osm_search(query, type?, limit?)    ← アセット検索
- osm_get(id)                         ← アセット詳細取得
- osm_install(id, targetPath?)        ← アセットをローカルに書き込み
- osm_trending(type?, limit?)         ← トレンド取得
- osm_curated(type?)                  ← キュレーション済みリスト
```

#### `~/.claude.json` への追加スニペット（OSM が自動生成）

```json
{
  "mcpServers": {
    "openspace-skill-manager": {
      "type": "http",
      "url": "https://your-osm-instance.railway.app/mcp",
      "description": "Claude Code スキル・フック・コマンドの検索とインストール"
    }
  }
}
```

#### 利用イメージ

```
ユーザー: 「コードレビュー用のスキルを探してインストールして」
Claude:   osm_search("code review", type="skill") → 結果一覧
Claude:   osm_install("code-reviewer-abc123", ".claude/skills/")
Claude:   「インストール完了しました。~/.claude/skills/code-reviewer.md に保存しました」
```

---

### 13.6 npm パッケージ（`@openspace/assets`）

TypeScript / JavaScript ツールから programmatic にアセットを利用できる SDK。

#### パッケージ構成

```
@openspace/assets
├── src/
│   ├── client.ts       ← API クライアント（fetch ベース）
│   ├── types.ts        ← 全型定義（OsmAsset, OsmSkill 等）
│   ├── install.ts      ← ローカルへのインストールヘルパー
│   └── index.ts        ← エントリポイント
```

#### 使用例

```typescript
import { OsmClient } from "@openspace/assets";

const osm = new OsmClient({
  baseUrl: "https://your-osm-instance.railway.app/api/v1",
  // apiKey は不要（公開 API）
});

// スキル検索
const results = await osm.search("code review", { type: "skill", limit: 10 });

// アセット取得
const skill = await osm.get("code-reviewer-abc123");
console.log(skill.content); // SKILL.md 本文

// ローカルインストール
await osm.install("code-reviewer-abc123", {
  targetDir: ".claude/skills",
  overwrite: false,
});

// トレンド一覧
const trending = await osm.trending({ type: "hook", limit: 5 });
```

#### 型定義

```typescript
type AssetType = "skill" | "hook" | "command" | "agent" | "mcp" | "claude_md";

interface OsmAsset {
  id: string;
  assetType: AssetType;
  name: string;
  description: string;
  content: string;           // ファイル本文
  meta: OsmAssetMeta;
}

interface OsmAssetMeta {
  finalScore: number;
  tags: string[];
  stars: number;
  installCount: number;
  isCurated: boolean;
  securityFlags: string[];   // 注意事項
  rawUrl: string;            // GitHub raw URL
}
```

#### npm 公開

```
パッケージ名: @openspace/assets
バージョニング: OSM の assets/index.json の generatedAt に連動
公開頻度: assets/ に変更がある場合のみ（GitHub Actions で自動 publish）
```

---

### 13.7 CLI ツール（`osm` コマンド）

ターミナルから 1 コマンドでインストールできるツール。`@openspace/assets` SDK をラップして実装。

#### コマンド一覧

```bash
# 検索
osm search "code review"
osm search --type hook "format"
osm search --curated --type agent

# インストール
osm install code-reviewer               # マイスキルへインストール
osm install format-on-save --type hook  # フックとしてインストール
osm install commit --type command       # コマンドとしてインストール

# 一覧表示
osm list skills --top 10               # スコア上位10件
osm list trending --type hook          # トレンドのフック

# 情報確認
osm info code-reviewer                 # メタデータ・スコア内訳表示
osm diff code-reviewer                 # インストール前の内容プレビュー

# 同期
osm sync                               # インストール済みアセットを最新版に更新
osm export --format json > my-assets.json  # エクスポート
```

#### インストール方法

```bash
npm install -g @openspace/cli
# または
npx @openspace/cli search "code review"
```

#### インストール先の自動判定

| アセットタイプ | デフォルトインストール先 |
|-------------|----------------------|
| skill | `.claude/skills/` または `~/.claude/skills/` |
| hook | `.claude/settings.json` の hooks セクションに追記 |
| command | `.claude/commands/` または `~/.claude/commands/` |
| agent | `.claude/agents/` または `~/.claude/agents/` |
| mcp | `.mcp.json` の mcpServers に追記 |
| claude_md | `CLAUDE.md`（マージモードで追記） |

---

### 13.8 GitHub Actions 連携

#### アクション 1: `osm-sync`（インストール済みアセットの自動更新）

```yaml
# .github/workflows/osm-sync.yml
name: OSM Asset Sync
on:
  schedule:
    - cron: "0 9 * * 1"  # 毎週月曜 9時
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: openspace/osm-sync-action@v1
        with:
          osm-url: ${{ vars.OSM_URL }}
          target-dir: .claude/skills
          auto-pr: true          # 差分を PR として提出
```

#### アクション 2: `osm-publish`（自作スキルを OSM にプッシュ）

```yaml
# .github/workflows/osm-publish.yml
name: Publish Skills to OSM
on:
  push:
    paths: ['.claude/skills/**']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: openspace/osm-publish-action@v1
        with:
          osm-url: ${{ vars.OSM_URL }}
          osm-token: ${{ secrets.OSM_API_TOKEN }}
          skills-dir: .claude/skills
```

---

### 13.9 Webhook によるリアルタイム通知

外部ツールが新着アセットや更新を受け取れるよう、Webhook を実装する。

#### Webhook イベント一覧

| イベント | 説明 | ペイロード |
|---------|------|-----------|
| `asset.created` | 新規アセット収集 | assetId, type, name, score |
| `asset.updated` | スコア・内容更新 | assetId, diff, newScore |
| `asset.curated` | 管理者によるキュレーション | assetId, listName |
| `assets.export` | 定期エクスポート完了 | stats, commitSha |
| `trending.updated` | トレンドランキング更新 | top10 スナップショット |

#### Webhook 設定 API

```
POST /api/v1/webhooks          ← 登録（要 API キー）
DELETE /api/v1/webhooks/:id    ← 削除
GET /api/v1/webhooks           ← 一覧

ペイロード形式:
{
  "event": "asset.created",
  "timestamp": "2026-04-09T06:00:00Z",
  "data": { ... }
}
```

---

### 13.10 外部ツールからの利用パターン一覧

| ユースケース | 推奨手段 | 概要 |
|------------|---------|------|
| Claude Code からリアルタイム検索 | MCP サーバー | 会話中に `osm_search` で検索・即インストール |
| CI/CD でのスキル自動更新 | GitHub Actions | 毎週 PR でスキル更新を提案 |
| VSCode 拡張からのスキル挿入 | REST API | `/api/v1/assets/search` で検索・補完 |
| TypeScript ツールへの組み込み | npm SDK | `@openspace/assets` で programmatic アクセス |
| シェルスクリプトでのインストール | REST API raw URL | `curl {rawUrl} > .claude/skills/name.md` |
| 自社ツールへのアセット同期 | Webhook + REST API | 新着通知を受け取り自動取り込み |
| ターミナルからのアドホック利用 | CLI (`osm`) | `osm install code-reviewer` |
| オフライン利用 | git clone | `git clone` だけで全アセットを取得 |

---

### 13.11 セキュリティ考慮（配布時）

配布・外部公開する際に特に注意が必要な点：

| リスク | 対応 |
|--------|------|
| 悪意あるスキルの配布 | 収集時セキュリティチェック + 管理者承認フロー |
| npm パッケージへの混入 | `npm publish` 前に assets の hash 検証 |
| MCP ツール経由の任意コード実行 | `osm_install` はファイル書き込みのみ。シェル実行なし |
| Webhook のなりすまし | HMAC-SHA256 署名による検証を必須化 |
| raw URL での直接取得 | GitHub raw は公開前提。機密を含むアセットは収集しない |

---

### 13.12 DB テーブル追加（エクスポート管理）

#### `asset_export_logs`

| カラム | 型 | 説明 |
|--------|----|----- |
| `id` | SERIAL | 主キー |
| `exportedAt` | TIMESTAMP | エクスポート実行日時 |
| `commitSha` | VARCHAR(64) | Git コミット SHA |
| `totalAssets` | INT | エクスポート総数 |
| `added` | INT | 新規追加数 |
| `updated` | INT | 更新数 |
| `removed` | INT | 削除数 |
| `durationMs` | INT | 処理時間 |
| `status` | VARCHAR(16) | `success` / `error` |

#### `webhook_subscriptions`

| カラム | 型 | 説明 |
|--------|----|----- |
| `id` | SERIAL | 主キー |
| `url` | TEXT | Webhook 送信先 URL |
| `events` | TEXT | 購読イベント（JSON 配列） |
| `secret` | TEXT | HMAC 署名キー（暗号化保存） |
| `isActive` | BOOLEAN | 有効フラグ |
| `lastDeliveredAt` | TIMESTAMP | 最終送信日時 |
| `failCount` | INT | 連続失敗回数（5回で自動無効化） |

---

### 13.13 フェーズ別実装追加（セクション 10 の更新）

| Phase | 追加タスク |
|-------|-----------|
| **Phase 2** | `assets/` ディレクトリ構造設計・エクスポートジョブ実装・`asset_export_logs` テーブル |
| **Phase 3** | Public REST API `/api/v1` 実装・CORS + キャッシュ設定 |
| **Phase 3** | MCP サーバー（`server/mcp-server.ts`）実装・`/mcp` エンドポイント追加 |
| **Phase 4** | `@openspace/assets` npm SDK 公開・`osm` CLI ツール |
| **Phase 4** | Webhook システム実装・`webhook_subscriptions` テーブル |
| **Phase 5** | GitHub Actions（`osm-sync` / `osm-publish`）・自動 npm publish |

---

*本要件定義書は 2026-04-09 に更新されました（セクション 13 追記）。*
