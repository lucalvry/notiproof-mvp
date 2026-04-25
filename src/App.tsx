import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layouts/AppLayout";
import { WizardLayout } from "@/components/layouts/WizardLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Suspended from "./pages/auth/Suspended";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Dashboard";

import OnbConnect from "./pages/onboarding/Connect";
import OnbInstall from "./pages/onboarding/Install";
import OnbWidget from "./pages/onboarding/Widget";
import OnbComplete from "./pages/onboarding/Complete";

import ProofLibrary from "./pages/proof/ProofLibrary";
import ProofDetail from "./pages/proof/ProofDetail";
import ProofRequests from "./pages/proof/ProofRequests";

import WidgetsList from "./pages/widgets/WidgetsList";
import WidgetEditor from "./pages/widgets/WidgetEditor";

import IntegrationsList from "./pages/integrations/IntegrationsList";
import IntegrationDetail from "./pages/integrations/IntegrationDetail";

import Analytics from "./pages/Analytics";

import ProfileSettings, { SettingsLayout } from "./pages/settings/Profile";
import AccountSettings from "./pages/settings/Account";
import TeamSettings from "./pages/settings/Team";
import EmailSettings from "./pages/settings/Email";
import BillingSettings from "./pages/settings/Billing";

import Collect, { CollectThanks } from "./pages/collect/Collect";

import AdminOverview from "./pages/admin/Overview";
import AdminBusinesses from "./pages/admin/Businesses";
import BusinessDetail from "./pages/admin/BusinessDetail";
import Moderation from "./pages/admin/Moderation";
import Health from "./pages/admin/Health";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/suspended" element={<Suspended />} />

          {/* Public collection */}
          <Route path="/collect/:token" element={<Collect />} />
          <Route path="/collect/:token/done" element={<CollectThanks />} />

          {/* Onboarding */}
          <Route element={<WizardLayout />}>
            <Route path="/onboarding/connect" element={<OnbConnect />} />
            <Route path="/onboarding/install" element={<OnbInstall />} />
            <Route path="/onboarding/preview" element={<OnbWidget />} />
            <Route path="/onboarding/complete" element={<OnbComplete />} />
          </Route>

          {/* Authenticated app */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/proof" element={<ProofLibrary />} />
            <Route path="/proof/request" element={<ProofRequests />} />
            <Route path="/proof/:id" element={<ProofDetail />} />

            <Route path="/widgets" element={<WidgetsList />} />
            <Route path="/widgets/new" element={<WidgetEditor />} />
            <Route path="/widgets/:id/edit" element={<WidgetEditor />} />

            <Route path="/integrations" element={<IntegrationsList />} />
            <Route path="/integrations/:id" element={<IntegrationDetail />} />

            <Route path="/analytics" element={<Analytics />} />

            <Route element={<SettingsLayout />}>
              <Route path="/settings" element={<ProfileSettings />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/account" element={<AccountSettings />} />
              <Route path="/settings/team" element={<TeamSettings />} />
              <Route path="/settings/email" element={<EmailSettings />} />
              <Route path="/settings/billing" element={<BillingSettings />} />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/dashboard" element={<AdminOverview />} />
            <Route path="/admin/businesses" element={<AdminBusinesses />} />
            <Route path="/admin/businesses/:id" element={<BusinessDetail />} />
            <Route path="/admin/moderation" element={<Moderation />} />
            <Route path="/admin/health" element={<Health />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
