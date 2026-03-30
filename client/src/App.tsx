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
import Genealogy from "./pages/Genealogy";
import HealthMonitor from "./pages/HealthMonitor";
import ClaudeIntegration from "./pages/ClaudeIntegration";
import Storage from "./pages/Storage";
import Settings from "./pages/Settings";
import AdminSettings from "./pages/AdminSettings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/skills" component={MySkills} />
      <Route path="/skills/:id" component={SkillDetail} />
      <Route path="/community" component={Community} />
      <Route path="/genealogy" component={Genealogy} />
      <Route path="/genealogy/:skillId" component={Genealogy} />
      <Route path="/health" component={HealthMonitor} />
      <Route path="/claude" component={ClaudeIntegration} />
      <Route path="/storage" component={Storage} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminSettings} />
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
