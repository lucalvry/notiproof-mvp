import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, UserPlus, Lock, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTeamMembers, useUserOrganizations, hasPermission } from "@/hooks/useTeamPermissions";
import { TeamInviteDialog } from "@/components/team/TeamInviteDialog";
import { TeamMembersTable } from "@/components/team/TeamMembersTable";
import { TeamActivityLog } from "@/components/team/TeamActivityLog";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

export default function Team() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>();
  const [selectedOrgId, setSelectedOrgId] = useState<string>();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { subscription } = useSubscription(userId);
  const { data: organizations } = useUserOrganizations(userId);
  const { data: members, refetch: refetchMembers } = useTeamMembers(selectedOrgId);

  const isProPlan = subscription?.plan?.name?.toLowerCase().includes('pro') || false;
  const currentMember = members?.find(m => m.user_id === userId);
  const canInvite = hasPermission(currentMember, 'team', 'invite');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrgId) {
      setSelectedOrgId(organizations[0].organization_id);
    }
  }, [organizations, selectedOrgId]);

  if (!isProPlan) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Collaboration</h1>
          <p className="text-muted-foreground">
            Invite team members and manage permissions
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Lock className="h-16 w-16 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Pro+ Feature</h3>
              <p className="text-muted-foreground max-w-md">
                Team collaboration allows you to invite team members with granular permissions
                and manage access to campaigns, analytics, and more. Upgrade to Pro+ to unlock this feature.
              </p>
            </div>
            <Button onClick={() => navigate('/billing')} size="lg">
              Upgrade to Pro+
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organizations || organizations.length === 0) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Collaboration</h1>
          <p className="text-muted-foreground">
            Invite team members and manage permissions
          </p>
        </div>

        <Alert>
          <AlertDescription>
            You need to create an organization first to manage team members.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedOrg = organizations.find(o => o.organization_id === selectedOrgId);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Collaboration</h1>
          <p className="text-muted-foreground">
            Manage your team members and their permissions
          </p>
        </div>
        {canInvite && (
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Organization Selector */}
      {organizations.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {organizations.map((org) => (
                <Button
                  key={org.organization_id}
                  variant={selectedOrgId === org.organization_id ? "default" : "outline"}
                  onClick={() => setSelectedOrgId(org.organization_id)}
                >
                  {(org.organization as any)?.name || 'Unknown'}
                  <Badge variant="secondary" className="ml-2">
                    {org.role}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{currentMember?.role || 'Member'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organization</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {(selectedOrg?.organization as any)?.name || 'Unknown'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Management Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <TeamMembersTable
            members={members || []}
            currentUserId={userId}
            currentMember={currentMember}
            onRefresh={refetchMembers}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <TeamActivityLog organizationId={selectedOrgId} />
        </TabsContent>
      </Tabs>

      <TeamInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        organizationId={selectedOrgId}
        organizationName={(selectedOrg?.organization as any)?.name || 'Unknown'}
        onSuccess={refetchMembers}
      />
    </div>
  );
}
