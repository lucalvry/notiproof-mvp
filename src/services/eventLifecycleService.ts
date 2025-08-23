import { supabase } from '@/integrations/supabase/client';

export interface LifecycleRules {
  auto_expire_quick_wins: boolean;
  quick_win_ttl_hours: number;
  auto_clean_flagged: boolean;
  flagged_ttl_hours: number;
  graduation_enabled: boolean;
  graduation_threshold: number;
}

export class EventLifecycleService {
  /**
   * Get default lifecycle rules based on business type
   */
  static getDefaultLifecycleRules(businessType: string): LifecycleRules {
    const rules: Record<string, LifecycleRules> = {
      saas: {
        auto_expire_quick_wins: true,
        quick_win_ttl_hours: 168, // 7 days
        auto_clean_flagged: true,
        flagged_ttl_hours: 24,
        graduation_enabled: true,
        graduation_threshold: 10
      },
      ecommerce: {
        auto_expire_quick_wins: true,
        quick_win_ttl_hours: 72, // 3 days
        auto_clean_flagged: true,
        flagged_ttl_hours: 12,
        graduation_enabled: true,
        graduation_threshold: 15
      },
      services: {
        auto_expire_quick_wins: true,
        quick_win_ttl_hours: 240, // 10 days
        auto_clean_flagged: true,
        flagged_ttl_hours: 48,
        graduation_enabled: true,
        graduation_threshold: 8
      },
      events: {
        auto_expire_quick_wins: false, // Events might want persistent promos
        quick_win_ttl_hours: 720, // 30 days
        auto_clean_flagged: true,
        flagged_ttl_hours: 6,
        graduation_enabled: false,
        graduation_threshold: 20
      },
      blog: {
        auto_expire_quick_wins: true,
        quick_win_ttl_hours: 336, // 14 days
        auto_clean_flagged: true,
        flagged_ttl_hours: 72,
        graduation_enabled: true,
        graduation_threshold: 12
      }
    };

    return rules[businessType] || rules.saas;
  }

  /**
   * Clean up expired and flagged events for a widget
   */
  static async cleanupExpiredEvents(widgetId: string, rules: LifecycleRules): Promise<{
    quickWinsRemoved: number;
    flaggedRemoved: number;
  }> {
    let quickWinsRemoved = 0;
    let flaggedRemoved = 0;

    try {
      // Clean expired quick-wins
      if (rules.auto_expire_quick_wins) {
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() - rules.quick_win_ttl_hours);

        const { data: expiredQuickWins, error: quickWinError } = await supabase
          .from('events')
          .delete()
          .eq('widget_id', widgetId)
          .eq('source', 'quick_win')
          .lt('created_at', expiryDate.toISOString())
          .select('id');

        if (!quickWinError) {
          quickWinsRemoved = expiredQuickWins?.length || 0;
        }
      }

      // Clean old flagged events
      if (rules.auto_clean_flagged) {
        const flaggedExpiryDate = new Date();
        flaggedExpiryDate.setHours(flaggedExpiryDate.getHours() - rules.flagged_ttl_hours);

        const { data: expiredFlagged, error: flaggedError } = await supabase
          .from('events')
          .delete()
          .eq('widget_id', widgetId)
          .eq('flagged', true)
          .lt('created_at', flaggedExpiryDate.toISOString())
          .select('id');

        if (!flaggedError) {
          flaggedRemoved = expiredFlagged?.length || 0;
        }
      }

      return { quickWinsRemoved, flaggedRemoved };
    } catch (error) {
      console.error('Error cleaning up expired events:', error);
      return { quickWinsRemoved: 0, flaggedRemoved: 0 };
    }
  }

  /**
   * Check if widget is ready for graduation
   */
  static async checkGraduationStatus(widgetId: string, rules: LifecycleRules): Promise<{
    ready: boolean;
    naturalCount: number;
    quickWinCount: number;
    recommendation: string;
    nextSteps: string[];
  }> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Count natural events in last 7 days
      const { data: naturalEvents, error: naturalError } = await supabase
        .from('events')
        .select('id, clicks, views')
        .eq('widget_id', widgetId)
        .in('source', ['manual', 'demo'])
        .gte('created_at', sevenDaysAgo.toISOString());

      // Count active quick-wins
      const { data: quickWinEvents, error: quickWinError } = await supabase
        .from('events')
        .select('id, clicks, views')
        .eq('widget_id', widgetId)
        .eq('source', 'quick_win')
        .or('expires_at.is.null,expires_at.gt.now()');

      if (naturalError || quickWinError) {
        throw naturalError || quickWinError;
      }

      const naturalCount = naturalEvents?.length || 0;
      const quickWinCount = quickWinEvents?.length || 0;
      const ready = rules.graduation_enabled && naturalCount >= rules.graduation_threshold;

      let recommendation = '';
      let nextSteps: string[] = [];

      if (ready) {
        recommendation = `Excellent! You have ${naturalCount} natural events. Ready to reduce quick-wins.`;
        nextSteps = [
          'Reduce quick-win ratio to 20-30%',
          'Monitor conversion rates',
          'Set up more integrations for sustained growth'
        ];
      } else if (naturalCount >= rules.graduation_threshold * 0.5) {
        recommendation = `Good progress! ${naturalCount}/${rules.graduation_threshold} natural events needed.`;
        nextSteps = [
          'Continue current integration setup',
          'Consider adding more data sources',
          'Monitor event quality and authenticity'
        ];
      } else if (naturalCount > 0) {
        recommendation = `Natural events starting to flow. Keep building integrations.`;
        nextSteps = [
          'Complete pending integration setups',
          'Test webhook connections',
          'Verify event data quality'
        ];
      } else {
        recommendation = `Focus on connecting data sources to generate natural events.`;
        nextSteps = [
          'Connect e-commerce platform (Shopify/WooCommerce)',
          'Set up email integration webhooks',
          'Configure Google Reviews sync',
          'Test event generation'
        ];
      }

      return {
        ready,
        naturalCount,
        quickWinCount,
        recommendation,
        nextSteps
      };
    } catch (error) {
      console.error('Error checking graduation status:', error);
      return {
        ready: false,
        naturalCount: 0,
        quickWinCount: 0,
        recommendation: 'Unable to analyze graduation status. Please check widget configuration.',
        nextSteps: ['Review widget settings', 'Check integration status']
      };
    }
  }

  /**
   * Auto-graduate widget by adjusting display rules
   */
  static async autoGraduateWidget(widgetId: string): Promise<boolean> {
    try {
      // Get current widget settings
      const { data: widget, error: fetchError } = await supabase
        .from('widgets')
        .select('display_rules')
        .eq('id', widgetId)
        .single();

      if (fetchError || !widget) {
        throw fetchError || new Error('Widget not found');
      }

      const currentRules = (widget.display_rules as any) || {};
      
      // Update blending configuration for graduation
      const updatedRules = {
        ...currentRules,
        event_blending: {
          ...(currentRules.event_blending || {}),
          natural_weight: 80,
          quick_win_weight: 20,
          auto_graduation: true,
          graduation_date: new Date().toISOString()
        }
      };

      const { error: updateError } = await supabase
        .from('widgets')
        .update({ display_rules: updatedRules })
        .eq('id', widgetId);

      if (updateError) throw updateError;

      // Log graduation event
      await supabase
        .from('events')
        .insert({
          widget_id: widgetId,
          event_type: 'graduation',
          event_data: {
            message: 'Widget graduated to natural events',
            natural_weight: 80,
            quick_win_weight: 20,
            graduation_date: new Date().toISOString()
          },
          source: 'manual',
          status: 'approved'
        });

      return true;
    } catch (error) {
      console.error('Error auto-graduating widget:', error);
      return false;
    }
  }

  /**
   * Schedule lifecycle maintenance for all user widgets
   */
  static async scheduleMaintenanceForUser(userId: string): Promise<void> {
    try {
      // Get all user widgets
      const { data: widgets, error } = await supabase
        .from('widgets')
        .select('id, display_rules')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error || !widgets) return;

      for (const widget of widgets) {
        const rules = this.getDefaultLifecycleRules('saas'); // Default fallback
        
        // Clean up expired events
        await this.cleanupExpiredEvents(widget.id, rules);
        
        // Check graduation status
        const graduationStatus = await this.checkGraduationStatus(widget.id, rules);
        
        // Auto-graduate if ready and enabled
        if (graduationStatus.ready && rules.graduation_enabled) {
          await this.autoGraduateWidget(widget.id);
        }
      }
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
    }
  }

  /**
   * Get lifecycle health score for a widget
   */
  static async getLifecycleHealth(widgetId: string): Promise<{
    score: number;
    factors: {
      naturalEventGrowth: number;
      quickWinBalance: number;
      flaggedEventRatio: number;
      graduationProgress: number;
    };
    recommendations: string[];
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: events, error } = await supabase
        .from('events')
        .select('source, flagged, created_at')
        .eq('widget_id', widgetId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error || !events) {
        return {
          score: 0,
          factors: { naturalEventGrowth: 0, quickWinBalance: 0, flaggedEventRatio: 0, graduationProgress: 0 },
          recommendations: ['Unable to analyze widget health']
        };
      }

      const naturalEvents = events.filter(e => e.source === 'manual' || e.source === 'demo');
      const quickWinEvents = events.filter(e => e.source === 'quick_win');
      const flaggedEvents = events.filter(e => e.flagged);

      // Calculate health factors (0-100)
      const naturalEventGrowth = Math.min((naturalEvents.length / 20) * 100, 100);
      const quickWinBalance = quickWinEvents.length > 0 ? 
        Math.max(0, 100 - Math.abs(50 - (quickWinEvents.length / events.length) * 100)) : 50;
      const flaggedEventRatio = Math.max(0, 100 - (flaggedEvents.length / events.length) * 100);
      const graduationProgress = Math.min((naturalEvents.length / 10) * 100, 100);

      const score = (naturalEventGrowth * 0.3 + quickWinBalance * 0.2 + flaggedEventRatio * 0.2 + graduationProgress * 0.3);

      const recommendations: string[] = [];
      if (naturalEventGrowth < 50) recommendations.push('Increase natural event generation through integrations');
      if (quickWinBalance < 70) recommendations.push('Optimize quick-win to natural event ratio');
      if (flaggedEventRatio < 80) recommendations.push('Review and improve event quality controls');
      if (graduationProgress < 70) recommendations.push('Work towards graduation from quick-wins');

      return {
        score: Math.round(score),
        factors: {
          naturalEventGrowth: Math.round(naturalEventGrowth),
          quickWinBalance: Math.round(quickWinBalance),
          flaggedEventRatio: Math.round(flaggedEventRatio),
          graduationProgress: Math.round(graduationProgress)
        },
        recommendations
      };
    } catch (error) {
      console.error('Error calculating lifecycle health:', error);
      return {
        score: 0,
        factors: { naturalEventGrowth: 0, quickWinBalance: 0, flaggedEventRatio: 0, graduationProgress: 0 },
        recommendations: ['Error analyzing widget health']
      };
    }
  }
}