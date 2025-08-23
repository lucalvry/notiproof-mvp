import { EnhancedQuickWinTemplate } from '@/types/quickWin';

export const ENHANCED_QUICK_WIN_TEMPLATES: EnhancedQuickWinTemplate[] = [
  // E-COMMERCE TEMPLATES
  {
    id: 'ecommerce-flash-sale',
    name: 'Flash Sale Alert',
    description: 'Create urgency with time-limited sales',
    category: 'promotion',
    business_type: 'ecommerce',
    event_type: 'flash_sale',
    template_message: '🔥 Flash Sale: {discount_percentage}% OFF {product_category} - Ends in {time_remaining}!',
    form_schema: {
      discount_percentage: {
        type: 'number',
        label: 'Discount Percentage',
        placeholder: '20',
        required: true,
        validation: { min: 5, max: 90 },
        helpText: 'Enter discount percentage (5-90%)'
      },
      product_category: {
        type: 'select',
        label: 'Product Category',
        required: true,
        validation: {
          options: ['All Products', 'Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Beauty', 'Books']
        }
      },
      time_remaining: {
        type: 'select',
        label: 'Sale Duration',
        required: true,
        validation: {
          options: ['2 hours', '6 hours', '12 hours', '24 hours', '48 hours', '3 days']
        }
      },
      sale_link: {
        type: 'url',
        label: 'Sale Page URL',
        placeholder: 'https://yourstore.com/sale',
        required: false,
        helpText: 'Link to your sale page'
      }
    },
    default_metadata: {
      discount_percentage: 20,
      product_category: 'All Products',
      time_remaining: '24 hours'
    },
    preview_config: {
      style: 'notification',
      theme: 'urgency',
      icon: '🔥',
      colorScheme: 'red'
    },
    performance_hints: {
      conversion_rate: 8.5,
      engagement_score: 9.2,
      industry_benchmark: 6.8
    },
    tags: ['promotion', 'urgency', 'discount', 'time-limited']
  },
  {
    id: 'ecommerce-social-proof',
    name: 'Recent Purchase',
    description: 'Show real-time purchase activity',
    category: 'credibility',
    business_type: 'ecommerce',
    event_type: 'recent_purchase',
    template_message: '🛒 {customer_name} from {location} just bought {product_name} ({time_ago})',
    form_schema: {
      customer_name: {
        type: 'text',
        label: 'Customer Name',
        placeholder: 'Sarah M.',
        required: true,
        validation: { minLength: 2, maxLength: 30 },
        helpText: 'Use first name + last initial for privacy'
      },
      location: {
        type: 'text',
        label: 'Customer Location',
        placeholder: 'New York, NY',
        required: true,
        validation: { minLength: 3, maxLength: 50 }
      },
      product_name: {
        type: 'text',
        label: 'Product Name',
        placeholder: 'Wireless Headphones',
        required: true,
        validation: { maxLength: 100 }
      },
      time_ago: {
        type: 'select',
        label: 'Time Since Purchase',
        required: true,
        validation: {
          options: ['2 minutes ago', '5 minutes ago', '15 minutes ago', '1 hour ago', '2 hours ago']
        }
      },
      product_link: {
        type: 'url',
        label: 'Product Link',
        placeholder: 'https://yourstore.com/product',
        required: false
      }
    },
    default_metadata: {
      customer_name: 'Sarah M.',
      location: 'New York, NY',
      product_name: 'Wireless Headphones',
      time_ago: '5 minutes ago'
    },
    preview_config: {
      style: 'notification',
      theme: 'success',
      icon: '🛒',
      colorScheme: 'green'
    },
    performance_hints: {
      conversion_rate: 12.3,
      engagement_score: 8.7,
      industry_benchmark: 9.1
    },
    tags: ['social-proof', 'purchase', 'credibility']
  },
  {
    id: 'ecommerce-free-shipping',
    name: 'Free Shipping Offer',
    description: 'Promote free shipping threshold',
    category: 'promotion',
    business_type: 'ecommerce',
    event_type: 'free_shipping',
    template_message: '🚚 FREE shipping on orders over ${threshold}! You\'re only ${remaining_amount} away!',
    form_schema: {
      threshold: {
        type: 'number',
        label: 'Free Shipping Threshold',
        placeholder: '50',
        required: true,
        validation: { min: 10, max: 500 },
        helpText: 'Minimum order amount for free shipping'
      },
      remaining_amount: {
        type: 'number',
        label: 'Amount Remaining',
        placeholder: '25',
        required: true,
        validation: { min: 1, max: 500 },
        helpText: 'How much more customer needs to spend'
      },
      offer_link: {
        type: 'url',
        label: 'Shop Now Link',
        placeholder: 'https://yourstore.com/shop',
        required: false
      }
    },
    default_metadata: {
      threshold: 50,
      remaining_amount: 25
    },
    preview_config: {
      style: 'banner',
      theme: 'info',
      icon: '🚚',
      colorScheme: 'blue'
    },
    performance_hints: {
      conversion_rate: 15.2,
      engagement_score: 7.8,
      industry_benchmark: 11.4
    },
    tags: ['promotion', 'shipping', 'incentive']
  },

  // SAAS TEMPLATES
  {
    id: 'saas-free-trial',
    name: 'Free Trial Offer',
    description: 'Promote free trial signup',
    category: 'promotion',
    business_type: 'saas',
    event_type: 'free_trial',
    template_message: '✨ Start your {trial_duration}-day FREE trial of {product_name} - No credit card required!',
    form_schema: {
      product_name: {
        type: 'text',
        label: 'Product Name',
        placeholder: 'TaskMaster Pro',
        required: true,
        validation: { maxLength: 50 }
      },
      trial_duration: {
        type: 'select',
        label: 'Trial Duration',
        required: true,
        validation: {
          options: ['7', '14', '21', '30']
        }
      },
      key_feature: {
        type: 'text',
        label: 'Key Feature',
        placeholder: 'Advanced Analytics',
        required: false,
        validation: { maxLength: 100 },
        helpText: 'Highlight your best feature'
      },
      signup_link: {
        type: 'url',
        label: 'Signup Link',
        placeholder: 'https://yourapp.com/signup',
        required: false
      }
    },
    default_metadata: {
      product_name: 'TaskMaster Pro',
      trial_duration: '14',
      key_feature: 'Advanced Analytics'
    },
    preview_config: {
      style: 'modal',
      theme: 'success',
      icon: '✨',
      colorScheme: 'purple'
    },
    performance_hints: {
      conversion_rate: 18.7,
      engagement_score: 9.5,
      industry_benchmark: 14.2
    },
    tags: ['trial', 'saas', 'promotion', 'no-commitment']
  },
  {
    id: 'saas-feature-announcement',
    name: 'New Feature Launch',
    description: 'Announce exciting new features',
    category: 'feature',
    business_type: 'saas',
    event_type: 'feature_launch',
    template_message: '🎉 NEW: {feature_name} is now live! {benefit_description}',
    form_schema: {
      feature_name: {
        type: 'text',
        label: 'Feature Name',
        placeholder: 'AI-Powered Insights',
        required: true,
        validation: { maxLength: 60 }
      },
      benefit_description: {
        type: 'textarea',
        label: 'Benefit Description',
        placeholder: 'Get actionable insights automatically generated from your data',
        required: true,
        validation: { maxLength: 200 },
        helpText: 'Explain how this feature helps users'
      },
      learn_more_link: {
        type: 'url',
        label: 'Learn More Link',
        placeholder: 'https://yourapp.com/features/ai-insights',
        required: false
      }
    },
    default_metadata: {
      feature_name: 'AI-Powered Insights',
      benefit_description: 'Get actionable insights automatically generated from your data'
    },
    preview_config: {
      style: 'notification',
      theme: 'info',
      icon: '🎉',
      colorScheme: 'indigo'
    },
    performance_hints: {
      conversion_rate: 6.8,
      engagement_score: 8.9,
      industry_benchmark: 5.4
    },
    tags: ['feature', 'announcement', 'product-update']
  },

  // SERVICES TEMPLATES
  {
    id: 'services-consultation',
    name: 'Free Consultation',
    description: 'Offer free consultation or discovery call',
    category: 'promotion',
    business_type: 'services',
    event_type: 'consultation_offer',
    template_message: '💡 Book your FREE {consultation_type} consultation - Limited slots available this {time_period}!',
    form_schema: {
      consultation_type: {
        type: 'select',
        label: 'Consultation Type',
        required: true,
        validation: {
          options: ['Strategy', 'Discovery', 'Assessment', 'Planning', 'Review']
        }
      },
      time_period: {
        type: 'select',
        label: 'Time Period',
        required: true,
        validation: {
          options: ['week', 'month', 'quarter']
        }
      },
      duration: {
        type: 'select',
        label: 'Session Duration',
        required: false,
        validation: {
          options: ['30 minutes', '45 minutes', '60 minutes', '90 minutes']
        }
      },
      booking_link: {
        type: 'url',
        label: 'Booking Link',
        placeholder: 'https://calendly.com/yourname',
        required: false
      }
    },
    default_metadata: {
      consultation_type: 'Strategy',
      time_period: 'week',
      duration: '60 minutes'
    },
    preview_config: {
      style: 'notification',
      theme: 'success',
      icon: '💡',
      colorScheme: 'green'
    },
    performance_hints: {
      conversion_rate: 22.1,
      engagement_score: 9.8,
      industry_benchmark: 18.5
    },
    tags: ['consultation', 'free', 'services', 'limited-time']
  },

  // EVENTS TEMPLATES  
  {
    id: 'events-early-bird',
    name: 'Early Bird Special',
    description: 'Promote early bird pricing for events',
    category: 'promotion',
    business_type: 'events',
    event_type: 'early_bird',
    template_message: '🐦 Early Bird: Save {discount_amount}% on {event_name} tickets! Only {spots_left} spots left at this price!',
    form_schema: {
      event_name: {
        type: 'text',
        label: 'Event Name',
        placeholder: 'Digital Marketing Summit 2024',
        required: true,
        validation: { maxLength: 100 }
      },
      discount_amount: {
        type: 'number',
        label: 'Early Bird Discount %',
        placeholder: '30',
        required: true,
        validation: { min: 10, max: 70 }
      },
      spots_left: {
        type: 'number',
        label: 'Spots Remaining',
        placeholder: '25',
        required: true,
        validation: { min: 1, max: 1000 }
      },
      registration_link: {
        type: 'url',
        label: 'Registration Link',
        placeholder: 'https://yoursite.com/register',
        required: false
      }
    },
    default_metadata: {
      event_name: 'Digital Marketing Summit 2024',
      discount_amount: 30,
      spots_left: 25
    },
    preview_config: {
      style: 'banner',
      theme: 'urgency',
      icon: '🐦',
      colorScheme: 'orange'
    },
    performance_hints: {
      conversion_rate: 16.9,
      engagement_score: 8.4,
      industry_benchmark: 13.7
    },
    tags: ['early-bird', 'discount', 'limited-spots', 'events']
  },

  // BLOG/CONTENT TEMPLATES
  {
    id: 'blog-newsletter',
    name: 'Newsletter Signup',
    description: 'Encourage newsletter subscriptions',
    category: 'welcome',
    business_type: 'blog',
    event_type: 'newsletter_signup',
    template_message: '📧 Join {subscriber_count}+ subscribers getting our weekly {content_type} tips!',
    form_schema: {
      subscriber_count: {
        type: 'number',
        label: 'Current Subscriber Count',
        placeholder: '1200',
        required: true,
        validation: { min: 50, max: 1000000 },
        helpText: 'Round to nearest hundred for believability'
      },
      content_type: {
        type: 'select',
        label: 'Content Focus',
        required: true,
        validation: {
          options: ['Marketing', 'Business', 'Tech', 'Design', 'Productivity', 'Lifestyle']
        }
      },
      incentive: {
        type: 'text',
        label: 'Signup Incentive',
        placeholder: 'Free Marketing Checklist',
        required: false,
        validation: { maxLength: 50 }
      },
      signup_link: {
        type: 'url',
        label: 'Signup Form Link',
        placeholder: 'https://yoursite.com/newsletter',
        required: false
      }
    },
    default_metadata: {
      subscriber_count: 1200,
      content_type: 'Marketing',
      incentive: 'Free Marketing Checklist'
    },
    preview_config: {
      style: 'sidebar',
      theme: 'info',
      icon: '📧',
      colorScheme: 'blue'
    },
    performance_hints: {
      conversion_rate: 11.6,
      engagement_score: 7.9,
      industry_benchmark: 9.3
    },
    tags: ['newsletter', 'subscribers', 'content', 'email-marketing']
  }
];

export const getTemplatesByBusinessType = (businessType: string): EnhancedQuickWinTemplate[] => {
  return ENHANCED_QUICK_WIN_TEMPLATES.filter(template => 
    template.business_type === businessType || template.business_type === 'universal'
  );
};

export const getTemplatesByCategory = (category: string): EnhancedQuickWinTemplate[] => {
  return ENHANCED_QUICK_WIN_TEMPLATES.filter(template => 
    template.category === category
  );
};

export const getTemplateById = (templateId: string): EnhancedQuickWinTemplate | undefined => {
  return ENHANCED_QUICK_WIN_TEMPLATES.find(template => template.id === templateId);
};