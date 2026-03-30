/**
 * AdminSettings.tsx
 * 管理者パネル — URLパス連動型（上部タブなし）
 *
 * /admin/account  → アカウント（プロフィール + 通知 + 外観 統合）
 * /admin/users    → ユーザー管理
 * /admin/system   → システム設定・ログ監視
 * /admin          → /admin/account へリダイレクト
 */
import { useState, useEffect } from "react";
import { useLocation, useRoute, Redirect } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Activity, AlertCircle, Bell, CheckCircle2, Cpu, Database,
  Eye, EyeOff, FileText, FolderOpen, HardDrive, Loader2,
  LogOut, Moon, Palette, Save, Search, Settings, Shield,
  Sun, Trash2, User, UserCircle, Users, Zap,
} from "lucide-react";

// ─── Route detection ──────────────────────────────────────────────────────────
type AdminSection = "account" | "users" | "system";

function useAdminSection(): AdminSection {
  const [onAccount] = useRoute("/admin/account");
  const [onUsers]   = useRoute("/admin/users");
  const [onSystem]  = useRoute("/admin/system");
  if (onUsers)  return "users";
  if (onSystem) return "system";
  return "account"; // /admin も account 扱い
}

// ─── Section title/icon map ───────────────────────────────────────────────────
const SECTION_META: Record<AdminSection, { title: string; desc: string; Icon: React.ElementType }> = {
  account: { title: "アカウント設定", desc: "プロフィール・通知・外観の設定", Icon: UserCircle },
  users:   { title: "ユーザー管理",   desc: "登録ユーザーの管理と権限設定",   Icon: Users },
  system:  { title: "システム設定",   desc: "システム監視・ログ・メンテナンス", Icon: Cpu },
};

// ─── Root component ───────────────────────────────────────────────────────────
export default function AdminSettings() {
  const { user, loading } = useAuth();
  const section = useAdminSection();
  const [onAdmin] = useRoute("/admin");

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // /admin → /admin/account へリダイレクト
  if (onAdmin) return <Redirect to="/admin/account" />;

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Shield className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">管理者権限が必要です</p>
        </div>
      </DashboardLayout>
    );
  }

  const { title, desc, Icon } = SECTION_META[section];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
          <Badge variant="outline" className="ml-auto border-primary/40 text-primary text-xs">
            <Shield className="w-3 h-3 mr-1" />管理者
          </Badge>
        </div>

        {section === "account" && <AccountSection />}
        {section === "users"   && <UsersSection />}
        {section === "system"  && <SystemSection />}
      </div>
    </DashboardLayout>
  );
}

// ─── Account Section ──────────────────────────────────────────────────────────
// プロフィール + 通知 + 外観 を1画面に統合
function AccountSection() {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name ?? "");

  const prefQuery = trpc.settings.getPreferences.useQuery();
  const updatePref = trpc.settings.updatePreferences.useMutation({
    onSuccess: () => toast.success("設定を保存しました"),
    onError: (e) => toast.error(e.message),
  });
  const updateAccount = trpc.settings.update.useMutation({
    onSuccess: () => toast.success("アカウント情報を更新しました"),
    onError: (e) => toast.error(e.message),
  });

  const prefs = prefQuery.data;

  return (
    <div className="space-y-5">
      {/* ── プロフィール ── */}
      <Card className="card-glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />プロフィール
          </CardTitle>
          <CardDescription className="text-xs">表示名・メールアドレスを管理します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {(user?.name ?? "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user?.name ?? "未設定"}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <Badge variant="outline" className="mt-1 text-xs border-primary/40 text-primary">
                <Shield className="w-3 h-3 mr-1" />管理者
              </Badge>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">表示名</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="表示名を入力"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">メールアドレス</Label>
              <Input value={user?.email ?? ""} disabled className="h-8 text-sm opacity-60" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => updateAccount.mutate({ displayName })}
              disabled={updateAccount.isPending}
              className="gap-1.5"
            >
              {updateAccount.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              保存
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <LogOut className="w-3.5 h-3.5" />ログアウト
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 外観 ── */}
      <Card className="card-glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />外観
          </CardTitle>
          <CardDescription className="text-xs">テーマ・言語を設定します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">テーマ</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "dark",   label: "ダーク",    Icon: Moon,     preview: "bg-zinc-900 border-zinc-700" },
                { value: "light",  label: "ライト",    Icon: Sun,      preview: "bg-white border-zinc-200" },
                { value: "system", label: "システム",  Icon: Settings, preview: "bg-gradient-to-r from-zinc-900 to-white border-zinc-400" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => updatePref.mutate({ theme: t.value })}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    (prefs?.theme ?? "dark") === t.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`h-7 w-full rounded-md mb-2 border ${t.preview}`} />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">言語</Label>
            <Select
              value={prefs?.language ?? "ja"}
              onValueChange={(v) => updatePref.mutate({ language: v })}
            >
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── 通知 ── */}
      <Card className="card-glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />通知設定
          </CardTitle>
          <CardDescription className="text-xs">どのイベントで通知を受け取るか設定します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "notifyOnRepair",      label: "自動修復通知",     desc: "スキルが自動修復されたときに通知" },
            { key: "notifyOnDegradation", label: "品質劣化アラート", desc: "品質スコアが閾値を下回ったときに通知" },
            { key: "notifyOnCommunity",   label: "コミュニティ更新", desc: "フォロー中のスキルが更新されたときに通知" },
            { key: "emailDigest",         label: "メールダイジェスト", desc: "週次サマリーをメールで受け取る" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={(prefs as Record<string, boolean> | undefined)?.[key] ?? false}
                onCheckedChange={(v) => updatePref.mutate({ [key]: v })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Users Section ────────────────────────────────────────────────────────────
function UsersSection() {
  const [search, setSearch] = useState("");
  const usersQuery = trpc.admin.users.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("ロールを更新しました"); usersQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (usersQuery.data ?? []).filter((u) =>
    (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="名前・メールで検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* User list */}
      <Card className="card-glass">
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground">ユーザーが見つかりません</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {(u.name ?? u.email ?? "U")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name ?? "名前未設定"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={u.role}
                      onValueChange={(role) =>
                        updateRole.mutate({ userId: u.id, role: role as "user" | "admin" })
                      }
                    >
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">ユーザー</SelectItem>
                        <SelectItem value="admin">管理者</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        u.role === "admin"
                          ? "border-primary/40 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {u.role === "admin" ? "管理者" : "ユーザー"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />合計 {usersQuery.data?.length ?? 0} ユーザー
      </p>
    </div>
  );
}

// ─── System Section ───────────────────────────────────────────────────────────
function SystemSection() {
  const [showLogs, setShowLogs] = useState(false);
  const logsQuery  = trpc.admin.systemLogs.useQuery(undefined, { enabled: showLogs });
  const skillsQuery = trpc.admin.allSkills.useQuery();
  const usersQuery  = trpc.admin.users.useQuery();
  const seedData = trpc.admin.seedData.useMutation({
    onSuccess: () => toast.success("デモデータを投入しました"),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "総スキル数",    value: skillsQuery.data?.length ?? "—", Icon: Zap,      color: "text-primary" },
          { label: "登録ユーザー数", value: usersQuery.data?.length ?? "—",  Icon: Users,    color: "text-blue-400" },
          { label: "実行ログ数",    value: logsQuery.data?.length ?? "—",   Icon: Activity, color: "text-emerald-400" },
        ].map(({ label, value, Icon, color }) => (
          <Card key={label} className="card-glass">
            <CardContent className="p-4 flex flex-col gap-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Maintenance */}
      <Card className="card-glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />メンテナンス
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium">デモデータ投入</p>
              <p className="text-xs text-muted-foreground">サンプルスキルと実行ログを生成します</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedData.mutate()}
              disabled={seedData.isPending}
              className="h-8 text-xs gap-1.5"
            >
              {seedData.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              投入
            </Button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">システムログ</p>
              <p className="text-xs text-muted-foreground">最近のシステムイベントを表示します</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogs((v) => !v)}
              className="h-8 text-xs gap-1.5"
            >
              {showLogs ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showLogs ? "非表示" : "表示"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      {showLogs && (
        <Card className="card-glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />実行ログ（直近）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto font-mono text-xs">
                {(logsQuery.data ?? []).length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">ログがありません</p>
                ) : (
                  (logsQuery.data ?? []).map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start gap-2 px-2 py-1.5 rounded ${
                        log.status === "success" ? "bg-emerald-500/5" : "bg-destructive/5"
                      }`}
                    >
                      {log.status === "success"
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                        : <AlertCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <span className="text-muted-foreground">
                          {new Date(log.executedAt).toLocaleString("ja-JP")}{" "}
                        </span>
                        <span className="text-foreground/80">
                          Skill#{log.skillId}
                        </span>
                        {log.errorMessage && (
                          <p className="text-destructive/80 truncate">{log.errorMessage}</p>
                        )}
                      </div>
                      <span className="text-muted-foreground/60 shrink-0">
                        {log.executionTime != null ? `${log.executionTime.toFixed(2)}s` : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danger zone */}
      <Card className="card-glass border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />危険な操作
          </CardTitle>
          <CardDescription className="text-xs">これらの操作は元に戻せません</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">全ログを削除</p>
              <p className="text-xs text-muted-foreground">全ての実行ログを完全に削除します</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => toast.error("この操作は現在無効化されています")}
            >
              <Trash2 className="w-3.5 h-3.5" />削除
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
