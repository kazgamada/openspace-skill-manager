/**
 * UserSettings.tsx — v7設計
 * 3カラム構造:
 *   第1カラム: DashboardLayout左サイドバー（ユーザーアカウント / 初期設定 / 手動設定）
 *   第2カラム: 初期設定選択時に縦メニューを表示（外部サービス連携4項目 + 設定6項目）
 *   第3カラム: コンテンツエリア
 *
 * ルーティング:
 *   /settings/account          → ユーザーアカウント
 *   /settings/integrations/:svc → 初期設定 > 外部サービス連携（github / claude / googleDrive / localFolder）
 *   /settings/wizard/:step      → 初期設定 > 設定（sync / repair / evolution / watchlist / crawl / notify）
 *   /settings/manual            → 手動設定
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  User, Settings, Wand2, Github, RefreshCw, Wrench, Sparkles,
  Globe, Zap, Bell, PlusCircle, Trash2, Lock, ChevronRight,
  CheckCircle2, Filter, Clock, Link2, HardDrive, Terminal, AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// ─── 第2カラムメニュー定義 ──────────────────────────
const INTEGRATION_ITEMS = [
  { id: "github",      label: "GitHub連携",         icon: Github,    iconColor: "text-foreground",  desc: "リポジトリからスキルを取得" },
  { id: "claude",      label: "Claude Code連携",    icon: Zap,       iconColor: "text-amber-400",   desc: "MCP連携・スキル自動取得" },
  { id: "googleDrive", label: "Google Drive連携",   icon: HardDrive, iconColor: "text-blue-400",    desc: "Driveからスキルを取得" },
  { id: "localFolder", label: "ローカルフォルダー", icon: Terminal,  iconColor: "text-emerald-400", desc: "ローカルパスからスキルを取得" },
] as const;

const WIZARD_ITEMS = [
  { id: "sync",       label: "同期スケジュール", icon: RefreshCw, iconColor: "text-blue-400" },
  { id: "repair",     label: "修復設定",         icon: Wrench,    iconColor: "text-orange-400" },
  { id: "evolution",  label: "進化提案",         icon: Sparkles,  iconColor: "text-purple-400" },
  { id: "watchlist",  label: "監視先リスト",     icon: Globe,     iconColor: "text-cyan-400" },
  { id: "crawl",      label: "回遊設定",         icon: Zap,       iconColor: "text-yellow-400" },
  { id: "notify",     label: "通知設定",         icon: Bell,      iconColor: "text-green-400" },
] as const;

type IntegrationId = typeof INTEGRATION_ITEMS[number]["id"];
type WizardId = typeof WIZARD_ITEMS[number]["id"];

// ─── AccountTab ───────────────────────────────────
function AccountTab() {
  const { user, logout } = useAuth();
  const intQuery = trpc.settings.getIntegrations.useQuery();
  const intMap = ((intQuery.data ?? []) as Array<{ service: string; connected: boolean }>)
    .reduce<Record<string, { connected: boolean }>>((acc, it) => {
      acc[it.service] = { connected: it.connected };
      return acc;
    }, {});

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            プロフィール
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{user?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{user?.email ?? "—"}</p>
              <Badge variant="outline" className="text-[10px] mt-1 capitalize">{user?.role ?? "user"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            外部サービス連携（概要）
          </CardTitle>
          <CardDescription className="text-xs">
            詳細な連携設定は「初期設定」から行えます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {INTEGRATION_ITEMS.map(({ id, label, icon: Icon, iconColor }) => {
              const connected = intMap[id]?.connected ?? false;
              return (
                <div key={id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/20 border border-border/50">
                  <Icon className={`w-4 h-4 ${iconColor} shrink-0`} />
                  <span className="text-sm flex-1">{label}</span>
                  {connected ? (
                    <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-1" />連携済み
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">未連携</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">ログアウト</p>
              <p className="text-xs text-muted-foreground mt-0.5">セッションを終了します</p>
            </div>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={logout}>
              ログアウト
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── IntegrationPanel: 外部サービス連携コンテンツ ───
function IntegrationPanel({ serviceId }: { serviceId: IntegrationId }) {
  const { data: integrations, isLoading } = trpc.settings.getIntegrations.useQuery();
  const saveIntegration = trpc.settings.saveIntegration.useMutation();
  const [tokenInput, setTokenInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const utils = trpc.useUtils();

  const item = INTEGRATION_ITEMS.find((i) => i.id === serviceId)!;
  const Icon = item.icon;
  const status = ((integrations ?? []) as Array<{ service: string; connected: boolean }>)
    .find((i) => i.service === serviceId);
  const connected = status?.connected ?? false;

  const handleSave = async () => {
    if (!tokenInput) return;
    try {
      await saveIntegration.mutateAsync({ service: serviceId, config: { token: tokenInput } });
      utils.settings.getIntegrations.invalidate();
      setIsEditing(false);
      setTokenInput("");
      toast.success(`${item.label}の設定を保存しました`);
    } catch (e) {
      toast.error(`保存失敗: ${String(e)}`);
    }
  };

  const placeholders: Record<IntegrationId, string> = {
    github:      "ghp_xxxxxxxxxxxx（repo スコープが必要）",
    claude:      "Claude Code APIキーまたはMCPトークン",
    googleDrive: "Google Drive APIキーまたはOAuthトークン",
    localFolder: "/path/to/skills フォルダーの絶対パス",
  };

  const descriptions: Record<IntegrationId, string> = {
    github:      "GitHubアクセストークンを設定すると、プライベート・パブリックリポジトリからスキルを自動取得できます。github.com/settings/tokens で生成（repo スコープが必要）。",
    claude:      "Claude Code との MCP 連携を設定します。スキルの自動取得・実行が可能になります。",
    googleDrive: "Google Drive からスキルファイルを取得します。OAuthトークンまたはサービスアカウントキーを設定してください。",
    localFolder: "ローカルフォルダーのパスを指定すると、そのフォルダー内のSKILL.mdファイルを自動取得します。",
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">読み込み中...</div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Icon className={`w-5 h-5 ${item.iconColor}`} />
          {item.label}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${item.iconColor}`} />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {connected ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />連携済み
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <AlertCircle className="w-3 h-3 mr-1" />未連携
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{descriptions[serviceId]}</p>

          {!isEditing ? (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              {connected ? "トークンを変更" : "連携を設定"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">{serviceId === "localFolder" ? "フォルダーパス" : "アクセストークン"}</Label>
                <Input
                  type={serviceId === "localFolder" ? "text" : "password"}
                  placeholder={connected ? "変更する場合のみ入力" : placeholders[serviceId]}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={!tokenInput || saveIntegration.isPending}>
                  {saveIntegration.isPending ? "保存中..." : "保存"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setTokenInput(""); }}>
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── WizardPanel: 設定コンテンツ ─────────────────────
function WizardPanel({ wizardId }: { wizardId: WizardId }) {
  const utils = trpc.useUtils();

  // 同期スケジュール
  const [syncIntervalHours, setSyncIntervalHours] = useState(24);
  const [syncBranch, setSyncBranch] = useState("main");
  // 修復設定
  const [autoRepair, setAutoRepair] = useState(true);
  const [repairThreshold, setRepairThreshold] = useState(60);
  // 進化提案
  const [evolutionSimilarityThreshold, setEvolutionSimilarityThreshold] = useState(70);
  const [evolutionCheckIntervalHours, setEvolutionCheckIntervalHours] = useState(24);
  // 監視先リスト
  type WatchEntry = { id: string; repoOwner: string; repoName: string; skillsPath: string; branch: string; label: string };
  const [watchList, setWatchList] = useState<WatchEntry[]>([]);
  const [newEntry, setNewEntry] = useState<Omit<WatchEntry, "id">>({ repoOwner: "", repoName: "", skillsPath: "skills", branch: "main", label: "" });
  // 回遊設定
  const [crawlEnabled, setCrawlEnabled] = useState(true);
  const [crawlIntervalHours, setCrawlIntervalHours] = useState(24);
  const [crawlKeywords, setCrawlKeywords] = useState("");
  const [crawlSearchPath, setCrawlSearchPath] = useState(".claude/skills");
  const [crawlExcludeRepos, setCrawlExcludeRepos] = useState<string[]>([]);
  const [crawlMinStars, setCrawlMinStars] = useState(0);
  const [crawlMinForks, setCrawlMinForks] = useState(0);
  const [crawlMaxAgeDays, setCrawlMaxAgeDays] = useState(0);
  const [crawlMinSkillLength, setCrawlMinSkillLength] = useState(100);
  const [crawlDuplicatePolicy, setCrawlDuplicatePolicy] = useState<"skip" | "update" | "version">("update");
  const [crawlLanguageFilter, setCrawlLanguageFilter] = useState("");
  const [crawlDailyLimit, setCrawlDailyLimit] = useState(100);
  const [crawlRankBy, setCrawlRankBy] = useState<"stars" | "forks" | "freshness" | "composite">("composite");
  const [crawlRateLimitMs, setCrawlRateLimitMs] = useState(500);
  const [crawlDuplicateWindowDays, setCrawlDuplicateWindowDays] = useState(0);
  const [newExclude, setNewExclude] = useState("");
  // 通知設定
  const [notifyOnRepair, setNotifyOnRepair] = useState(true);
  const [notifyOnDegradation, setNotifyOnDegradation] = useState(true);
  const [notifyOnCommunity, setNotifyOnCommunity] = useState(false);

  // データ取得
  const { data: watchListData } = trpc.settings.getPublicWatchList.useQuery();
  const { data: syncData } = trpc.settings.getSyncSettings.useQuery();
  const { data: evolutionData } = trpc.settings.getEvolutionSettings.useQuery();
  const { data: crawlData } = trpc.settings.getCrawlSettings.useQuery();

  useEffect(() => { if (watchListData && watchList.length === 0) setWatchList(watchListData as WatchEntry[]); }, [watchListData]);
  useEffect(() => { if (syncData) { setSyncIntervalHours(syncData.syncIntervalHours); setSyncBranch(syncData.syncBranch); } }, [syncData]);
  useEffect(() => { if (evolutionData) { setEvolutionSimilarityThreshold(evolutionData.evolutionSimilarityThreshold); setEvolutionCheckIntervalHours(evolutionData.evolutionCheckIntervalHours); } }, [evolutionData]);
  useEffect(() => {
    if (crawlData) {
      setCrawlEnabled(crawlData.crawlEnabled); setCrawlIntervalHours(crawlData.crawlIntervalHours);
      setCrawlKeywords(crawlData.crawlKeywords); setCrawlSearchPath(crawlData.crawlSearchPath);
      setCrawlExcludeRepos(crawlData.crawlExcludeRepos); setCrawlMinStars(crawlData.crawlMinStars);
      setCrawlMinForks(crawlData.crawlMinForks); setCrawlMaxAgeDays(crawlData.crawlMaxAgeDays);
      setCrawlMinSkillLength(crawlData.crawlMinSkillLength);
      setCrawlDuplicatePolicy(crawlData.crawlDuplicatePolicy as "skip" | "update" | "version");
      setCrawlLanguageFilter(crawlData.crawlLanguageFilter); setCrawlDailyLimit(crawlData.crawlDailyLimit);
      setCrawlRankBy(crawlData.crawlRankBy as "stars" | "forks" | "freshness" | "composite");
      setCrawlRateLimitMs(crawlData.crawlRateLimitMs); setCrawlDuplicateWindowDays(crawlData.crawlDuplicateWindowDays);
    }
  }, [crawlData]);

  // Mutations
  const savePublicWatchList = trpc.settings.savePublicWatchList.useMutation();
  const saveSyncSettings = trpc.settings.saveSyncSettings.useMutation();
  const saveEvolutionSettings = trpc.settings.saveEvolutionSettings.useMutation();
  const saveCrawlSettings = trpc.settings.saveCrawlSettings.useMutation();
  const updatePreferences = trpc.settings.updatePreferences.useMutation();

  const handleSave = async () => {
    try {
      if (wizardId === "sync") {
        await saveSyncSettings.mutateAsync({ syncIntervalHours, syncBranch });
        toast.success("同期スケジュールを保存しました");
      } else if (wizardId === "repair") {
        await updatePreferences.mutateAsync({ notifyOnRepair: autoRepair });
        toast.success("修復設定を保存しました");
      } else if (wizardId === "evolution") {
        await saveEvolutionSettings.mutateAsync({ evolutionSimilarityThreshold, evolutionCheckIntervalHours });
        toast.success("進化提案設定を保存しました");
      } else if (wizardId === "watchlist") {
        await savePublicWatchList.mutateAsync({ watchList });
        utils.settings.getPublicWatchList.invalidate();
        toast.success(`監視先リストを保存しました（${watchList.length}件）`);
      } else if (wizardId === "crawl") {
        await saveCrawlSettings.mutateAsync({
          crawlEnabled, crawlIntervalHours, crawlKeywords, crawlSearchPath,
          crawlExcludeRepos, crawlMinStars, crawlMinForks, crawlMaxAgeDays,
          crawlMinSkillLength, crawlDuplicatePolicy, crawlLanguageFilter,
          crawlDailyLimit, crawlRankBy, crawlRateLimitMs, crawlDuplicateWindowDays,
        });
        toast.success("回遊設定を保存しました");
      } else if (wizardId === "notify") {
        await updatePreferences.mutateAsync({ notifyOnRepair, notifyOnCommunity });
        toast.success("通知設定を保存しました");
      }
    } catch (e) {
      toast.error(`保存失敗: ${String(e)}`);
    }
  };

  const item = WIZARD_ITEMS.find((i) => i.id === wizardId)!;
  const Icon = item.icon;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Icon className={`w-5 h-5 ${item.iconColor}`} />
          {item.label}
        </h2>
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-5 space-y-5">
        {/* 同期スケジュール */}
        {wizardId === "sync" && (
          <>
            <div className="space-y-2">
              <Label className="text-sm">同期間隔</Label>
              <Select value={String(syncIntervalHours)} onValueChange={(v) => setSyncIntervalHours(Number(v))}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">毎時</SelectItem>
                  <SelectItem value="6">6時間ごと</SelectItem>
                  <SelectItem value="12">12時間ごと</SelectItem>
                  <SelectItem value="24">毎日（推奨）</SelectItem>
                  <SelectItem value="72">3日ごと</SelectItem>
                  <SelectItem value="168">毎週</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">同期対象ブランチ</Label>
              <Input placeholder="main" value={syncBranch} onChange={(e) => setSyncBranch(e.target.value)} className="bg-background/50" />
            </div>
          </>
        )}

        {/* 修復設定 */}
        {wizardId === "repair" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">自動修復を有効にする</Label>
                <p className="text-xs text-muted-foreground mt-0.5">品質スコアが閾値を下回ったスキルを自動修復します</p>
              </div>
              <Switch checked={autoRepair} onCheckedChange={setAutoRepair} />
            </div>
            {autoRepair && (
              <div className="space-y-3">
                <Label className="text-sm">修復閾値: {repairThreshold}点</Label>
                <Slider min={0} max={100} step={5} value={[repairThreshold]} onValueChange={([v]) => setRepairThreshold(v)} />
                <p className="text-xs text-muted-foreground">品質スコアが {repairThreshold} 点未満になったスキルを修復します</p>
              </div>
            )}
            <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">修復とは？</p>
              <p>スキルの品質スコアが閾値を下回ると、LLMが自動的にSKILL.mdを改善します。修復済みスキルには <Badge className="text-xs py-0 px-1 bg-green-500/10 text-green-400 border-green-500/30">repaired</Badge> バッジが付きます。</p>
            </div>
          </>
        )}

        {/* 進化提案 */}
        {wizardId === "evolution" && (
          <>
            <div className="space-y-3">
              <Label className="text-sm">類似度閾値: {evolutionSimilarityThreshold}%</Label>
              <Slider min={0} max={100} step={5} value={[evolutionSimilarityThreshold]} onValueChange={([v]) => setEvolutionSimilarityThreshold(v)} />
              <p className="text-xs text-muted-foreground">公開スキルとの類似度が {evolutionSimilarityThreshold}% 以上の場合に進化提案を生成します</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">チェック間隔</Label>
              <Select value={String(evolutionCheckIntervalHours)} onValueChange={(v) => setEvolutionCheckIntervalHours(Number(v))}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6時間ごと</SelectItem>
                  <SelectItem value="12">12時間ごと</SelectItem>
                  <SelectItem value="24">毎日（推奨）</SelectItem>
                  <SelectItem value="72">3日ごと</SelectItem>
                  <SelectItem value="168">毎週</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">進化提案とは？</p>
              <p>マイスキルと類似した公開スキルを自動検出し、LLMが合成した改善版を提案します。適用済みスキルには <Badge className="text-xs py-0 px-1 bg-purple-500/10 text-purple-400 border-purple-500/30">derived</Badge> バッジが付きます。</p>
            </div>
          </>
        )}

        {/* 監視先リスト */}
        {wizardId === "watchlist" && (
          <>
            <div className="rounded-md border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">スキル広場用 監視先リスト</span>
              </div>
              <p className="text-xs text-muted-foreground">
                公開GitHubアカウント・リポジトリを登録すると、スキル広場に自動取得・表示されます。アクセストークン不要です。
              </p>
            </div>
            <div className="rounded-md border border-border bg-background/30 p-4 space-y-3">
              <p className="text-xs font-medium text-foreground">新しい監視先を追加</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">オーナー名 *</Label>
                  <Input placeholder="owner" value={newEntry.repoOwner} onChange={(e) => setNewEntry({ ...newEntry, repoOwner: e.target.value })} className="bg-background/50 h-8 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">リポジトリ名（空=全リポジトリ）</Label>
                  <Input placeholder="repo-name" value={newEntry.repoName} onChange={(e) => setNewEntry({ ...newEntry, repoName: e.target.value })} className="bg-background/50 h-8 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">スキルパス</Label>
                  <Input placeholder="skills" value={newEntry.skillsPath} onChange={(e) => setNewEntry({ ...newEntry, skillsPath: e.target.value })} className="bg-background/50 h-8 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">ブランチ</Label>
                  <Input placeholder="main" value={newEntry.branch} onChange={(e) => setNewEntry({ ...newEntry, branch: e.target.value })} className="bg-background/50 h-8 text-sm mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">ラベル（任意）</Label>
                <Input placeholder="例: 公式スキル集" value={newEntry.label} onChange={(e) => setNewEntry({ ...newEntry, label: e.target.value })} className="bg-background/50 h-8 text-sm mt-1" />
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => {
                if (!newEntry.repoOwner) return;
                setWatchList([...watchList, { ...newEntry, id: `${newEntry.repoOwner}-${newEntry.repoName}-${Date.now()}` }]);
                setNewEntry({ repoOwner: "", repoName: "", skillsPath: "skills", branch: "main", label: "" });
              }}>
                <PlusCircle className="w-3 h-3 mr-1" /> 追加
              </Button>
            </div>
            {watchList.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">登録済み ({watchList.length}件)</p>
                {watchList.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-md border border-border bg-background/30 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {entry.repoOwner}{entry.repoName ? `/${entry.repoName}` : " (全リポジトリ)"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        path: {entry.skillsPath} / branch: {entry.branch}{entry.label ? ` / ${entry.label}` : ""}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setWatchList(watchList.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 回遊設定 */}
        {wizardId === "crawl" && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-semibold">A. クロール動作設定</h4>
              </div>
              <div className="space-y-4 pl-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">自動クロールを有効にする</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">GitHub全体を定期的に回遊してスキルを収集します</p>
                  </div>
                  <Switch checked={crawlEnabled} onCheckedChange={setCrawlEnabled} />
                </div>
                {crawlEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">クロール間隔</Label>
                      <Select value={String(crawlIntervalHours)} onValueChange={(v) => setCrawlIntervalHours(Number(v))}>
                        <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6時間ごと</SelectItem>
                          <SelectItem value="12">12時間ごと</SelectItem>
                          <SelectItem value="24">毎日（推奨）</SelectItem>
                          <SelectItem value="72">3日ごと</SelectItem>
                          <SelectItem value="168">毎週</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">検索キーワード（カンマ区切り）</Label>
                      <Input placeholder="例: claude-code, mcp-server, skill" value={crawlKeywords} onChange={(e) => setCrawlKeywords(e.target.value)} className="bg-background/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">検索対象パス</Label>
                      <Input placeholder=".claude/skills" value={crawlSearchPath} onChange={(e) => setCrawlSearchPath(e.target.value)} className="bg-background/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">除外リポジトリ</Label>
                      <div className="flex gap-2">
                        <Input placeholder="owner/repo" value={newExclude} onChange={(e) => setNewExclude(e.target.value)} className="bg-background/50" />
                        <Button size="sm" variant="outline" onClick={() => { if (newExclude && !crawlExcludeRepos.includes(newExclude)) { setCrawlExcludeRepos([...crawlExcludeRepos, newExclude]); setNewExclude(""); } }}>追加</Button>
                      </div>
                      {crawlExcludeRepos.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {crawlExcludeRepos.map((r) => (
                            <Badge key={r} variant="secondary" className="text-xs cursor-pointer" onClick={() => setCrawlExcludeRepos(crawlExcludeRepos.filter((x) => x !== r))}>
                              {r} ×
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-semibold">B. スキル条件フィルター</h4>
              </div>
              <div className="space-y-4 pl-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">最低スター数</Label>
                    <Input type="number" min={0} value={crawlMinStars} onChange={(e) => setCrawlMinStars(Number(e.target.value))} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">最低フォーク数</Label>
                    <Input type="number" min={0} value={crawlMinForks} onChange={(e) => setCrawlMinForks(Number(e.target.value))} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">最終更新（日数以内、0=制限なし）</Label>
                    <Input type="number" min={0} value={crawlMaxAgeDays} onChange={(e) => setCrawlMaxAgeDays(Number(e.target.value))} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">SKILL.md最小文字数</Label>
                    <Input type="number" min={0} value={crawlMinSkillLength} onChange={(e) => setCrawlMinSkillLength(Number(e.target.value))} className="bg-background/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">言語フィルター（カンマ区切り、空=全言語）</Label>
                  <Input placeholder="例: ja,en" value={crawlLanguageFilter} onChange={(e) => setCrawlLanguageFilter(e.target.value)} className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">重複スキルの扱い</Label>
                  <Select value={crawlDuplicatePolicy} onValueChange={(v) => setCrawlDuplicatePolicy(v as "skip" | "update" | "version")}>
                    <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">スキップ（既存を維持）</SelectItem>
                      <SelectItem value="update">上書き更新（推奨）</SelectItem>
                      <SelectItem value="version">新バージョンとして追加</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">重複チェック対象期間（日数、0=全期間）</Label>
                  <Input type="number" min={0} value={crawlDuplicateWindowDays} onChange={(e) => setCrawlDuplicateWindowDays(Number(e.target.value))} className="bg-background/50" />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-semibold">C. 1日あたりの取得条件</h4>
              </div>
              <div className="space-y-4 pl-5">
                <div className="space-y-3">
                  <Label className="text-sm">最大取得件数: {crawlDailyLimit}件/日</Label>
                  <Slider min={10} max={500} step={10} value={[crawlDailyLimit]} onValueChange={([v]) => setCrawlDailyLimit(v)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">ランキング基準</Label>
                  <Select value={crawlRankBy} onValueChange={(v) => setCrawlRankBy(v as "stars" | "forks" | "freshness" | "composite")}>
                    <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="composite">総合スコア（推奨）</SelectItem>
                      <SelectItem value="stars">スター数</SelectItem>
                      <SelectItem value="forks">フォーク数</SelectItem>
                      <SelectItem value="freshness">更新鮮度</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">APIレート制限対策（リクエスト間隔 ms）</Label>
                  <Input type="number" min={0} max={5000} value={crawlRateLimitMs} onChange={(e) => setCrawlRateLimitMs(Number(e.target.value))} className="bg-background/50" />
                  <p className="text-xs text-muted-foreground">推奨: 500ms（0=制限なし）</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 通知設定 */}
        {wizardId === "notify" && (
          <div className="space-y-3">
            {[
              { label: "自動修復完了時に通知", desc: "スキルが自動修復されたときに通知します", value: notifyOnRepair, set: setNotifyOnRepair },
              { label: "品質低下検知時に通知", desc: "スキルの品質スコアが閾値を下回ったときに通知します", value: notifyOnDegradation, set: setNotifyOnDegradation },
              { label: "スキル広場の更新時に通知", desc: "スキル広場に新しいスキルが追加されたときに通知します", value: notifyOnCommunity, set: setNotifyOnCommunity },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-md border border-border bg-background/30 p-3">
                <div>
                  <Label className="text-sm">{item.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <Switch checked={item.value} onCheckedChange={item.set} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave}>保存</Button>
      </div>
    </div>
  );
}

// ─── ManualTab: 手動設定（Agent連携のみ） ────────────
function ManualTab() {
  const [, navigate] = useLocation();

  const agentFeatures = [
    { path: "/claude/merge",  label: "AIマージ",       desc: "複数のSKILL.mdをLLMで合成して品質向上",                         icon: Sparkles, color: "text-purple-400" },
    { path: "/claude/diff",   label: "差分インポート",  desc: "既存スキルを新バージョンとして差分登録",                         icon: RefreshCw, color: "text-cyan-400" },
    { path: "/claude/tags",   label: "自動タグ付け",   desc: "allowed-toolsからタグを自動マッピング・プレビュー",              icon: Filter,   color: "text-yellow-400" },
    { path: "/claude/single", label: "単体インポート",  desc: "SKILL.mdを貼り付け・アップロードして1件ずつ登録",               icon: Link2,    color: "text-green-400" },
    { path: "/claude/smart",  label: "スマート起動",   desc: "キーワード・タスク種別でスキルを検索してSKILL.mdをコピー",       icon: Zap,      color: "text-orange-400" },
    { path: "/claude/mcp",    label: "MCP設定",        desc: "~/.claude.json用MCP設定スニペット・オーケストレーターSKILL.mdを生成", icon: Terminal, color: "text-pink-400" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Agent連携</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Claude Code との連携機能を直接操作します。各機能のページに移動して設定・実行できます。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {agentFeatures.map(({ path, label, desc, icon: Icon, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-start gap-3 rounded-md border border-border bg-card/50 p-4 text-left hover:bg-card/80 transition-colors group"
            >
              <div className={`mt-0.5 shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ──────────────────────────
export default function UserSettings() {
  const [location, navigate] = useLocation();

  // アクティブな第1カラムタブを判定
  const isAccount = location.startsWith("/settings/account") || location === "/settings";
  const isIntegrations = location.startsWith("/settings/integrations");
  const isWizard = location.startsWith("/settings/wizard");
  const isManual = location.startsWith("/settings/manual");
  const isInitialSetup = isIntegrations || isWizard;

  // 第2カラムのアクティブ項目を判定
  const activeIntegration = ((): IntegrationId | null => {
    const m = location.match(/^\/settings\/integrations\/(.+)/);
    if (m && INTEGRATION_ITEMS.some((i) => i.id === m[1])) return m[1] as IntegrationId;
    return null;
  })();
  const activeWizard = ((): WizardId | null => {
    const m = location.match(/^\/settings\/wizard\/(.+)/);
    if (m && WIZARD_ITEMS.some((i) => i.id === m[1])) return m[1] as WizardId;
    return null;
  })();

  // 初期設定を開いたとき、デフォルトでgithubを表示
  useEffect(() => {
    if (location === "/settings/integrations" || location === "/settings/wizard") {
      navigate("/settings/integrations/github");
    }
  }, [location]);

  const firstColItems = [
    { path: "/settings/account",      label: "ユーザーアカウント", icon: User,     active: isAccount },
    { path: "/settings/integrations", label: "初期設定",           icon: Wand2,    active: isInitialSetup, badge: "重要" },
    { path: "/settings/manual",       label: "手動設定",           icon: Settings, active: isManual },
  ];

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-screen">
        {/* ─── 第2カラム（初期設定時のみ表示） ─── */}
        {isInitialSetup && (
          <div className="w-52 shrink-0 border-r border-border bg-background/50 py-4 px-2 space-y-1 overflow-y-auto">
            {/* 外部サービス連携グループ */}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1 pt-1">外部サービス連携</p>
            {INTEGRATION_ITEMS.map(({ id, label, icon: Icon, iconColor }) => (
              <button
                key={id}
                onClick={() => navigate(`/settings/integrations/${id}`)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors text-left ${
                  activeIntegration === id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${activeIntegration === id ? "text-primary" : iconColor}`} />
                <span className="truncate text-xs">{label}</span>
              </button>
            ))}

            {/* 設定グループ */}
            <div className="pt-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">設定</p>
              {WIZARD_ITEMS.map(({ id, label, icon: Icon, iconColor }) => (
                <button
                  key={id}
                  onClick={() => navigate(`/settings/wizard/${id}`)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors text-left ${
                    activeWizard === id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${activeWizard === id ? "text-primary" : iconColor}`} />
                  <span className="truncate text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── コンテンツエリア ─── */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-5">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              設定
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAccount && "アカウント情報と外部サービス連携の概要"}
              {isInitialSetup && "外部サービス連携と各種設定"}
              {isManual && "Agent連携機能の手動操作"}
            </p>
          </div>

          {isAccount && <AccountTab />}
          {activeIntegration && <IntegrationPanel serviceId={activeIntegration} />}
          {activeWizard && <WizardPanel wizardId={activeWizard} />}
          {isManual && <ManualTab />}
        </div>
      </div>
    </DashboardLayout>
  );
}
