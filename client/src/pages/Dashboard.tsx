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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useState, useEffect, useRef } from "react";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: "primary" | "cyan" | "green" | "amber";
}) {
  const colorMap = {
    primary: "text-primary bg-primary/10 border-primary/20",
    cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    green: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  };
  return (
    <Card className="bg-card border-border card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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

// ─── 自動同期完了通知カード ──────────────────────────────────────────────────

type SyncNotification = {
  id: string;
  count: number;
  timestamp: number;
  type: "github_sync" | "skills_synced";
};

function SyncNotificationCard({
  notifications,
  onDismiss,
}: {
  notifications: SyncNotification[];
  onDismiss: (id: string) => void;
}) {
  if (notifications.length === 0) return null;
  return (
    <div className="space-y-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm animate-in slide-in-from-top-2 duration-300"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-medium text-emerald-300">
              {n.type === "github_sync" ? "GitHubマイスキル同期完了" : "スキルソース同期完了"}
            </span>
            <span className="text-emerald-400/80 ml-2">
              {n.count} 件のスキルが更新されました
            </span>
            <span className="text-emerald-400/50 text-xs ml-2">
              · {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: ja })}
            </span>
          </div>
          <button
            onClick={() => onDismiss(n.id)}
            className="text-emerald-400/50 hover:text-emerald-400 transition-colors shrink-0"
          >
            <span className="sr-only">閉じる</span>
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── プロジェクトモニター推薦パネル ──────────────────────────────────────────

type RecommendedSkill = {
  id: string;
  name: string;
  description: string;
  category: string;
  score: number;
};

function ProjectMonitorPanel() {
  const [, setLocation] = useLocation();
  const [taskType, setTaskType] = useState<"feature" | "bugfix" | "refactor" | "review" | "test" | "general">("general");
  const [recommendations, setRecommendations] = useState<RecommendedSkill[]>([]);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  const monitorMutation = trpc.dashboard.monitorProject.useMutation({
    onSuccess: (data) => {
      setRecommendations(data.recommendedSkills);
      setLastAnalyzed(new Date());
      if (data.recommendedSkills.length === 0) {
        toast.info("現在のプロジェクトコンテキストに合うスキルが見つかりませんでした");
      } else {
        toast.success(`${data.recommendedSkills.length} 件のスキルを推薦しました`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const taskTypes: { value: typeof taskType; label: string; color: string }[] = [
    { value: "feature", label: "機能追加", color: "text-cyan-400" },
    { value: "bugfix", label: "バグ修正", color: "text-rose-400" },
    { value: "refactor", label: "リファクタ", color: "text-purple-400" },
    { value: "review", label: "コードレビュー", color: "text-amber-400" },
    { value: "test", label: "テスト", color: "text-emerald-400" },
    { value: "general", label: "汎用", color: "text-primary" },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          プロジェクトモニター
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary/70 ml-auto">AI推薦</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* タスク種別セレクター */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-2">タスク種別を選択して最適スキルを推薦</p>
          <div className="flex flex-wrap gap-1.5">
            {taskTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTaskType(t.value)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                  taskType === t.value
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-muted/30 border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => monitorMutation.mutate({ taskType })}
          disabled={monitorMutation.isPending}
        >
          {monitorMutation.isPending ? (
            <><RefreshCw className="w-3.5 h-3.5 animate-spin" />分析中...</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" />最適スキルを推薦</>
          )}
        </Button>

        {/* 推薦結果 */}
        {recommendations.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                推薦スキル {recommendations.length} 件
                {lastAnalyzed && (
                  <span className="ml-2">
                    · {formatDistanceToNow(lastAnalyzed, { addSuffix: true, locale: ja })}
                  </span>
                )}
              </p>
            </div>
            {recommendations.map((skill, idx) => (
              <div
                key={skill.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setLocation(`/skills/${skill.id}`)}
              >
                <div className="w-5 h-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-primary">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{skill.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {skill.description.length > 35 ? skill.description.slice(0, 33) + "…" : skill.description}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-primary/70">{skill.score.toFixed(1)}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}

        {recommendations.length === 0 && !monitorMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Brain className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">タスク種別を選んで推薦ボタンを押してください</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── スキル進化提案カード ────────────────────────────────────────────

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

function EvolutionProposalCard() {
  const [, setLocation] = useLocation();
  const [previewProposal, setPreviewProposal] = useState<(EvolutionProposal & { mergedContent?: string }) | null>(null);
  const utils = trpc.useUtils();

  const proposalsQuery = trpc.evolution.getProposals.useQuery({ status: "pending" });

  const detectMutation = trpc.evolution.detectProposals.useMutation({
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(`✨ ${data.created} 件の進化提案を検出しました`);
        utils.evolution.getProposals.invalidate();
      } else {
        toast.info("現在新たな進化提案はありません");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const applyMutation = trpc.evolution.applyProposal.useMutation({
    onSuccess: (data) => {
      toast.success("✅ スキルを進化させました！");
      setPreviewProposal(null);
      utils.evolution.getProposals.invalidate();
      if (data.mySkillId) setLocation(`/skills/${data.mySkillId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const dismissMutation = trpc.evolution.dismissProposal.useMutation({
    onSuccess: () => {
      utils.evolution.getProposals.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const detailQuery = trpc.evolution.getProposalDetail.useQuery(
    { proposalId: previewProposal?.id ?? "" },
    { enabled: !!previewProposal?.id && !previewProposal.mergedContent }
  );

  // 詳細取得後にpreviewProposalを更新
  useEffect(() => {
    const detail = detailQuery.data as Record<string, unknown> | undefined;
    if (detail && previewProposal && !previewProposal.mergedContent) {
      setPreviewProposal((prev) => prev ? { ...prev, mergedContent: detail.mergedContent as string } : null);
    }
  }, [detailQuery.data]);

  const proposals = proposalsQuery.data ?? [];

  if (proposals.length === 0 && !proposalsQuery.isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Dna className="w-4 h-4 text-purple-400" />
            スキル進化提案
            <Badge variant="outline" className="text-[9px] border-purple-400/30 text-purple-400/70 ml-auto">AI合成</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
            <Dna className="w-10 h-10 text-muted-foreground/20" />
            <div>
              <p className="text-sm text-muted-foreground">進化提案はまだありません</p>
              <p className="text-xs text-muted-foreground/60 mt-1">公開スキルとマイスキルを比較して提案を生成します</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => detectMutation.mutate()}
              disabled={detectMutation.isPending}
              className="gap-1.5 text-xs border-purple-400/30 text-purple-400 hover:bg-purple-400/10"
            >
              <Sparkles className={`w-3.5 h-3.5 ${detectMutation.isPending ? "animate-spin" : ""}`} />
              {detectMutation.isPending ? "解析中...—LLM合成に数分かかる場合があります" : "進化提案を検出"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Dna className="w-4 h-4 text-purple-400" />
            スキル進化提案
            <Badge className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30 ml-1">
              {proposals.length}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => detectMutation.mutate()}
              disabled={detectMutation.isPending}
              className="ml-auto h-6 px-2 text-[10px] text-muted-foreground hover:text-purple-400"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${detectMutation.isPending ? "animate-spin" : ""}`} />
              再検出
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {proposalsQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => <div key={i} className="h-20 rounded-lg shimmer" />)}
            </div>
          ) : (
            proposals.slice(0, 3).map((proposal) => (
              <div
                key={proposal.id}
                className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2"
              >
                {/* スキル名 + スコア */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <ArrowUpCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="text-xs font-semibold text-purple-200 truncate">{proposal.mySkillName}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{proposal.reason}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-purple-300">{proposal.evolutionScore}</span>
                    <span className="text-[9px] text-muted-foreground">/100</span>
                  </div>
                </div>
                {/* 合成元スキル */}
                <div className="flex flex-wrap gap-1">
                  {proposal.publicSkillNames.slice(0, 3).map((name, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      + {name.length > 20 ? name.slice(0, 20) + "..." : name}
                    </span>
                  ))}
                </div>
                {/* アクションボタン */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Button
                    size="sm"
                    onClick={() => applyMutation.mutate({ proposalId: proposal.id })}
                    disabled={applyMutation.isPending}
                    className="h-6 px-3 text-[10px] bg-purple-600 hover:bg-purple-500 text-white gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    ワンクリックで進化
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewProposal(proposal)}
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    プレビュー
                  </Button>
                  <button
                    onClick={() => dismissMutation.mutate({ proposalId: proposal.id })}
                    className="ml-auto text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* プレビューダイアログ */}
      <Dialog open={!!previewProposal} onOpenChange={(open) => !open && setPreviewProposal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dna className="w-5 h-5 text-purple-400" />
              進化プレビュー: {previewProposal?.mySkillName}
            </DialogTitle>
            <DialogDescription>
              {previewProposal?.reason}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 合成元 */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">参照公開スキル</p>
              <div className="flex flex-wrap gap-1.5">
                {previewProposal?.publicSkillNames.map((name, i) => (
                  <span key={i} className="px-2 py-1 rounded-full text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {name}
                  </span>
                ))}
              </div>
            </div>
            {/* 合成後コンテンツ */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">進化後のSKILL.md</p>
              {detailQuery.isLoading ? (
                <div className="h-40 rounded-lg shimmer" />
              ) : (
                <pre className="text-xs bg-muted/30 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap border border-border max-h-60 overflow-y-auto">
                  {previewProposal?.mergedContent ?? "読み込み中..."}
                </pre>
              )}
            </div>
            {/* 適用ボタン */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => previewProposal && applyMutation.mutate({ proposalId: previewProposal.id })}
                disabled={applyMutation.isPending}
                className="gap-2 bg-purple-600 hover:bg-purple-500"
              >
                <Zap className="w-4 h-4" />
                {applyMutation.isPending ? "適用中..." : "スキルに適用する"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPreviewProposal(null)}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const statsQuery = trpc.dashboard.stats.useQuery();
  const timelineQuery = trpc.dashboard.timeline.useQuery();

  // ─── WebSocketによる自動同期完了通知 ───
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
                ...prev.slice(0, 4),
              ]);
              statsQuery.refetch();
            }
          } else if (data.type === "skills_synced") {
            const count = data.count as number ?? 0;
            if (count > 0) {
              setSyncNotifications((prev) => [
                { id: `sync_${Date.now()}`, count, timestamp: Date.now(), type: "skills_synced" },
                ...prev.slice(0, 4),
              ]);
              statsQuery.refetch();
            }
          }
        } catch (parseErr) {
          console.warn("[Dashboard WS] Failed to parse event:", parseErr);
        }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">ダッシュボード</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              スキルの全体状況と最近の活動
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${seedMutation.isPending ? "animate-spin" : ""}`} />
                デモデータ投入
              </Button>
            )}
            <Button size="sm" onClick={() => setLocation("/skills")} className="gap-1.5 text-xs">
              <Brain className="w-3.5 h-3.5" />
              スキルを管理
            </Button>
          </div>
        </div>

        {/* 自動同期完了通知 */}
        <SyncNotificationCard notifications={syncNotifications} onDismiss={dismissNotification} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Brain}
            label="総スキル数"
            value={statsQuery.isLoading ? "—" : (stats?.totalSkills ?? 0)}
            sub="登録済みスキル"
            color="primary"
          />
          <StatCard
            icon={CheckCircle2}
            label="修復 (24h)"
            value={statsQuery.isLoading ? "—" : (stats?.fixed ?? 0)}
            sub="自動修復された"
            color="green"
          />
          <StatCard
            icon={GitBranch}
            label="派生 (24h)"
            value={statsQuery.isLoading ? "—" : (stats?.derived ?? 0)}
            sub="新規派生スキル"
            color="cyan"
          />
          <StatCard
            icon={Layers}
            label="キャプチャ (24h)"
            value={statsQuery.isLoading ? "—" : (stats?.captured ?? 0)}
            sub="ナレッジ取得"
            color="amber"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                クイックアクション
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: Brain, label: "新しいスキルを作成", sub: "スキルを定義して管理開始", path: "/skills", color: "text-primary" },
                { icon: GitBranch, label: "系譜を確認", sub: "スキルの進化ツリーを可視化", path: "/genealogy", color: "text-purple-400" },
                { icon: Activity, label: "ヘルスをチェック", sub: "スキルの品質スコアを確認", path: "/health", color: "text-emerald-400" },
                { icon: Globe, label: "スキル広場を探索", sub: "コミュニティのスキルを検索", path: "/community", color: "text-cyan-400" },
              ].map((action) => (
                <button
                  key={action.path}
                  onClick={() => setLocation(action.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <action.icon className={`w-4 h-4 ${action.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.sub}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* スキル進化提案カード */}
          <EvolutionProposalCard />

          {/* Timeline */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                最近の実行ログ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timelineQuery.isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 rounded-lg shimmer" />
                  ))}
                </div>
              ) : timeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">まだ実行ログがありません</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">スキルを実行すると履歴が表示されます</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {timeline.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === "success" ? "bg-emerald-400" : log.status === "failure" ? "bg-rose-400" : "bg-amber-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{log.skillId}</p>
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
        </div>
      </div>
    </DashboardLayout>
  );
}
