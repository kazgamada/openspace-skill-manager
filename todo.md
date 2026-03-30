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
- [ ] DashboardLayout.tsx: ナビを「ダッシュボード・マイスキル・スキル広場・スキル系譜・管理者パネル」の5本に整理
- [ ] DashboardLayout.tsx: 旧「ヘルスモニター・Claude連携・ストレージ・設定」メニュー項目を削除
- [ ] App.tsx: 旧ルート（/health, /claude, /storage, /settings, /admin-settings）を削除し新ルートに統合
- [ ] MySkills.tsx: ヘルスモニター機能（品質スコア・閾値・自動修復）をタブとして統合
- [ ] Community.tsx: GitHub連携状態（接続済み/未接続バナー）を画面上部に表示
- [ ] Genealogy.tsx: Claude連携状態（MCP接続状態）を画面上部に表示
- [ ] AdminPanel.tsx: 全設定を1ページに集約（アカウント・通知・外観・連携・ユーザー管理・システム設定・ログ監視）
- [ ] AdminPanel.tsx: 連携ウィザード（Claude/GitHub/Google Drive/ローカルフォルダー）を実装
- [ ] AdminPanel.tsx: 連携状況一覧（接続済み・最終テスト日時）を表示
- [ ] server/routers.ts: 連携設定の保存・取得ルーター（integrations）を追加
- [ ] drizzle/schema.ts: user_settingsテーブルにintegrations JSONカラムを追加
