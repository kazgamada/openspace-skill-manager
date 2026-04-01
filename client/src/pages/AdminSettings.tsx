/**
 * AdminSettings.tsx — v4設計
 * 管理者パネル（3サブページ）
 *
 * /admin/users    → ユーザー・ロール管理
 * /admin/plans    → プラン管理
 * /admin/revenue  → 収益ダッシュボード
 * /admin          → /admin/users へリダイレクト
 */
import { useState } from "react";
import { useRoute, Redirect } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity, AlertCircle, CheckCircle2,
  DollarSign, Loader2, Search, Settings, Shield,
  TrendingUp, Users, Zap,
} from "lucide-react";

// ─── Route detection ──────────────────────────────────────────────────────────
type AdminSection = "users" | "plans" | "revenue";

function useAdminSection(): AdminSection {
  const [onUsers]   = useRoute("/admin/users");
  const [onPlans]   = useRoute("/admin/plans");
  const [onRevenue] = useRoute("/admin/revenue");
  if (onPlans)   return "plans";
  if (onRevenue) return "revenue";
  return "users"; // /admin も users 扱い
}

// ─── Section title/icon map ───────────────────────────────────────────────────
const SECTION_META: Record<AdminSection, { title: string; desc: string; Icon: React.ElementType }> = {
  users:   { title: "ユーザー・ロール管理", desc: "登録ユーザーの管理と権限設定",   Icon: Users },
  plans:   { title: "プラン管理",           desc: "サブスクリプションプランの管理", Icon: Settings },
  revenue: { title: "収益ダッシュボード",   desc: "収益・課金状況の概要",           Icon: TrendingUp },
};

// ─── Root component ───────────────────────────────────────────────────────────
export default function AdminSettings() {
  const { user, loading } = useAuth();
  const section = useAdminSection();
  const [onAdmin] = useRoute("/admin");

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // /admin → /admin/users へリダイレクト
  if (onAdmin) return <Redirect to="/admin/users" />;

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Shield className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">管理者権限が必要です</p>
        </div>
      </DashboardLayout>
    );
  }

  const { title, desc, Icon } = SECTION_META[section];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
          <Badge variant="outline" className="ml-auto border-primary/40 text-primary text-xs">
            <Shield className="w-3 h-3 mr-1" />管理者
          </Badge>
        </div>

        {section === "users"   && <UsersSection />}
        {section === "plans"   && <PlansSection />}
        {section === "revenue" && <RevenueSection />}
      </div>
    </DashboardLayout>
  );
}

// ─── Users Section ────────────────────────────────────────────────────────────
function UsersSection() {
  const [search, setSearch] = useState("");
  const usersQuery = trpc.admin.users.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("ロールを更新しました"); usersQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (usersQuery.data ?? []).filter((u) =>
    (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "総ユーザー数",  value: usersQuery.data?.length ?? "—",                                                      Icon: Users,    color: "text-primary" },
          { label: "管理者数",      value: (usersQuery.data ?? []).filter((u) => u.role === "admin").length || "—",             Icon: Shield,   color: "text-amber-400" },
          { label: "一般ユーザー数", value: (usersQuery.data ?? []).filter((u) => u.role !== "admin").length || "—",            Icon: Activity, color: "text-emerald-400" },
        ].map(({ label, value, Icon, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4 flex flex-col gap-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="名前・メールで検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* User list */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground">ユーザーが見つかりません</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {(u.name ?? u.email ?? "U")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name ?? "名前未設定"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={u.role}
                      onValueChange={(role) =>
                        updateRole.mutate({ userId: u.id, role: role as "user" | "admin" })
                      }
                    >
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">ユーザー</SelectItem>
                        <SelectItem value="admin">管理者</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        u.role === "admin"
                          ? "border-primary/40 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {u.role === "admin" ? "管理者" : "ユーザー"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />合計 {usersQuery.data?.length ?? 0} ユーザー
      </p>
    </div>
  );
}

// ─── Plans Section ────────────────────────────────────────────────────────────
const PLAN_DEFS = [
  {
    key: "free",
    name: "Free",
    price: "¥0",
    period: "/月",
    color: "border-border",
    badgeClass: "bg-muted/30 text-muted-foreground border-border",
    features: ["スキル管理（最大20件）", "スキル広場の閲覧", "手動同期（月5回）"],
    limits: "スキル数上限: 20件 / 自動修復: 無効",
  },
  {
    key: "pro",
    name: "Pro",
    price: "¥1,980",
    period: "/月",
    color: "border-primary/40",
    badgeClass: "bg-primary/15 text-primary border-primary/40",
    features: ["スキル管理（無制限）", "自動同期（6時間ごと）", "自動修復（月20回）", "進化提案（月10件）"],
    limits: "自動修復: 月20回 / 進化提案: 月10件",
  },
  {
    key: "team",
    name: "Team",
    price: "¥4,980",
    period: "/月",
    color: "border-amber-500/40",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    features: ["Proの全機能", "チームメンバー5名まで", "自動修復（無制限）", "進化提案（無制限）", "優先サポート"],
    limits: "自動修復: 無制限 / 進化提案: 無制限",
  },
];

function PlansSection() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <p>プランの価格・機能制限はここで確認できます。Stripe連携による課金管理は今後実装予定です。</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {PLAN_DEFS.map((plan) => (
          <Card key={plan.key} className={`bg-card border-2 ${plan.color}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-xs ${plan.badgeClass}`}>{plan.name}</Badge>
                    <span className="text-lg font-bold">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-1 mb-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-muted-foreground/60 font-mono">{plan.limits}</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs shrink-0 h-8"
                  onClick={() => toast.info("プラン編集機能は準備中です")}>
                  編集
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Revenue Section ──────────────────────────────────────────────────────────
function RevenueSection() {
  const usersQuery = trpc.admin.users.useQuery();
  const skillsQuery = trpc.admin.allSkills.useQuery();

  // ダミー収益データ（Stripe未連携のため）
  const dummyMetrics = [
    { label: "今月の収益",     value: "¥—",    sub: "Stripe未連携",    Icon: DollarSign, color: "text-emerald-400" },
    { label: "有料プラン数",   value: "—",     sub: "Stripe未連携",    Icon: TrendingUp, color: "text-primary" },
    { label: "総スキル数",     value: skillsQuery.data?.length ?? "—", sub: "全ユーザー合計", Icon: Zap, color: "text-amber-400" },
    { label: "登録ユーザー数", value: usersQuery.data?.length ?? "—",  sub: "累計",          Icon: Users, color: "text-blue-400" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <p>収益データはStripe連携後に自動表示されます。現在はシステム統計のみ表示しています。</p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {dummyMetrics.map(({ label, value, sub, Icon, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stripe連携案内 */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Stripe連携
          </CardTitle>
          <CardDescription className="text-xs">
            課金・サブスクリプション管理にはStripe連携が必要です
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {[
              { label: "月次収益グラフ",     desc: "MRR・ARRのトレンド表示" },
              { label: "プラン別ユーザー数", desc: "Free/Pro/Teamの分布" },
              { label: "チャーン率",         desc: "解約率・継続率の追跡" },
              { label: "請求書管理",         desc: "Stripeダッシュボードへのリンク" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/20 border border-border/50">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                <div>
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
                <Badge variant="outline" className="ml-auto text-[9px] text-muted-foreground shrink-0">準備中</Badge>
              </div>
            ))}
          </div>
          <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 h-8"
            onClick={() => toast.info("Stripe連携の設定は管理者にお問い合わせください")}>
            <DollarSign className="w-3.5 h-3.5" />
            Stripe連携を設定する
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
