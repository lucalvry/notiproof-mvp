/**
 * Campaign Message Templates with {{variable}} support
 * Each template defines the structure for campaign notification messages
 */

export interface CampaignTemplate {
  id: string;
  name: string;
  category: 'ecommerce' | 'saas' | 'services' | 'content' | 'social';
  messageTemplate: string;
  variables: TemplateVariable[];
  example: string;
  requiredDataFields: string[];
  businessTypes: string[];
}

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'location' | 'url';
  defaultValue?: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  // ========== E-COMMERCE (8 types) ==========
  {
    id: 'recent-purchase',
    name: 'Recent Purchase',
    category: 'ecommerce',
    messageTemplate: '{{user_name}} from {{location}} just bought {{product_name}}',
    variables: [
      { name: 'user_name', description: 'Customer name or "Someone"', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'location', description: 'City or country', required: false, type: 'location' },
      { name: 'product_name', description: 'Product purchased', required: true, type: 'string' },
    ],
    example: 'Sarah from London just bought Wireless Headphones',
    requiredDataFields: ['product_name'],
    businessTypes: ['ecommerce', 'retail'],
  },
  {
    id: 'cart-additions',
    name: 'Cart Additions',
    category: 'ecommerce',
    messageTemplate: '{{count}} people added {{product_name}} to cart in the last {{timeframe}}',
    variables: [
      { name: 'count', description: 'Number of people', required: true, type: 'number' },
      { name: 'product_name', description: 'Product name (optional)', required: false, type: 'string', defaultValue: 'this' },
      { name: 'timeframe', description: 'Time period', required: false, type: 'string', defaultValue: 'hour' },
    ],
    example: '3 people added this to cart in the last hour',
    requiredDataFields: ['count'],
    businessTypes: ['ecommerce', 'retail'],
  },
  {
    id: 'product-reviews',
    name: 'Product Reviews',
    category: 'ecommerce',
    messageTemplate: '{{rating}} "{{review_text}}" - {{reviewer_name}}',
    variables: [
      { name: 'rating', description: 'Star rating (e.g., ★★★★★)', required: true, type: 'string' },
      { name: 'review_text', description: 'Review excerpt', required: true, type: 'string' },
      { name: 'reviewer_name', description: 'Reviewer name or initials', required: false, type: 'string' },
    ],
    example: '★★★★★ "Amazing quality!" - Michael R.',
    requiredDataFields: ['rating', 'review_text'],
    businessTypes: ['ecommerce', 'retail', 'services'],
  },
  {
    id: 'low-stock',
    name: 'Low Stock Alert',
    category: 'ecommerce',
    messageTemplate: 'Only {{stock_count}} left in stock! {{urgency_text}}',
    variables: [
      { name: 'stock_count', description: 'Remaining inventory', required: true, type: 'number' },
      { name: 'urgency_text', description: 'Urgency message', required: false, type: 'string', defaultValue: 'Hurry before it\'s gone' },
    ],
    example: 'Only 5 left in stock! Hurry before it\'s gone',
    requiredDataFields: ['stock_count'],
    businessTypes: ['ecommerce', 'retail'],
  },
  {
    id: 'visitor-counter',
    name: 'Visitor Counter',
    category: 'ecommerce',
    messageTemplate: '{{visitor_count}} people {{action}} {{target}} right now',
    variables: [
      { name: 'visitor_count', description: 'Number of visitors', required: true, type: 'number' },
      { name: 'action', description: 'What they\'re doing', required: false, type: 'string', defaultValue: 'viewing' },
      { name: 'target', description: 'What they\'re viewing', required: false, type: 'string', defaultValue: 'this product' },
    ],
    example: '12 people viewing this product right now',
    requiredDataFields: ['visitor_count'],
    businessTypes: ['ecommerce', 'saas', 'blog', 'media'],
  },
  {
    id: 'recently-viewed',
    name: 'Recently Viewed',
    category: 'ecommerce',
    messageTemplate: '{{user_name}} from {{location}} viewed this {{timeframe}}',
    variables: [
      { name: 'user_name', description: 'Viewer name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'location', description: 'City or country', required: false, type: 'location' },
      { name: 'timeframe', description: 'When viewed', required: false, type: 'string', defaultValue: '5 minutes ago' },
    ],
    example: 'Emma from NYC viewed this 5 minutes ago',
    requiredDataFields: [],
    businessTypes: ['ecommerce', 'retail'],
  },
  {
    id: 'wishlist-additions',
    name: 'Wishlist Additions',
    category: 'ecommerce',
    messageTemplate: 'Added to {{count}} wishlists {{timeframe}}',
    variables: [
      { name: 'count', description: 'Wishlist count', required: true, type: 'number' },
      { name: 'timeframe', description: 'Time period', required: false, type: 'string', defaultValue: 'today' },
    ],
    example: 'Added to 47 wishlists today',
    requiredDataFields: ['count'],
    businessTypes: ['ecommerce', 'retail'],
  },
  {
    id: 'flash-sale',
    name: 'Flash Sale Timer',
    category: 'ecommerce',
    messageTemplate: '{{sale_type}} ends in {{time_remaining}}!',
    variables: [
      { name: 'sale_type', description: 'Type of sale', required: false, type: 'string', defaultValue: 'Sale' },
      { name: 'time_remaining', description: 'Countdown timer', required: true, type: 'string' },
    ],
    example: 'Sale ends in 2 hours 34 minutes!',
    requiredDataFields: ['time_remaining'],
    businessTypes: ['ecommerce', 'retail'],
  },

  // ========== SAAS/SOFTWARE (5 types) ==========
  {
    id: 'new-signup',
    name: 'New Signup',
    category: 'saas',
    messageTemplate: '{{user_name}} from {{location}} just signed up',
    variables: [
      { name: 'user_name', description: 'User name or "Someone"', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'location', description: 'City or country', required: false, type: 'location' },
    ],
    example: 'John from Austin just signed up',
    requiredDataFields: [],
    businessTypes: ['saas', 'services', 'education', 'blog'],
  },
  {
    id: 'trial-starts',
    name: 'Trial Start',
    category: 'saas',
    messageTemplate: '{{user_name}} started a {{plan_type}} {{timeframe}}',
    variables: [
      { name: 'user_name', description: 'User name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'plan_type', description: 'Trial plan', required: false, type: 'string', defaultValue: 'free trial' },
      { name: 'timeframe', description: 'When started', required: false, type: 'string', defaultValue: '3 minutes ago' },
    ],
    example: 'Alex started a free trial 3 minutes ago',
    requiredDataFields: [],
    businessTypes: ['saas'],
  },
  {
    id: 'upgrade-events',
    name: 'Upgrade Event',
    category: 'saas',
    messageTemplate: '{{user_name}} upgraded to {{plan_name}}',
    variables: [
      { name: 'user_name', description: 'User name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'plan_name', description: 'Plan upgraded to', required: true, type: 'string' },
    ],
    example: 'Sarah upgraded to Pro Plan',
    requiredDataFields: ['plan_name'],
    businessTypes: ['saas'],
  },
  {
    id: 'feature-releases',
    name: 'Feature Release',
    category: 'saas',
    messageTemplate: '{{emoji}} {{announcement_text}}',
    variables: [
      { name: 'emoji', description: 'Emoji prefix', required: false, type: 'string', defaultValue: '🚀' },
      { name: 'announcement_text', description: 'Feature announcement', required: true, type: 'string' },
    ],
    example: '🚀 New feature: Advanced Analytics is now live!',
    requiredDataFields: ['announcement_text'],
    businessTypes: ['saas', 'technology'],
  },
  {
    id: 'user-milestones',
    name: 'User Milestone',
    category: 'saas',
    messageTemplate: '{{user_name}} {{achievement}}',
    variables: [
      { name: 'user_name', description: 'User name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'achievement', description: 'What they achieved', required: true, type: 'string' },
    ],
    example: 'Mike completed his first project',
    requiredDataFields: ['achievement'],
    businessTypes: ['saas', 'education'],
  },

  // ========== SERVICES/BOOKING (4 types) ==========
  {
    id: 'new-bookings',
    name: 'New Booking',
    category: 'services',
    messageTemplate: '{{user_name}} booked {{service_type}} for {{booking_date}}',
    variables: [
      { name: 'user_name', description: 'Customer name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'service_type', description: 'Service booked', required: true, type: 'string' },
      { name: 'booking_date', description: 'Appointment date', required: false, type: 'date', defaultValue: 'soon' },
    ],
    example: 'Jennifer booked a consultation for tomorrow',
    requiredDataFields: ['service_type'],
    businessTypes: ['services', 'consulting', 'healthcare', 'beauty', 'fitness'],
  },
  {
    id: 'service-requests',
    name: 'Service Request',
    category: 'services',
    messageTemplate: '{{user_location}} {{action}} {{request_type}}',
    variables: [
      { name: 'user_location', description: 'Location or "Someone"', required: false, type: 'location', defaultValue: 'Someone' },
      { name: 'action', description: 'Action taken', required: false, type: 'string', defaultValue: 'requested' },
      { name: 'request_type', description: 'Type of request', required: true, type: 'string' },
    ],
    example: 'Someone from Chicago requested a quote',
    requiredDataFields: ['request_type'],
    businessTypes: ['services', 'consulting', 'real_estate'],
  },
  {
    id: 'appointments',
    name: 'Appointment Scheduled',
    category: 'services',
    messageTemplate: '{{user_name}} scheduled {{appointment_type}} for {{date}}',
    variables: [
      { name: 'user_name', description: 'Customer name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'appointment_type', description: 'Type of appointment', required: true, type: 'string' },
      { name: 'date', description: 'When scheduled', required: false, type: 'date', defaultValue: 'soon' },
    ],
    example: 'David scheduled a meeting for next week',
    requiredDataFields: ['appointment_type'],
    businessTypes: ['services', 'healthcare', 'consulting'],
  },
  {
    id: 'contact-form',
    name: 'Contact Form Submission',
    category: 'services',
    messageTemplate: '{{submission_type}} from {{location}} received',
    variables: [
      { name: 'submission_type', description: 'Type of inquiry', required: false, type: 'string', defaultValue: 'New inquiry' },
      { name: 'location', description: 'Location', required: false, type: 'location' },
    ],
    example: 'New inquiry from London received',
    requiredDataFields: [],
    businessTypes: ['services', 'real_estate', 'marketing_agency'],
  },

  // ========== CONTENT/MEDIA (3 types) ==========
  {
    id: 'newsletter-signups',
    name: 'Newsletter Signup',
    category: 'content',
    messageTemplate: '{{user_name}} subscribed to {{newsletter_name}}',
    variables: [
      { name: 'user_name', description: 'Subscriber name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'newsletter_name', description: 'Newsletter name', required: false, type: 'string', defaultValue: 'our newsletter' },
    ],
    example: 'Emma subscribed to our newsletter',
    requiredDataFields: [],
    businessTypes: ['blog', 'media', 'saas'],
  },
  {
    id: 'content-downloads',
    name: 'Content Download',
    category: 'content',
    messageTemplate: '{{user_name}} downloaded {{resource_name}}',
    variables: [
      { name: 'user_name', description: 'User name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'resource_name', description: 'Resource downloaded', required: true, type: 'string' },
    ],
    example: 'Michael downloaded the free guide',
    requiredDataFields: ['resource_name'],
    businessTypes: ['blog', 'media', 'education', 'marketing_agency'],
  },
  {
    id: 'blog-comments',
    name: 'Blog Comment',
    category: 'content',
    messageTemplate: '{{count}} new comments on {{article_title}}',
    variables: [
      { name: 'count', description: 'Comment count', required: true, type: 'number' },
      { name: 'article_title', description: 'Article title', required: false, type: 'string', defaultValue: 'latest article' },
    ],
    example: '5 new comments on latest article',
    requiredDataFields: ['count'],
    businessTypes: ['blog', 'media'],
  },

  // ========== SOCIAL/COMMUNITY (3 types) ==========
  {
    id: 'social-shares',
    name: 'Social Share',
    category: 'social',
    messageTemplate: '{{content_type}} shared on {{platform}} {{count}} times {{timeframe}}',
    variables: [
      { name: 'content_type', description: 'What was shared', required: false, type: 'string', defaultValue: 'Article' },
      { name: 'platform', description: 'Social platform', required: true, type: 'string' },
      { name: 'count', description: 'Share count', required: true, type: 'number' },
      { name: 'timeframe', description: 'Time period', required: false, type: 'string', defaultValue: 'today' },
    ],
    example: 'Article shared on Twitter 24 times today',
    requiredDataFields: ['platform', 'count'],
    businessTypes: ['blog', 'media', 'saas'],
  },
  {
    id: 'community-joins',
    name: 'Community Join',
    category: 'social',
    messageTemplate: '{{user_name}} joined {{community_name}}',
    variables: [
      { name: 'user_name', description: 'Member name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'community_name', description: 'Community name', required: false, type: 'string', defaultValue: 'the community' },
    ],
    example: 'Alex joined the community',
    requiredDataFields: [],
    businessTypes: ['saas', 'blog', 'education'],
  },
  {
    id: 'custom-event',
    name: 'Custom Event',
    category: 'social',
    messageTemplate: '{{custom_message}}',
    variables: [
      { name: 'custom_message', description: 'Fully customizable message', required: true, type: 'string' },
    ],
    example: 'Someone just downloaded the free guide',
    requiredDataFields: ['custom_message'],
    businessTypes: ['ecommerce', 'saas', 'services', 'blog', 'education'],
  },

  // ========== ADDITIONAL SPECIALIZED TYPES ==========
  {
    id: 'donation-notification',
    name: 'Donation Received',
    category: 'social',
    messageTemplate: '{{donor_name}} from {{location}} just donated {{amount}} to {{cause}}',
    variables: [
      { name: 'donor_name', description: 'Donor name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'location', description: 'City or country', required: false, type: 'location' },
      { name: 'amount', description: 'Donation amount', required: true, type: 'string' },
      { name: 'cause', description: 'Donation cause', required: false, type: 'string', defaultValue: 'our cause' },
    ],
    example: 'Sarah from Seattle just donated $50 to clean water',
    requiredDataFields: ['amount'],
    businessTypes: ['ngo'],
  },
  {
    id: 'impact-milestone',
    name: 'Impact Milestone',
    category: 'social',
    messageTemplate: '{{emoji}} {{milestone_text}}',
    variables: [
      { name: 'emoji', description: 'Celebration emoji', required: false, type: 'string', defaultValue: '🎉' },
      { name: 'milestone_text', description: 'Milestone achieved', required: true, type: 'string' },
    ],
    example: '🎉 We\'ve provided 10,000 meals this month!',
    requiredDataFields: ['milestone_text'],
    businessTypes: ['ngo'],
  },
  {
    id: 'volunteer-signup',
    name: 'Volunteer Signup',
    category: 'social',
    messageTemplate: '{{volunteer_name}} just signed up to {{activity}}',
    variables: [
      { name: 'volunteer_name', description: 'Volunteer name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'activity', description: 'What they\'re volunteering for', required: true, type: 'string' },
    ],
    example: 'James just signed up to volunteer at our food drive',
    requiredDataFields: ['activity'],
    businessTypes: ['ngo'],
  },
  {
    id: 'course-enrollment',
    name: 'Course Enrollment',
    category: 'content',
    messageTemplate: '{{student_name}} from {{location}} just enrolled in {{course_name}}',
    variables: [
      { name: 'student_name', description: 'Student name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'location', description: 'City or country', required: false, type: 'location' },
      { name: 'course_name', description: 'Course name', required: true, type: 'string' },
    ],
    example: 'Emma from London just enrolled in \'Web Development\'',
    requiredDataFields: ['course_name'],
    businessTypes: ['education'],
  },
  {
    id: 'completion-milestone',
    name: 'Course Completion',
    category: 'content',
    messageTemplate: '{{emoji}} {{student_name}} just completed {{course_name}}',
    variables: [
      { name: 'emoji', description: 'Celebration emoji', required: false, type: 'string', defaultValue: '🎓' },
      { name: 'student_name', description: 'Student name', required: false, type: 'string', defaultValue: 'Someone' },
      { name: 'course_name', description: 'Course name', required: true, type: 'string' },
    ],
    example: '🎓 David just completed \'Advanced Python\'',
    requiredDataFields: ['course_name'],
    businessTypes: ['education'],
  },
];

/**
 * Get template by campaign type ID
 */
export function getTemplateById(campaignTypeId: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find(t => t.id === campaignTypeId);
}

/**
 * Get templates by business type
 */
export function getTemplatesByBusinessType(businessType: string): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES.filter(t => t.businessTypes.includes(businessType));
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES.filter(t => t.category === category);
}

/**
 * Render template with variables
 */
export function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;
  
  // Replace all {{variable}} placeholders
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, value?.toString() || '');
  });
  
  // Remove any unreplaced variables (use defaults or empty string)
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');
  
  return rendered;
}

/**
 * Validate if all required variables are provided
 */
export function validateTemplateVariables(
  template: CampaignTemplate,
  variables: Record<string, any>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  template.variables.forEach(variable => {
    if (variable.required && !variables[variable.name]) {
      missing.push(variable.name);
    }
  });
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get default variables for template
 */
export function getDefaultVariables(template: CampaignTemplate): Record<string, string> {
  const defaults: Record<string, string> = {};
  
  template.variables.forEach(variable => {
    if (variable.defaultValue) {
      defaults[variable.name] = variable.defaultValue;
    }
  });
  
  return defaults;
}
