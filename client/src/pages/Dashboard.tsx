import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Brain,
  CheckCircle2,
  GitBranch,
  Layers,
  RefreshCw,
  TrendingUp,
  Zap,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Globe,
  Dna,
  X,
  Eye,
  ArrowUpCircle,
  Github,
  Database,
  Shield,
  BarChart3,
  Info,
  Star,
  Download,
  Settings,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ja } from "date-fns/locale";
import { useState, useEffect, useRef } from "react";

// ─── SkillBadge ──────────────────────────────────────────────────────────────
function SkillBadge({ badge }: { badge?: string | null }) {
  if (!badge) return null;
  const map: Record<string, { label: string; cls: string }> = {
    new: { label: "新規", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
    repaired: { label: "修復済", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    derived: { label: "派生", cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  };
  const info = map[badge];
  if (!info) return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${info.cls}`}>
      {info.label}
    </span>
  );
}

// ─── EvolutionBadge ───────────────────────────────────────────────────────────
function EvolutionBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    fix: { label: "修復", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    derive: { label: "派生", cls: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    capture: { label: "キャプチャ", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    create: { label: "作成", cls: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    success: { label: "成功", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    failure: { label: "失敗", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
    partial: { label: "部分", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  };
  const info = map[type] ?? { label: type, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${info.cls}`}>
      {info.label}
    </span>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "primary",
  tooltip,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: "primary" | "cyan" | "green" | "amber" | "purple" | "rose";
  tooltip?: string;
  onClick?: () => void;
}) {
  const colorMap = {
    primary: "text-primary bg-primary/10 border-primary/20",
    cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    green: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    rose: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  };
  const card = (
    <Card className={`bg-card border-border ${onClick ? "cursor-pointer hover:border-primary/30 transition-colors" : ""}`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-[11px] text-muted-foreground leading-none">{label}</p>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground/50 shrink-0 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-56 text-xs">
                      {tooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-2xl font-bold leading-none">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-1.5">{sub}</p>}
          </div>
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${colorMap[color]}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return card;
}

// ─── 自動同期完了通知バナー ────────────────────────────────────────────────────
type SyncNotification = {
  id: string;
  count: number;
  timestamp: number;
  type: "github_sync" | "skills_synced";
};

function SyncBanner({
  notifications,
  onDismiss,
}: {
  notifications: SyncNotification[];
  onDismiss: (id: string) => void;
}) {
  if (notifications.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-medium text-emerald-300">
            {n.type === "github_sync" ? "GitHub同期完了" : "スキルソース同期完了"}
          </span>
          <span className="text-emerald-400/80">{n.count} 件更新</span>
          <span className="text-emerald-400/40 ml-auto">
            {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: ja })}
          </span>
          <button onClick={() => onDismiss(n.id)} className="text-emerald-400/50 hover:text-emerald-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── 進化提案カード（コンパクト版）──────────────────────────────────────────────
type EvolutionProposal = {
  id: string;
  mySkillId: string | null;
  mySkillName: string;
  publicSkillIds: string[];
  publicSkillNames: string[];
  reason: string;
  evolutionScore: number;
  status: string;
  createdAt: Date;
};

function EvolutionProposalPanel() {
  const [, setLocation] = useLocation();
  const [previewProposal, setPreviewProposal] = useState<EvolutionProposal | null>(null);
  const proposalsQuery = trpc.evolution.getProposals.useQuery({ status: "pending" });
  const detailQuery = trpc.evolution.getProposalDetail.useQuery(
    { proposalId: previewProposal?.id ?? "" },
    { enabled: !!previewProposal }
  );
  const applyMutation = trpc.evolution.applyProposal.useMutation({
    onSuccess: () => {
      toast.success("スキルに適用しました");
      setPreviewProposal(null);
      proposalsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const dismissMutation = trpc.evolution.dismissProposal.useMutation({
    onSuccess: () => {
      toast.info("提案を却下しました");
      proposalsQuery.refetch();
    },
  });
  const detectMutation = trpc.evolution.detectProposals.useMutation({
    onSuccess: (d) => {
      toast.success(`${d.created} 件の進化提案を生成しました`);
      proposalsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const proposals = proposalsQuery.data ?? [];

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <Dna className="w-3.5 h-3.5 text-purple-400" />
              スキル進化提案
              {proposals.length > 0 && (
                <Badge className="text-[9px] h-4 px-1.5 bg-purple-500/20 text-purple-300 border-purple-500/30 border">
                  {proposals.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={() => detectMutation.mutate(undefined as unknown as void)}
              disabled={detectMutation.isPending}
            >
              {detectMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              検出
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {proposalsQuery.isLoading ? (
            <div className="space-y-1.5">
              {[...Array(2)].map((_, i) => <div key={i} className="h-10 rounded shimmer" />)}
            </div>
          ) : proposals.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-center">
              <Dna className="w-6 h-6 text-muted-foreground/30 mb-1.5" />
              <p className="text-[11px] text-muted-foreground">提案なし</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">「検出」で最新の進化候補を取得</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {proposals.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[11px] font-medium truncate">{p.mySkillName}</p>
                      <span className="text-[9px] font-mono text-purple-400/80 shrink-0">
                        +{p.evolutionScore.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {p.publicSkillNames.slice(0, 2).join("・")} と合成
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setPreviewProposal(p)}
                      className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="プレビュー"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => dismissMutation.mutate({ proposalId: p.id })}
                      className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors"
                      title="却下"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* プレビューダイアログ */}
      <Dialog open={!!previewProposal} onOpenChange={(o) => !o && setPreviewProposal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Dna className="w-4 h-4 text-purple-400" />
              スキル進化プレビュー
            </DialogTitle>
            <DialogDescription className="text-xs">
              {previewProposal?.mySkillName} を公開スキルと合成します
            </DialogDescription>
          </DialogHeader>
          {previewProposal && (
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">合成元スキル</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewProposal.publicSkillNames.map((n, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{n}</Badge>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <p className="text-xs font-medium text-purple-300 mb-1">進化の理由</p>
                <p className="text-xs text-muted-foreground">{previewProposal.reason}</p>
              </div>
              {detailQuery.data && (
                <div className="p-3 rounded-lg bg-muted/20 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">合成後コンテンツ（プレビュー）</p>
                  <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
                    {((detailQuery.data as Record<string, unknown>)?.mergedContent as string ?? "").slice(0, 500)}
                    {((detailQuery.data as Record<string, unknown>)?.mergedContent as string ?? "").length > 500 ? "…" : ""}
                  </pre>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => applyMutation.mutate({ proposalId: previewProposal.id })}
                  disabled={applyMutation.isPending}
                >
                  <Zap className="w-3.5 h-3.5" />
                  {applyMutation.isPending ? "適用中..." : "ワンクリックで適用"}
                </Button>
                <Button variant="outline" onClick={() => setPreviewProposal(null)} className="text-xs">
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── メインダッシュボード ──────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const statsQuery = trpc.dashboard.stats.useQuery();
  const timelineQuery = trpc.dashboard.timeline.useQuery();

  // WebSocketによる自動同期完了通知
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/evolution-events`;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as Record<string, unknown>;
          if (data.type === "github_sync_complete") {
            const count = (data.created as number ?? 0) + (data.updated as number ?? 0);
            if (count > 0) {
              setSyncNotifications((prev) => [
                { id: `sync_${Date.now()}`, count, timestamp: Date.now(), type: "github_sync" },
                ...prev.slice(0, 3),
              ]);
              statsQuery.refetch();
            }
          } else if (data.type === "skills_synced") {
            const count = data.count as number ?? 0;
            if (count > 0) {
              setSyncNotifications((prev) => [
                { id: `sync_${Date.now()}`, count, timestamp: Date.now(), type: "skills_synced" },
                ...prev.slice(0, 3),
              ]);
              statsQuery.refetch();
            }
          }
        } catch (parseErr) {
          console.warn("[Dashboard WS] parse error:", parseErr);
        }
      };
      ws.onclose = () => { reconnectTimer = setTimeout(connect, 5000); };
    };
    connect();
    return () => { clearTimeout(reconnectTimer); wsRef.current?.close(); };
  }, []);

  const dismissNotification = (id: string) => {
    setSyncNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const seedMutation = trpc.admin.seedData.useMutation({
    onSuccess: () => {
      toast.success("デモデータを投入しました");
      statsQuery.refetch();
      timelineQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const stats = statsQuery.data;
  const timeline = timelineQuery.data ?? [];
  const isAdmin = user?.role === "admin";

  const githubStatusColor = stats?.githubSyncStatus === "success"
    ? "text-emerald-400"
    : stats?.githubSyncStatus === "error"
    ? "text-rose-400"
    : stats?.githubSyncStatus === "running"
    ? "text-amber-400"
    : "text-muted-foreground";

  return (
    <DashboardLayout>
      <div className="p-4 space-y-4 max-w-[1400px] mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">ダッシュボード</h1>
            <p className="text-xs text-muted-foreground mt-0.5">スキルの全体状況と自律動作の監視</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="gap-1.5 text-xs h-7"
              >
                <RefreshCw className={`w-3 h-3 ${seedMutation.isPending ? "animate-spin" : ""}`} />
                デモデータ
              </Button>
            )}
            <Button size="sm" onClick={() => setLocation("/settings")} className="gap-1.5 text-xs h-7">
              <Settings className="w-3 h-3" />
              設定
            </Button>
          </div>
        </div>

        {/* 同期完了通知バナー */}
        <SyncBanner notifications={syncNotifications} onDismiss={dismissNotification} />

        {/* === Row 1: メイン統計 (8カード) === */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard
            icon={Brain}
            label="総スキル数"
            value={statsQuery.isLoading ? "—" : (stats?.totalSkills ?? 0)}
            sub="マイスキル"
            color="primary"
            onClick={() => setLocation("/skills")}
          />
          <StatCard
            icon={Wrench}
            label="修復 (24h)"
            value={statsQuery.isLoading ? "—" : (stats?.fixed ?? 0)}
            sub="自動修復"
            color="green"
            tooltip="品質スコアが閾値を下回ったスキルを自動検知し、LLMで修復した件数。設定 › 初期設定ウィザードで修復の閾値・有効化を管理できます。"
          />
          <StatCard
            icon={GitBranch}
            label="派生 (24h)"
            value={statsQuery.isLoading ? "—" : (stats?.derived ?? 0)}
            sub="新規派生"
            color="purple"
            tooltip="既存スキルをベースに新しいバリエーションを自動生成した件数。スキル広場の公開スキルや実行ログを分析して派生候補を検出します。"
          />
          <StatCard
            icon={Layers}
            label="キャプチャ (24h)"
            value={statsQuery.isLoading ? "—" : (stats?.captured ?? 0)}
            sub="ナレッジ取得"
            color="amber"
          />
          <StatCard
            icon={BarChart3}
            label="品質スコア"
            value={statsQuery.isLoading ? "—" : `${stats?.avgQualityScore ?? 0}%`}
            sub="平均スコア"
            color="cyan"
            tooltip="マイスキルの現バージョンの品質スコア平均値。100%に近いほど高品質。"
          />
          <StatCard
            icon={Dna}
            label="進化提案"
            value={statsQuery.isLoading ? "—" : (stats?.pendingEvolutions ?? 0)}
            sub="未処理"
            color="purple"
            onClick={() => setLocation("/skills")}
            tooltip="公開スキルとの類似度分析により検出された、マイスキルの進化候補数。ワンクリックで合成・適用できます。"
          />
          <StatCard
            icon={Globe}
            label="広場スキル"
            value={statsQuery.isLoading ? "—" : (stats?.totalCommunitySkills ?? 0)}
            sub="公開スキル"
            color="cyan"
            onClick={() => setLocation("/community")}
          />
          <StatCard
            icon={Database}
            label="ソース数"
            value={statsQuery.isLoading ? "—" : (stats?.totalSources ?? 0)}
            sub="自動取得元"
            color="amber"
            onClick={() => setLocation("/community")}
          />
        </div>

        {/* === Row 2: バッジ統計 + GitHub同期ステータス + 自動化ステータス === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* バッジ統計 */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                スキルバッジ内訳
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "新規", count: stats?.mySkillsWithBadge?.new ?? 0, cls: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" },
                  { label: "修復済", count: stats?.mySkillsWithBadge?.repaired ?? 0, cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
                  { label: "派生", count: stats?.mySkillsWithBadge?.derived ?? 0, cls: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
                ].map((b) => (
                  <div key={b.label} className={`flex flex-col items-center p-2 rounded-lg border ${b.cls}`}>
                    <span className="text-lg font-bold leading-none">{statsQuery.isLoading ? "—" : b.count}</span>
                    <span className="text-[10px] mt-1 opacity-80">{b.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                マイスキル一覧でバッジ付きで表示されます
              </p>
            </CardContent>
          </Card>

          {/* GitHub同期ステータス */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-primary" />
                GitHub 自動同期
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">最終同期</span>
                <span className="text-[11px] font-medium">
                  {stats?.githubLastSync
                    ? formatDistanceToNow(new Date(stats.githubLastSync), { addSuffix: true, locale: ja })
                    : "未実行"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">ステータス</span>
                <span className={`text-[11px] font-medium ${githubStatusColor}`}>
                  {stats?.githubSyncStatus === "success" ? "成功"
                    : stats?.githubSyncStatus === "error" ? "エラー"
                    : stats?.githubSyncStatus === "running" ? "実行中"
                    : "未実行"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">スキルソース</span>
                <span className="text-[11px] font-medium">{stats?.totalSources ?? 0} 件</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-6 text-[10px] gap-1 mt-1"
                onClick={() => setLocation("/settings")}
              >
                <Settings className="w-3 h-3" />
                同期設定を変更
              </Button>
            </CardContent>
          </Card>

          {/* 自動化ステータス */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                自動化ステータス
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1.5">
              {[
                { label: "GitHub自動同期", active: (stats?.totalSources ?? 0) > 0, path: "/settings" },
                { label: "スキル自動修復", active: (stats?.fixed ?? 0) > 0 || true, path: "/settings" },
                { label: "進化提案自動検出", active: true, path: "/settings" },
                { label: "スキル広場クロール", active: (stats?.totalCommunitySkills ?? 0) > 0, path: "/community" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between cursor-pointer hover:bg-muted/30 px-1.5 py-1 rounded transition-colors"
                  onClick={() => setLocation(item.path)}
                >
                  <span className="text-[11px]">{item.label}</span>
                  <div className={`flex items-center gap-1 text-[10px] font-medium ${item.active ? "text-emerald-400" : "text-muted-foreground"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.active ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                    {item.active ? "有効" : "未設定"}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* === Row 3: 進化提案 + 実行ログ + クイックアクション === */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* 進化提案 */}
          <EvolutionProposalPanel />

          {/* 実行ログ */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" />
                最近の実行ログ
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {timelineQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-9 rounded shimmer" />)}
                </div>
              ) : timeline.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <AlertCircle className="w-6 h-6 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">実行ログなし</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {timeline.map((log) => (
                    <div key={log.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === "success" ? "bg-emerald-400" : log.status === "failure" ? "bg-rose-400" : "bg-amber-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">{log.skillId}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(log.executedAt), { addSuffix: true, locale: ja })}
                        </p>
                      </div>
                      <EvolutionBadge type={log.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* クイックアクション */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                クイックアクション
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1.5">
              {[
                { icon: Brain, label: "マイスキル管理", sub: "スキル一覧・系譜・ヘルス", path: "/skills", color: "text-primary" },
                { icon: Globe, label: "スキル広場", sub: "公開スキルを探索・取込", path: "/community", color: "text-cyan-400" },
                { icon: Settings, label: "初期設定ウィザード", sub: "自動化の設定を一括管理", path: "/settings", color: "text-amber-400" },
                { icon: TrendingUp, label: "管理者パネル", sub: "ユーザー・プラン・収益", path: "/admin", color: "text-rose-400" },
              ].map((action) => (
                <button
                  key={action.path}
                  onClick={() => setLocation(action.path)}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <action.icon className={`w-3.5 h-3.5 ${action.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium">{action.label}</p>
                    <p className="text-[10px] text-muted-foreground">{action.sub}</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
