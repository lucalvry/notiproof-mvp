import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirect_uri: string;
  scopes: string[];
  authorization_url: string;
  token_url: string;
  scope_separator: string;
  extra_params: Record<string, any>;
}

export async function getOAuthConfig(
  supabase: any,
  integrationType: string
): Promise<OAuthConfig | null> {
  const { data: config, error } = await supabase
    .from('integrations_config')
    .select('*')
    .eq('integration_type', integrationType)
    .eq('is_active', true)
    .single();

  if (error || !config) {
    console.error(`${integrationType} OAuth not configured:`, error);
    return null;
  }

  const oauthSpec = config.oauth_spec || {};
  const adminConfig = config.config?.oauth_config || config.config || {};

  // Validate admin provided required credentials
  if (config.requires_admin_credentials && (!adminConfig.clientId && !adminConfig.client_id)) {
    console.error(`${integrationType}: Missing admin client_id`);
    return null;
  }

  if (config.requires_admin_credentials && (!adminConfig.clientSecret && !adminConfig.client_secret)) {
    console.error(`${integrationType}: Missing admin client_secret`);
    return null;
  }

  // Validate OAuth spec has required URLs
  if (!oauthSpec.authorization_url || !oauthSpec.token_url) {
    console.error(`${integrationType}: Missing OAuth URLs in oauth_spec`);
    return null;
  }

  // Build redirect URI dynamically based on integration type
  const functionName = integrationType === 'ga4' ? 'ga4-auth' : `oauth-${integrationType}`;
  const redirect_uri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${functionName}?action=callback`;

  return {
    clientId: adminConfig.clientId || adminConfig.client_id,
    clientSecret: adminConfig.clientSecret || adminConfig.client_secret,
    redirect_uri,
    authorization_url: oauthSpec.authorization_url,
    token_url: oauthSpec.token_url,
    scopes: oauthSpec.required_scopes || [],
    scope_separator: oauthSpec.scope_separator || ' ',
    extra_params: {
      access_type: oauthSpec.access_type,
      prompt: oauthSpec.prompt,
      response_type: oauthSpec.response_type || 'code',
      exchange_long_lived_token: oauthSpec.exchange_long_lived_token,
    }
  };
}

export async function logOAuthAction(
  supabase: any,
  integrationType: string,
  action: string,
  status: string,
  userId: string,
  details: any = {}
) {
  await supabase.from('integration_logs').insert({
    integration_type: integrationType,
    action,
    status,
    user_id: userId,
    details,
  });
}

export async function storeOAuthConnector(
  supabase: any,
  userId: string,
  websiteId: string,
  integrationType: string,
  name: string,
  tokens: any
) {
  const { error } = await supabase
    .from('integration_connectors')
    .insert({
      user_id: userId,
      website_id: websiteId,
      integration_type: integrationType,
      name,
      config: tokens,
      status: 'active',
    });

  if (error) {
    console.error('Failed to store connector:', error);
    throw error;
  }
}
