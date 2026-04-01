/**
 * MySkills.tsx — v4設計
 * 左2/3: スキル一覧（検索・フィルター・バッジ表示）
 * 右1/3: 系譜グラフ（選択中スキルの進化DAG）+ ヘルス情報インライン表示
 */
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity, Brain, Clock, ExternalLink, Eye, GitBranch,
  Globe, Lock, MoreHorizontal, Plus, RefreshCw, Search, Trash2, Wrench,
  Zap, ZoomIn, ZoomOut, Maximize2, Info,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ViewToggle, useViewMode, type ViewMode } from "@/components/ViewToggle";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import cytoscape from "cytoscape";

const CATEGORIES = ["general", "development", "devops", "writing", "integration", "analysis", "web", "search", "data", "auth", "ai", "util", "other"];

function statusBg(s: string) {
  if (s === "healthy") return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
  if (s === "warning") return "bg-amber-500/10 border-amber-500/30 text-amber-400";
  return "bg-red-500/10 border-red-500/30 text-red-400";
}

function SkillStatusBadge({ badge }: { badge?: string | null }) {
  if (!badge) return null;
  const map: Record<string, { label: string; cls: string }> = {
    new:      { label: "新規",   cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
    repaired: { label: "修復済", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    derived:  { label: "派生",   cls: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  };
  const info = map[badge];
  if (!info) return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${info.cls}`}>
      {info.label}
    </span>
  );
}

function CreateSkillDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const createMutation = trpc.skills.create.useMutation({
    onSuccess: () => {
      toast.success("スキルを作成しました");
      setOpen(false);
      setName(""); setDescription(""); setTags(""); setContent("");
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs shrink-0">
          <Plus className="w-3.5 h-3.5" />新規スキル
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />新しいスキルを作成
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">スキル名 *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: code-reviewer" className="bg-input border-border text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">説明</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="スキルの概要" className="bg-input border-border text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">カテゴリ</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">タグ (カンマ区切り)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" className="bg-input border-border text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SKILL.md コンテンツ</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="## Instructions" className="bg-input border-border text-sm font-mono resize-none" rows={4} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div>
              <p className="text-xs font-medium">公開スキル</p>
              <p className="text-[10px] text-muted-foreground">スキル広場に公開します</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <Button
            className="w-full"
            onClick={() => {
              const tagList = tags ? tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0) : [];
              createMutation.mutate({ name, description, category, tags: tagList, isPublic });
            }}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "作成中..." : "スキルを作成"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MySkillsGrid({ children, viewMode }: { children: React.ReactNode; viewMode: ViewMode }) {
  if (viewMode === "list-lg" || viewMode === "list-sm") return <div className="flex flex-col gap-2">{children}</div>;
  if (viewMode === "tile-sm") return <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{children}</div>;
  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{children}</div>;
}

interface SkillItem {
  id: string; name: string; description: string | null; category: string | null;
  tags: string | null; isPublic: boolean; updatedAt: Date; createdAt?: Date | null;
  sourceRepo?: string | null; badge?: string | null;
  qualityScore?: number | null;
}

// ─── スコアバー共通コンポーネント ──────────────────────────
function ScoreTooltipContent({ score }: { score: number }) {
  const status = score >= 80 ? { label: "Healthy", cls: "text-emerald-400" }
    : score >= 60 ? { label: "Warning", cls: "text-amber-400" }
    : score > 0  ? { label: "Critical", cls: "text-rose-400" }
    : { label: "未計測", cls: "text-muted-foreground" };

  return (
    <div className="w-56 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground">品質スコア: <span className={status.cls}>{score.toFixed(0)}pt</span></span>
        <span className={`text-[10px] font-medium ${status.cls}`}>{status.label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={`h-full rounded-full ${
            score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-amber-400" : score > 0 ? "bg-rose-400" : "bg-muted/40"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="border-t border-border/50 pt-1.5 space-y-1">
        <p className="text-[10px] text-muted-foreground font-medium mb-1">スコアの算出方法</p>
        <div className="text-[10px] text-muted-foreground space-y-1">
          <p>· <span className="text-foreground/80">クロール取得時</span>: クロールランク × 5（上限100）</p>
          <p className="text-[9px] text-muted-foreground/70 pl-2 leading-relaxed">ランク = ln(stars+1)×3 + ln(forks+1)×1.5 + freshness×2<br/>└ freshness: 30日以内=1.0 / 90日=0.7 / 1年=0.3 / 1年超=0.1</p>
          <p>· <span className="text-foreground/80">手動修復時</span>: 現在値 +5pt（自動修復は +10pt）</p>
          <p>· <span className="text-foreground/80">進化提案適用時</span>: LLM評価に基づく進化スコアを設定</p>
          <p>· <span className="text-foreground/80">手動登録時</span>: 初期値 50pt</p>
        </div>
      </div>
      <div className="border-t border-border/50 pt-1.5">
        <p className="text-[10px] text-muted-foreground">判定基準: 80+ Healthy · 60–79 Warning · 1–59 Critical</p>
      </div>
    </div>
  );
}

function SkillScoreBar({ score, compact = false }: { score?: number | null; compact?: boolean }) {
  const val = score ?? 0;
  const hasScore = score !== null && score !== undefined && score > 0;
  const color = val >= 80 ? "bg-emerald-400" : val >= 60 ? "bg-amber-400" : val > 0 ? "bg-rose-400" : "bg-muted/40";
  const bar = compact ? (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${val}%` }} />
      </div>
      <span className="text-[9px] font-mono text-muted-foreground w-5 text-right shrink-0">{hasScore ? val.toFixed(0) : "–"}</span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${val}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-7 text-right shrink-0">{hasScore ? `${val.toFixed(0)}` : "–"}</span>
    </div>
  );
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help w-full">{bar}</div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-popover border border-border shadow-lg p-3">
          <ScoreTooltipContent score={val} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MySkillCard({
  skill, tags, viewMode, isSelected, onSelect, onNavigate, onUpload, onDelete, uploadPending, deletePending,
}: {
  skill: SkillItem; tags: string[]; viewMode: ViewMode; isSelected: boolean;
  onSelect: (id: string) => void; onNavigate: (path: string) => void;
  onUpload: (id: string) => void; onDelete: (id: string) => void;
  uploadPending: boolean; deletePending: boolean;
}) {
  const shortDesc = skill.description ? (skill.description.length > 50 ? skill.description.slice(0, 48) + "…" : skill.description) : "説明なし";
  const isNew = skill.createdAt ? (Date.now() - new Date(skill.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000 : false;
  const sourceLink = skill.sourceRepo ?? null;
  const sel = isSelected ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30" : "border-border";

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onNavigate(`/skills/${skill.id}`)}><Eye className="mr-2 h-3.5 w-3.5" />詳細を見る</DropdownMenuItem>
        {!skill.isPublic && (
          <DropdownMenuItem onClick={() => onUpload(skill.id)} disabled={uploadPending}><Globe className="mr-2 h-3.5 w-3.5" />スキル広場に公開</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onDelete(skill.id)} disabled={deletePending} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-3.5 w-3.5" />削除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (viewMode === "list-sm") {
    return (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${sel} bg-card hover:bg-muted/20 transition-colors cursor-pointer group`} onClick={() => onSelect(skill.id)}>
        <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"><Zap className="w-3 h-3 text-primary" /></div>
        <span className="text-xs font-medium truncate flex-1">{skill.name}</span>
        <div className="w-20 shrink-0"><SkillScoreBar score={skill.qualityScore} compact /></div>
        {isNew && !skill.badge && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 h-4 px-1.5 shrink-0">NEW</Badge>}
        <SkillStatusBadge badge={skill.badge} />
        {menu}
      </div>
    );
  }

  if (viewMode === "list-lg") {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${sel} bg-card hover:bg-muted/20 transition-colors cursor-pointer group`} onClick={() => onSelect(skill.id)}>
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-primary" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-sm font-semibold truncate">{skill.name}</p>
            {isNew && !skill.badge && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 h-4 px-1.5">NEW</Badge>}
            <SkillStatusBadge badge={skill.badge} />
            {skill.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{skill.category}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{shortDesc}</p>
        </div>
        <div className="w-24 shrink-0"><SkillScoreBar score={skill.qualityScore} /></div>
        <div className="flex items-center gap-2 shrink-0 text-[10px] text-muted-foreground">
          {skill.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          <Clock className="w-3 h-3" />{formatDistanceToNow(new Date(skill.updatedAt), { addSuffix: true, locale: ja })}
        </div>
        {menu}
      </div>
    );
  }

  if (viewMode === "tile-sm") {
    return (
      <div className={`rounded-xl border ${sel} bg-card hover:bg-muted/10 transition-colors cursor-pointer group p-3`} onClick={() => onSelect(skill.id)}>
        <div className="flex items-center justify-between mb-2">
          <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-primary" /></div>
          {menu}
        </div>
        <p className="text-xs font-semibold truncate mb-1">{skill.name}</p>
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          {isNew && !skill.badge && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 h-4 px-1">NEW</Badge>}
          <SkillStatusBadge badge={skill.badge} />
        </div>
        <SkillScoreBar score={skill.qualityScore} compact />
        <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(skill.updatedAt), { addSuffix: true, locale: ja })}</p>
      </div>
    );
  }

  return (
    <Card className={`border ${sel} card-hover cursor-pointer group`} onClick={() => onSelect(skill.id)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-primary" /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold truncate">{skill.name}</p>
                {isNew && !skill.badge && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 h-4 px-1.5">NEW</Badge>}
                <SkillStatusBadge badge={skill.badge} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {skill.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{skill.category}</Badge>}
                {sourceLink && (
                  <a href={sourceLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-400/70 hover:text-blue-400 flex items-center gap-0.5 transition-colors">
                    <ExternalLink className="w-2.5 h-2.5" />元リポ
                  </a>
                )}
              </div>
            </div>
          </div>
          {menu}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{shortDesc}</p>
        <div className="mb-2"><SkillScoreBar score={skill.qualityScore} /></div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 3).map((tag) => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">#{tag}</span>)}
            {tags.length > 3 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">+{tags.length - 3}</span>}
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">{skill.isPublic ? <><Globe className="w-3 h-3" />公開</> : <><Lock className="w-3 h-3" />非公開</>}</div>
          <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(skill.updatedAt), { addSuffix: true, locale: ja })}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const EVO_COLORS: Record<string, string> = { create: "#22d3ee", fix: "#60a5fa", derive: "#c084fc", capture: "#4ade80" };

function GenealogyPanel({ skillId }: { skillId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<{
    label: string; evolutionType: string; qualityScore: number | null; changeLog: string | null; createdAt: Date;
  } | null>(null);
  const genealogyQuery = trpc.skills.genealogy.useQuery({ skillId }, { enabled: !!skillId });
  const genealogy = genealogyQuery.data;

  useEffect(() => {
    if (!containerRef.current || !genealogy || genealogy.nodes.length === 0) return;
    if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }
    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...genealogy.nodes.map((n) => ({ data: { id: n.id, label: n.label, evolutionType: n.evolutionType, qualityScore: n.qualityScore ?? 0, changeLog: n.changeLog, createdAt: n.createdAt } })),
        ...genealogy.edges.map((e, i) => ({ data: { id: `e${i}`, source: e.source, target: e.target, label: e.label } })),
      ],
      style: [
        { selector: "node", style: { "background-color": (ele: cytoscape.NodeSingular) => EVO_COLORS[ele.data("evolutionType")] ?? "#6366f1", "border-width": 2, "border-color": (ele: cytoscape.NodeSingular) => EVO_COLORS[ele.data("evolutionType")] ?? "#6366f1", "border-opacity": 0.8, "width": 40, "height": 40, "label": "data(label)", "color": "#e2e8f0", "font-size": 9, "font-family": "Inter, sans-serif", "text-valign": "bottom", "text-halign": "center", "text-margin-y": 4, "background-opacity": 0.25 } },
        { selector: "edge", style: { "width": 1.5, "line-color": "#374151", "target-arrow-color": "#374151", "target-arrow-shape": "triangle", "curve-style": "bezier", "label": "data(label)", "font-size": 8, "color": "#6b7280" } },
        { selector: "node:selected", style: { "border-width": 3, "border-opacity": 1, "background-opacity": 0.5 } },
      ],
      layout: { name: "breadthfirst", directed: true, padding: 20, spacingFactor: 1.2 } as cytoscape.LayoutOptions,
    });
    cy.on("tap", "node", (evt) => {
      const d = evt.target.data();
      setSelectedNode({ label: d.label, evolutionType: d.evolutionType, qualityScore: d.qualityScore, changeLog: d.changeLog, createdAt: d.createdAt });
    });
    cy.on("tap", (evt) => { if (evt.target === cy) setSelectedNode(null); });
    cyRef.current = cy;
    return () => { cy.destroy(); cyRef.current = null; };
  }, [genealogy]);

  const zoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  const zoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const fit = () => cyRef.current?.fit(undefined, 20);

  if (genealogyQuery.isLoading) return <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!genealogy || genealogy.nodes.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <Info className="w-8 h-8 text-muted-foreground/30 mb-2" />
      <p className="text-xs text-muted-foreground">バージョン履歴なし</p>
      <p className="text-[10px] text-muted-foreground/60 mt-1">スキルを修復・派生すると系譜が表示されます</p>
    </div>
  );

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <Button variant="outline" size="icon" className="h-6 w-6 bg-card/80 backdrop-blur" onClick={zoomIn}><ZoomIn className="w-3 h-3" /></Button>
        <Button variant="outline" size="icon" className="h-6 w-6 bg-card/80 backdrop-blur" onClick={zoomOut}><ZoomOut className="w-3 h-3" /></Button>
        <Button variant="outline" size="icon" className="h-6 w-6 bg-card/80 backdrop-blur" onClick={fit}><Maximize2 className="w-3 h-3" /></Button>
      </div>
      <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card/80 backdrop-blur border border-border">
        {Object.entries(EVO_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, opacity: 0.8 }} />
            <span className="text-[9px] text-muted-foreground">{type === "create" ? "作成" : type === "fix" ? "修復" : type === "derive" ? "派生" : "取込"}</span>
          </div>
        ))}
      </div>
      {selectedNode && (
        <div className="absolute top-2 left-2 w-44 bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold">{selectedNode.label}</span>
            <button className="text-muted-foreground hover:text-foreground text-xs" onClick={() => setSelectedNode(null)}>×</button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground">タイプ:</span>
              <span className="text-[9px] font-medium" style={{ color: EVO_COLORS[selectedNode.evolutionType] ?? "#6366f1" }}>
                {selectedNode.evolutionType === "fix" ? "修復" : selectedNode.evolutionType === "derive" ? "派生" : selectedNode.evolutionType === "capture" ? "取込" : "作成"}
              </span>
            </div>
            {selectedNode.qualityScore !== null && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-muted-foreground">品質</span>
                  <span className="text-[9px] font-mono">{(selectedNode.qualityScore ?? 0).toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${(selectedNode.qualityScore ?? 0) >= 80 ? "bg-emerald-400" : (selectedNode.qualityScore ?? 0) >= 60 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${selectedNode.qualityScore ?? 0}%` }} />
                </div>
              </div>
            )}
            {selectedNode.changeLog && <p className="text-[9px] text-muted-foreground line-clamp-2">{selectedNode.changeLog}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthInfoPanel({ skillId }: { skillId: string }) {
  const { data: healthList = [] } = trpc.health.list.useQuery();
  const triggerRepair = trpc.health.triggerRepair.useMutation({
    onSuccess: () => toast.success("修復をトリガーしました"),
    onError: (e) => toast.error(e.message),
  });
  type HealthEntry = { skillId: string; skillName: string; status: string; qualityScore: number; successRate: number; totalExecutions: number; lastExecutedAt: Date | null };
  const health = (healthList as HealthEntry[]).find((h) => h.skillId === skillId);
  if (!health) return <div className="px-4 py-3 border-t border-border shrink-0"><p className="text-[10px] text-muted-foreground">ヘルスデータなし</p></div>;
  return (
    <div className="px-4 py-3 border-t border-border space-y-2 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] font-medium">ヘルス</span></div>
        <Badge className={`text-[9px] px-1.5 py-0 border ${statusBg(health.status)}`}>{health.status === "healthy" ? "正常" : health.status === "warning" ? "警告" : "危険"}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[9px] text-muted-foreground mb-0.5">品質スコア</p>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${health.qualityScore >= 80 ? "bg-emerald-400" : health.qualityScore >= 60 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${health.qualityScore}%` }} />
            </div>
            <span className="text-[9px] font-mono">{health.qualityScore}</span>
          </div>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground mb-0.5">成功率</p>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-blue-400" style={{ width: `${health.successRate}%` }} /></div>
            <span className="text-[9px] font-mono">{health.successRate}%</span>
          </div>
        </div>
      </div>
      {(health.status === "warning" || health.status === "critical") && (
        <Button size="sm" variant="outline" className="w-full h-7 text-[10px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => triggerRepair.mutate({ skillId: health.skillId, triggerType: "degradation" })} disabled={triggerRepair.isPending}>
          {triggerRepair.isPending ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Wrench className="w-3 h-3 mr-1" />}修復をトリガー
        </Button>
      )}
    </div>
  );
}

function RightPanel({ selectedSkillId, selectedSkill }: { selectedSkillId: string | null; selectedSkill: SkillItem | null }) {
  const [, setLocation] = useLocation();
  if (!selectedSkillId || !selectedSkill) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"><GitBranch className="w-7 h-7 text-muted-foreground/40" /></div>
        <p className="text-sm text-muted-foreground">スキルを選択</p>
        <p className="text-xs text-muted-foreground/60 mt-1">左のリストからスキルを選択すると系譜グラフが表示されます</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold truncate">{selectedSkill.name}</p>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary hover:text-primary shrink-0" onClick={() => setLocation(`/skills/${selectedSkillId}`)}>詳細 →</Button>
        </div>
        {selectedSkill.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{selectedSkill.category}</Badge>}
      </div>
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0"><GenealogyPanel skillId={selectedSkillId} /></div>
      </div>
      <HealthInfoPanel skillId={selectedSkillId} />
    </div>
  );
}

export default function MySkills() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useViewMode("myskills-view-mode", "tile-lg");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const skillsQuery = trpc.skills.list.useQuery();
  const deleteMutation = trpc.skills.delete.useMutation({
    onSuccess: () => { toast.success("スキルを削除しました"); utils.skills.list.invalidate(); setSelectedSkillId(null); },
    onError: (e) => toast.error(e.message),
  });
  const uploadMutation = trpc.skills.upload.useMutation({
    onSuccess: () => { toast.success("スキル広場に公開しました"); utils.skills.list.invalidate(); utils.community.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const skills = skillsQuery.data ?? [];
  const filtered = skills.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.description ?? "").toLowerCase().includes(search.toLowerCase()));
  const selectedSkill = selectedSkillId ? (skills.find((s) => s.id === selectedSkillId) ?? null) : null;

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="flex flex-col flex-1 min-w-0 border-r border-border">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2"><Brain className="w-5 h-5 text-primary" />マイスキル</h1>
              <p className="text-xs text-muted-foreground mt-0.5">スキルの管理と系譜の可視化</p>
            </div>
            <Badge variant="secondary" className="text-xs">{skills.length}件</Badge>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="スキルを検索..." className="pl-8 h-8 bg-input border-border text-sm" />
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
            <CreateSkillDialog onCreated={() => utils.skills.list.invalidate()} />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {skillsQuery.isLoading ? (
              <MySkillsGrid viewMode={viewMode}>
                {[...Array(6)].map((_, i) => <div key={i} className={`rounded-xl shimmer ${viewMode === "list-sm" ? "h-10" : viewMode === "tile-sm" ? "h-28" : "h-36"}`} />)}
              </MySkillsGrid>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"><Brain className="w-7 h-7 text-muted-foreground/40" /></div>
                <p className="text-sm text-muted-foreground">スキルがありません</p>
                <p className="text-xs text-muted-foreground/60 mt-1">「新規スキル」ボタンから作成してください</p>
              </div>
            ) : (
              <MySkillsGrid viewMode={viewMode}>
                {filtered.map((skill) => {
                  const tags: string[] = skill.tags ? (() => { try { return JSON.parse(skill.tags); } catch { return []; } })() : [];
                  return (
                    <MySkillCard key={skill.id} skill={skill} tags={tags} viewMode={viewMode} isSelected={selectedSkillId === skill.id}
                      onSelect={(id) => setSelectedSkillId(selectedSkillId === id ? null : id)}
                      onNavigate={setLocation}
                      onUpload={(id) => uploadMutation.mutate({ skillId: id })}
                      onDelete={(id) => deleteMutation.mutate({ id })}
                      uploadPending={uploadMutation.isPending} deletePending={deleteMutation.isPending}
                    />
                  );
                })}
              </MySkillsGrid>
            )}
          </div>
        </div>
        <div className="w-80 xl:w-96 shrink-0 flex flex-col bg-card/30">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
            <GitBranch className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">系譜グラフ</span>
            {selectedSkill && <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">{selectedSkill.name}</Badge>}
          </div>
          <div className="flex-1 min-h-0">
            <RightPanel selectedSkillId={selectedSkillId} selectedSkill={selectedSkill} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
