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
- [ ] スキル説明30-40字: MySkills.tsx リスト表示の空きスペースに description を表示
- [ ] スキル説明30-40字: Community.tsx 各レイアウトの空きスペースに description を表示
- [ ] Newバッジ: 直近7日以内に同期・作成されたスキルに「New」バッジを表示（MySkills/Community両方）
- [ ] ソースリポジトリリンク: everything-claude-code 由来スキルカードに「元リポジトリを開く」ボタン追加
- [ ] 重複排除バックエンド: skills.create / community.install 時にタイトル+更新日時が一致する場合はエラー返却
- [ ] 重複排除バックエンド: 既存の重複レコードを一括削除する admin.deduplicateSkills ルーター追加
- [ ] 重複排除フロントエンド: インポート時に重複検出メッセージを表示してスキップ
- [ ] プロジェクトモニター通知バックエンド: claude.monitorProject ルーター（プロジェクト情報→スキル推薦→通知保存）
- [ ] プロジェクトモニター通知フロントエンド: Dashboard.tsx に「推薦スキル通知」カードを表示
- [ ] Agent連携サブナビ: DashboardLayout.tsx の「Agent連携」を第2階層メニューに変換（GitHub取得・AIマージ・差分インポート・自動タグ付け・単体インポート・スマート起動・MCP設定）
- [ ] Agent連携サブナビ: ClaudeIntegration.tsx をサブナビ対応（URL パスで各タブに直接遷移）

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
