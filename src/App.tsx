import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AdminLayout } from "@/components/AdminLayout";
import RootRedirect from "./pages/RootRedirect";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import DashboardWidgets from "./pages/DashboardWidgets";
import CreateWidget from "./pages/CreateWidget";
import EditWidget from "./pages/EditWidget";
import Installation from "./pages/Installation";
import DashboardSettings from "./pages/DashboardSettings";
import LiveTest from "./pages/LiveTest";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminWidgets from "./pages/AdminWidgets";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";
// New pages
import AdminEvents from "./pages/AdminEvents";
import AdminUserDetail from "./pages/AdminUserDetail";
import AdminWidgetDetail from "./pages/AdminWidgetDetail";
import WidgetEvents from "./pages/WidgetEvents";
import Billing from "./pages/Billing";
import AdminLogin from "./pages/AdminLogin";
import WidgetAnalytics from "./pages/WidgetAnalytics";
import Integrations from "./pages/Integrations";
import AdminAlerts from "./pages/AdminAlerts";
import Campaigns from "./pages/Campaigns";
import CreateCampaign from "./pages/CreateCampaign";
import SocialConnectors from "./pages/SocialConnectors";
import ModerationQueue from "./pages/ModerationQueue";
import Teams from "./pages/Teams";
import TemplatesMarketplace from "./pages/TemplatesMarketplace";

// Updated routing configuration for Phase 5, 6 & 7
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/forgot" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/live-test" element={<LiveTest />} />
            
            {/* User Dashboard Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="widgets" element={<DashboardWidgets />} />
              <Route path="widgets/create" element={<CreateWidget />} />
              <Route path="widgets/:id/edit" element={<EditWidget />} />
              <Route path="widgets/:id/events" element={<WidgetEvents />} />
              <Route path="widgets/:id/analytics" element={<WidgetAnalytics />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="campaigns/create" element={<CreateCampaign />} />
              <Route path="social-connectors" element={<SocialConnectors />} />
              <Route path="moderation" element={<ModerationQueue />} />
              <Route path="teams" element={<Teams />} />
              <Route path="templates" element={<TemplatesMarketplace />} />
              <Route path="installation" element={<Installation />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="settings" element={<DashboardSettings />} />
              <Route path="billing" element={<Billing />} />
            </Route>

            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:id" element={<AdminUserDetail />} />
              <Route path="widgets" element={<AdminWidgets />} />
              <Route path="widgets/:id" element={<AdminWidgetDetail />} />
              <Route path="events" element={<AdminEvents />} />
              <Route path="alerts" element={<AdminAlerts />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;