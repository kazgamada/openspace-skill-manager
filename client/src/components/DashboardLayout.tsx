import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { useIsMobile } from "@/hooks/useMobile";
import {
  Activity,
  Brain,
  ChevronDown,
  ChevronRight,
  Cpu,
  Database,
  GitBranch,
  GitMerge,
  Github,
  LayoutDashboard,
  Link2,
  LogOut,
  PanelLeft,
  Settings,
  Shield,
  Sparkles,
  Store,
  Tag,
  Upload,
  UserCircle,
  Users,
  Wand2,
  Zap,
  Monitor,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Badge } from "./ui/badge";

// ─── マニュアルテキスト定義 ──────────────────────────────────────────────────

interface ManualInfo {
  title: string;
  description: string;
  tips?: string[];
}

const MANUAL_MAP: Record<string, ManualInfo> = {
  "/dashboard": {
    title: "ダッシュボード",
    description: "スキル全体の状況を一覧で把握できるホーム画面です。スキル数・ヘルス状態・最近の活動・推薦スキルなどを確認できます。",
    tips: ["スキルの品質スコアが低い場合はアラートが表示されます", "推薦スキルカードから新しいスキルを発見できます"],
  },
  "/skills": {
    title: "マイスキル › スキル一覧",
    description: "自分が登録・管理しているスキルの一覧です。スキルの作成・編集・削除・バージョン管理・スキル広場への公開ができます。",
    tips: ["右上のレイアウト切り替えでリスト/タイル表示を変更できます", "スキルカードをクリックすると詳細・バージョン履歴を確認できます", "「＋新規スキル」ボタンで新しいスキルを作成できます"],
  },
  "/skills/health": {
    title: "マイスキル › ヘルスモニター",
    description: "各スキルの品質スコア・実行成功率・最終使用日などを監視します。スコアが低いスキルを特定して改善できます。",
    tips: ["品質スコアは実行ログと手動評価から自動計算されます", "閾値を設定するとスコア低下時に通知が届きます"],
  },
  "/community": {
    title: "スキル広場 › スキル一覧",
    description: "コミュニティやGitHubリポジトリから同期されたスキルを検索・閲覧・インストールできます。",
    tips: ["検索バーでスキル名・説明・タグを横断検索できます", "「インストール」でマイスキルに追加できます", "「New」バッジは直近7日以内に追加されたスキルです"],
  },
  "/community/sources": {
    title: "スキル広場 › ソース管理",
    description: "スキルの自動同期元となるGitHubリポジトリを管理します。登録したリポジトリから定期的にSKILL.mdを取得します。",
    tips: ["「＋ソース追加」でGitHubリポジトリURLを登録できます", "自動同期の間隔（時間）を設定できます", "「手動同期」で即時に最新スキルを取得できます"],
  },
  "/genealogy": {
    title: "スキル系譜",
    description: "スキルの派生・継承関係をDAGグラフで可視化します。どのスキルがどのスキルから派生したかを追跡できます。",
    tips: ["ノードをクリックするとスキル詳細が表示されます", "ズームイン/アウトでグラフを拡大縮小できます"],
  },
  "/claude/github": {
    title: "Agent連携 › GitHub取得",
    description: "GitHubの公開リポジトリからSKILL.mdファイルを自動検出・一括インポートします。人気リポジトリのクイック選択も利用できます。",
    tips: ["リポジトリURLを入力してSKILL.md一覧を取得できます", "チェックボックスで複数スキルを選択して一括インポートできます"],
  },
  "/claude/merge": {
    title: "Agent連携 › AIマージ",
    description: "複数のSKILL.mdをAI（LLM）が分析し、重複を排除しながら品質の高い1つのスキルに統合します。",
    tips: ["マージしたいSKILL.mdのテキストを複数貼り付けてください", "AIが自動でベストな組み合わせを生成します"],
  },
  "/claude/diff": {
    title: "Agent連携 › 差分インポート",
    description: "既存スキルの改良版を新しいバージョンとして登録します。バージョン履歴を保持しながらスキルを更新できます。",
    tips: ["既存スキルを選択してから新しいSKILL.mdを貼り付けてください", "変更差分がバージョン履歴に記録されます"],
  },
  "/claude/tags": {
    title: "Agent連携 › 自動タグ付け",
    description: "SKILL.mdのallowed-toolsフィールドを解析して、適切なタグを自動生成・付与します。",
    tips: ["SKILL.mdを貼り付けるとタグ候補が表示されます", "タグを確認・編集してからインポートできます"],
  },
  "/claude/single": {
    title: "Agent連携 › 単体インポート",
    description: "SKILL.mdのテキストを直接貼り付けてスキルを登録します。ファイルアップロードにも対応しています。",
    tips: ["テキストエリアにSKILL.mdの内容を貼り付けてください", "インポート前にプレビューで内容を確認できます"],
  },
  "/claude/smart": {
    title: "Agent連携 › スマート起動",
    description: "キーワード・言語・タスク種別を入力すると、最適なスキルをBM25スコアリングで自動推薦します。",
    tips: ["タスクの概要を自然言語で入力してください", "推薦されたスキルのSKILL.mdをコピーしてClaudeに渡せます"],
  },
  "/claude/mcp": {
    title: "Agent連携 › MCP設定",
    description: "Claude Codeで使用する~/.claude.json用のMCP設定JSONとオーケストレーターSKILL.mdを自動生成します。",
    tips: ["生成された設定をコピーして~/.claude.jsonに追加してください", "オーケストレーターSKILL.mdをClaudeのスキルとして登録できます"],
  },
  "/settings/integrations": {
    title: "設定 › 連携",
    description: "Claude・GitHub・Google Driveなど外部サービスとの連携を設定します。APIキーやアクセストークンを安全に管理できます。",
    tips: ["連携を設定するとスキルの自動同期や実行が有効になります", "接続テストで設定が正しいか確認できます"],
  },
  "/admin/account": {
    title: "管理者パネル › アカウント",
    description: "管理者自身のアカウント情報・プロフィール・通知設定を管理します。",
    tips: ["メールアドレスはログインIDとして使用されます"],
  },
  "/admin/users": {
    title: "管理者パネル › ユーザー管理",
    description: "登録ユーザーの一覧表示・ロール変更・アカウント管理を行います。ユーザーをadminに昇格させることもできます。",
    tips: ["ユーザーのroleをadminに変更すると管理者権限が付与されます", "シードデータの投入もここから実行できます"],
  },
  "/admin/system": {
    title: "管理者パネル › システム",
    description: "システム全体の設定・ログ監視・パフォーマンス管理を行います。スキル同期スケジューラーの状態も確認できます。",
    tips: ["エラーログを確認して問題を早期発見できます", "自動同期スケジューラーの有効/無効を切り替えられます"],
  },
  "/settings": {
    title: "設定",
    description: "外部サービスとの連携設定を管理します。Claude・GitHub・Google Driveなどの接続情報を安全に保管できます。",
    tips: ["連携を設定するとスキルの自動同期や実行が有効になります"],
  },
  "/admin": {
    title: "管理者パネル",
    description: "アカウント管理・ユーザー管理・システム設定など管理者専用の機能にアクセスできます。",
    tips: ["管理者ロールを持つユーザーのみ表示されます"],
  },
};

// ─── ホバーマニュアルパネル ──────────────────────────────────────────────────

function ManualTooltip({
  manual,
  visible,
  anchorRef,
}: {
  manual: ManualInfo;
  visible: boolean;
  anchorRef: React.RefObject<HTMLElement>;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const panelWidth = 288; // w-72
    const panelHeight = panelRef.current?.offsetHeight ?? 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    // 左側に配置するか右側に配置するか（サイドバー幅を考慮）
    let left = rect.right + 8;
    if (left + panelWidth > viewportWidth - 8) {
      left = rect.left - panelWidth - 8;
    }
    if (left < 8) left = 8;
    let top = rect.top;
    if (top + panelHeight > viewportHeight - 16) {
      top = viewportHeight - panelHeight - 16;
    }
    if (top < 8) top = 8;
    setPos({ top, left });
  }, [visible, anchorRef]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[9999] w-72 rounded-xl border border-sidebar-border bg-popover/95 backdrop-blur-sm shadow-2xl p-4 pointer-events-none"
      style={{ left: pos.left, top: pos.top }}
    >
      <p className="text-xs font-semibold text-primary mb-1.5">{manual.title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-2">{manual.description}</p>
      {manual.tips && manual.tips.length > 0 && (
        <div className="space-y-1 border-t border-border/50 pt-2 mt-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">ヒント</p>
          {manual.tips.map((tip, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <span className="text-primary text-[10px] mt-0.5 shrink-0">›</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── マニュアル付きメニューボタンラッパー ────────────────────────────────────

function MenuItemWithManual({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const manual = MANUAL_MAP[path];

  if (!manual) return <>{children}</>;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative"
    >
      {children}
      <ManualTooltip
        manual={manual}
        visible={hovered}
        anchorRef={ref as React.RefObject<HTMLElement>}
      />
    </div>
  );
}

// ─── Navigation structure (v4: 5本メニュー) ─────────────────────────────────
// v4設計方针: ダッシュボード・マイスキル・スキル広場・設定・管理者パネル
// Agent連携・ Codeモニター・スキル系譜(サイドバー)は廃止

// 設定サブメニュー（v7: ユーザーアカウント・初期設定・手動設定）
const userSettingsSubItems = [
  { icon: UserCircle, label: "ユーザーアカウント", path: "/settings/account" },
  { icon: Wand2,      label: "初期設定",           path: "/settings/integrations/github" },
  { icon: Cpu,        label: "手動設定",           path: "/settings/manual" },
];

// 管理者パネルサブメニュー（v4: ユーザー情報・ロール管理・プラン管理・収益ダッシュボード）
const adminSubItems = [
  { icon: Users,    label: "ユーザー・ロール管理", path: "/admin/users" },
  { icon: Shield,   label: "プラン管理",           path: "/admin/plans" },
  { icon: Activity, label: "収益ダッシュボード",   path: "/admin/revenue" },
];

const SIDEBAR_WIDTH_KEY = "osm-sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 180;
const MAX_WIDTH = 320;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString()); } catch {}
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  // 未ログインでもダッシュボードを表示する（認証不要モード）
  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

// ─── サブメニュー展開コンポーネント ────────────────────────────────────────
function SubMenu({
  isOpen,
  items,
  location,
  setLocation,
}: {
  isOpen: boolean;
  items: { icon: React.ElementType; label: string; path: string }[];
  location: string;
  setLocation: (path: string) => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="ml-3 pl-3 border-l border-sidebar-border/60 mt-0.5 mb-0.5 space-y-0.5">
      {items.map((sub) => {
        const isSubActive = location === sub.path || location.startsWith(sub.path + "/");
        return (
          <MenuItemWithManual key={sub.path} path={sub.path}>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isSubActive}
                onClick={() => setLocation(sub.path)}
                className="h-8 font-normal text-xs"
              >
                <sub.icon className={`h-3.5 w-3.5 ${isSubActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs">{sub.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </MenuItemWithManual>
        );
      })}
    </div>
  );
}

// ─── 展開可能な親メニューアイテム ─────────────────────────────────────────
function ExpandableMenuItem({
  icon: Icon,
  label,
  isActive,
  isOpen,
  isCollapsed,
  defaultPath,
  onToggle,
  tooltip,
  manualPath,
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isOpen: boolean;
  isCollapsed: boolean;
  defaultPath: string;
  onToggle: () => void;
  tooltip: string;
  manualPath?: string;
}) {
  const [, setLocation] = useLocation();
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const manual = manualPath ? MANUAL_MAP[manualPath] : undefined;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative"
    >
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActive}
          onClick={() => {
            if (isCollapsed) {
              setLocation(defaultPath);
            } else {
              onToggle();
            }
          }}
          tooltip={tooltip}
          className="h-9 font-normal"
        >
          <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-sm flex-1">{label}</span>
          {!isCollapsed && (
            isOpen
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
      {manual && (
        <ManualTooltip
          manual={manual}
          visible={hovered}
          anchorRef={ref as React.RefObject<HTMLElement>}
        />
      )}
    </div>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user: authUser, logout } = useAuth();
  // 未ログイン時はゲストユーザーとして扱う
  const user = authUser ?? { name: "ゲスト", email: "", role: "guest" as const, id: 0, openId: "" };
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isAdmin = authUser?.role === "admin";

  // 各セクションの展開状態 (v4: Agent連携・ Claudeモニター廃止)
  const isSkillsActive = location.startsWith("/skills");
  const isCommunityActive = location.startsWith("/community");
  const isSettingsActive = location.startsWith("/settings");
  const isAdminActive = location.startsWith("/admin");

  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);
  const [adminOpen, setAdminOpen] = useState(isAdminActive);

  // ページ遷移で自動展開
  useEffect(() => {
    if (isSettingsActive) setSettingsOpen(true);
    if (isAdminActive) setAdminOpen(true);
  }, [isSettingsActive, isAdminActive]);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - left;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);
  // アクティブラベル（モバイルヘッダー用） (v7: 5本メニュー)
  const allPaths = [
    { path: "/dashboard", label: "ダッシュボード" },
    { path: "/skills", label: "マイスキル" },
    { path: "/community", label: "スキル広場" },
    { path: "/settings/account", label: "ユーザーアカウント" },
    { path: "/settings/integrations", label: "初期設定" },
    { path: "/settings/wizard", label: "初期設定" },
    { path: "/settings/manual", label: "手動設定" },
    { path: "/settings", label: "設定" },
    { path: "/admin/users", label: "ユーザー・ロール管理" },
    { path: "/admin/plans", label: "プラン管理" },
    { path: "/admin/revenue", label: "収益ダッシュボード" },
    { path: "/admin", label: "管理者パネル" },
  ];
  const activeItem = allPaths.find((item) => location.startsWith(item.path));

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-sidebar-border" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-2.5 px-2">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors shrink-0"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="font-semibold text-sm tracking-tight truncate gradient-text">OSM</span>
                  {isAdmin && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary shrink-0">
                      Admin
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent className="gap-0 py-2">
            <SidebarMenu className="px-2">

              {/* ダッシュボード */}
              <MenuItemWithManual path="/dashboard">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location === "/dashboard" || location === "/"}
                    onClick={() => setLocation("/dashboard")}
                    tooltip="ダッシュボード"
                    className="h-9 font-normal"
                  >
                    <LayoutDashboard className={`h-4 w-4 ${(location === "/dashboard" || location === "/") ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm">ダッシュボード</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </MenuItemWithManual>

              {/* ─── マイスキル（直接リンク）─── */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isSkillsActive}
                  onClick={() => setLocation("/skills")}
                  tooltip="マイスキル"
                  className="h-9 font-normal"
                >
                  <Brain className={`h-4 w-4 ${isSkillsActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm">マイスキル</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* ─── スキル広場（直接リンク）─── */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isCommunityActive}
                  onClick={() => setLocation("/community")}
                  tooltip="スキル広場"
                  className="h-9 font-normal"
                >
                  <Store className={`h-4 w-4 ${isCommunityActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm">スキル広場</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* ─── 設定（展開可能）─── */}
              {!isCollapsed && (
                <div className="px-2 pt-4 pb-1">
                  <div className="h-px bg-sidebar-border mb-3" />
                </div>
              )}

              {/* 設定 親ボタン */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isSettingsActive}
                  onClick={() => {
                    if (isCollapsed) {
                      setLocation("/settings/account");
                    } else {
                      setSettingsOpen((v) => !v);
                      if (!settingsOpen) setLocation("/settings/account");
                    }
                  }}
                  tooltip="設定"
                  className="h-9 font-normal"
                >
                  <Settings className={`h-4 w-4 ${isSettingsActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm flex-1">設定</span>
                  {!isCollapsed && (
                    settingsOpen
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 設定 サブメニュー (v4: ユーザーアカウント・初期設定ウィザード・手動設定) */}
              {!isCollapsed && settingsOpen && (
                <SubMenu
                  isOpen={settingsOpen}
                  items={userSettingsSubItems}
                  location={location}
                  setLocation={setLocation}
                />
              )}

              {/* ─── 管理者セクション ─── */}
              {isAdmin && (
                <>
                  {!isCollapsed && (
                    <div className="px-2 pt-4 pb-1">
                      <div className="h-px bg-sidebar-border mb-3" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        管理者
                      </p>
                    </div>
                  )}

                  {/* 管理者パネル 親ボタン (v4) */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isAdminActive}
                      onClick={() => {
                        if (isCollapsed) {
                          setLocation("/admin/users");
                        } else {
                          setAdminOpen((v) => !v);
                          if (!adminOpen) setLocation("/admin/users");
                        }
                      }}
                      tooltip="管理者パネル"
                      className="h-9 font-normal"
                    >
                      <Shield className={`h-4 w-4 ${isAdminActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm flex-1">管理者パネル</span>
                      {!isCollapsed && (
                        adminOpen
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* 管理者パネル サブメニュー */}
                  {!isCollapsed && adminOpen && (
                    <SubMenu
                      isOpen={adminOpen}
                      items={adminSubItems}
                      location={location}
                      setLocation={setLocation}
                    />
                  )}
                </>
              )}

            </SidebarMenu>
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-2 border-t border-sidebar-border">
            {!authUser ? (
              /* 未ログイン時はログインボタン */
              <button
                onClick={() => { window.location.href = "/login"; }}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none"
              >
                <Avatar className="h-7 w-7 border border-border shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">
                    ?
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-primary">ログイン</p>
                    <p className="text-[10px] text-muted-foreground truncate">クリックしてログイン</p>
                  </div>
                )}
              </button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                    <Avatar className="h-7 w-7 border border-border shrink-0">
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                        {user?.name?.charAt(0).toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{user?.name || "ユーザー"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{user?.email || ""}</p>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      </>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/settings/integrations")} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    設定
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => setLocation("/admin/account")} className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      管理者パネル
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors"
            style={{ zIndex: 50 }}
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-border h-12 items-center px-3 bg-background/95 backdrop-blur sticky top-0 z-40">
            <SidebarTrigger className="h-8 w-8 rounded-lg" />
            <span className="ml-3 text-sm font-medium">{activeItem?.label ?? "OSM"}</span>
          </div>
        )}
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </>
  );
}
