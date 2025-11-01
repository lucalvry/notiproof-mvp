import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncompleteSubscription {
  id: string;
  user_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: string;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    console.log('🧹 Starting cleanup of incomplete subscriptions...');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    // Find subscriptions older than 7 days with incomplete status
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: incompleteSubscriptions, error: fetchError } = await supabaseClient
      .from('user_subscriptions')
      .select('id, user_id, stripe_subscription_id, stripe_customer_id, status, created_at')
      .in('status', ['incomplete', 'incomplete_expired'])
      .lt('created_at', sevenDaysAgo);

    if (fetchError) {
      throw new Error(`Failed to fetch incomplete subscriptions: ${fetchError.message}`);
    }

    console.log(`📊 Found ${incompleteSubscriptions?.length || 0} incomplete subscriptions older than 7 days`);

    const results = {
      total: incompleteSubscriptions?.length || 0,
      cancelled: 0,
      deleted: 0,
      errors: [] as string[],
    };

    // Process each incomplete subscription
    for (const subscription of (incompleteSubscriptions as IncompleteSubscription[]) || []) {
      try {
        // Cancel subscription in Stripe if it exists
        if (subscription.stripe_subscription_id) {
          const cancelResponse = await fetch(
            `https://api.stripe.com/v1/subscriptions/${subscription.stripe_subscription_id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${stripeKey}`,
              },
            }
          );

          if (cancelResponse.ok) {
            console.log(`✅ Cancelled Stripe subscription: ${subscription.stripe_subscription_id}`);
            results.cancelled++;
          } else if (cancelResponse.status === 404) {
            console.log(`⚠️ Stripe subscription not found: ${subscription.stripe_subscription_id}`);
          } else {
            const errorData = await cancelResponse.json();
            throw new Error(`Stripe API error: ${errorData.error?.message || 'Unknown error'}`);
          }
        }

        // Delete local subscription record
        const { error: deleteError } = await supabaseClient
          .from('user_subscriptions')
          .delete()
          .eq('id', subscription.id);

        if (deleteError) {
          throw new Error(`Failed to delete subscription ${subscription.id}: ${deleteError.message}`);
        }

        console.log(`🗑️ Deleted local subscription record: ${subscription.id}`);
        results.deleted++;

        // Log cleanup action
        await supabaseClient.from('integration_logs').insert({
          integration_type: 'stripe_cleanup',
          action: 'cleanup_incomplete_subscription',
          status: 'success',
          user_id: subscription.user_id,
          details: {
            subscription_id: subscription.id,
            stripe_subscription_id: subscription.stripe_subscription_id,
            status: subscription.status,
            age_days: Math.floor((Date.now() - new Date(subscription.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          },
        });

      } catch (error: any) {
        console.error(`❌ Error processing subscription ${subscription.id}:`, error.message);
        results.errors.push(`${subscription.id}: ${error.message}`);
        
        // Log error
        await supabaseClient.from('integration_logs').insert({
          integration_type: 'stripe_cleanup',
          action: 'cleanup_incomplete_subscription',
          status: 'error',
          user_id: subscription.user_id,
          error_message: error.message,
          details: {
            subscription_id: subscription.id,
          },
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✨ Cleanup completed in ${duration}ms`);
    console.log(`📈 Results: ${results.cancelled} cancelled in Stripe, ${results.deleted} deleted locally, ${results.errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        duration_ms: duration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Cleanup failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
