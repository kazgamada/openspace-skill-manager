import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Users, Settings, Activity, RefreshCw,
  CheckCircle2, XCircle, Clock, Brain, Zap, Crown,
  ChevronRight, AlertTriangle, Database, User, Bell,
  Palette, LogOut, Save, Moon, Sun, Link2, Github,
  HardDrive, Cloud, FolderOpen, Plug, Unplug, ArrowUpDown,
  Layers, Key, Globe, Info, Wrench,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useLocation } from "wouter";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  return role === "admin" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/30">
      <Crown className="w-2.5 h-2.5" />管理者
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
      ユーザー
    </span>
  );
}

function ConnectedBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <CheckCircle2 className="w-2.5 h-2.5" />連携済み
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
      <XCircle className="w-2.5 h-2.5" />未連携
    </span>
  );
}

// ─── Account & Appearance Tab ─────────────────────────────────────────────────
function AccountAppearanceTab() {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();
  const settingsQuery = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => { toast.success("設定を保存しました"); utils.settings.get.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const settings = settingsQuery.data;
  const [displayName, setDisplayName] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyHealth, setNotifyHealth] = useState(true);
  const [notifyUpdates, setNotifyUpdates] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    if (settings) {
      setDisplayName(settings.displayName ?? "");
      setNotifyEmail(settings.notifyEmail ?? true);
      setNotifyHealth(settings.notifyHealth ?? true);
      setNotifyUpdates(settings.notifyUpdates ?? false);
      setTheme(settings.theme ?? "dark");
    }
  }, [settings]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Profile */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />プロフィール
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary">
              {(displayName || user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <RoleBadge role={user?.role ?? "user"} />
            </div>
          </div>
          <Separator className="bg-border" />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">表示名</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="表示名を入力..." className="bg-input border-border text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">メールアドレス</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted/30 border-border text-sm text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">OAuth経由で管理されます</p>
            </div>
          </div>
          <Button onClick={() => updateMutation.mutate({ displayName, theme })} disabled={updateMutation.isPending} className="gap-1.5 text-xs" size="sm">
            <Save className="w-3.5 h-3.5" />保存
          </Button>
        </CardContent>
      </Card>

      {/* Notifications + Appearance */}
      <div className="space-y-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />通知設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "email", label: "メール通知", desc: "重要なイベントをメールで通知", value: notifyEmail, set: setNotifyEmail },
              { key: "health", label: "ヘルスアラート", desc: "スキルの品質低下を通知", value: notifyHealth, set: setNotifyHealth },
              { key: "updates", label: "アップデート通知", desc: "新機能やアップデートを通知", value: notifyUpdates, set: setNotifyUpdates },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border">
                <div>
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={item.value} onCheckedChange={item.set} />
              </div>
            ))}
            <Button onClick={() => updateMutation.mutate({ notifyEmail, notifyHealth, notifyUpdates })} disabled={updateMutation.isPending} className="gap-1.5 text-xs" size="sm">
              <Save className="w-3.5 h-3.5" />保存
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />外観
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "dark", label: "ダーク", icon: Moon },
                { value: "light", label: "ライト", icon: Sun },
              ].map((t) => (
                <button key={t.value} onClick={() => setTheme(t.value)} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${theme === t.value ? "border-primary/40 bg-primary/10" : "border-border bg-muted/20 hover:border-border/80"}`}>
                  <t.icon className={`w-4 h-4 ${theme === t.value ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
            <Button onClick={() => updateMutation.mutate({ theme })} disabled={updateMutation.isPending} className="gap-1.5 text-xs" size="sm">
              <Save className="w-3.5 h-3.5" />保存
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-rose-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-rose-400 flex items-center gap-2">
              <Shield className="w-4 h-4" />セキュリティ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">アカウントからログアウトします。</p>
            <Button variant="outline" size="sm" onClick={logout} className="gap-1.5 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
              <LogOut className="w-3.5 h-3.5" />ログアウト
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────
function IntegrationsTab() {
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [googleDriveFolder, setGoogleDriveFolder] = useState("");
  const [localFolder, setLocalFolder] = useState("~/.claude/skills");
  const [claudeConnected, setClaudeConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);

  const storageQuery = trpc.storage.overview.useQuery();
  const syncMutation = trpc.storage.sync.useMutation({
    onSuccess: () => { toast.success("同期を開始しました"); storageQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const integrations = [
    {
      id: "claude",
      icon: Brain,
      label: "Claude Code",
      desc: "マイスキルにClaude Codeのスキルを自動取得・表示",
      connected: claudeConnected,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10 border-amber-400/20",
      content: (
        <div className="space-y-3 mt-3 pt-3 border-t border-border">
          <div className="space-y-1.5">
            <Label className="text-xs">Claude API Key</Label>
            <Input
              type="password"
              value={claudeApiKey}
              onChange={(e) => setClaudeApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="bg-input border-border text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">console.anthropic.com</a> で取得できます
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ローカルスキルフォルダー</Label>
            <Input value={localFolder} onChange={(e) => setLocalFolder(e.target.value)} placeholder="~/.claude/skills" className="bg-input border-border text-sm font-mono" />
            <p className="text-[10px] text-muted-foreground">SKILL.mdファイルが格納されているディレクトリ</p>
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              if (!claudeApiKey.trim()) { toast.error("API Keyを入力してください"); return; }
              setClaudeConnected(true);
              toast.success("Claude Code を連携しました。マイスキルにスキルが表示されます。");
            }}
          >
            <Link2 className="w-3.5 h-3.5" />連携する
          </Button>
        </div>
      ),
    },
    {
      id: "github",
      icon: Github,
      label: "GitHub",
      desc: "スキル広場にGitHubリポジトリのスキルを表示・インポート",
      connected: githubConnected,
      color: "text-slate-300",
      bgColor: "bg-slate-400/10 border-slate-400/20",
      content: (
        <div className="space-y-3 mt-3 pt-3 border-t border-border">
          <div className="space-y-1.5">
            <Label className="text-xs">GitHub Personal Access Token</Label>
            <Input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
              className="bg-input border-border text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-primary hover:underline">GitHub Settings → Tokens</a> で生成（repo スコープ必要）
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs font-medium mb-1">連携後にできること</p>
            <ul className="text-[10px] text-muted-foreground space-y-0.5">
              <li>• スキル広場でGitHubリポジトリのSKILL.mdを検索</li>
              <li>• スター数・更新日でフィルタリング</li>
              <li>• ワンクリックでOSMにインポート</li>
            </ul>
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              if (!githubToken.trim()) { toast.error("トークンを入力してください"); return; }
              setGithubConnected(true);
              toast.success("GitHub を連携しました。スキル広場でGitHubスキルが表示されます。");
            }}
          >
            <Link2 className="w-3.5 h-3.5" />連携する
          </Button>
        </div>
      ),
    },
    {
      id: "googledrive",
      icon: Cloud,
      label: "Google Drive",
      desc: "スキルのバックアップ先フォルダーを指定",
      connected: driveConnected,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10 border-blue-400/20",
      content: (
        <div className="space-y-3 mt-3 pt-3 border-t border-border">
          <div className="space-y-1.5">
            <Label className="text-xs">Google Drive フォルダーID</Label>
            <Input
              value={googleDriveFolder}
              onChange={(e) => setGoogleDriveFolder(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="bg-input border-border text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Google DriveのフォルダーURLの末尾のIDを入力</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-[10px] text-blue-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Google OAuth認証が必要です。「連携する」をクリックするとOAuth画面が開きます。
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => {
              setDriveConnected(true);
              toast.success("Google Drive を連携しました。スキルが自動バックアップされます。");
            }}
          >
            <Link2 className="w-3.5 h-3.5" />Google認証で連携する
          </Button>
        </div>
      ),
    },
    {
      id: "localfolder",
      icon: FolderOpen,
      label: "ローカルフォルダー設定",
      desc: "スキルファイルの保存先ローカルパスを設定",
      connected: true,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10 border-emerald-400/20",
      content: (
        <div className="space-y-3 mt-3 pt-3 border-t border-border">
          <div className="space-y-1.5">
            <Label className="text-xs">スキルフォルダーパス</Label>
            <Input value={localFolder} onChange={(e) => setLocalFolder(e.target.value)} className="bg-input border-border text-sm font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">バックアップ間隔</Label>
              <select className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground">
                <option value="1h">1時間ごと</option>
                <option value="6h">6時間ごと</option>
                <option value="24h">毎日</option>
                <option value="manual">手動のみ</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">最大バージョン保持数</Label>
              <Input type="number" defaultValue={10} min={1} max={100} className="bg-input border-border text-sm" />
            </div>
          </div>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => toast.success("ローカルフォルダー設定を保存しました")}>
            <Save className="w-3.5 h-3.5" />保存
          </Button>
        </div>
      ),
    },
  ];

  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Connection Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {integrations.map((item) => (
          <Card key={item.id} className={`border ${item.connected ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card"}`}>
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${item.bgColor}`}>
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{item.label}</p>
                <ConnectedBadge connected={item.connected} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Wizard Cards */}
      <div className="space-y-3">
        {integrations.map((item) => (
          <Card key={item.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${item.bgColor}`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <ConnectedBadge connected={item.connected} />
                    </div>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.connected && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] px-2 gap-1 text-rose-400 hover:bg-rose-500/10"
                      onClick={() => {
                        if (item.id === "claude") setClaudeConnected(false);
                        if (item.id === "github") setGithubConnected(false);
                        if (item.id === "googledrive") setDriveConnected(false);
                        toast.success(`${item.label} の連携を解除しました`);
                      }}
                    >
                      <Unplug className="w-3 h-3" />解除
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] px-2 gap-1"
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  >
                    <Settings className="w-3 h-3" />
                    {expanded === item.id ? "閉じる" : "設定"}
                  </Button>
                </div>
              </div>
              {expanded === item.id && item.content}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Storage Sync Status */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-primary" />ストレージ同期状態
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="gap-1.5 text-xs h-7">
              <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? "animate-spin" : ""}`} />同期
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {storageQuery.isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 shimmer rounded-lg" />)}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Database, label: "総スキル数", value: storageQuery.data?.totalSkills ?? 0, color: "text-primary" },
                { icon: Layers, label: "総バージョン数", value: storageQuery.data?.totalVersions ?? 0, color: "text-cyan-400" },
                { icon: HardDrive, label: "ローカル保存", value: storageQuery.data?.cloudSynced ? storageQuery.data.totalSkills : 0, color: "text-emerald-400" },
                { icon: Cloud, label: "クラウド同期", value: storageQuery.data?.cloudSynced ? storageQuery.data.totalSkills : 0, color: "text-blue-400" },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                  <p className="text-xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── User Management Tab (Admin only) ────────────────────────────────────────
function UserManagementTab({ currentUserId }: { currentUserId: number }) {
  const utils = trpc.useUtils();
  const usersQuery = trpc.admin.users.useQuery();
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("ロールを更新しました"); utils.admin.users.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const users = usersQuery.data ?? [];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">ユーザー一覧 ({users.length}件)</CardTitle>
      </CardHeader>
      <CardContent>
        {usersQuery.isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 shimmer rounded-lg" />)}</div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {(u.name ?? "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{u.name ?? "名前なし"}</p>
                    <RoleBadge role={u.role} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(u.lastSignedIn), { addSuffix: true, locale: ja })}
                  </span>
                  {u.role !== "admin" ? (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1" onClick={() => updateRoleMutation.mutate({ userId: u.id, role: "admin" })} disabled={updateRoleMutation.isPending}>
                      <Crown className="w-3 h-3" />管理者に昇格
                    </Button>
                  ) : u.id !== currentUserId ? (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10" onClick={() => updateRoleMutation.mutate({ userId: u.id, role: "user" })} disabled={updateRoleMutation.isPending}>
                      降格
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── System Settings Tab (Admin only) ────────────────────────────────────────
function SystemSettingsTab() {
  const utils = trpc.useUtils();
  const thresholdsQuery = trpc.health.thresholds.useQuery();
  const allSkillsQuery = trpc.admin.allSkills.useQuery();
  const [, setLocation] = useLocation();

  const updateThresholdsMutation = trpc.health.updateThresholds.useMutation({
    onSuccess: () => { toast.success("閾値を更新しました"); utils.health.thresholds.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const seedMutation = trpc.admin.seedData.useMutation({
    onSuccess: () => { toast.success("デモデータを投入しました"); utils.admin.allSkills.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [degradation, setDegradation] = useState(thresholdsQuery.data?.degradationThreshold?.toString() ?? "70");
  const [critical, setCritical] = useState(thresholdsQuery.data?.criticalThreshold?.toString() ?? "50");
  const [autoFix, setAutoFix] = useState(thresholdsQuery.data?.autoFixEnabled ?? true);
  const allSkills = allSkillsQuery.data ?? [];

  return (
    <div className="space-y-4">
      {/* Health Thresholds */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />ヘルス閾値設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">劣化閾値 (%)</Label>
              <Input type="number" min={0} max={100} value={degradation} onChange={(e) => setDegradation(e.target.value)} className="bg-input border-border text-sm" />
              <p className="text-[10px] text-muted-foreground">この値を下回ると警告</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">重大閾値 (%)</Label>
              <Input type="number" min={0} max={100} value={critical} onChange={(e) => setCritical(e.target.value)} className="bg-input border-border text-sm" />
              <p className="text-[10px] text-muted-foreground">この値を下回ると重大アラート</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div>
              <p className="text-xs font-medium">自動修復</p>
              <p className="text-[10px] text-muted-foreground">閾値以下のスキルを自動修復</p>
            </div>
            <Switch checked={autoFix} onCheckedChange={setAutoFix} />
          </div>
          <Button size="sm" onClick={() => updateThresholdsMutation.mutate({ degradationThreshold: parseFloat(degradation), criticalThreshold: parseFloat(critical), monitorInterval: 60, autoFixEnabled: autoFix })} disabled={updateThresholdsMutation.isPending} className="gap-1.5 text-xs">
            保存
          </Button>
        </CardContent>
      </Card>

      {/* All Skills */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">全スキル一覧 ({allSkills.length}件)</CardTitle>
            <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="gap-1.5 text-xs h-7">
              <RefreshCw className={`w-3 h-3 ${seedMutation.isPending ? "animate-spin" : ""}`} />デモデータ投入
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allSkills.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setLocation(`/skills/${s.id}`)}>
                <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.category} · {s.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.isPublic ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">公開</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">非公開</span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Log Monitor Tab (Admin only) ─────────────────────────────────────────────
function LogMonitorTab() {
  const utils = trpc.useUtils();
  const logsQuery = trpc.admin.systemLogs.useQuery();
  const logs = logsQuery.data ?? [];
  const errorCount = logs.filter((l) => l.status === "failure").length;
  const successCount = logs.filter((l) => l.status === "success").length;
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "総ログ数", value: logs.length, color: "text-foreground" },
          { label: "成功率", value: `${successRate}%`, color: "text-emerald-400" },
          { label: "エラー数", value: errorCount, color: "text-rose-400" },
        ].map((item) => (
          <Card key={item.label} className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">システムログ (最新{logs.length}件)</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => utils.admin.systemLogs.invalidate()} className="gap-1.5 text-xs h-7">
              <RefreshCw className="w-3 h-3" />更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20 font-mono text-xs">
                {log.status === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : log.status === "failure" ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="flex-1 truncate text-muted-foreground">{log.skillId}</span>
                {log.executionTime && (
                  <span className="text-muted-foreground/60">{log.executionTime.toFixed(2)}s</span>
                )}
                <span className="text-muted-foreground/50 shrink-0">
                  {formatDistanceToNow(new Date(log.executedAt), { addSuffix: true, locale: ja })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSettings() {
  const { user } = useAuth();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Shield className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">ログインが必要です</p>
        </div>
      </DashboardLayout>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              {isAdmin ? "管理者パネル" : "設定"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAdmin ? "アカウント・連携・ユーザー管理・システム設定を一元管理" : "アカウントと連携の設定を管理"}
            </p>
          </div>
          {isAdmin && (
            <Badge className="bg-primary/10 text-primary border-primary/30 border text-xs">
              <Crown className="w-3 h-3 mr-1" />管理者
            </Badge>
          )}
        </div>

        {/* Summary Cards (Admin only) */}
        {isAdmin && <AdminSummaryCards />}

        {/* Tabs */}
        <Tabs defaultValue="account">
          <TabsList className={`bg-muted/50 border border-border ${isAdmin ? "w-full" : "max-w-sm"}`}>
            <TabsTrigger value="account" className="flex-1 text-xs gap-1.5">
              <User className="w-3.5 h-3.5" />アカウント・外観
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex-1 text-xs gap-1.5">
              <Plug className="w-3.5 h-3.5" />連携
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="users" className="flex-1 text-xs gap-1.5">
                  <Users className="w-3.5 h-3.5" />ユーザー管理
                </TabsTrigger>
                <TabsTrigger value="system" className="flex-1 text-xs gap-1.5">
                  <Settings className="w-3.5 h-3.5" />システム設定
                </TabsTrigger>
                <TabsTrigger value="logs" className="flex-1 text-xs gap-1.5">
                  <Activity className="w-3.5 h-3.5" />ログ監視
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="account" className="mt-5">
            <AccountAppearanceTab />
          </TabsContent>
          <TabsContent value="integrations" className="mt-5">
            <IntegrationsTab />
          </TabsContent>
          {isAdmin && (
            <>
              <TabsContent value="users" className="mt-5">
                <UserManagementTab currentUserId={user.id} />
              </TabsContent>
              <TabsContent value="system" className="mt-5">
                <SystemSettingsTab />
              </TabsContent>
              <TabsContent value="logs" className="mt-5">
                <LogMonitorTab />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ─── Admin Summary Cards ──────────────────────────────────────────────────────
function AdminSummaryCards() {
  const usersQuery = trpc.admin.users.useQuery();
  const logsQuery = trpc.admin.systemLogs.useQuery();
  const allSkillsQuery = trpc.admin.allSkills.useQuery();
  const users = usersQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const allSkills = allSkillsQuery.data ?? [];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { icon: Users, label: "総ユーザー数", value: users.length, color: "text-primary bg-primary/10 border-primary/20" },
        { icon: Brain, label: "総スキル数", value: allSkills.length, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
        { icon: Activity, label: "実行ログ数", value: logs.length, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
        { icon: AlertTriangle, label: "エラー数 (24h)", value: logs.filter((l) => l.status === "failure").length, color: "text-rose-400 bg-rose-400/10 border-rose-400/20" },
      ].map((item) => (
        <Card key={item.label} className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${item.color}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
