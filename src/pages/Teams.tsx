import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Settings, Crown, Shield, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Organization {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  role: string;
  member_count: number;
}

const Teams: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  });

  useEffect(() => {
    if (profile?.id) {
      loadOrganizations();
    }
  }, [profile]);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('team_members')
        .select(`
          role,
          organization:organizations(
            id,
            name,
            slug,
            avatar_url,
            created_by,
            created_at
          )
        `)
        .eq('user_id', profile?.id);

      if (error) throw error;

      // Get member counts for each org
      const orgsWithCounts = await Promise.all(
        data.map(async (item: any) => {
          const { count } = await (supabase as any)
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', item.organization.id);

          return {
            ...item.organization,
            role: item.role,
            member_count: count || 0
          };
        })
      );

      setOrganizations(orgsWithCounts);
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create organization
      const { data: org, error: orgError } = await (supabase as any)
        .from('organizations')
        .insert({
          name: formData.name,
          slug: formData.slug,
          created_by: profile?.id
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add creator as owner
      const { error: memberError } = await (supabase as any)
        .from('team_members')
        .insert({
          organization_id: org.id,
          user_id: profile?.id,
          role: 'owner',
          joined_at: new Date().toISOString()
        });

      if (memberError) throw memberError;

      toast({
        title: "Success",
        description: "Team created successfully",
      });

      setIsDialogOpen(false);
      setFormData({ name: '', slug: '' });
      loadOrganizations();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: error.message.includes('duplicate') 
          ? "Team name or slug already exists" 
          : "Failed to create team",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'member': return <Users className="h-4 w-4" />;
      case 'viewer': return <Eye className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'member': return 'outline';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-3">
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-10 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground">
            Collaborate with your team members on widgets and campaigns
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a team to collaborate with others on your widgets and campaigns.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');
                    setFormData(prev => ({ ...prev, name, slug }));
                  }}
                  placeholder="e.g., Marketing Team"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Team Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g., marketing-team"
                  pattern="[a-z0-9-]+"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Only lowercase letters, numbers, and hyphens allowed
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!formData.name || !formData.slug}>
                  Create Team
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>No Teams Yet</CardTitle>
            <CardDescription>
              Create or join a team to collaborate with others on your social proof campaigns.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {org.avatar_url ? (
                      <img 
                        src={org.avatar_url} 
                        alt={org.name}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <CardDescription>@{org.slug}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={getRoleBadgeVariant(org.role)} className="flex items-center gap-1">
                    {getRoleIcon(org.role)}
                    {org.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{org.member_count} member{org.member_count !== 1 ? 's' : ''}</span>
                    <span>Created {new Date(org.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <Link to={`/dashboard/teams/${org.id}`}>
                        View Team
                      </Link>
                    </Button>
                    {(org.role === 'owner' || org.role === 'admin') && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/dashboard/teams/${org.id}/settings`}>
                          <Settings className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Teams;