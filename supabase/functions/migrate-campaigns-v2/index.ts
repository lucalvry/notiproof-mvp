import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LegacyCampaign {
  id: string;
  data_source: string | null;
  integration_settings: any;
  template_id: string | null;
}

interface MigrationResult {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: Array<{ campaign_id: string; error: string }>;
  ambiguous: Array<{ campaign_id: string; reason: string; current_data: any }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { dryRun = true } = await req.json().catch(() => ({ dryRun: true }));

    const result: MigrationResult = {
      success: true,
      migrated: 0,
      skipped: 0,
      errors: [],
      ambiguous: [],
    };

    // Fetch campaigns that need migration
    const { data: campaigns, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, data_source, data_sources_v2, integration_settings, template_id, website_id')
      .or('data_sources_v2.is.null,data_sources_v2.eq.[]');

    if (fetchError) throw fetchError;

    console.log(`Found ${campaigns?.length || 0} campaigns to review`);

    for (const campaign of campaigns || []) {
      try {
        // Skip if already has v2 data sources
        if (campaign.data_sources_v2 && Array.isArray(campaign.data_sources_v2) && campaign.data_sources_v2.length > 0) {
          result.skipped++;
          continue;
        }

        // Map legacy data_source to data_sources_v2
        const dataSources: any[] = [];

        if (campaign.data_source) {
          // Find corresponding integration
          const { data: integrations } = await supabase
            .from('integration_connectors')
            .select('id, integration_type')
            .eq('website_id', campaign.website_id)
            .eq('integration_type', campaign.data_source);

          if (integrations && integrations.length > 0) {
            dataSources.push({
              integration_id: integrations[0].id,
              provider: campaign.data_source,
              filters: campaign.integration_settings || {},
            });
          } else {
            // Ambiguous: no matching integration found
            result.ambiguous.push({
              campaign_id: campaign.id,
              reason: `No integration found for data_source: ${campaign.data_source}`,
              current_data: {
                data_source: campaign.data_source,
                integration_settings: campaign.integration_settings,
              },
            });
            continue;
          }
        } else {
          // No legacy data source - check if it's native
          const nativeSources = ['announcements', 'instant_capture', 'live_visitors'];
          const { data: nativeConfigs } = await supabase
            .from('campaigns')
            .select('native_config')
            .eq('id', campaign.id)
            .single();

          if (nativeConfigs?.native_config && Object.keys(nativeConfigs.native_config).length > 0) {
            // This is a native campaign - determine which type
            const configKeys = Object.keys(nativeConfigs.native_config);
            if (configKeys.includes('message_template')) {
              dataSources.push({
                integration_id: null,
                provider: 'announcements',
                filters: {},
              });
            }
          } else {
            result.ambiguous.push({
              campaign_id: campaign.id,
              reason: 'No data_source and no native_config found',
              current_data: {
                data_source: campaign.data_source,
                native_config: nativeConfigs?.native_config,
              },
            });
            continue;
          }
        }

        if (!dryRun && dataSources.length > 0) {
          const { error: updateError } = await supabase
            .from('campaigns')
            .update({
              data_sources_v2: dataSources,
            })
            .eq('id', campaign.id);

          if (updateError) {
            result.errors.push({
              campaign_id: campaign.id,
              error: updateError.message,
            });
            continue;
          }
        }

        result.migrated++;
      } catch (error) {
        result.errors.push({
          campaign_id: campaign.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        ...result,
        dryRun,
        message: dryRun
          ? 'Dry run complete - no changes made. Set dryRun=false to apply changes.'
          : 'Migration complete',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
