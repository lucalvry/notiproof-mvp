import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, Eye, Ban, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  avatar_url: string | null;
  role: string;
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

  useEffect(() => {
    if (!authLoading) {
      fetchUsers();
    }
  }, [authLoading]);

  const fetchUsers = async () => {
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name");
      
      if (profilesError) throw profilesError;

      const combinedUsers = authUsers.users.map((authUser) => {
        const profile = profiles?.find((p) => p.id === authUser.id);
        return {
          id: authUser.id,
          email: authUser.email || "",
          name: profile?.name || authUser.email || "Unknown",
          created_at: authUser.created_at,
          avatar_url: null,
          role: "user",
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
      await supabase.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      await logAdminAction("suspend_user", userId, { reason: "Admin action" });
      toast.success("User suspended successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error suspending user:", error);
      toast.error("Failed to suspend user");
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
      await logAdminAction("reactivate_user", userId, { reason: "Admin action" });
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
                    <h3 className="font-medium mb-2">Roles</h3>
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
    </div>
  );
}
