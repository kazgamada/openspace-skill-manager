/**
 * Claude Code リアルタイムモニター
 * 作業アクティビティを送信し、スキル提案をリアルタイムで受け取る
 */
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity,
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Terminal,
  Trash2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useLocation } from "wouter";

// ─── 型定義 ──────────────────────────────────────────────────────────────────

interface ActivityEntry {
  tool: string;
  input?: string;
  output?: string;
  timestamp: number;
  isError?: boolean;
}

// ─── ツール選択肢 ─────────────────────────────────────────────────────────────

const TOOL_OPTIONS = [
  "Bash", "Read", "Write", "Edit", "MultiEdit", "Glob", "Grep",
  "TodoRead", "TodoWrite", "WebFetch", "WebSearch", "Task",
  "computer_use", "mcp_tool", "その他",
];

// ─── アクティビティ入力フォーム ───────────────────────────────────────────────

function ActivityForm({
  onAdd,
}: {
  onAdd: (entry: ActivityEntry) => void;
}) {
  const [tool, setTool] = useState("Bash");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isError, setIsError] = useState(false);

  const handleAdd = () => {
    if (!tool.trim()) return;
    onAdd({
      tool,
      input: input.trim() || undefined,
      output: output.trim() || undefined,
      timestamp: Date.now(),
      isError,
    });
    setInput("");
    setOutput("");
    setIsError(false);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          アクティビティを追加
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ツール選択 */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">ツール</Label>
          <div className="flex flex-wrap gap-1.5">
            {TOOL_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                  tool === t
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-muted/30 border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 入力・出力 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">入力（コマンド・ファイルパス等）</Label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例: npm test, src/App.tsx"
              className="text-xs h-20 resize-none font-mono"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">出力（結果・エラーメッセージ等）</Label>
            <Textarea
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              placeholder="例: PASS 3 tests, TypeError: ..."
              className="text-xs h-20 resize-none font-mono"
            />
          </div>
        </div>

        {/* エラーフラグ */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsError(!isError)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-all ${
              isError
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-muted/30 border-border text-muted-foreground hover:border-border/80"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            エラーとしてマーク
          </button>
          <Button size="sm" onClick={handleAdd} className="ml-auto gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            追加
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── アクティビティリスト ─────────────────────────────────────────────────────

function ActivityList({
  activities,
  onRemove,
}: {
  activities: ActivityEntry[];
  onRemove: (idx: number) => void;
}) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-lg">
        <Terminal className="w-8 h-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">アクティビティがありません</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">上のフォームから追加してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
      {activities.map((act, idx) => (
        <div
          key={idx}
          className={`flex items-start gap-2 p-2.5 rounded-lg border transition-colors ${
            act.isError
              ? "bg-rose-500/5 border-rose-500/20"
              : "bg-muted/30 border-border/50"
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${act.isError ? "bg-rose-400" : "bg-emerald-400"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono font-semibold text-primary">{act.tool}</span>
              {act.isError && (
                <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded px-1">ERROR</span>
              )}
              <span className="text-[9px] text-muted-foreground/50 ml-auto">
                {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true, locale: ja })}
              </span>
            </div>
            {act.input && (
              <p className="text-[10px] text-muted-foreground font-mono truncate">{act.input}</p>
            )}
            {act.output && (
              <p className={`text-[10px] font-mono truncate ${act.isError ? "text-rose-400/70" : "text-muted-foreground/60"}`}>
                → {act.output}
              </p>
            )}
          </div>
          <button
            onClick={() => onRemove(idx)}
            className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── スキル提案カード ─────────────────────────────────────────────────────────

type Suggestion = {
  id: string;
  skillId: string | null;
  skillName: string;
  skillDescription: string;
  reason: string;
  source: string;
  confidence: number;
  createdAt: Date;
};

function SuggestionCard({
  suggestion,
  onInstall,
  onDismiss,
  isInstalling,
  isDismissing,
}: {
  suggestion: Suggestion;
  onInstall: () => void;
  onDismiss: () => void;
  isInstalling: boolean;
  isDismissing: boolean;
}) {
  const confidenceColor =
    suggestion.confidence >= 80
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      : suggestion.confidence >= 60
      ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
      : "text-muted-foreground bg-muted/30 border-border";

  return (
    <div className="p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Brain className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold">{suggestion.skillName}</p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${confidenceColor}`}>
              {suggestion.confidence}%
            </span>
            <span className="text-[9px] text-muted-foreground/50 ml-auto">
              {suggestion.source === "community" ? "コミュニティ" : "GitHub"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
            {suggestion.skillDescription}
          </p>
        </div>
      </div>
      <div className="ml-9">
        <p className="text-[10px] text-primary/70 mb-2 leading-relaxed">
          <span className="font-medium">理由: </span>{suggestion.reason}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 gap-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
            onClick={onDismiss}
            disabled={isDismissing}
          >
            {isDismissing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            却下
          </Button>
          <Button
            size="sm"
            className="h-6 text-[10px] px-2 gap-1 ml-auto"
            onClick={onInstall}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            {suggestion.skillId ? "インストール" : "マイスキルに追加"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── セッション履歴 ───────────────────────────────────────────────────────────

type Session = {
  id: string;
  sessionLabel: string | null;
  detectedPatterns: {
    tools: string[];
    taskTypes: string[];
    languages: string[];
    errorPatterns: string[];
    missingCapabilities: string[];
  } | null;
  lastActivityAt: Date;
  createdAt: Date;
};

function SessionHistoryCard({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Clock className="w-7 h-7 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">セッション履歴がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
      {sessions.map((session) => (
        <div key={session.id} className="p-3 rounded-lg bg-muted/20 border border-border/50">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-medium flex-1 truncate">
              {session.sessionLabel ?? session.id.slice(0, 16) + "…"}
            </p>
            <span className="text-[9px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true, locale: ja })}
            </span>
          </div>
          {session.detectedPatterns && (
            <div className="flex flex-wrap gap-1 ml-5">
              {session.detectedPatterns.taskTypes.slice(0, 3).map((t) => (
                <span key={t} className="text-[9px] bg-primary/10 text-primary/70 border border-primary/20 rounded px-1.5 py-0.5">
                  {t}
                </span>
              ))}
              {session.detectedPatterns.languages.slice(0, 2).map((l) => (
                <span key={l} className="text-[9px] bg-cyan-400/10 text-cyan-400/70 border border-cyan-400/20 rounded px-1.5 py-0.5">
                  {l}
                </span>
              ))}
              {session.detectedPatterns.missingCapabilities.slice(0, 2).map((c) => (
                <span key={c} className="text-[9px] bg-amber-400/10 text-amber-400/70 border border-amber-400/20 rounded px-1.5 py-0.5">
                  ⚠ {c}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── メインページ ─────────────────────────────────────────────────────────────

export default function ClaudeMonitor() {
  const [, setLocation] = useLocation();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [sessionLabel, setSessionLabel] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // データ取得
  const suggestionsQuery = trpc.monitor.getSuggestions.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const sessionsQuery = trpc.monitor.getRecentSessions.useQuery();

  // アクティビティ報告
  const reportMutation = trpc.monitor.reportActivity.useMutation({
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      toast.success(`パターン検出完了。${data.suggestionsGenerated} 件のスキルを提案しました`);
      utils.monitor.getSuggestions.invalidate();
      utils.monitor.getRecentSessions.invalidate();
    },
    onError: (e) => toast.error(`分析エラー: ${e.message}`),
  });

  // 提案インストール
  const installMutation = trpc.monitor.installSuggestion.useMutation({
    onSuccess: () => {
      toast.success("スキルをマイスキルに追加しました");
      setInstallingId(null);
      utils.monitor.getSuggestions.invalidate();
    },
    onError: (e) => {
      toast.error(`インストールエラー: ${e.message}`);
      setInstallingId(null);
    },
  });

  // 提案却下
  const dismissMutation = trpc.monitor.dismissSuggestion.useMutation({
    onSuccess: () => {
      setDismissingId(null);
      utils.monitor.getSuggestions.invalidate();
    },
    onError: (e) => {
      toast.error(`却下エラー: ${e.message}`);
      setDismissingId(null);
    },
  });

  const handleAddActivity = useCallback((entry: ActivityEntry) => {
    setActivities((prev) => [...prev, entry]);
  }, []);

  const handleRemoveActivity = useCallback((idx: number) => {
    setActivities((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAnalyze = () => {
    if (activities.length === 0) {
      toast.warning("アクティビティを1件以上追加してください");
      return;
    }
    reportMutation.mutate({
      sessionId: currentSessionId,
      sessionLabel: sessionLabel.trim() || undefined,
      activities,
    });
  };

  const handleInstall = (id: string) => {
    setInstallingId(id);
    installMutation.mutate({ id });
  };

  const handleDismiss = (id: string) => {
    setDismissingId(id);
    dismissMutation.mutate({ id });
  };

  const suggestions = suggestionsQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Claude Code モニター
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              作業アクティビティを分析し、最適なスキルをAIが提案します
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => suggestionsQuery.refetch()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            更新
          </Button>
        </div>

        {/* 使い方ガイド */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-primary mb-1">使い方</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Claude Codeで使用したツール・コマンドの実行結果を入力してください。AIがパターンを検出し、
                  あなたの作業に最適なスキルを自動提案します。提案されたスキルはワンクリックでマイスキルに追加できます。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左カラム: アクティビティ入力 */}
          <div className="lg:col-span-2 space-y-4">
            {/* セッションラベル */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">セッション名（任意）</Label>
                    <Input
                      value={sessionLabel}
                      onChange={(e) => setSessionLabel(e.target.value)}
                      placeholder="例: feature/user-auth 実装, バグ修正 #123"
                      className="text-xs h-8"
                    />
                  </div>
                  {currentSessionId && (
                    <div className="shrink-0">
                      <p className="text-[9px] text-muted-foreground mb-1">セッションID</p>
                      <code className="text-[9px] font-mono text-primary/60 bg-primary/5 px-2 py-1 rounded">
                        {currentSessionId.slice(0, 20)}…
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* アクティビティ追加フォーム */}
            <ActivityForm onAdd={handleAddActivity} />

            {/* アクティビティリスト */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  アクティビティログ
                  <Badge variant="outline" className="ml-auto text-[9px]">
                    {activities.length} 件
                  </Badge>
                  {activities.length > 0 && (
                    <button
                      onClick={() => setActivities([])}
                      className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityList activities={activities} onRemove={handleRemoveActivity} />
              </CardContent>
            </Card>

            {/* 分析ボタン */}
            <Button
              size="lg"
              className="w-full gap-2 text-sm"
              onClick={handleAnalyze}
              disabled={reportMutation.isPending || activities.length === 0}
            >
              {reportMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />AIがパターンを分析中...</>
              ) : (
                <><Sparkles className="w-4 h-4" />アクティビティを分析してスキルを提案</>
              )}
            </Button>
          </div>

          {/* 右カラム: 提案・履歴 */}
          <div className="space-y-4">
            {/* スキル提案 */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  スキル提案
                  {suggestions.length > 0 && (
                    <Badge className="ml-auto text-[9px] bg-primary/15 text-primary border-primary/30">
                      {suggestions.length} 件
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {suggestionsQuery.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 rounded-lg shimmer" />
                    ))}
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Brain className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">提案はありません</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      アクティビティを追加して分析してください
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {suggestions.map((sug) => (
                      <SuggestionCard
                        key={sug.id}
                        suggestion={sug}
                        onInstall={() => handleInstall(sug.id)}
                        onDismiss={() => handleDismiss(sug.id)}
                        isInstalling={installingId === sug.id}
                        isDismissing={dismissingId === sug.id}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* セッション履歴 */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  最近のセッション
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsQuery.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-14 rounded-lg shimmer" />
                    ))}
                  </div>
                ) : (
                  <SessionHistoryCard sessions={sessions as Session[]} />
                )}
              </CardContent>
            </Card>

            {/* スキル広場へのリンク */}
            <button
              onClick={() => setLocation("/community")}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">スキル広場を探索</p>
                <p className="text-xs text-muted-foreground">コミュニティのスキルを検索</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
