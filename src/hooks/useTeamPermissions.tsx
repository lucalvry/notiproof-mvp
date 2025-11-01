import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamPermissions {
  campaigns: { create: boolean; edit: boolean; delete: boolean; view: boolean };
  widgets: { create: boolean; edit: boolean; delete: boolean; view: boolean };
  analytics: { view: boolean; export: boolean };
  integrations: { create: boolean; edit: boolean; delete: boolean; view: boolean };
  team: { invite: boolean; remove: boolean; edit_roles: boolean; view: boolean };
  billing: { view: boolean; manage: boolean };
}

export interface TeamMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'member';
  permissions: TeamPermissions;
  website_access: {
    type: 'all' | 'specific';
    website_ids: string[];
  };
  joined_at: string;
  invited_by: string;
  profile?: {
    name: string;
    email: string;
  };
}

export function useTeamPermissions(userId?: string, organizationId?: string) {
  return useQuery({
    queryKey: ['team-permissions', userId, organizationId],
    queryFn: async () => {
      if (!userId || !organizationId) return null;

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profile:profiles!user_id(name, email)
        `)
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;
      return data as unknown as TeamMember;
    },
    enabled: !!userId && !!organizationId,
  });
}

export function useTeamMembers(organizationId?: string) {
  return useQuery({
    queryKey: ['team-members', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profile:profiles!user_id(name, email)
        `)
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data as unknown as TeamMember[];
    },
    enabled: !!organizationId,
  });
}

export function useUserOrganizations(userId?: string) {
  return useQuery({
    queryKey: ['user-organizations', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          organization_id,
          role,
          organization:organizations(*)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function hasPermission(
  member: TeamMember | null | undefined,
  resource: keyof TeamPermissions,
  action: string
): boolean {
  if (!member?.permissions) return false;
  return (member.permissions[resource] as any)?.[action] === true;
}
