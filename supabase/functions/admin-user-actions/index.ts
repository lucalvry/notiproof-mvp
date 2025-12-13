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

    // Extend trial period
    if (requestAction === 'extend-trial') {
      const { userId, daysToAdd } = requestBody;

      if (!userId || !daysToAdd || daysToAdd <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get current subscription
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id, trial_end, status')
        .eq('user_id', userId)
        .single();

      if (subError || !subscription) {
        return new Response(JSON.stringify({ error: 'No subscription found for user' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Calculate new trial end date
      const currentTrialEnd = subscription.trial_end ? new Date(subscription.trial_end) : new Date();
      const newTrialEnd = new Date(currentTrialEnd);
      newTrialEnd.setDate(newTrialEnd.getDate() + daysToAdd);

      // Update subscription
      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          trial_end: newTrialEnd.toISOString(),
          status: 'trialing', // Reactivate trial if it was expired
        })
        .eq('id', subscription.id);

      if (updateError) throw updateError;

      // Log action
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        action: 'extend_trial',
        resource_type: 'user_subscription',
        resource_id: userId,
        details: {
          days_added: daysToAdd,
          previous_trial_end: subscription.trial_end,
          new_trial_end: newTrialEnd.toISOString(),
        },
      });

      console.log(`[Admin] Extended trial for user ${userId} by ${daysToAdd} days`);

      return new Response(JSON.stringify({
        success: true,
        new_trial_end: newTrialEnd.toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Assign plan to user
    if (requestAction === 'assign-plan') {
      const { userId, planId, durationDays, reason } = requestBody;

      if (!userId || !planId || !durationDays || durationDays <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify plan exists
      const { data: plan, error: planError } = await supabaseAdmin
        .from('subscription_plans')
        .select('id, name')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        return new Response(JSON.stringify({ error: 'Plan not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + durationDays);

      // Check if user has existing subscription
      const { data: existing } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing subscription
        const { error: updateError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_id: planId,
            status: 'active',
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            trial_end: null,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Create new subscription
        const { error: insertError } = await supabaseAdmin
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_id: planId,
            status: 'active',
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
          });

        if (insertError) throw insertError;
      }

      // Log action with reason
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        action: 'assign_plan',
        resource_type: 'user_subscription',
        resource_id: userId,
        details: {
          plan_id: planId,
          plan_name: plan.name,
          duration_days: durationDays,
          reason: reason || 'Admin assignment',
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        },
      });

      console.log(`[Admin] Assigned plan ${plan.name} to user ${userId} for ${durationDays} days`);

      return new Response(JSON.stringify({
        success: true,
        plan_name: plan.name,
        period_end: periodEnd.toISOString(),
      }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send trial reminder email
    if (requestAction === 'send-trial-reminder') {
      const { userId, daysRemaining } = requestBody;

      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user info
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authError || !authUser?.user?.email) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      const { data: subscription } = await supabaseAdmin
        .from('user_subscriptions')
        .select('plan:subscription_plans(name)')
        .eq('user_id', userId)
        .single();

      const brevoApiKey = Deno.env.get('BREVO_API_KEY');
      if (!brevoApiKey) {
        return new Response(JSON.stringify({ error: 'Email service not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userName = profile?.name || authUser.user.email.split('@')[0];
      const userEmail = authUser.user.email;
      const planName = (subscription?.plan as any)?.name || 'Trial';

      // Determine email type based on days remaining
      let emailType = 'trial_3_days';
      if (daysRemaining <= 0) emailType = 'trial_expired';
      else if (daysRemaining === 1) emailType = 'trial_1_day';

      // Fetch template from database
      const { data: template } = await supabaseAdmin
        .from('admin_email_templates')
        .select('subject, body_html')
        .eq('template_key', emailType)
        .eq('is_active', true)
        .single();

      const subject = template?.subject?.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
        const data: Record<string, string> = { name: userName, planName, daysRemaining: String(daysRemaining) };
        return data[key] || '';
      }) || `Your ${planName} trial reminder`;

      const htmlContent = template?.body_html?.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
        const data: Record<string, string> = { name: userName, planName, daysRemaining: String(daysRemaining) };
        return data[key] || '';
      }) || `<p>Hi ${userName}, your ${planName} trial is expiring soon.</p>`;

      // Send email via Brevo
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'NotiProof', email: 'notifications@notiproof.com' },
          to: [{ email: userEmail, name: userName }],
          subject,
          htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Email API error: ${response.status} - ${errorText}`);
      }

      // Log action
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        action: 'send_trial_reminder',
        resource_type: 'user',
        resource_id: userId,
        details: { email_type: emailType, recipient: userEmail },
      });

      console.log(`[Admin] Sent trial reminder to ${userEmail}`);

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
