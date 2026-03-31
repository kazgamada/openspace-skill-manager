/**
 * UserSettings.tsx
 * ユーザー設定 — 連携タブのみ
 *
 * /settings/integrations  → 連携設定（Claude / GitHub / Google Drive / ローカルフォルダー）
 * /settings               → /settings/integrations へリダイレクト
 */
import { useState } from "react";
import { Redirect, useRoute } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertCircle, CheckCircle2, Clock, FolderOpen,
  Github, HardDrive, Link2, Loader2, Play, Plus, RefreshCw,
  Settings, Trash2, Unlink, Zap,
} from "lucide-react";

// ─── Service definitions ──────────────────────────────────────────────────────
type ServiceKey = "claude" | "github" | "googleDrive" | "localFolder";

interface ServiceDef {
  key: ServiceKey;
  label: string;
  description: string;
  Icon: React.ElementType;
  iconColor: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  helpUrl?: string;
}

const SERVICES: ServiceDef[] = [
  {
    key: "claude",
    label: "Claude Code",
    description: "マイスキルにClaude Codeのスキルを表示・インポートします",
    Icon: Zap,
    iconColor: "text-amber-400",
    fields: [
      { key: "apiKey", label: "APIキー", placeholder: "sk-ant-...", type: "password" },
      { key: "skillsDir", label: "スキルディレクトリ", placeholder: "~/.claude/skills" },
    ],
    helpUrl: "https://console.anthropic.com/",
  },
  {
    key: "github",
    label: "GitHub",
    description: "スキル広場でGitHubリポジトリからスキルを検索・インポートします",
    Icon: Github,
    iconColor: "text-foreground",
    fields: [
      { key: "token", label: "Personal Access Token", placeholder: "ghp_...", type: "password" },
      { key: "username", label: "ユーザー名（任意）", placeholder: "your-github-username" },
    ],
    helpUrl: "https://github.com/settings/tokens",
  },
  {
    key: "googleDrive",
    label: "Google Drive",
    description: "スキルファイルをGoogle Driveの指定フォルダーに自動バックアップします",
    Icon: HardDrive,
    iconColor: "text-blue-400",
    fields: [
      { key: "folderId", label: "フォルダーID", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" },
      { key: "credentials", label: "サービスアカウントJSON（任意）", placeholder: "{...}" },
    ],
    helpUrl: "https://drive.google.com/",
  },
  {
    key: "localFolder",
    label: "ローカルフォルダー",
    description: "ローカルのスキルディレクトリを監視・同期します",
    Icon: FolderOpen,
    iconColor: "text-emerald-400",
    fields: [
      { key: "path", label: "フォルダーパス", placeholder: "/Users/you/.claude/skills" },
      { key: "watchInterval", label: "監視間隔（秒）", placeholder: "60" },
    ],
  },
];

// ─── Root component ───────────────────────────────────────────────────────────
export default function UserSettings() {
  const [onSettings] = useRoute("/settings");
  if (onSettings) return <Redirect to="/settings/integrations" />;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Link2 className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">連携設定</h1>
            <p className="text-xs text-muted-foreground">
              Claude・GitHub・Google Drive・ローカルフォルダーとの連携を管理します
            </p>
          </div>
        </div>

        <IntegrationsPanel />
      </div>
    </DashboardLayout>
  );
}

// ─── Integrations Panel ───────────────────────────────────────────────────────
function IntegrationsPanel() {
  const [configuringKey, setConfiguringKey] = useState<ServiceKey | null>(null);
  const intQuery = trpc.settings.getIntegrations.useQuery();
  const prefsQuery = trpc.settings.getPreferences.useQuery();
  const disconnectIntegration = trpc.settings.disconnectIntegration.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`${vars.service} の連携を解除しました`);
      intQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  type IntStatus = { connected: boolean; testedAt?: string; config?: Record<string, string> };
  const intMap: Record<string, IntStatus> =
    ((intQuery.data ?? []) as Array<{ service: string; connected: boolean; testedAt?: string | null; config?: unknown }>)
      .reduce<Record<string, IntStatus>>((acc, it) => {
        acc[it.service] = { connected: it.connected, testedAt: it.testedAt ?? undefined, config: it.config as Record<string, string> };
        return acc;
      }, {});

  const githubConnected = intMap["github"]?.connected ?? false;

  return (
    <>
      {/* Status overview */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "連携済み", value: Object.values(intMap).filter((v) => v.connected).length, color: "text-emerald-400" },
          { label: "未連携",   value: SERVICES.length - Object.values(intMap).filter((v) => v.connected).length, color: "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="card-glass">
            <CardContent className="p-4 flex items-center gap-3">
              <Link2 className={`w-5 h-5 ${color}`} />
              <div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service cards */}
      <div className="space-y-3">
        {SERVICES.map((svc) => {
          const status = intMap[svc.key];
          const connected = status?.connected ?? false;

          return (
            <Card key={svc.key} className={`card-glass transition-all ${connected ? "border-primary/30" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    connected ? "bg-primary/15 border border-primary/30" : "bg-muted/50 border border-border"
                  }`}>
                    <svc.Icon className={`w-5 h-5 ${svc.iconColor}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold">{svc.label}</p>
                      {connected ? (
                        <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1" />連携済み
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          未連携
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{svc.description}</p>
                    {connected && status?.testedAt && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        最終確認: {new Date(status.testedAt).toLocaleString("ja-JP")}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {connected ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setConfiguringKey(svc.key)}
                        >
                          <Settings className="w-3 h-3" />設定
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => disconnectIntegration.mutate({ service: svc.key })}
                          disabled={disconnectIntegration.isPending}
                        >
                          <Unlink className="w-3 h-3" />解除
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setConfiguringKey(svc.key)}
                      >
                        <Plus className="w-3 h-3" />連携する
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* GitHub Auto Sync section (visible only when GitHub is connected) */}
      {githubConnected && (
        <GithubAutoSyncPanel
          autoSyncEnabled={prefsQuery.data?.autoSyncGithub ?? false}
          onPrefsRefetch={() => prefsQuery.refetch()}
        />
      )}

      {/* Configure Dialog */}
      {configuringKey && (
        <ConfigureDialog
          serviceKey={configuringKey}
          existing={intMap[configuringKey]?.config}
          onClose={() => setConfiguringKey(null)}
          onSaved={() => { setConfiguringKey(null); intQuery.refetch(); }}
        />
      )}
    </>
  );
}

// ─── GitHub Auto Sync Panel ───────────────────────────────────────────────────
function GithubAutoSyncPanel({
  autoSyncEnabled,
  onPrefsRefetch,
}: {
  autoSyncEnabled: boolean;
  onPrefsRefetch: () => void;
}) {
  const utils = trpc.useUtils();
  const setAutoSync = trpc.settings.setAutoSyncGithub.useMutation({
    onSuccess: (data) => {
      toast.success(data.enabled ? "GitHub自動同期を有効にしました" : "GitHub自動同期を無効にしました");
      onPrefsRefetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const triggerSync = trpc.settings.triggerGithubSync.useMutation({
    onSuccess: () => {
      toast.success("同期を開始しました。バックグラウンドで実行中です...");
      // Refresh logs after a short delay
      setTimeout(() => utils.settings.getGithubSyncLogs.invalidate(), 3000);
    },
    onError: (e) => toast.error(e.message),
  });
  const logsQuery = trpc.settings.getGithubSyncLogs.useQuery({ limit: 5 });

  return (
    <Card className="card-glass border-primary/20">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-foreground" />
            <CardTitle className="text-sm font-semibold">GitHub自動同期</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {autoSyncEnabled ? "有効（1日1回）" : "無効"}
            </span>
            <Switch
              checked={autoSyncEnabled}
              onCheckedChange={(v) => setAutoSync.mutate({ enabled: v })}
              disabled={setAutoSync.isPending}
            />
          </div>
        </div>
        <CardDescription className="text-xs mt-1">
          全リポジトリの <code className="text-[10px] bg-muted px-1 py-0.5 rounded">.claude/skills/*.md</code> を1日1回スキャンし、変更・追加のあるスキルのみマイスキルに自動インポートします
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Manual trigger */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs gap-2"
          onClick={() => triggerSync.mutate()}
          disabled={triggerSync.isPending}
        >
          {triggerSync.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Play className="w-3.5 h-3.5" />
          }
          今すぐ同期を実行
        </Button>

        {/* Sync logs */}
        {logsQuery.data && logsQuery.data.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">同期履歴</p>
            {logsQuery.data.map((log) => (
              <div
                key={log.id}
                className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${
                  log.status === "success"
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                    : log.status === "error"
                    ? "bg-destructive/5 border-destructive/20 text-destructive"
                    : "bg-muted/30 border-border text-muted-foreground"
                }`}
              >
                {log.status === "success" ? (
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                ) : log.status === "error" ? (
                  <AlertCircle className="w-3 h-3 shrink-0" />
                ) : (
                  <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
                )}
                <div className="flex-1 min-w-0">
                  {log.status === "success" ? (
                    <span>
                      {log.reposScanned}リポジトリ スキャン済 · 新規{log.created}件 · 更新{log.updated}件 · スキップ{log.skipped}件
                    </span>
                  ) : log.status === "error" ? (
                    <span className="truncate">{log.errorMessage ?? "エラーが発生しました"}</span>
                  ) : (
                    <span>同期中...</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(log.startedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}

        {logsQuery.data?.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            まだ同期履歴がありません。「今すぐ同期を実行」で初回同期を開始してください。
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Configure Dialog ─────────────────────────────────────────────────────────
function ConfigureDialog({
  serviceKey,
  existing,
  onClose,
  onSaved,
}: {
  serviceKey: ServiceKey;
  existing?: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const svc = SERVICES.find((s) => s.key === serviceKey)!;
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(svc.fields.map((f) => [f.key, existing?.[f.key] ?? ""]))
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testMessage, setTestMessage] = useState<string>("");

  const utils = trpc.useUtils();
  const testIntegration = trpc.settings.testIntegration.useMutation({
    onMutate: () => { setTesting(true); setTestResult(null); setTestMessage(""); },
    onSuccess: (data) => {
      setTesting(false);
      setTestResult(data.success ? "success" : "error");
      setTestMessage((data as { message?: string }).message ?? "");
      if (data.success) toast.success("接続テスト成功");
      else toast.error("接続テスト失敗");
    },
    onError: (e) => { setTesting(false); setTestResult("error"); setTestMessage(e.message); toast.error(e.message); },
  });
  const saveIntegration = trpc.settings.saveIntegration.useMutation({
    onSuccess: async () => {
      toast.success(`${svc.label} の連携を保存しました`);
      await utils.settings.getIntegrations.invalidate();
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <svc.Icon className={`w-4 h-4 ${svc.iconColor}`} />
            {svc.label} の連携設定
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {svc.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs">{field.label}</Label>
              <Input
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="h-8 text-sm font-mono"
              />
            </div>
          ))}

          {svc.helpUrl && (
            <p className="text-xs text-muted-foreground">
              APIキーの取得方法:{" "}
              <a href={svc.helpUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                {svc.helpUrl}
              </a>
            </p>
          )}

          {testResult && (
            <div className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
              testResult === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
            }`}>
              {testResult === "success"
                ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              }
              <span>{testMessage || (testResult === "success" ? "接続テスト成功" : "接続テスト失敗")}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => testIntegration.mutate({ service: serviceKey, config: values })}
            disabled={testing || saveIntegration.isPending}
            className="gap-1.5"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            テスト
          </Button>
          <Button
            size="sm"
            onClick={() => saveIntegration.mutate({ service: serviceKey, config: values })}
            disabled={saveIntegration.isPending || testing}
            className="gap-1.5"
          >
            {saveIntegration.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
