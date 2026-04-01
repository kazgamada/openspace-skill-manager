import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import MySkills from "./pages/MySkills";
import SkillDetail from "./pages/SkillDetail";
import Community from "./pages/Community";
import AdminSettings from "./pages/AdminSettings";
import UserSettings from "./pages/UserSettings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      {/* マイスキル */}
      <Route path="/skills" component={MySkills} />
      <Route path="/skills/:id" component={SkillDetail} />
      {/* スキル広場 */}
      <Route path="/community" component={Community} />
      {/* 設定（v4: 3サブページ） */}
      <Route path="/settings" component={UserSettings} />
      <Route path="/settings/account" component={UserSettings} />
      <Route path="/settings/wizard" component={UserSettings} />
      <Route path="/settings/manual" component={UserSettings} />
      {/* 管理者パネル（v4: 3サブページ） */}
      <Route path="/admin" component={AdminSettings} />
      <Route path="/admin/users" component={AdminSettings} />
      <Route path="/admin/plans" component={AdminSettings} />
      <Route path="/admin/revenue" component={AdminSettings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
