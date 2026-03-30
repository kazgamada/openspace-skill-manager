import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HardDrive, Cloud, RefreshCw, CheckCircle2, AlertCircle,
  ArrowUpDown, Database, Layers, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

function SyncStatusBadge({ status }: { status: "synced" | "pending" | "error" }) {
  const map = {
    synced: { label: "同期済み", cls: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" },
    pending: { label: "保留中", cls: "bg-amber-400/10 text-amber-400 border-amber-400/20" },
    error: { label: "エラー", cls: "bg-rose-400/10 text-rose-400 border-rose-400/20" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {label}
    </span>
  );
}

export default function Storage() {
  const utils = trpc.useUtils();
  const storageQuery = trpc.storage.overview.useQuery();
  const versionsQuery = trpc.storage.versions.useQuery({ limit: 30 });

  const syncMutation = trpc.storage.sync.useMutation({
    onSuccess: () => {
      toast.success("同期を開始しました");
      utils.storage.overview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const overview = storageQuery.data;
  const versions = versionsQuery.data ?? [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              ストレージ管理
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">ローカル/クラウド同期状態とバージョン管理</p>
          </div>
          <Button
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            同期
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground">総スキル数</p>
              </div>
              <p className="text-2xl font-bold">{storageQuery.isLoading ? "—" : (overview?.totalSkills ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <p className="text-xs text-muted-foreground">総バージョン数</p>
              </div>
              <p className="text-2xl font-bold">{storageQuery.isLoading ? "—" : (overview?.totalVersions ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-4 h-4 text-purple-400" />
                <p className="text-xs text-muted-foreground">クラウド同期</p>
              </div>
              <p className="text-sm font-semibold">
                {storageQuery.isLoading ? "—" : (overview?.cloudSynced ? "同期済み" : "未同期")}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpDown className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-muted-foreground">最終同期</p>
              </div>
              <p className="text-xs font-medium">
                {overview?.lastSyncAt
                  ? formatDistanceToNow(new Date(overview.lastSyncAt), { addSuffix: true, locale: ja })
                  : "未同期"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="versions">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="versions" className="text-xs gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              バージョン履歴
            </TabsTrigger>
            <TabsTrigger value="sync" className="text-xs gap-1.5">
              <Cloud className="w-3.5 h-3.5" />
              同期状態
            </TabsTrigger>
          </TabsList>

          {/* Versions */}
          <TabsContent value="versions" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">全バージョン履歴</CardTitle>
              </CardHeader>
              <CardContent>
                {versionsQuery.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-12 shimmer rounded-lg" />)}
                  </div>
                ) : versions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Layers className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">バージョン履歴がありません</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {versions.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                        <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Layers className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold font-mono">{v.version}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{v.skillName}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{v.changeLog}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <SyncStatusBadge status="synced" />
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true, locale: ja })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync */}
          <TabsContent value="sync" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">同期状態</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "ローカルストレージ", status: "synced" as const, icon: HardDrive, desc: "すべてのスキルがローカルに保存されています" },
                  { label: "クラウドバックアップ", status: overview?.cloudSynced ? "synced" as const : "pending" as const, icon: Cloud, desc: overview?.cloudSynced ? "クラウドと同期済みです" : "クラウドへの同期が保留中です" },
                  { label: "バージョン管理", status: "synced" as const, icon: Layers, desc: "すべてのバージョンが記録されています" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <SyncStatusBadge status={item.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
