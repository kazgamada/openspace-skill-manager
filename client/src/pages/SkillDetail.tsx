import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, GitBranch, History, Code2, Activity, Wrench,
  CheckCircle2, XCircle, Clock, Zap, Copy, GitFork,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

function QualityBar({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color = s >= 80 ? "bg-emerald-400" : s >= 60 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${s}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{s.toFixed(0)}%</span>
    </div>
  );
}

function EvoBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    fix: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    derive: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    capture: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    create: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  const labels: Record<string, string> = { fix: "修復", derive: "派生", capture: "キャプチャ", create: "作成" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${map[type] ?? "bg-muted text-muted-foreground border-border"}`}>
      {labels[type] ?? type}
    </span>
  );
}

function DeriveDialog({ skillId, skillName, onDerived }: { skillId: string; skillName: string; onDerived: () => void }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(`${skillName}-derived`);
  const [description, setDescription] = useState("");
  const [changeLog, setChangeLog] = useState("");
  const utils = trpc.useUtils();

  const deriveMutation = trpc.skills.derive.useMutation({
    onSuccess: (data) => {
      toast.success("派生スキルを作成しました");
      setOpen(false);
      utils.skills.list.invalidate();
      onDerived();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <GitFork className="w-3.5 h-3.5" />
          派生スキル作成
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <GitFork className="w-4 h-4 text-purple-400" />
            派生スキルを作成
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">新しいスキル名 *</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-input border-border text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">説明</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-input border-border text-sm resize-none" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">変更ログ</Label>
            <Input value={changeLog} onChange={(e) => setChangeLog(e.target.value)} placeholder="変更内容を記述..." className="bg-input border-border text-sm" />
          </div>
          <Button
            className="w-full"
            onClick={() => deriveMutation.mutate({ skillId, newName, description, changeLog })}
            disabled={!newName.trim() || deriveMutation.isPending}
          >
            {deriveMutation.isPending ? "作成中..." : "派生スキルを作成"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SkillDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const skillId = params.id;

  const skillQuery = trpc.skills.get.useQuery({ id: skillId });
  const versionsQuery = trpc.skills.versions.useQuery({ skillId });
  const logsQuery = trpc.skills.logs.useQuery({ skillId });

  const skill = skillQuery.data;
  const versions = versionsQuery.data ?? [];
  const logs = logsQuery.data ?? [];

  if (skillQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4 max-w-5xl mx-auto">
          <div className="h-8 w-48 shimmer rounded" />
          <div className="h-40 shimmer rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!skill) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">スキルが見つかりません</p>
          <Button variant="outline" size="sm" onClick={() => setLocation("/skills")} className="mt-4">
            スキル一覧に戻る
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const latestVersion = versions[0];
  const successCount = logs.filter((l) => l.status === "success").length;
  const successRate = logs.length > 0 ? (successCount / logs.length) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation("/skills")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{skill.name}</h1>
            <p className="text-xs text-muted-foreground">{skill.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setLocation(`/genealogy/${skill.id}`)}>
              <GitBranch className="w-3.5 h-3.5" />
              系譜を見る
            </Button>
            <DeriveDialog skillId={skill.id} skillName={skill.name} onDerived={() => {}} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">現在のバージョン</p>
              <p className="text-lg font-bold font-mono">{latestVersion?.version ?? "—"}</p>
              {latestVersion && <EvoBadge type={latestVersion.evolutionType} />}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">品質スコア</p>
              <p className="text-lg font-bold">{latestVersion?.qualityScore?.toFixed(0) ?? "—"}%</p>
              <QualityBar score={latestVersion?.qualityScore ?? null} />
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">成功率</p>
              <p className="text-lg font-bold">{successRate.toFixed(0)}%</p>
              <p className="text-[10px] text-muted-foreground">{logs.length} 回実行</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="versions">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="versions" className="text-xs gap-1.5">
              <History className="w-3.5 h-3.5" />
              バージョン履歴
            </TabsTrigger>
            <TabsTrigger value="code" className="text-xs gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              コード
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              実行ログ
            </TabsTrigger>
          </TabsList>

          {/* Versions */}
          <TabsContent value="versions" className="mt-4">
            <div className="space-y-2">
              {versions.map((v, i) => (
                <div key={v.id} className={`p-4 rounded-xl border ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-card/50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{v.version}</span>
                      <EvoBadge type={v.evolutionType} />
                      {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">最新</span>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true, locale: ja })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{v.changeLog}</p>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span>品質: <span className="text-foreground font-medium">{v.qualityScore?.toFixed(0)}%</span></span>
                    <span>成功率: <span className="text-foreground font-medium">{v.successRate?.toFixed(0)}%</span></span>
                    {v.parentId && <span className="text-muted-foreground/60">親: {v.parentId.slice(0, 8)}...</span>}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Code */}
          <TabsContent value="code" className="mt-4">
            {latestVersion?.codeContent ? (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 z-10"
                  onClick={() => {
                    navigator.clipboard.writeText(latestVersion.codeContent ?? "");
                    toast.success("コピーしました");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <pre className="code-block text-xs leading-relaxed overflow-auto max-h-96">
                  {latestVersion.codeContent}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                コードがありません
              </div>
            )}
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs" className="mt-4">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  実行ログがありません
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
                    {log.status === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : log.status === "failure" ? (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium capitalize">{log.status}</span>
                        {log.executionTime && (
                          <span className="text-[10px] text-muted-foreground">{log.executionTime.toFixed(2)}s</span>
                        )}
                      </div>
                      {log.errorMessage && (
                        <p className="text-[10px] text-rose-400 truncate">{log.errorMessage}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(log.executedAt), { addSuffix: true, locale: ja })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
