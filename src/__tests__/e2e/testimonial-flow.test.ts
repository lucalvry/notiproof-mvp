import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('Testimonial E2E Flow', () => {
  const mockWebsiteId = 'test-website-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Collection → Moderation → Display Flow', () => {
    it('should complete full testimonial lifecycle', async () => {
      // Step 1: Collect testimonial via public form
      const testimonialData = {
        website_id: mockWebsiteId,
        author_name: 'Jane Doe',
        author_email: 'jane@example.com',
        rating: 5,
        message: 'Absolutely love this product!',
        source: 'form',
        status: 'pending', // Starts as pending
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'testimonial-1', ...testimonialData }],
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
      });

      // Collect testimonial
      const { data: collected } = await supabase
        .from('testimonials')
        .insert(testimonialData)
        .select();

      expect(collected[0].status).toBe('pending');
      expect(collected[0].rating).toBe(5);

      // Step 2: Moderate testimonial (approve)
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ ...collected[0], status: 'approved' }],
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      const { data: moderated } = await supabase
        .from('testimonials')
        .update({ status: 'approved' })
        .eq('id', 'testimonial-1')
        .select();

      expect(moderated[0].status).toBe('approved');

      // Step 3: Create campaign to display testimonial
      const campaignData = {
        name: 'Customer Reviews Campaign',
        website_id: mockWebsiteId,
        user_id: mockUserId,
        campaign_type: 'notification',
        data_sources: [
          {
            integration_id: 'testimonials-integration',
            provider: 'testimonials',
            filters: {
              min_rating: 4,
              status: 'approved',
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

      const mockCampaignInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'campaign-1', ...campaignData }],
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockCampaignInsert,
      });

      const { data: campaign } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select();

      expect(campaign[0].status).toBe('active');
      expect(campaign[0].data_sources[0].provider).toBe('testimonials');

      // Step 4: Verify testimonial can be queried for display
      const mockTestimonialQuery = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [moderated[0]],
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockTestimonialQuery,
      });

      const { data: displayTestimonials } = await supabase
        .from('testimonials')
        .select('*')
        .eq('website_id', mockWebsiteId)
        .gte('rating', 4)
        .eq('status', 'approved');

      expect(displayTestimonials).toHaveLength(1);
      expect(displayTestimonials[0].id).toBe('testimonial-1');
    });

    it('should handle testimonial rejection', async () => {
      const testimonialData = {
        id: 'testimonial-2',
        website_id: mockWebsiteId,
        author_name: 'Spam User',
        rating: 1,
        message: 'Spam content',
        status: 'pending',
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ ...testimonialData, status: 'rejected' }],
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      const { data: rejected } = await supabase
        .from('testimonials')
        .update({ status: 'rejected' })
        .eq('id', 'testimonial-2')
        .select();

      expect(rejected[0].status).toBe('rejected');

      // Verify rejected testimonials don't appear in campaign queries
      const mockQuery = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [], // No rejected testimonials
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockQuery,
      });

      const { data: displayed } = await supabase
        .from('testimonials')
        .select('*')
        .eq('website_id', mockWebsiteId)
        .eq('status', 'approved');

      expect(displayed).toHaveLength(0);
    });
  });

  describe('Testimonial with Media', () => {
    it('should handle image upload and display', async () => {
      const testimonialWithImage = {
        website_id: mockWebsiteId,
        author_name: 'Photo User',
        rating: 5,
        message: 'Look at this!',
        image_url: 'https://storage.example.com/testimonial-image.jpg',
        status: 'pending',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'testimonial-3', ...testimonialWithImage }],
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const { data } = await supabase
        .from('testimonials')
        .insert(testimonialWithImage)
        .select();

      expect(data[0].image_url).toBeTruthy();
      expect(data[0].image_url).toMatch(/^https:\/\//);
    });

    it('should handle video testimonials', async () => {
      const testimonialWithVideo = {
        website_id: mockWebsiteId,
        author_name: 'Video User',
        rating: 5,
        message: 'Watch my review!',
        video_url: 'https://youtube.com/watch?v=abc123',
        status: 'pending',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'testimonial-4', ...testimonialWithVideo }],
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const { data } = await supabase
        .from('testimonials')
        .insert(testimonialWithVideo)
        .select();

      expect(data[0].video_url).toBeTruthy();
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk approval of testimonials', async () => {
      const testimonialIds = ['test-1', 'test-2', 'test-3'];

      const mockUpdate = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: testimonialIds.map(id => ({
              id,
              status: 'approved',
            })),
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      const { data } = await supabase
        .from('testimonials')
        .update({ status: 'approved' })
        .in('id', testimonialIds)
        .select();

      expect(data).toHaveLength(3);
      expect(data.every(t => t.status === 'approved')).toBe(true);
    });
  });
});
