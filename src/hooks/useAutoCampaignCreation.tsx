import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";
import { getCampaignTypeForIntegration } from "@/lib/campaignTemplates";

interface AutoCampaignOptions {
  integrationName: string;
  connectorId: string;
  websiteId: string;
  userId: string;
}

export function useAutoCampaignCreation() {
  const [isCreating, setIsCreating] = useState(false);

  const createCampaignFromIntegration = async ({
    integrationName,
    connectorId,
    websiteId,
    userId
  }: AutoCampaignOptions) => {
    setIsCreating(true);
    
    try {
      // Get integration metadata
      const integrationMeta = getIntegrationMetadata(integrationName);
      
      // Determine campaign type based on integration
      const campaignType = getCampaignTypeForIntegration(integrationName);
      
      // Generate campaign name
      const campaignName = `${integrationMeta.displayName} Notifications`;
      
      // Create default settings based on integration type
      const defaultSettings = {
        position: 'bottom-left',
        animation: 'slide',
        backgroundColor: getDefaultColorForIntegration(integrationName),
        textColor: '#ffffff',
        displayDuration: 5,
        initialDelay: 2,
        displayInterval: 10,
        maxPerPage: 5,
        maxPerSession: 20,
      };

      // Create default message template
      const messageTemplate = getDefaultMessageTemplate(integrationName, campaignType);

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: userId,
          website_id: websiteId,
          name: campaignName,
          type: campaignType,
          status: 'active',
          data_source: integrationName,
          message_template: messageTemplate,
          template_name: campaignType,
          settings: defaultSettings,
          display_rules: {
            display: {
              position: 'bottom-left',
              animation: 'slide',
              displayDuration: 5,
              initialDelay: 2,
              displayInterval: 10,
              maxPerPage: 5,
              maxPerSession: 20,
            },
            url_rules: {
              include_urls: [],
              exclude_urls: [],
              match_type: 'all'
            },
            countries: {
              include: [],
              exclude: [],
              mode: 'all'
            },
            devices: {
              desktop: true,
              mobile: true,
              tablet: true
            },
            schedule: {
              enabled: false,
              timezone: 'UTC',
              days: [0, 1, 2, 3, 4, 5, 6],
              hours: { start: 0, end: 24 }
            }
          },
          polling_config: {
            enabled: true,
            interval_minutes: 5,
            max_events_per_fetch: 10,
            last_poll_at: null
          }
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Generate some demo events immediately for instant feedback
      // Note: Events are linked to campaigns, not widgets directly
      await generateDemoEventsForCampaign(campaign.id, integrationName, userId);

      return {
        success: true,
        campaign,
        campaignId: campaign.id
      };

    } catch (error: any) {
      console.error('Error creating auto-campaign:', error);
      toast.error('Failed to create campaign', {
        description: error.message
      });
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createCampaignFromIntegration,
    isCreating
  };
}

// Helper: Get default color based on integration type
function getDefaultColorForIntegration(integration: string): string {
  const colorMap: Record<string, string> = {
    shopify: '#96bf48',
    stripe: '#635bff',
    woocommerce: '#7f54b3',
    mailchimp: '#ffe01b',
    typeform: '#262627',
    calendly: '#006bff',
    convertkit: '#fb6970',
    ga4: '#e37400',
    instagram: '#e4405f',
    twitter: '#1da1f2',
    google_reviews: '#4285f4',
    gumroad: '#ff90e8',
  };
  
  return colorMap[integration] || '#10b981';
}

// Helper: Get default message template
function getDefaultMessageTemplate(integration: string, campaignType: string): string {
  const templateMap: Record<string, string> = {
    shopify: '{{user_name}} from {{location}} just purchased {{product_name}}',
    woocommerce: '{{user_name}} from {{location}} just purchased {{product_name}}',
    stripe: '{{user_name}} just subscribed to {{plan_name}}',
    mailchimp: '{{user_name}} subscribed to {{list_name}}',
    convertkit: '{{user_name}} subscribed to our newsletter',
    typeform: '{{user_name}} just submitted a form',
    calendly: '{{user_name}} booked {{event_type}} for {{time}}',
    gumroad: '{{user_name}} purchased {{product_name}}',
    ga4: '{{count}} people are viewing {{page}} right now',
    instagram: '{{user_name}} liked your post: {{content}}',
    twitter: '{{user_name}} retweeted your post',
    google_reviews: '{{rating}} "{{review_text}}" - {{reviewer_name}}',
  };
  
  return templateMap[integration] || '{{user_name}} just took an action on your site';
}

// Helper: Generate demo events for immediate visual feedback
async function generateDemoEventsForCampaign(campaignId: string, integration: string, userId: string) {
  // For now, just log - actual event generation will be handled by the campaign system
  console.log(`Auto-campaign created for ${integration}. Campaign ID: ${campaignId}`);
  
  // The campaign system will automatically pull events from the integration
  // We don't need to create demo events manually
}
