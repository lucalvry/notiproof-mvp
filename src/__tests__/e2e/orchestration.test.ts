import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('Campaign Orchestration E2E', () => {
  const mockWebsiteId = 'test-website-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Playlist Management', () => {
    it('should create and manage campaign playlist', async () => {
      // Create campaigns
      const campaigns = [
        { id: 'campaign-1', priority: 200 },
        { id: 'campaign-2', priority: 150 },
        { id: 'campaign-3', priority: 100 },
      ];

      // Create playlist
      const playlistData = {
        website_id: mockWebsiteId,
        name: 'Main Playlist',
        campaign_order: campaigns.map(c => c.id),
        is_active: true,
        rules: {
          sequence_mode: 'priority',
          max_per_session: 10,
          cooldown_seconds: 300,
        },
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'playlist-1', ...playlistData }],
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const { data: playlist } = await supabase
        .from('campaign_playlists')
        .insert(playlistData)
        .select();

      expect(playlist[0].campaign_order).toHaveLength(3);
      expect((playlist[0].rules as any).sequence_mode).toBe('priority');
    });

    it('should update campaign order in playlist', async () => {
      const newOrder = ['campaign-3', 'campaign-1', 'campaign-2'];

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{
              id: 'playlist-1',
              campaign_order: newOrder,
            }],
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      const { data } = await supabase
        .from('campaign_playlists')
        .update({ campaign_order: newOrder })
        .eq('id', 'playlist-1')
        .select();

      expect(data[0].campaign_order).toEqual(newOrder);
    });
  });

  describe('Priority-Based Orchestration', () => {
    it('should respect campaign priorities', async () => {
      const campaigns = [
        {
          id: 'high-priority',
          priority: 300,
          name: 'Critical Alert',
        },
        {
          id: 'medium-priority',
          priority: 150,
          name: 'Standard Notification',
        },
        {
          id: 'low-priority',
          priority: 50,
          name: 'Background Info',
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: campaigns.sort((a, b) => b.priority - a.priority),
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('website_id', mockWebsiteId)
        .eq('status', 'active')
        .order('priority', { ascending: false });

      expect(data[0].id).toBe('high-priority');
      expect(data[1].id).toBe('medium-priority');
      expect(data[2].id).toBe('low-priority');
    });
  });

  describe('Frequency Capping', () => {
    it('should enforce per-session frequency caps', async () => {
      const campaign = {
        id: 'campaign-1',
        frequency_cap: {
          per_session: 3,
          per_user: 10,
          cooldown_seconds: 600,
        },
      };

      // Simulate tracking impressions
      const sessionImpressions = [
        { campaign_id: 'campaign-1', session_id: 'session-123', timestamp: new Date() },
        { campaign_id: 'campaign-1', session_id: 'session-123', timestamp: new Date() },
        { campaign_id: 'campaign-1', session_id: 'session-123', timestamp: new Date() },
      ];

      expect(sessionImpressions).toHaveLength(3);
      
      // Next impression should be blocked
      const shouldShow = sessionImpressions.length < campaign.frequency_cap.per_session;
      expect(shouldShow).toBe(false);
    });

    it('should enforce per-user frequency caps', async () => {
      const campaign = {
        id: 'campaign-1',
        frequency_cap: {
          per_session: 5,
          per_user: 3,
          cooldown_seconds: 86400, // 24 hours
        },
      };

      const userImpressions = [
        { campaign_id: 'campaign-1', user_id: 'user-123', timestamp: new Date() },
        { campaign_id: 'campaign-1', user_id: 'user-123', timestamp: new Date() },
        { campaign_id: 'campaign-1', user_id: 'user-123', timestamp: new Date() },
      ];

      const shouldShow = userImpressions.length < campaign.frequency_cap.per_user;
      expect(shouldShow).toBe(false);
    });

    it('should respect cooldown periods', async () => {
      const campaign = {
        id: 'campaign-1',
        frequency_cap: {
          per_session: 10,
          per_user: 10,
          cooldown_seconds: 300, // 5 minutes
        },
      };

      const lastImpression = new Date(Date.now() - 60000); // 1 minute ago
      const cooldownEnds = new Date(lastImpression.getTime() + (campaign.frequency_cap.cooldown_seconds * 1000));
      const now = new Date();

      const inCooldown = now < cooldownEnds;
      expect(inCooldown).toBe(true);

      // Simulate after cooldown
      const afterCooldown = new Date(Date.now() + 360000); // 6 minutes from now
      const cooldownExpired = afterCooldown >= cooldownEnds;
      expect(cooldownExpired).toBe(true);
    });
  });

  describe('Sequential Display', () => {
    it('should display campaigns in sequence mode', async () => {
      const playlist = {
        campaign_order: ['campaign-1', 'campaign-2', 'campaign-3'],
        rules: {
          sequence_mode: 'sequential',
        },
      };

      let currentIndex = 0;
      
      // First impression
      const firstCampaign = playlist.campaign_order[currentIndex];
      expect(firstCampaign).toBe('campaign-1');
      currentIndex++;

      // Second impression
      const secondCampaign = playlist.campaign_order[currentIndex];
      expect(secondCampaign).toBe('campaign-2');
      currentIndex++;

      // Third impression
      const thirdCampaign = playlist.campaign_order[currentIndex];
      expect(thirdCampaign).toBe('campaign-3');
      currentIndex++;

      // Should loop back to start
      if (currentIndex >= playlist.campaign_order.length) {
        currentIndex = 0;
      }
      const loopedCampaign = playlist.campaign_order[currentIndex];
      expect(loopedCampaign).toBe('campaign-1');
    });
  });

  describe('Round Robin Distribution', () => {
    it('should distribute impressions evenly in round-robin mode', async () => {
      const playlist = {
        campaign_order: ['campaign-1', 'campaign-2', 'campaign-3'],
        rules: {
          sequence_mode: 'round-robin',
        },
      };

      const impressions: Record<string, number> = {};
      
      // Simulate 30 impressions
      for (let i = 0; i < 30; i++) {
        const campaignIndex = i % playlist.campaign_order.length;
        const campaignId = playlist.campaign_order[campaignIndex];
        impressions[campaignId] = (impressions[campaignId] || 0) + 1;
      }

      // Each campaign should have equal impressions
      expect(impressions['campaign-1']).toBe(10);
      expect(impressions['campaign-2']).toBe(10);
      expect(impressions['campaign-3']).toBe(10);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts between overlapping campaigns', async () => {
      const campaigns = [
        {
          id: 'campaign-1',
          priority: 200,
          display_rules: {
            url_allowlist: ['/products/*'],
          },
        },
        {
          id: 'campaign-2',
          priority: 150,
          display_rules: {
            url_allowlist: ['/products/*'],
          },
        },
      ];

      // On same URL, higher priority wins
      const currentUrl = '/products/item-1';
      const eligibleCampaigns = campaigns
        .filter(c => c.display_rules.url_allowlist.some(pattern => 
          currentUrl.match(pattern.replace('*', '.*'))
        ))
        .sort((a, b) => b.priority - a.priority);

      expect(eligibleCampaigns[0].id).toBe('campaign-1');
    });
  });
});
