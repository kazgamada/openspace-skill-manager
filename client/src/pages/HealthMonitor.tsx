import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, Wrench,
  TrendingUp, TrendingDown, Minus, Settings2, Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

function StatusIcon({ score }: { score: number }) {
  if (score >= 80) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (score >= 60) return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <XCircle className="w-4 h-4 text-rose-400" />;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function QualityBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{score.toFixed(0)}%</span>
    </div>
  );
}

function ThresholdDialog({ skillId, skillName, currentThreshold, onSaved }: {
  skillId: string; skillName: string; currentThreshold: number; onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [threshold, setThreshold] = useState(currentThreshold.toString());
  const utils = trpc.useUtils();

  const setThresholdMutation = trpc.health.setThreshold.useMutation({
    onSuccess: () => {
      toast.success("閾値を設定しました");
      setOpen(false);
      utils.health.list.invalidate();
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Settings2 className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-sm">閾値設定: {skillName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">品質スコア閾値 (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="bg-input border-border text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              この値を下回ると自動修復がトリガーされます
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => setThresholdMutation.mutate({ skillId, threshold: parseFloat(threshold) })}
            disabled={setThresholdMutation.isPending}
          >
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HealthMonitor() {
  const utils = trpc.useUtils();
  const healthQuery = trpc.health.list.useQuery();
  const autoRepairMutation = trpc.health.triggerRepair.useMutation({
    onSuccess: () => {
      toast.success("自動修復をトリガーしました");
      utils.health.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const healthData = healthQuery.data ?? [];
  const critical = healthData.filter((h) => h.qualityScore < 60).length;
  const warning = healthData.filter((h) => h.qualityScore >= 60 && h.qualityScore < 80).length;
  const healthy = healthData.filter((h) => h.qualityScore >= 80).length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              ヘルスモニター
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">スキルの品質スコアと成功率を追跡</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">正常</p>
                <p className="text-2xl font-bold">{healthy}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">警告</p>
                <p className="text-2xl font-bold">{warning}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-400/10 border border-rose-400/20 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">重大</p>
                <p className="text-2xl font-bold">{critical}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">スキルヘルス一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {healthQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 shimmer rounded-lg" />)}
              </div>
            ) : healthData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">スキルがありません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {healthData.map((h) => (
                  <div key={h.skillId} className="flex items-center gap-4 p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <StatusIcon score={h.qualityScore} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{h.skillName}</p>
                        {h.qualityScore < (h.threshold ?? 70) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            閾値以下
                          </span>
                        )}
                      </div>
                      <QualityBar score={h.qualityScore} />
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">成功率</p>
                        <p className="text-xs font-medium">{h.successRate.toFixed(0)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">実行回数</p>
                        <p className="text-xs font-medium">{h.executionCount}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendIcon trend={h.trend} />
                        <ThresholdDialog
                          skillId={h.skillId}
                          skillName={h.skillName}
                          currentThreshold={h.threshold ?? 70}
                          onSaved={() => {}}
                        />
                        {h.qualityScore < (h.threshold ?? 70) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-2 gap-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                            onClick={() => autoRepairMutation.mutate({ skillId: h.skillId })}
                            disabled={autoRepairMutation.isPending}
                          >
                            <Wrench className="w-3 h-3" />
                            修復
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
