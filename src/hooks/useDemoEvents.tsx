import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useDemoEvents = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateDemoEvents = async (userId: string, businessType: string = 'saas') => {
    setLoading(true);
    try {
      // Call the Supabase function to generate demo events
      const { error } = await supabase.rpc('generate_demo_events', {
        _user_id: userId,
        _business_type: businessType as any
      });

      if (error) throw error;

      toast({
        title: 'Demo events generated',
        description: 'Demo events have been successfully created for your widgets',
      });

      return true;
    } catch (error) {
      console.error('Error generating demo events:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate demo events. Please try again.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cleanupExpiredEvents = async () => {
    try {
      const { error } = await supabase.rpc('cleanup_expired_demo_events');
      if (error) throw error;
      
      toast({
        title: 'Cleanup completed',
        description: 'Expired demo events have been removed',
      });
    } catch (error) {
      console.error('Error cleaning up expired events:', error);
      toast({
        title: 'Error',
        description: 'Failed to cleanup expired events',
        variant: 'destructive'
      });
    }
  };

  const clearAllDemoEvents = async (userId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('clear_demo_events', {
        _user_id: userId
      });

      if (error) throw error;

      toast({
        title: 'Demo events cleared',
        description: 'All demo events have been removed',
      });

      return true;
    } catch (error) {
      console.error('Error clearing demo events:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear demo events. Please try again.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateDemoEvents,
    cleanupExpiredEvents,
    clearAllDemoEvents,
    loading
  };
};