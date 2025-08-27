import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Website {
  id: string;
  user_id: string;
  domain: string;
  name: string;
  business_type: any; // Use any to match the database type
  status: string;
  is_verified: boolean;
  verification_token?: string;
  favicon_url?: string;
  created_at: string;
  updated_at: string;
  verification_method?: string;
  last_verification_at?: string;
  verification_attempts?: number;
}

export const useWebsites = () => {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWebsites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setWebsites(data || []);
      
      // Set first website as selected if none selected
      if (!selectedWebsite && data && data.length > 0) {
        setSelectedWebsite(data[0]);
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWebsite = async (websiteData: Omit<Website, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status' | 'is_verified'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('websites')
        .insert({
          ...websiteData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setWebsites(prev => [...prev, data]);
      if (!selectedWebsite) {
        setSelectedWebsite(data);
      }

      return data;
    } catch (error) {
      console.error('Error creating website:', error);
      return null;
    }
  };

  const updateWebsite = async (id: string, updates: Partial<Website>) => {
    try {
      const { data, error } = await supabase
        .from('websites')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setWebsites(prev => prev.map(w => w.id === id ? data : w));
      if (selectedWebsite?.id === id) {
        setSelectedWebsite(data);
      }

      return data;
    } catch (error) {
      console.error('Error updating website:', error);
      return null;
    }
  };

  const deleteWebsite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWebsites(prev => prev.filter(w => w.id !== id));
      if (selectedWebsite?.id === id) {
        const remaining = websites.filter(w => w.id !== id);
        setSelectedWebsite(remaining.length > 0 ? remaining[0] : null);
      }

      return true;
    } catch (error) {
      console.error('Error deleting website:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, [user]);

  return {
    websites,
    selectedWebsite,
    setSelectedWebsite,
    loading,
    createWebsite,
    updateWebsite,
    deleteWebsite,
    refetch: fetchWebsites,
  };
};