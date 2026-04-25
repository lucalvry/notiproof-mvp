import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  MessageSquareQuote,
  MonitorSmartphone,
  Plug,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  Menu,
  Check,
  Plus,
  Building2,
  ChevronDown,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useIdleLogout } from "@/hooks/useIdleLogout";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/proof", label: "Proof", icon: MessageSquareQuote },
  { to: "/widgets", label: "Widgets", icon: MonitorSmartphone },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function BusinessSwitcher({ inline = false }: { inline?: boolean }) {
  const { businesses, currentBusinessId, setCurrentBusinessId, refresh } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const current = businesses.find((b) => b.id === currentBusinessId);

  const switchTo = (id: string) => {
    if (id === currentBusinessId) return;
    setCurrentBusinessId(id);
    queryClient.clear();
    // Force a clean reload so all scoped queries refetch.
    window.location.reload();
  };

  const createBusiness = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    const { data, error } = await supabase.rpc("create_business" as never, { _name: trimmed } as never);
    setCreating(false);
    if (error) return toast({ title: "Couldn't create business", description: error.message, variant: "destructive" });
    setName("");
    setCreateOpen(false);
    await refresh();
    if (typeof data === "string") setCurrentBusinessId(data);
    queryClient.clear();
    window.location.reload();
  };

  if (businesses.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={inline ? "w-full justify-start gap-2" : "gap-2 max-w-[180px]"}
          >
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate text-sm font-medium">
              {current?.name ?? "Select business"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs uppercase text-muted-foreground tracking-wider">
            Your businesses
          </DropdownMenuLabel>
          {businesses.map((b) => (
            <DropdownMenuItem key={b.id} onClick={() => switchTo(b.id)} className="gap-2">
              <Check className={`h-4 w-4 ${b.id === currentBusinessId ? "opacity-100" : "opacity-0"}`} />
              <span className="truncate">{b.name}</span>
              <span className="ml-auto text-[10px] uppercase text-muted-foreground">{b.role}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create another business
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new business</DialogTitle>
            <DialogDescription>You'll become the owner. You can switch between businesses anytime.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createBusiness} disabled={creating || !name.trim()}>
              {creating ? "Creating…" : "Create business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AppLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useIdleLogout();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-card sticky top-0 z-40">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 md:gap-8 min-w-0">
              {/* Mobile / tablet hamburger */}
              <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden -ml-2 p-2" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>
                      <Link to="/dashboard" onClick={() => setDrawerOpen(false)} className="text-xl font-bold tracking-tight text-primary">
                        Noti<span className="text-accent">Proof</span>
                      </Link>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="p-3 border-b">
                    <BusinessSwitcher inline />
                  </div>
                  <nav className="p-3 flex flex-col gap-1">
                    {nav.map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                            isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                          }`
                        }
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </NavLink>
                    ))}
                    {profile?.is_admin && (
                      <NavLink
                        to="/admin"
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                            isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                          }`
                        }
                      >
                        <Shield className="h-4 w-4" />
                        Admin
                      </NavLink>
                    )}
                  </nav>
                  <div className="p-3 border-t mt-auto">
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <Link to="/dashboard" className="text-xl font-bold tracking-tight text-primary shrink-0">
                Noti<span className="text-accent">Proof</span>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-1">
                {nav.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {/* Desktop business switcher */}
              <div className="hidden md:block">
                <BusinessSwitcher />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                      {(profile?.full_name || profile?.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden lg:inline text-sm">{profile?.full_name || profile?.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{profile?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings/account")}>
                    <Settings className="h-4 w-4 mr-2" /> My account
                  </DropdownMenuItem>
                  {profile?.is_admin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield className="h-4 w-4 mr-2" /> Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}
