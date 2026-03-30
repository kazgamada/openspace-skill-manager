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
import { getLoginUrl } from "@/const";
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
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

// ─── Navigation structure ───────────────────────────────────────────────────

// マイスキルのサブメニュー
const mySkillsSubItems = [
  { icon: Brain,    label: "スキル一覧",     path: "/skills" },
  { icon: Activity, label: "ヘルスモニター", path: "/skills/health" },
];

// スキル広場のサブメニュー
const communitySubItems = [
  { icon: Store,    label: "スキル一覧",   path: "/community" },
  { icon: Database, label: "ソース管理",   path: "/community/sources" },
];

// Agent連携のサブメニュー
const claudeSubItems = [
  { icon: Github,   label: "GitHub取得",   path: "/claude/github" },
  { icon: GitMerge, label: "AIマージ",     path: "/claude/merge" },
  { icon: GitBranch,label: "差分インポート", path: "/claude/diff" },
  { icon: Tag,      label: "自動タグ付け", path: "/claude/tags" },
  { icon: Upload,   label: "単体インポート", path: "/claude/single" },
  { icon: Sparkles, label: "スマート起動", path: "/claude/smart" },
  { icon: Wand2,    label: "MCP設定",      path: "/claude/mcp" },
];

// ユーザー用「設定」サブメニュー
const userSettingsSubItems = [
  { icon: Link2, label: "連携", path: "/settings/integrations" },
];

// 管理者パネルのサブメニュー
const adminSubItems = [
  { icon: UserCircle, label: "アカウント",   path: "/admin/account" },
  { icon: Users,      label: "ユーザー管理", path: "/admin/users" },
  { icon: Cpu,        label: "システム",     path: "/admin/system" },
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-sm w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center glow-primary">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold gradient-text">OpenSpace</h1>
              <p className="text-sm text-muted-foreground mt-1">Skill Manager</p>
            </div>
          </div>
          <div className="w-full space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              スキルの進化を管理・追跡するプラットフォームです
            </p>
            <Button
              onClick={() => { window.location.href = getLoginUrl(); }}
              size="lg"
              className="w-full glow-primary"
            >
              ログインして始める
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
          <SidebarMenuItem key={sub.path}>
            <SidebarMenuButton
              isActive={isSubActive}
              onClick={() => setLocation(sub.path)}
              className="h-8 font-normal text-xs"
            >
              <sub.icon className={`h-3.5 w-3.5 ${isSubActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs">{sub.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isOpen: boolean;
  isCollapsed: boolean;
  defaultPath: string;
  onToggle: () => void;
  tooltip: string;
}) {
  const [, setLocation] = useLocation();
  return (
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
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isAdmin = user?.role === "admin";

  // 各セクションの展開状態
  const isSkillsActive = location.startsWith("/skills");
  const isCommunityActive = location.startsWith("/community");
  const isClaudeActive = location.startsWith("/claude");
  const isSettingsActive = location.startsWith("/settings");
  const isAdminActive = location.startsWith("/admin");

  const [skillsOpen, setSkillsOpen] = useState(isSkillsActive);
  const [communityOpen, setCommunityOpen] = useState(isCommunityActive);
  const [claudeOpen, setClaudeOpen] = useState(isClaudeActive);
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);
  const [adminOpen, setAdminOpen] = useState(isAdminActive);

  // ページ遷移で自動展開
  useEffect(() => {
    if (isSkillsActive) setSkillsOpen(true);
    if (isCommunityActive) setCommunityOpen(true);
    if (isClaudeActive) setClaudeOpen(true);
    if (isSettingsActive) setSettingsOpen(true);
    if (isAdminActive) setAdminOpen(true);
  }, [isSkillsActive, isCommunityActive, isClaudeActive, isSettingsActive, isAdminActive]);

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

  // アクティブラベル（モバイルヘッダー用）
  const allPaths = [
    { path: "/dashboard", label: "ダッシュボード" },
    { path: "/skills/health", label: "ヘルスモニター" },
    { path: "/skills", label: "マイスキル" },
    { path: "/community/sources", label: "ソース管理" },
    { path: "/community", label: "スキル広場" },
    { path: "/genealogy", label: "スキル系譜" },
    { path: "/claude/github", label: "GitHub取得" },
    { path: "/claude/merge", label: "AIマージ" },
    { path: "/claude/diff", label: "差分インポート" },
    { path: "/claude/tags", label: "自動タグ付け" },
    { path: "/claude/single", label: "単体インポート" },
    { path: "/claude/smart", label: "スマート起動" },
    { path: "/claude/mcp", label: "MCP設定" },
    { path: "/claude", label: "Agent連携" },
    { path: "/settings", label: "設定" },
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

              {/* ─── マイスキル（展開可能）─── */}
              <ExpandableMenuItem
                icon={Brain}
                label="マイスキル"
                isActive={isSkillsActive}
                isOpen={skillsOpen}
                isCollapsed={isCollapsed}
                defaultPath="/skills"
                onToggle={() => setSkillsOpen((v) => !v)}
                tooltip="マイスキル"
              />
              {!isCollapsed && (
                <SubMenu
                  isOpen={skillsOpen}
                  items={mySkillsSubItems}
                  location={location}
                  setLocation={setLocation}
                />
              )}

              {/* ─── スキル広場（展開可能）─── */}
              <ExpandableMenuItem
                icon={Store}
                label="スキル広場"
                isActive={isCommunityActive}
                isOpen={communityOpen}
                isCollapsed={isCollapsed}
                defaultPath="/community"
                onToggle={() => setCommunityOpen((v) => !v)}
                tooltip="スキル広場"
              />
              {!isCollapsed && (
                <SubMenu
                  isOpen={communityOpen}
                  items={communitySubItems}
                  location={location}
                  setLocation={setLocation}
                />
              )}

              {/* スキル系譜 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.startsWith("/genealogy")}
                  onClick={() => setLocation("/genealogy")}
                  tooltip="スキル系譜"
                  className="h-9 font-normal"
                >
                  <GitBranch className={`h-4 w-4 ${location.startsWith("/genealogy") ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm">スキル系譜</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* ─── Agent連携（展開可能）─── */}
              <ExpandableMenuItem
                icon={Sparkles}
                label="Agent連携"
                isActive={isClaudeActive}
                isOpen={claudeOpen}
                isCollapsed={isCollapsed}
                defaultPath="/claude/github"
                onToggle={() => setClaudeOpen((v) => !v)}
                tooltip="Agent連携"
              />
              {!isCollapsed && (
                <SubMenu
                  isOpen={claudeOpen}
                  items={claudeSubItems}
                  location={location}
                  setLocation={setLocation}
                />
              )}

              {/* ─── 設定（ユーザー用）+ サブメニュー ─── */}
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
                      setLocation("/settings/integrations");
                    } else {
                      setSettingsOpen((v) => !v);
                      if (!settingsOpen) setLocation("/settings/integrations");
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

              {/* 設定 サブメニュー */}
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

                  {/* 管理者パネル 親ボタン */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isAdminActive}
                      onClick={() => {
                        if (isCollapsed) {
                          setLocation("/admin/account");
                        } else {
                          setAdminOpen((v) => !v);
                          if (!adminOpen) setLocation("/admin/account");
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
