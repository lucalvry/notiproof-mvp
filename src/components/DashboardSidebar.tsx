import { 
  Home, 
  Blocks, 
  Plus,
  Code,
  Settings,
  Plug,
  CreditCard,
  Calendar,
  Share2,
  Shield,
  Users,
  Layout,
  Activity
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const currentPath = location.pathname;

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";

  const userItems = [
    { title: "Overview", url: "/dashboard", icon: Home, exact: true },
    { title: "Widgets", url: "/dashboard/widgets", icon: Blocks },
    { title: "Create Widget", url: "/dashboard/widgets/create", icon: Plus },
    { title: "Events", url: "/dashboard/events", icon: Activity },
    { title: "Campaigns", url: "/dashboard/campaigns", icon: Calendar },
    { title: "Social Connectors", url: "/dashboard/social-connectors", icon: Share2 },
    { title: "Moderation", url: "/dashboard/moderation", icon: Shield },
    { title: "Teams", url: "/dashboard/teams", icon: Users },
    { title: "Templates", url: "/dashboard/templates", icon: Layout },
    { title: "Installation", url: "/dashboard/installation", icon: Code },
    { title: "Integrations", url: "/dashboard/integrations", icon: Plug },
    { title: "Billing", url: "/dashboard/billing", icon: CreditCard },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ];

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.exact} 
                      className={getNavCls}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}