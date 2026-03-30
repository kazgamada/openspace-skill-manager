import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Brain,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  GitBranch,
  Trash2,
  Globe,
  Lock,
  Activity,
  Clock,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

const CATEGORIES = ["web", "search", "data", "auth", "ai", "util", "other"];

function CategoryBadge({ category }: { category: string | null }) {
  const colors: Record<string, string> = {
    web: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    search: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    data: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    auth: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    ai: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    util: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    other: "bg-muted text-muted-foreground border-border",
  };
  const cls = colors[category ?? "other"] ?? colors.other;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {category ?? "other"}
    </span>
  );
}

function CreateSkillDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("web");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const createMutation = trpc.skills.create.useMutation({
    onSuccess: () => {
      toast.success("スキルを作成しました");
      setOpen(false);
      setName(""); setDescription(""); setTags("");
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          新規スキル
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            新しいスキルを作成
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">スキル名 *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: web-scraper"
              className="bg-input border-border text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="スキルの説明を入力..."
              className="bg-input border-border text-sm resize-none"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">カテゴリ</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">タグ (カンマ区切り)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2"
                className="bg-input border-border text-sm"
              />
            </div>
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
            onClick={() =>
              createMutation.mutate({
                name,
                description,
                category,
                tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
                isPublic,
              })
            }
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "作成中..." : "スキルを作成"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MySkills() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const skillsQuery = trpc.skills.list.useQuery();
  const deleteMutation = trpc.skills.delete.useMutation({
    onSuccess: () => {
      toast.success("スキルを削除しました");
      utils.skills.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const skills = skillsQuery.data ?? [];
  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">マイスキル</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {skills.length} 件のスキルを管理中
            </p>
          </div>
          <CreateSkillDialog onCreated={() => utils.skills.list.invalidate()} />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="スキルを検索..."
            className="pl-9 bg-input border-border"
          />
        </div>

        {/* Skills Grid */}
        {skillsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">スキルがありません</p>
            <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
              最初のスキルを作成してみましょう
            </p>
            <CreateSkillDialog onCreated={() => utils.skills.list.invalidate()} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((skill) => {
              const tags: string[] = skill.tags ? JSON.parse(skill.tags) : [];
              return (
                <Card
                  key={skill.id}
                  className="bg-card border-border card-hover cursor-pointer group"
                  onClick={() => setLocation(`/skills/${skill.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{skill.name}</p>
                          <CategoryBadge category={skill.category} />
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
                            <Eye className="mr-2 h-3.5 w-3.5" /> 詳細を見る
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation(`/genealogy/${skill.id}`)}>
                            <GitBranch className="mr-2 h-3.5 w-3.5" /> 系譜を見る
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm(`「${skill.name}」を削除しますか？`)) {
                                deleteMutation.mutate({ id: skill.id });
                              }
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> 削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {skill.description ?? "説明なし"}
                    </p>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                        {tags.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                            +{tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {skill.isPublic ? (
                          <><Globe className="w-3 h-3" /> 公開</>
                        ) : (
                          <><Lock className="w-3 h-3" /> 非公開</>
                        )}
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
    </DashboardLayout>
  );
}
