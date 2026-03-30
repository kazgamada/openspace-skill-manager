import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Bot, Copy, RefreshCw, Terminal, Wifi, WifiOff,
  CheckCircle2, XCircle, Clock, Zap, Code2,
  Upload, Download, FolderOpen, FileCode2, Layers,
  AlertCircle, ChevronRight, Plus, Loader2, Tag,
  Server, Info,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SkillPreview {
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
  frontmatter: Record<string, string>;
}

interface BatchItem {
  filename: string;
  raw: string;
}

// ─────────────────────────────────────────────
// MCP Config
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
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

function CategoryBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    development: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    devops: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    writing: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    integration: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    analysis: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    general: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${colors[cat] ?? colors.general}`}>
      {cat}
    </span>
  );
}

// ─────────────────────────────────────────────
// Preview Modal
// ─────────────────────────────────────────────
function ImportPreviewModal({
  open,
  onClose,
  preview,
  rawContent,
  onConfirm,
  isImporting,
}: {
  open: boolean;
  onClose: () => void;
  preview: SkillPreview | null;
  rawContent: string;
  onConfirm: (overrides: { name: string; description: string; category: string }) => void;
  isImporting: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");

  // Sync state when preview data arrives (useEffect avoids render-phase setState)
  const previewKey = `${preview?.name ?? ""}|${preview?.description ?? ""}|${preview?.category ?? ""}`;
  useEffect(() => {
    if (preview) {
      setName(preview.name);
      setDescription(preview.description ?? "");
      setCategory(preview.category ?? "general");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileCode2 className="w-4 h-4 text-primary" />
            スキルインポートの確認
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            SKILL.mdから解析した情報を確認・編集してインポートします
          </DialogDescription>
        </DialogHeader>

        {preview && (
          <div className="space-y-4 py-2">
            {/* Parsed frontmatter info */}
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">解析結果</p>
              {Object.entries(preview.frontmatter).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground font-mono w-32 shrink-0">{k}:</span>
                  <span className="text-foreground break-all">{v}</span>
                </div>
              ))}
              {Object.keys(preview.frontmatter).length === 0 && (
                <p className="text-xs text-muted-foreground italic">フロントマターなし（コンテンツから推定）</p>
              )}
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">スキル名 <span className="text-rose-400">*</span></Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs bg-background border-border"
                  placeholder="例: explain-code"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">説明</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs bg-background border-border resize-none h-16"
                  placeholder="スキルの説明..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">カテゴリー</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground"
                >
                  {["general", "development", "devops", "writing", "integration", "analysis"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">タグ（検出済み）</Label>
                <div className="flex flex-wrap gap-1 min-h-8 items-center">
                  {preview.tags.length > 0
                    ? preview.tags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20">
                          <Tag className="w-2.5 h-2.5" />{t}
                        </span>
                      ))
                    : <span className="text-xs text-muted-foreground italic">なし</span>}
                </div>
              </div>
            </div>

            {/* Content preview */}
            <div className="space-y-1.5">
              <Label className="text-xs">コンテンツプレビュー</Label>
              <pre className="code-block text-[10px] leading-relaxed max-h-32 overflow-auto">
                {preview.content.slice(0, 500)}{preview.content.length > 500 ? "\n..." : ""}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs" disabled={isImporting}>
            キャンセル
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm({ name, description, category })}
            disabled={!name.trim() || isImporting}
            className="text-xs gap-1.5"
          >
            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            インポート
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Batch Result Modal
// ─────────────────────────────────────────────
function BatchResultModal({
  open,
  onClose,
  results,
}: {
  open: boolean;
  onClose: () => void;
  results: { name: string; skillId: string; success: boolean; error?: string }[];
}) {
  const succeeded = results.filter((r) => r.success).length;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            一括インポート結果
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-64 overflow-y-auto py-2">
          <p className="text-xs text-muted-foreground mb-3">
            {results.length}件中 <span className="text-emerald-400 font-semibold">{succeeded}件</span> 成功、
            <span className="text-rose-400 font-semibold"> {results.length - succeeded}件</span> 失敗
          </p>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-muted/20 text-xs">
              {r.success
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
              <span className="flex-1 truncate font-mono">{r.name}</span>
              {r.error && <span className="text-rose-400 text-[10px] truncate max-w-32">{r.error}</span>}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button size="sm" onClick={onClose} className="text-xs">閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// MCP Config Parser Modal
// ─────────────────────────────────────────────
function McpParserModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mcpRaw, setMcpRaw] = useState("");
  const parseMutation = trpc.claude.parseMcpConfig.useMutation();

  const handleParse = () => {
    if (!mcpRaw.trim()) return;
    parseMutation.mutate(
      { raw: mcpRaw },
      {
        onSuccess: (data) => {
          toast.success(`${data.count}件のMCPサーバーを検出しました`);
        },
        onError: (err) => {
          toast.error(`解析エラー: ${err.message}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            MCP設定ファイルの解析
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            ~/.claude.json または .mcp.json の内容を貼り付けてMCPサーバー一覧を確認します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/80">
              <strong>ファイルの場所：</strong> ユーザースコープは <code className="font-mono bg-black/20 px-1 rounded">~/.claude.json</code>、
              プロジェクトスコープは <code className="font-mono bg-black/20 px-1 rounded">.mcp.json</code>
            </p>
          </div>

          <Textarea
            value={mcpRaw}
            onChange={(e) => setMcpRaw(e.target.value)}
            className="font-mono text-xs bg-background border-border resize-none h-48"
            placeholder={'{\n  "mcpServers": {\n    "my-server": {\n      "command": "node",\n      "args": ["server.js"]\n    }\n  }\n}'}
          />

          {parseMutation.data && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">検出されたMCPサーバー ({parseMutation.data.count}件)</p>
              {parseMutation.data.servers.map((s) => (
                <div key={s.name} className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold font-mono">{s.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{s.transport}</Badge>
                  </div>
                  {s.command && (
                    <p className="text-[10px] text-muted-foreground font-mono pl-5">
                      {s.command} {s.args?.join(" ")}
                    </p>
                  )}
                  {s.url && (
                    <p className="text-[10px] text-muted-foreground font-mono pl-5">{s.url}</p>
                  )}
                  {s.envKeys.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-5">
                      {s.envKeys.map((k) => (
                        <span key={k} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{k}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">閉じる</Button>
          <Button
            size="sm"
            onClick={handleParse}
            disabled={!mcpRaw.trim() || parseMutation.isPending}
            className="text-xs gap-1.5"
          >
            {parseMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Code2 className="w-3.5 h-3.5" />}
            解析する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function ClaudeIntegration() {
  const [mcpStatus, setMcpStatus] = useState<"connected" | "disconnected" | "checking">("disconnected");
  const [pastedContent, setPastedContent] = useState("");
  const [previewData, setPreviewData] = useState<SkillPreview | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchResults, setBatchResults] = useState<{ name: string; skillId: string; success: boolean; error?: string }[]>([]);
  const [showBatchResult, setShowBatchResult] = useState(false);
  const [showMcpParser, setShowMcpParser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const logsQuery = trpc.claude.logs.useQuery({ limit: 50 });
  const logs = logsQuery.data ?? [];

  const previewMutation = trpc.claude.previewSkillMd.useMutation();
  const importMutation = trpc.claude.importSkillMd.useMutation();
  const batchMutation = trpc.claude.importBatch.useMutation();

  // ── Connection check
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

  // ── Single SKILL.md: preview
  const handlePreview = () => {
    if (!pastedContent.trim()) {
      toast.error("SKILL.mdの内容を貼り付けてください");
      return;
    }
    previewMutation.mutate(
      { raw: pastedContent },
      {
        onSuccess: (data) => {
          setPreviewData(data.preview);
          setShowPreviewModal(true);
        },
        onError: (err) => toast.error(`解析エラー: ${err.message}`),
      }
    );
  };

  // ── Single SKILL.md: confirm import
  const handleConfirmImport = (overrides: { name: string; description: string; category: string }) => {
    importMutation.mutate(
      { raw: pastedContent, ...overrides },
      {
        onSuccess: (data) => {
          toast.success(`「${data.name}」をインポートしました`);
          setShowPreviewModal(false);
          setPastedContent("");
          setPreviewData(null);
          utils.skills.list.invalidate();
        },
        onError: (err) => toast.error(`インポートエラー: ${err.message}`),
      }
    );
  };

  // ── File upload: single
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPastedContent(text);
      toast.info(`「${file.name}」を読み込みました`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── File upload: batch (multiple SKILL.md files)
  const handleBatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const readers = files.map(
      (file) =>
        new Promise<BatchItem>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve({ filename: file.name, raw: ev.target?.result as string });
          reader.readAsText(file);
        })
    );
    Promise.all(readers).then((items) => {
      setBatchItems(items);
      toast.info(`${items.length}件のSKILL.mdを読み込みました`);
    });
    e.target.value = "";
  };

  // ── Batch import
  const handleBatchImport = () => {
    if (batchItems.length === 0) return;
    batchMutation.mutate(
      { skills: batchItems },
      {
        onSuccess: (data) => {
          setBatchResults(data.results);
          setShowBatchResult(true);
          setBatchItems([]);
          utils.skills.list.invalidate();
          toast.success(`${data.succeeded}/${data.total}件のスキルをインポートしました`);
        },
        onError: (err) => toast.error(`一括インポートエラー: ${err.message}`),
      }
    );
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
            <p className="text-sm text-muted-foreground mt-0.5">スキルのインポートとMCP接続管理</p>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus status={mcpStatus} />
            <Button variant="outline" size="sm" onClick={checkConnection} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              接続確認
            </Button>
          </div>
        </div>

        {/* Stats */}
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
        <Tabs defaultValue="import">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="import" className="text-xs gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              スキルインポート
            </TabsTrigger>
            <TabsTrigger value="batch" className="text-xs gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              一括インポート
            </TabsTrigger>
            <TabsTrigger value="config" className="text-xs gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              MCP設定
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              実行ログ
            </TabsTrigger>
          </TabsList>

          {/* ── Import Tab ── */}
          <TabsContent value="import" className="mt-4 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-primary" />
                  SKILL.md からインポート
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info box */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Claude Code スキルの場所
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground mb-0.5">個人スキル（全プロジェクト共通）</p>
                      <code className="font-mono bg-black/20 px-1.5 py-0.5 rounded block">~/.claude/skills/&lt;name&gt;/SKILL.md</code>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-0.5">プロジェクトスキル</p>
                      <code className="font-mono bg-black/20 px-1.5 py-0.5 rounded block">.claude/skills/&lt;name&gt;/SKILL.md</code>
                    </div>
                  </div>
                </div>

                {/* Paste area */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">SKILL.mdの内容を貼り付け</Label>
                    <div className="flex items-center gap-2">
                      <input ref={fileInputRef} type="file" accept=".md,.txt" className="hidden" onChange={handleFileUpload} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-1.5 text-xs h-7"
                      >
                        <FolderOpen className="w-3 h-3" />
                        ファイルを開く
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={pastedContent}
                    onChange={(e) => setPastedContent(e.target.value)}
                    className="font-mono text-xs bg-background border-border resize-none h-52"
                    placeholder={`---\nname: my-skill\ndescription: Explains code with visual diagrams. Use when explaining how code works.\nallowed-tools: Read, Grep\n---\n\nWhen explaining code, always include:\n\n1. **Start with an analogy**\n2. **Draw a diagram** using ASCII art\n3. **Walk through the code** step-by-step\n...`}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {pastedContent.length > 0 ? `${pastedContent.length.toLocaleString()} 文字` : "SKILL.mdの内容を貼り付けるか、ファイルを選択してください"}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={handlePreview}
                    disabled={!pastedContent.trim() || previewMutation.isPending}
                    className="gap-1.5 text-xs"
                  >
                    {previewMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    プレビュー & インポート
                  </Button>
                  {pastedContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPastedContent("")}
                      className="text-xs text-muted-foreground"
                    >
                      クリア
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* MCP config parser shortcut */}
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Server className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">MCP設定ファイルの解析</p>
                    <p className="text-[10px] text-muted-foreground">~/.claude.json または .mcp.json のサーバー一覧を確認</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowMcpParser(true)} className="text-xs gap-1.5">
                  <Code2 className="w-3.5 h-3.5" />
                  解析する
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Batch Import Tab ── */}
          <TabsContent value="batch" className="mt-4 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  複数スキルの一括インポート
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                  <p className="text-xs font-medium">使い方</p>
                  <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>複数のSKILL.mdファイルを選択（Ctrl/Cmd+クリックで複数選択可）</li>
                    <li>ファイル一覧で内容を確認</li>
                    <li>「一括インポート」ボタンで全スキルをOSMに登録</li>
                  </ol>
                </div>

                {/* File picker */}
                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  onClick={() => batchFileInputRef.current?.click()}
                >
                  <input
                    ref={batchFileInputRef}
                    type="file"
                    accept=".md,.txt"
                    multiple
                    className="hidden"
                    onChange={handleBatchFileUpload}
                  />
                  <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-medium">SKILL.mdファイルをドロップ</p>
                  <p className="text-xs text-muted-foreground mt-1">またはクリックしてファイルを選択（複数可）</p>
                </div>

                {/* File list */}
                {batchItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{batchItems.length}件のファイルを選択中</p>
                      <Button variant="ghost" size="sm" onClick={() => setBatchItems([])} className="text-xs text-muted-foreground h-6">
                        クリア
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {batchItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-muted/20 text-xs">
                          <FileCode2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="flex-1 font-mono truncate">{item.filename}</span>
                          <span className="text-muted-foreground text-[10px]">{item.raw.length.toLocaleString()} chars</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={handleBatchImport}
                      disabled={batchMutation.isPending}
                      className="w-full gap-1.5 text-xs"
                    >
                      {batchMutation.isPending
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />インポート中...</>
                        : <><Download className="w-3.5 h-3.5" />{batchItems.length}件を一括インポート</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Config Tab ── */}
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

          {/* ── Logs Tab ── */}
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

      {/* Modals */}
      <ImportPreviewModal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        preview={previewData}
        rawContent={pastedContent}
        onConfirm={handleConfirmImport}
        isImporting={importMutation.isPending}
      />
      <BatchResultModal
        open={showBatchResult}
        onClose={() => setShowBatchResult(false)}
        results={batchResults}
      />
      <McpParserModal
        open={showMcpParser}
        onClose={() => setShowMcpParser(false)}
      />
    </DashboardLayout>
  );
}
