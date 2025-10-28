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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { _user_id: user.id });

    if (!isAdmin) {
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        action: 'unauthorized_access_attempt',
        resource_type: 'admin_api',
        details: { endpoint: 'admin-user-actions' },
      });

      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    // For GET requests, check query param for action
    // For POST requests, check body
    let requestAction = action;
    let requestBody: any = {};
    
    if (req.method === 'POST') {
      requestBody = await req.json();
      requestAction = requestBody.action || action;
    }

    if (requestAction === 'list-users' || req.method === 'GET') {
      const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) throw error;

      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, name');

      const users = authUsers.users.map((authUser) => {
        const profile = profiles?.find((p) => p.id === authUser.id);
        return {
          id: authUser.id,
          email: authUser.email || '',
          name: profile?.name || authUser.email || 'Unknown',
          created_at: authUser.created_at,
          email_confirmed_at: authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at,
        };
      });

      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        action: 'list_users',
        resource_type: 'user',
        details: { count: users.length },
      });

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (requestAction === 'suspend-user') {
      const { userId } = requestBody;

      await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
      
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        action: 'suspend_user',
        resource_type: 'user',
        resource_id: userId,
        details: { reason: 'Admin action' },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (requestAction === 'reactivate-user') {
      const { userId } = requestBody;

      await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
      
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        action: 'reactivate_user',
        resource_type: 'user',
        resource_id: userId,
        details: { reason: 'Admin action' },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Keep existing functionality for backward compatibility
    const { user_id, details } = requestBody;
    
    let result;
    switch (requestAction) {
      case 'suspend':
        result = await suspendUser(supabaseAdmin, user_id, details);
        break;
      case 'reactivate':
        result = await reactivateUser(supabaseAdmin, user_id);
        break;
      case 'delete':
        result = await softDeleteUser(supabaseAdmin, user_id);
        break;
      case 'update_role':
        result = await updateUserRole(supabaseAdmin, user_id, details.role);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    await supabaseAdmin.from('audit_logs').insert({
      admin_id: user.id,
      action: requestAction,
      resource_type: 'user',
      resource_id: user_id,
      details: details || {},
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
