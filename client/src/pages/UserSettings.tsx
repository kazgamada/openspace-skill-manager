/**
 * UserSettings.tsx — v4設計
 * 設定ページ（3サブページ）
 * /settings/account  → ユーザーアカウント
 * /settings/wizard   → 初期設定ウィザード（最重要）
 * /settings/manual   → 手動設定
 * /settings          → /settings/account へリダイレクト
 */
import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle, CheckCircle2, ChevronRight, Clock, Github,
  Globe, HardDrive, Link2, Loader2, Lock, Play, PlusCircle,
  RefreshCw, Settings, Terminal, Trash2, Upload, User, Wand2, Zap,
} from "lucide-react";

// ─── ユーザーアカウントタブ ───────────────────────────────────────────────────
function AccountTab() {
  const { user, logout } = useAuth();
  const intQuery = trpc.settings.getIntegrations.useQuery();
  const intMap = ((intQuery.data ?? []) as Array<{ service: string; connected: boolean; testedAt?: string | null }>)
    .reduce<Record<string, { connected: boolean; testedAt?: string }>>((acc, it) => {
      acc[it.service] = { connected: it.connected, testedAt: it.testedAt ?? undefined };
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
            外部サービス連携
          </CardTitle>
          <CardDescription className="text-xs">
            詳細な連携設定は「初期設定ウィザード」または「手動設定」から行えます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { key: "claude",       label: "Claude Code",       Icon: Zap,       iconColor: "text-amber-400" },
              { key: "github",       label: "GitHub",            Icon: Github,    iconColor: "text-foreground" },
              { key: "googleDrive",  label: "Google Drive",      Icon: HardDrive, iconColor: "text-blue-400" },
              { key: "localFolder",  label: "ローカルフォルダー", Icon: Terminal,  iconColor: "text-emerald-400" },
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

// ─── 初期設定ウィザードタブ ───────────────────────────────────────────────────
const WIZARD_STEPS = [
  { id: 1, title: "GitHub連携",       icon: Github,      desc: "GitHubアクセストークン・監視対象リポジトリを登録" },
  { id: 2, title: "同期スケジュール",  icon: Clock,       desc: "同期間隔・対象ブランチを設定" },
  { id: 3, title: "修復設定",          icon: Wand2,       desc: "品質スコア閾値・自動修復の有効/無効" },
  { id: 4, title: "進化提案設定",      icon: Zap,         desc: "類似度閾値・提案の自動検出間隔" },
  { id: 5, title: "通知設定",          icon: AlertCircle, desc: "同期完了・修復完了・提案生成の通知" },
];

function WizardTab() {
  const [step, setStep] = useState(1);
  const utils = trpc.useUtils();
  const intQuery = trpc.settings.getIntegrations.useQuery();
  const prefsQuery = trpc.settings.getPreferences.useQuery();
  const saveIntegration = trpc.settings.saveIntegration.useMutation({
    onSuccess: () => { toast.success("保存しました"); utils.settings.getIntegrations.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const savePrefs = trpc.settings.updatePreferences.useMutation({
    onSuccess: () => { toast.success("設定を保存しました"); utils.settings.getPreferences.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const intMap = ((intQuery.data ?? []) as Array<{ service: string; connected: boolean; config?: unknown }>)
    .reduce<Record<string, { connected: boolean; config?: Record<string, string> }>>((acc, it) => {
      acc[it.service] = { connected: it.connected, config: it.config as Record<string, string> };
      return acc;
    }, {});
  const prefs = prefsQuery.data as Record<string, unknown> | undefined;

  // マイスキル用 GitHubアカウント
  const [githubToken, setGithubToken] = useState("");
  const githubConnected = intMap["github"]?.connected ?? false;

  // スキル広場用 監視先リスト
  const watchListQuery = trpc.settings.getPublicWatchList.useQuery();
  const saveWatchList = trpc.settings.savePublicWatchList.useMutation({
    onSuccess: (res) => { toast.success(`監視先リストを保存しました（${res.count}件）`); utils.settings.getPublicWatchList.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  type WatchEntry = { id: string; label: string; repoOwner: string; repoName: string; skillsPath: string; branch: string };
  const [watchList, setWatchList] = useState<WatchEntry[]>([]);
  const [watchInput, setWatchInput] = useState(""); // "owner/repo" 形式
  const [watchLabel, setWatchLabel] = useState("");
  // watchListQueryのデータが来たら初期化
  const watchListData = watchListQuery.data as WatchEntry[] | undefined;
  const effectiveWatchList = watchList.length > 0 || watchListData === undefined ? watchList : watchListData;

  const addWatchEntry = () => {
    const trimmed = watchInput.trim();
    if (!trimmed) return;
    const parts = trimmed.split("/");
    if (parts.length < 2) { toast.error("owner/repo 形式で入力してください"); return; }
    const repoOwner = parts[0];
    const repoName = parts[1];
    const id = `${repoOwner}-${repoName}-${Date.now()}`;
    const newEntry: WatchEntry = { id, label: watchLabel || `${repoOwner}/${repoName}`, repoOwner, repoName, skillsPath: "skills", branch: "main" };
    const base = watchList.length > 0 ? watchList : (watchListData ?? []);
    setWatchList([...base, newEntry]);
    setWatchInput("");
    setWatchLabel("");
  };
  const removeWatchEntry = (id: string) => {
    const base = watchList.length > 0 ? watchList : (watchListData ?? []);
    setWatchList(base.filter((e) => e.id !== id));
  };
  const [syncInterval, setSyncInterval] = useState(String(prefs?.syncIntervalHours ?? 6));
  const [syncBranch, setSyncBranch] = useState(String(prefs?.syncBranch ?? "main"));
  const [qualityThreshold, setQualityThreshold] = useState(String(prefs?.qualityThreshold ?? 60));
  const [autoRepair, setAutoRepair] = useState(Boolean(prefs?.autoRepair ?? true));
  const [similarityThreshold, setSimilarityThreshold] = useState(String(prefs?.similarityThreshold ?? 70));
  const [evolutionInterval, setEvolutionInterval] = useState(String(prefs?.evolutionIntervalHours ?? 24));
  const [notifySyncDone, setNotifySyncDone] = useState(Boolean(prefs?.notifySyncDone ?? true));
  const [notifyRepairDone, setNotifyRepairDone] = useState(Boolean(prefs?.notifyRepairDone ?? true));
  const [notifyEvolution, setNotifyEvolution] = useState(Boolean(prefs?.notifyEvolution ?? true));

  const handleSaveStep = () => {
    if (step === 1) {
      if (!githubToken && !githubConnected) { toast.info("GitHubトークンを入力してください"); return; }
      if (githubToken) {
        const existing = intMap["github"]?.config ?? {};
        saveIntegration.mutate({ service: "github", config: { ...existing, token: githubToken } });
      }
      // 監視先リストを保存
      const listToSave = watchList.length > 0 ? watchList : (watchListData ?? []);
      if (listToSave.length > 0) {
        saveWatchList.mutate({ watchList: listToSave });
      }
    } else if (step === 2) {
      toast.success("同期スケジュールを保存しました（設定反映は次回同期時）");
    } else if (step === 3) {
      savePrefs.mutate({ notifyOnRepair: autoRepair });
    } else if (step === 4) {
      toast.success("進化提案設定を保存しました");
    } else if (step === 5) {
      savePrefs.mutate({ notifyOnRepair: notifyRepairDone, notifyOnCommunity: notifyEvolution });
    }
    if (step < 5) setStep(step + 1);
  };

  const StepIcon = WIZARD_STEPS[step - 1].icon;

  return (
    <div className="max-w-2xl space-y-6">
      {/* ステップ進捗バー */}
      <div className="flex items-center gap-1">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <button
              onClick={() => setStep(s.id)}
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-all shrink-0 ${
                step === s.id
                  ? "bg-primary border-primary text-primary-foreground"
                  : step > s.id
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-muted/30 border-border text-muted-foreground"
              }`}
            >
              {step > s.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.id}
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 ${step > s.id ? "bg-primary/50" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* ステップタイトル */}
      <div className="flex items-center gap-3">
        <StepIcon className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold">Step {step}: {WIZARD_STEPS[step - 1].title}</h2>
          <p className="text-xs text-muted-foreground">{WIZARD_STEPS[step - 1].desc}</p>
        </div>
      </div>

      {/* ステップコンテンツ */}
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          {step === 1 && (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                <Github className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="font-medium">GitHub連携を設定すると</p>
                  <p className="text-muted-foreground mt-0.5">スキルソースの自動同期が有効になります。プライベートリポジトリのスキルも検索・インポートできます。</p>
                </div>
                {githubConnected && (
                  <Badge className="ml-auto shrink-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />連携済み
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">GitHubアクセストークン</Label>
                <Input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)}
                  placeholder={githubConnected ? "変更する場合のみ入力" : "ghp_xxxxxxxxxxxx"}
                  className="h-8 text-sm font-mono" />
                <p className="text-[10px] text-muted-foreground">
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    github.com/settings/tokens
                  </a> で生成（repo スコープが必要）
                </p>
              </div>
              {/* スキル広場用 監視先リスト セクション */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">スキル広場用 監視先リスト</p>
                    <p className="text-[10px] text-muted-foreground">公開GitHubアカウント/リポジトリを登録してスキル広場に自動取得。トークン不要。</p>
                  </div>
                </div>
                {/* 登録済みリスト */}
                {effectiveWatchList.length > 0 && (
                  <div className="space-y-1.5">
                    {effectiveWatchList.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/20 border border-border/50">
                        <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-mono flex-1">{entry.repoOwner}/{entry.repoName}</span>
                        {entry.label !== `${entry.repoOwner}/${entry.repoName}` && (
                          <span className="text-[10px] text-muted-foreground">{entry.label}</span>
                        )}
                        <button onClick={() => removeWatchEntry(entry.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* 新規追加 */}
                <div className="flex gap-2">
                  <Input
                    value={watchInput}
                    onChange={(e) => setWatchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addWatchEntry()}
                    placeholder="owner/repo-name"
                    className="h-7 text-xs font-mono flex-1"
                  />
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={addWatchEntry}>
                    <PlusCircle className="w-3 h-3" />追加
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">例: affaan-m/everything-claude-code　・・・複数登録可能</p>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground">
                差分検知による増分更新。新スキル発見時はスキル広場に自動追加されます。
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">同期間隔（時間）</Label>
                  <Input type="number" min={1} max={168} value={syncInterval} onChange={(e) => setSyncInterval(e.target.value)} className="h-8 text-sm" />
                  <p className="text-[10px] text-muted-foreground">1〜168時間（デフォルト: 6時間）</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">対象ブランチ</Label>
                  <Input value={syncBranch} onChange={(e) => setSyncBranch(e.target.value)} placeholder="main" className="h-8 text-sm font-mono" />
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground/80">修復とは</p>
                <p>スキルの品質スコアが閾値を下回ったとき、LLMが自動的にSKILL.mdを分析・改善し、新しいバージョンとして保存する仕組み。修復されたスキルには「修復済」バッジ（緑）が付きます。</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">品質スコア閾値（%）</Label>
                <div className="flex items-center gap-3">
                  <Input type="number" min={0} max={100} value={qualityThreshold} onChange={(e) => setQualityThreshold(e.target.value)} className="h-8 text-sm w-24" />
                  <p className="text-xs text-muted-foreground">この値を下回ったスキルを自動修復対象にします</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={autoRepair} onCheckedChange={setAutoRepair} />
                <div>
                  <Label className="text-xs">自動修復を有効にする</Label>
                  <p className="text-[10px] text-muted-foreground">無効の場合はダッシュボードに通知のみ</p>
                </div>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground/80">派生とは</p>
                <p>既存スキルをベースに、スキル広場の公開スキルとの類似度を分析して新しいバリエーションスキルを自動生成する仕組み。ダッシュボードでワンクリック承認すると「派生」バッジ（紫）が付きます。</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">類似度閾値（%）</Label>
                  <Input type="number" min={0} max={100} value={similarityThreshold} onChange={(e) => setSimilarityThreshold(e.target.value)} className="h-8 text-sm" />
                  <p className="text-[10px] text-muted-foreground">デフォルト: 70%</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">検出間隔（時間）</Label>
                  <Input type="number" min={1} max={168} value={evolutionInterval} onChange={(e) => setEvolutionInterval(e.target.value)} className="h-8 text-sm" />
                  <p className="text-[10px] text-muted-foreground">デフォルト: 24時間</p>
                </div>
              </div>
            </>
          )}
          {step === 5 && (
            <>
              <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground">
                ダッシュボード通知カードへのリアルタイム表示を設定します。
              </div>
              <div className="space-y-3">
                {[
                  { label: "同期完了通知",   desc: "スキルソースの同期が完了したとき",   value: notifySyncDone,   set: setNotifySyncDone },
                  { label: "修復完了通知",   desc: "スキルの自動修復が完了したとき",     value: notifyRepairDone, set: setNotifyRepairDone },
                  { label: "進化提案通知",   desc: "新しい進化提案が検出されたとき",     value: notifyEvolution,  set: setNotifyEvolution },
                ].map(({ label, desc, value, set }) => (
                  <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/50">
                    <Switch checked={value} onCheckedChange={set} />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ナビゲーション */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
          戻る
        </Button>
        <Button size="sm" onClick={handleSaveStep} disabled={saveIntegration.isPending || savePrefs.isPending} className="gap-1.5">
          {(saveIntegration.isPending || savePrefs.isPending) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {step === 5 ? (
            <><CheckCircle2 className="w-3.5 h-3.5" />ウィザード完了</>
          ) : (
            <>保存して次へ<ChevronRight className="w-3.5 h-3.5" /></>
          )}
        </Button>
      </div>

      {step === 5 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p>ウィザード完了後は手動操作不要。すべての処理がバックグラウンドで自動実行され、結果はダッシュボードに集約されます。</p>
        </div>
      )}
    </div>
  );
}

// ─── 手動設定タブ ─────────────────────────────────────────────────────────────
function ManualTab() {
  const utils = trpc.useUtils();
  const [uploadContent, setUploadContent] = useState("");
  const [uploadName, setUploadName] = useState("");
  const createMutation = trpc.skills.create.useMutation({
    onSuccess: () => {
      toast.success("スキルをアップロードしました");
      utils.skills.list.invalidate();
      setUploadContent("");
      setUploadName("");
    },
    onError: (e) => toast.error(e.message),
  });
  const triggerCrawl = trpc.community.triggerCrawl.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <p>手動設定は例外的な操作用です。通常は「初期設定ウィザード」で自動化設定を完了させてください。</p>
      </div>

      {/* スキル手動アップロード */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            スキルの手動アップロード
          </CardTitle>
          <CardDescription className="text-xs">SKILL.mdの内容を直接登録します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">スキル名</Label>
            <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="my-skill" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SKILL.md内容</Label>
            <textarea
              value={uploadContent}
              onChange={(e) => setUploadContent(e.target.value)}
              placeholder="# My Skill&#10;&#10;## Description&#10;..."
              className="w-full h-32 px-3 py-2 text-xs font-mono bg-input border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            disabled={!uploadName || !uploadContent || createMutation.isPending}
            onClick={() => createMutation.mutate({ name: uploadName, codeContent: uploadContent })}
          >
            {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            アップロード
          </Button>
        </CardContent>
      </Card>

      {/* 手動実行ボタン群 */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            手動実行
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/50">
            <div className="flex-1">
              <p className="text-sm font-medium">GitHub同期を今すぐ実行</p>
              <p className="text-[10px] text-muted-foreground">スキルソースを手動で同期します</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0 h-7"
              onClick={() => triggerCrawl.mutate()} disabled={triggerCrawl.isPending}>
              {triggerCrawl.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              実行
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────
export default function UserSettings() {
  const [location, setLocation] = useLocation();

  // /settings → /settings/account にリダイレクト
  if (location === "/settings") return <Redirect to="/settings/account" />;

  const tabs = [
    { path: "/settings/account", label: "ユーザーアカウント", icon: User },
    { path: "/settings/wizard",  label: "初期設定ウィザード", icon: Wand2 },
    { path: "/settings/manual",  label: "手動設定",           icon: Settings },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* ページヘッダー */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            設定
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            初期設定に関するすべての設定項目をここに集約しています
          </p>
        </div>

        {/* タブナビゲーション */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-border shrink-0">
          {tabs.map((tab) => {
            const isActive = location.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => setLocation(tab.path)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md border-b-2 transition-all -mb-px ${
                  isActive
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.path === "/settings/wizard" && (
                  <Badge className="ml-1 text-[9px] px-1 py-0 bg-primary/20 text-primary border-primary/30">重要</Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {location.startsWith("/settings/account") && <AccountTab />}
          {location.startsWith("/settings/wizard") && <WizardTab />}
          {location.startsWith("/settings/manual") && <ManualTab />}
        </div>
      </div>
    </DashboardLayout>
  );
}
