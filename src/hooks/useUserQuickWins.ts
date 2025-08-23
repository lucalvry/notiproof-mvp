import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserQuickWin {
  id: string;
  user_id: string;
  template_id: string;
  widget_id: string;
  is_enabled: boolean;
  custom_metadata: any; // Json type from Supabase
  expires_at?: string;
  template?: {
    name: string;
    template_message: string;
    required_fields: any;
    category: string;
  };
}

export interface ProcessedUserQuickWin extends Omit<UserQuickWin, 'custom_metadata'> {
  custom_metadata: Record<string, any>;
}

export const useUserQuickWins = (widgetId?: string) => {
  const [quickWins, setQuickWins] = useState<ProcessedUserQuickWin[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (widgetId) {
      fetchUserQuickWins();
    }
  }, [widgetId]);

  const fetchUserQuickWins = async () => {
    if (!widgetId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_quick_wins')
        .select(`
          *,
          template:quick_win_templates (
            name,
            template_message,
            required_fields,
            category
          )
        `)
        .eq('widget_id', widgetId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data to convert Json types to proper TypeScript types
      const processedData = (data || []).map(quickWin => ({
        ...quickWin,
        custom_metadata: typeof quickWin.custom_metadata === 'object' 
          ? quickWin.custom_metadata 
          : JSON.parse(quickWin.custom_metadata as string || '{}')
      }));
      setQuickWins(processedData);
    } catch (error) {
      console.error('Error fetching user quick-wins:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quick-win configurations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addQuickWin = async (templateId: string, customMetadata: Record<string, any>, expiresAt?: string) => {
    if (!widgetId) return;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_quick_wins')
        .insert({
          user_id: user.id,
          template_id: templateId,
          widget_id: widgetId,
          custom_metadata: customMetadata as any,
          expires_at: expiresAt,
          is_enabled: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Quick-win added successfully',
      });

      await fetchUserQuickWins();
      return data;
    } catch (error) {
      console.error('Error adding quick-win:', error);
      toast({
        title: 'Error',
        description: 'Failed to add quick-win',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateQuickWin = async (id: string, updates: Partial<UserQuickWin>) => {
    try {
      const { error } = await supabase
        .from('user_quick_wins')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Quick-win updated successfully',
      });

      await fetchUserQuickWins();
    } catch (error) {
      console.error('Error updating quick-win:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quick-win',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removeQuickWin = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_quick_wins')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Quick-win removed successfully',
      });

      await fetchUserQuickWins();
    } catch (error) {
      console.error('Error removing quick-win:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove quick-win',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const toggleQuickWin = async (id: string, enabled: boolean) => {
    await updateQuickWin(id, { is_enabled: enabled });
  };

  return {
    quickWins,
    loading,
    addQuickWin,
    updateQuickWin,
    removeQuickWin,
    toggleQuickWin,
    refetch: fetchUserQuickWins
  };
};