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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, count = 100 } = await req.json();

    const results = {
      action,
      count,
      startTime: new Date().toISOString(),
      results: [] as any[],
      errors: [] as any[],
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0
      }
    };

    const durations: number[] = [];

    // Load test: Create events
    if (action === 'create-events') {
      for (let i = 0; i < count; i++) {
        const start = Date.now();
        
        const { error } = await supabase.from('events').insert({
          type: ['purchase', 'signup', 'review'][i % 3],
          data: {
            test: true,
            batch: Math.floor(i / 100),
            index: i
          },
          user_id: crypto.randomUUID()
        });

        const duration = Date.now() - start;
        durations.push(duration);

        if (error) {
          results.errors.push({ index: i, error: error.message });
          results.summary.failed++;
        } else {
          results.summary.successful++;
        }

        results.summary.total++;
      }
    }

    // Load test: Query events
    if (action === 'query-events') {
      for (let i = 0; i < count; i++) {
        const start = Date.now();
        
        const { error } = await supabase
          .from('events')
          .select('*')
          .limit(10);

        const duration = Date.now() - start;
        durations.push(duration);

        if (error) {
          results.errors.push({ index: i, error: error.message });
          results.summary.failed++;
        } else {
          results.summary.successful++;
        }

        results.summary.total++;
      }
    }

    // Load test: Widget API calls
    if (action === 'widget-calls') {
      for (let i = 0; i < count; i++) {
        const start = Date.now();
        
        const { error } = await supabase
          .from('widgets')
          .select('*')
          .eq('status', 'active')
          .limit(1);

        const duration = Date.now() - start;
        durations.push(duration);

        if (error) {
          results.errors.push({ index: i, error: error.message });
          results.summary.failed++;
        } else {
          results.summary.successful++;
        }

        results.summary.total++;
      }
    }

    // Calculate summary statistics
    if (durations.length > 0) {
      results.summary.avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      results.summary.minDuration = Math.min(...durations);
      results.summary.maxDuration = Math.max(...durations);
    }

    results.results = durations;

    console.log('Load test completed:', {
      action,
      total: results.summary.total,
      successful: results.summary.successful,
      failed: results.summary.failed,
      avgDuration: results.summary.avgDuration.toFixed(2) + 'ms'
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Load Test Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
