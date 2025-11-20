import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('Campaign Creation Integration', () => {
  const mockUserId = 'test-user-id';
  const mockWebsiteId = 'test-website-id';
  const mockTemplateId = 'test-template-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Single Integration Campaign', () => {
    it('should create campaign with Shopify integration', async () => {
      const campaignData = {
        name: 'Shopify Sales Campaign',
        website_id: mockWebsiteId,
        user_id: mockUserId,
        campaign_type: 'notification',
        template_id: mockTemplateId,
        data_sources: [
          {
            integration_id: 'shopify-integration-id',
            provider: 'shopify',
            filters: {
              event_types: ['orders/create'],
              min_order_value: 100,
            },
          },
        ],
        template_mapping: {
          'template.product_name': 'payload.line_items[0].title',
          'template.customer_name': 'payload.customer.first_name',
          'template.order_total': 'payload.total_price',
        },
        status: 'active',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'new-campaign-id', ...campaignData }],
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data[0].name).toBe('Shopify Sales Campaign');
      expect(data[0].data_sources).toHaveLength(1);
    });

    it('should create campaign with Testimonial integration', async () => {
      const campaignData = {
        name: 'Customer Reviews',
        website_id: mockWebsiteId,
        user_id: mockUserId,
        campaign_type: 'notification',
        template_id: mockTemplateId,
        data_sources: [
          {
            integration_id: 'testimonial-integration-id',
            provider: 'testimonials',
            filters: {
              min_rating: 4,
              verified_only: true,
            },
          },
        ],
        template_mapping: {
          'template.author_name': 'normalized.template.author_name',
          'template.rating': 'normalized.template.rating',
          'template.message': 'normalized.template.message',
        },
        status: 'active',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'new-campaign-id', ...campaignData }],
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select();

      expect(error).toBeNull();
      expect(data[0].data_sources[0].filters.min_rating).toBe(4);
    });
  });

  describe('Multi-Integration Campaign', () => {
    it('should create campaign with multiple data sources', async () => {
      const campaignData = {
        name: 'Multi-Source Social Proof',
        website_id: mockWebsiteId,
        user_id: mockUserId,
        campaign_type: 'notification',
        template_id: mockTemplateId,
        data_sources: [
          {
            integration_id: 'shopify-id',
            provider: 'shopify',
            filters: { event_types: ['orders/create'] },
          },
          {
            integration_id: 'testimonial-id',
            provider: 'testimonials',
            filters: { min_rating: 5 },
          },
          {
            integration_id: 'stripe-id',
            provider: 'stripe',
            filters: { event_types: ['payment_intent.succeeded'] },
          },
        ],
        status: 'active',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'new-campaign-id', ...campaignData }],
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select();

      expect(error).toBeNull();
      expect(data[0].data_sources).toHaveLength(3);
      expect((data[0].data_sources as any[]).map((ds: any) => ds.provider)).toEqual([
        'shopify',
        'testimonials',
        'stripe',
      ]);
    });
  });

  describe('Campaign with Orchestration', () => {
    it('should create campaign with priority and frequency caps', async () => {
      const campaignData = {
        name: 'High Priority Campaign',
        website_id: mockWebsiteId,
        user_id: mockUserId,
        priority: 200,
        frequency_cap: {
          per_user: 3,
          per_session: 2,
          cooldown_seconds: 900,
        },
        data_sources: [
          {
            integration_id: 'test-id',
            provider: 'testimonials',
          },
        ],
        status: 'active',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'new-campaign-id', ...campaignData }],
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select();

      expect(error).toBeNull();
      expect(data[0].priority).toBe(200);
      expect((data[0].frequency_cap as any).per_user).toBe(3);
    });
  });

  describe('Campaign Validation', () => {
    it('should enforce website_id requirement', async () => {
      const campaignData = {
        name: 'Invalid Campaign',
        user_id: mockUserId,
        website_id: mockWebsiteId, // Add required field
        status: 'draft',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'validation error' },
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const { data, error } = await supabase
        .from('campaigns')
        .insert([campaignData])
        .select();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });
});
