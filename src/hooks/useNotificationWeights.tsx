import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotificationWeight {
  id: string;
  website_id: string;
  event_type: string;
  weight: number;
  max_per_queue: number;
  ttl_days: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_WEIGHTS: Record<string, Omit<NotificationWeight, 'id' | 'website_id' | 'created_at' | 'updated_at'>> = {
  purchase: { event_type: 'purchase', weight: 10, max_per_queue: 20, ttl_days: 7 },
  testimonial: { event_type: 'testimonial', weight: 8, max_per_queue: 15, ttl_days: 180 },
  signup: { event_type: 'signup', weight: 6, max_per_queue: 20, ttl_days: 14 },
  announcement: { event_type: 'announcement', weight: 4, max_per_queue: 5, ttl_days: 30 },
  live_visitors: { event_type: 'live_visitors', weight: 2, max_per_queue: 3, ttl_days: 1 },
};

export function useNotificationWeights(websiteId: string | undefined) {
  const [weights, setWeights] = useState<NotificationWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!websiteId) {
      setLoading(false);
      return;
    }

    fetchWeights();
  }, [websiteId]);

  const fetchWeights = async () => {
    if (!websiteId) return;

    try {
      setLoading(true);
      
      // First, check if weights exist
      const { data: existingWeights, error: fetchError } = await supabase
        .from('notification_weights')
        .select('*')
        .eq('website_id', websiteId);

      if (fetchError) throw fetchError;

      // If no weights exist, initialize defaults
      if (!existingWeights || existingWeights.length === 0) {
        const { error: initError } = await supabase.rpc('initialize_notification_weights', {
          _website_id: websiteId
        });

        if (initError) throw initError;

        // Fetch again after initialization
        const { data: newWeights, error: refetchError } = await supabase
          .from('notification_weights')
          .select('*')
          .eq('website_id', websiteId);

        if (refetchError) throw refetchError;
        setWeights(newWeights || []);
      } else {
        setWeights(existingWeights);
      }
    } catch (error: any) {
      console.error('Error fetching weights:', error);
      toast.error('Failed to load notification weights');
    } finally {
      setLoading(false);
    }
  };

  const updateWeight = async (
    eventType: string,
    updates: { weight?: number; max_per_queue?: number; ttl_days?: number }
  ) => {
    if (!websiteId) return { success: false };

    try {
      setSaving(true);

      const { error } = await supabase
        .from('notification_weights')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('website_id', websiteId)
        .eq('event_type', eventType);

      if (error) throw error;

      // Update local state optimistically
      setWeights(prev => prev.map(w => 
        w.event_type === eventType 
          ? { ...w, ...updates, updated_at: new Date().toISOString() }
          : w
      ));

      return { success: true };
    } catch (error: any) {
      console.error('Error updating weight:', error);
      toast.error('Failed to update weight');
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  const saveAllWeights = async (updatedWeights: NotificationWeight[]) => {
    if (!websiteId) return { success: false };

    try {
      setSaving(true);

      // Update all weights in parallel
      const updates = updatedWeights.map(weight =>
        supabase
          .from('notification_weights')
          .update({
            weight: weight.weight,
            max_per_queue: weight.max_per_queue,
            ttl_days: weight.ttl_days,
            updated_at: new Date().toISOString()
          })
          .eq('website_id', websiteId)
          .eq('event_type', weight.event_type)
      );

      const results = await Promise.all(updates);
      const hasError = results.some(r => r.error);

      if (hasError) {
        throw new Error('Failed to update some weights');
      }

      setWeights(updatedWeights);
      toast.success('Notification weights saved successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error saving weights:', error);
      toast.error('Failed to save notification weights');
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!websiteId) return { success: false };

    try {
      setSaving(true);

      const defaultWeights = Object.values(DEFAULT_WEIGHTS);
      const updates = defaultWeights.map(weight =>
        supabase
          .from('notification_weights')
          .update({
            weight: weight.weight,
            max_per_queue: weight.max_per_queue,
            ttl_days: weight.ttl_days,
            updated_at: new Date().toISOString()
          })
          .eq('website_id', websiteId)
          .eq('event_type', weight.event_type)
      );

      const results = await Promise.all(updates);
      const hasError = results.some(r => r.error);

      if (hasError) {
        throw new Error('Failed to reset weights');
      }

      await fetchWeights();
      toast.success('Reset to default weights');
      return { success: true };
    } catch (error: any) {
      console.error('Error resetting weights:', error);
      toast.error('Failed to reset weights');
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  return {
    weights,
    loading,
    saving,
    updateWeight,
    saveAllWeights,
    resetToDefaults,
    refetch: fetchWeights
  };
}
