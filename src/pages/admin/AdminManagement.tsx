import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleManagementDialog } from "@/components/admin/RoleManagementDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, Clock } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  granted_at: string;
}

export default function AdminManagement() {
  const { loading: authLoading } = useAdminAuth();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [recentActions, setRecentActions] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading) {
      fetchAdminUsers();
      fetchRecentActions();
    }
  }, [authLoading]);

  const fetchAdminUsers = async () => {
    try {
      setLoading(true);

      // Fetch all users with admin, moderator, or support roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, granted_at")
        .in("role", ["admin", "superadmin", "moderator", "support"]);

      if (rolesError) throw rolesError;

      // Get unique user IDs
      const userIds = [...new Set(userRoles?.map((r) => r.user_id) || [])];

      // Fetch user details via admin edge function
      const { data: usersData, error: usersError } = await supabase.functions.invoke('admin-user-actions', {
        method: 'GET',
      });

      if (usersError) throw usersError;

      // Combine data
      const adminUsersList = userIds.map((userId) => {
        const user = usersData.users.find((u: any) => u.id === userId);
        const roles = userRoles?.filter((r) => r.user_id === userId) || [];
        const oldestRole = roles.sort((a, b) => 
          new Date(a.granted_at).getTime() - new Date(b.granted_at).getTime()
        )[0];

        return {
          id: userId,
          name: user?.name || "Unknown",
          email: user?.email || "Unknown",
          roles: roles.map((r) => r.role),
          granted_at: oldestRole?.granted_at || new Date().toISOString(),
        };
      });

      setAdminUsers(adminUsersList);
    } catch (error: any) {
      console.error("Error fetching admin users:", error);
      toast.error("Failed to fetch admin users");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActions = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentActions(data || []);
    } catch (error) {
      console.error("Error fetching recent actions:", error);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "superadmin":
        return "destructive";
      case "admin":
        return "default";
      case "moderator":
        return "secondary";
      case "support":
        return "outline";
      default:
        return "outline";
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Management</h1>
        <p className="text-muted-foreground">
          Manage administrators, moderators, and support staff
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adminUsers.filter((u) => u.roles.includes("admin") || u.roles.includes("superadmin")).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moderators</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adminUsers.filter((u) => u.roles.includes("moderator")).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support Staff</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adminUsers.filter((u) => u.roles.includes("support")).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>All users with elevated permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.map((role) => (
                        <Badge key={role} variant={getRoleBadgeVariant(role)}>
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(user.granted_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setSelectedUserName(user.name);
                        setRoleDialogOpen(true);
                      }}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Roles
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Actions</CardTitle>
          <CardDescription>Last 10 admin activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{action.action.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-muted-foreground">
                      {action.resource_type}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(action.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <RoleManagementDialog
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          userId={selectedUserId}
          userName={selectedUserName}
          onSuccess={() => {
            fetchAdminUsers();
            fetchRecentActions();
          }}
        />
      )}
    </div>
  );
}
