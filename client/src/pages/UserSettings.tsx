/**
 * UserSettings.tsx
 * 連携設定 — 複数アカウント・フォルダー対応
 *
 * /settings/integrations → 連携設定（Claude / GitHub / Google Drive / ローカルフォルダー）
 * /settings              → /settings/integrations へリダイレクト
 */
import { useState } from "react";
import { Redirect, useRoute } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertCircle, CheckCircle2, FolderOpen,
  Github, HardDrive, Link2, Loader2, Plus, RefreshCw,
  Trash2, Zap, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Service definitions ──────────────────────────────────────────────────────
type ServiceKey = "claude" | "github" | "googleDrive" | "localFolder";

interface ServiceDef {
  key: ServiceKey;
  label: string;
  description: string;
  Icon: React.ElementType;
  iconColor: string;
  bgColor: string;
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
    bgColor: "bg-amber-500/10 border-amber-500/20",
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
    bgColor: "bg-muted/50 border-border",
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
    bgColor: "bg-blue-500/10 border-blue-500/20",
    fields: [
      { key: "folderId", label: "フォルダーID", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" },
      { key: "folderName", label: "フォルダー名（任意）", placeholder: "My Skills Backup" },
    ],
    helpUrl: "https://drive.google.com/",
  },
  {
    key: "localFolder",
    label: "ローカルフォルダー",
    description: "ローカルのスキルディレクトリを監視・同期します",
    Icon: FolderOpen,
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
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
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Link2 className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">連携設定</h1>
            <p className="text-xs text-muted-foreground">
              Claude・GitHub・Google Drive・ローカルフォルダーとの連携を管理します。複数アカウントやフォルダーを登録できます。
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
  const [addingFor, setAddingFor] = useState<ServiceKey | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<ServiceKey>>(new Set<ServiceKey>(["github", "claude"]));

  const listQuery = trpc.settings.listIntegrations.useQuery({ type: undefined });
  const deleteIntegration = trpc.settings.deleteIntegration.useMutation({
    onSuccess: () => { toast.success("連携を削除しました"); listQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const testIntegration = trpc.settings.testIntegration.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
      listQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const allItems = listQuery.data ?? [];
  const totalConnected = allItems.filter((i) => i.status === "connected").length;

  const toggleExpand = (key: ServiceKey) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const editingItem = editingId !== null ? allItems.find((i) => i.id === editingId) : null;

  return (
    <>
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "登録済み連携", value: allItems.length, color: "text-primary" },
          { label: "接続済み", value: totalConnected, color: "text-emerald-400" },
          { label: "未確認・エラー", value: allItems.length - totalConnected, color: "text-muted-foreground" },
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

      {/* Per-service sections */}
      <div className="space-y-4">
        {SERVICES.map((svc) => {
          const items = allItems.filter((i) => i.type === svc.key);
          const expanded = expandedTypes.has(svc.key);

          return (
            <Card key={svc.key} className="card-glass overflow-hidden">
              {/* Service header */}
              <CardHeader
                className="p-4 pb-3 cursor-pointer select-none"
                onClick={() => toggleExpand(svc.key)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${svc.bgColor}`}>
                    <svc.Icon className={`w-4.5 h-4.5 ${svc.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold">{svc.label}</CardTitle>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {items.length}件
                      </Badge>
                      {items.some((i) => i.status === "connected") && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1" />接続済み
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={(e) => { e.stopPropagation(); setAddingFor(svc.key); }}
                    >
                      <Plus className="w-3 h-3" />追加
                    </Button>
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>

              {/* Account list */}
              {expanded && (
                <CardContent className="px-4 pb-4 pt-0 space-y-2">
                  {items.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                      <svc.Icon className={`w-6 h-6 mx-auto mb-2 ${svc.iconColor} opacity-40`} />
                      まだ連携が登録されていません。「追加」ボタンから登録してください。
                    </div>
                  ) : (
                    items.map((item) => {
                      const cfg = item.config as Record<string, string>;
                      const isConnected = item.status === "connected";
                      const isError = item.status === "error";

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            isConnected
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : isError
                              ? "bg-destructive/5 border-destructive/20"
                              : "bg-muted/30 border-border"
                          }`}
                        >
                          {/* Status icon */}
                          <div className="shrink-0">
                            {isConnected ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : isError ? (
                              <AlertCircle className="w-4 h-4 text-destructive" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.label}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {/* Show masked key info */}
                              {cfg.token && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {cfg.token.slice(0, 4)}••••{cfg.token.slice(-4)}
                                </span>
                              )}
                              {cfg.username && (
                                <span className="text-[10px] text-muted-foreground">@{cfg.username}</span>
                              )}
                              {cfg.path && (
                                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{cfg.path}</span>
                              )}
                              {cfg.folderId && (
                                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{cfg.folderId.slice(0, 12)}…</span>
                              )}
                              {item.lastTestedAt && (
                                <span className="text-[10px] text-muted-foreground/60">
                                  最終テスト: {new Date(item.lastTestedAt).toLocaleDateString("ja-JP")}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="接続テスト"
                              onClick={() => testIntegration.mutate({ id: item.id })}
                              disabled={testIntegration.isPending}
                            >
                              {testIntegration.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => setEditingId(item.id)}
                            >
                              編集
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="削除"
                              onClick={() => {
                                if (confirm(`「${item.label}」の連携を削除しますか？`)) {
                                  deleteIntegration.mutate({ id: item.id });
                                }
                              }}
                              disabled={deleteIntegration.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Dialog */}
      {addingFor && (
        <IntegrationFormDialog
          serviceKey={addingFor}
          mode="add"
          onClose={() => setAddingFor(null)}
          onSaved={() => { setAddingFor(null); listQuery.refetch(); }}
        />
      )}

      {/* Edit Dialog */}
      {editingItem && (
        <IntegrationFormDialog
          serviceKey={editingItem.type as ServiceKey}
          mode="edit"
          editId={editingItem.id}
          initialLabel={editingItem.label}
          initialConfig={editingItem.config as Record<string, string>}
          onClose={() => setEditingId(null)}
          onSaved={() => { setEditingId(null); listQuery.refetch(); }}
        />
      )}
    </>
  );
}

// ─── Integration Form Dialog ──────────────────────────────────────────────────
function IntegrationFormDialog({
  serviceKey,
  mode,
  editId,
  initialLabel,
  initialConfig,
  onClose,
  onSaved,
}: {
  serviceKey: ServiceKey;
  mode: "add" | "edit";
  editId?: number;
  initialLabel?: string;
  initialConfig?: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const svc = SERVICES.find((s) => s.key === serviceKey)!;
  const [label, setLabel] = useState(initialLabel ?? "");
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(svc.fields.map((f) => [f.key, initialConfig?.[f.key] ?? ""]))
  );
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const addMutation = trpc.settings.addIntegration.useMutation({
    onSuccess: () => { toast.success(`${svc.label} の連携を追加しました`); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.settings.updateIntegration.useMutation({
    onSuccess: () => { toast.success("連携を更新しました"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const testMutation = trpc.settings.testIntegration.useMutation({
    onSuccess: (data) => {
      setTestResult(data.success ? "success" : "error");
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    },
    onError: (e) => { setTestResult("error"); toast.error(e.message); },
  });

  const isPending = addMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    if (!label.trim()) { toast.error("表示名を入力してください"); return; }
    if (mode === "add") {
      addMutation.mutate({ type: serviceKey, label: label.trim(), config: values });
    } else if (editId !== undefined) {
      updateMutation.mutate({ id: editId, label: label.trim(), config: values });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <svc.Icon className={`w-4 h-4 ${svc.iconColor}`} />
            {svc.label} の連携を{mode === "add" ? "追加" : "編集"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-xs">表示名 <span className="text-destructive">*</span></Label>
            <Input
              placeholder={`例: 仕事用 GitHub、個人アカウント`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Service-specific fields */}
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
              APIキーの取得:{" "}
              <a href={svc.helpUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                {svc.helpUrl}
              </a>
            </p>
          )}

          {testResult && (
            <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
              testResult === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
            }`}>
              {testResult === "success"
                ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <AlertCircle className="w-3.5 h-3.5" />
              }
              {testResult === "success" ? "接続テスト成功" : "接続テスト失敗"}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {mode === "edit" && editId !== undefined && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => testMutation.mutate({ id: editId })}
              disabled={testMutation.isPending || isPending}
              className="gap-1.5 mr-auto"
            >
              {testMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              テスト
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending} className="gap-1.5">
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {mode === "add" ? "追加" : "更新"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
