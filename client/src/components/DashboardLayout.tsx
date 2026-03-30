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
  Brain,
  ChevronDown,
  ChevronRight,
  GitBranch,
  LayoutDashboard,
  Link2,
  LogOut,
  PanelLeft,
  Settings,
  Shield,
  Store,
  Users,
  Cpu,
  UserCircle,
  Zap,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

// ─── Navigation structure ───────────────────────────────────────────────────
const coreMenuItems = [
  { icon: LayoutDashboard, label: "ダッシュボード", path: "/dashboard" },
  { icon: Brain,           label: "マイスキル",     path: "/skills" },
  { icon: Store,           label: "スキル広場",     path: "/community" },
  { icon: GitBranch,       label: "スキル系譜",     path: "/genealogy" },
];

// ユーザー用「設定」サブメニュー
const userSettingsSubItems = [
  { icon: Link2,       label: "連携",     path: "/settings/integrations" },
];

// 管理者パネルのサブメニュー
const adminSubItems = [
  { icon: UserCircle,  label: "アカウント", path: "/admin/account" },
  { icon: Users,       label: "ユーザー管理", path: "/admin/users" },
  { icon: Cpu,         label: "システム",   path: "/admin/system" },
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

  // 「設定」サブメニューの展開状態
  const isSettingsActive = location.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  // 「管理者パネル」サブメニューの展開状態
  const isAdminActive = location.startsWith("/admin");
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

  // アクティブラベル（モバイルヘッダー用）
  const allPaths = [
    ...coreMenuItems,
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

              {/* Core 4 items */}
              {coreMenuItems.map((item) => {
                const isActive = location.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-9 font-normal"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

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

              {/* 設定 サブメニュー（連携のみ） */}
              {!isCollapsed && settingsOpen && (
                <div className="ml-3 pl-3 border-l border-sidebar-border/60 mt-0.5 mb-0.5 space-y-0.5">
                  {userSettingsSubItems.map((sub) => {
                    const isSubActive = location.startsWith(sub.path);
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
                    <div className="ml-3 pl-3 border-l border-sidebar-border/60 mt-0.5 mb-0.5 space-y-0.5">
                      {adminSubItems.map((sub) => {
                        const isSubActive = location.startsWith(sub.path);
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
