export interface EventTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  eventType: string;
  messageTemplate: string;
  placeholders: string[];
  businessContext: {
    icon: string;
    colorClass: string;
    locationPlaceholder: string;
  };
}

export const INDUSTRY_EVENT_TEMPLATES: Record<string, EventTemplate[]> = {
  ecommerce: [
    {
      id: 'ecommerce-purchase',
      name: 'Purchase Completed',
      category: 'E-commerce',
      description: 'Someone completed a purchase',
      eventType: 'purchase',
      messageTemplate: '🛒 {customer_name} from {location} just purchased {product_name}',
      placeholders: ['customer_name', 'location', 'product_name'],
      businessContext: {
        icon: '🛒',
        colorClass: 'text-green-600',
        locationPlaceholder: 'New York, NY'
      }
    },
    {
      id: 'ecommerce-cart-add',
      name: 'Added to Cart',
      category: 'E-commerce',
      description: 'Someone added an item to their cart',
      eventType: 'cart_add',
      messageTemplate: '🛍️ {customer_name} from {location} added {product_name} to cart',
      placeholders: ['customer_name', 'location', 'product_name'],
      businessContext: {
        icon: '🛍️',
        colorClass: 'text-blue-600',
        locationPlaceholder: 'Los Angeles, CA'
      }
    },
    {
      id: 'ecommerce-product-view',
      name: 'Product Viewed',
      category: 'E-commerce',
      description: 'Someone is viewing a product',
      eventType: 'product_view',
      messageTemplate: '👀 Someone from {location} is viewing {product_name}',
      placeholders: ['location', 'product_name'],
      businessContext: {
        icon: '👀',
        colorClass: 'text-purple-600',
        locationPlaceholder: 'Chicago, IL'
      }
    },
    {
      id: 'ecommerce-checkout-start',
      name: 'Checkout Started',
      category: 'E-commerce',
      description: 'Someone started the checkout process',
      eventType: 'checkout_start',
      messageTemplate: '💳 {customer_name} from {location} started checkout with {item_count} items',
      placeholders: ['customer_name', 'location', 'item_count'],
      businessContext: {
        icon: '💳',
        colorClass: 'text-orange-600',
        locationPlaceholder: 'Miami, FL'
      }
    }
  ],
  saas: [
    {
      id: 'saas-signup',
      name: 'New Signup',
      category: 'SaaS',
      description: 'Someone signed up for your service',
      eventType: 'signup',
      messageTemplate: '🚀 {user_name} from {location} just signed up',
      placeholders: ['user_name', 'location'],
      businessContext: {
        icon: '🚀',
        colorClass: 'text-green-600',
        locationPlaceholder: 'San Francisco, CA'
      }
    },
    {
      id: 'saas-upgrade',
      name: 'Plan Upgrade',
      category: 'SaaS',
      description: 'Someone upgraded their plan',
      eventType: 'upgrade',
      messageTemplate: '⬆️ {user_name} from {location} upgraded to {plan_name}',
      placeholders: ['user_name', 'location', 'plan_name'],
      businessContext: {
        icon: '⬆️',
        colorClass: 'text-blue-600',
        locationPlaceholder: 'Austin, TX'
      }
    },
    {
      id: 'saas-trial-start',
      name: 'Trial Started',
      category: 'SaaS',
      description: 'Someone started a free trial',
      eventType: 'trial_start',
      messageTemplate: '✨ {user_name} from {location} started a free trial',
      placeholders: ['user_name', 'location'],
      businessContext: {
        icon: '✨',
        colorClass: 'text-purple-600',
        locationPlaceholder: 'Seattle, WA'
      }
    },
    {
      id: 'saas-feature-usage',
      name: 'Feature Used',
      category: 'SaaS',
      description: 'Someone used a key feature',
      eventType: 'feature_usage',
      messageTemplate: '🎯 {user_name} from {location} used {feature_name}',
      placeholders: ['user_name', 'location', 'feature_name'],
      businessContext: {
        icon: '🎯',
        colorClass: 'text-indigo-600',
        locationPlaceholder: 'Boston, MA'
      }
    }
  ],
  services: [
    {
      id: 'services-booking',
      name: 'Service Booked',
      category: 'Services',
      description: 'Someone booked a service',
      eventType: 'booking',
      messageTemplate: '📅 {client_name} from {location} booked {service_name}',
      placeholders: ['client_name', 'location', 'service_name'],
      businessContext: {
        icon: '📅',
        colorClass: 'text-green-600',
        locationPlaceholder: 'Denver, CO'
      }
    },
    {
      id: 'services-consultation',
      name: 'Consultation Scheduled',
      category: 'Services',
      description: 'Someone scheduled a consultation',
      eventType: 'consultation',
      messageTemplate: '💡 {client_name} from {location} scheduled a consultation',
      placeholders: ['client_name', 'location'],
      businessContext: {
        icon: '💡',
        colorClass: 'text-blue-600',
        locationPlaceholder: 'Atlanta, GA'
      }
    },
    {
      id: 'services-quote',
      name: 'Quote Requested',
      category: 'Services',
      description: 'Someone requested a quote',
      eventType: 'quote_request',
      messageTemplate: '💰 {client_name} from {location} requested a quote for {service_type}',
      placeholders: ['client_name', 'location', 'service_type'],
      businessContext: {
        icon: '💰',
        colorClass: 'text-orange-600',
        locationPlaceholder: 'Phoenix, AZ'
      }
    }
  ],
  real_estate: [
    {
      id: 'realestate-property-view',
      name: 'Property Viewed',
      category: 'Real Estate',
      description: 'Someone viewed a property listing',
      eventType: 'property_view',
      messageTemplate: '🏠 Someone from {location} is viewing {property_address}',
      placeholders: ['location', 'property_address'],
      businessContext: {
        icon: '🏠',
        colorClass: 'text-green-600',
        locationPlaceholder: 'Nashville, TN'
      }
    },
    {
      id: 'realestate-offer',
      name: 'Offer Submitted',
      category: 'Real Estate',
      description: 'Someone submitted an offer',
      eventType: 'offer_submitted',
      messageTemplate: '💼 {buyer_name} from {location} submitted an offer on {property_address}',
      placeholders: ['buyer_name', 'location', 'property_address'],
      businessContext: {
        icon: '💼',
        colorClass: 'text-blue-600',
        locationPlaceholder: 'Portland, OR'
      }
    },
    {
      id: 'realestate-inquiry',
      name: 'Property Inquiry',
      category: 'Real Estate',
      description: 'Someone inquired about a property',
      eventType: 'property_inquiry',
      messageTemplate: '📞 {client_name} from {location} inquired about {property_type}',
      placeholders: ['client_name', 'location', 'property_type'],
      businessContext: {
        icon: '📞',
        colorClass: 'text-purple-600',
        locationPlaceholder: 'Charlotte, NC'
      }
    }
  ],
  education: [
    {
      id: 'education-enrollment',
      name: 'Course Enrollment',
      category: 'Education',
      description: 'Someone enrolled in a course',
      eventType: 'enrollment',
      messageTemplate: '🎓 {student_name} from {location} enrolled in {course_name}',
      placeholders: ['student_name', 'location', 'course_name'],
      businessContext: {
        icon: '🎓',
        colorClass: 'text-green-600',
        locationPlaceholder: 'Philadelphia, PA'
      }
    },
    {
      id: 'education-completion',
      name: 'Course Completed',
      category: 'Education',
      description: 'Someone completed a course',
      eventType: 'course_completion',
      messageTemplate: '🏆 {student_name} from {location} completed {course_name}',
      placeholders: ['student_name', 'location', 'course_name'],
      businessContext: {
        icon: '🏆',
        colorClass: 'text-blue-600',
        locationPlaceholder: 'San Diego, CA'
      }
    },
    {
      id: 'education-certification',
      name: 'Certification Earned',
      category: 'Education',
      description: 'Someone earned a certification',
      eventType: 'certification',
      messageTemplate: '📜 {student_name} from {location} earned {certification_name}',
      placeholders: ['student_name', 'location', 'certification_name'],
      businessContext: {
        icon: '📜',
        colorClass: 'text-purple-600',
        locationPlaceholder: 'Dallas, TX'
      }
    }
  ],
  events: [
    {
      id: 'events-registration',
      name: 'Event Registration',
      category: 'Events',
      description: 'Someone registered for an event',
      eventType: 'event_registration',
      messageTemplate: '🎫 {attendee_name} from {location} registered for {event_name}',
      placeholders: ['attendee_name', 'location', 'event_name'],
      businessContext: {
        icon: '🎫',
        colorClass: 'text-green-600',
        locationPlaceholder: 'Las Vegas, NV'
      }
    },
    {
      id: 'events-attendance',
      name: 'Event Attendance',
      category: 'Events',
      description: 'Someone is attending the event',
      eventType: 'event_attendance',
      messageTemplate: '👥 {attendee_name} from {location} joined {event_name}',
      placeholders: ['attendee_name', 'location', 'event_name'],
      businessContext: {
        icon: '👥',
        colorClass: 'text-blue-600',
        locationPlaceholder: 'Orlando, FL'
      }
    },
    {
      id: 'events-webinar',
      name: 'Webinar Registration',
      category: 'Events',
      description: 'Someone registered for a webinar',
      eventType: 'webinar_registration',
      messageTemplate: '💻 {attendee_name} from {location} registered for {webinar_title}',
      placeholders: ['attendee_name', 'location', 'webinar_title'],
      businessContext: {
        icon: '💻',
        colorClass: 'text-purple-600',
        locationPlaceholder: 'Remote'
      }
    }
  ],
  retail: [
    {
      id: 'retail-appointment',
      name: 'Appointment Booked',
      category: 'Local Business',
      description: 'Someone booked an appointment',
      eventType: 'appointment',
      messageTemplate: '📅 {customer_name} from {location} booked an appointment',
      placeholders: ['customer_name', 'location'],
      businessContext: {
        icon: '📅',
        colorClass: 'text-green-600',
        locationPlaceholder: 'Minneapolis, MN'
      }
    },
    {
      id: 'retail-review',
      name: 'Review Received',
      category: 'Local Business',
      description: 'Someone left a review',
      eventType: 'review',
      messageTemplate: '⭐ {customer_name} from {location} left a {rating}-star review',
      placeholders: ['customer_name', 'location', 'rating'],
      businessContext: {
        icon: '⭐',
        colorClass: 'text-yellow-600',
        locationPlaceholder: 'Tampa, FL'
      }
    },
    {
      id: 'retail-checkin',
      name: 'Customer Check-in',
      category: 'Local Business',
      description: 'Someone checked in at your location',
      eventType: 'checkin',
      messageTemplate: '📍 {customer_name} from {location} checked in',
      placeholders: ['customer_name', 'location'],
      businessContext: {
        icon: '📍',
        colorClass: 'text-blue-600',
        locationPlaceholder: 'Kansas City, MO'
      }
    }
  ],
  ngo: [
    {
      id: 'ngo-donation',
      name: 'Donation Made',
      category: 'Nonprofits',
      description: 'Someone made a donation',
      eventType: 'donation',
      messageTemplate: '❤️ {donor_name} from {location} donated ${amount}',
      placeholders: ['donor_name', 'location', 'amount'],
      businessContext: {
        icon: '❤️',
        colorClass: 'text-red-600',
        locationPlaceholder: 'Washington, DC'
      }
    },
    {
      id: 'ngo-volunteer',
      name: 'Volunteer Signup',
      category: 'Nonprofits',
      description: 'Someone signed up to volunteer',
      eventType: 'volunteer_signup',
      messageTemplate: '🤝 {volunteer_name} from {location} signed up to volunteer',
      placeholders: ['volunteer_name', 'location'],
      businessContext: {
        icon: '🤝',
        colorClass: 'text-green-600',
        locationPlaceholder: 'Baltimore, MD'
      }
    },
    {
      id: 'ngo-monthly-support',
      name: 'Monthly Supporter',
      category: 'Nonprofits',
      description: 'Someone became a monthly supporter',
      eventType: 'monthly_support',
      messageTemplate: '🌟 {supporter_name} from {location} became a monthly supporter',
      placeholders: ['supporter_name', 'location'],
      businessContext: {
        icon: '🌟',
        colorClass: 'text-blue-600',
        locationPlaceholder: 'Richmond, VA'
      }
    }
  ],
  blog: [
    {
      id: 'blog-subscription',
      name: 'Newsletter Subscription',
      category: 'Content/Blogging',
      description: 'Someone subscribed to your newsletter',
      eventType: 'newsletter_subscription',
      messageTemplate: '📧 {subscriber_name} from {location} subscribed to our newsletter',
      placeholders: ['subscriber_name', 'location'],
      businessContext: {
        icon: '📧',
        colorClass: 'text-green-600',
        locationPlaceholder: 'Columbus, OH'
      }
    },
    {
      id: 'blog-download',
      name: 'Content Download',
      category: 'Content/Blogging',
      description: 'Someone downloaded your content',
      eventType: 'content_download',
      messageTemplate: '📥 {user_name} from {location} downloaded {content_title}',
      placeholders: ['user_name', 'location', 'content_title'],
      businessContext: {
        icon: '📥',
        colorClass: 'text-blue-600',
        locationPlaceholder: 'Milwaukee, WI'
      }
    },
    {
      id: 'blog-share',
      name: 'Content Shared',
      category: 'Content/Blogging',
      description: 'Someone shared your content',
      eventType: 'content_share',
      messageTemplate: '📤 {user_name} from {location} shared {article_title}',
      placeholders: ['user_name', 'location', 'article_title'],
      businessContext: {
        icon: '📤',
        colorClass: 'text-purple-600',
        locationPlaceholder: 'Louisville, KY'
      }
    }
  ]
};

export const getAllTemplates = (): EventTemplate[] => {
  return Object.values(INDUSTRY_EVENT_TEMPLATES).flat();
};

export const getTemplatesByIndustry = (industry: string): EventTemplate[] => {
  return INDUSTRY_EVENT_TEMPLATES[industry] || [];
};

export const getTemplateById = (templateId: string): EventTemplate | undefined => {
  return getAllTemplates().find(template => template.id === templateId);
};