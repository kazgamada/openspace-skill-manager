/**
 * UserSettings.tsx — v6設計
 * 設定ページ（3サブページ）
 * /settings/account  → ユーザーアカウント
 * /settings/wizard   → 初期設定ウィザード（7ステップ・2エリア構成）
 *   [マイスキル設定エリア] Step1:GitHub連携 / Step2:同期スケジュール / Step3:修復設定 / Step4:進化提案設定
 *   [スキル広場設定エリア] Step5:監視先リスト / Step6:回遊設定 / Step7:通知設定
 * /settings/manual   → 手動設定
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
  Globe, Zap, Bell, PlusCircle, Trash2, Lock, ChevronRight, ChevronLeft,
  CheckCircle2, Filter, Clock, Link2, HardDrive, Terminal, AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
// ─── ステップ定義義 ──────────────────────────────────
const STEPS = [
  { id: 1, label: "GitHub連携",    icon: Github,    area: "my"     as const },
  { id: 2, label: "同期スケジュール", icon: RefreshCw, area: "my"  as const },
  { id: 3, label: "修復設定",      icon: Wrench,    area: "my"     as const },
  { id: 4, label: "進化提案",      icon: Sparkles,  area: "my"     as const },
  { id: 5, label: "監視先リスト",  icon: Globe,     area: "plaza"  as const },
  { id: 6, label: "回遊設定",      icon: Zap,       area: "plaza"  as const },
  { id: 7, label: "通知設定",      icon: Bell,      area: "plaza"  as const },
];

// ─── AccountTab ───────────────────────────────────
function AccountTab() {
  const { user, logout } = useAuth();
  const intQuery = trpc.settings.getIntegrations.useQuery();
  const intMap = ((intQuery.data ?? []) as Array<{ service: string; connected: boolean; testedAt?: string | null }>)
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
            詳細な連携設定は「初期設定ウィザード」または「手動設定」から行えます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { key: "claude",      label: "Claude Code",       Icon: Zap,       iconColor: "text-amber-400" },
              { key: "github",      label: "GitHub",            Icon: Github,    iconColor: "text-foreground" },
              { key: "googleDrive", label: "Google Drive",      Icon: HardDrive, iconColor: "text-blue-400" },
              { key: "localFolder", label: "ローカルフォルダー", Icon: Terminal,  iconColor: "text-emerald-400" },
            ].map(({ key, label, Icon, iconColor }) => {
              const connected = intMap[key]?.connected ?? false;
              return (
                <div key={key} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/20 border border-border/50">
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

// ─── WizardTab ────────────────────────────────────
function WizardTab() {
  const [step, setStep] = useState(1);
  const utils = trpc.useUtils();

  // Step1: GitHub連携（マイスキル用）
  const [githubToken, setGithubToken] = useState("");

  // Step2: 同期スケジュール
  const [syncIntervalHours, setSyncIntervalHours] = useState(24);
  const [syncBranch, setSyncBranch] = useState("main");

  // Step3: 修復設定
  const [autoRepair, setAutoRepair] = useState(true);
  const [repairThreshold, setRepairThreshold] = useState(60);

  // Step4: 進化提案設定
  const [evolutionSimilarityThreshold, setEvolutionSimilarityThreshold] = useState(70);
  const [evolutionCheckIntervalHours, setEvolutionCheckIntervalHours] = useState(24);

  // Step5: 監視先リスト（スキル広場用）
  type WatchEntry = { id: string; repoOwner: string; repoName: string; skillsPath: string; branch: string; label: string };
  const [watchList, setWatchList] = useState<WatchEntry[]>([]);
  const [newEntry, setNewEntry] = useState<Omit<WatchEntry, 'id'>>({ repoOwner: "", repoName: "", skillsPath: "skills", branch: "main", label: "" });

  // Step6: 回遊設定
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

  // Step7: 通知設定
  const [notifyOnRepair, setNotifyOnRepair] = useState(true);
  const [notifyOnDegradation, setNotifyOnDegradation] = useState(true);
  const [notifyOnCommunity, setNotifyOnCommunity] = useState(false);

  // データ取得
  const { data: integrations } = trpc.settings.getIntegrations.useQuery();
  const { data: watchListData } = trpc.settings.getPublicWatchList.useQuery();
  const { data: syncData } = trpc.settings.getSyncSettings.useQuery();
  const { data: evolutionData } = trpc.settings.getEvolutionSettings.useQuery();
  const { data: crawlData } = trpc.settings.getCrawlSettings.useQuery();

  useEffect(() => {
    if (watchListData && watchList.length === 0) setWatchList(watchListData as WatchEntry[]);
  }, [watchListData]);
  useEffect(() => {
    if (syncData) { setSyncIntervalHours(syncData.syncIntervalHours); setSyncBranch(syncData.syncBranch); }
  }, [syncData]);
  useEffect(() => {
    if (evolutionData) { setEvolutionSimilarityThreshold(evolutionData.evolutionSimilarityThreshold); setEvolutionCheckIntervalHours(evolutionData.evolutionCheckIntervalHours); }
  }, [evolutionData]);
  useEffect(() => {
    if (crawlData) {
      setCrawlEnabled(crawlData.crawlEnabled);
      setCrawlIntervalHours(crawlData.crawlIntervalHours);
      setCrawlKeywords(crawlData.crawlKeywords);
      setCrawlSearchPath(crawlData.crawlSearchPath);
      setCrawlExcludeRepos(crawlData.crawlExcludeRepos);
      setCrawlMinStars(crawlData.crawlMinStars);
      setCrawlMinForks(crawlData.crawlMinForks);
      setCrawlMaxAgeDays(crawlData.crawlMaxAgeDays);
      setCrawlMinSkillLength(crawlData.crawlMinSkillLength);
      setCrawlDuplicatePolicy(crawlData.crawlDuplicatePolicy as "skip" | "update" | "version");
      setCrawlLanguageFilter(crawlData.crawlLanguageFilter);
      setCrawlDailyLimit(crawlData.crawlDailyLimit);
      setCrawlRankBy(crawlData.crawlRankBy as "stars" | "forks" | "freshness" | "composite");
      setCrawlRateLimitMs(crawlData.crawlRateLimitMs);
      setCrawlDuplicateWindowDays(crawlData.crawlDuplicateWindowDays);
    }
  }, [crawlData]);

  // Mutations
  const saveIntegration = trpc.settings.saveIntegration.useMutation();
  const savePublicWatchList = trpc.settings.savePublicWatchList.useMutation();
  const saveSyncSettings = trpc.settings.saveSyncSettings.useMutation();
  const saveEvolutionSettings = trpc.settings.saveEvolutionSettings.useMutation();
  const saveCrawlSettings = trpc.settings.saveCrawlSettings.useMutation();
  const updatePreferences = trpc.settings.updatePreferences.useMutation();

  const githubConnected = ((integrations ?? []) as Array<{ service: string; connected: boolean }>)
    .some((i) => i.service === "github" && i.connected);

  const handleSaveStep = async () => {
    try {
      if (step === 1) {
        if (githubToken) {
          await saveIntegration.mutateAsync({ service: "github", config: { token: githubToken } });
          utils.settings.getIntegrations.invalidate();
        }
        toast.success("Step 1 保存完了: GitHub連携設定を保存しました");
      } else if (step === 2) {
        await saveSyncSettings.mutateAsync({ syncIntervalHours, syncBranch });
        toast.success("Step 2 保存完了: 同期スケジュールを保存しました");
      } else if (step === 3) {
        await updatePreferences.mutateAsync({ notifyOnRepair: autoRepair });
        toast.success("Step 3 保存完了: 修復設定を保存しました");
      } else if (step === 4) {
        await saveEvolutionSettings.mutateAsync({ evolutionSimilarityThreshold, evolutionCheckIntervalHours });
        toast.success("Step 4 保存完了: 進化提案設定を保存しました");
      } else if (step === 5) {
        await savePublicWatchList.mutateAsync({ watchList });
        utils.settings.getPublicWatchList.invalidate();
        toast.success(`Step 5 保存完了: 監視先リストを保存しました（${watchList.length}件）`);
      } else if (step === 6) {
        await saveCrawlSettings.mutateAsync({
          crawlEnabled, crawlIntervalHours, crawlKeywords, crawlSearchPath,
          crawlExcludeRepos, crawlMinStars, crawlMinForks, crawlMaxAgeDays,
          crawlMinSkillLength, crawlDuplicatePolicy, crawlLanguageFilter,
          crawlDailyLimit, crawlRankBy, crawlRateLimitMs, crawlDuplicateWindowDays,
        });
        toast.success("Step 6 保存完了: 回遊設定を保存しました");
      } else if (step === 7) {
        await updatePreferences.mutateAsync({ notifyOnRepair, notifyOnCommunity });
        toast.success("設定完了！全ての設定を保存しました");
      }
      if (step < 7) setStep(step + 1);
    } catch (e) {
      toast.error(`保存失敗: ${String(e)}`);
    }
  };

  const currentStep = STEPS[step - 1];
  const isMyArea = currentStep.area === "my";
  const StepIcon = currentStep.icon;

  return (
    <div className="max-w-2xl space-y-5">
      {/* エリアラベル */}
      <div className="flex gap-2 flex-wrap">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${isMyArea ? "bg-blue-500/10 border-blue-500/40 text-blue-400" : "bg-muted/50 border-border text-muted-foreground"}`}>
          <Lock className="w-3 h-3" />
          マイスキル設定エリア（Step 1〜4）
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${!isMyArea ? "bg-purple-500/10 border-purple-500/40 text-purple-400" : "bg-muted/50 border-border text-muted-foreground"}`}>
          <Globe className="w-3 h-3" />
          スキル広場設定エリア（Step 5〜7）
        </div>
      </div>

      {/* ステッパー */}
      <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isDone = s.id < step;
          const isMyStep = s.area === "my";
          const isBoundary = idx === 3; // Step4→Step5の境界
          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? isMyStep ? "bg-blue-500 border-blue-500 text-white" : "bg-purple-500 border-purple-500 text-white"
                    : isDone ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-muted/50 border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span>{s.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`w-3 h-px mx-0.5 ${isBoundary ? "border-dashed border-t border-purple-500/40" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* スキル広場エリア開始ライン */}
      {step === 5 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-purple-500/30" />
          <span className="text-xs text-purple-400 font-medium whitespace-nowrap">ここからスキル広場設定エリア</span>
          <div className="flex-1 h-px bg-purple-500/30" />
        </div>
      )}

      {/* ステップコンテンツ */}
      <div className="rounded-lg border border-border bg-card/50 p-5">
        <div className="flex items-center gap-2 mb-5">
          <StepIcon className={`w-5 h-5 ${isMyArea ? "text-blue-400" : "text-purple-400"}`} />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Step {step}: {currentStep.label}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === 1 && "マイスキル用GitHubアカウントを連携します（プライベートリポジトリも対象）"}
              {step === 2 && "自分のリポジトリとの同期頻度・ブランチを設定します"}
              {step === 3 && "スキルの品質低下を検知して自動修復する設定です"}
              {step === 4 && "公開スキルとの類似度を検出して進化提案を生成します"}
              {step === 5 && "スキル広場に表示する公開GitHubアカウント・リポジトリを登録します（トークン不要）"}
              {step === 6 && "ネット上を回遊してスキルを自動収集するクローラーを設定します"}
              {step === 7 && "各イベントの通知設定を行います"}
            </p>
          </div>
        </div>

        {/* ─── Step 1: マイスキル用 GitHub連携 ─── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Github className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">マイスキル用 GitHubアカウント</span>
                </div>
                {githubConnected && (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />連携済み
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                自分のプライベート/パブリックリポジトリからスキルを自動取得します。アクセストークンが必要です。
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">GitHubアクセストークン</Label>
              <Input
                type="password"
                placeholder={githubConnected ? "変更する場合のみ入力" : "ghp_xxxxxxxxxxxx"}
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                  github.com/settings/tokens
                </a>
                {" "}で生成（repo スコープが必要）
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">スキル広場用の監視先リストは Step 5 で設定します</p>
              <p>公開GitHubアカウント・リポジトリの監視設定はスキル広場設定エリア（Step 5）で行います。トークン不要です。</p>
            </div>
          </div>
        )}

        {/* ─── Step 2: 同期スケジュール ─── */}
        {step === 2 && (
          <div className="space-y-5">
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
          </div>
        )}

        {/* ─── Step 3: 修復設定 ─── */}
        {step === 3 && (
          <div className="space-y-5">
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
          </div>
        )}

        {/* ─── Step 4: 進化提案設定 ─── */}
        {step === 4 && (
          <div className="space-y-5">
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
          </div>
        )}

        {/* ─── Step 5: スキル広場用 監視先リスト ─── */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="rounded-md border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">スキル広場用 監視先リスト</span>
              </div>
              <p className="text-xs text-muted-foreground">
                公開GitHubアカウント・リポジトリを登録すると、スキル広場に自動取得・表示されます。アクセストークン不要です。
              </p>
            </div>

            {/* 新規追加フォーム */}
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

            {/* 登録済みリスト */}
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
          </div>
        )}

        {/* ─── Step 6: 回遊設定 ─── */}
        {step === 6 && (
          <div className="space-y-6">
            {/* セクション A */}
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
                      <p className="text-xs text-muted-foreground">空の場合はデフォルトキーワードで検索します</p>
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

            {/* セクション B */}
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

            {/* セクション C */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-semibold">C. 1日あたりの取得条件</h4>
              </div>
              <div className="space-y-4 pl-5">
                <div className="space-y-3">
                  <Label className="text-sm">最大取得件数: {crawlDailyLimit}件/日</Label>
                  <Slider min={10} max={500} step={10} value={[crawlDailyLimit]} onValueChange={([v]) => setCrawlDailyLimit(v)} />
                  <p className="text-xs text-muted-foreground">GitHub APIのレート制限に注意してください（認証なし: 10req/min）</p>
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
                  <p className="text-xs text-muted-foreground">推奨: 500ms（0=制限なし、APIエラーが増える可能性あり）</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 7: 通知設定 ─── */}
        {step === 7 && (
          <div className="space-y-5">
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
            <div className="rounded-md border border-green-500/20 bg-green-500/5 p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">全ての設定が完了しました！「保存して完了」を押すと設定が保存されます。</p>
            </div>
          </div>
        )}
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" size="sm" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
          <ChevronLeft className="w-4 h-4 mr-1" /> 戻る
        </Button>
        <Button size="sm" onClick={handleSaveStep} className={isMyArea ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"}>
          {step === 7 ? "保存して完了" : "保存して次へ"}
          {step < 7 && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

// ─── ManualTab ────────────────────────────────────
function ManualTab() {
  const { data: integrations, isLoading } = trpc.settings.getIntegrations.useQuery();
  const saveIntegration = trpc.settings.saveIntegration.useMutation();
  const [editingService, setEditingService] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const services = [
    { type: "github",      label: "GitHub",            desc: "リポジトリからスキルを取得",    icon: Github },
    { type: "claude",      label: "Claude Code",       desc: "MCP連携・スキル自動取得",       icon: Zap },
    { type: "googleDrive", label: "Google Drive",      desc: "Driveからスキルを取得",         icon: HardDrive },
    { type: "localFolder", label: "ローカルフォルダー", desc: "ローカルパスからスキルを取得",   icon: Terminal },
  ];

  // Agent連携の6機能（GitHub取得は別途実装済みのため除外）
  const agentFeatures = [
    {
      path: "/claude/merge",
      label: "AIマージ",
      desc: "複数のSKILL.mdをLLMで合成して品質向上",
      icon: Sparkles,
      color: "text-purple-400",
    },
    {
      path: "/claude/diff",
      label: "差分インポート",
      desc: "既存スキルを新バージョンとして差分登録",
      icon: RefreshCw,
      color: "text-cyan-400",
    },
    {
      path: "/claude/tags",
      label: "自動タグ付け",
      desc: "allowed-toolsからタグを自動マッピング・プレビュー",
      icon: Filter,
      color: "text-yellow-400",
    },
    {
      path: "/claude/single",
      label: "単体インポート",
      desc: "SKILL.mdを貼り付け・アップロードして1件ずつ登録",
      icon: Link2,
      color: "text-green-400",
    },
    {
      path: "/claude/smart",
      label: "スマート起動",
      desc: "キーワード・タスク種別でスキルを検索してSKILL.mdをコピー",
      icon: Zap,
      color: "text-orange-400",
    },
    {
      path: "/claude/mcp",
      label: "MCP設定",
      desc: "~/.claude.json用MCP設定スニペット・オーケストレーターSKILL.mdを生成",
      icon: Terminal,
      color: "text-pink-400",
    },
  ];

  const getStatus = (serviceType: string) => {
    if (!integrations) return null;
    return (integrations as Array<{ service: string; connected: boolean }>).find((i) => i.service === serviceType);
  };

  const handleSave = async (serviceType: "claude" | "github" | "googleDrive" | "localFolder") => {
    if (!tokenInput) return;
    try {
      await saveIntegration.mutateAsync({ service: serviceType, config: { token: tokenInput } });
      utils.settings.getIntegrations.invalidate();
      setEditingService(null);
      setTokenInput("");
      toast.success(`保存完了: ${serviceType} の設定を保存しました`);
    } catch (e) {
      toast.error(`保存失敗: ${String(e)}`);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ─── 外部サービス連携設定 ─── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">外部サービス連携</h3>
        <p className="text-xs text-muted-foreground mb-3">各サービスのアクセストークンを直接設定します。</p>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">読み込み中...</div>
        ) : (
          <div className="space-y-3">
            {services.map(({ type, label, desc, icon: Icon }) => {
              const status = getStatus(type);
              const isEditing = editingService === type;
              return (
                <div key={type} className="rounded-md border border-border bg-card/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status?.connected && (
                        <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/30">連携済み</Badge>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setEditingService(isEditing ? null : type); setTokenInput(""); }}>
                        {isEditing ? "キャンセル" : "設定"}
                      </Button>
                    </div>
                  </div>
                  {isEditing && (
                    <div className="mt-3 space-y-2">
                      <Input type="password" placeholder={status?.connected ? "変更する場合のみ入力" : "アクセストークン"} value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} className="bg-background/50" />
                      <Button size="sm" onClick={() => handleSave(type as "claude" | "github" | "googleDrive" | "localFolder")} disabled={!tokenInput}>保存</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Agent連携 ─── */}
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

  const tabs = [
    { path: "/settings/account", label: "ユーザーアカウント", icon: User },
    { path: "/settings/wizard",  label: "初期設定ウィザード", icon: Wand2, badge: "重要" },
    { path: "/settings/manual",  label: "手動設定",           icon: Settings },
  ];

  const activeTab = tabs.find((t) => location.startsWith(t.path))?.path ?? "/settings/account";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            設定
          </h1>
          <p className="text-sm text-muted-foreground mt-1">初期設定に関するすべての設定項目をここに集約しています</p>
        </div>

        {/* タブナビ */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map(({ path, label, icon: Icon, badge }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === path ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {badge && (
                <Badge className="text-xs py-0 px-1 bg-blue-500/10 text-blue-400 border-blue-500/30 ml-1">{badge}</Badge>
              )}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        {activeTab === "/settings/account" && <AccountTab />}
        {activeTab === "/settings/wizard"  && <WizardTab />}
        {activeTab === "/settings/manual"  && <ManualTab />}
      </div>
    </DashboardLayout>
  );
}
