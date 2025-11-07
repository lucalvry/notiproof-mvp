import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateSuccessCallbackHTML, generatePropertySelectionCallbackHTML, generateErrorCallbackHTML } from '../_shared/oauth-callback-html.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // Read action from URL params (for callback) or request body (for start)
  let action = url.searchParams.get('action');
  let requestBody: any = {};
  
  if (req.method === 'POST') {
    try {
      requestBody = await req.json();
      action = action || requestBody.action;
    } catch (e) {
      // If body parsing fails, continue with URL params
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get GA4 config from admin
    const { data: config, error: configError } = await supabase
      .from('integrations_config')
      .select('*')
      .eq('integration_type', 'ga4')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('GA4 not configured:', configError);
      return new Response(JSON.stringify({ error: 'GA4 not configured by administrators' }), { 
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'start') {
      // Start OAuth flow
      const state = crypto.randomUUID();
      
      // Get user session from auth header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const user_id = user.id;
      const website_id = requestBody.website_id;
      const redirect_origin = requestBody.redirect_origin;

      if (!user_id || !website_id || !redirect_origin) {
        return new Response(JSON.stringify({ error: 'user_id, website_id, and redirect_origin required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Store state temporarily for validation
      await supabase.from('integration_logs').insert({
        integration_type: 'ga4',
        action: 'oauth_start',
        status: 'pending',
        user_id,
        details: { state, website_id, redirect_origin }
      });

      // Use oauth_spec from the database (added by migration)
      const oauthSpec = config.oauth_spec || {};
      const adminConfig = config.config?.oauth_config || config.config || {};

      // Build redirect URI dynamically
      const redirect_uri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ga4-auth?action=callback`;

      const authUrl = new URL(oauthSpec.authorization_url || 'https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', adminConfig.clientId || adminConfig.client_id);
      authUrl.searchParams.set('redirect_uri', redirect_uri);
      authUrl.searchParams.set('response_type', oauthSpec.response_type || 'code');
      authUrl.searchParams.set('scope', (oauthSpec.required_scopes || []).join(oauthSpec.scope_separator || ' '));
      authUrl.searchParams.set('state', `${state}|${user_id}|${website_id}`);
      
      // Add extra OAuth params from spec
      if (oauthSpec.access_type) authUrl.searchParams.set('access_type', oauthSpec.access_type);
      if (oauthSpec.prompt) authUrl.searchParams.set('prompt', oauthSpec.prompt);

      return new Response(JSON.stringify({ 
        auth_url: authUrl.toString(), 
        state 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'callback') {
      // Handle OAuth callback
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        return new Response(JSON.stringify({ error: 'Invalid callback parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Parse state
      const [stateId, user_id, website_id] = state.split('|');

      // Retrieve the stored redirect_origin from oauth_start
      const { data: startLog, error: startLogError } = await supabase
        .from('integration_logs')
        .select('details')
        .eq('integration_type', 'ga4')
        .eq('action', 'oauth_start')
        .eq('user_id', user_id)
        .contains('details', { state: stateId })
        .single();

      if (startLogError || !startLog) {
        console.error('Could not find oauth_start log:', startLogError);
        return new Response(
          generateErrorCallbackHTML(
            'OAuth session expired or invalid. Please try connecting again.',
            'SESSION_NOT_FOUND'
          ),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' }
          }
        );
      }

      const redirect_origin = startLog.details.redirect_origin;

      // Get oauth_spec and admin config
      const oauthSpec = config.oauth_spec || {};
      const adminConfig = config.config?.oauth_config || config.config || {};
      const redirect_uri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ga4-auth?action=callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch(oauthSpec.token_url || 'https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code,
          client_id: adminConfig.clientId || adminConfig.client_id,
          client_secret: adminConfig.clientSecret || adminConfig.client_secret,
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        return new Response(
          generateErrorCallbackHTML(
            'Failed to exchange authorization code. Please try connecting again.',
            'TOKEN_EXCHANGE_FAILED'
          ),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' }
          }
        );
      }

      const tokens = await tokenResponse.json();

      // Get GA4 properties with detailed error handling and pagination
      const allProperties: Array<{ property: string; displayName: string; account: string; accountDisplayName: string }> = [];
      let nextPageToken: string | undefined = undefined;
      let pageCount = 0;
      const maxPages = 10; // Prevent infinite loops

      do {
        pageCount++;
        const url = new URL('https://analyticsadmin.googleapis.com/v1beta/accountSummaries');
        if (nextPageToken) {
          url.searchParams.set('pageToken', nextPageToken);
        }
        url.searchParams.set('pageSize', '200'); // Request max page size

        const propertiesResponse = await fetch(url.toString(), {
          headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        });

      if (!propertiesResponse.ok) {
        const errorBody = await propertiesResponse.text();
        console.error('Failed to fetch GA4 properties:', {
          status: propertiesResponse.status,
          statusText: propertiesResponse.statusText,
          body: errorBody
        });

        // Log detailed error for debugging
        await supabase.from('integration_logs').insert({
          integration_type: 'ga4',
          action: 'fetch_properties_failed',
          status: 'error',
          user_id,
          error_message: `Status ${propertiesResponse.status}: ${errorBody}`,
          details: { 
            endpoint: 'accountSummaries',
            status_code: propertiesResponse.status 
          }
        });

        let errorMessage = 'Failed to fetch GA4 properties';
        let errorCode = 'FETCH_FAILED';

        if (propertiesResponse.status === 403) {
          errorMessage = 'Insufficient permissions. Please ensure the Google Analytics Admin API is enabled in your Google Cloud project and you have granted the required scopes.';
          errorCode = 'INSUFFICIENT_PERMISSIONS';
        } else if (propertiesResponse.status === 401) {
          errorMessage = 'Authentication failed. Please try connecting again.';
          errorCode = 'AUTH_FAILED';
        }

        return new Response(
          generateErrorCallbackHTML(errorMessage, errorCode),
          {
            status: propertiesResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' }
          }
        );
      }

        const propertiesData = await propertiesResponse.json();
        console.log(`GA4 API Response (page ${pageCount}):`, JSON.stringify(propertiesData, null, 2));

        // Iterate through account summaries on this page
        if (propertiesData.accountSummaries) {
          for (const account of propertiesData.accountSummaries) {
            if (account.propertySummaries && account.propertySummaries.length > 0) {
              for (const prop of account.propertySummaries) {
                allProperties.push({
                  property: prop.property,
                  displayName: prop.displayName,
                  account: account.account,
                  accountDisplayName: account.displayName
                });
              }
            }
          }
        }

        // Check for next page
        nextPageToken = propertiesData.nextPageToken;
        
        console.log(`Page ${pageCount} processed. Properties so far: ${allProperties.length}. Next page token: ${nextPageToken ? 'exists' : 'none'}`);

      } while (nextPageToken && pageCount < maxPages);

      console.log(`Total GA4 properties found across ${pageCount} page(s): ${allProperties.length}`);

      if (allProperties.length === 0) {
        // Log the issue with full context
        await supabase.from('integration_logs').insert({
          integration_type: 'ga4',
          action: 'no_properties_found',
          status: 'error',
          user_id,
          error_message: 'User has no GA4 properties with sufficient access across all accounts',
          details: { 
            account_summaries_count: propertiesData.accountSummaries?.length || 0,
            raw_response: propertiesData 
          }
        });

        return new Response(
          generateErrorCallbackHTML(
            'No GA4 properties found. Please ensure you have at least one Google Analytics 4 property with Admin or Editor access. If you have multiple Google accounts, try selecting a different one.',
            'NO_PROPERTIES',
            'https://support.google.com/analytics/answer/9304153'
          ),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' }
          }
        );
      }

      // Store tokens and properties temporarily (expires in 5 minutes)
      await supabase.from('integration_logs').insert({
        integration_type: 'ga4',
        action: 'oauth_pending_selection',
        status: 'pending',
        user_id,
        details: { 
          state: stateId,
          tokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in
          },
          website_id,
          redirect_origin,
          properties: allProperties,
          properties_count: allProperties.length,
          expires_at: new Date(Date.now() + 300000).toISOString() // 5 minutes
        }
      });

      // Build frontend callback URL
      const callbackUrl = `${redirect_origin}/oauth-callback?integration=ga4&state=${stateId}&code=success`;
      
      // Log the redirect
      console.log('OAuth callback complete, redirecting popup to:', callbackUrl);
      await supabase.from('integration_logs').insert({
        integration_type: 'ga4',
        action: 'redirect_to_frontend',
        status: 'info',
        user_id,
        details: { 
          state: stateId,
          redirect_url: callbackUrl,
          properties_count: allProperties.length
        }
      });

      // Use HTTP 302 redirect to frontend callback
      return new Response(null, {
        status: 302,
        headers: { 
          ...corsHeaders, 
          'Location': callbackUrl
        }
      });
    }

    if (action === 'get_properties') {
      // Retrieve stored properties from OAuth flow
      const state = requestBody.state;
      
      if (!state) {
        return new Response(JSON.stringify({ error: 'Missing state parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get user from auth header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Retrieve stored properties
      const { data: pendingLog, error: logError } = await supabase
        .from('integration_logs')
        .select('*')
        .eq('integration_type', 'ga4')
        .eq('action', 'oauth_pending_selection')
        .eq('status', 'pending')
        .eq('user_id', user.id)
        .contains('details', { state })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (logError || !pendingLog) {
        return new Response(JSON.stringify({ error: 'Session expired or not found. Please reconnect.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if expired (5 minutes)
      const expiresAt = new Date(pendingLog.details.expires_at);
      if (expiresAt < new Date()) {
        return new Response(JSON.stringify({ error: 'Session expired. Please reconnect.' }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        success: true,
        properties: pendingLog.details.properties,
        state: state
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'finalize') {
      // Finalize property selection and store connector
      const { state, property_id } = requestBody;

      if (!state || !property_id) {
        return new Response(JSON.stringify({ error: 'Missing state or property_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get user from auth header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Retrieve stored tokens from integration_logs
      const { data: pendingLog, error: logError } = await supabase
        .from('integration_logs')
        .select('*')
        .eq('integration_type', 'ga4')
        .eq('action', 'oauth_pending_selection')
        .eq('status', 'pending')
        .eq('user_id', user.id)
        .contains('details', { state })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (logError || !pendingLog) {
        return new Response(JSON.stringify({ error: 'Session expired or not found. Please reconnect.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if expired (1 hour)
      const expiresAt = new Date(pendingLog.details.expires_at);
      if (expiresAt < new Date()) {
        return new Response(JSON.stringify({ error: 'Session expired. Please reconnect.' }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const tokens = pendingLog.details.tokens;
      const website_id = pendingLog.details.website_id;

      // Store connector
      const { error: insertError } = await supabase
        .from('integration_connectors')
        .insert({
          user_id: user.id,
          website_id,
          integration_type: 'ga4',
          name: 'Google Analytics 4',
          config: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
            property_id,
            scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.edit'
          },
          status: 'active'
        });

      if (insertError) {
        console.error('Failed to store connector:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to store connection' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update log to complete
      await supabase
        .from('integration_logs')
        .update({ status: 'success', action: 'oauth_complete' })
        .eq('id', pendingLog.id);

      // Log success
      await supabase.from('integration_logs').insert({
        integration_type: 'ga4',
        action: 'oauth_finalized',
        status: 'success',
        user_id: user.id,
        details: { property_id }
      });

      return new Response(JSON.stringify({ 
        success: true,
        property_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('GA4 auth error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
