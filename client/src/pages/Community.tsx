import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Star, Download, Zap, Globe, Filter,
  CheckCircle2, TrendingUp, Award, Github, AlertCircle,
  RefreshCw, Plus, Clock, Database, Settings2,
  ChevronRight, ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ViewToggle, useViewMode, type ViewMode } from "@/components/ViewToggle";

const CATEGORIES = ["all", "web", "search", "data", "auth", "ai", "util", "testing", "security", "frontend", "backend", "devops", "agent", "language", "framework", "database", "research"];

function QualityBar({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color = s >= 80 ? "bg-emerald-400" : s >= 60 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${s}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground">{s.toFixed(0)}%</span>
    </div>
  );
}

function SyncStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    idle:    { label: "待機中",   className: "border-muted text-muted-foreground" },
    syncing: { label: "同期中...", className: "border-blue-500/40 text-blue-400 animate-pulse" },
    success: { label: "同期済み",  className: "border-emerald-500/40 text-emerald-400" },
    error:   { label: "エラー",   className: "border-rose-500/40 text-rose-400" },
  };
  const { label, className } = map[status] ?? map.idle;
  return <Badge variant="outline" className={`text-[10px] ${className}`}>{label}</Badge>;
}

// ─── ソース追加ダイアログ ────────────────────────────────────────────────────

function AddSourceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: "",
    repoOwner: "",
    repoName: "",
    skillsPath: "skills",
    branch: "main",
    autoSync: true,
    syncIntervalHours: 6,
  });

  const addMutation = trpc.community.addSource.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.community.listSources.invalidate();
      utils.community.list.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const applyPreset = () => {
    setForm({
      name: "everything-claude-code",
      repoOwner: "affaan-m",
      repoName: "everything-claude-code",
      skillsPath: "skills",
      branch: "main",
      autoSync: true,
      syncIntervalHours: 6,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            外部スキルソースを追加
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Github className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">おすすめ: everything-claude-code</p>
              <p className="text-[10px] text-muted-foreground truncate">affaan-m/everything-claude-code · 136スキル</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-[10px] shrink-0" onClick={applyPreset}>
              適用
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">表示名</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="my-skill-repo" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">リポジトリオーナー</Label>
              <Input value={form.repoOwner} onChange={(e) => setForm({ ...form, repoOwner: e.target.value })} placeholder="affaan-m" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">リポジトリ名</Label>
              <Input value={form.repoName} onChange={(e) => setForm({ ...form, repoName: e.target.value })} placeholder="everything-claude-code" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">スキルパス</Label>
              <Input value={form.skillsPath} onChange={(e) => setForm({ ...form, skillsPath: e.target.value })} placeholder="skills" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ブランチ</Label>
              <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="main" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">同期間隔（時間）</Label>
              <Input type="number" min={1} max={168} value={form.syncIntervalHours} onChange={(e) => setForm({ ...form, syncIntervalHours: Number(e.target.value) })} className="h-8 text-sm" />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={form.autoSync} onCheckedChange={(v) => setForm({ ...form, autoSync: v })} />
              <Label className="text-xs">自動同期を有効にする</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>キャンセル</Button>
          <Button
            size="sm"
            disabled={!form.name || !form.repoOwner || !form.repoName || addMutation.isPending}
            onClick={() => addMutation.mutate(form)}
          >
            {addMutation.isPending ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />登録中...</> : <><Plus className="w-3.5 h-3.5 mr-1.5" />登録して同期開始</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ソース管理タブ ──────────────────────────────────────────────────────────

function SourcesTab() {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);

  const { data: sources = [], isLoading } = trpc.community.listSources.useQuery();

  const syncMutation = trpc.community.syncSource.useMutation({
    onSuccess: () => {
      toast.success("同期を開始しました");
      setTimeout(() => utils.community.listSources.invalidate(), 3000);
      setTimeout(() => utils.community.listSources.invalidate(), 8000);
      setTimeout(() => {
        utils.community.listSources.invalidate();
        utils.community.list.invalidate();
      }, 20000);
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = trpc.community.removeSource.useMutation({
    onSuccess: () => {
      toast.success("ソースを削除しました");
      utils.community.listSources.invalidate();
      utils.community.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeDuplicatesMutation = trpc.community.removeDuplicates.useMutation({
    onSuccess: (data) => {
      toast.success(`重複スキルを ${data.removed} 件削除しました`);
      utils.community.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">外部スキルソース</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            GitHub リポジトリを登録すると SKILL.md を自動取得・定期同期します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            onClick={() => {
              if (confirm("タイトルと更新日時が同一の重複スキルを検出・削除します。実行しますか？")) {
                removeDuplicatesMutation.mutate();
              }
            }}
            disabled={removeDuplicatesMutation.isPending}
          >
            {removeDuplicatesMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>}
            重複を削除
          </Button>
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            ソースを追加
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-24 rounded-xl shimmer" />)}
        </div>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
          <Database className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">ソースが登録されていません</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            「ソースを追加」から <span className="font-mono text-primary">everything-claude-code</span> を登録してみましょう
          </p>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            ソースを追加
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <Card key={source.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Github className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold truncate">{source.name}</p>
                      <SyncStatusBadge status={source.lastSyncStatus} />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {source.repoOwner}/{source.repoName} · {source.skillsPath} · {source.branch}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {source.totalSkills} スキル
                      </span>
                      {source.newSkillsLastSync ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Plus className="w-3 h-3" />
                          {source.newSkillsLastSync} 新規
                        </span>
                      ) : null}
                      {source.lastSyncedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(source.lastSyncedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    {source.lastSyncError && (
                      <p className="text-[10px] text-rose-400 mt-1 truncate">{source.lastSyncError}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => syncMutation.mutate({ id: source.id })}
                      disabled={syncMutation.isPending || source.lastSyncStatus === "syncing"}
                      title="手動同期"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${source.lastSyncStatus === "syncing" ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => window.open(`https://github.com/${source.repoOwner}/${source.repoName}`, "_blank")}
                      title="GitHubで開く"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:border-rose-500/40"
                      onClick={() => {
                        if (confirm(`「${source.name}」を削除しますか？同期済みスキルは残ります。`)) {
                          removeMutation.mutate({ id: source.id });
                        }
                      }}
                      title="削除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/20 border-border/50">
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-primary" />
            動的同期の仕組み
          </h3>
          <div className="space-y-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
              <span>Git Tree API で1リクエストにより全ファイルの <span className="font-mono text-foreground/70">blob SHA</span> を一括取得</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
              <span>SHA が変わったスキルのみ内容を再取得（最大10並列）し、DB を upsert</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
              <span>サーバー起動 30 秒後に初回同期を実行し、以降は設定した間隔（デフォルト 6 時間）で自動同期</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
              <span>タイトル＋更新日時が同一のスキルは重複とみなし、「重複を削除」ボタンで一括削除可能</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddSourceDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

// ─── スキルカード（各レイアウト対応） ────────────────────────────────────────

interface SkillCardProps {
  skill: {
    id: string;
    name: string;
    description: string | null;
    author: string | null;
    category: string | null;
    tags: string | null;
    stars: number | null;
    downloads: number | null;
    qualityScore: number | null;
    generationCount: number | null;
    isInstalled: boolean | null;
    sourceId?: number | null;
    lastSyncedAt?: Date | string | null;
    repoOwner?: string | null;
    repoName?: string | null;
  };
  viewMode: ViewMode;
  onInstall: (id: string) => void;
  isInstalling: boolean;
}

function SkillCard({ skill, viewMode, onInstall, isInstalling }: SkillCardProps) {
  const tags: string[] = skill.tags ? JSON.parse(skill.tags) : [];
  const isSynced = !!(skill.sourceId);
  // 1週間以内に同期されたスキルはNewバッジを表示
  const isNew = skill.lastSyncedAt
    ? (Date.now() - new Date(skill.lastSyncedAt).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false;
  const githubUrl = skill.repoOwner && skill.repoName
    ? `https://github.com/${skill.repoOwner}/${skill.repoName}/tree/main/skills/${skill.name}`
    : null;
  // 説明を30-40文字に切り詰め（スペースが空いている箇所に表示）
  const shortDesc = skill.description
    ? (skill.description.length > 40 ? skill.description.slice(0, 38) + "…" : skill.description)
    : null;

  if (viewMode === "list-lg") {
    // リスト大: 横長カード、詳細情報フル表示
    return (
      <Card className="bg-card border-border card-hover">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-sm font-semibold">{skill.name}</p>
                {isNew && (
                  <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 h-4 px-1.5">NEW</Badge>
                )}
                {isSynced && (
                  <Badge variant="outline" className="text-[9px] border-primary/30 text-primary/70 h-4 px-1">
                    <Github className="w-2.5 h-2.5 mr-0.5" />同期
                  </Badge>
                )}
                {skill.isInstalled && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {skill.category && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{skill.category}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{shortDesc || skill.description}</p>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
                <span className="text-muted-foreground/60">{skill.author}</span>
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{skill.stars}</span>
                <span className="flex items-center gap-1"><Download className="w-3 h-3" />{skill.downloads}</span>
                <span>Gen {skill.generationCount}</span>
                {githubUrl && (
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary/70 hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Github className="w-3 h-3" />ソース
                  </a>
                )}
                {tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 rounded bg-muted/50">#{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-24">
                <QualityBar score={skill.qualityScore} />
              </div>
              <Button
                size="sm"
                variant={skill.isInstalled ? "outline" : "default"}
                className="h-7 text-[10px] px-3 gap-1"
                onClick={() => { if (!skill.isInstalled) onInstall(skill.id); }}
                disabled={!!skill.isInstalled || isInstalling}
              >
                {skill.isInstalled ? <><CheckCircle2 className="w-3 h-3" /> 済</> : <><Download className="w-3 h-3" /> インストール</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === "list-sm") {
    // リスト小: タイトル・更新日時・引用元リポジトリを表示
    const repoLabel = skill.repoOwner && skill.repoName
      ? `${skill.repoOwner}/${skill.repoName}`
      : null;
    const repoHref = skill.repoOwner && skill.repoName
      ? `https://github.com/${skill.repoOwner}/${skill.repoName}`
      : null;
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors">
        <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Zap className="w-3 h-3 text-primary" />
        </div>
        {/* タイトル */}
        <div className="flex items-center gap-1.5 w-40 sm:w-52 shrink-0 min-w-0">
          <p className="text-xs font-semibold truncate">{skill.name}</p>
          {isNew && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 h-4 px-1 shrink-0">NEW</Badge>}
          {skill.isInstalled && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
        </div>
        {/* 更新日時 */}
        <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-1 w-28 shrink-0">
          <Clock className="w-3 h-3" />
          {skill.lastSyncedAt
            ? formatDistanceToNow(new Date(skill.lastSyncedAt), { addSuffix: true, locale: ja })
            : "—"}
        </span>
        {/* 引用元リポジトリ */}
        <div className="hidden md:flex items-center gap-1 flex-1 min-w-0">
          {repoHref ? (
            <a
              href={repoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-400/70 hover:text-blue-400 truncate transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Github className="w-3 h-3 shrink-0" />
              <span className="truncate">{repoLabel}</span>
            </a>
          ) : (
            <span className="text-[10px] text-muted-foreground/40">—</span>
          )}
        </div>
        {/* 品質・インストール */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden lg:block w-14"><QualityBar score={skill.qualityScore} /></span>
          <Button
            size="sm"
            variant={skill.isInstalled ? "outline" : "default"}
            className="h-6 text-[10px] px-2 gap-0.5"
            onClick={() => { if (!skill.isInstalled) onInstall(skill.id); }}
            disabled={!!skill.isInstalled || isInstalling}
          >
            {skill.isInstalled ? "済" : <><Download className="w-3 h-3" /></>}
          </Button>
        </div>
      </div>
    );
  }

  if (viewMode === "tile-sm") {
    // タイル小: 小さいカード、最小情報
    return (
      <Card className="bg-card border-border card-hover">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Zap className="w-3 h-3 text-primary" />
            </div>
            <p className="text-xs font-semibold truncate flex-1">{skill.name}</p>
            {isNew && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 h-4 px-1 shrink-0">N</Badge>}
            {skill.isInstalled && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          </div>
          <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{shortDesc}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Star className="w-3 h-3 text-amber-400" />{skill.stars}
              {isSynced && githubUrl ? (
                <a href={githubUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <Github className="w-3 h-3 text-primary/50 hover:text-primary transition-colors" />
                </a>
              ) : isSynced ? (
                <Github className="w-3 h-3 text-primary/50" />
              ) : null}
            </div>
            <Button
              size="sm"
              variant={skill.isInstalled ? "outline" : "default"}
              className="h-6 text-[10px] px-2"
              onClick={() => { if (!skill.isInstalled) onInstall(skill.id); }}
              disabled={!!skill.isInstalled || isInstalling}
            >
              {skill.isInstalled ? "済" : <Download className="w-3 h-3" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // tile-lg（デフォルト）: 標準カード
  return (
    <Card className="bg-card border-border card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{skill.name}</p>
              <p className="text-[10px] text-muted-foreground">{skill.author}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isNew && (
              <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 h-4 px-1.5">NEW</Badge>
            )}
            {isSynced && (
              <Badge variant="outline" className="text-[9px] border-primary/30 text-primary/70 h-4 px-1">
                <Github className="w-2.5 h-2.5 mr-0.5" />同期
              </Badge>
            )}
            {skill.isInstalled && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
        </div>
        {/* 30-40文字の説明 */}
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{shortDesc || skill.description}</p>
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">品質スコア</span>
            {(skill.qualityScore ?? 0) >= 85 && <Award className="w-3 h-3 text-amber-400" />}
          </div>
          <QualityBar score={skill.qualityScore} />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">#{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{skill.stars}</span>
            <span className="flex items-center gap-1"><Download className="w-3 h-3" />{skill.downloads}</span>
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="GitHubでソースを表示"
              >
                <Github className="w-3 h-3" />
              </a>
            )}
          </div>
          <Button
            size="sm"
            variant={skill.isInstalled ? "outline" : "default"}
            className="h-7 text-[10px] px-3 gap-1"
            onClick={() => { if (!skill.isInstalled) onInstall(skill.id); }}
            disabled={!!skill.isInstalled || isInstalling}
          >
            {skill.isInstalled ? <><CheckCircle2 className="w-3 h-3" /> インストール済</> : <><Download className="w-3 h-3" /> インストール</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── グリッドコンテナ（viewModeに応じてclassを変える） ────────────────────────

function SkillsGrid({ children, viewMode }: { children: React.ReactNode; viewMode: ViewMode }) {
  if (viewMode === "list-lg" || viewMode === "list-sm") {
    return <div className="flex flex-col gap-2">{children}</div>;
  }
  if (viewMode === "tile-sm") {
    return <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">{children}</div>;
  }
  // tile-lg
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}

// ─── メインコンポーネント ────────────────────────────────────────────────────

export default function Community() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useViewMode("community-view-mode", "tile-lg");
  const utils = trpc.useUtils();
  const [location, setLocation] = useLocation();
  const isSources = location === "/community/sources";
  const { data: integrations } = trpc.settings.getIntegrations.useQuery();
  const githubConnected = Array.isArray(integrations)
    ? integrations.some((i: { service: string; connected: boolean }) => i.service === "github" && i.connected)
    : false;

  const communityQuery = trpc.community.list.useQuery({
    search: search || undefined,
    category: category !== "all" ? category : undefined,
    limit: 100,
  });

  const installMutation = trpc.community.install.useMutation({
    onSuccess: () => {
      toast.success("スキルをインストールしました");
      utils.community.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const skills = communityQuery.data ?? [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        {/* GitHub Integration Banner */}
        {!githubConnected && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-amber-300">GitHub未連携</span>
              <span className="text-amber-400/80 ml-2">GitHubと連携するとプライベートリポジトリのスキルも検索・インポートできます</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 shrink-0"
              onClick={() => setLocation("/integration/github")}
            >
              <Github className="w-3.5 h-3.5" />連携設定
            </Button>
          </div>
        )}
        {githubConnected && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm">
            <Github className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-emerald-300">GitHub連携済み</span>
              <span className="text-emerald-400/80 ml-2">プライベートリポジトリのスキルも検索・インポートできます</span>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />接続済み</Badge>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              スキル広場
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              コミュニティのスキルを検索・インストール
            </p>
          </div>
        </div>

        {!isSources ? (
          <div className="space-y-4">
            {/* Search & Filter & ViewToggle */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
                  placeholder="スキルを検索... (Enterで検索)"
                  className="pl-9 bg-input border-border"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setSearch(searchInput)} className="gap-1.5 text-xs">
                <Search className="w-3.5 h-3.5" />
                検索
              </Button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5" />
                {skills.length} 件
              </div>
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    category === cat
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                  }`}
                >
                  {cat === "all" ? "すべて" : cat}
                </button>
              ))}
            </div>

            {/* Skills Grid */}
            {communityQuery.isLoading ? (
              <SkillsGrid viewMode={viewMode}>
                {[...Array(viewMode === "tile-sm" ? 12 : viewMode === "list-sm" ? 8 : 6)].map((_, i) => (
                  <div key={i} className={`rounded-xl shimmer ${viewMode === "list-sm" ? "h-10" : viewMode === "tile-sm" ? "h-32" : "h-52"}`} />
                ))}
              </SkillsGrid>
            ) : skills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Globe className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">スキルが見つかりません</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  「ソース管理」タブから <span className="font-mono text-primary">everything-claude-code</span> を追加してみましょう
                </p>
              </div>
            ) : (
              <SkillsGrid viewMode={viewMode}>
                {skills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    viewMode={viewMode}
                    onInstall={(id) => installMutation.mutate({ communitySkillId: id })}
                    isInstalling={installMutation.isPending}
                  />
                ))}
              </SkillsGrid>
            )}
          </div>
        ) : (
          <SourcesTab />
        )}
      </div>
    </DashboardLayout>
  );
}
