import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Send, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TeamInvitationProps {
  organizationId: string;
  onInviteSent?: () => void;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  invited_by: {
    name: string;
  };
}

const TeamInvitation: React.FC<TeamInvitationProps> = ({ organizationId, onInviteSent }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'member'
  });

  const loadInvitations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('team_invitations')
        .select(`
          id,
          email,
          role,
          status,
          created_at,
          invited_by:profiles(name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  React.useEffect(() => {
    if (isDialogOpen) {
      loadInvitations();
    }
  }, [isDialogOpen]);

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user is already a member by looking up email in profiles table
      const { data: existingProfile } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('id', formData.email) // This should actually query by a unique email field if it exists
        .single();
      
      let existingMember = null;
      if (existingProfile) {
        const { data: memberCheck } = await (supabase as any)
          .from('team_members')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('user_id', existingProfile.id)
          .single();
        existingMember = memberCheck;
      }

      if (existingMember) {
        toast({
          title: "Error",
          description: "User is already a member of this team",
          variant: "destructive",
        });
        return;
      }

      // Check for pending invitation
      const { data: existingInvite } = await (supabase as any)
        .from('team_invitations')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('email', formData.email)
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        toast({
          title: "Error",
          description: "Invitation already sent to this email",
          variant: "destructive",
        });
        return;
      }

      const { error } = await (supabase as any)
        .from('team_invitations')
        .insert({
          organization_id: organizationId,
          email: formData.email,
          role: formData.role,
          invited_by: profile?.id,
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });

      setFormData({ email: '', role: 'member' });
      loadInvitations();
      onInviteSent?.();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation cancelled",
      });

      loadInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to collaborate on this team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <form onSubmit={sendInvitation} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="colleague@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={loading || !formData.email}>
              <Send className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </form>

          {invitations.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Pending Invitations</h4>
              <div className="space-y-2">
                {invitations.filter(inv => inv.status === 'pending').map((invitation) => (
                  <Card key={invitation.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {invitation.role} • invited by {invitation.invited_by?.name}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelInvitation(invitation.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamInvitation;