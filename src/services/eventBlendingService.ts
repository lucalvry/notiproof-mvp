import { supabase } from '@/integrations/supabase/client';

export interface BlendingConfig {
  natural_weight: number;
  quick_win_weight: number;
  auto_graduation: boolean;
  min_natural_threshold: number;
  max_quick_wins_per_session: number;
  rotation_interval_ms: number;
}

export interface EventForBlending {
  id: string;
  event_type: string;
  event_data: any;
  source: string;
  created_at: string;
  message_template?: string;
  user_name?: string;
  user_location?: string;
  business_type?: string;
  expires_at?: string;
}

export class EventBlendingService {
  /**
   * Get default blending configuration based on business type
   */
  static getDefaultBlendingConfig(businessType: string): BlendingConfig {
    const configs: Record<string, BlendingConfig> = {
      saas: {
        natural_weight: 50,
        quick_win_weight: 50,
        auto_graduation: true,
        min_natural_threshold: 10,
        max_quick_wins_per_session: 3,
        rotation_interval_ms: 8000
      },
      ecommerce: {
        natural_weight: 70,
        quick_win_weight: 30,
        auto_graduation: true,
        min_natural_threshold: 15,
        max_quick_wins_per_session: 2,
        rotation_interval_ms: 6000
      },
      services: {
        natural_weight: 60,
        quick_win_weight: 40,
        auto_graduation: true,
        min_natural_threshold: 8,
        max_quick_wins_per_session: 4,
        rotation_interval_ms: 10000
      },
      events: {
        natural_weight: 80,
        quick_win_weight: 20,
        auto_graduation: false,
        min_natural_threshold: 20,
        max_quick_wins_per_session: 2,
        rotation_interval_ms: 5000
      },
      blog: {
        natural_weight: 40,
        quick_win_weight: 60,
        auto_graduation: true,
        min_natural_threshold: 12,
        max_quick_wins_per_session: 5,
        rotation_interval_ms: 12000
      }
    };

    return configs[businessType] || configs.saas;
  }

  /**
   * Blend natural and quick-win events using weighted selection
   */
  static blendEvents(
    naturalEvents: EventForBlending[],
    quickWinEvents: EventForBlending[],
    config: BlendingConfig,
    requestedCount: number = 10
  ): EventForBlending[] {
    // Filter out expired quick-wins
    const activeQuickWins = quickWinEvents.filter(event => {
      if (!event.expires_at) return true;
      return new Date(event.expires_at) > new Date();
    });

    // If auto-graduation is enabled and we have enough natural events, reduce quick-wins
    let adjustedConfig = { ...config };
    if (config.auto_graduation && naturalEvents.length >= config.min_natural_threshold) {
      const graduationFactor = Math.min(naturalEvents.length / (config.min_natural_threshold * 2), 1);
      adjustedConfig.natural_weight = Math.min(95, config.natural_weight + (graduationFactor * 30));
      adjustedConfig.quick_win_weight = 100 - adjustedConfig.natural_weight;
    }

    // Calculate how many events to pick from each source
    const naturalCount = Math.round((requestedCount * adjustedConfig.natural_weight) / 100);
    const quickWinCount = Math.min(
      requestedCount - naturalCount,
      config.max_quick_wins_per_session,
      activeQuickWins.length
    );

    // Select events using weighted random sampling
    const selectedNatural = this.weightedSample(naturalEvents, naturalCount);
    const selectedQuickWins = this.weightedSample(activeQuickWins, quickWinCount);

    // Combine and shuffle for natural-looking rotation
    const blendedEvents = [...selectedNatural, ...selectedQuickWins];
    return this.intelligentShuffle(blendedEvents, config);
  }

  /**
   * Weighted random sampling prioritizing recent events
   */
  private static weightedSample<T extends EventForBlending>(
    events: T[],
    count: number
  ): T[] {
    if (events.length <= count) return [...events];

    // Sort by recency and add weights (more recent = higher weight)
    const weighted = events
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((event, index) => ({
        event,
        weight: Math.exp(-index * 0.1) // Exponential decay
      }));

    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    const selected: T[] = [];

    for (let i = 0; i < count; i++) {
      if (weighted.length === 0) break;

      let randomWeight = Math.random() * totalWeight;
      let selectedIndex = 0;

      for (let j = 0; j < weighted.length; j++) {
        randomWeight -= weighted[j].weight;
        if (randomWeight <= 0) {
          selectedIndex = j;
          break;
        }
      }

      selected.push(weighted[selectedIndex].event);
      weighted.splice(selectedIndex, 1);
    }

    return selected;
  }

  /**
   * Intelligently shuffle events to avoid clustering same types
   */
  private static intelligentShuffle(
    events: EventForBlending[],
    config: BlendingConfig
  ): EventForBlending[] {
    const natural = events.filter(e => e.source === 'manual' || e.source === 'demo');
    const quickWins = events.filter(e => e.source === 'quick_win');

    // Interleave events based on rotation interval
    const shuffled: EventForBlending[] = [];
    const maxLength = Math.max(natural.length, quickWins.length);

    for (let i = 0; i < maxLength; i++) {
      // Alternate between natural and quick-win, but with some randomness
      const shouldStartWithNatural = Math.random() > 0.5;
      
      if (shouldStartWithNatural) {
        if (i < natural.length) shuffled.push(natural[i]);
        if (i < quickWins.length) shuffled.push(quickWins[i]);
      } else {
        if (i < quickWins.length) shuffled.push(quickWins[i]);
        if (i < natural.length) shuffled.push(natural[i]);
      }
    }

    return shuffled.filter(Boolean);
  }

  /**
   * Get blending analytics for a widget
   */
  static async getBlendingAnalytics(widgetId: string) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: events, error } = await supabase
        .from('events')
        .select('source, event_type, views, clicks, created_at')
        .eq('widget_id', widgetId)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (error) throw error;

      const naturalEvents = events?.filter(e => e.source === 'manual' || e.source === 'demo') || [];
      const quickWinEvents = events?.filter(e => e.source === 'quick_win') || [];

      const naturalViews = naturalEvents.reduce((sum, e) => sum + (e.views || 0), 0);
      const quickWinViews = quickWinEvents.reduce((sum, e) => sum + (e.views || 0), 0);
      const naturalClicks = naturalEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
      const quickWinClicks = quickWinEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);

      return {
        natural: {
          count: naturalEvents.length,
          views: naturalViews,
          clicks: naturalClicks,
          ctr: naturalViews > 0 ? (naturalClicks / naturalViews) * 100 : 0
        },
        quickWin: {
          count: quickWinEvents.length,
          views: quickWinViews,
          clicks: quickWinClicks,
          ctr: quickWinViews > 0 ? (quickWinClicks / quickWinViews) * 100 : 0
        },
        graduationProgress: naturalEvents.length >= 10 ? 
          Math.min((naturalEvents.length / 20) * 100, 100) : 
          (naturalEvents.length / 10) * 100
      };
    } catch (error) {
      console.error('Error getting blending analytics:', error);
      return null;
    }
  }

  /**
   * Get graduation recommendation
   */
  static getGraduationRecommendation(
    naturalCount: number,
    quickWinCount: number,
    naturalCTR: number,
    quickWinCTR: number
  ): {
    ready: boolean;
    recommendation: string;
    suggestedRatio: { natural: number; quickWin: number };
  } {
    if (naturalCount >= 20 && naturalCTR >= quickWinCTR) {
      return {
        ready: true,
        recommendation: 'You have excellent natural event volume! Consider reducing quick-wins to 10-20%.',
        suggestedRatio: { natural: 85, quickWin: 15 }
      };
    }

    if (naturalCount >= 10 && naturalCTR > quickWinCTR * 0.8) {
      return {
        ready: true,
        recommendation: 'Good natural event growth! You can start reducing quick-wins gradually.',
        suggestedRatio: { natural: 70, quickWin: 30 }
      };
    }

    if (naturalCount >= 5) {
      return {
        ready: false,
        recommendation: 'Natural events are growing. Keep current balance while building more integrations.',
        suggestedRatio: { natural: 60, quickWin: 40 }
      };
    }

    return {
      ready: false,
      recommendation: 'Focus on setting up integrations to generate more natural events.',
      suggestedRatio: { natural: 40, quickWin: 60 }
    };
  }
}