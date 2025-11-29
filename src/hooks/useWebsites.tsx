import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isValidBusinessType, BusinessType } from "@/lib/businessTypes";

export interface Website {
  id: string;
  name: string;
  domain: string;
  is_verified: boolean;
  created_at: string;
  business_type: string;
  verification_token?: string;
  widgetCount?: number;
  totalViews?: number;
}

export const useWebsites = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: websites, isLoading } = useQuery({
    queryKey: ['websites', userId],
    queryFn: async (): Promise<Website[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch widget counts and views for each website
      const websitesWithStats = await Promise.all(
        (data || []).map(async (website) => {
          const { count: widgetCount } = await supabase
            .from('widgets')
            .select('*', { count: 'exact', head: true })
            .eq('website_id', website.id);

          const { data: widgets } = await supabase
            .from('widgets')
            .select('id')
            .eq('website_id', website.id);

          const widgetIds = widgets?.map(w => w.id) || [];
          
          let totalViews = 0;
          if (widgetIds.length > 0) {
            const { data: events } = await supabase
              .from('events')
              .select('views')
              .in('widget_id', widgetIds);

            totalViews = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
          }

          return {
            ...website,
            widgetCount: widgetCount || 0,
            totalViews,
          };
        })
      );

      return websitesWithStats;
    },
    enabled: !!userId,
  });

  const addWebsite = useMutation({
    mutationFn: async (data: { name: string; domain: string; business_type: string }) => {
      // Validate business type
      if (!isValidBusinessType(data.business_type)) {
        throw new Error(`Invalid business type: ${data.business_type}. Please select a valid business type.`);
      }

      // Get the current user ID from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("You must be logged in to add a website");
      }

      // Check if user is super admin
      const { data: isAdmin } = await supabase
        .rpc('is_superadmin', { _user_id: user.id });

      // Get current website count
      const { count: currentCount } = await supabase
        .from('websites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Super admins bypass all limits
      if (!isAdmin) {
        // Allow first website without subscription check (for onboarding)
        if (currentCount !== null && currentCount > 0) {
          // Get user's subscription to check limits for additional websites
          const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select(`
              *,
              plan:subscription_plans(max_websites)
            `)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

          const maxWebsites = subscription?.plan?.max_websites ?? 1;
          
          if (currentCount >= maxWebsites) {
            throw new Error(`You've reached your plan limit of ${maxWebsites} website${maxWebsites !== 1 ? 's' : ''}. Please upgrade to add more.`);
          }
        }
      }

      const { data: newWebsite, error } = await supabase
        .from('websites')
        .insert([{
          user_id: user.id,
          name: data.name,
          domain: data.domain,
          business_type: data.business_type as BusinessType,
        }])
        .select()
        .single();

      if (error) throw error;
      return newWebsite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites', userId] });
      toast.success('Website added successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add website: ${error.message}`);
    },
  });

  const deleteWebsite = useMutation({
    mutationFn: async (websiteId: string) => {
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', websiteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites', userId] });
      toast.success('Website deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete website: ${error.message}`);
    },
  });

  return {
    websites: websites || [],
    isLoading,
    addWebsite: addWebsite.mutate,
    addWebsiteAsync: addWebsite.mutateAsync,
    deleteWebsite: deleteWebsite.mutate,
  };
};
