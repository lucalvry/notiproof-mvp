/**
 * Structured data for integration setup guides
 * Powers dynamic setup wizards and documentation
 */

export interface SetupStep {
  title: string;
  description: string;
  required: boolean;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface IntegrationSetupGuide {
  integrationType: string;
  category: string;
  setupType: 'oauth' | 'webhook' | 'api_poll' | 'special';
  requiresAdminSetup: boolean;
  estimatedTotalTime: string;
  complexity: 'easy' | 'medium' | 'hard';
  
  adminSteps?: SetupStep[];
  userSteps: SetupStep[];
  
  credentials: {
    name: string;
    description: string;
    where: string;
    required: boolean;
  }[];
  
  redirectUrl?: string;
  webhookUrl?: string;
  
  commonIssues: {
    error: string;
    cause: string;
    solution: string;
  }[];
  
  testingSteps: string[];
  
  rateLimit?: {
    limit: string;
    quota: string;
    notes: string;
  };
  
  externalLinks: {
    documentation: string;
    developerPortal?: string;
    supportContact?: string;
  };
}

export const integrationSetupGuides: Record<string, IntegrationSetupGuide> = {
  shopify: {
    integrationType: 'shopify',
    category: 'ecommerce',
    setupType: 'oauth',
    requiresAdminSetup: true,
    estimatedTotalTime: '30 minutes',
    complexity: 'medium',
    adminSteps: [
      {
        title: 'Create Shopify Partner Account',
        description: 'Sign up at partners.shopify.com with NotiProof company details',
        required: true,
        estimatedTime: '5 min',
        difficulty: 'easy',
      },
      {
        title: 'Create Public App',
        description: 'Create a new public app in Shopify Partners dashboard',
        required: true,
        estimatedTime: '10 min',
        difficulty: 'medium',
      },
      {
        title: 'Configure OAuth Scopes',
        description: 'Set required permissions: read_orders, read_customers, read_products, read_checkouts, read_inventory',
        required: true,
        estimatedTime: '5 min',
        difficulty: 'easy',
      },
      {
        title: 'Submit for Review',
        description: 'Submit app for Shopify marketplace approval',
        required: true,
        estimatedTime: '10 min',
        difficulty: 'medium',
      },
    ],
    userSteps: [
      {
        title: 'Connect Shopify Store',
        description: 'Click Connect Shopify in NotiProof dashboard',
        required: true,
        estimatedTime: '2 min',
        difficulty: 'easy',
      },
      {
        title: 'Authorize App',
        description: 'Grant NotiProof permissions to access your store',
        required: true,
        estimatedTime: '1 min',
        difficulty: 'easy',
      },
      {
        title: 'Configure Events',
        description: 'Select which events to track (orders, carts, products)',
        required: true,
        estimatedTime: '2 min',
        difficulty: 'easy',
      },
    ],
    credentials: [
      {
        name: 'Client ID',
        description: 'Shopify App Client ID',
        where: 'Found in App Info section of Shopify Partners dashboard',
        required: true,
      },
      {
        name: 'Client Secret',
        description: 'Shopify App API Secret Key',
        where: 'Generated in Shopify Partners dashboard (copy immediately)',
        required: true,
      },
    ],
    redirectUrl: 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-shopify/callback',
    commonIssues: [
      {
        error: 'OAuth redirect_uri_mismatch',
        cause: 'Redirect URL in app doesn\'t match OAuth request',
        solution: 'Verify redirect URL in Shopify app settings matches exactly',
      },
      {
        error: 'App not approved',
        cause: 'Shopify hasn\'t approved the app yet',
        solution: 'Wait for approval (7-14 days) or use development store for testing',
      },
    ],
    testingSteps: [
      'Create test order in Shopify store',
      'Check NotiProof logs for webhook received',
      'Verify notification displays on test website',
    ],
    rateLimit: {
      limit: '2 requests/second',
      quota: '10,000 requests/day',
      notes: 'Rate limit is per store',
    },
    externalLinks: {
      documentation: 'https://shopify.dev/docs/apps/auth/oauth',
      developerPortal: 'https://partners.shopify.com',
      supportContact: 'partners@shopify.com',
    },
  },
  
  stripe: {
    integrationType: 'stripe',
    category: 'payment',
    setupType: 'webhook',
    requiresAdminSetup: false,
    estimatedTotalTime: '10 minutes',
    complexity: 'easy',
    userSteps: [
      {
        title: 'Get Webhook URL',
        description: 'Copy webhook URL from NotiProof Integrations page',
        required: true,
        estimatedTime: '1 min',
        difficulty: 'easy',
      },
      {
        title: 'Add Webhook in Stripe',
        description: 'Go to Stripe Dashboard → Developers → Webhooks → Add endpoint',
        required: true,
        estimatedTime: '3 min',
        difficulty: 'easy',
      },
      {
        title: 'Select Events',
        description: 'Choose events: checkout.session.completed, payment_intent.succeeded, etc.',
        required: true,
        estimatedTime: '2 min',
        difficulty: 'easy',
      },
      {
        title: 'Copy Signing Secret',
        description: 'Copy webhook signing secret from Stripe and paste in NotiProof',
        required: true,
        estimatedTime: '2 min',
        difficulty: 'easy',
      },
      {
        title: 'Test Webhook',
        description: 'Send test webhook from Stripe dashboard',
        required: true,
        estimatedTime: '2 min',
        difficulty: 'easy',
      },
    ],
    credentials: [
      {
        name: 'Webhook Signing Secret',
        description: 'Secret used to verify webhook authenticity',
        where: 'Shown when creating webhook in Stripe dashboard (starts with whsec_)',
        required: true,
      },
    ],
    webhookUrl: 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-stripe',
    commonIssues: [
      {
        error: 'Webhook signature verification failed',
        cause: 'Wrong signing secret or timestamp drift',
        solution: 'Regenerate webhook in Stripe and update secret in NotiProof',
      },
      {
        error: 'Events not appearing',
        cause: 'Selected events don\'t match what you\'re testing',
        solution: 'Verify correct event types are selected in Stripe webhook settings',
      },
    ],
    testingSteps: [
      'Click "Send test webhook" in Stripe dashboard',
      'Verify event appears in NotiProof integration logs',
      'Make actual test payment to confirm live events',
    ],
    rateLimit: {
      limit: '100 requests/second',
      quota: 'Unlimited',
      notes: 'Rolling rate limit with automatic throttling',
    },
    externalLinks: {
      documentation: 'https://stripe.com/docs/webhooks',
      developerPortal: 'https://dashboard.stripe.com/developers',
      supportContact: 'https://support.stripe.com',
    },
  },

  ga4: {
    integrationType: 'ga4',
    category: 'analytics',
    setupType: 'oauth',
    requiresAdminSetup: true,
    estimatedTotalTime: '30 minutes',
    complexity: 'medium',
    adminSteps: [
      {
        title: 'Create Google Cloud Project',
        description: 'Set up new project in Google Cloud Console',
        required: true,
        estimatedTime: '5 min',
        difficulty: 'easy',
      },
      {
        title: 'Enable GA Data API',
        description: 'Enable Google Analytics Data API in Cloud Console',
        required: true,
        estimatedTime: '3 min',
        difficulty: 'easy',
      },
      {
        title: 'Create OAuth Credentials',
        description: 'Create OAuth 2.0 Client ID (Web application type)',
        required: true,
        estimatedTime: '10 min',
        difficulty: 'medium',
      },
      {
        title: 'Configure Consent Screen',
        description: 'Set up OAuth consent screen with required scopes',
        required: true,
        estimatedTime: '10 min',
        difficulty: 'medium',
      },
      {
        title: 'Submit for Verification',
        description: 'Submit app for Google verification (production only)',
        required: false,
        estimatedTime: '2-6 weeks',
        difficulty: 'hard',
      },
    ],
    userSteps: [
      {
        title: 'Connect Google Account',
        description: 'Click Connect Google Analytics in NotiProof',
        required: true,
        estimatedTime: '2 min',
        difficulty: 'easy',
      },
      {
        title: 'Grant Permissions',
        description: 'Authorize NotiProof to access GA4 data',
        required: true,
        estimatedTime: '1 min',
        difficulty: 'easy',
      },
      {
        title: 'Select Property',
        description: 'Choose which GA4 property to track',
        required: true,
        estimatedTime: '2 min',
        difficulty: 'easy',
      },
    ],
    credentials: [
      {
        name: 'Client ID',
        description: 'OAuth 2.0 Client ID from Google Cloud',
        where: 'APIs & Services → Credentials in Google Cloud Console',
        required: true,
      },
      {
        name: 'Client Secret',
        description: 'OAuth 2.0 Client Secret',
        where: 'Generated with Client ID in Google Cloud Console',
        required: true,
      },
    ],
    redirectUrl: 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/ga4-auth/callback',
    commonIssues: [
      {
        error: 'Invalid OAuth redirect URI',
        cause: 'Redirect URI not whitelisted in Google Cloud',
        solution: 'Add exact callback URL to authorized redirect URIs',
      },
      {
        error: 'Access denied',
        cause: 'User doesn\'t have GA4 permissions',
        solution: 'Ensure user has Viewer or higher role on GA4 property',
      },
    ],
    testingSteps: [
      'Complete OAuth flow',
      'Verify GA4 property appears in NotiProof',
      'Check that real-time events are being fetched',
    ],
    rateLimit: {
      limit: '1,000 requests/100 seconds',
      quota: '10M requests/day',
      notes: 'Rate limit is per Google Cloud project',
    },
    externalLinks: {
      documentation: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
      developerPortal: 'https://console.cloud.google.com',
      supportContact: 'https://support.google.com/analytics',
    },
  },

  zapier: {
    integrationType: 'zapier',
    category: 'automation',
    setupType: 'special',
    requiresAdminSetup: false,
    estimatedTotalTime: '5 minutes',
    complexity: 'easy',
    userSteps: [
      {
        title: 'Get Webhook URL',
        description: 'Copy your unique webhook URL from NotiProof',
        required: true,
        estimatedTime: '1 min',
        difficulty: 'easy',
      },
      {
        title: 'Create Zap',
        description: 'Create new Zap in Zapier with Webhooks by Zapier',
        required: true,
        estimatedTime: '2 min',
        difficulty: 'easy',
      },
      {
        title: 'Configure Action',
        description: 'Set up POST action to NotiProof webhook URL',
        required: true,
        estimatedTime: '2 min',
        difficulty: 'easy',
      },
    ],
    credentials: [],
    webhookUrl: 'https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-generic',
    commonIssues: [
      {
        error: 'Zap not triggering',
        cause: 'Trigger app not configured correctly',
        solution: 'Test trigger step in Zapier to ensure data is flowing',
      },
      {
        error: 'Data not formatted correctly',
        cause: 'Webhook payload doesn\'t match expected format',
        solution: 'Use Formatter step in Zapier to structure data properly',
      },
    ],
    testingSteps: [
      'Test Zap in Zapier',
      'Verify webhook received in NotiProof logs',
      'Confirm notification displays correctly',
    ],
    externalLinks: {
      documentation: 'https://zapier.com/help/create/basics/create-zaps',
      developerPortal: 'https://zapier.com',
    },
  },
};

/**
 * Get setup guide for specific integration
 */
export function getSetupGuide(integrationType: string): IntegrationSetupGuide | null {
  return integrationSetupGuides[integrationType] || null;
}

/**
 * Get all integrations that require admin setup
 */
export function getAdminSetupRequired(): IntegrationSetupGuide[] {
  return Object.values(integrationSetupGuides).filter(guide => guide.requiresAdminSetup);
}

/**
 * Get integrations by category
 */
export function getSetupGuidesByCategory(category: string): IntegrationSetupGuide[] {
  return Object.values(integrationSetupGuides).filter(guide => guide.category === category);
}
