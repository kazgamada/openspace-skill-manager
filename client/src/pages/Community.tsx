import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Star, Download, Zap, Globe, Filter,
  CheckCircle2, TrendingUp, Award, Github, AlertCircle, ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const CATEGORIES = ["all", "web", "search", "data", "auth", "ai", "util"];

function QualityBar({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color = s >= 80 ? "bg-emerald-400" : s >= 60 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${s}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground">{s.toFixed(0)}%</span>
    </div>
  );
}

export default function Community() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const { data: integrations } = trpc.settings.getIntegrations.useQuery();
  const githubConnected = Array.isArray(integrations)
    ? integrations.some((i) => i.service === "github" && i.connected)
    : false;

  const communityQuery = trpc.community.list.useQuery({
    search: search || undefined,
    category: category !== "all" ? category : undefined,
    limit: 24,
  });

  const installMutation = trpc.community.install.useMutation({
    onSuccess: () => {
      toast.success("スキルをインストールしました");
      utils.community.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const skills = communityQuery.data ?? [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        {/* GitHub Integration Banner */}
        {!githubConnected && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-amber-300">GitHub未連携</span>
              <span className="text-amber-400/80 ml-2">GitHubと連携するとプライベートリポジトリのスキルも検索・インポートできます</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLocation("/admin?tab=integrations")} className="h-7 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 shrink-0">
              <Github className="w-3.5 h-3.5" />連携設定
            </Button>
          </div>
        )}
        {githubConnected && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm">
            <Github className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-emerald-300">GitHub連携済み</span>
              <span className="text-emerald-400/80 ml-2">プライベートリポジトリのスキルも検索・インポートできます</span>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />接続済み</Badge>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              スキル広場
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              コミュニティのスキルを検索・インストール
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5" />
            {skills.length} 件のスキル
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
              placeholder="スキルを検索... (Enterで検索)"
              className="pl-9 bg-input border-border"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSearch(searchInput)} className="gap-1.5 text-xs">
            <Search className="w-3.5 h-3.5" />
            検索
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                category === cat
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-muted/30 border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              {cat === "all" ? "すべて" : cat}
            </button>
          ))}
        </div>

        {/* Skills Grid */}
        {communityQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 rounded-xl shimmer" />
            ))}
          </div>
        ) : skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Globe className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">スキルが見つかりません</p>
            <p className="text-xs text-muted-foreground/60 mt-1">検索条件を変えてみてください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => {
              const tags: string[] = skill.tags ? JSON.parse(skill.tags) : [];
              return (
                <Card key={skill.id} className="bg-card border-border card-hover">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{skill.name}</p>
                          <p className="text-[10px] text-muted-foreground">{skill.author}</p>
                        </div>
                      </div>
                      {skill.isInstalled && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {skill.description}
                    </p>

                    {/* Quality */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">品質スコア</span>
                        <div className="flex items-center gap-1">
                          {(skill.qualityScore ?? 0) >= 85 && (
                            <Award className="w-3 h-3 text-amber-400" />
                          )}
                        </div>
                      </div>
                      <QualityBar score={skill.qualityScore} />
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats & Action */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400" />
                          {skill.stars}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {skill.downloads}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50">
                          Gen {skill.generationCount}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={skill.isInstalled ? "outline" : "default"}
                        className="h-7 text-[10px] px-3 gap-1"
                        onClick={() => {
                          if (!skill.isInstalled) {
                            installMutation.mutate({ communitySkillId: skill.id });
                          }
                        }}
                        disabled={skill.isInstalled || installMutation.isPending}
                      >
                        {skill.isInstalled ? (
                          <><CheckCircle2 className="w-3 h-3" /> インストール済</>
                        ) : (
                          <><Download className="w-3 h-3" /> インストール</>
                        )}
                      </Button>
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
