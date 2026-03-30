import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Github, Upload, Wand2, GitMerge, Tag, CheckCircle2, XCircle,
  RefreshCw, ArrowRight, FileText, Layers, Zap, AlertCircle,
  ChevronDown, ChevronUp, Plus, Trash2, Eye, Download, Loader2,
  Bot, Copy, Wifi, WifiOff, Terminal, Code2, Server, FileCode2,
  Sparkles, Settings2, Search, Star, ChevronRight, ClipboardCopy,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type FetchedSkill = {
  path: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  allowedTools: string[];
  content: string;
  raw: string;
};

type ImportResult = {
  name: string;
  skillId: string;
  version: string;
  action: "created" | "updated";
  success: boolean;
  error?: string;
};

interface SkillPreview {
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
  frontmatter: Record<string, string>;
}

// ─── Tag Badge ────────────────────────────────────────────────────────────────
function TagBadge({ tag }: { tag: string }) {
  const colorMap: Record<string, string> = {
    shell: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    "file-read": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "file-write": "bg-green-500/20 text-green-300 border-green-500/30",
    "file-edit": "bg-teal-500/20 text-teal-300 border-teal-500/30",
    "file-search": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    "text-search": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    web: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    github: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    testing: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    devops: "bg-red-500/20 text-red-300 border-red-500/30",
    api: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    database: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    documentation: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    "code-quality": "bg-amber-500/20 text-amber-300 border-amber-500/30",
    analysis: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    mcp: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
    "task-management": "bg-lime-500/20 text-lime-300 border-lime-500/30",
    frontend: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    backend: "bg-stone-500/20 text-stone-300 border-stone-500/30",
    git: "bg-orange-600/20 text-orange-300 border-orange-600/30",
  };
  const cls = colorMap[tag] ?? "bg-white/10 text-white/60 border-white/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {tag}
    </span>
  );
}

// ─── Skill Preview Card ───────────────────────────────────────────────────────
function SkillPreviewCard({
  skill, selected, onToggle, showRaw,
}: {
  skill: FetchedSkill; selected: boolean; onToggle: () => void; showRaw?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`rounded-xl border transition-all duration-200 cursor-pointer ${
        selected
          ? "border-purple-500/60 bg-purple-500/10 shadow-lg shadow-purple-500/10"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
      onClick={onToggle}
    >
      <div className="p-4 flex items-start gap-3">
        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selected ? "border-purple-400 bg-purple-400" : "border-white/30"}`}>
          {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{skill.name}</span>
            <Badge variant="outline" className="text-xs border-white/20 text-white/50">{skill.category}</Badge>
          </div>
          <p className="text-white/60 text-xs mt-1 line-clamp-2">{skill.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {skill.tags.slice(0, 5).map((t) => <TagBadge key={t} tag={t} />)}
            {skill.tags.length > 5 && <span className="text-white/40 text-xs">+{skill.tags.length - 5}</span>}
          </div>
          {skill.allowedTools.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {skill.allowedTools.slice(0, 4).map((t) => (
                <span key={t} className="text-xs bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/50">{t}</span>
              ))}
              {skill.allowedTools.length > 4 && <span className="text-white/30 text-xs">+{skill.allowedTools.length - 4} tools</span>}
            </div>
          )}
          <p className="text-white/30 text-xs mt-1 font-mono truncate">{skill.path}</p>
        </div>
        {showRaw && (
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
      {expanded && showRaw && (
        <div className="px-4 pb-4">
          <pre className="text-xs text-white/50 bg-black/30 rounded-lg p-3 overflow-auto max-h-48 font-mono">
            {skill.raw.slice(0, 1500)}{skill.raw.length > 1500 ? "\n..." : ""}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── GitHub Fetch Tab ─────────────────────────────────────────────────────────
function GithubFetchTab() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/anthropics/claude-code-skills");
  const [subPath, setSubPath] = useState("");
  const [fetchedSkills, setFetchedSkills] = useState<FetchedSkill[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);

  const fetchMutation = trpc.claude.fetchGithubSkills.useMutation({
    onSuccess: (data) => {
      setFetchedSkills(data.skills);
      setSelectedIds(new Set(data.skills.map((s) => s.path)));
      setImportResults(null);
      if (data.skills.length === 0) toast.info("SKILL.mdが見つかりませんでした");
      else toast.success(`${data.skills.length}件のSKILL.mdを取得しました`);
    },
    onError: (err) => toast.error(err.message),
  });

  const importMutation = trpc.claude.importFromGithub.useMutation({
    onSuccess: (data) => {
      setImportResults(data.results);
      toast.success(`${data.succeeded}件インポート完了（新規: ${data.created}件、更新: ${data.updated}件）`);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleSkill = (path: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const handleImport = () => {
    const toImport = fetchedSkills.filter((s) => selectedIds.has(s.path)).map((s) => ({ name: s.name, raw: s.raw, path: s.path, repoUrl }));
    if (toImport.length === 0) { toast.warning("スキルを選択してください"); return; }
    importMutation.mutate({ skills: toImport });
  };

  const popularRepos = [
    { label: "anthropics/claude-code-skills", url: "https://github.com/anthropics/claude-code-skills" },
    { label: "jezweb/claude-skills", url: "https://github.com/jezweb/claude-skills" },
    { label: "alirezarezvani/claude-skills", url: "https://github.com/alirezarezvani/claude-skills" },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Github className="w-4 h-4 text-purple-400" />
            GitHubリポジトリからスキルを取得
          </CardTitle>
          <CardDescription className="text-white/50 text-sm">
            公開リポジトリのURLを入力するとSKILL.mdを自動検出し、allowed-toolsからタグを自動付与します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {popularRepos.map((r) => (
              <button key={r.url} onClick={() => setRepoUrl(r.url)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${repoUrl === r.url ? "border-purple-500/60 bg-purple-500/20 text-purple-300" : "border-white/15 bg-white/5 text-white/50 hover:border-white/30"}`}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repo"
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 flex-1" />
            <Input value={subPath} onChange={(e) => setSubPath(e.target.value)} placeholder="サブパス (任意)"
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 w-40" />
            <Button onClick={() => fetchMutation.mutate({ repoUrl, subPath, maxFiles: 20 })}
              disabled={fetchMutation.isPending || !repoUrl} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
              {fetchMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              取得
            </Button>
          </div>
        </CardContent>
      </Card>

      {fetchedSkills.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">{fetchedSkills.length}件のスキルが見つかりました</span>
              <span className="text-white/40 text-sm">{selectedIds.size}件選択中</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set(fetchedSkills.map((s) => s.path)))}
                className="border-white/20 text-white/70 hover:bg-white/10 text-xs">全選択</Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}
                className="border-white/20 text-white/70 hover:bg-white/10 text-xs">全解除</Button>
              <Button onClick={handleImport} disabled={importMutation.isPending || selectedIds.size === 0}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white gap-2 text-sm">
                {importMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {selectedIds.size}件をインポート
              </Button>
            </div>
          </div>
          <div className="grid gap-3">
            {fetchedSkills.map((skill) => (
              <SkillPreviewCard key={skill.path} skill={skill} selected={selectedIds.has(skill.path)} onToggle={() => toggleSkill(skill.path)} showRaw />
            ))}
          </div>
        </div>
      )}

      {importResults && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />インポート結果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {importResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  {r.success ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                  <span className="text-white text-sm flex-1">{r.name}</span>
                  {r.success && (
                    <Badge variant="outline" className={`text-xs ${r.action === "created" ? "border-green-500/40 text-green-400" : "border-blue-500/40 text-blue-400"}`}>
                      {r.action === "created" ? "新規作成" : `更新 ${r.version}`}
                    </Badge>
                  )}
                  {!r.success && <span className="text-red-400 text-xs">{r.error}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── AI Merge Tab ─────────────────────────────────────────────────────────────
function AIMergeTab() {
  const [sources, setSources] = useState<{ name: string; raw: string }[]>([{ name: "", raw: "" }, { name: "", raw: "" }]);
  const [targetName, setTargetName] = useState("");
  const [targetDescription, setTargetDescription] = useState("");
  const [mergedResult, setMergedResult] = useState<{ skillId: string; name: string; mergedRaw: string; tags: string[]; allowedTools: string[] } | null>(null);

  const mergeMutation = trpc.claude.mergeSkillsWithAI.useMutation({
    onSuccess: (data) => { setMergedResult(data); toast.success(`AIマージ完了: "${data.name}" を生成しました`); },
    onError: (err) => toast.error(err.message),
  });

  const addSource = () => { if (sources.length >= 5) { toast.warning("最大5件まで"); return; } setSources([...sources, { name: "", raw: "" }]); };
  const removeSource = (i: number) => { if (sources.length <= 2) { toast.warning("最低2件必要"); return; } setSources(sources.filter((_, idx) => idx !== i)); };
  const updateSource = (i: number, field: "name" | "raw", value: string) => setSources(sources.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const handleMerge = () => {
    const valid = sources.filter((s) => s.raw.trim().length > 0);
    if (valid.length < 2) { toast.warning("SKILL.mdの内容を2件以上入力してください"); return; }
    mergeMutation.mutate({ skills: valid, targetName: targetName || undefined, targetDescription: targetDescription || undefined });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-amber-400" />AIスキルマージ
          </CardTitle>
          <CardDescription className="text-white/50 text-sm">
            複数のSKILL.mdをAIが分析・統合し、それぞれの長所を組み合わせた高品質なスキルを自動生成します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-xs mb-1 block">生成スキル名（任意）</label>
              <Input value={targetName} onChange={(e) => setTargetName(e.target.value)} placeholder="例: Ultimate Code Review"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30" />
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">説明（任意）</label>
              <Input value={targetDescription} onChange={(e) => setTargetDescription(e.target.value)} placeholder="マージ後のスキルの説明"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30" />
            </div>
          </div>

          <div className="space-y-3">
            {sources.map((src, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm font-medium">ソーススキル {i + 1}</span>
                  <button onClick={() => removeSource(i)} className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Input value={src.name} onChange={(e) => updateSource(i, "name", e.target.value)} placeholder="スキル名（任意）"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" />
                <Textarea value={src.raw} onChange={(e) => updateSource(i, "raw", e.target.value)} placeholder="SKILL.mdの内容をここに貼り付けてください..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm font-mono min-h-[120px] resize-none" />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={addSource} disabled={sources.length >= 5}
              className="border-white/20 text-white/70 hover:bg-white/10 gap-2">
              <Plus className="w-4 h-4" />ソースを追加
            </Button>
            <Button onClick={handleMerge} disabled={mergeMutation.isPending}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white gap-2 flex-1">
              {mergeMutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />AIがマージ中...</> : <><Wand2 className="w-4 h-4" />AIでマージして高品質スキルを生成</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {mergedResult && (
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />生成完了: {mergedResult.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1">{mergedResult.tags.map((t) => <TagBadge key={t} tag={t} />)}</div>
            <div className="flex flex-wrap gap-1">
              {mergedResult.allowedTools.map((t) => (
                <span key={t} className="text-xs bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/50">{t}</span>
              ))}
            </div>
            <pre className="text-xs text-white/60 bg-black/30 rounded-lg p-3 overflow-auto max-h-64 font-mono">
              {mergedResult.mergedRaw.slice(0, 2000)}{mergedResult.mergedRaw.length > 2000 ? "\n..." : ""}
            </pre>
            <Button variant="outline" size="sm" onClick={() => window.location.href = `/skills/${mergedResult.skillId}`}
              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-2">
              <Eye className="w-3.5 h-3.5" />スキル詳細を確認
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Diff Import Tab ──────────────────────────────────────────────────────────
function DiffImportTab() {
  const utils = trpc.useUtils();
  const { data: mySkills } = trpc.skills.list.useQuery();
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [raw, setRaw] = useState("");
  const [changeLog, setChangeLog] = useState("");
  const [result, setResult] = useState<{ newVersion: string; versionId: string } | null>(null);

  const diffMutation = trpc.claude.diffImport.useMutation({
    onSuccess: (data) => {
      setResult(data);
      utils.skills.list.invalidate();
      toast.success(`差分インポート完了: ${data.newVersion} として保存しました`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-blue-400" />差分インポート（バージョン保持）
          </CardTitle>
          <CardDescription className="text-white/50 text-sm">
            既存スキルを上書きせず、新バージョンとして追加します。バージョン履歴が完全に保持されます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-white/60 text-xs mb-1 block">更新対象スキルを選択</label>
            <select value={selectedSkillId} onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50">
              <option value="" className="bg-gray-900">-- スキルを選択 --</option>
              {mySkills?.map((s) => (
                <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1 block">新しいSKILL.md内容</label>
            <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="更新後のSKILL.mdの内容を貼り付けてください..."
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 font-mono text-sm min-h-[180px] resize-none" />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1 block">変更ログ（任意）</label>
            <Input value={changeLog} onChange={(e) => setChangeLog(e.target.value)} placeholder="例: エラーハンドリングを改善、新しいツールを追加"
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30" />
          </div>
          <Button onClick={() => diffMutation.mutate({ existingSkillId: selectedSkillId, raw, changeLog: changeLog || undefined })}
            disabled={diffMutation.isPending || !selectedSkillId || !raw.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white gap-2">
            {diffMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
            新バージョンとしてインポート
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">差分インポート完了</p>
                <p className="text-white/60 text-sm">バージョン <span className="text-blue-400 font-mono">{result.newVersion}</span> として保存されました</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Auto Tag Tab ─────────────────────────────────────────────────────────────
function AutoTagTab() {
  const [raw, setRaw] = useState("");
  const [previewResult, setPreviewResult] = useState<{
    name: string; description: string; category: string; tags: string[]; allowedTools: string[];
  } | null>(null);

  const previewMutation = trpc.claude.previewSkillMd.useMutation({
    onSuccess: (data) => {
      const allowedToolsRaw = data.preview.frontmatter["allowed-tools"] ?? "";
      const allowedTools = allowedToolsRaw ? allowedToolsRaw.split(/[,\s]+/).filter(Boolean) : [];
      setPreviewResult({ name: data.preview.name, description: data.preview.description, category: data.preview.category, tags: data.preview.tags, allowedTools });
    },
    onError: (err) => toast.error(err.message),
  });

  const toolTagMap: Record<string, string> = {
    Read: "file-read", Write: "file-write", Edit: "file-edit", Bash: "shell",
    Glob: "file-search", Grep: "text-search", WebFetch: "web", WebSearch: "web",
    TodoRead: "task-management", TodoWrite: "task-management",
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-green-400" />自動タグ付けプレビュー
          </CardTitle>
          <CardDescription className="text-white/50 text-sm">
            SKILL.mdを貼り付けると、allowed-toolsとdescriptionキーワードからタグを自動生成します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="SKILL.mdの内容を貼り付けてください..."
            className="bg-white/5 border-white/15 text-white placeholder:text-white/30 font-mono text-sm min-h-[160px] resize-none" />
          <Button onClick={() => previewMutation.mutate({ raw })} disabled={previewMutation.isPending || !raw.trim()}
            className="bg-green-600 hover:bg-green-700 text-white gap-2">
            {previewMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
            タグを解析
          </Button>

          {previewResult && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-3">
              <div>
                <p className="text-white font-semibold">{previewResult.name}</p>
                <p className="text-white/60 text-sm mt-0.5">{previewResult.description}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs mb-1.5">自動生成タグ</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewResult.tags.map((t) => <TagBadge key={t} tag={t} />)}
                  {previewResult.tags.length === 0 && <span className="text-white/30 text-sm">タグなし</span>}
                </div>
              </div>
              {previewResult.allowedTools.length > 0 && (
                <div>
                  <p className="text-white/50 text-xs mb-1.5">allowed-tools → タグマッピング</p>
                  <div className="space-y-1">
                    {previewResult.allowedTools.map((tool) => (
                      <div key={tool} className="flex items-center gap-2 text-xs">
                        <span className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/60 font-mono">{tool}</span>
                        {toolTagMap[tool] && <><ArrowRight className="w-3 h-3 text-white/30" /><TagBadge tag={toolTagMap[tool]} /></>}
                        {tool.startsWith("mcp__") && <><ArrowRight className="w-3 h-3 text-white/30" /><TagBadge tag="mcp" /></>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm">タグリファレンス</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(toolTagMap).map(([tool, tag]) => (
              <div key={tool} className="flex items-center gap-2">
                <span className="text-white/40 font-mono w-24 truncate">{tool}</span>
                <ArrowRight className="w-3 h-3 text-white/20 flex-shrink-0" />
                <TagBadge tag={tag} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Single Import Tab (existing functionality) ───────────────────────────────
function SingleImportTab() {
  const utils = trpc.useUtils();
  const [raw, setRaw] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<SkillPreview | null>(null);

  const previewMutation = trpc.claude.previewSkillMd.useMutation({
    onSuccess: (data) => { setPreview(data.preview); setPreviewOpen(true); },
    onError: (err) => toast.error(err.message),
  });

  const importMutation = trpc.claude.importSkillMd.useMutation({
    onSuccess: (data) => {
      setPreviewOpen(false);
      setRaw("");
      utils.skills.list.invalidate();
      toast.success(`"${data.name}" をインポートしました`);
    },
    onError: (err) => toast.error(err.message),
  });

  const previewKey = `${preview?.name ?? ""}|${preview?.description ?? ""}`;
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCat, setEditCat] = useState("general");
  useEffect(() => {
    if (preview) { setEditName(preview.name); setEditDesc(preview.description ?? ""); setEditCat(preview.category ?? "general"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" />SKILL.md 単体インポート
          </CardTitle>
          <CardDescription className="text-white/50 text-sm">
            SKILL.mdの内容を貼り付けてOSMにインポートします。フロントマターを自動解析します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="SKILL.mdの内容を貼り付けてください..."
            className="bg-white/5 border-white/15 text-white placeholder:text-white/30 font-mono text-sm min-h-[200px] resize-none" />
          <Button onClick={() => previewMutation.mutate({ raw })} disabled={previewMutation.isPending || !raw.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            {previewMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            プレビューして確認
          </Button>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={(v) => !v && setPreviewOpen(false)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileCode2 className="w-4 h-4 text-primary" />スキルインポートの確認
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              SKILL.mdから解析した情報を確認・編集してインポートします
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4 py-2">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">スキル名 <span className="text-rose-400">*</span></Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-xs bg-background border-border" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">説明</Label>
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="text-xs bg-background border-border resize-none h-16" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">カテゴリー</Label>
                  <select value={editCat} onChange={(e) => setEditCat(e.target.value)}
                    className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground">
                    {["general", "development", "devops", "writing", "integration", "analysis"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">タグ（検出済み）</Label>
                  <div className="flex flex-wrap gap-1 min-h-8 items-center">
                    {preview.tags.length > 0
                      ? preview.tags.map((t) => <TagBadge key={t} tag={t} />)
                      : <span className="text-xs text-muted-foreground italic">なし</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)} disabled={importMutation.isPending} className="text-xs">キャンセル</Button>
            <Button size="sm" onClick={() => importMutation.mutate({ raw, overrideName: editName, overrideDescription: editDesc, overrideCategory: editCat })}
              disabled={!editName.trim() || importMutation.isPending} className="text-xs gap-1.5">
              {importMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              インポート
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
// ─── Smart Launch Tab ─────────────────────────────────────────────────────────
function SmartLaunchTab() {
  const [keywords, setKeywords] = useState("");
  const [framework, setFramework] = useState("");
  const [language, setLanguage] = useState("");
  const [taskType, setTaskType] = useState<"feature"|"bugfix"|"refactor"|"review"|"test"|"general">("general");
  const [topN, setTopN] = useState(5);
  const [queryEnabled, setQueryEnabled] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const recommendQuery = trpc.claude.recommend.useQuery(
    { keywords: keywords.split(/[,\s]+/).filter(Boolean), framework: framework || undefined, language: language || undefined, taskType, topN },
    { enabled: queryEnabled }
  );

  const skillMdQuery = trpc.claude.generateSkillMd.useQuery(
    { skillId: selectedSkillId! },
    { enabled: !!selectedSkillId }
  );

  const recordUsage = trpc.claude.recordUsage.useMutation({
    onSuccess: () => toast.success("使用結果を記録しました"),
  });

  const handleSearch = () => {
    setQueryEnabled(true);
    recommendQuery.refetch();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("SKILL.mdをクリップボードにコピーしました");
  };

  const taskTypes = [
    { value: "general", label: "一般" },
    { value: "feature", label: "機能開発" },
    { value: "bugfix", label: "バグ修正" },
    { value: "refactor", label: "リファクタリング" },
    { value: "review", label: "コードレビュー" },
    { value: "test", label: "テスト" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-emerald-950/30 border-emerald-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            スマート起動 — プロジェクトに最適なスキルを自動選択
          </CardTitle>
          <CardDescription className="text-white/50 text-xs">
            プロジェクトのキーワード・言語・タスク種別を入力すると、BM25スコアリングで最適なスキルをランク付け、SKILL.mdを生成します。
            生成した SKILL.md を Claude Code の <code className="bg-white/10 px-1 rounded">.claude/skills/</code> に配置することで Agent Team が自動的に活用します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70 text-xs mb-1 block">キーワード (カンマ区切り)</Label>
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="react, typescript, api..."
                className="bg-white/5 border-white/10 text-white text-sm h-8"
              />
            </div>
            <div>
              <Label className="text-white/70 text-xs mb-1 block">言語 / フレームワーク</Label>
              <div className="flex gap-2">
                <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="TypeScript" className="bg-white/5 border-white/10 text-white text-sm h-8" />
                <Input value={framework} onChange={(e) => setFramework(e.target.value)} placeholder="React" className="bg-white/5 border-white/10 text-white text-sm h-8" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-white/70 text-xs">タスク種別:</Label>
            {taskTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTaskType(t.value)}
                className={`px-3 py-1 rounded-full text-xs border transition-all ${
                  taskType === t.value
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                }`}
              >{t.label}</button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Label className="text-white/70 text-xs">Top</Label>
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="bg-white/5 border border-white/10 text-white text-xs rounded px-2 py-1"
              >
                {[3, 5, 10].map((n) => <option key={n} value={n} className="bg-gray-900">{n}</option>)}
              </select>
            </div>
          </div>
          <Button
            onClick={handleSearch}
            disabled={recommendQuery.isFetching}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 w-full"
          >
            {recommendQuery.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            最適スキルを検索
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {recommendQuery.data && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white/70 text-sm">
              {recommendQuery.data.total} 件中上位 <span className="text-emerald-400 font-bold">{recommendQuery.data.results.length}</span> 件を推奨
            </p>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">
              BM25 スコア順
            </Badge>
          </div>
          {recommendQuery.data.results.map((skill, idx) => {
            const tags = (() => { try { return JSON.parse(skill.tags ?? "[]") as string[]; } catch { return []; } })();
            return (
              <Card
                key={skill.id}
                className={`border transition-all cursor-pointer ${
                  selectedSkillId === skill.id
                    ? "bg-emerald-950/40 border-emerald-500/50"
                    : "bg-white/3 border-white/10 hover:border-white/20"
                }`}
                onClick={() => setSelectedSkillId(selectedSkillId === skill.id ? null : skill.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">#{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate">{skill.name}</p>
                        <p className="text-white/50 text-xs truncate">{skill.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-emerald-300 border-emerald-500/30 text-xs">
                        <Star className="w-3 h-3 mr-1" />{skill.relevanceScore}
                      </Badge>
                      <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${selectedSkillId === skill.id ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2 ml-10">
                      {tags.slice(0, 5).map((t) => <TagBadge key={t} tag={t} />)}
                    </div>
                  )}

                  {/* Expanded SKILL.md preview */}
                  {selectedSkillId === skill.id && (
                    <div className="mt-4 ml-10 space-y-3">
                      {skillMdQuery.isLoading ? (
                        <div className="flex items-center gap-2 text-white/50 text-xs"><Loader2 className="w-3 h-3 animate-spin" />SKILL.mdを生成中...</div>
                      ) : skillMdQuery.data ? (
                        <>
                          <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                            <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{skillMdQuery.data.skillMd}</pre>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleCopy(skillMdQuery.data!.skillMd); }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs h-7"
                            >
                              <ClipboardCopy className="w-3 h-3" />SKILL.mdをコピー
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                const blob = new Blob([skillMdQuery.data!.skillMd], { type: "text/markdown" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url; a.download = "SKILL.md"; a.click();
                                URL.revokeObjectURL(url);
                                toast.success("SKILL.mdをダウンロードしました");
                              }}
                              className="border-white/20 text-white/70 hover:text-white gap-2 text-xs h-7"
                            >
                              <Download className="w-3 h-3" />ダウンロード
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                recordUsage.mutate({ skillId: skill.id, taskType, outcome: "success", effectivenessScore: 80 });
                              }}
                              className="border-white/20 text-white/70 hover:text-white gap-2 text-xs h-7 ml-auto"
                            >
                              <CheckCircle2 className="w-3 h-3" />有効だった
                            </Button>
                          </div>
                          <div className="bg-emerald-950/30 rounded p-3 border border-emerald-500/20 text-xs text-white/60">
                            <p className="font-medium text-emerald-400 mb-1">使い方</p>
                            <p>1. 「SKILL.mdをコピー」または「ダウンロード」で内容を取得</p>
                            <p>2. プロジェクトの <code className="bg-white/10 px-1 rounded">.claude/skills/{skill.name.replace(/\s+/g, "-").toLowerCase()}/SKILL.md</code> に配置</p>
                            <p>3. Claude Code でタスクを開始—スキルが自動的に読み込まれます</p>
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {recommendQuery.data?.results.length === 0 && (
        <div className="text-center py-12 text-white/40">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>スコアが上位のスキルが見つかりませんでした。キーワードを変えて再検索してください。</p>
        </div>
      )}
    </div>
  );
}

// ─── MCP Config Tab ───────────────────────────────────────────────────────────
function McpConfigTab() {
  const [serverUrl, setServerUrl] = useState("");
  const [includeApiKey, setIncludeApiKey] = useState(false);
  const [result, setResult] = useState<{ configJson: string; orchestratorSkillMd: string } | null>(null);

  const generateConfig = trpc.claude.generateMcpConfig.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("MCP設定を生成しました");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}をクリップボードにコピーしました`);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-rose-950/20 border-rose-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Settings2 className="w-5 h-5 text-rose-400" />
            MCP設定生成 — OSM を Claude Code の Agent Team に接続
          </CardTitle>
          <CardDescription className="text-white/50 text-xs">
            OSM MCPサーバーを Claude Code に登録するための <code className="bg-white/10 px-1 rounded">~/.claude.json</code> 設定と、
            スキル自動選択を行うオーケストレーター SKILL.md を生成します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white/70 text-xs mb-1 block">OSMインスタンスURL (公開デプロイ後のURL)</Label>
            <Input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://your-osm.manus.space"
              className="bg-white/5 border-white/10 text-white text-sm h-8"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeApiKey}
              onChange={(e) => setIncludeApiKey(e.target.checked)}
              className="rounded"
            />
            <span className="text-white/70 text-xs">APIキープレースホルダーを含める</span>
          </label>
          <Button
            onClick={() => generateConfig.mutate({ serverUrl: serverUrl || undefined, includeApiKey })}
            disabled={generateConfig.isPending}
            className="bg-rose-600 hover:bg-rose-500 text-white gap-2 w-full"
          >
            {generateConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
            MCP設定を生成
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {/* ~/.claude.json snippet */}
          <Card className="bg-white/3 border-white/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-rose-400" />
                  ~/.claude.json に追加する設定
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => handleCopy(result.configJson, "MCP設定")} className="border-white/20 text-white/70 hover:text-white gap-1 text-xs h-7">
                  <ClipboardCopy className="w-3 h-3" />コピー
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-white/80 bg-black/30 rounded p-3 overflow-x-auto font-mono">{result.configJson}</pre>
            </CardContent>
          </Card>

          {/* Orchestrator SKILL.md */}
          <Card className="bg-white/3 border-white/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  オーケストレーター SKILL.md
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleCopy(result.orchestratorSkillMd, "SKILL.md")} className="border-white/20 text-white/70 hover:text-white gap-1 text-xs h-7">
                    <ClipboardCopy className="w-3 h-3" />コピー
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const blob = new Blob([result.orchestratorSkillMd], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "SKILL.md"; a.click();
                    URL.revokeObjectURL(url);
                    toast.success("SKILL.mdをダウンロードしました");
                  }} className="border-white/20 text-white/70 hover:text-white gap-1 text-xs h-7">
                    <Download className="w-3 h-3" />ダウンロード
                  </Button>
                </div>
              </div>
              <CardDescription className="text-white/40 text-xs mt-1">
                .claude/skills/auto-skill-team/SKILL.md に配置することで、Claude Code がタスク開始時に自動的にスキルを選択・注入します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-white/80 bg-black/30 rounded p-3 overflow-x-auto font-mono max-h-80 overflow-y-auto">{result.orchestratorSkillMd}</pre>
            </CardContent>
          </Card>

          {/* Setup guide */}
          <Card className="bg-emerald-950/20 border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                セットアップ手順
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-white/60">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">1</span>
                <div>
                  <p className="text-white/80 font-medium">設定を ~/.claude.json にマージ</p>
                  <code className="bg-black/30 px-2 py-0.5 rounded block mt-1">{'cat ~/.claude.json | jq \'. * {"mcpServers": .mcpServers}\' > /tmp/merged.json && mv /tmp/merged.json ~/.claude.json'}</code>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">2</span>
                <div>
                  <p className="text-white/80 font-medium">オーケストレーター SKILL.md を配置</p>
                  <code className="bg-black/30 px-2 py-0.5 rounded block mt-1">mkdir -p .claude/skills/auto-skill-team && cp SKILL.md .claude/skills/auto-skill-team/</code>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">3</span>
                <div>
                  <p className="text-white/80 font-medium">Claude Code でタスクを開始</p>
                  <code className="bg-black/30 px-2 py-0.5 rounded block mt-1">claude "/auto-skill-team feature: ユーザー認証機能を実装"</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function ClaudeIntegration() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            Claude Code 連携
          </h1>
          <p className="text-white/50 text-sm mt-1">
            GitHubからスキルを取得、AIでマージ、差分インポートで品質を継続的に向上させます
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Github, label: "GitHub取得", desc: "公開リポジトリからSKILL.mdを自動検出", color: "from-purple-500/20 to-indigo-500/20 border-purple-500/30" },
            { icon: Wand2, label: "AIマージ", desc: "複数スキルをLLMで統合・品質向上", color: "from-amber-500/20 to-orange-500/20 border-amber-500/30" },
            { icon: GitMerge, label: "差分インポート", desc: "バージョン履歴を保持して更新", color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30" },
            { icon: Tag, label: "自動タグ付け", desc: "allowed-toolsからタグを自動生成", color: "from-green-500/20 to-teal-500/20 border-green-500/30" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className={`rounded-xl border bg-gradient-to-br p-4 ${color}`}>
              <Icon className="w-5 h-5 text-white/80 mb-2" />
              <p className="text-white font-medium text-sm">{label}</p>
              <p className="text-white/50 text-xs mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="github" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="github" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-white/60 gap-2 text-xs">
              <Github className="w-3.5 h-3.5" />GitHub取得
            </TabsTrigger>
            <TabsTrigger value="merge" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-white/60 gap-2 text-xs">
              <Wand2 className="w-3.5 h-3.5" />AIマージ
            </TabsTrigger>
            <TabsTrigger value="diff" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/60 gap-2 text-xs">
              <GitMerge className="w-3.5 h-3.5" />差分インポート
            </TabsTrigger>
            <TabsTrigger value="tags" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-white/60 gap-2 text-xs">
              <Tag className="w-3.5 h-3.5" />自動タグ付け
            </TabsTrigger>
            <TabsTrigger value="single" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-white/60 gap-2 text-xs">
              <Upload className="w-3.5 h-3.5" />単体インポート
            </TabsTrigger>
            <TabsTrigger value="smart" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-white/60 gap-2 text-xs">
              <Sparkles className="w-3.5 h-3.5" />スマート起動
            </TabsTrigger>
            <TabsTrigger value="mcp" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white text-white/60 gap-2 text-xs">
              <Settings2 className="w-3.5 h-3.5" />MCP設定
            </TabsTrigger>
          </TabsList>

          <TabsContent value="github"><GithubFetchTab /></TabsContent>
          <TabsContent value="merge"><AIMergeTab /></TabsContent>
          <TabsContent value="diff"><DiffImportTab /></TabsContent>
          <TabsContent value="tags"><AutoTagTab /></TabsContent>
          <TabsContent value="single"><SingleImportTab /></TabsContent>
          <TabsContent value="smart"><SmartLaunchTab /></TabsContent>
          <TabsContent value="mcp"><McpConfigTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
