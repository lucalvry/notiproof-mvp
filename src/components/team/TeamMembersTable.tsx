import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Shield, Settings } from "lucide-react";
import { TeamMember, hasPermission } from "@/hooks/useTeamPermissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TeamPermissionsDialog } from "./TeamPermissionsDialog";
import { TeamWebsiteAccessDialog } from "./TeamWebsiteAccessDialog";

interface TeamMembersTableProps {
  members: TeamMember[];
  currentUserId?: string;
  currentMember?: TeamMember;
  onRefresh: () => void;
}

export function TeamMembersTable({ members, currentUserId, currentMember, onRefresh }: TeamMembersTableProps) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [websiteAccessDialogOpen, setWebsiteAccessDialogOpen] = useState(false);

  const canEditRoles = hasPermission(currentMember, 'team', 'edit_roles');
  const canRemoveMembers = hasPermission(currentMember, 'team', 'remove');

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success("Team member removed successfully");
      onRefresh();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error(error.message || "Failed to remove team member");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'editor': return 'outline';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Website Access</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No team members yet
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {member.profile?.name || 'Unknown'}
                  {member.user_id === currentUserId && (
                    <Badge variant="outline" className="ml-2">You</Badge>
                  )}
                </TableCell>
                <TableCell>{member.profile?.email || 'Unknown'}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(member.joined_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {member.website_access?.type === 'all' ? 'All Websites' : `${member.website_access?.website_ids?.length || 0} Sites`}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {member.role === 'owner' ? (
                    <Badge variant="outline">Owner</Badge>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEditRoles && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMember(member);
                                setPermissionsDialogOpen(true);
                              }}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Edit Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMember(member);
                                setWebsiteAccessDialogOpen(true);
                              }}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Website Access
                            </DropdownMenuItem>
                          </>
                        )}
                        {canRemoveMembers && member.user_id !== currentUserId && (
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id, member.profile?.name || 'this member')}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {selectedMember && (
        <>
          <TeamPermissionsDialog
            open={permissionsDialogOpen}
            onOpenChange={setPermissionsDialogOpen}
            member={selectedMember}
            onSuccess={onRefresh}
          />
          <TeamWebsiteAccessDialog
            open={websiteAccessDialogOpen}
            onOpenChange={setWebsiteAccessDialogOpen}
            member={selectedMember}
            onSuccess={onRefresh}
          />
        </>
      )}
    </>
  );
}
