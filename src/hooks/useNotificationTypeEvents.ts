import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationTypeService } from '@/services/notificationTypeService';
import { useToast } from '@/hooks/use-toast';

interface UseNotificationTypeEventsProps {
  widgetId: string;
  notificationTypes: string[];
  businessType: string;
  autoGenerate?: boolean;
}

export const useNotificationTypeEvents = ({
  widgetId,
  notificationTypes,
  businessType,
  autoGenerate = false
}: UseNotificationTypeEventsProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateDemoEvents = async () => {
    if (!widgetId || notificationTypes.length === 0) return;

    setIsGenerating(true);
    try {
      // Clear existing demo events for this widget
      await supabase
        .from('events')
        .delete()
        .eq('widget_id', widgetId)
        .eq('source', 'demo');

      // Generate new demo events based on notification types
      const demoEvents = NotificationTypeService.generateEventsForNotificationTypes(
        notificationTypes,
        businessType,
        widgetId,
        5
      );

      if (demoEvents.length > 0) {
        const { error } = await supabase
          .from('events')
          .insert(demoEvents);

        if (error) throw error;

        toast({
          title: 'Demo Events Generated',
          description: `Generated ${demoEvents.length} demo events for your selected notification types.`,
        });
      }
    } catch (error) {
      console.error('Error generating demo events:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate demo events.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const clearDemoEvents = async () => {
    try {
      await supabase
        .from('events')
        .delete()
        .eq('widget_id', widgetId)
        .eq('source', 'demo');

      toast({
        title: 'Demo Events Cleared',
        description: 'All demo events have been removed.',
      });
    } catch (error) {
      console.error('Error clearing demo events:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear demo events.',
        variant: 'destructive'
      });
    }
  };

  // Auto-generate demo events when component mounts and autoGenerate is true
  useEffect(() => {
    if (autoGenerate && widgetId && notificationTypes.length > 0) {
      generateDemoEvents();
    }
  }, [widgetId, notificationTypes, businessType, autoGenerate]);

  return {
    generateDemoEvents,
    clearDemoEvents,
    isGenerating
  };
};