/**
 * Cleanup Events - Phase 1: Event Cleanup Engine
 * 
 * Enforces retention policies and per-type caps on events.
 * Should be run daily via cron job.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetentionRule {
  event_type: string;
  max_age_days: number;
  max_count: number;
}

const RETENTION_RULES: RetentionRule[] = [
  { event_type: 'announcement', max_age_days: 30, max_count: 10 },
  { event_type: 'purchase', max_age_days: 7, max_count: 50 },
  { event_type: 'testimonial', max_age_days: 180, max_count: 100 },
  { event_type: 'signup', max_age_days: 14, max_count: 50 },
  { event_type: 'live_visitors', max_age_days: 1, max_count: 10 },
];

async function cleanupByAge(supabase: any, rule: RetentionRule): Promise<number> {
  const cutoffDate = new Date(Date.now() - rule.max_age_days * 86400000).toISOString();
  
  console.log(`[Cleanup] Deleting ${rule.event_type} events older than ${rule.max_age_days} days (before ${cutoffDate})`);
  
  const { data, error, count } = await supabase
    .from('events')
    .delete({ count: 'exact' })
    .eq('event_type', rule.event_type)
    .lt('created_at', cutoffDate);
  
  if (error) {
    console.error(`[Cleanup] Error deleting old ${rule.event_type} events:`, error);
    return 0;
  }
  
  const deleted = count || 0;
  console.log(`[Cleanup] Deleted ${deleted} old ${rule.event_type} events`);
  return deleted;
}

async function cleanupByCount(supabase: any, rule: RetentionRule): Promise<number> {
  console.log(`[Cleanup] Enforcing max count of ${rule.max_count} for ${rule.event_type}`);
  
  // Get IDs to delete (keep only the most recent N events)
  const { data: eventsToDelete, error: selectError } = await supabase
    .from('events')
    .select('id')
    .eq('event_type', rule.event_type)
    .order('created_at', { ascending: false })
    .range(rule.max_count, 1000000); // Get everything beyond max_count
  
  if (selectError) {
    console.error(`[Cleanup] Error selecting overflow ${rule.event_type} events:`, selectError);
    return 0;
  }
  
  if (!eventsToDelete || eventsToDelete.length === 0) {
    console.log(`[Cleanup] No overflow ${rule.event_type} events to delete`);
    return 0;
  }
  
  const idsToDelete = eventsToDelete.map((e: any) => e.id);
  
  const { error: deleteError, count } = await supabase
    .from('events')
    .delete({ count: 'exact' })
    .in('id', idsToDelete);
  
  if (deleteError) {
    console.error(`[Cleanup] Error deleting overflow ${rule.event_type} events:`, deleteError);
    return 0;
  }
  
  const deleted = count || 0;
  console.log(`[Cleanup] Deleted ${deleted} overflow ${rule.event_type} events`);
  return deleted;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Cleanup] Starting event cleanup...');
    
    const results: Record<string, { deleted_by_age: number; deleted_by_count: number }> = {};
    
    for (const rule of RETENTION_RULES) {
      const deletedByAge = await cleanupByAge(supabase, rule);
      const deletedByCount = await cleanupByCount(supabase, rule);
      
      results[rule.event_type] = {
        deleted_by_age: deletedByAge,
        deleted_by_count: deletedByCount
      };
    }
    
    const totalDeleted = Object.values(results).reduce(
      (sum, r) => sum + r.deleted_by_age + r.deleted_by_count, 
      0
    );
    
    console.log('[Cleanup] Cleanup complete, total deleted:', totalDeleted);
    
    return new Response(
      JSON.stringify({
        success: true,
        total_deleted: totalDeleted,
        results,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
