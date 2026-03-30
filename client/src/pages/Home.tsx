import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Zap, Brain, GitBranch, Activity, Bot, ArrowRight, Star, Download } from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-border/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-lg gradient-text">OpenSpace Skill Manager</span>
          </div>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} size="sm">
            ログイン
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative max-w-6xl mx-auto px-6 pt-24 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-8">
            <Zap className="w-3 h-3" />
            AIスキルの自律進化プラットフォーム
          </div>

          <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">
            スキルを<span className="gradient-text">進化</span>させ、<br />
            AIを<span className="gradient-text">成長</span>させる
          </h1>

          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Claude Codeと連携し、スキルの作成・修復・派生を管理。<br />
            DAGグラフで進化の系譜を可視化し、品質を継続的に向上させます。
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => { window.location.href = getLoginUrl(); }}
              className="glow-primary gap-2"
            >
              無料で始める
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => { window.location.href = getLoginUrl(); }}>
              デモを見る
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-24">
          {[
            { icon: Brain, title: "スキル管理", desc: "バージョン履歴・派生スキル・コード管理を一元化" },
            { icon: GitBranch, title: "系譜ビューア", desc: "DAGグラフでスキルの進化ツリーを視覚的に把握" },
            { icon: Activity, title: "ヘルスモニタリング", desc: "成功率・品質スコアをリアルタイムで追跡・自動修復" },
            { icon: Bot, title: "Claude連携", desc: "MCP接続でClaude Codeとシームレスに統合" },
            { icon: Star, title: "スキル広場", desc: "コミュニティのスキルを検索・インストール" },
            { icon: Download, title: "ストレージ管理", desc: "ローカル/クラウドの同期状態を一目で確認" },
          ].map((f) => (
            <div key={f.title} className="p-5 rounded-xl border border-border bg-card/50 card-hover">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <f.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
