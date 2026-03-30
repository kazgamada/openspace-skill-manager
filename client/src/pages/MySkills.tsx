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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity, AlertTriangle, Brain, CheckCircle2, Clock, Eye, GitBranch,
  Globe, Lock, MoreHorizontal, Plus, RefreshCw, Search, Trash2, Wrench,
  XCircle, Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

const CATEGORIES = ["general", "development", "devops", "writing", "integration", "analysis", "web", "search", "data", "auth", "ai", "util", "other"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function statusBg(s: string) {
  if (s === "healthy") return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
  if (s === "warning") return "bg-amber-500/10 border-amber-500/30 text-amber-400";
  return "bg-red-500/10 border-red-500/30 text-red-400";
}
function StatusIcon({ s }: { s: string }) {
  if (s === "healthy") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (s === "warning") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

// ─── Create Skill Dialog ──────────────────────────────────────────────────────
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
        <Button size="sm" className="gap-1.5 text-xs">
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
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="スキルの説明を入力..." className="bg-input border-border text-sm resize-none" rows={2} />
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
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="## Instructions&#10;スキルの指示内容を記述..." className="bg-input border-border text-sm font-mono resize-none" rows={4} />
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

// ─── Skills List Tab ─────────────────────────────────────────────
function SkillsListTab() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const skillsQuery = trpc.skills.list.useQuery();
  const deleteMutation = trpc.skills.delete.useMutation({
    onSuccess: () => { toast.success("スキルを削除しました"); utils.skills.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const uploadMutation = trpc.skills.upload.useMutation({
    onSuccess: () => { toast.success("スキルをコミュニティに公開しました"); utils.skills.list.invalidate(); utils.community.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const skills = skillsQuery.data ?? [];
  const filtered = skills.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="スキルを検索..." className="pl-9 bg-input border-border" />
        </div>
        <CreateSkillDialog onCreated={() => utils.skills.list.invalidate()} />
      </div>

      {skillsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 rounded-xl shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">スキルがありません</p>
          <p className="text-xs text-muted-foreground/60 mt-1 mb-4">最初のスキルを作成してみましょう</p>
          <CreateSkillDialog onCreated={() => utils.skills.list.invalidate()} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((skill) => {
            const tags: string[] = skill.tags ? (() => { try { return JSON.parse(skill.tags); } catch { return []; } })() : [];
            return (
              <Card key={skill.id} className="bg-card border-border card-hover cursor-pointer group" onClick={() => setLocation(`/skills/${skill.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{skill.name}</p>
                        {skill.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5">{skill.category}</Badge>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setLocation(`/skills/${skill.id}`)}>
                          <Eye className="mr-2 h-3.5 w-3.5" />詳細を見る
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocation(`/genealogy/${skill.id}`)}>
                          <GitBranch className="mr-2 h-3.5 w-3.5" />系譜を見る
                        </DropdownMenuItem>
                        {!skill.isPublic && (
                          <DropdownMenuItem
                            onClick={() => { if (confirm(`「${skill.name}」をコミュニティに公開しますか？`)) uploadMutation.mutate({ skillId: skill.id }); }}
                            disabled={uploadMutation.isPending}
                          >
                            <Globe className="mr-2 h-3.5 w-3.5" />スキル広場に公開
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { if (confirm(`「${skill.name}」を削除しますか？`)) deleteMutation.mutate({ id: skill.id }); }} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-3.5 w-3.5" />削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{skill.description ?? "説明なし"}</p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tags.slice(0, 3).map((tag) => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">#{tag}</span>)}
                      {tags.length > 3 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">+{tags.length - 3}</span>}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {skill.isPublic ? <><Globe className="w-3 h-3" />公開</> : <><Lock className="w-3 h-3" />非公開</>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(skill.updatedAt), { addSuffix: true, locale: ja })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Health Monitor Tab ───────────────────────────────────────────────────────
function HealthMonitorTab() {
  const { data: healthList = [], isLoading, refetch } = trpc.health.list.useQuery();
  const triggerRepair = trpc.health.triggerRepair.useMutation({
    onSuccess: () => { toast.success("修復バージョンを作成しました"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  type HealthEntry = { skillId: string; skillName: string; successRate: number; qualityScore: number; totalExecutions: number; lastExecutedAt: Date | null; status: string; };
  const list = healthList as HealthEntry[];
  const healthy = list.filter((h) => h.status === "healthy").length;
  const warning = list.filter((h) => h.status === "warning").length;
  const critical = list.filter((h) => h.status === "critical").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "正常", value: healthy, cls: "bg-emerald-500/10 border-emerald-500/20", textCls: "text-emerald-400" },
          { label: "警告", value: warning, cls: "bg-amber-500/10 border-amber-500/20", textCls: "text-amber-400" },
          { label: "危険", value: critical, cls: "bg-red-500/10 border-red-500/20", textCls: "text-red-400" },
        ].map((item) => (
          <Card key={item.label} className={`border ${item.cls}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${item.textCls}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl shimmer" />)}</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">ヘルスデータがありません</p>
          <p className="text-xs text-muted-foreground/60 mt-1">スキルを実行するとここに表示されます</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((h) => (
            <Card key={h.skillId} className="hover:border-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5"><StatusIcon s={h.status} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{h.skillName}</p>
                        <Badge className={`text-[10px] px-1.5 py-0 border ${statusBg(h.status)}`}>
                          {h.status === "healthy" ? "正常" : h.status === "warning" ? "警告" : "危険"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">成功率</p>
                          <div className="flex items-center gap-2">
                            <Progress value={h.successRate} className="h-1.5 flex-1" />
                            <span className="text-xs font-medium w-8 text-right">{h.successRate}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">品質スコア</p>
                          <div className="flex items-center gap-2">
                            <Progress value={h.qualityScore} className="h-1.5 flex-1" />
                            <span className="text-xs font-medium w-8 text-right">{h.qualityScore}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Zap className="w-3 h-3" />{h.totalExecutions}回実行
                        </span>
                        {h.lastExecutedAt && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />{new Date(h.lastExecutedAt).toLocaleString("ja-JP")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {(h.status === "warning" || h.status === "critical") && (
                    <Button
                      size="sm" variant="outline"
                      className="shrink-0 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => triggerRepair.mutate({ skillId: h.skillId, triggerType: "degradation" })}
                      disabled={triggerRepair.isPending}
                    >
                      {triggerRepair.isPending ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Wrench className="w-3 h-3 mr-1" />}
                      修復
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MySkills() {
  const { data: skills = [] } = trpc.skills.list.useQuery();
  const { data: healthList = [] } = trpc.health.list.useQuery();
  type HealthEntry = { status: string; qualityScore: number };
  const list = healthList as HealthEntry[];
  const critical = list.filter((h) => h.status === "critical").length;
  const warning = list.filter((h) => h.status === "warning").length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />マイスキル
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">スキルの管理とヘルス監視</p>
          </div>
          <div className="flex items-center gap-2">
            {critical > 0 && (
              <Badge className="bg-red-500/10 border-red-500/30 text-red-400 border text-xs">
                <XCircle className="w-3 h-3 mr-1" />{critical}件危険
              </Badge>
            )}
            {warning > 0 && (
              <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 border text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />{warning}件警告
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="skills">
          <TabsList className="w-full max-w-sm">
            <TabsTrigger value="skills" className="flex-1 flex items-center gap-2">
              <Brain className="w-4 h-4" />スキル一覧
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{skills.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex-1 flex items-center gap-2">
              <Activity className="w-4 h-4" />ヘルスモニター
              {(critical + warning) > 0 && (
                <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30 border">
                  {critical + warning}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="skills" className="mt-4"><SkillsListTab /></TabsContent>
          <TabsContent value="health" className="mt-4"><HealthMonitorTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
