import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserWidget {
  id: string;
  name: string;
  template_name: string;
  status: string;
  website_id: string;
  created_at: string;
}

export const useUserWidgets = (websiteId?: string) => {
  const { profile } = useAuth();
  const [widgets, setWidgets] = useState<UserWidget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWidgets = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('widgets')
        .select('id, name, template_name, status, website_id, created_at')
        .eq('user_id', profile.id);
      
      if (websiteId) {
        query = query.eq('website_id', websiteId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setWidgets(data || []);
    } catch (error) {
      console.error('Error fetching user widgets:', error);
      setWidgets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, [profile, websiteId]);

  return {
    widgets,
    loading,
    refetch: fetchWidgets,
  };
};