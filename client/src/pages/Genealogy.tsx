import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GitBranch, ZoomIn, ZoomOut, Maximize2, Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import cytoscape from "cytoscape";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

const EVO_COLORS: Record<string, string> = {
  create: "#22d3ee",
  fix: "#60a5fa",
  derive: "#c084fc",
  capture: "#4ade80",
};

function EvoBadge({ type }: { type: string }) {
  const labels: Record<string, string> = { fix: "修復", derive: "派生", capture: "キャプチャ", create: "作成" };
  const colors: Record<string, string> = {
    fix: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    derive: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    capture: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    create: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${colors[type] ?? "bg-muted text-muted-foreground border-border"}`}>
      {labels[type] ?? type}
    </span>
  );
}

function GenealogyGraph({
  nodes,
  edges,
  onNodeSelect,
}: {
  nodes: { id: string; label: string; evolutionType: string; qualityScore: number | null; changeLog: string | null; createdAt: Date }[];
  edges: { source: string; target: string; label: string }[];
  onNodeSelect: (node: typeof nodes[0] | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.label,
            evolutionType: n.evolutionType,
            qualityScore: n.qualityScore ?? 0,
            changeLog: n.changeLog,
            createdAt: n.createdAt,
          },
        })),
        ...edges.map((e, i) => ({
          data: { id: `e${i}`, source: e.source, target: e.target, label: e.label },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele: cytoscape.NodeSingular) => EVO_COLORS[ele.data("evolutionType")] ?? "#6366f1",
            "border-width": 2,
            "border-color": (ele: cytoscape.NodeSingular) => EVO_COLORS[ele.data("evolutionType")] ?? "#6366f1",
            "border-opacity": 0.8,
            "width": 48,
            "height": 48,
            "label": "data(label)",
            "color": "#e2e8f0",
            "font-size": 10,
            "font-family": "Inter, sans-serif",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 6,
            "background-opacity": 0.2,
            "overlay-padding": 6,
          } as any,
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 3,
            "border-color": "#a78bfa",
            "background-opacity": 0.5,
            "overlay-color": "#a78bfa",
            "overlay-opacity": 0.1,
          } as any,
        },
        {
          selector: "edge",
          style: {
            "width": 1.5,
            "line-color": "#334155",
            "target-arrow-color": "#334155",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 1.2,
          } as any,
        },
      ],
      layout: {
        name: "breadthfirst",
        directed: true,
        padding: 40,
        spacingFactor: 1.5,
        avoidOverlap: true,
      } as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cy.on("tap", "node", (evt) => {
      const data = evt.target.data();
      onNodeSelect({
        id: data.id,
        label: data.label,
        evolutionType: data.evolutionType,
        qualityScore: data.qualityScore,
        changeLog: data.changeLog,
        createdAt: data.createdAt,
      });
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) onNodeSelect(null);
    });

    cyRef.current = cy;
    return () => { cy.destroy(); cyRef.current = null; };
  }, [nodes, edges]);

  const zoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  const zoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const fit = () => cyRef.current?.fit(undefined, 40);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7 bg-card/80 backdrop-blur" onClick={zoomIn}>
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7 bg-card/80 backdrop-blur" onClick={zoomOut}>
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7 bg-card/80 backdrop-blur" onClick={fit}>
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 px-3 py-2 rounded-lg bg-card/80 backdrop-blur border border-border">
        {Object.entries(EVO_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, opacity: 0.8 }} />
            <span className="text-[10px] text-muted-foreground capitalize">{type === "create" ? "作成" : type === "fix" ? "修復" : type === "derive" ? "派生" : "キャプチャ"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Genealogy() {
  const params = useParams<{ skillId?: string }>();
  const [selectedSkillId, setSelectedSkillId] = useState(params.skillId ?? "");
  const [selectedNode, setSelectedNode] = useState<{
    id: string; label: string; evolutionType: string; qualityScore: number | null; changeLog: string | null; createdAt: Date;
  } | null>(null);

  const skillsQuery = trpc.skills.list.useQuery();
  const genealogyQuery = trpc.skills.genealogy.useQuery(
    { skillId: selectedSkillId },
    { enabled: !!selectedSkillId }
  );

  const skills = skillsQuery.data ?? [];
  const genealogy = genealogyQuery.data;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              スキル系譜ビューア
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">DAGグラフでスキルの進化を可視化</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedSkillId}
              onChange={(e) => { setSelectedSkillId(e.target.value); setSelectedNode(null); }}
              className="h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground min-w-48"
            >
              <option value="">スキルを選択...</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main area */}
        <div className="flex flex-1 min-h-0">
          {/* Graph */}
          <div className="flex-1 min-w-0 bg-background/50">
            {!selectedSkillId ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <GitBranch className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">スキルを選択してください</p>
                <p className="text-xs text-muted-foreground/60 mt-1">上のドロップダウンからスキルを選択すると系譜が表示されます</p>
              </div>
            ) : genealogyQuery.isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !genealogy || genealogy.nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Info className="w-8 h-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">バージョン履歴がありません</p>
              </div>
            ) : (
              <GenealogyGraph
                nodes={genealogy.nodes}
                edges={genealogy.edges}
                onNodeSelect={setSelectedNode}
              />
            )}
          </div>

          {/* Detail Panel */}
          {selectedNode && (
            <div className="w-72 shrink-0 border-l border-border bg-card p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">バージョン詳細</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedNode(null)}>
                  ×
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">バージョン</p>
                  <p className="text-lg font-bold font-mono">{selectedNode.label}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">進化タイプ</p>
                  <EvoBadge type={selectedNode.evolutionType} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">品質スコア</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${(selectedNode.qualityScore ?? 0) >= 80 ? "bg-emerald-400" : (selectedNode.qualityScore ?? 0) >= 60 ? "bg-amber-400" : "bg-rose-400"}`}
                        style={{ width: `${selectedNode.qualityScore ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono">{(selectedNode.qualityScore ?? 0).toFixed(0)}%</span>
                  </div>
                </div>
                {selectedNode.changeLog && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">変更ログ</p>
                    <p className="text-xs">{selectedNode.changeLog}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">作成日時</p>
                  <p className="text-xs">{formatDistanceToNow(new Date(selectedNode.createdAt), { addSuffix: true, locale: ja })}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
