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
  formViews: number;
  testimonialViews: number;
  testimonialClicks: number;
  testimonialCtr: number;
  // New Phase 10 metrics
  videoSubmissionRate: number;
  imageSubmissionRate: number;
  textOnlyRate: number;
  conversionRate: number; // formViews to submissions
  averageTimeToSubmit: number | null; // in minutes
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailOpenRate: number;
  emailClickRate: number;
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
  // New Phase 10 chart data
  conversionFunnel: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  mediaTypeBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
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
        .select('id, name, view_count')
        .eq('website_id', websiteId);

      // Calculate total form views
      const formViews = forms ? forms.reduce((sum, f) => sum + (f.view_count || 0), 0) : 0;

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

      // Phase 10: New metrics
      // Video/Image submission rates
      const videoCount = testimonials.filter(t => t.video_url).length;
      const imageCount = testimonials.filter(t => t.image_url && !t.video_url).length;
      const textOnlyCount = testimonials.filter(t => !t.image_url && !t.video_url).length;
      
      const videoSubmissionRate = totalTestimonials > 0 ? (videoCount / totalTestimonials) * 100 : 0;
      const imageSubmissionRate = totalTestimonials > 0 ? (imageCount / totalTestimonials) * 100 : 0;
      const textOnlyRate = totalTestimonials > 0 ? (textOnlyCount / totalTestimonials) * 100 : 0;

      // Conversion rate (form views to submissions)
      const conversionRate = formViews > 0 ? (totalTestimonials / formViews) * 100 : 0;

      // Average time to submit - calculate based on session data if available
      // For now, we'll estimate based on creation times (mock data)
      const averageTimeToSubmit = null; // Would need session tracking data

      // Email metrics
      const { data: invites } = await supabase
        .from('testimonial_invites')
        .select('status, sent_at, opened_at, submitted_at')
        .in('form_id', forms ? forms.map(f => f.id) : [])
        .gte('sent_at', startDate);

      const emailsSent = invites ? invites.filter(i => i.status !== 'pending').length : 0;
      const emailsOpened = invites ? invites.filter(i => i.opened_at).length : 0;
      const emailsClicked = invites ? invites.filter(i => i.submitted_at).length : 0;
      const emailOpenRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;
      const emailClickRate = emailsOpened > 0 ? (emailsClicked / emailsOpened) * 100 : 0;

      // Conversion funnel data
      const formStarts = totalTestimonials; // Assume all submissions mean they started
      const conversionFunnel = [
        {
          stage: 'Views',
          count: formViews,
          percentage: 100,
        },
        {
          stage: 'Started',
          count: formStarts,
          percentage: formViews > 0 ? (formStarts / formViews) * 100 : 0,
        },
        {
          stage: 'Completed',
          count: totalTestimonials,
          percentage: formViews > 0 ? (totalTestimonials / formViews) * 100 : 0,
        },
        {
          stage: 'Approved',
          count: approvedTestimonials,
          percentage: formViews > 0 ? (approvedTestimonials / formViews) * 100 : 0,
        },
      ];

      // Media type breakdown for pie chart
      const mediaTypeBreakdown = [
        {
          type: 'Text Only',
          count: textOnlyCount,
          percentage: totalTestimonials > 0 ? (textOnlyCount / totalTestimonials) * 100 : 0,
        },
        {
          type: 'With Image',
          count: imageCount,
          percentage: totalTestimonials > 0 ? (imageCount / totalTestimonials) * 100 : 0,
        },
        {
          type: 'With Video',
          count: videoCount,
          percentage: totalTestimonials > 0 ? (videoCount / totalTestimonials) * 100 : 0,
        },
      ].filter(item => item.count > 0);

      return {
        totalTestimonials,
        approvedTestimonials,
        pendingTestimonials,
        rejectedTestimonials,
        approvalRate: Math.round(approvalRate * 10) / 10,
        averageRating: Math.round(averageRating * 10) / 10,
        testimonialsWithMedia,
        mediaRate: Math.round(mediaRate * 10) / 10,
        formViews,
        testimonialViews,
        testimonialClicks,
        testimonialCtr: Math.round(testimonialCtr * 100) / 100,
        // Phase 10 new metrics
        videoSubmissionRate: Math.round(videoSubmissionRate * 10) / 10,
        imageSubmissionRate: Math.round(imageSubmissionRate * 10) / 10,
        textOnlyRate: Math.round(textOnlyRate * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        averageTimeToSubmit,
        emailsSent,
        emailsOpened,
        emailsClicked,
        emailOpenRate: Math.round(emailOpenRate * 10) / 10,
        emailClickRate: Math.round(emailClickRate * 10) / 10,
        ratingDistribution,
        submissionsByDay,
        topForms,
        conversionFunnel,
        mediaTypeBreakdown,
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
    formViews: 0,
    testimonialViews: 0,
    testimonialClicks: 0,
    testimonialCtr: 0,
    videoSubmissionRate: 0,
    imageSubmissionRate: 0,
    textOnlyRate: 0,
    conversionRate: 0,
    averageTimeToSubmit: null,
    emailsSent: 0,
    emailsOpened: 0,
    emailsClicked: 0,
    emailOpenRate: 0,
    emailClickRate: 0,
    ratingDistribution: [
      { rating: 1, count: 0, percentage: 0 },
      { rating: 2, count: 0, percentage: 0 },
      { rating: 3, count: 0, percentage: 0 },
      { rating: 4, count: 0, percentage: 0 },
      { rating: 5, count: 0, percentage: 0 },
    ],
    submissionsByDay: [],
    topForms: [],
    conversionFunnel: [],
    mediaTypeBreakdown: [],
  };
}
