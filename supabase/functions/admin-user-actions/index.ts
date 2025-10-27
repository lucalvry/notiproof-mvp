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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, user_id, details } = body;

    let result;
    switch (action) {
      case 'suspend':
        result = await suspendUser(supabase, user_id, details);
        break;
      case 'reactivate':
        result = await reactivateUser(supabase, user_id);
        break;
      case 'delete':
        result = await softDeleteUser(supabase, user_id);
        break;
      case 'update_role':
        result = await updateUserRole(supabase, user_id, details.role);
        break;
      default:
        throw new Error('Invalid action');
    }

    await supabase.rpc('log_admin_action', {
      _action: action,
      _resource_type: 'user',
      _resource_id: user_id,
      _details: details || {},
    });

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Admin User Action Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function suspendUser(supabase: any, userId: string, details: any) {
  const { duration_days, reason } = details;
  const bannedUntil = new Date();
  bannedUntil.setDate(bannedUntil.getDate() + (duration_days || 30));

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: duration_days ? `${duration_days}d` : '30d',
    user_metadata: { ban_reason: reason, banned_until: bannedUntil.toISOString() }
  });

  if (error) throw error;
  return { banned_until: bannedUntil.toISOString() };
}

async function reactivateUser(supabase: any, userId: string) {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
    user_metadata: { ban_reason: null, banned_until: null }
  });

  if (error) throw error;
  return { reactivated: true };
}

async function softDeleteUser(supabase: any, userId: string) {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
    user_metadata: { deleted: true, deleted_at: new Date().toISOString() }
  });

  if (error) throw error;
  return { deleted: true };
}

async function updateUserRole(supabase: any, userId: string, role: string) {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role, granted_by: supabase.auth.user()?.id });

  if (error) throw error;
  return { role_updated: role };
}
