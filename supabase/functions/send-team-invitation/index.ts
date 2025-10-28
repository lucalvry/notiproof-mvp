import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Admin client for sending emails and logging
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { email, organizationId, role, organizationName } = await req.json();

    if (!email || !organizationId || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating team invitation for ${email} to org ${organizationId} with role ${role}`);

    // Check if user has permission to invite (owner or admin)
    const { data: membership, error: membershipError } = await supabaseClient
      .from('team_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate invitation token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('team_invitations')
      .insert({
        organization_id: organizationId,
        email,
        role,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send invitation email via Supabase Auth
    const inviteUrl = `${req.headers.get('origin')}/accept-invite?token=${token}`;
    
    try {
      const { data: inviteLink, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: inviteUrl,
          data: {
            organization_id: organizationId,
            organization_name: organizationName || 'a team',
            role: role,
            invited_by: user.email,
            invitation_token: token
          }
        }
      });

      if (linkError) {
        console.error('Error generating invite link:', linkError);
        throw new Error('Failed to send invitation email');
      }

      console.log(`Invitation email sent to ${email}`);

      // Log invitation sent to audit logs
      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        action: 'team_invitation_sent',
        resource_type: 'team_invitation',
        resource_id: invitation.id,
        details: {
          email: email,
          organization_id: organizationId,
          organization_name: organizationName,
          role: role,
          expires_at: expiresAt.toISOString()
        }
      });

      // Log to integration logs
      await supabaseAdmin.from('integration_logs').insert({
        integration_type: 'email',
        action: 'invitation_sent',
        status: 'success',
        details: {
          email: email,
          organization_id: organizationId
        },
        user_id: user.id
      });

    } catch (emailError: any) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the whole request if email fails - invitation is already created
      console.log(`Fallback: Invitation URL for ${email}: ${inviteUrl}`);
      
      // Log the failure
      await supabaseAdmin.from('integration_logs').insert({
        integration_type: 'email',
        action: 'invitation_sent',
        status: 'failed',
        error_message: emailError.message,
        details: {
          email: email,
          organization_id: organizationId
        },
        user_id: user.id
      });
    }

    console.log(`Team invitation processed successfully for ${email}`);

    return new Response(
      JSON.stringify({ success: true, invitation }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-team-invitation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
