import { useAuth } from '@/hooks/useAuth';

// Business type configurations
const BUSINESS_CONFIGS = {
  saas: {
    defaultTemplate: 'notification-popup',
    suggestedPosition: 'bottom-right',
    defaultDelay: 3000,
    defaultColor: '#3B82F6',
    suggestedIntegrations: [
      { type: 'email', name: 'Mailchimp', description: 'Track new signups and subscriptions' },
      { type: 'analytics', name: 'Google Analytics', description: 'Show visitor activity' },
      { type: 'payment', name: 'Stripe', description: 'Display recent purchases' }
    ],
    displayRules: {
      show_duration_ms: 5000,
      interval_ms: 8000,
      max_per_page: 3,
      max_per_session: 15,
      triggers: {
        min_time_on_page_ms: 2000,
        scroll_depth_pct: 25,
        exit_intent: false
      }
    }
  },
  ecommerce: {
    defaultTemplate: 'social-proof',
    suggestedPosition: 'bottom-left',
    defaultDelay: 2000,
    defaultColor: '#059669',
    suggestedIntegrations: [
      { type: 'ecommerce', name: 'Shopify', description: 'Show recent purchases and reviews' },
      { type: 'ecommerce', name: 'WooCommerce', description: 'Display order notifications' },
      { type: 'reviews', name: 'Google Reviews', description: 'Showcase customer testimonials' }
    ],
    displayRules: {
      show_duration_ms: 6000,
      interval_ms: 10000,
      max_per_page: 5,
      max_per_session: 25,
      triggers: {
        min_time_on_page_ms: 1000,
        scroll_depth_pct: 15,
        exit_intent: true
      }
    }
  },
  agency: {
    defaultTemplate: 'testimonial-popup',
    suggestedPosition: 'bottom-right',
    defaultDelay: 4000,
    defaultColor: '#7C3AED',
    suggestedIntegrations: [
      { type: 'reviews', name: 'Google Reviews', description: 'Show client testimonials' },
      { type: 'social', name: 'LinkedIn', description: 'Display professional endorsements' },
      { type: 'email', name: 'ConvertKit', description: 'Track lead generation' }
    ],
    displayRules: {
      show_duration_ms: 7000,
      interval_ms: 12000,
      max_per_page: 2,
      max_per_session: 10,
      triggers: {
        min_time_on_page_ms: 3000,
        scroll_depth_pct: 30,
        exit_intent: false
      }
    }
  },
  startup: {
    defaultTemplate: 'live-activity',
    suggestedPosition: 'bottom-right',
    defaultDelay: 2500,
    defaultColor: '#F59E0B',
    suggestedIntegrations: [
      { type: 'analytics', name: 'Google Analytics', description: 'Show user activity' },
      { type: 'email', name: 'Mailchimp', description: 'Track beta signups' },
      { type: 'social', name: 'Twitter', description: 'Display social mentions' }
    ],
    displayRules: {
      show_duration_ms: 4000,
      interval_ms: 7000,
      max_per_page: 4,
      max_per_session: 20,
      triggers: {
        min_time_on_page_ms: 1500,
        scroll_depth_pct: 20,
        exit_intent: true
      }
    }
  },
  blog: {
    defaultTemplate: 'notification-popup',
    suggestedPosition: 'bottom-left',
    defaultDelay: 5000,
    defaultColor: '#DC2626',
    suggestedIntegrations: [
      { type: 'email', name: 'ConvertKit', description: 'Show new subscribers' },
      { type: 'social', name: 'Twitter', description: 'Display social shares' },
      { type: 'analytics', name: 'Google Analytics', description: 'Show popular posts' }
    ],
    displayRules: {
      show_duration_ms: 5000,
      interval_ms: 15000,
      max_per_page: 2,
      max_per_session: 8,
      triggers: {
        min_time_on_page_ms: 10000,
        scroll_depth_pct: 50,
        exit_intent: true
      }
    }
  }
};

export const getSmartDefaults = (businessType?: string) => {
  const type = businessType || 'saas';
  return BUSINESS_CONFIGS[type as keyof typeof BUSINESS_CONFIGS] || BUSINESS_CONFIGS.saas;
};

export const SmartDefaultsInfo = () => {
  const { profile } = useAuth();
  const config = getSmartDefaults(profile?.business_type);
  
  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
      <h4 className="font-medium mb-2">💡 Smart Defaults Applied</h4>
      <p className="text-sm text-muted-foreground mb-3">
        Based on your business type ({profile?.business_type || 'saas'}), we've pre-configured optimal settings:
      </p>
      <ul className="text-sm space-y-1">
        <li>• Template: {config.defaultTemplate}</li>
        <li>• Position: {config.suggestedPosition}</li>
        <li>• Delay: {config.defaultDelay}ms</li>
        <li>• Max per page: {config.displayRules.max_per_page}</li>
      </ul>
    </div>
  );
};

export const SuggestedIntegrations = () => {
  const { profile } = useAuth();
  const config = getSmartDefaults(profile?.business_type);
  
  return (
    <div className="space-y-3">
      <h4 className="font-medium">🔗 Recommended Integrations</h4>
      <div className="grid gap-3">
        {config.suggestedIntegrations.map((integration, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium text-sm">{integration.name}</p>
              <p className="text-xs text-muted-foreground">{integration.description}</p>
            </div>
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {integration.type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};