import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metrics = await gatherMetrics(supabase);

    return new Response(JSON.stringify(metrics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('System Metrics Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function gatherMetrics(supabase: any) {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const { count: eventsLast24h } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo.toISOString());

  const { count: eventsLastHour } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneHourAgo.toISOString());

  const { count: activeWidgets } = await supabase
    .from('widgets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { data: integrationLogs } = await supabase
    .from('integration_logs')
    .select('status')
    .order('created_at', { ascending: false })
    .limit(100);

  const successCount = integrationLogs?.filter((log: any) => log.status === 'success').length || 0;
  const successRate = integrationLogs?.length ? ((successCount / integrationLogs.length) * 100).toFixed(2) : '0';

  const latencyStart = Date.now();
  await supabase.from('profiles').select('id').limit(1);
  const dbLatency = Date.now() - latencyStart;

  return {
    events: {
      last24h: eventsLast24h || 0,
      lastHour: eventsLastHour || 0,
    },
    widgets: {
      active: activeWidgets || 0,
    },
    users: {
      total: totalUsers || 0,
    },
    integrations: {
      successRate: successRate + '%',
    },
    performance: {
      dbLatency,
    },
  };
}
