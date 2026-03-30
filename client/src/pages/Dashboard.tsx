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
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

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

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const statsQuery = trpc.dashboard.stats.useQuery();
  const timelineQuery = trpc.dashboard.timeline.useQuery();
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                { icon: TrendingUp, label: "スキル広場を探索", sub: "コミュニティのスキルを検索", path: "/community", color: "text-cyan-400" },
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
