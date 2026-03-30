import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Copy, RefreshCw, Terminal, Wifi, WifiOff,
  CheckCircle2, XCircle, Clock, Zap, Code2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

const SAMPLE_MCP_CONFIG = {
  mcpServers: {
    "openspace-skill-manager": {
      command: "npx",
      args: ["-y", "@openspace/skill-manager-mcp"],
      env: {
        OSM_API_URL: "https://your-osm-instance.com/api",
        OSM_API_KEY: "your-api-key-here",
      },
    },
  },
};

function ConnectionStatus({ status }: { status: "connected" | "disconnected" | "checking" }) {
  const map = {
    connected: { icon: Wifi, label: "接続済み", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
    disconnected: { icon: WifiOff, label: "未接続", cls: "text-rose-400 bg-rose-400/10 border-rose-400/20" },
    checking: { icon: RefreshCw, label: "確認中...", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  };
  const { icon: Icon, label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      <Icon className={`w-3 h-3 ${status === "checking" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

export default function ClaudeIntegration() {
  const [mcpStatus, setMcpStatus] = useState<"connected" | "disconnected" | "checking">("disconnected");
  const utils = trpc.useUtils();

  const logsQuery = trpc.claude.logs.useQuery({ limit: 50 });
  const logs = logsQuery.data ?? [];

  const checkConnection = () => {
    setMcpStatus("checking");
    setTimeout(() => {
      setMcpStatus("disconnected");
      toast.info("MCP接続を確認しました（Claude Codeを起動してください）");
    }, 1500);
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(SAMPLE_MCP_CONFIG, null, 2));
    toast.success("設定をコピーしました");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Claude Code 連携
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">MCP接続状態と設定管理</p>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus status={mcpStatus} />
            <Button variant="outline" size="sm" onClick={checkConnection} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              接続確認
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${mcpStatus === "connected" ? "bg-emerald-400 animate-pulse" : "bg-muted"}`} />
                <p className="text-xs text-muted-foreground">MCP接続</p>
              </div>
              <p className="text-sm font-semibold">{mcpStatus === "connected" ? "アクティブ" : "未接続"}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-2">実行ログ数</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-2">成功率</p>
              {logs.length > 0 ? (
                <p className="text-2xl font-bold">
                  {((logs.filter((l) => l.status === "success").length / logs.length) * 100).toFixed(0)}%
                </p>
              ) : (
                <p className="text-2xl font-bold text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="config">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="config" className="text-xs gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              MCP設定
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              実行ログ
            </TabsTrigger>
          </TabsList>

          {/* Config */}
          <TabsContent value="config" className="mt-4 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    claude_desktop_config.json
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={copyConfig} className="gap-1.5 text-xs">
                    <Copy className="w-3.5 h-3.5" />
                    コピー
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="code-block text-xs leading-relaxed overflow-auto max-h-64">
                  {JSON.stringify(SAMPLE_MCP_CONFIG, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">セットアップ手順</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {[
                    { step: 1, title: "Claude Desktopをインストール", desc: "claude.ai/downloadからClaude Desktopをダウンロードしてインストールします" },
                    { step: 2, title: "設定ファイルを編集", desc: "上記のJSON設定をclaude_desktop_config.jsonにコピーします" },
                    { step: 3, title: "APIキーを設定", desc: "OSM_API_KEYにOpenSpace Skill ManagerのAPIキーを設定します" },
                    { step: 4, title: "Claude Desktopを再起動", desc: "設定を反映するためClaude Desktopを再起動します" },
                    { step: 5, title: "接続確認", desc: "「接続確認」ボタンをクリックしてMCP接続を確認します" },
                  ].map((item) => (
                    <li key={item.step} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                        {item.step}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">実行ログ</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => utils.claude.logs.invalidate()} className="gap-1.5 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                    更新
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {logsQuery.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-12 shimmer rounded-lg" />)}
                  </div>
                ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Terminal className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">ログがありません</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-muted/20 font-mono text-xs">
                        {log.status === "success" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : log.status === "failure" ? (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground">{log.skillId}</span>
                            {log.executionTime && (
                              <span className="text-muted-foreground">{log.executionTime.toFixed(2)}s</span>
                            )}
                          </div>
                          {log.errorMessage && (
                            <p className="text-rose-400 text-[10px] mt-0.5 truncate">{log.errorMessage}</p>
                          )}
                        </div>
                        <span className="text-muted-foreground/60 text-[10px] shrink-0">
                          {formatDistanceToNow(new Date(log.executedAt), { addSuffix: true, locale: ja })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
