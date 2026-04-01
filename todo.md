# OpenSpace Skill Manager - TODO

## Phase 1: DB設計・スキーマ定義
- [x] drizzle/schema.ts: users, skills, skill_versions, execution_logs, community_skills テーブル定義
- [x] pnpm db:push でマイグレーション実行
- [x] server/db.ts: 全テーブルのクエリヘルパー追加

## Phase 2: バックエンド
- [x] server/routers.ts: skills, skillVersions, executionLogs, communitySkills, dashboard, health, admin, storage, claude, settings ルーター実装
- [x] adminProcedure ミドルウェア実装（role=admin チェック）
- [x] 管理者初期化ロジック（kazgamada@gmail.com → admin ロール自動付与）
- [x] グローバルエラーハンドリング（tRPC onError）

## Phase 3: フロントエンド基盤
- [x] client/src/index.css: エレガントなデザインシステム（カラーパレット、タイポグラフィ、アニメーション）
- [x] DashboardLayout.tsx の確認・カスタマイズ（OSM用サイドバーナビ、リサイズ対応）
- [x] client/src/App.tsx: 全ページルーティング設定
- [x] 共通コンポーネント: StatusBadge, QualityBar, EvolutionBadge等

## Phase 4: 主要ページ実装
- [x] pages/Dashboard.tsx: 統計カード、進化タイムライン、ヘルスマップ
- [x] pages/MySkills.tsx: スキル一覧テーブル、作成モーダル、詳細ドロワー
- [x] pages/SkillDetail.tsx: スキル詳細、バージョン履歴、派生スキル作成
- [x] pages/Community.tsx: コミュニティスキル検索・閲覧・インストール

## Phase 5: 高度な機能ページ
- [x] pages/Genealogy.tsx: Cytoscape.js DAGグラフ、ノード詳細パネル
- [x] pages/HealthMonitor.tsx: ヘルス一覧、品質スコア推移グラフ（Recharts）、閾値設定
- [x] pages/ClaudeIntegration.tsx: MCP接続状態、設定生成、実行ログ
- [x] pages/Storage.tsx: ローカル/クラウド同期状態、バージョン履歴エクスプローラー

## Phase 6: 設定・管理者機能
- [x] pages/Settings.tsx: ユーザー向け設定（アカウント、通知、テーマ）
- [x] pages/AdminSettings.tsx: 管理者向け設定（ユーザー管理、スキル管理、システム設定、ログ監視）
- [x] 管理者専用ナビゲーション項目の表示制御（role=admin のみ表示）

## Phase 7: テスト・仕上げ
- [x] Vitestテスト: auth, admin権限チェック, RBAC, public/protected/admin手続きテスト（17テスト全通過）
- [x] シードデータ投入機能（管理者パネルから実行可能）
- [x] チェックポイント保存

## Claude Code スキル自動取得機能
- [x] server/routers.ts: claude.previewSkillMd（SKILL.md解析・プレビュー）ルーター追加
- [x] server/routers.ts: claude.importSkillMd（SKILL.md単体インポート）ルーター追加
- [x] server/routers.ts: claude.importBatch（複数SKILL.md一括インポート）ルーター追加
- [x] server/routers.ts: claude.parseMcpConfig（.mcp.json / ~/.claude.json のMCP設定解析）ルーター追加
- [x] ClaudeIntegration.tsx: スキルインポートタブ（ファイル貼り付け・ファイルアップロード）UI実装
- [x] ClaudeIntegration.tsx: インポートプレビューモーダル（name/description/category編集・確認）実装
- [x] ClaudeIntegration.tsx: 一括インポートタブ（複数ファイルドラッグ＆ドロップ）実装
- [x] ClaudeIntegration.tsx: MCP設定パーサーモーダル（サーバー一覧表示）実装

## GitHub連携・AIマージ・差分インポート機能
- [x] DB: skillsテーブルにallowedTools/sourceRepo/sourceFile/mergedFromカラム追加・マイグレーション完了
- [x] server/routers.ts: claude.fetchGithubSkills（GitHub API経由でSKILL.md一覧取得）
- [x] server/routers.ts: claude.mergeSkillsWithAI（複数SKILL.mdをLLMでマージ・品質向上）
- [x] server/routers.ts: claude.diffImport（同名スキルを新バージョンとして追加する差分インポート）
- [x] server/routers.ts: claude.importFromGithub（選択スキルをOSMに一括登録）
- [x] server/routers.ts: mapAllowedToolsToTags（allowed-tools→タグ自動マッピング）
- [x] ClaudeIntegration.tsx: GitHubリポジトリーURL入力→SKILL.md一覧取得UI（人気リポジトリクイック選択）
- [x] ClaudeIntegration.tsx: スキル選択→一括インポートウィザードUI（全選択/全解除・結果表示）
- [x] ClaudeIntegration.tsx: AIマージタブ（複数SKILL.md貼り付け→LLMマージ→プレビュー）
- [x] ClaudeIntegration.tsx: 差分インポートタブ（既存スキル選択→新バージョンとして登録）
- [x] ClaudeIntegration.tsx: 自動タグ付けプレビュータブ（allowed-tools→タグマッピング表示）

## メニュー再構成・全設定集約
- [x] DashboardLayout.tsx: ナビを「ダッシュボード・マイスキル・スキル広場・スキル系譜・管理者パネル」の5本に整理
- [x] DashboardLayout.tsx: 旧「ヘルスモニター・Claude連携・ストレージ・設定」メニュー項目を削除
- [x] App.tsx: 旧ルート（/health, /claude, /storage, /settings, /admin-settings）を削除し新ルートに統合
- [x] MySkills.tsx: ヘルスモニター機能（品質スコア・閘値・自動修復）をタブとして統合
- [x] Community.tsx: GitHub連携状態バナーを画面上部に表示
- [x] Genealogy.tsx: Claude連携状態バナーを画面上部に表示
- [x] AdminSettings.tsx: 全設定を1ページに集約（アカウント・通知・外観・連携・ユーザー管理・システム設定・ログ監視）
- [x] AdminSettings.tsx: 連携ウィザード（Claude/GitHub/Google Drive/ローカルフォルダー）実装
- [x] AdminSettings.tsx: 連携状況一覧（接続済み・最終テスト日時）表示
- [x] server/routers.ts: 連携設定の保存・取得・テスト・切断ルーター実装
- [x] drizzle/schema.ts: user_settingsテーブルにintegrations JSONカラム追加・マイグレーション完了

## サイドバー第2階層ナビ再構成
- [x] DashboardLayout.tsx: サイドバーを第2階層構成に書き直し（ユーザー用「設定→連携」、管理者用「管理者パネル→アカウント・ユーザー管理・システム」）
- [x] AdminSettings.tsx: 上部タブを廃止しURLパス連動型（/admin/account, /admin/users, /admin/system）に書き直し
- [x] UserSettings.tsx: ユーザー用設定ページ（連携タブのみ）を新規作成
- [x] App.tsx: /settings, /settings/integrations, /admin/account, /admin/users, /admin/system のルート整理完了

## バグ修正・未実装API実装
- [x] バグ修正: UserSettings.tsx の getIntegrations 戻り値型不一致クラッシュ修正（配列形式で返すように変更）
- [x] スキル管理API: skills.revert（バージョンロールバック）実装
- [x] スキル管理API: skills.upload（コミュニティ公開）実装
- [x] Community.tsx: getIntegrations 配列形式対応（githubConnected判定修正）
- [x] Genealogy.tsx: getIntegrations 配列形式対応（claudeConnected判定修正）
- [x] MySkills.tsx: スキル広場に公開ボタンをドロップダウンメニューに追加
- [x] Vitest 28テスト全通過（getIntegrations契約テスト追加）
- [x] TSエラー 0件確認
- [x] コミュニティAPI: community.search（BM25近似スコアリング）実装
- [x] WebSocket: /ws/evolution-events リアルタイム通知実装（wsパッケージ導入、接続確認済み）

## Agent Team × 自動スキル選択機能
- [x] server/routers.ts: claude.recommend（BM25スコアリングでスキル推薦）実装
- [x] server/routers.ts: claude.generateSkillMd（スキルIDからSKILL.mdテキスト生成）実装
- [x] server/routers.ts: claude.recordUsage（スキル使用結果の記録）実装
- [x] server/routers.ts: claude.generateMcpConfig（~/.claude.json用MCP設定JSON・オーケストレーターSKILL.md生成）実装
- [x] client/src/pages/ClaudeIntegration.tsx: 「スマート起動」タブ追加（キーワード・言語・タスク種別でスキル検索・SKILL.mdプレビュー・コピー）
- [x] client/src/pages/ClaudeIntegration.tsx: 「MCP設定」タブ追加（~/.claude.jsonスニペット・オーケストレーターSKILL.md・セットアップ手順）
- [x] App.tsx: /claude ルート追加
- [x] DashboardLayout.tsx: サイドバーに「Agent連携」メニュー追加
- [x] Vitest 42テスト全通過（claude.recommend・claude.generateMcpConfigテスト追加）

## 動的スキル取得・同期機能（everything-claude-code連携）
- [x] DB: skill_sources テーブル追加（repoOwner/repoName/skillsPath/branch/autoSync/syncIntervalHours/lastSyncedAt/lastSyncStatus/lastSyncError/totalSkills/newSkillsLastSync/updatedSkillsLastSync）
- [x] DB: community_skills に sourceId/upstreamSha/lastSyncedAt カラム追加・マイグレーション完了
- [x] server/github-sync.ts: GitHub Contents API でスキル一覧取得・SHA差分比較・DB upsert
- [x] server/db.ts: skill_sources CRUD ヘルパー追加（listSkillSources/getSkillSourceById/upsertSkillSource/deleteSkillSource）
- [x] community.listSources: ソース一覧取得（公開）
- [x] community.addSource: ソース登録＋即時同期トリガー（認証必須）
- [x] community.syncSource: 手動同期トリガー（認証必須）
- [x] community.removeSource: ソース削除（認証必須）
- [x] community.syncStatus: 同期状態ポーリング（公開）
- [x] community.updateSource: autoSync/syncIntervalHours 更新（認証必須）
- [x] server/_core/index.ts: 起動30秒後＋設定間隔ごとの自動同期スケジューラー追加
- [x] Community.tsx: 「ソース管理」タブ追加（ソース一覧・追加ダイアログ・同期ボタン・削除・仕組み説明）
- [x] Community.tsx: everything-claude-code プリセットボタン追加
- [x] Community.tsx: スキルカードに「同期済み」バッジ表示
- [x] Vitest 48テスト全通過（community.listSources/addSource/syncSource/removeSource/syncStatus/updateSource テスト追加）
- [x] TSエラー 0件確認

## スキル同期バグ修正・レイアウト切り替えUI
- [x] 同期バグ修正: Git Tree API（1リクエストで全SHA取得）に変更、200ms遅延削除、最大CONCURRENCY=10並列取得
- [x] レイアウト切り替え: ViewToggleコンポーネント作成（リスト大・リスト小・タイル大・タイル小）
- [x] レイアウト切り替え: useViewModeフック（localStorage永続化）
- [x] レイアウト切り替え: Community.tsxに実装（スキル広場）
- [x] レイアウト切り替え: MySkills.tsxに実装（マイスキル）
- [x] MySkillCard・MySkillsGridコンポーネント分離（各モード対応）
- [x] TSエラー 0件・Vitest 48件全通過

## 5機能追加（スキル説明・Newバッジ・重複排除・モニター通知・Agent連携サブナビ）
- [x] スキル説明30-40字: MySkills.tsx リスト表示の空きスペースに description を表示
- [x] スキル説明30-40字: Community.tsx 各レイアウトの空きスペースに description を表示
- [x] Newバッジ: 直近7日以内に同期・作成されたスキルに「New」バッジを表示（MySkills/Community両方）
- [x] ソースリポジトリリンク: everything-claude-code 由来スキルカードに「元リポジトリを開く」ボタン追加
- [x] 重複排除バックエンド: skills.create / community.install 時にタイトル+更新日時が一致する場合はエラー返却
- [x] 重複排除バックエンド: 既存の重複レコードを一括削除する admin.deduplicateSkills ルーター追加
- [x] 重複排除フロントエンド: インポート時に重複検出メッセージを表示してスキップ
- [x] プロジェクトモニター通知バックエンド: claude.monitorProject ルーター（プロジェクト情報→スキル推薦→通知保存）
- [x] プロジェクトモニター通知フロントエンド: Dashboard.tsx に「推薦スキル通知」カードを表示
- [x] Agent連携サブナビ: DashboardLayout.tsx の「Agent連携」を第2階層メニューに変換（GitHub取得・AIマージ・差分インポート・自動タグ付け・単体インポート・スマート起動・MCP設定）
- [x] Agent連携サブナビ: ClaudeIntegration.tsx をサブナビ対応（URL パスで各タブに直接遷移）

## サイドバー第2階層ナビゲーション統一（マイスキル・スキル広場・Agent連携）
- [x] DashboardLayout: マイスキル配下に「スキル一覧」「ヘルスモニター」を第2階層メニューとして追加
- [x] DashboardLayout: スキル広場配下に「スキル一覧」「ソース管理」を第2階層メニューとして追加
- [x] DashboardLayout: Agent連携配下に「GitHub取得」「AIマージ」「差分インポート」「自動タグ付け」「単体インポート」「スマート起動」「MCP設定」を第2階層メニューとして追加
- [x] MySkills.tsx: タブUIを削除し、URLパス（/skills/health）でコンテンツを切り替え（実装済み確認）
- [x] Community.tsx: タブUIを削除し、URLパス（/community/sources）でコンテンツを切り替え（実装済み確認）
- [x] ClaudeIntegration.tsx: タブUIを削除し、URLパス（/claude/:tab）でコンテンツを切り替え（実装済み確認）

## ホバーマニュアル（ツールチップ）機能
- [x] DashboardLayout.tsx: 各メニュー項目にマニュアルテキスト（説明文）を定義
- [x] DashboardLayout.tsx: ホバー時に右側にマニュアルパネル（ツールチップ）を表示するUIを実装
- [x] 第1階層・第2階層の全メニュー項目に対応

## スキル一覧表示改善（list-smビュー）
- [x] MySkills.tsx: list-smビューにタイトル・更新日時・引用元リポジトリを表示
- [x] Community.tsx: list-smビューにタイトル・更新日時・引用元リポジトリを表示

## GitHubトークン保存 & 自分のリポジトリスキャン機能
- [x] 設定画面（UserSettings.tsx）にGitHubトークン入力・保存UIを追加（既存の連携設定画面で対応済み）
- [x] server/routers.ts: claude.scanMyGithubRepos エンドポイント実装（GitHubトークンで全リポジトリをスキャンし .claude/skills/*.md を取得）
- [x] ClaudeIntegration.tsx（GitHub取得タブ）に「自分のリポジトリをスキャン」セクションを追加
- [x] スキャン結果をマイスキルに一括インポートできるUIを実装
- [x] スキャン結果が0件の場合の適切なメッセージ表示

## GitHubトークン認証エラー修正
- [x] scanMyGithubRepos: 401エラー時にトークン再設定を促す分かりやすいエラーメッセージを表示
- [x] GithubFetchTab: エラー発生時に設定ページへのリンクを表示
- [x] testIntegration: GitHubトークンの実際のAPI疏通テスト（/user エンドポイント）を実装
- [x] UserSettings.tsx: 連携設定保存後に自動テストを実行してトークン有効性を即座に確認（testIntegration改善で対応）

## GitHub全自動同期（1日1回差分インポート）
- [x] importFromGithub: skillsの30件上限を撤廃しバッチ処理（500件以上対応）に変更
- [x] DBにgithub_sync_logsテーブルを追加（同期履歴：実行日時・追加件数・更新件数・エラー）
- [x] DBにuser_settingsのauto_sync_github列を追加（有効/無効フラグ）
- [x] server: runGithubAutoSync バックエンド関数を実装（スキャン→差分検出→自動インポート）
- [x] server: 差分検出ロジック（スキルのcontentHashで変更を検知）を実装
- [x] server: 1日1回の自動同期スケジューラーをサーバー起動時に登録
- [x] settings.setAutoSyncGithub tRPCエンドポイント（有効化/無効化）を追加
- [x] settings.getGithubSyncLogs tRPCエンドポイント（同期履歴取得）を追加
- [x] settings.triggerGithubSync tRPCエンドポイント（手動実行）を追加
- [x] UserSettings.tsx: 自動同期ON/OFFトグルと同期履歴を表示するUIを追加

## GitHubトークン入力・保存UI修正
- [x] UserSettings.tsx: GitHubトークン入力フォームで「保存」ボタンを押したらDBに正しく保存されるよう修正
- [x] testIntegration: 入力中のconfig（未保存の値）を受け取り、DBの値より優先してテストするよう拡張
- [x] テストボタンに入力中のvaluesを渡すよう修正（未保存のトークンでもテスト可能）
- [x] 保存後にgetIntegrationsをinvalidateして連携一覧を即座に更新

## 連携設定UI改善（入力内容の永続保存）
- [x] 連携設定ダイアログを開いたとき、DBに保存済みの値をフォームに自動入力して表示する（テキスト型のみ）
- [x] 保存済みの設定がある場合、パスワード型フィールドに「設定済」バッジと「変更する場合のみ入力」プレースホルダーを表示
- [x] 「保存」ボタン押下後にダイアログを閉じ、連携一覧に「連携済み」バッジを即座に表示する
- [x] パスワード型フィールドを空欄のまま保存すると既存値を維持（上書きしない）
- [x] セッション再開後（ページリロード・再ログイン後）も保存済み設定が維持される（DB保存済みのため実現済み）

## GitHub連携「設定が不完全です」エラー修正
- [x] testIntegration: configの空欄フィールドはDBの保存済み値を優先するよう修正（「設定が不完全です」エラーを解消）
- [x] バリデーション: パスワード型フィールドが空欄でも既存値がある場合は完全とみなすよう修正

## マイスキル自動同期・スキル広場自動収集
- [x] マイスキル: 同期頻度設定UI（1時間/6時間/12時間/1日/3日/1週）をUserSettings.tsxに追加
- [x] マイスキル: DBにgithubSyncFrequencyHours列を追加し、設定した頻度でスケジューラーが実行
- [x] スキル広場: server/github-crawl.tsを新規作成（GitHub Code Search APIで公開スキルを回遊）
- [x] スキル広場: star数・fork数・更新頻度でランク付けするスコアリングロジックを実装
- [x] スキル広場: 1日100件を上位から取得してcommunity_skillsテーブルに保存
- [x] スキル広場: 自動収集スケジューラー（1日1回、起動5分後初回）をサーバー起動時に登録
- [x] community.triggerCrawl: 手動クロールトリガーエンドポイント実装
- [x] community.getCrawlStats: クロール統計情報取得エンドポイント実装
- [x] Community.tsx: 「今すぐクロール」ボタンと収集統計（件数・最終実行日時）をヘッダーに追加

## Claude Codeリアルタイムモニター＆スキル提案・プッシュ
- [x] スキル広場: crawlRankデフォルトソート（降順）をCommunity.tsxに追加（ソートセレクター UI付き）
- [x] 自動同期完了時: ダッシュボード通知カード「N件のスキルが更新されました」をWebSocket経由で表示
- [x] DB: claude_monitor_sessionsテーブルを追加（セッションID・開始時刻・ツール使用履歴・検出パターン・提案スキル）
- [x] DB: skill_suggestionsテーブルを追加（ユーザーID・提案スキルID・理由・ステータス・提案日時）
- [x] server/claude-monitor.ts: Claude Codeのログ解析・パターン検出・スキル提案ロジックを実装
- [x] monitor.reportActivity tRPCエンドポイント: Claude Codeからの作業ログを受信・解析
- [x] monitor.getSuggestions tRPCエンドポイント: 提案スキル一覧を取得
- [x] monitor.dismissSuggestion / installSuggestion tRPCエンドポイント
- [x] monitor.getRecentSessions tRPCエンドポイント: 最近のセッション一覧
- [x] ClaudeMonitor.tsx: リアルタイムモニター画面（作業アクティビティ入力・提案スキル・インストールボタン）
- [x] サイドバーに「Codeモニター」メニューを追加（/monitorルート）
- [x] server/claude-monitor.test.ts: detectPatternsのユニットテスト（13テスト）追加
- [x] Claude Code用のMCPサーバー設定ファイルを生成するUI（設定 → 連携 → Claude Code連携済みの場合に表示）

## スキル進化提案機能（ワンクリック合成）
- [x] DB: skill_evolution_proposals テーブルを追加（userId・mySkillId・publicSkillIds・mergedContent・reason・status・createdAt）
- [x] server/skill-evolution.ts: マイスキルと公開スキルの類似度スコア計算・合成ロジックを実装
- [x] evolution.detectProposals tRPC: バックグラウンドで進化提案を自動生成するエンドポイント
- [x] evolution.getProposals tRPC: ダッシュボード向けに未処理の提案一覧を取得
- [x] evolution.applyProposal tRPC: ワンクリックで合成スキルをマイスキルに取り込む（新バージョンとして登録）
- [x] evolution.dismissProposal tRPC: 提案を却下する
- [x] evolution.getProposalDetail tRPC: 合成後コンテンツを取得（プレビュー用）
- [x] ダッシュボード: EvolutionProposalCard コンポーネント（合成元スキル表示・プレビューダイアログ・ワンクリック適用ボタン）
- [x] ダッシュボード: 進化提案カードをグリッド中央カラムに追加（プロジェクトモニターパネルを置換）
- [x] server/skill-evolution.test.ts: calcSimilarityScoreのユニットテスト 9件追加（74テスト全通過）

## ダッシュボード充実化・修復派生バッジ・ドキュメント更新
- [x] ダッシュボード: 全情報集約型レイアウトに刷新（8統計カード+3ステータスパネル+3アクションパネル）
- [x] ダッシュボード: 修復(24h)・派生(24h)カードにツールチップで仕組みを説明
- [x] マイスキル: スキル一覧に新規（シアン）・修復済（緑）・派生（紫）の3種バッジを全4表示モードに追加
- [x] DBスキーマ: skills テーブルに badge カラム（new/repaired/derived/null）を追加・ALTER TABLE完了
- [x] evolution.getProposals等のpool.promise()エラーを$client直接使用に修正
- [x] 社内説明ドキュメント v3: ダッシュボード設計・修復派生の仕組み・バッジ仕様を追記

## v4設計方針 UI実装
- [x] DashboardLayout: メニューを5本に単純化（ダッシュボード・マイスキル・スキル広場・設定・管理者パネル）
- [x] DashboardLayout: Agent連携・Codeモニター・スキル系譜・ヘルスモニターのサブメニューを廃止
- [x] DashboardLayout: 設定サブメニューを「ユーザーアカウント・初期設定ウィザード・手動設定」の3項目に変更
- [x] DashboardLayout: 管理者パネルのサブメニューを「ユーザー管理・プラン管理・収益ダッシュボード」の3項目に変更
- [x] App.tsx: 廃止ページのルートを削除・新ルートを追加（/settings/wizard・/settings/manual・/settings/account・/admin/plans・/admin/revenue）
- [x] MySkills.tsx: 左2/3スキル一覧＋右1/3系譜グラフの統合レイアウトに刷新（ヘルスモニタータブ廃止）
- [x] MySkills.tsx: スキル選択時に右パネルの系譜グラフを更新・ヘルス情報をインライン表示
- [x] Community.tsx: 左パネル（ソース一覧＋手動追加ボタン）＋右パネル（スキル一覧）の統合レイアウトに刷新
- [x] UserSettings.tsx: 3サブページ構成に刷新（ユーザーアカウント・初期設定ウィザード・手動設定）
- [x] UserSettings.tsx: 初期設定ウィザード（5ステップ・修復派生説明込み・行き来可能）を実装
- [x] UserSettings.tsx: 手動設定ページに既存の連携設定をコンパクトに集約
- [x] AdminSettings.tsx: プラン管理・収益ダッシュボードのサブページを追加

## Step1 GitHub連携UI改修（マイスキル用/スキル広場用の2種類分離）
- [x] DB: user_settingsテーブルにpublicWatchAccounts（JSON配列）カラムを追加・マイグレーション（publicWatchListとして実装）
- [x] server/routers.ts: settings.savePublicWatchList エンドポイント実装（スキル広場用監視先リスト保存）
- [x] server/routers.ts: settings.getPublicWatchList エンドポイント実装（スキル広場用監視先リスト取得）
- [x] server/routers.ts: community.addSource を公開アカウント監視先リストからも呼び出せるよう拡張（savePublicWatchList内でskill_sourcesに自動登録）
- [x] UserSettings.tsx Step1: 「マイスキル用GitHubアカウント」セクション（アクセストークン・自分のリポジトリ）を上段に配置
- [x] UserSettings.tsx Step1: 「スキル広場用 監視先リスト」セクション（公開アカウント/リポジトリを複数登録・追加/削除UI）を下段に配置
- [x] UserSettings.tsx Step1: 監視先リストの保存時にskill_sourcesテーブルにも自動登録するロジックを実装
- [x] 設計方針書v5作成（Step1の2種類GitHub連携仕様を反映）

## v6 全機能実装

- [x] DBスキーマ: user_settingsにcrawl設定カラム追加（crawlEnabled, crawlIntervalHours, crawlKeywords, crawlSearchPath, crawlExcludeRepos, crawlMinStars, crawlMinForks, crawlMaxAgeDays, crawlMinSkillLength, crawlDuplicatePolicy, crawlLanguageFilter, crawlDailyLimit, crawlRankBy, crawlRateLimitProtection, crawlDuplicateWindowDays）
- [x] DBスキーマ: user_settingsにStep2/Step4設定値カラム追加（syncIntervalHours, syncBranch, evolutionSimilarityThreshold, evolutionCheckIntervalHours）
- [x] DBマイグレーション実行（ALTER TABLE）
- [x] API: settings.getCrawlSettings / saveCrawlSettings 追加
- [x] API: settings.getSyncSettings / saveSyncSettings 追加（Step2永続化）
- [x] API: settings.getEvolutionSettings / saveEvolutionSettings 追加（Step4永続化）
- [x] ウィザードUI: 7ステップ・2エリア構成に刷新（マイスキル設定Step1〜4 / スキル広場設定Step5〜7）
- [x] ウィザードUI: Step1をマイスキル用GitHubトークンのみに絞る（監視先リストをStep5に移動）
- [x] ウィザードUI: Step5に監視先リストを移動（Step1から分離）
- [x] ウィザードUI: Step6に回遊設定3セクション新規実装（クロール動作・スキル条件・取得条件）
- [x] ウィザードUI: Step2（同期スケジュール）の設定値をDBに保存
- [x] ウィザードUI: Step4（進化提案設定）の設定値をDBに保存
- [x] github-crawl.tsへの条件フィルター適用（crawlMinStars, crawlMinForks, crawlMaxAgeDays, crawlMinSkillLength, crawlDailyLimit, crawlRankBy等）
- [x] バッジ自動付与ロジック（スキル作成時→new, 修復完了時→repaired, 進化提案適用時→derived）

## バグ修正: 設定メニューで左メインメニューが消える問題

- [x] UserSettings.tsx: DashboardLayoutを使用して左メインメニューを常時表示（設定ページ内でDashboardLayoutを独自実装しているため消えている）
- [x] AdminSettings.tsx: 同様に確認（すでにDashboardLayoutを正しく使用済みのため修正不要）

## スコアバーグラフ追加

- [x] SkillScoreBar共通コンポーネントを作成（スコア値をバーグラフで視覚化）
- [x] MySkills.tsx: カード・リスト・グリッド全ビューにスコアバーを追加
- [x] Community.tsx: スキル広場のスキルカード全ビューにスコアバーを追加（既存実装済み）

## Agent連携復活・品質スコア計算根拠表示

- [x] UserSettings 手動設定: Agent連携セクション復活（GitHub取得・AIマージ・差分インポート・自動タグ付け・単体インポート・スマート起動・MCP設定の7項目をリンク/説明付きで表示）
- [x] 品質スコア計算ロジック: スコア構成要素（クロールランク50%・修復ボーナス30%・進化スコア20%）を調査・文書化
- [x] MySkills.tsx: スコアバーホバーでスコア構成要素・判定基準ツールチップを表示
- [x] Community.tsx: スコアバーホバーでスコア構成要素・判定基準ツールチップを表示

## Agent連携カードのリンク修正

- [x] App.tsxに /claude/:tab ルートを追加（ClaudeIntegration.tsxを登録）
- [x] UserSettings手動設定: GitHub取得カードを削除（別途実装済みのため）
- [x] UserSettings手動設定: 欙6項目のpathを /claude/:tab の正しいタブ名に修正（/claude/merge, /claude/diff, /claude/tags, /claude/single, /claude/smart, /claude/mcp）
