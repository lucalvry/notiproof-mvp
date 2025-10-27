import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layouts/AppLayout";
import { AdminLayout } from "./components/layouts/AdminLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Websites from "./pages/Websites";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import CampaignDetails from "./pages/CampaignDetails";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Account from "./pages/Account";
import Integrations from "./pages/Integrations";
import Help from "./pages/Help";
import HelpArticle from "./pages/HelpArticle";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminWebsites from "./pages/admin/Websites";
import AdminCampaigns from "./pages/admin/Campaigns";
import AdminIntegrations from "./pages/admin/Integrations";
import AdminBilling from "./pages/admin/Billing";
import AdminLogs from "./pages/admin/Logs";
import AdminSystem from "./pages/admin/System";
import AdminSettings from "./pages/admin/Settings";
import AdminHelpArticles from "./pages/admin/HelpArticles";
import WidgetAnalytics from "./pages/WidgetAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Navigate to="/websites" replace />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="websites" element={<AdminWebsites />} />
            <Route path="campaigns" element={<AdminCampaigns />} />
            <Route path="integrations" element={<AdminIntegrations />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="system" element={<AdminSystem />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="help-articles" element={<AdminHelpArticles />} />
          </Route>
          
          {/* User Routes */}
          <Route element={<AppLayout />}>
            <Route path="/websites" element={<Websites />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetails />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/analytics/widget/:id" element={<WidgetAnalytics />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/account" element={<Account />} />
            <Route path="/help" element={<Help />} />
            <Route path="/help/article/:slug" element={<HelpArticle />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
