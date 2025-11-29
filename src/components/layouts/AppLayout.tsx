import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Megaphone, BarChart, Settings, Menu, X, ChevronDown, Globe, CreditCard, User, HelpCircle, FileText, MessageSquare, Plug, Layout, Users, Plus, ListOrdered, Sliders } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SetupGuideButton } from "@/components/onboarding/SetupGuideButton";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import logo from "@/assets/NotiProof_Logo.png";

interface NavItem {
  label: string;
  icon: any;
  path: string;
  section: "website" | "global";
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", section: "website" },
  { label: "Notifications", icon: Megaphone, path: "/campaigns", section: "website" },
  { label: "Playlists", icon: ListOrdered, path: "/playlists", section: "website" },
  { label: "Analytics", icon: BarChart, path: "/analytics", section: "website" },
  { label: "Testimonials", icon: MessageSquare, path: "/testimonials", section: "website" },
  { label: "Weights", icon: Sliders, path: "/notification-weights", section: "website" },
  { label: "Rules", icon: Layout, path: "/rules", section: "website" },
  { label: "Settings", icon: Settings, path: "/settings", section: "website" },
  { label: "All Websites", icon: Globe, path: "/websites", section: "global" },
  { label: "Team", icon: Users, path: "/team", section: "global" },
  { label: "Billing", icon: CreditCard, path: "/billing", section: "global" },
  { label: "Account", icon: User, path: "/account", section: "global" },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);

  // Real data from contexts and hooks
  const { currentWebsite, setCurrentWebsite, websites, isLoading: websitesLoading } = useWebsiteContext();
  const { sitesAllowed, planName, isBusinessPlan, isLoading: subscriptionLoading } = useSubscription(user?.id);
  const { isSuperAdmin } = useSuperAdmin(user?.id);
  const sitesUsed = websites.length;

  useEffect(() => {
    const checkAuthAndSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/login");
        setLoading(false);
        return;
      }

      // FIX: Enforce email verification
      const emailVerified = session.user.email_confirmed_at || session.user.user_metadata?.email_verified;
      if (!emailVerified && location.pathname !== '/account') {
        toast.error("Please verify your email address to continue", {
          description: "Check your inbox for the verification link",
          duration: 10000,
        });
        navigate('/account');
        setLoading(false);
        return;
      }

      // Check if user has active subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('status')
        .eq('user_id', session.user.id)
        .in('status', ['active', 'trialing'])
        .single();

      // Allow dashboard access if coming from Stripe checkout (payment verification in progress)
      const urlParams = new URLSearchParams(window.location.search);
      const isPaymentVerification = urlParams.get('payment_success') === 'true' && urlParams.get('session_id');

      // If no active subscription, redirect to plan selection (unless verifying payment)
      if (!subscription && location.pathname !== '/select-plan' && !isPaymentVerification) {
        toast.info("Please choose a plan to continue");
        navigate('/select-plan');
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    checkAuthAndSubscription();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session && location.pathname !== "/login") {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const handleNavigation = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading || websitesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 py-6">
        {/* Website Section */}
        <div className="px-3">
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Website
          </h3>
          <nav className="space-y-1">
            {navItems
              .filter((item) => item.section === "website")
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <Icon className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Button>
                );
              })}
          </nav>
        </div>

        {/* Global Section */}
        <div className="px-3">
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Global
          </h3>
          <nav className="space-y-1">
            {navItems
              .filter((item) => item.section === "global")
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <Icon className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Button>
                );
              })}
          </nav>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t p-3">
        <nav className="space-y-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start",
              sidebarCollapsed && "justify-center px-2"
            )}
            onClick={() => handleNavigation("/help")}
          >
            <HelpCircle className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
            {!sidebarCollapsed && <span>Help</span>}
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start",
              sidebarCollapsed && "justify-center px-2"
            )}
          >
            <FileText className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
            {!sidebarCollapsed && <span>Docs</span>}
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start",
              sidebarCollapsed && "justify-center px-2"
            )}
          >
            <MessageSquare className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
            {!sidebarCollapsed && <span>Feedback</span>}
          </Button>
        </nav>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:block border-r bg-sidebar transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!sidebarCollapsed && (
            <img src={logo} alt="NotiProof" className="h-8" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          {/* Mobile Menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-16 items-center border-b px-4">
                <img src={logo} alt="NotiProof" className="h-8" />
              </div>
              <SidebarContent />
            </SheetContent>
          </Sheet>

          {/* Logo (mobile) */}
          <img src={logo} alt="NotiProof" className="h-8 lg:hidden" />

          <div className="flex-1" />

          {/* Global Actions */}
          <div className="flex items-center gap-2">
            {/* Setup Guide Button */}
            {user?.id && (
              <SetupGuideButton 
                userId={user.id} 
                onOpenWizard={() => setShowOnboardingWizard(true)} 
              />
            )}

            {/* Website Selector - Links to All Websites in Global section */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="hidden md:inline">
                    {currentWebsite?.domain || "Select Website"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {!websitesLoading && websites.length === 0 ? (
                  <DropdownMenuItem onClick={() => handleNavigation("/websites")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Website
                  </DropdownMenuItem>
                ) : (
                  <>
                    {websites.map((website) => (
                      <DropdownMenuItem
                        key={website.id}
                        onClick={() => setCurrentWebsite(website)}
                        className={currentWebsite?.id === website.id ? "bg-accent" : ""}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        {website.domain}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNavigation("/websites")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Website
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Usage Meter - Links to Billing in Global section */}
            {websitesLoading || subscriptionLoading ? (
              <div className="hidden items-center gap-2 md:flex">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavigation("/billing")}
                  className="gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">
                    {sitesUsed} / {sitesAllowed} sites
                  </span>
                  <span className="text-xs text-muted-foreground">({planName})</span>
                </Button>
                {!isSuperAdmin && (!isBusinessPlan || sitesUsed >= sitesAllowed * 0.8) && (
                  <Button size="sm" variant="default" onClick={() => handleNavigation("/billing")}>
                    Upgrade
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleNavigation("/account")}>
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Reopenable Onboarding Wizard */}
      {user?.id && (
        <OnboardingWizard
          open={showOnboardingWizard}
          onComplete={() => setShowOnboardingWizard(false)}
          planName={planName}
          userId={user.id}
        />
      )}
    </div>
  );
}
