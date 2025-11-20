import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export interface TestimonialAnalytics {
  totalTestimonials: number;
  approvedTestimonials: number;
  pendingTestimonials: number;
  rejectedTestimonials: number;
  approvalRate: number;
  averageRating: number;
  testimonialsWithMedia: number;
  mediaRate: number;
  testimonialViews: number;
  testimonialClicks: number;
  testimonialCtr: number;
  ratingDistribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  submissionsByDay: Array<{
    date: string;
    submissions: number;
  }>;
  topForms: Array<{
    formName: string;
    submissions: number;
  }>;
}

export const useTestimonialAnalytics = (websiteId: string | undefined, days: number = 30) => {
  return useQuery({
    queryKey: ['testimonial-analytics', websiteId, days],
    queryFn: async (): Promise<TestimonialAnalytics> => {
      if (!websiteId) {
        return getEmptyAnalytics();
      }

      const startDate = subDays(new Date(), days).toISOString();

      // Fetch testimonials for the website
      const { data: testimonials, error: testimonialsError } = await supabase
        .from('testimonials')
        .select('id, rating, image_url, video_url, status, created_at, form_id')
        .eq('website_id', websiteId)
        .gte('created_at', startDate);

      if (testimonialsError) throw testimonialsError;

      if (!testimonials || testimonials.length === 0) {
        return getEmptyAnalytics();
      }

      // Calculate basic metrics
      const totalTestimonials = testimonials.length;
      const approvedTestimonials = testimonials.filter(t => t.status === 'approved').length;
      const pendingTestimonials = testimonials.filter(t => t.status === 'pending').length;
      const rejectedTestimonials = testimonials.filter(t => t.status === 'rejected').length;
      const approvalRate = totalTestimonials > 0 ? (approvedTestimonials / totalTestimonials) * 100 : 0;

      // Calculate average rating
      const ratingsSum = testimonials.reduce((sum, t) => sum + (t.rating || 0), 0);
      const averageRating = totalTestimonials > 0 ? ratingsSum / totalTestimonials : 0;

      // Calculate media metrics
      const testimonialsWithMedia = testimonials.filter(t => t.image_url || t.video_url).length;
      const mediaRate = totalTestimonials > 0 ? (testimonialsWithMedia / totalTestimonials) * 100 : 0;

      // Get campaign events for testimonials
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('website_id', websiteId)
        .eq('campaign_type', 'testimonial');

      let testimonialViews = 0;
      let testimonialClicks = 0;

      if (campaigns && campaigns.length > 0) {
        const campaignIds = campaigns.map(c => c.id);

        const { data: widgets } = await supabase
          .from('widgets')
          .select('id')
          .in('campaign_id', campaignIds);

        if (widgets && widgets.length > 0) {
          const widgetIds = widgets.map(w => w.id);

          const { data: events } = await supabase
            .from('events')
            .select('views, clicks')
            .in('widget_id', widgetIds)
            .gte('created_at', startDate);

          if (events) {
            testimonialViews = events.reduce((sum, e) => sum + (e.views || 0), 0);
            testimonialClicks = events.reduce((sum, e) => sum + (e.clicks || 0), 0);
          }
        }
      }

      const testimonialCtr = testimonialViews > 0 ? (testimonialClicks / testimonialViews) * 100 : 0;

      // Rating distribution
      const ratingCounts = [0, 0, 0, 0, 0]; // Index 0 = 1 star, Index 4 = 5 stars
      testimonials.forEach(t => {
        if (t.rating && t.rating >= 1 && t.rating <= 5) {
          ratingCounts[t.rating - 1]++;
        }
      });

      const ratingDistribution = ratingCounts.map((count, index) => ({
        rating: index + 1,
        count,
        percentage: totalTestimonials > 0 ? (count / totalTestimonials) * 100 : 0,
      }));

      // Submissions by day
      const dailyMap = new Map<string, number>();
      testimonials.forEach(t => {
        const date = new Date(t.created_at).toISOString().split('T')[0];
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
      });

      const submissionsByDay = Array.from(dailyMap.entries())
        .map(([date, submissions]) => ({ date, submissions }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top forms
      const { data: forms } = await supabase
        .from('testimonial_forms')
        .select('id, name')
        .eq('website_id', websiteId);

      const formMap = new Map<string, { name: string; count: number }>();
      if (forms) {
        forms.forEach(f => {
          const count = testimonials.filter(t => t.form_id === f.id).length;
          if (count > 0) {
            formMap.set(f.id, { name: f.name, count });
          }
        });
      }

      const topForms = Array.from(formMap.values())
        .map(f => ({ formName: f.name, submissions: f.count }))
        .sort((a, b) => b.submissions - a.submissions)
        .slice(0, 5);

      return {
        totalTestimonials,
        approvedTestimonials,
        pendingTestimonials,
        rejectedTestimonials,
        approvalRate: Math.round(approvalRate * 10) / 10,
        averageRating: Math.round(averageRating * 10) / 10,
        testimonialsWithMedia,
        mediaRate: Math.round(mediaRate * 10) / 10,
        testimonialViews,
        testimonialClicks,
        testimonialCtr: Math.round(testimonialCtr * 100) / 100,
        ratingDistribution,
        submissionsByDay,
        topForms,
      };
    },
    enabled: !!websiteId,
  });
};

function getEmptyAnalytics(): TestimonialAnalytics {
  return {
    totalTestimonials: 0,
    approvedTestimonials: 0,
    pendingTestimonials: 0,
    rejectedTestimonials: 0,
    approvalRate: 0,
    averageRating: 0,
    testimonialsWithMedia: 0,
    mediaRate: 0,
    testimonialViews: 0,
    testimonialClicks: 0,
    testimonialCtr: 0,
    ratingDistribution: [
      { rating: 1, count: 0, percentage: 0 },
      { rating: 2, count: 0, percentage: 0 },
      { rating: 3, count: 0, percentage: 0 },
      { rating: 4, count: 0, percentage: 0 },
      { rating: 5, count: 0, percentage: 0 },
    ],
    submissionsByDay: [],
    topForms: [],
  };
}
