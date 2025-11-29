import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSuperAdmin = (userId: string | undefined) => {
  const { data: isSuperAdmin, isLoading } = useQuery({
    queryKey: ['superadmin', userId],
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;

      const { data, error } = await supabase
        .rpc('is_superadmin', { _user_id: userId });

      if (error) {
        console.error('Error checking superadmin status:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!userId,
  });

  return {
    isSuperAdmin: isSuperAdmin ?? false,
    isLoading,
  };
};
