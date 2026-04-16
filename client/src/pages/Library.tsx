/**
 * Asset Library — Netflix-style UI for community assets.
 * Sections:
 *  1. Hero Carousel — today's featured picks (auto-rotating)
 *  2. Netflix rows — grouped by asset type
 *  3. Search + filter bar
 *  4. Preview dialog with benefit headline, tags, install button
 */
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Command,
  Github,
  Heart,
  Search,
  Star,
  Terminal,
  Zap,
  Puzzle,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type Asset = {
  id: string;
  assetType: "skill" | "hook" | "command" | "agent" | "mcp" | "claude_md" | "other";
  name: string;
  description: string | null;
  benefitHeadline: string | null;
  author: string | null;
  repoOwner: string | null;
  repoName: string | null;
  githubUrl: string | null;
  tags: string | null;
  stars: number | null;
  forks: number | null;
  qualityScore: number | null;
  avgRating?: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  skill: "スキル",
  hook: "フック",
  command: "コマンド",
  agent: "エージェント",
  mcp: "MCP",
  claude_md: "CLAUDE.md",
  other: "その他",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  skill: <Zap className="h-3.5 w-3.5" />,
  hook: <Terminal className="h-3.5 w-3.5" />,
  command: <Command className="h-3.5 w-3.5" />,
  agent: <Sparkles className="h-3.5 w-3.5" />,
  mcp: <Puzzle className="h-3.5 w-3.5" />,
  claude_md: <FileText className="h-3.5 w-3.5" />,
  other: <BookOpen className="h-3.5 w-3.5" />,
};

const TYPE_COLORS: Record<string, string> = {
  skill: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  hook: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  command: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  agent: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  mcp: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  claude_md: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  other: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const ASSET_TYPE_ROWS: { type: string; label: string }[] = [
  { type: "skill", label: "スキル — Claude に新しい能力を" },
  { type: "hook", label: "フック — 自動化の魔法を" },
  { type: "command", label: "スラッシュコマンド — /コマンドで加速" },
  { type: "agent", label: "エージェント — 自律的な相棒" },
  { type: "mcp", label: "MCP — ツール統合の拡張" },
  { type: "claude_md", label: "CLAUDE.md — プロジェクトの記憶" },
];

// ─── AssetCard ────────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  onClick,
  compact = false,
}: {
  asset: Asset;
  onClick: (a: Asset) => void;
  compact?: boolean;
}) {
  const tags: string[] = (() => {
    try { return asset.tags ? (JSON.parse(asset.tags) as string[]) : []; }
    catch { return []; }
  })();

  return (
    <Card
      onClick={() => onClick(asset)}
      className={`
        group cursor-pointer border border-white/5 bg-white/5 hover:bg-white/10
        hover:border-white/20 transition-all duration-200 hover:scale-[1.02]
        hover:shadow-lg hover:shadow-black/40
        ${compact ? "w-48 flex-shrink-0" : ""}
      `}
    >
      <CardContent className={compact ? "p-3" : "p-4"}>
        {/* Type badge */}
        <div className="flex items-center justify-between mb-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[asset.assetType] ?? TYPE_COLORS.other}`}
          >
            {TYPE_ICONS[asset.assetType]}
            {TYPE_LABELS[asset.assetType] ?? asset.assetType}
          </span>
          {(asset.stars ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {(asset.stars ?? 0).toLocaleString()}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className={`font-semibold text-foreground line-clamp-1 ${compact ? "text-xs" : "text-sm"}`}>
          {asset.name}
        </h3>

        {/* Benefit headline (LLM-generated one-liner) */}
        {asset.benefitHeadline && (
          <p className={`mt-1 text-muted-foreground line-clamp-2 ${compact ? "text-[10px]" : "text-xs"}`}>
            {asset.benefitHeadline}
          </p>
        )}

        {/* Fallback to description */}
        {!asset.benefitHeadline && asset.description && (
          <p className={`mt-1 text-muted-foreground line-clamp-2 ${compact ? "text-[10px]" : "text-xs"}`}>
            {asset.description}
          </p>
        )}

        {/* Tags */}
        {!compact && tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[9px] px-1.5 py-0 border-white/10 text-muted-foreground">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {/* Author */}
        {!compact && asset.author && (
          <p className="mt-2 text-[10px] text-muted-foreground/60 truncate">
            by {asset.author}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Hero Carousel ────────────────────────────────────────────────────────────

function HeroCarousel({ assets, onSelect }: { assets: Asset[]; onSelect: (a: Asset) => void }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % assets.length);
    }, 6000);
  }, [assets.length]);

  useEffect(() => {
    if (assets.length > 1) start();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [assets.length, start]);

  const go = (dir: 1 | -1) => {
    if (timerRef.current) { clearInterval(timerRef.current); start(); }
    setIdx((i) => (i + dir + assets.length) % assets.length);
  };

  if (assets.length === 0) return null;

  const current = assets[idx];
  const tags: string[] = (() => {
    try { return current.tags ? (JSON.parse(current.tags) as string[]) : []; } catch { return []; }
  })();

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-900/30 via-slate-900 to-slate-950 min-h-[280px]">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-transparent to-sky-600/10 pointer-events-none" />

      <div className="relative p-8 flex flex-col justify-end h-full min-h-[280px]">
        {/* Type pill */}
        <span
          className={`self-start mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${TYPE_COLORS[current.assetType] ?? TYPE_COLORS.other}`}
        >
          {TYPE_ICONS[current.assetType]}
          {TYPE_LABELS[current.assetType] ?? current.assetType}
        </span>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white leading-tight">{current.name}</h2>

        {/* Benefit headline */}
        <p className="mt-2 text-base text-white/70 max-w-xl line-clamp-2">
          {current.benefitHeadline ?? current.description ?? ""}
        </p>

        {/* Tags row */}
        {tags.length > 0 && (
          <div className="mt-3 flex gap-1.5 flex-wrap">
            {tags.slice(0, 5).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] border-white/15 text-white/60">{t}</Badge>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => onSelect(current)}>
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            詳細を見る
          </Button>
          {current.githubUrl && (
            <Button size="sm" variant="outline" className="border-white/20 text-white/80 hover:text-white" asChild>
              <a href={current.githubUrl} target="_blank" rel="noopener noreferrer">
                <Github className="h-3.5 w-3.5 mr-1.5" />
                GitHub
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Nav arrows */}
      {assets.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white/70 hover:text-white hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white/70 hover:text-white hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {/* Dot indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {assets.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Netflix Row ──────────────────────────────────────────────────────────────

function NetflixRow({
  label,
  assets,
  onSelect,
}: {
  label: string;
  assets: Asset[];
  onSelect: (a: Asset) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 600, behavior: "smooth" });
  };

  if (assets.length === 0) return null;

  return (
    <div className="relative group/row">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="text-xs text-muted-foreground">{assets.length}件</span>
      </div>
      <div className="relative">
        {/* Left scroll button */}
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/60 p-1 text-white/70 hover:text-white
            opacity-0 group-hover/row:opacity-100 transition-opacity -translate-x-3"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Cards */}
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} onClick={onSelect} compact />
          ))}
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/60 p-1 text-white/70 hover:text-white
            opacity-0 group-hover/row:opacity-100 transition-opacity translate-x-3"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Asset Preview Dialog ─────────────────────────────────────────────────────

function AssetPreviewDialog({
  asset,
  onClose,
}: {
  asset: Asset | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();

  const rateMutation = trpc.library.rate.useMutation({
    onSuccess: () => { toast.success("評価しました"); },
    onError: () => { toast.error("評価に失敗しました"); },
  });

  const favMutation = trpc.library.favorite.useMutation({
    onSuccess: () => { toast.success("お気に入りを更新しました"); utils.library.myFavorites.invalidate(); },
    onError: () => { toast.error("お気に入りの更新に失敗しました"); },
  });

  if (!asset) return null;

  const tags: string[] = (() => {
    try { return asset.tags ? (JSON.parse(asset.tags) as string[]) : []; } catch { return []; }
  })();

  return (
    <Dialog open={!!asset} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg bg-slate-900 border border-white/10 text-foreground">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium mb-2 ${TYPE_COLORS[asset.assetType] ?? TYPE_COLORS.other}`}
              >
                {TYPE_ICONS[asset.assetType]}
                {TYPE_LABELS[asset.assetType] ?? asset.assetType}
              </span>
              <DialogTitle className="text-lg font-bold leading-tight">{asset.name}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {/* Benefit headline */}
            {asset.benefitHeadline && (
              <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-3">
                <p className="text-sm text-violet-200 font-medium">{asset.benefitHeadline}</p>
              </div>
            )}

            {/* Description */}
            {asset.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{asset.description}</p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {(asset.stars ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {(asset.stars ?? 0).toLocaleString()} stars
                </span>
              )}
              {(asset.forks ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Github className="h-3.5 w-3.5" />
                  {(asset.forks ?? 0).toLocaleString()} forks
                </span>
              )}
              {(asset.avgRating ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {(asset.avgRating ?? 0).toFixed(1)} / 5
                </span>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs border-white/10 text-muted-foreground">{t}</Badge>
                ))}
              </div>
            )}

            {/* Author / repo */}
            {asset.author && (
              <p className="text-xs text-muted-foreground">by {asset.author}</p>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap mt-2">
          {asset.githubUrl && (
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <a href={asset.githubUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                GitHub で見る
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => favMutation.mutate({ assetId: asset.id, favorite: true })}
          >
            <Heart className="h-3.5 w-3.5 mr-1.5" />
            お気に入り
          </Button>
          {[5, 4, 3].map((r) => (
            <Button
              key={r}
              size="sm"
              variant="ghost"
              onClick={() => rateMutation.mutate({ assetId: asset.id, rating: r })}
              title={`${r}点で評価`}
            >
              {Array.from({ length: r }, (_, i) => (
                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Library() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Asset | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const featuredQuery = trpc.library.featured.useQuery();
  const allQuery = trpc.library.list.useQuery({
    search: debouncedSearch || undefined,
    limit: 100,
    offset: 0,
    sortBy: "crawlRank",
  });

  const featured = (featuredQuery.data ?? []) as Asset[];
  const allAssets = (allQuery.data ?? []) as Asset[];

  // Group by type for Netflix rows
  const byType = ASSET_TYPE_ROWS.reduce<Record<string, Asset[]>>((acc, row) => {
    acc[row.type] = allAssets.filter((a) => a.assetType === row.type);
    return acc;
  }, {});

  const isSearching = debouncedSearch.length > 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 max-w-screen-xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">アセットライブラリ</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              世界中のClaudeアセットを探索・インストール
            </p>
          </div>
          {/* Search bar */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="検索…"
              className="pl-9 bg-white/5 border-white/10"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Hero carousel (hidden during search) */}
        {!isSearching && featured.length > 0 && (
          <HeroCarousel assets={featured} onSelect={setSelected} />
        )}

        {/* Search results */}
        {isSearching && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              「{debouncedSearch}」の検索結果 — {allAssets.length}件
            </h2>
            {allQuery.isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-lg bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {allAssets.map((a) => (
                  <AssetCard key={a.id} asset={a} onClick={setSelected} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Netflix rows (hidden during search) */}
        {!isSearching && (
          <div className="space-y-8">
            {ASSET_TYPE_ROWS.map((row) => (
              <NetflixRow
                key={row.type}
                label={row.label}
                assets={byType[row.type] ?? []}
                onSelect={setSelected}
              />
            ))}

            {/* Empty state */}
            {allQuery.data?.length === 0 && !allQuery.isLoading && (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">アセットがまだありません</p>
                <p className="text-xs mt-1">GitHubクロールを実行するとアセットが表示されます</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview dialog */}
      <AssetPreviewDialog asset={selected} onClose={() => setSelected(null)} />
    </DashboardLayout>
  );
}
