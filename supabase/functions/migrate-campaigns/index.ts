import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  success: boolean;
  migratedWidgets: number;
  migratedCampaigns: number;
  errors: string[];
  details: {
    widgetIds: string[];
    campaignIds: string[];
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || !['admin', 'superadmin'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting widget migration to version 2...');

    const result: MigrationResult = {
      success: true,
      migratedWidgets: 0,
      migratedCampaigns: 0,
      errors: [],
      details: {
        widgetIds: [],
        campaignIds: [],
      },
    };

    // Find all widgets without feature_flags or with version < 2
    const { data: widgetsToMigrate, error: fetchError } = await supabase
      .from('widgets')
      .select('id, campaign_id, feature_flags')
      .or('feature_flags.is.null,feature_flags->version.lt.2');

    if (fetchError) {
      console.error('Error fetching widgets:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${widgetsToMigrate?.length || 0} widgets to migrate`);

    if (!widgetsToMigrate || widgetsToMigrate.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No widgets need migration',
          ...result,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Migrate each widget
    for (const widget of widgetsToMigrate) {
      try {
        const { error: updateError } = await supabase
          .from('widgets')
          .update({
            feature_flags: {
              showProductImages: true,
              linkifyProducts: true,
              fallbackIcon: 'default',
              version: 2,
            },
          })
          .eq('id', widget.id);

        if (updateError) {
          console.error(`Error updating widget ${widget.id}:`, updateError);
          result.errors.push(`Widget ${widget.id}: ${updateError.message}`);
          continue;
        }

        result.migratedWidgets++;
        result.details.widgetIds.push(widget.id);

        // Track campaign IDs
        if (widget.campaign_id && !result.details.campaignIds.includes(widget.campaign_id)) {
          result.details.campaignIds.push(widget.campaign_id);
          result.migratedCampaigns++;
        }

        console.log(`Migrated widget ${widget.id} to version 2`);
      } catch (error: any) {
        console.error(`Exception migrating widget ${widget.id}:`, error);
        result.errors.push(`Widget ${widget.id}: ${error.message}`);
      }
    }

    console.log('Migration completed:', {
      migratedWidgets: result.migratedWidgets,
      migratedCampaigns: result.migratedCampaigns,
      errors: result.errors.length,
    });

    // Log migration activity
    await supabase.from('audit_logs').insert({
      admin_id: user.id,
      action: 'migrate_widgets',
      resource_type: 'widget',
      details: {
        migratedWidgets: result.migratedWidgets,
        migratedCampaigns: result.migratedCampaigns,
        errors: result.errors,
      },
    });

    return new Response(
      JSON.stringify({
        message: `Successfully migrated ${result.migratedWidgets} widgets across ${result.migratedCampaigns} campaigns`,
        ...result,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Migration failed',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
