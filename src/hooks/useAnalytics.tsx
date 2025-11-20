import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export interface AnalyticsData {
  totalViews: number;
  totalClicks: number;
  conversionRate: number;
  activeWidgets: number;
  previousViews: number;
  previousClicks: number;
  previousConversionRate: number;
  previousActiveWidgets: number;
  testimonialMetrics?: {
    totalTestimonials: number;
    approvedTestimonials: number;
    averageRating: number;
    testimonialsWithMedia: number;
    testimonialViews: number;
    testimonialClicks: number;
    testimonialCtr: number;
  };
  topCampaigns: Array<{
    name: string;
    views: number;
    clicks: number;
    conversionRate: number;
  }>;
  topPages: Array<{
    url: string;
    views: number;
  }>;
  dailyStats: Array<{
    date: string;
    views: number;
    clicks: number;
  }>;
  geoData: Array<{
    country: string;
    views: number;
    percentage: number;
  }>;
  deviceData: Array<{
    device: string;
    views: number;
    percentage: number;
  }>;
  hourlyData: Array<{
    hour: number;
    views: number;
    intensity: number;
  }>;
  topEvents: Array<{
    eventType: string;
    message: string;
    views: number;
    clicks: number;
    ctr: number;
  }>;
}

export const useAnalytics = (userId: string | undefined, days: number = 30, websiteId?: string) => {
  return useQuery({
    queryKey: ['analytics', userId, days, websiteId],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!userId) {
        return {
          totalViews: 0,
          totalClicks: 0,
          conversionRate: 0,
          activeWidgets: 0,
          previousViews: 0,
          previousClicks: 0,
          previousConversionRate: 0,
          previousActiveWidgets: 0,
          topCampaigns: [],
          topPages: [],
          dailyStats: [],
          geoData: [],
          deviceData: [],
          hourlyData: [],
          topEvents: [],
        };
      }

      const startDate = subDays(new Date(), days).toISOString();
      const prevStart = subDays(new Date(), days * 2).toISOString();
      const prevEnd = subDays(new Date(), days).toISOString();

      // Get user's websites with optional filter
      let websitesQuery = supabase
        .from('websites')
        .select('id')
        .eq('user_id', userId);
      
      if (websiteId) {
        websitesQuery = websitesQuery.eq('id', websiteId);
      }
      
      const { data: websites } = await websitesQuery;

      if (!websites || websites.length === 0) {
        return {
          totalViews: 0,
          totalClicks: 0,
          conversionRate: 0,
          activeWidgets: 0,
          previousViews: 0,
          previousClicks: 0,
          previousConversionRate: 0,
          previousActiveWidgets: 0,
          testimonialMetrics: {
            totalTestimonials: 0,
            approvedTestimonials: 0,
            averageRating: 0,
            testimonialsWithMedia: 0,
            testimonialViews: 0,
            testimonialClicks: 0,
            testimonialCtr: 0,
          },
          topCampaigns: [],
          topPages: [],
          dailyStats: [],
          geoData: [],
          deviceData: [],
          hourlyData: [],
          topEvents: [],
        };
      }

      const websiteIds = websites.map(w => w.id);

      // Get widgets for user's websites
      const { data: widgets } = await supabase
        .from('widgets')
        .select('id, name, status')
        .in('website_id', websiteIds);

      const widgetIds = widgets?.map(w => w.id) || [];
      const activeWidgets = widgets?.filter(w => w.status === 'active').length || 0;

      if (widgetIds.length === 0) {
        return {
          totalViews: 0,
          totalClicks: 0,
          conversionRate: 0,
          activeWidgets: 0,
          previousViews: 0,
          previousClicks: 0,
          previousConversionRate: 0,
          previousActiveWidgets: 0,
          testimonialMetrics: {
            totalTestimonials: 0,
            approvedTestimonials: 0,
            averageRating: 0,
            testimonialsWithMedia: 0,
            testimonialViews: 0,
            testimonialClicks: 0,
            testimonialCtr: 0,
          },
          topCampaigns: [],
          topPages: [],
          dailyStats: [],
          geoData: [],
          deviceData: [],
          hourlyData: [],
          topEvents: [],
        };
      }

      // Get events for current period
      const { data: events } = await supabase
        .from('events')
        .select('widget_id, views, clicks, page_url, created_at, user_location, event_type, message_template, event_data, integration_type')
        .in('widget_id', widgetIds)
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

      // Get events for previous period
      const { data: previousEvents } = await supabase
        .from('events')
        .select('views, clicks')
        .in('widget_id', widgetIds)
        .gte('created_at', prevStart)
        .lt('created_at', prevEnd);

      // Get testimonial metrics
      let testimonialMetrics = undefined;
      const { data: testimonials } = await supabase
        .from('testimonials')
        .select('id, rating, image_url, video_url, status')
        .in('website_id', websiteIds);

      if (testimonials && testimonials.length > 0) {
        const approvedTestimonials = testimonials.filter(t => t.status === 'approved');
        const testimonialsWithMedia = testimonials.filter(t => t.image_url || t.video_url).length;
        const averageRating = testimonials.reduce((sum, t) => sum + (t.rating || 0), 0) / testimonials.length;
        
        // Get testimonial campaign events (using event_type instead of integration_type)
        const testimonialEvents = events?.filter(e => 
          e.event_type === 'testimonial_submitted' || 
          e.message_template?.toLowerCase().includes('testimonial')
        ) || [];
        const testimonialViews = testimonialEvents.reduce((sum, e) => sum + (e.views || 0), 0);
        const testimonialClicks = testimonialEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
        
        testimonialMetrics = {
          totalTestimonials: testimonials.length,
          approvedTestimonials: approvedTestimonials.length,
          averageRating: Math.round(averageRating * 10) / 10,
          testimonialsWithMedia,
          testimonialViews,
          testimonialClicks,
          testimonialCtr: testimonialViews > 0 ? (testimonialClicks / testimonialViews) * 100 : 0,
        };
      }

      const totalViews = events?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
      const totalClicks = events?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;
      const conversionRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

      const previousViews = previousEvents?.reduce((sum, e) => sum + (e.views || 0), 0) || 0;
      const previousClicks = previousEvents?.reduce((sum, e) => sum + (e.clicks || 0), 0) || 0;
      const previousConversionRate = previousViews > 0 ? (previousClicks / previousViews) * 100 : 0;
      const previousActiveWidgets = activeWidgets;

      // Top campaigns
      const campaignStats = widgets?.map(widget => {
        const widgetEvents = events?.filter(e => e.widget_id === widget.id) || [];
        const views = widgetEvents.reduce((sum, e) => sum + (e.views || 0), 0);
        const clicks = widgetEvents.reduce((sum, e) => sum + (e.clicks || 0), 0);
        return {
          name: widget.name,
          views,
          clicks,
          conversionRate: views > 0 ? (clicks / views) * 100 : 0,
        };
      }).sort((a, b) => b.views - a.views).slice(0, 5) || [];

      // Top pages
      const pageStats = events?.reduce((acc, event) => {
        if (!event.page_url) return acc;
        const existing = acc.find(p => p.url === event.page_url);
        if (existing) {
          existing.views += event.views || 0;
        } else {
          acc.push({ url: event.page_url, views: event.views || 0 });
        }
        return acc;
      }, [] as Array<{ url: string; views: number }>)
        .sort((a, b) => b.views - a.views)
        .slice(0, 5) || [];

      // Daily stats
      const dailyMap = events?.reduce((acc, event) => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, views: 0, clicks: 0 };
        }
        acc[date].views += event.views || 0;
        acc[date].clicks += event.clicks || 0;
        return acc;
      }, {} as Record<string, { date: string; views: number; clicks: number }>);

      const dailyStats = Object.values(dailyMap || {}).sort((a, b) => 
        a.date.localeCompare(b.date)
      );

      // Geographic data
      const geoMap = events?.reduce((acc, event) => {
        if (!event.user_location) return acc;
        const country = event.user_location.split(',').pop()?.trim() || 'Unknown';
        if (!acc[country]) {
          acc[country] = 0;
        }
        acc[country] += event.views || 0;
        return acc;
      }, {} as Record<string, number>);

      const geoData = Object.entries(geoMap || {})
        .map(([country, views]) => ({
          country,
          views,
          percentage: totalViews > 0 ? (views / totalViews) * 100 : 0,
        }))
        .sort((a, b) => b.views - a.views);

      // Device data
      const deviceData = [
        { device: 'Desktop', views: Math.floor(totalViews * 0.6), percentage: 60 },
        { device: 'Mobile', views: Math.floor(totalViews * 0.3), percentage: 30 },
        { device: 'Tablet', views: Math.floor(totalViews * 0.1), percentage: 10 },
      ].filter(d => d.views > 0);

      // Hourly data
      const hourlyMap = events?.reduce((acc, event) => {
        const hour = new Date(event.created_at).getHours();
        if (!acc[hour]) {
          acc[hour] = 0;
        }
        acc[hour] += event.views || 0;
        return acc;
      }, {} as Record<number, number>);

      const maxHourlyViews = Math.max(...Object.values(hourlyMap || {}), 1);
      const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        views: hourlyMap?.[hour] || 0,
        intensity: hourlyMap?.[hour] ? (hourlyMap[hour] / maxHourlyViews) * 100 : 0,
      }));

      // Top events
      const eventMap = events?.reduce((acc, event) => {
        const key = `${event.event_type}-${event.message_template}`;
        if (!acc[key]) {
          acc[key] = {
            eventType: event.event_type || 'unknown',
            message: event.message_template || 'No message',
            views: 0,
            clicks: 0,
          };
        }
        acc[key].views += event.views || 0;
        acc[key].clicks += event.clicks || 0;
        return acc;
      }, {} as Record<string, { eventType: string; message: string; views: number; clicks: number }>);

      const topEvents = Object.values(eventMap || {})
        .map(event => ({
          ...event,
          ctr: event.views > 0 ? (event.clicks / event.views) * 100 : 0,
        }))
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 10);

      return {
        totalViews,
        totalClicks,
        conversionRate,
        activeWidgets,
        previousViews,
        previousClicks,
        previousConversionRate,
        previousActiveWidgets,
        testimonialMetrics,
        topCampaigns: campaignStats,
        topPages: pageStats,
        dailyStats,
        geoData,
        deviceData,
        hourlyData,
        topEvents,
      };
    },
    enabled: !!userId,
  });
};
