import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WebsiteProvider } from "@/contexts/WebsiteContext";
import { AppLayout } from "./components/layouts/AppLayout";
import { AdminLayout } from "./components/layouts/AdminLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Websites from "./pages/Websites";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import CampaignDetails from "./pages/CampaignDetails";
import Playlists from "./pages/Playlists";
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
import AdminTeams from "./pages/admin/Teams";
import AdminManagement from "./pages/admin/AdminManagement";
import AdminOnboarding from "./pages/admin/Onboarding";
import AdminEmailTemplates from "./pages/admin/EmailTemplates";
import AcceptInvite from "./pages/AcceptInvite";
import WidgetAnalytics from "./pages/WidgetAnalytics";
import Templates from "./pages/Templates";
import SelectPlan from "./pages/SelectPlan";
import Team from "./pages/Team";
import DataMigration from "./pages/admin/DataMigration";
import FeatureFlags from "./pages/admin/FeatureFlags";
import MediaManagement from "./pages/admin/MediaManagement";
import ABTesting from "./pages/ABTesting";
import GA4PropertySelection from "./pages/GA4PropertySelection";
import EventModeration from "./pages/EventModeration";
import Pricing from "./pages/Pricing";
import Rules from "./pages/Rules";
import TestimonialCollection from "./pages/TestimonialCollection";
import TestimonialModeration from "./pages/TestimonialModeration";
import TestimonialManagement from "./pages/TestimonialManagement";
import TestimonialEmailManager from "./pages/TestimonialEmailManager";
import TestimonialTriggers from "./pages/TestimonialTriggers";
import TestimonialFormBuilder from "./pages/TestimonialFormBuilder";
import TestimonialEmbeds from "./pages/TestimonialEmbeds";
import TestimonialEmbedBuilderPage from "./pages/TestimonialEmbedBuilder";
import PublicTestimonialEmbed from "./pages/PublicTestimonialEmbed";
import NotificationWeights from "./pages/NotificationWeights";
import FormCaptures from "./pages/FormCaptures";
import VisitorsPulse from "./pages/VisitorsPulse";
import ImpactBoard from "./pages/ImpactBoard";
import IntegrationSettings from "./pages/IntegrationSettings";
import WooCommerceOrders from "./pages/WooCommerceOrders";
import LTDCheckout from "./pages/LTDCheckout";
import LTDSuccess from "./pages/LTDSuccess";
import { OAuthCallback } from "./components/integrations/OAuthCallback";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { inject } from "@vercel/analytics";
import ReactGA from "react-ga4";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// GA Initializer component - ensures GA is initialized after DOM is ready
const GAInitializer = () => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      ReactGA.initialize("G-PM00N0M1DQ", {
        testMode: import.meta.env.DEV, // Enable test mode in development
      });
      setInitialized(true);
      console.log('[GA4] Google Analytics initialized');
    } catch (error) {
      console.error('[GA4] Failed to initialize:', error);
    }

    // Check if gtag loaded (might be blocked by ad blockers)
    const checkGtagLoaded = () => {
      if (typeof window.gtag === 'undefined') {
        console.warn('[GA4] gtag not available - may be blocked by ad blocker');
        return false;
      }
      console.log('[GA4] gtag is available');
      return true;
    };

    // Wait a moment for script to load
    const timer = setTimeout(checkGtagLoaded, 2000);
    return () => clearTimeout(timer);
  }, []);

  return null;
};

// Track page views on route change
const TrackPageViews = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      ReactGA.send({ 
        hitType: "pageview", 
        page: location.pathname + location.search 
      });
      console.log('[GA4] Pageview tracked:', location.pathname + location.search);
    } catch (error) {
      console.error('[GA4] Failed to track pageview:', error);
    }
  }, [location]);

  return null;
};

// Utility function to track custom events
export const trackGAEvent = (category: string, action: string, label?: string, value?: number) => {
  try {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
    console.log('[GA4] Event tracked:', { category, action, label, value });
  } catch (error) {
    console.error('[GA4] Failed to track event:', error);
  }
};



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

inject();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GAInitializer />
          <WebsiteProvider>
            <TrackPageViews />
          <Routes>
        <Route path="/login" element={<Login />} />
        {/* LTD Campaign: Redirect all signup routes to /ltd */}
        <Route path="/register" element={<Navigate to="/ltd" replace />} />
        <Route path="/signup" element={<Navigate to="/ltd" replace />} />
        <Route path="/get-started" element={<Navigate to="/ltd" replace />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/select-plan" element={<SelectPlan />} />
        <Route path="/ltd" element={<LTDCheckout />} />
        <Route path="/ltd-success" element={<LTDSuccess />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />
        <Route path="/ga4-property-selection" element={<GA4PropertySelection />} />
        
        {/* Public Testimonial Collection Form */}
        <Route path="/collect/:slug" element={<TestimonialCollection />} />
        
          <Route path="/" element={<Navigate to="/websites" replace />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="websites" element={<AdminWebsites />} />
            <Route path="campaigns" element={<AdminCampaigns />} />
            <Route path="teams" element={<AdminTeams />} />
            <Route path="integrations" element={<AdminIntegrations />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="admin-management" element={<AdminManagement />} />
            <Route path="onboarding" element={<AdminOnboarding />} />
            <Route path="email-templates" element={<AdminEmailTemplates />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="system" element={<AdminSystem />} />
            <Route path="migration" element={<DataMigration />} />
            <Route path="feature-flags" element={<FeatureFlags />} />
            <Route path="media" element={<MediaManagement />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="help-articles" element={<AdminHelpArticles />} />
          </Route>
          
          {/* User Routes */}
          <Route element={<AppLayout />}>
            <Route path="/websites" element={<Websites />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetails />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/impact-board" element={<ImpactBoard />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/events" element={<EventModeration />} />
            <Route path="/notification-weights" element={<NotificationWeights />} />
            <Route path="/form-captures" element={<FormCaptures />} />
            <Route path="/visitors-pulse" element={<VisitorsPulse />} />
            <Route path="/analytics/widget/:id" element={<WidgetAnalytics />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/integrations/:integrationId/settings" element={<IntegrationSettings />} />
            <Route path="/woocommerce-orders" element={<WooCommerceOrders />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/testimonials" element={<TestimonialManagement />} />
            <Route path="/testimonials/builder/:formId?" element={<TestimonialFormBuilder />} />
            <Route path="/testimonials/email/:formId" element={<TestimonialEmailManager />} />
            <Route path="/testimonials/triggers/:formId" element={<TestimonialTriggers />} />
            <Route path="/testimonials/embeds" element={<TestimonialEmbeds />} />
            <Route path="/testimonials/embeds/:embedId" element={<TestimonialEmbedBuilderPage />} />
            <Route path="/testimonial-moderation" element={<TestimonialModeration />} />
            <Route path="/collect/:slug" element={<TestimonialCollection />} />
            <Route path="/embed/:embedId" element={<PublicTestimonialEmbed />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/account" element={<Account />} />
            <Route path="/team" element={<Team />} />
            <Route path="/ab-testing" element={<ABTesting />} />
            <Route path="/testimonials" element={<TestimonialModeration />} />
            <Route path="/moderation" element={<EventModeration />} />
            <Route path="/help" element={<Help />} />
            <Route path="/help/article/:slug" element={<HelpArticle />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
          </WebsiteProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
