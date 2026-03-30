import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  User, Bell, Palette, Shield, LogOut, Save, Moon, Sun,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();

  const settingsQuery = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("設定を保存しました");
      utils.settings.get.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const settings = settingsQuery.data;

  const [displayName, setDisplayName] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyHealth, setNotifyHealth] = useState(true);
  const [notifyUpdates, setNotifyUpdates] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    if (settings) {
      setDisplayName(settings.displayName ?? "");
      setNotifyEmail(settings.notifyEmail ?? true);
      setNotifyHealth(settings.notifyHealth ?? true);
      setNotifyUpdates(settings.notifyUpdates ?? false);
      setTheme(settings.theme ?? "dark");
    }
  }, [settings]);

  const saveProfile = () => {
    updateMutation.mutate({ displayName, theme });
  };

  const saveNotifications = () => {
    updateMutation.mutate({ notifyEmail, notifyHealth, notifyUpdates });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">設定</h1>
          <p className="text-sm text-muted-foreground mt-0.5">アカウントと通知の設定を管理</p>
        </div>

        <Tabs defaultValue="account">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="account" className="text-xs gap-1.5">
              <User className="w-3.5 h-3.5" />
              アカウント
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              通知
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              外観
            </TabsTrigger>
          </TabsList>

          {/* Account */}
          <TabsContent value="account" className="mt-4 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  プロフィール
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                    {(displayName || user?.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border mt-1 inline-block ${user?.role === "admin" ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}`}>
                      {user?.role === "admin" ? "管理者" : "ユーザー"}
                    </span>
                  </div>
                </div>
                <Separator className="bg-border" />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">表示名</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="表示名を入力..."
                      className="bg-input border-border text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">メールアドレス</Label>
                    <Input
                      value={user?.email ?? ""}
                      disabled
                      className="bg-muted/30 border-border text-sm text-muted-foreground"
                    />
                    <p className="text-[10px] text-muted-foreground">メールアドレスはOAuth経由で管理されます</p>
                  </div>
                </div>
                <Button
                  onClick={saveProfile}
                  disabled={updateMutation.isPending}
                  className="gap-1.5 text-xs"
                  size="sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  保存
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border border-rose-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  セキュリティ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  アカウントからログアウトします。すべてのセッションが終了します。
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="gap-1.5 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ログアウト
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  通知設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "notifyEmail", label: "メール通知", desc: "重要なイベントをメールで通知", value: notifyEmail, set: setNotifyEmail },
                  { key: "notifyHealth", label: "ヘルスアラート", desc: "スキルの品質低下を通知", value: notifyHealth, set: setNotifyHealth },
                  { key: "notifyUpdates", label: "アップデート通知", desc: "新機能やアップデートを通知", value: notifyUpdates, set: setNotifyUpdates },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={item.value}
                      onCheckedChange={item.set}
                    />
                  </div>
                ))}
                <Button
                  onClick={saveNotifications}
                  disabled={updateMutation.isPending}
                  className="gap-1.5 text-xs"
                  size="sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  保存
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  外観設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs mb-2 block">テーマ</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "dark", label: "ダーク", icon: Moon, desc: "暗い背景" },
                      { value: "light", label: "ライト", icon: Sun, desc: "明るい背景" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          theme === t.value
                            ? "border-primary/40 bg-primary/10"
                            : "border-border bg-muted/20 hover:border-border/80"
                        }`}
                      >
                        <t.icon className={`w-4 h-4 ${theme === t.value ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="text-left">
                          <p className="text-xs font-medium">{t.label}</p>
                          <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => updateMutation.mutate({ theme })}
                  disabled={updateMutation.isPending}
                  className="gap-1.5 text-xs"
                  size="sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  保存
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
