import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Megaphone, BarChart, Settings, Menu, ChevronDown, Globe, User, MessageSquare, Plug, Plus, ListOrdered, Target, LogOut, Shield, ChevronUp, CheckCircle2, Circle, Sparkles, Compass, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useQueryClient } from "@tanstack/react-query";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useOnboarding, OnboardingProvider } from "@/hooks/useOnboarding";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { NotificationBell } from "@/components/notifications/NotificationBell";
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
  SheetHeader,
  SheetTitle,
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
  { label: "Impact Board", icon: Target, path: "/impact-board", section: "website" },
  { label: "Integrations", icon: Plug, path: "/integrations", section: "website" },
  { label: "Settings", icon: Settings, path: "/settings", section: "website" },
  { label: "All Websites", icon: Globe, path: "/websites", section: "global" },
  { label: "Support", icon: MessageSquare, path: "mailto:support@notiproof.com", section: "global" },
];

// Inner component that can use useOnboarding context
function AppLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [setupGuideOpen, setSetupGuideOpen] = useState(false);

  const { currentWebsite, setCurrentWebsite, websites, isLoading: websitesLoading } = useWebsiteContext();
  const { isLoading: subscriptionLoading } = useSubscription(user?.id);
  const { isLTD } = useSubscriptionStatus(user?.id);
  const { isSuperAdmin } = useSuperAdmin(user?.id);
  const queryClient = useQueryClient();

  const invalidateWebsiteQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
    queryClient.invalidateQueries({ queryKey: ['website-settings'] });
    queryClient.invalidateQueries({ queryKey: ['integrations'] });
    queryClient.invalidateQueries({ queryKey: ['playlists'] });
  };

  useEffect(() => {
    const checkAuthAndSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/login");
        setLoading(false);
        return;
      }

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

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('status')
        .eq('user_id', session.user.id)
        .in('status', ['active', 'trialing', 'lifetime', 'free'])
        .single();

      const urlParams = new URLSearchParams(window.location.search);
      const isPaymentVerification = urlParams.get('payment_success') === 'true' && urlParams.get('session_id');

      if (!subscription && location.pathname !== '/select-plan' && !isPaymentVerification) {
        toast.info("Please choose a plan to continue");
        navigate('/select-plan');
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    checkAuthAndSubscription();

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

  const handleNavClick = (item: NavItem) => {
    if (item.path.startsWith("mailto:")) {
      window.open(item.path, "_blank");
      setSidebarOpen(false);
      return;
    }
    handleNavigation(item.path);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Auto-select first website if none selected (must be before early returns)
  useEffect(() => {
    if (websites.length > 0 && !currentWebsite) {
      setCurrentWebsite(websites[0]);
    }
  }, [websites, currentWebsite, setCurrentWebsite]);

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

  const userInitial = (user.user_metadata?.name || user.email || "U").charAt(0).toUpperCase();
  const userName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
  const userEmail = user.email || "";

  // Website switcher component for sidebar
  const WebsiteSwitcher = () => {
    const hasWebsites = websites.length > 0;
    const displayDomain = currentWebsite?.domain || (hasWebsites ? websites[0].domain : null);

    return (
      <div className="px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full gap-2 border-dashed",
                sidebarCollapsed ? "justify-center px-2" : "justify-between"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && (
                  <span className="truncate text-sm">
                    {displayDomain || "Add Website"}
                  </span>
                )}
              </div>
              {!sidebarCollapsed && <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            {!hasWebsites ? (
              <DropdownMenuItem onClick={() => handleNavigation("/websites")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Website
              </DropdownMenuItem>
            ) : (
              <>
                {websites.map((website) => (
                  <DropdownMenuItem
                    key={website.id}
                    onClick={() => {
                      setCurrentWebsite(website);
                      invalidateWebsiteQueries();
                      toast.success(`Switched to ${website.domain}`);
                    }}
                    className={`${currentWebsite?.id === website.id ? "bg-accent" : ""} min-w-0`}
                  >
                    <Globe className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate">{website.domain}</span>
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
      </div>
    );
  };

  // User profile block for sidebar bottom
  const UserProfile = () => (
    <div className="border-t p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full gap-2",
              sidebarCollapsed ? "justify-center px-2" : "justify-between"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {userInitial}
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium truncate max-w-[140px]">{userName}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">{userEmail}</span>
                </div>
              )}
            </div>
            {!sidebarCollapsed && <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleNavigation("/account")}>
            <User className="h-4 w-4 mr-2" />
            Account Settings
          </DropdownMenuItem>
          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavigation("/admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Admin Panel
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const SidebarNav = () => (
    <div className="flex h-full flex-col">
      {/* Website Switcher */}
      <WebsiteSwitcher />

      <div className="flex-1 space-y-6 py-4 overflow-y-auto">
        {/* Website Section */}
        <div className="px-3">
          {!sidebarCollapsed && (
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Website
            </h3>
          )}
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
                    onClick={() => handleNavClick(item)}
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
          {!sidebarCollapsed && (
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Global
            </h3>
          )}
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
                    onClick={() => handleNavClick(item)}
                  >
                    <Icon className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Button>
                );
              })}
            {/* Setup Guide Nav Item */}
            <SetupGuideNavItem onOpen={() => setSetupGuideOpen(true)} sidebarCollapsed={sidebarCollapsed} />
          </nav>
        </div>
      </div>

      {/* User Profile at Bottom */}
      {/* User Profile at Bottom */}
      <UserProfile />
    </div>
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop Sidebar - Fixed */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed top-0 left-0 h-screen z-20 border-r bg-sidebar transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo & Collapse Toggle */}
        <div className="flex h-16 items-center justify-between border-b px-4 shrink-0">
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
        <SidebarNav />
      </aside>

      {/* Main Content - offset by sidebar width */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        {/* Header - Fixed */}
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
              <SidebarNav />
            </SheetContent>
          </Sheet>

          {/* Logo (mobile) */}
          <img src={logo} alt="NotiProof" className="h-8 lg:hidden" />

          <div className="flex-1" />

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <NotificationBell />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Reopenable Onboarding Flow */}
      {user?.id && showOnboardingWizard && (
        <OnboardingFlow userId={user.id} />
      )}

      {/* Setup Guide Slide-Out Sheet */}
      <SetupGuideSheet open={setupGuideOpen} onOpenChange={setSetupGuideOpen} />
    </div>
  );
}

// Setup Guide nav item that shows in the Global section
function SetupGuideNavItem({ onOpen, sidebarCollapsed }: { onOpen: () => void; sidebarCollapsed: boolean }) {
  const { progress, isLoading } = useOnboarding();
  const { websites } = useWebsiteContext();

  if (isLoading) return null;

  const milestones = {
    website_added: websites.length > 0 || progress.website_added,
    campaign_created: progress.campaign_created,
    widget_installed: progress.widget_installed,
    first_conversion: progress.first_conversion,
  };

  const completedCount = Object.values(milestones).filter(Boolean).length;
  const completionPercentage = Math.round((completedCount / 4) * 100);
  const isComplete = completionPercentage === 100;

  if (isComplete || progress.dismissed) return null;

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start relative",
        sidebarCollapsed && "justify-center px-2"
      )}
      onClick={onOpen}
    >
      <div className="relative">
        <Compass className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
        {sidebarCollapsed && (
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
            {completedCount}
          </span>
        )}
      </div>
      {!sidebarCollapsed && (
        <>
          <span className="flex-1 text-left">Setup Guide</span>
          <span className="ml-auto text-xs text-muted-foreground">{completionPercentage}%</span>
        </>
      )}
    </Button>
  );
}

// Setup Guide slide-out sheet
function SetupGuideSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { progress, isLoading, openOnboarding, dismissOnboarding } = useOnboarding();
  const { websites } = useWebsiteContext();

  if (isLoading) return null;

  const milestones = {
    website_added: websites.length > 0 || progress.website_added,
    campaign_created: progress.campaign_created,
    widget_installed: progress.widget_installed,
    first_conversion: progress.first_conversion,
  };

  const completedCount = Object.values(milestones).filter(Boolean).length;
  const completionPercentage = Math.round((completedCount / 4) * 100);

  const milestoneList = [
    { key: 'website_added', label: 'Add your website', completed: milestones.website_added },
    { key: 'campaign_created', label: 'Create a notification', completed: milestones.campaign_created },
    { key: 'widget_installed', label: 'Install the widget', completed: milestones.widget_installed },
    { key: 'first_conversion', label: 'Get your first conversion', completed: milestones.first_conversion },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Setup Guide
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completedCount} of 4 steps completed
            </p>
          </div>

          {/* Milestones */}
          <div className="space-y-3">
            {milestoneList.map((m) => (
              <div
                key={m.key}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                  m.completed ? "border-primary/20 bg-primary/5" : "border-border"
                )}
              >
                {m.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <span className={cn("text-sm", m.completed && "text-muted-foreground line-through")}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={() => {
                onOpenChange(false);
                openOnboarding();
              }}
              className="w-full gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Continue Setup
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => {
                dismissOnboarding();
                onOpenChange(false);
              }}
            >
              Dismiss guide
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <OnboardingProvider userId={user?.id}>
      <AppLayoutInner />
    </OnboardingProvider>
  );
}
