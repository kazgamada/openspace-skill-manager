import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User, Bell, Palette, Link2, Github, HardDrive, FolderOpen,
  Shield, Settings, Activity, Users, CheckCircle2, XCircle,
  Clock, Plug, Unplug, TestTube2, Loader2, Bot, Database,
  FileText, Eye, EyeOff, AlertTriangle, Moon, Sun, LogOut, Save,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────
type ServiceKey = "claude" | "github" | "googleDrive" | "localFolder";
interface ServiceConfig { connected?: boolean; lastTestedAt?: string | null; [k: string]: unknown; }
interface IntegrationMap { claude?: ServiceConfig; github?: ServiceConfig; googleDrive?: ServiceConfig; localFolder?: ServiceConfig; }

// ─── Integration Card ─────────────────────────────────────────────────────────
function IntegrationCard({ serviceKey, icon: Icon, title, description, config, onConfigure, onTest, onDisconnect, testing }: {
  serviceKey: ServiceKey; icon: React.ElementType; title: string; description: string;
  config?: ServiceConfig; onConfigure: (k: ServiceKey) => void; onTest: (k: ServiceKey) => void;
  onDisconnect: (k: ServiceKey) => void; testing: boolean;
}) {
  const connected = config?.connected === true;
  const lastTested = config?.lastTestedAt ? new Date(config.lastTestedAt as string).toLocaleString("ja-JP") : null;
  return (
    <Card className={`border transition-all ${connected ? "border-emerald-500/30 bg-emerald-950/10" : "border-border"}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${connected ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{title}</h3>
                {connected ? (
                  <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400 bg-emerald-500/10 py-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />接続済み
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground py-0">
                    <XCircle className="h-3 w-3 mr-1" />未接続
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              {lastTested && (
                <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />最終テスト: {lastTested}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {connected && (
              <Button variant="ghost" size="sm" onClick={() => onTest(serviceKey)} disabled={testing} className="h-8 text-xs">
                {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube2 className="h-3 w-3" />}
                <span className="ml-1">テスト</span>
              </Button>
            )}
            <Button variant={connected ? "outline" : "default"} size="sm" onClick={() => onConfigure(serviceKey)} className="h-8 text-xs">
              <Plug className="h-3 w-3 mr-1" />{connected ? "再設定" : "設定"}
            </Button>
            {connected && (
              <Button variant="ghost" size="sm" onClick={() => onDisconnect(serviceKey)} className="h-8 text-xs text-destructive hover:text-destructive">
                <Unplug className="h-3 w-3 mr-1" />切断
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Configure Dialog ─────────────────────────────────────────────────────────
function ConfigureDialog({ open, onClose, serviceKey, existing, onSave, saving }: {
  open: boolean; onClose: () => void; serviceKey: ServiceKey | null;
  existing?: ServiceConfig; onSave: (k: ServiceKey, cfg: Record<string, string>) => void; saving: boolean;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open && existing) {
      const f: Record<string, string> = {};
      Object.entries(existing).forEach(([k, v]) => { if (k !== "connected" && k !== "lastTestedAt" && typeof v === "string") f[k] = v; });
      setForm(f);
    } else { setForm({}); }
    setShowSecret(false);
  }, [open, existing]);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const fields: Record<ServiceKey, { key: string; label: string; placeholder: string; secret?: boolean; hint?: string }[]> = {
    claude: [
      { key: "mcpPath", label: "MCP設定ファイルパス", placeholder: "~/.claude.json または .mcp.json", hint: "Claude CodeのMCP設定ファイルのパス" },
      { key: "apiKey", label: "Claude API Key (任意)", placeholder: "sk-ant-...", secret: true, hint: "直接API呼び出しを行う場合のみ必要" },
      { key: "skillsDir", label: "スキルディレクトリ", placeholder: "~/.claude/skills/", hint: "SKILL.mdが格納されているディレクトリ" },
    ],
    github: [
      { key: "username", label: "GitHubユーザー名", placeholder: "your-username" },
      { key: "token", label: "Personal Access Token", placeholder: "ghp_...", secret: true, hint: "repo スコープが必要。Settings > Developer settings で発行" },
    ],
    googleDrive: [
      { key: "folderId", label: "保存フォルダーID", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", hint: "Google DriveのフォルダーURLの末尾の文字列" },
      { key: "serviceAccountEmail", label: "サービスアカウント (任意)", placeholder: "xxx@project.iam.gserviceaccount.com" },
    ],
    localFolder: [
      { key: "path", label: "ローカルフォルダーパス", placeholder: "/Users/you/claude-skills/", hint: "スキルファイルを同期するローカルディレクトリ" },
      { key: "watchEnabled", label: "自動監視 (true/false)", placeholder: "true", hint: "フォルダーの変更を自動検知してOSMに同期" },
    ],
  };

  if (!serviceKey) return null;
  const titles: Record<ServiceKey, string> = { claude: "Claude Code 連携設定", github: "GitHub 連携設定", googleDrive: "Google Drive 連携設定", localFolder: "ローカルフォルダー設定" };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[serviceKey]}</DialogTitle>
          <DialogDescription>接続情報を入力してください。情報は暗号化して保存されます。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {fields[serviceKey].map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-sm">{f.label}</Label>
              <div className="relative">
                <Input type={f.secret && !showSecret ? "password" : "text"} placeholder={f.placeholder} value={form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className="pr-10" />
                {f.secret && (
                  <button type="button" onClick={() => setShowSecret((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>キャンセル</Button>
          <Button onClick={() => onSave(serviceKey, form)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            保存して接続
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminSettings() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("account");
  const [configuringService, setConfiguringService] = useState<ServiceKey | null>(null);
  const [testingService, setTestingService] = useState<ServiceKey | null>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => { const p = new URLSearchParams(window.location.search); const t = p.get("tab"); if (t) setActiveTab(t); }, []);
  useEffect(() => { if (!loading && !isAuthenticated) setLocation("/"); }, [loading, isAuthenticated, setLocation]);
  useEffect(() => { if (user?.name) setDisplayName(user.name); }, [user]);

  const isAdmin = user?.role === "admin";

  const { data: prefs, refetch: refetchPrefs } = trpc.settings.getPreferences.useQuery(undefined, { enabled: isAuthenticated });
  const { data: integrations, refetch: refetchIntegrations } = trpc.settings.getIntegrations.useQuery(undefined, { enabled: isAuthenticated });
  const { data: adminUsers, refetch: refetchUsers } = trpc.admin.users.useQuery(undefined, { enabled: isAdmin });
  const { data: systemLogs } = trpc.admin.systemLogs.useQuery(undefined, { enabled: isAdmin });
  const { data: allSkills } = trpc.admin.allSkills.useQuery(undefined, { enabled: isAdmin });

  const updatePrefs = trpc.settings.updatePreferences.useMutation({ onSuccess: () => { toast.success("設定を保存しました"); refetchPrefs(); }, onError: (e) => toast.error(e.message) });
  const updateAccount = trpc.settings.update.useMutation({ onSuccess: () => toast.success("アカウント情報を更新しました"), onError: (e) => toast.error(e.message) });
  const saveIntegration = trpc.settings.saveIntegration.useMutation({ onSuccess: () => { toast.success("連携設定を保存しました"); setConfiguringService(null); refetchIntegrations(); }, onError: (e) => toast.error(e.message) });
  const testIntegration = trpc.settings.testIntegration.useMutation({
    onSuccess: (data) => { if (data.success) toast.success(data.message); else toast.error(data.message); setTestingService(null); refetchIntegrations(); },
    onError: (e) => { toast.error(e.message); setTestingService(null); },
  });
  const disconnectIntegration = trpc.settings.disconnectIntegration.useMutation({ onSuccess: () => { toast.success("連携を切断しました"); refetchIntegrations(); }, onError: (e) => toast.error(e.message) });
  const updateRole = trpc.admin.updateUserRole.useMutation({ onSuccess: () => { toast.success("ロールを更新しました"); refetchUsers(); }, onError: (e) => toast.error(e.message) });
  const seedData = trpc.admin.seedData.useMutation({ onSuccess: () => toast.success("デモデータを投入しました"), onError: (e) => toast.error(e.message) });

  const intMap = (integrations ?? {}) as IntegrationMap;
  const connectedCount = Object.values(intMap).filter((v) => (v as ServiceConfig)?.connected).length;

  const handleTest = (key: ServiceKey) => { setTestingService(key); testIntegration.mutate({ service: key }); };
  const handleDisconnect = (key: ServiceKey) => disconnectIntegration.mutate({ service: key });
  const handleSaveIntegration = (key: ServiceKey, config: Record<string, string>) => saveIntegration.mutate({ service: key, config });

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </DashboardLayout>
  );

  const tabCount = isAdmin ? 6 : 4;
  const gridCols = tabCount === 6 ? "grid-cols-6" : "grid-cols-4";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Settings className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">設定</h1>
            <p className="text-sm text-muted-foreground">アカウント・通知・外観・連携{isAdmin ? "・ユーザー管理・システム" : ""}</p>
          </div>
          {isAdmin && <Badge variant="outline" className="ml-auto border-amber-500/50 text-amber-400 bg-amber-500/10"><Shield className="h-3 w-3 mr-1" />管理者</Badge>}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${gridCols} h-10`}>
            <TabsTrigger value="account" className="text-xs gap-1.5"><User className="h-3.5 w-3.5" />アカウント</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs gap-1.5"><Bell className="h-3.5 w-3.5" />通知</TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs gap-1.5"><Palette className="h-3.5 w-3.5" />外観</TabsTrigger>
            <TabsTrigger value="integrations" className="text-xs gap-1.5">
              <Link2 className="h-3.5 w-3.5" />連携
              {connectedCount > 0 && <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-emerald-500">{connectedCount}</Badge>}
            </TabsTrigger>
            {isAdmin && <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="h-3.5 w-3.5" />ユーザー管理</TabsTrigger>}
            {isAdmin && <TabsTrigger value="system" className="text-xs gap-1.5"><Activity className="h-3.5 w-3.5" />システム</TabsTrigger>}
          </TabsList>

          {/* ── Account ── */}
          <TabsContent value="account" className="mt-6 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" />プロフィール</CardTitle><CardDescription>表示名・メールアドレスを管理します</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                    {(user?.name ?? "U")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{user?.name ?? "未設定"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <Badge variant="outline" className="mt-1 text-xs">{user?.role === "admin" ? "管理者" : "ユーザー"}</Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>表示名</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="表示名を入力" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>メールアドレス</Label>
                    <Input value={user?.email ?? ""} disabled className="opacity-60" />
                    <p className="text-xs text-muted-foreground">メールアドレスはOAuth認証から取得されるため変更できません</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => updateAccount.mutate({ displayName })} disabled={updateAccount.isPending}>
                      {updateAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}変更を保存
                    </Button>
                    <Button variant="outline" onClick={logout} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <LogOut className="h-4 w-4 mr-2" />ログアウト
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Notifications ── */}
          <TabsContent value="notifications" className="mt-6 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-primary" />通知設定</CardTitle><CardDescription>どのイベントで通知を受け取るか設定します</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                {[
                  { key: "notifyOnRepair" as const, label: "自動修復通知", desc: "スキルが自動修復されたときに通知" },
                  { key: "notifyOnDegradation" as const, label: "品質劣化アラート", desc: "スキルの品質スコアが閾値を下回ったときに通知" },
                  { key: "notifyOnCommunity" as const, label: "コミュニティ更新", desc: "フォロー中のスキルが更新されたときに通知" },
                  { key: "emailDigest" as const, label: "メールダイジェスト", desc: "週次サマリーをメールで受け取る" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                    <Switch checked={prefs?.[item.key] ?? false} onCheckedChange={(v) => updatePrefs.mutate({ [item.key]: v })} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Appearance ── */}
          <TabsContent value="appearance" className="mt-6 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4 text-primary" />外観設定</CardTitle><CardDescription>テーマ・言語を設定します</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>テーマ</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "dark", label: "ダーク", icon: Moon, preview: "bg-zinc-900 border-zinc-700" },
                      { value: "light", label: "ライト", icon: Sun, preview: "bg-white border-zinc-200" },
                      { value: "system", label: "システム", icon: Settings, preview: "bg-gradient-to-r from-zinc-900 to-white border-zinc-400" },
                    ].map((t) => (
                      <button key={t.value} onClick={() => updatePrefs.mutate({ theme: t.value })}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${(prefs?.theme ?? "dark") === t.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                        <div className={`h-8 w-full rounded-md mb-2 border ${t.preview}`} />
                        <span className="text-xs font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>言語</Label>
                  <Select value={prefs?.language ?? "ja"} onValueChange={(v) => updatePrefs.mutate({ language: v })}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Integrations ── */}
          <TabsContent value="integrations" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-base font-semibold">連携設定</h2><p className="text-xs text-muted-foreground mt-0.5">外部サービスと連携してスキルの管理を強化します</p></div>
              <Badge variant="outline" className="text-xs">{connectedCount}/4 接続済み</Badge>
            </div>

            {/* Status overview */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-3">
                  {(["claude", "github", "googleDrive", "localFolder"] as ServiceKey[]).map((key) => {
                    const icons: Record<ServiceKey, React.ElementType> = { claude: Bot, github: Github, googleDrive: Database, localFolder: FolderOpen };
                    const labels: Record<ServiceKey, string> = { claude: "Claude", github: "GitHub", googleDrive: "Google Drive", localFolder: "ローカル" };
                    const Icon = icons[key];
                    const connected = intMap[key]?.connected === true;
                    return (
                      <div key={key} className="flex flex-col items-center gap-1.5">
                        <div className={`p-2 rounded-lg ${connected ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground/40"}`}><Icon className="h-4 w-4" /></div>
                        <span className="text-xs text-muted-foreground">{labels[key]}</span>
                        <div className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <IntegrationCard serviceKey="claude" icon={Bot} title="Claude Code" description="SKILL.mdの自動取得・MCP設定の読み込み・スキルの同期（マイスキルに表示）" config={intMap.claude} onConfigure={setConfiguringService} onTest={handleTest} onDisconnect={handleDisconnect} testing={testingService === "claude"} />
              <IntegrationCard serviceKey="github" icon={Github} title="GitHub" description="公開スキルリポジトリの検索・インポート・スキル広場への公開" config={intMap.github} onConfigure={setConfiguringService} onTest={handleTest} onDisconnect={handleDisconnect} testing={testingService === "github"} />
              <IntegrationCard serviceKey="googleDrive" icon={Database} title="Google Drive" description="スキルファイルのクラウドバックアップ・チームとの共有（保存フォルダー）" config={intMap.googleDrive} onConfigure={setConfiguringService} onTest={handleTest} onDisconnect={handleDisconnect} testing={testingService === "googleDrive"} />
              <IntegrationCard serviceKey="localFolder" icon={FolderOpen} title="ローカルフォルダー" description="ローカルのスキルディレクトリとOSMを双方向同期" config={intMap.localFolder} onConfigure={setConfiguringService} onTest={handleTest} onDisconnect={handleDisconnect} testing={testingService === "localFolder"} />
            </div>

            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">連携の使い方</p>
                  <p>Claude連携 → 「マイスキル」でSKILL.mdを自動取得できます。</p>
                  <p>GitHub連携 → 「スキル広場」でプライベートリポジトリのスキルも検索できます。</p>
                  <p>Google Drive連携 → スキルのバックアップと復元が可能になります。</p>
                  <p>ローカルフォルダー → ローカルのスキルディレクトリと自動同期します。</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Users (Admin) ── */}
          {isAdmin && (
            <TabsContent value="users" className="mt-6 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />ユーザー管理</CardTitle><CardDescription>登録ユーザーの一覧とロール管理</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(adminUsers ?? []).map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {(u.name ?? u.email ?? "U")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.name ?? "名前未設定"}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={u.role} onValueChange={(role) => updateRole.mutate({ userId: u.id, role: role as "user" | "admin" })} disabled={u.id === user?.id}>
                            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">ユーザー</SelectItem>
                              <SelectItem value="admin">管理者</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant="outline" className={`text-xs ${u.role === "admin" ? "border-amber-500/50 text-amber-400" : "border-muted-foreground/30"}`}>
                            {u.role === "admin" ? "管理者" : "ユーザー"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {(!adminUsers || adminUsers.length === 0) && <p className="text-sm text-muted-foreground text-center py-8">ユーザーが見つかりません</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── System (Admin) ── */}
          {isAdmin && (
            <TabsContent value="system" className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "総スキル数", value: allSkills?.length ?? 0, icon: HardDrive, color: "text-blue-400" },
                  { label: "登録ユーザー数", value: adminUsers?.length ?? 0, icon: Users, color: "text-emerald-400" },
                  { label: "実行ログ数", value: systemLogs?.length ?? 0, icon: FileText, color: "text-amber-400" },
                ].map((s) => (
                  <Card key={s.label}><CardContent className="p-4 flex items-center gap-3"><s.icon className={`h-8 w-8 ${s.color}`} /><div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div></CardContent></Card>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4 text-primary" />システム操作</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div><p className="text-sm font-medium">デモデータ投入</p><p className="text-xs text-muted-foreground">サンプルスキルと実行ログを生成します</p></div>
                    <Button variant="outline" size="sm" onClick={() => seedData.mutate()} disabled={seedData.isPending}>
                      {seedData.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "投入"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />実行ログ（直近100件）</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {(systemLogs ?? []).slice(0, 50).map((log) => (
                      <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 text-xs">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${log.status === "success" ? "bg-emerald-400" : log.status === "failure" ? "bg-red-400" : "bg-amber-400"}`} />
                        <span className="font-mono text-muted-foreground w-32 shrink-0 truncate">{log.skillId.slice(0, 12)}…</span>
                        <span className={`font-medium ${log.status === "success" ? "text-emerald-400" : log.status === "failure" ? "text-red-400" : "text-amber-400"}`}>
                          {log.status === "success" ? "成功" : log.status === "failure" ? "失敗" : "部分"}
                        </span>
                        {log.executionTime && <span className="text-muted-foreground">{log.executionTime.toFixed(2)}s</span>}
                        {log.errorMessage && <span className="text-red-400/70 truncate flex-1">{log.errorMessage}</span>}
                        <span className="text-muted-foreground/60 ml-auto shrink-0">{new Date(log.executedAt).toLocaleTimeString("ja-JP")}</span>
                      </div>
                    ))}
                    {(!systemLogs || systemLogs.length === 0) && <p className="text-sm text-muted-foreground text-center py-8">ログがありません</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <ConfigureDialog open={configuringService !== null} onClose={() => setConfiguringService(null)} serviceKey={configuringService} existing={configuringService ? intMap[configuringService] : undefined} onSave={handleSaveIntegration} saving={saveIntegration.isPending} />
    </DashboardLayout>
  );
}
