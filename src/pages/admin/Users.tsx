import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RoleManagementDialog } from "@/components/admin/RoleManagementDialog";
import { ExtendTrialDialog } from "@/components/admin/ExtendTrialDialog";
import { AssignPlanDialog } from "@/components/admin/AssignPlanDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, Eye, Ban, CheckCircle, Shield, Clock, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  avatar_url: string | null;
  role: string;
  subscription?: any;
}

interface UserDetails extends UserProfile {
  websites: any[];
  campaigns: any[];
  roles: any[];
  widgets?: any[];
  totalViews?: number;
  totalClicks?: number;
}

export default function AdminUsers() {
  const { loading: authLoading } = useAdminAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [extendTrialDialogOpen, setExtendTrialDialogOpen] = useState(false);
  const [assignPlanDialogOpen, setAssignPlanDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      fetchUsers();
    }
  }, [authLoading]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-actions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      // Fetch ALL subscription data for users (not just active)
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select(`
          user_id,
          status,
          trial_end,
          plan:subscription_plans(
            name,
            price_monthly
          )
        `);

      const combinedUsers = data.users.map((user: any) => {
        const userSub = subscriptions?.find((sub: any) => sub.user_id === user.id);
        
        // Determine subscription status label
        let subStatus = 'none';
        if (userSub) {
          if (userSub.status === 'active') subStatus = 'active';
          else if (userSub.status === 'trialing') {
            const isExpired = userSub.trial_end && new Date(userSub.trial_end) < new Date();
            subStatus = isExpired ? 'expired' : 'trialing';
          }
          else if (userSub.status === 'past_due') subStatus = 'past_due';
          else if (userSub.status === 'cancelled') subStatus = 'cancelled';
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at,
          avatar_url: null,
          role: "user",
          subscription: userSub || null,
          subscriptionStatus: subStatus,
        };
      });

      setUsers(combinedUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const viewUserDetails = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const [websitesRes, campaignsRes, rolesRes, widgetsRes, eventsRes] = await Promise.all([
        supabase.from("websites").select("*").eq("user_id", userId),
        supabase.from("campaigns").select("*").eq("user_id", userId),
        supabase.from("user_roles").select("*").eq("user_id", userId),
        supabase.from("widgets").select("*, websites(name)").eq("user_id", userId),
        supabase.from("events").select("views, clicks, created_at").in(
          "widget_id",
          (await supabase.from("widgets").select("id").eq("user_id", userId)).data?.map(w => w.id) || []
        ),
      ]);

      const totalViews = eventsRes.data?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
      const totalClicks = eventsRes.data?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;

      setSelectedUser({
        ...user,
        websites: websitesRes.data || [],
        campaigns: campaignsRes.data || [],
        roles: rolesRes.data || [],
        widgets: widgetsRes.data || [],
        totalViews,
        totalClicks,
      });
      setSheetOpen(true);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to fetch user details");
    }
  };

  const logAdminAction = async (action: string, resourceId: string, details: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action,
      resource_type: "user",
      resource_id: resourceId,
      details,
    });
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-user-actions', {
        body: { action: 'suspend-user', userId },
      });
      
      if (error) throw error;
      
      toast.success("User suspended successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error suspending user:", error);
      toast.error("Failed to suspend user");
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-user-actions', {
        body: { action: 'reactivate-user', userId },
      });
      
      if (error) throw error;
      
      toast.success("User reactivated successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error reactivating user:", error);
      toast.error("Failed to reactivate user");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage all platform users and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>{filteredUsers.length} total users</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {user.subscription?.plan?.name || 'No Plan'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        (user as any).subscriptionStatus === 'active' ? 'default' :
                        (user as any).subscriptionStatus === 'trialing' ? 'outline' :
                        (user as any).subscriptionStatus === 'past_due' ? 'destructive' :
                        (user as any).subscriptionStatus === 'expired' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {(user as any).subscriptionStatus === 'none' ? 'No Subscription' :
                       (user as any).subscriptionStatus === 'past_due' ? 'Payment Failed' :
                       (user as any).subscriptionStatus?.charAt(0).toUpperCase() + (user as any).subscriptionStatus?.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => viewUserDetails(user.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSuspendUser(user.id)}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedUser.name}</SheetTitle>
                <SheetDescription>{selectedUser.email}</SheetDescription>
              </SheetHeader>
              <Tabs defaultValue="profile" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="websites">Websites</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="profile" className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">User Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">User ID:</span>
                        <span className="font-mono text-xs">{selectedUser.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Role:</span>
                        <Badge variant="outline">{selectedUser.role}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span>{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Subscription</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Plan:</span>
                        <span className="font-bold">
                          {selectedUser.subscription?.plan?.name || 'Free'}
                        </span>
                      </div>
                      {selectedUser.subscription?.plan?.price_monthly > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monthly Price:</span>
                          <span className="font-bold">
                            ${selectedUser.subscription.plan.price_monthly}
                          </span>
                        </div>
                      )}
                      {selectedUser.subscription?.trial_end && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trial Ends:</span>
                          <span className={`font-bold ${new Date(selectedUser.subscription.trial_end) < new Date() ? 'text-destructive' : ''}`}>
                            {new Date(selectedUser.subscription.trial_end).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExtendTrialDialogOpen(true)}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Extend Trial
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAssignPlanDialogOpen(true)}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Assign Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Platform Metrics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Views:</span>
                        <span className="font-bold">{selectedUser.totalViews?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Clicks:</span>
                        <span className="font-bold">{selectedUser.totalClicks?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Widgets:</span>
                        <span className="font-bold">{selectedUser.widgets?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Campaigns:</span>
                        <span className="font-bold">{selectedUser.campaigns.length}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Roles</h3>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setRoleDialogOpen(true)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Manage Roles
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedUser.roles.length > 0 ? (
                        selectedUser.roles.map((role) => (
                          <Badge key={role.id}>{role.role}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No special roles</span>
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="websites" className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Websites ({selectedUser.websites.length})</h3>
                    {selectedUser.websites.length > 0 ? (
                      selectedUser.websites.map((website) => (
                        <div key={website.id} className="border rounded-lg p-3 mb-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{website.name}</div>
                              <div className="text-sm text-muted-foreground">{website.domain}</div>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline">{website.status}</Badge>
                              {website.is_verified && <Badge variant="default">Verified</Badge>}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground py-4">No websites yet</p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Widgets ({selectedUser.widgets?.length || 0})</h3>
                    {selectedUser.widgets && selectedUser.widgets.length > 0 ? (
                      selectedUser.widgets.map((widget) => (
                        <div key={widget.id} className="border rounded-lg p-3 mb-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{widget.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {widget.websites?.name || 'Unknown website'}
                              </div>
                            </div>
                            <Badge variant={widget.status === 'active' ? 'default' : 'outline'}>
                              {widget.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground py-4">No widgets yet</p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="activity" className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Recent Activity</h3>
                    <p className="text-sm text-muted-foreground">
                      Activity logs will appear here
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {selectedUser && (
        <>
          <RoleManagementDialog
            open={roleDialogOpen}
            onOpenChange={setRoleDialogOpen}
            userId={selectedUser.id}
            userName={selectedUser.name || "Unknown"}
            onSuccess={() => {
              viewUserDetails(selectedUser.id);
              fetchUsers();
            }}
          />
          <ExtendTrialDialog
            open={extendTrialDialogOpen}
            onOpenChange={setExtendTrialDialogOpen}
            userId={selectedUser.id}
            userName={selectedUser.name || "Unknown"}
            currentTrialEnd={selectedUser.subscription?.trial_end}
            onSuccess={() => {
              viewUserDetails(selectedUser.id);
              fetchUsers();
            }}
          />
          <AssignPlanDialog
            open={assignPlanDialogOpen}
            onOpenChange={setAssignPlanDialogOpen}
            userId={selectedUser.id}
            userName={selectedUser.name || "Unknown"}
            currentPlanName={selectedUser.subscription?.plan?.name}
            onSuccess={() => {
              viewUserDetails(selectedUser.id);
              fetchUsers();
            }}
          />
        </>
      )}
    </div>
  );
}
