import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface TokenRefreshResult {
  access_token: string;
  expires_at: string;
}

interface GA4Config {
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  property_id?: string;
  scope?: string;
  [key: string]: any;
}

export async function refreshGA4Token(
  connectorId: string,
  refreshToken: string,
  currentConfig: GA4Config
): Promise<TokenRefreshResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get GA4 OAuth config from integrations_config
  const { data: integrationConfig, error: configError } = await supabase
    .from('integrations_config')
    .select('config')
    .eq('integration_type', 'ga4')
    .eq('is_active', true)
    .single();

  if (configError || !integrationConfig) {
    console.error('GA4 OAuth config not found:', configError);
    throw new Error('GA4 OAuth configuration not found. Please contact administrator.');
  }

  const oauthConfig = integrationConfig.config?.oauth_config || integrationConfig.config || {};
  const CLIENT_ID = oauthConfig.clientId || oauthConfig.client_id;
  const CLIENT_SECRET = oauthConfig.clientSecret || oauthConfig.client_secret;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('GA4 OAuth credentials not configured. Please contact administrator.');
  }

  console.log('Refreshing GA4 access token for connector:', connectorId);

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token refresh failed:', {
      status: tokenResponse.status,
      error: errorText
    });
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  const newAccessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600; // Default 1 hour

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Update database with new token and preserve all other config fields
  const updatedConfig: GA4Config = {
    ...currentConfig,
    access_token: newAccessToken,
    token_expires_at: expiresAt,
    // Preserve refresh_token if new one not provided (Google usually doesn't return it on refresh)
    refresh_token: tokenData.refresh_token || currentConfig.refresh_token || refreshToken,
  };

  const { error: updateError } = await supabase
    .from('integration_connectors')
    .update({
      config: updatedConfig,
    })
    .eq('id', connectorId);

  if (updateError) {
    console.error('Failed to update connector with new token:', updateError);
    throw new Error('Failed to save refreshed token');
  }

  console.log('Token refreshed successfully. Expires at:', expiresAt);

  return {
    access_token: newAccessToken,
    expires_at: expiresAt,
  };
}

export function isTokenExpired(expiresAt?: string): boolean {
  if (!expiresAt) return true;
  
  const expiryTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

  return (expiryTime - bufferTime) <= now;
}
