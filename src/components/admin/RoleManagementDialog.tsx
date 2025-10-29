import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/auditLog";
import { Shield, Trash2 } from "lucide-react";

interface RoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onSuccess: () => void;
}

const availableRoles = [
  { value: "user", label: "User", description: "Standard user access" },
  { value: "moderator", label: "Moderator", description: "Can moderate content" },
  { value: "support", label: "Support", description: "Can access support features" },
  { value: "admin", label: "Admin", description: "Full administrative access" },
  { value: "superadmin", label: "Superadmin", description: "Complete system access" },
];

export function RoleManagementDialog({ open, onOpenChange, userId, userName, onSuccess }: RoleManagementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [currentRoles, setCurrentRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open && userId) {
      fetchUserRoles();
    }
  }, [open, userId]);

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      setCurrentRoles(data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to load user roles");
    }
  };

  const handleAssignRole = async () => {
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if role already exists
      if (currentRoles.some(r => r.role === selectedRole)) {
        toast.error("User already has this role");
        return;
      }

      const { error } = await supabase
        .from("user_roles")
        .insert([{
          user_id: userId,
          role: selectedRole as "admin" | "superadmin" | "support" | "user" | "moderator",
          granted_by: user.id,
        }]);

      if (error) throw error;

      await logAdminAction({
        action: "assign_role",
        resourceType: "user_role",
        resourceId: userId,
        details: {
          role: selectedRole,
          reason: reason || "No reason provided",
          target_user_name: userName,
        },
      });

      toast.success(`${selectedRole} role assigned successfully`);
      setSelectedRole("");
      setReason("");
      fetchUserRoles();
      onSuccess();
    } catch (error: any) {
      console.error("Error assigning role:", error);
      toast.error(error.message || "Failed to assign role");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to revoke the ${roleName} role from ${userName}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      await logAdminAction({
        action: "revoke_role",
        resourceType: "user_role",
        resourceId: userId,
        details: {
          role: roleName,
          target_user_name: userName,
        },
      });

      toast.success(`${roleName} role revoked successfully`);
      fetchUserRoles();
      onSuccess();
    } catch (error: any) {
      console.error("Error revoking role:", error);
      toast.error(error.message || "Failed to revoke role");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Roles for {userName}</DialogTitle>
          <DialogDescription>
            Assign or revoke administrative roles for this user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Roles */}
          <div className="space-y-2">
            <Label>Current Roles</Label>
            {currentRoles.length > 0 ? (
              <div className="space-y-2">
                {currentRoles.map((userRole) => (
                  <div key={userRole.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <Badge>{userRole.role}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Granted {new Date(userRole.granted_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevokeRole(userRole.id, userRole.role)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No special roles assigned</p>
            )}
          </div>

          {/* Assign New Role */}
          <div className="space-y-4 border-t pt-4">
            <Label htmlFor="role">Assign New Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem 
                    key={role.value} 
                    value={role.value}
                    disabled={currentRoles.some(r => r.role === role.value)}
                  >
                    <div>
                      <div className="font-medium">{role.label}</div>
                      <div className="text-xs text-muted-foreground">{role.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this role being assigned?"
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleAssignRole} disabled={loading || !selectedRole}>
            {loading ? "Assigning..." : "Assign Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}