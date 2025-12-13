import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamMember, TeamPermissions } from "@/hooks/useTeamPermissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield } from "lucide-react";

interface TeamPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember;
  onSuccess: () => void;
}

export function TeamPermissionsDialog({ open, onOpenChange, member, onSuccess }: TeamPermissionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'owner' | 'admin' | 'editor' | 'viewer' | 'member'>(member.role);
  const [permissions, setPermissions] = useState<TeamPermissions>(member.permissions);

  useEffect(() => {
    if (open) {
      setRole(member.role);
      setPermissions(member.permissions);
    }
  }, [open, member]);

  const handleRoleChange = async (newRole: string) => {
    const typedRole = newRole as 'owner' | 'admin' | 'editor' | 'viewer' | 'member';
    setRole(typedRole);
    
    // Fetch default permissions for the new role
    const { data, error } = await supabase.rpc('get_default_permissions_for_role', {
      _role: typedRole
    });

    if (!error && data) {
      setPermissions(data as unknown as TeamPermissions);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          role,
          permissions: permissions as any,
        })
        .eq('id', member.id);

      if (error) throw error;

      toast.success("Permissions updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating permissions:", error);
      toast.error(error.message || "Failed to update permissions");
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = (resource: keyof TeamPermissions, action: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [resource]: {
        ...prev[resource],
        [action]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Permissions - {member.profile?.name}</DialogTitle>
          <DialogDescription>
            Customize role and granular permissions for this team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full access (except owner privileges)</SelectItem>
                <SelectItem value="editor">Editor - Create and edit content</SelectItem>
                <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                <SelectItem value="member">Member - Standard access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Granular Permissions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <Label className="text-base font-semibold">Granular Permissions</Label>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Campaigns</CardTitle>
                <CardDescription>Manage campaign access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="campaigns-view">View Campaigns</Label>
                  <Switch
                    id="campaigns-view"
                    checked={permissions.campaigns.view}
                    onCheckedChange={(checked) => updatePermission('campaigns', 'view', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="campaigns-create">Create Notifications</Label>
                  <Switch
                    id="campaigns-create"
                    checked={permissions.campaigns.create}
                    onCheckedChange={(checked) => updatePermission('campaigns', 'create', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="campaigns-edit">Edit Notifications</Label>
                  <Switch
                    id="campaigns-edit"
                    checked={permissions.campaigns.edit}
                    onCheckedChange={(checked) => updatePermission('campaigns', 'edit', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="campaigns-delete">Delete Notifications</Label>
                  <Switch
                    id="campaigns-delete"
                    checked={permissions.campaigns.delete}
                    onCheckedChange={(checked) => updatePermission('campaigns', 'delete', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Analytics</CardTitle>
                <CardDescription>Analytics and reporting access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="analytics-view">View Analytics</Label>
                  <Switch
                    id="analytics-view"
                    checked={permissions.analytics.view}
                    onCheckedChange={(checked) => updatePermission('analytics', 'view', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="analytics-export">Export Reports</Label>
                  <Switch
                    id="analytics-export"
                    checked={permissions.analytics.export}
                    onCheckedChange={(checked) => updatePermission('analytics', 'export', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Team Management</CardTitle>
                <CardDescription>Team collaboration permissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="team-invite">Invite Members</Label>
                  <Switch
                    id="team-invite"
                    checked={permissions.team.invite}
                    onCheckedChange={(checked) => updatePermission('team', 'invite', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="team-remove">Remove Members</Label>
                  <Switch
                    id="team-remove"
                    checked={permissions.team.remove}
                    onCheckedChange={(checked) => updatePermission('team', 'remove', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="team-edit-roles">Edit Roles</Label>
                  <Switch
                    id="team-edit-roles"
                    checked={permissions.team.edit_roles}
                    onCheckedChange={(checked) => updatePermission('team', 'edit_roles', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
