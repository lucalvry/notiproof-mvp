/**
 * Integration-Specific Design Configuration
 * Defines which design options are relevant for each integration type
 */

export interface IntegrationDesignConfig {
  provider: string;
  displayName: string;
  description: string;
  // Whether to show "✓ NotiProof Verified" badge
  // true = always show, false = never show, 'conditional' = depends on config (e.g., Visitors Pulse mode)
  showVerificationBadge: boolean | 'conditional';
  // Function to determine badge visibility for conditional providers
  getShowBadge?: (config?: Record<string, any>) => boolean;
  // Which sections of the DesignEditor to show
  sections: {
    colors: boolean;
    typography: boolean;
    positioning: boolean;
    animations: boolean;
    content: boolean;
    cta: boolean;
    avatar: boolean;
    ratings: boolean;
    media: boolean;
    urgency: boolean;
    privacy: boolean;
    productImages: boolean;
    timestamp: boolean;
    location: boolean;
  };
  // Integration-specific preview data
  previewData: Record<string, any>;
  // Content placeholders available for this integration
  placeholders: Array<{ placeholder: string; label: string; example: string }>;
  // Default headline template
  defaultHeadline: string;
  // Default subtext template
  defaultSubtext: string;
}

export const INTEGRATION_DESIGN_CONFIGS: Record<string, IntegrationDesignConfig> = {
  testimonials: {
    provider: 'testimonials',
    displayName: 'Testimonials',
    description: 'Customer testimonials with ratings and media',
    showVerificationBadge: true,
    sections: {
      colors: true,
      typography: true,
      positioning: true,
      animations: true,
      content: true,
      cta: false,
      avatar: true,
      ratings: true,
      media: true,
      urgency: false,
      privacy: true,
      productImages: false,
      timestamp: true,
      location: false,
    },
    previewData: {
      author_name: 'Sarah M.',
      content: '"This product changed my life! Highly recommend to everyone."',
      rating: 5,
      avatar_url: '',
      location: 'New York, NY',
      created_at: new Date().toISOString(),
    },
    placeholders: [
      { placeholder: '{{author_name}}', label: 'Author Name', example: 'Sarah M.' },
      { placeholder: '{{content}}', label: 'Testimonial Content', example: '"Great product!"' },
      { placeholder: '{{rating}}', label: 'Star Rating', example: '5' },
      { placeholder: '{{location}}', label: 'Author Location', example: 'New York, NY' },
    ],
    defaultHeadline: '{{author_name}} left a {{rating}}-star review',
    defaultSubtext: '"{{content}}"',
  },
  
  shopify: {
    provider: 'shopify',
    displayName: 'Shopify',
    description: 'E-commerce purchases and cart activity',
    showVerificationBadge: true,
    sections: {
      colors: true,
      typography: true,
      positioning: true,
      animations: true,
      content: true,
      cta: true,
      avatar: false,
      ratings: false,
      media: false,
      urgency: true,
      privacy: true,
      productImages: true,
      timestamp: true,
      location: true,
    },
    previewData: {
      user_name: 'John D.',
      product_name: 'Premium Wireless Headphones',
      location: 'Los Angeles, CA',
      price: '$99.99',
      product_url: 'https://example.com/product',
      product_image: '',
    },
    placeholders: [
      { placeholder: '{{user_name}}', label: 'Customer Name', example: 'John D.' },
      { placeholder: '{{product_name}}', label: 'Product Name', example: 'Premium Headphones' },
      { placeholder: '{{location}}', label: 'Customer Location', example: 'Los Angeles, CA' },
      { placeholder: '{{price}}', label: 'Product Price', example: '$99.99' },
      { placeholder: '{{product_url}}', label: 'Product URL', example: 'https://...' },
    ],
    defaultHeadline: '{{user_name}} from {{location}} just purchased',
    defaultSubtext: '{{product_name}} - {{price}}',
  },
  
  stripe: {
    provider: 'stripe',
    displayName: 'Stripe',
    description: 'Payment and subscription notifications',
    showVerificationBadge: true,
    sections: {
      colors: true,
      typography: true,
      positioning: true,
      animations: true,
      content: true,
      cta: true,
      avatar: false,
      ratings: false,
      media: false,
      urgency: false,
      privacy: true,
      productImages: false,
      timestamp: true,
      location: true,
    },
    previewData: {
      user_name: 'Alex K.',
      plan_name: 'Premium Plan',
      amount: '$49/mo',
      location: 'San Francisco, CA',
    },
    placeholders: [
      { placeholder: '{{user_name}}', label: 'Customer Name', example: 'Alex K.' },
      { placeholder: '{{plan_name}}', label: 'Plan Name', example: 'Premium Plan' },
      { placeholder: '{{amount}}', label: 'Amount', example: '$49/mo' },
      { placeholder: '{{location}}', label: 'Customer Location', example: 'San Francisco' },
    ],
    defaultHeadline: '{{user_name}} just subscribed to {{plan_name}}',
    defaultSubtext: 'Join thousands of happy customers',
  },
  
  woocommerce: {
    provider: 'woocommerce',
    displayName: 'WooCommerce',
    description: 'WordPress e-commerce notifications',
    showVerificationBadge: true,
    sections: {
      colors: true,
      typography: true,
      positioning: true,
      animations: true,
      content: true,
      cta: true,
      avatar: false,
      ratings: false,
      media: false,
      urgency: true,
      privacy: true,
      productImages: true,
      timestamp: true,
      location: true,
    },
    previewData: {
      user_name: 'Mike B.',
      product_name: 'Wireless Mouse',
      location: 'Chicago, IL',
      price: '$29.99',
    },
    placeholders: [
      { placeholder: '{{user_name}}', label: 'Customer Name', example: 'Mike B.' },
      { placeholder: '{{product_name}}', label: 'Product Name', example: 'Wireless Mouse' },
      { placeholder: '{{location}}', label: 'Customer Location', example: 'Chicago' },
      { placeholder: '{{price}}', label: 'Product Price', example: '$29.99' },
    ],
    defaultHeadline: '{{user_name}} from {{location}} just bought',
    defaultSubtext: '{{product_name}}',
  },
  
  form_hook: {
    provider: 'form_hook',
    displayName: 'Form Capture',
    description: 'Form submission notifications',
    showVerificationBadge: true,
    sections: {
      colors: true,
      typography: true,
      positioning: true,
      animations: true,
      content: true,
      cta: false,
      avatar: true,
      ratings: false,
      media: false,
      urgency: false,
      privacy: true,
      productImages: false,
      timestamp: true,
      location: true,
    },
    previewData: {
      user_name: 'Emily R.',
      form_name: 'Contact Form',
      location: 'Austin, TX',
      action: 'submitted a form',
    },
    placeholders: [
      { placeholder: '{{user_name}}', label: 'User Name', example: 'Emily R.' },
      { placeholder: '{{form_name}}', label: 'Form Name', example: 'Contact Form' },
      { placeholder: '{{location}}', label: 'User Location', example: 'Austin, TX' },
      { placeholder: '{{action}}', label: 'Action', example: 'submitted a form' },
    ],
    defaultHeadline: '{{user_name}} from {{location}} just {{action}}',
    defaultSubtext: 'Join thousands of others today',
  },
  
  announcements: {
    provider: 'announcements',
    displayName: 'Announcements',
    description: 'Custom announcements and promotions',
    showVerificationBadge: false,
    sections: {
      colors: true,
      typography: true,
      positioning: true,
      animations: true,
      content: true,
      cta: true,
      avatar: false,
      ratings: false,
      media: false,
      urgency: true,
      privacy: false,
      productImages: false,
      timestamp: false,
      location: false,
    },
    previewData: {
      headline: '🎉 Special Offer!',
      message: 'Get 20% off your first order',
      cta_text: 'Shop Now',
      cta_url: 'https://example.com',
    },
    placeholders: [],
    defaultHeadline: '🎉 Special Announcement',
    defaultSubtext: 'Check out our latest offer!',
  },
  
  live_visitors: {
    provider: 'live_visitors',
    displayName: 'Live Visitors',
    description: 'Real-time visitor count notifications',
    showVerificationBadge: 'conditional',
    getShowBadge: (config) => config?.mode === 'real',
    sections: {
      colors: true,
      typography: true,
      positioning: true,
      animations: true,
      content: true,
      cta: false,
      avatar: false,
      ratings: false,
      media: false,
      urgency: true,
      privacy: false,
      productImages: false,
      timestamp: false,
      location: false,
    },
    previewData: {
      visitor_count: 47,
      page_name: 'Product Page',
    },
    placeholders: [
      { placeholder: '{{visitor_count}}', label: 'Visitor Count', example: '47' },
      { placeholder: '{{page_name}}', label: 'Page Name', example: 'Product Page' },
    ],
    defaultHeadline: '{{visitor_count}} people viewing this page',
    defaultSubtext: "Don't miss out - shop now!",
  },
  
  ga4: {
    provider: 'ga4',
    displayName: 'Google Analytics',
    description: 'Analytics-driven notifications',
    showVerificationBadge: true,
    sections: {
      colors: true,
      typography: true,
      positioning: true,
      animations: true,
      content: true,
      cta: true,
      avatar: false,
      ratings: false,
      media: false,
      urgency: true,
      privacy: false,
      productImages: false,
      timestamp: true,
      location: true,
    },
    previewData: {
      page_name: 'Product Page',
      visitor_count: 47,
      location: 'Multiple locations',
    },
    placeholders: [
      { placeholder: '{{page_name}}', label: 'Page Name', example: 'Product Page' },
      { placeholder: '{{visitor_count}}', label: 'Visitor Count', example: '47' },
      { placeholder: '{{time_spent}}', label: 'Time Spent', example: '5 minutes' },
      { placeholder: '{{location}}', label: 'Visitor Location', example: 'Los Angeles' },
    ],
    defaultHeadline: '{{visitor_count}} visitors on {{page_name}}',
    defaultSubtext: 'Join them now!',
  },
};

// Default fallback config
export const DEFAULT_INTEGRATION_CONFIG: IntegrationDesignConfig = {
  provider: 'default',
  displayName: 'General',
  description: 'General notification settings',
  showVerificationBadge: true,
  sections: {
    colors: true,
    typography: true,
    positioning: true,
    animations: true,
    content: true,
    cta: true,
    avatar: true,
    ratings: false,
    media: false,
    urgency: false,
    privacy: true,
    productImages: false,
    timestamp: true,
    location: true,
  },
  previewData: {
    user_name: 'Someone',
    action: 'just took action',
    location: 'Unknown',
  },
  placeholders: [
    { placeholder: '{{user_name}}', label: 'User Name', example: 'Alex' },
    { placeholder: '{{location}}', label: 'Location', example: 'Austin, TX' },
    { placeholder: '{{action}}', label: 'Action', example: 'signed up' },
    { placeholder: '{{time}}', label: 'Time', example: '5 minutes ago' },
  ],
  defaultHeadline: '{{user_name}} from {{location}} just {{action}}',
  defaultSubtext: 'Join thousands of others today',
};

export function getIntegrationDesignConfig(provider: string): IntegrationDesignConfig {
  return INTEGRATION_DESIGN_CONFIGS[provider] || DEFAULT_INTEGRATION_CONFIG;
}
