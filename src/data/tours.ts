import { Tour } from '@/types/help';

export const tours: Record<string, Tour> = {
  'dashboard-overview': {
    id: 'dashboard-overview',
    name: 'Dashboard Overview',
    steps: [
      {
        id: 'dashboard-stats',
        target: '[data-tour="dashboard-stats"]',
        title: 'Your Performance Overview',
        content: 'This shows your key metrics - total widgets, views, clicks, and conversion rate. Monitor these to track your success.',
        placement: 'bottom',
        showSkip: true,
      },
      {
        id: 'recent-activity',
        target: '[data-tour="recent-activity"]',
        title: 'Recent Activity Feed',
        content: 'See real-time events from your widgets. This helps you understand how visitors interact with your social proof.',
        placement: 'left',
        showSkip: true,
      },
      {
        id: 'quick-actions',
        target: '[data-tour="quick-actions"]',
        title: 'Quick Actions',
        content: 'Jump to common tasks like creating widgets, viewing analytics, or managing campaigns.',
        placement: 'top',
        showSkip: true,
      }
    ]
  },

  'widget-creation': {
    id: 'widget-creation',
    name: 'Widget Creation Guide',
    steps: [
      {
        id: 'widget-templates',
        target: '[data-tour="widget-templates"]',
        title: 'Choose Your Template',
        content: 'Select from 5 proven templates: Recent Activity, Live Visitor Count, Purchase Notifications, Review Highlights, or Conversion Counter.',
        placement: 'bottom',
        showSkip: true,
      },
      {
        id: 'widget-customization',
        target: '[data-tour="widget-customization"]',
        title: 'Customize Your Widget',
        content: 'Configure colors, text, timing, and display rules to match your brand and optimize for conversions.',
        placement: 'right',
        showSkip: true,
      },
      {
        id: 'widget-preview',
        target: '[data-tour="widget-preview"]',
        title: 'Preview Your Widget',
        content: 'See exactly how your widget will look on your website before you publish it.',
        placement: 'left',
        showSkip: true,
      }
    ]
  },

  'installation-setup': {
    id: 'installation-setup',
    name: 'Installation Setup',
    steps: [
      {
        id: 'embed-code',
        target: '[data-tour="embed-code"]',
        title: 'Get Your Embed Code',
        content: 'Copy this code snippet and paste it into your website\'s HTML, just before the closing </body> tag.',
        placement: 'bottom',
        showSkip: true,
      },
      {
        id: 'integration-options',
        target: '[data-tour="integration-options"]',
        title: 'Integration Options',
        content: 'Choose from WordPress plugin, Shopify app, or manual HTML installation based on your platform.',
        placement: 'top',
        showSkip: true,
      },
      {
        id: 'test-installation',
        target: '[data-tour="test-installation"]',
        title: 'Test Your Installation',
        content: 'Use our test tools to verify your widgets are working correctly on your website.',
        placement: 'left',
        showSkip: true,
      }
    ]
  }
};