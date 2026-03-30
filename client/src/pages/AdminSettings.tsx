import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Users, Settings, Activity, RefreshCw,
  CheckCircle2, XCircle, Clock, Brain, Zap, Crown,
  ChevronRight, AlertTriangle, Database,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useLocation } from "wouter";

function RoleBadge({ role }: { role: string }) {
  return role === "admin" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/30">
      <Crown className="w-2.5 h-2.5" />
      管理者
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
      ユーザー
    </span>
  );
}

export default function AdminSettings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const usersQuery = trpc.admin.users.useQuery();
  const logsQuery = trpc.admin.systemLogs.useQuery();
  const allSkillsQuery = trpc.admin.allSkills.useQuery();
  const thresholdsQuery = trpc.health.thresholds.useQuery();

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("ロールを更新しました");
      utils.admin.users.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateThresholdsMutation = trpc.health.updateThresholds.useMutation({
    onSuccess: () => {
      toast.success("閾値を更新しました");
      utils.health.thresholds.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const seedMutation = trpc.admin.seedData.useMutation({
    onSuccess: () => {
      toast.success("デモデータを投入しました");
      utils.admin.allSkills.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [degradation, setDegradation] = useState(
    thresholdsQuery.data?.degradationThreshold?.toString() ?? "70"
  );
  const [critical, setCritical] = useState(
    thresholdsQuery.data?.criticalThreshold?.toString() ?? "50"
  );
  const [autoFix, setAutoFix] = useState(thresholdsQuery.data?.autoFixEnabled ?? true);

  const users = usersQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const allSkills = allSkillsQuery.data ?? [];

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Shield className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">管理者権限が必要です</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              管理者パネル
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">システム全体の管理・監視</p>
          </div>
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
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: Users, label: "総ユーザー数", value: users.length, color: "text-primary bg-primary/10 border-primary/20" },
            { icon: Brain, label: "総スキル数", value: allSkills.length, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
            { icon: Activity, label: "実行ログ数", value: logs.length, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
            { icon: AlertTriangle, label: "エラー数 (24h)", value: logs.filter((l) => l.status === "failure").length, color: "text-rose-400 bg-rose-400/10 border-rose-400/20" },
          ].map((item) => (
            <Card key={item.label} className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="users" className="text-xs gap-1.5">
              <Users className="w-3.5 h-3.5" />
              ユーザー管理
            </TabsTrigger>
            <TabsTrigger value="skills" className="text-xs gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              スキル管理
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              システム設定
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              ログ監視
            </TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">ユーザー一覧 ({users.length}件)</CardTitle>
              </CardHeader>
              <CardContent>
                {usersQuery.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-12 shimmer rounded-lg" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {(u.name ?? "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{u.name ?? "名前なし"}</p>
                            <RoleBadge role={u.role} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(u.lastSignedIn), { addSuffix: true, locale: ja })}
                          </span>
                          {u.role !== "admin" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 gap-1"
                              onClick={() => updateRoleMutation.mutate({ userId: u.id, role: "admin" })}
                              disabled={updateRoleMutation.isPending}
                            >
                              <Crown className="w-3 h-3" />
                              管理者に昇格
                            </Button>
                          ) : u.id !== user?.id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 gap-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                              onClick={() => updateRoleMutation.mutate({ userId: u.id, role: "user" })}
                              disabled={updateRoleMutation.isPending}
                            >
                              降格
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skills */}
          <TabsContent value="skills" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">全スキル一覧 ({allSkills.length}件)</CardTitle>
              </CardHeader>
              <CardContent>
                {allSkillsQuery.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-12 shimmer rounded-lg" />)}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {allSkills.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => setLocation(`/skills/${s.id}`)}
                      >
                        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Zap className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.category} · {s.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.isPublic ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">公開</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">非公開</span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System */}
          <TabsContent value="system" className="mt-4 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  ヘルス閾値設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">劣化閾値 (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={degradation}
                      onChange={(e) => setDegradation(e.target.value)}
                      className="bg-input border-border text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">この値を下回ると警告</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">重大閾値 (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={critical}
                      onChange={(e) => setCritical(e.target.value)}
                      className="bg-input border-border text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">この値を下回ると重大アラート</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div>
                    <p className="text-xs font-medium">自動修復</p>
                    <p className="text-[10px] text-muted-foreground">閾値以下のスキルを自動修復</p>
                  </div>
                  <Switch checked={autoFix} onCheckedChange={setAutoFix} />
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    updateThresholdsMutation.mutate({
                      degradationThreshold: parseFloat(degradation),
                      criticalThreshold: parseFloat(critical),
                      monitorInterval: 60,
                      autoFixEnabled: autoFix,
                    })
                  }
                  disabled={updateThresholdsMutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  保存
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">システムログ (最新{logs.length}件)</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => utils.admin.systemLogs.invalidate()} className="gap-1.5 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                    更新
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20 font-mono text-xs">
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : log.status === "failure" ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="flex-1 truncate text-muted-foreground">{log.skillId}</span>
                      {log.executionTime && (
                        <span className="text-muted-foreground/60">{log.executionTime.toFixed(2)}s</span>
                      )}
                      <span className="text-muted-foreground/50 shrink-0">
                        {formatDistanceToNow(new Date(log.executedAt), { addSuffix: true, locale: ja })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
