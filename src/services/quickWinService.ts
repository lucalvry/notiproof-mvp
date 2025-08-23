import { supabase } from '@/integrations/supabase/client';

export class QuickWinService {
  /**
   * Generate quick-win events from active user configurations
   */
  static async generateQuickWinEvents(widgetId: string): Promise<any[]> {
    try {
      // Get active quick-wins for the widget
      const { data: quickWins, error } = await supabase
        .from('user_quick_wins')
        .select(`
          *,
          template:quick_win_templates (
            name,
            event_type,
            template_message,
            required_fields
          )
        `)
        .eq('widget_id', widgetId)
        .eq('is_enabled', true)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (error) throw error;

      if (!quickWins?.length) return [];

      const events: any[] = [];

      for (const quickWin of quickWins) {
        if (!quickWin.template) continue;

        const message = this.processTemplate(
          quickWin.template.template_message,
          quickWin.custom_metadata as Record<string, any>
        );

        const event = {
          widget_id: widgetId,
          event_type: quickWin.template.event_type,
          event_data: {
            message,
            metadata: quickWin.custom_metadata,
            quick_win_id: quickWin.id
          },
          source: 'quick_win',
          status: 'approved',
          expires_at: quickWin.expires_at,
          created_at: new Date().toISOString()
        };

        events.push(event);
      }

      return events;
    } catch (error) {
      console.error('Error generating quick-win events:', error);
      return [];
    }
  }

  /**
   * Process template message by replacing placeholders with metadata values
   */
  static processTemplate(template: string, metadata: Record<string, any>): string {
    let processedMessage = template;

    // Replace placeholders like {field_name} with metadata values
    Object.entries(metadata).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      processedMessage = processedMessage.replace(
        new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
        String(value)
      );
    });

    return processedMessage;
  }

  /**
   * Create events from quick-win configurations
   */
  static async createQuickWinEventsForWidget(widgetId: string): Promise<void> {
    try {
      const events = await this.generateQuickWinEvents(widgetId);

      if (events.length === 0) return;

      // Insert events into the database
      const { error } = await supabase
        .from('events')
        .insert(events);

      if (error) throw error;

      console.log(`Created ${events.length} quick-win events for widget ${widgetId}`);
    } catch (error) {
      console.error('Error creating quick-win events:', error);
      throw error;
    }
  }

  /**
   * Get quick-win analytics for a widget
   */
  static async getQuickWinAnalytics(widgetId: string) {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('event_type, views, clicks, created_at')
        .eq('widget_id', widgetId)
        .eq('source', 'quick_win');

      if (error) throw error;

      const analytics = {
        totalEvents: events?.length || 0,
        totalViews: events?.reduce((sum, event) => sum + (event.views || 0), 0) || 0,
        totalClicks: events?.reduce((sum, event) => sum + (event.clicks || 0), 0) || 0,
        conversionRate: 0
      };

      if (analytics.totalViews > 0) {
        analytics.conversionRate = (analytics.totalClicks / analytics.totalViews) * 100;
      }

      return analytics;
    } catch (error) {
      console.error('Error fetching quick-win analytics:', error);
      return null;
    }
  }

  /**
   * Check if a widget is ready to graduate from quick-wins to natural events
   */
  static async checkGraduationReadiness(widgetId: string): Promise<{
    ready: boolean;
    naturalEvents: number;
    quickWinEvents: number;
    recommendation: string;
  }> {
    try {
      // Count natural events in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: naturalEvents, error: naturalError } = await supabase
        .from('events')
        .select('id')
        .eq('widget_id', widgetId)
        .eq('source', 'manual')
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: quickWinEvents, error: quickWinError } = await supabase
        .from('events')
        .select('id')
        .eq('widget_id', widgetId)
        .eq('source', 'quick_win');

      if (naturalError || quickWinError) {
        throw naturalError || quickWinError;
      }

      const naturalCount = naturalEvents?.length || 0;
      const quickWinCount = quickWinEvents?.length || 0;

      let ready = false;
      let recommendation = '';

      if (naturalCount >= 10) {
        ready = true;
        recommendation = 'Great! You have enough natural events to consider reducing quick-wins.';
      } else if (naturalCount >= 5) {
        recommendation = 'Good progress! A few more natural events and you can reduce quick-wins.';
      } else if (naturalCount > 0) {
        recommendation = 'Natural events are starting to come in. Keep your integrations active.';
      } else {
        recommendation = 'Focus on setting up integrations to generate natural events.';
      }

      return {
        ready,
        naturalEvents: naturalCount,
        quickWinEvents: quickWinCount,
        recommendation
      };
    } catch (error) {
      console.error('Error checking graduation readiness:', error);
      return {
        ready: false,
        naturalEvents: 0,
        quickWinEvents: 0,
        recommendation: 'Unable to analyze readiness. Please check your widget configuration.'
      };
    }
  }
}