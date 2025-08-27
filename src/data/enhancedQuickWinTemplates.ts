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
    template_message: '🛒 {customer_name} from {location} just bought {product_name}',
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
      }
    },
    default_metadata: {
      customer_name: 'Sarah M.',
      location: 'New York, NY',
      product_name: 'Premium Product'
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
    template_message: '🚚 FREE shipping on orders over ${threshold}! Add ${remaining_amount} more to qualify!',
    form_schema: {
      threshold: {
        type: 'number',
        label: 'Free Shipping Threshold',
        placeholder: '50',
        required: true,
        validation: { min: 10, max: 500 }
      },
      remaining_amount: {
        type: 'number',
        label: 'Amount Remaining',
        placeholder: '25',
        required: true,
        validation: { min: 1, max: 500 }
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
        validation: { maxLength: 100 }
      }
    },
    default_metadata: {
      product_name: 'Our Platform',
      trial_duration: '14',
      key_feature: 'Premium Features'
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
        placeholder: 'Get actionable insights automatically',
        required: true,
        validation: { maxLength: 200 }
      }
    },
    default_metadata: {
      feature_name: 'Smart Analytics',
      benefit_description: 'Get powerful insights automatically'
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

  // MARKETING AGENCY TEMPLATES
  {
    id: 'agency-case-study',
    name: 'Success Case Study',
    description: 'Showcase client results and testimonials',
    category: 'credibility',
    business_type: 'marketing_agency',
    event_type: 'case_study',
    template_message: '📈 Case Study: How we helped {client_industry} increase {metric} by {improvement}% in {timeframe}',
    form_schema: {
      client_industry: {
        type: 'select',
        label: 'Client Industry',
        required: true,
        validation: {
          options: ['E-commerce', 'SaaS', 'Healthcare', 'Finance', 'Real Estate', 'Education', 'Manufacturing']
        }
      },
      metric: {
        type: 'select',
        label: 'Key Metric',
        required: true,
        validation: {
          options: ['sales', 'leads', 'traffic', 'conversions', 'ROI', 'engagement']
        }
      },
      improvement: {
        type: 'number',
        label: 'Improvement Percentage',
        placeholder: '150',
        required: true,
        validation: { min: 10, max: 1000 }
      },
      timeframe: {
        type: 'select',
        label: 'Timeframe',
        required: true,
        validation: {
          options: ['30 days', '60 days', '90 days', '6 months', '1 year']
        }
      }
    },
    default_metadata: {
      client_industry: 'E-commerce',
      metric: 'sales',
      improvement: 150,
      timeframe: '90 days'
    },
    preview_config: {
      style: 'notification',
      theme: 'success',
      icon: '📈',
      colorScheme: 'green'
    },
    performance_hints: {
      conversion_rate: 16.4,
      engagement_score: 9.1,
      industry_benchmark: 12.8
    },
    tags: ['case-study', 'results', 'credibility', 'testimonial']
  },
  {
    id: 'agency-audit',
    name: 'Free Marketing Audit',
    description: 'Offer free marketing audits or assessments',
    category: 'promotion',
    business_type: 'marketing_agency',
    event_type: 'free_audit',
    template_message: '🔍 FREE {audit_type} Audit - We\'ll analyze your {focus_area} and show you exactly how to improve!',
    form_schema: {
      audit_type: {
        type: 'select',
        label: 'Audit Type',
        required: true,
        validation: {
          options: ['Marketing', 'SEO', 'Social Media', 'PPC', 'Website', 'Content']
        }
      },
      focus_area: {
        type: 'select',
        label: 'Focus Area',
        required: true,
        validation: {
          options: ['website performance', 'ad campaigns', 'social presence', 'content strategy', 'SEO rankings']
        }
      }
    },
    default_metadata: {
      audit_type: 'Marketing',
      focus_area: 'website performance'
    },
    preview_config: {
      style: 'modal',
      theme: 'info',
      icon: '🔍',
      colorScheme: 'blue'
    },
    performance_hints: {
      conversion_rate: 19.7,
      engagement_score: 8.8,
      industry_benchmark: 15.3
    },
    tags: ['audit', 'free', 'assessment', 'consultation']
  },

  // NGO/NON-PROFIT TEMPLATES
  {
    id: 'ngo-impact',
    name: 'Impact Achievement',
    description: 'Showcase mission impact and achievements',
    category: 'credibility',
    business_type: 'ngo',
    event_type: 'impact_milestone',
    template_message: '🌟 IMPACT: Together we\'ve {achievement_description} - {number_achieved} {impact_unit} and counting!',
    form_schema: {
      achievement_description: {
        type: 'text',
        label: 'Achievement Description',
        placeholder: 'provided clean water access',
        required: true,
        validation: { maxLength: 80 }
      },
      number_achieved: {
        type: 'number',
        label: 'Number Achieved',
        placeholder: '5000',
        required: true,
        validation: { min: 10, max: 10000000 }
      },
      impact_unit: {
        type: 'select',
        label: 'Impact Unit',
        required: true,
        validation: {
          options: ['people helped', 'families served', 'children educated', 'trees planted', 'meals provided', 'homes built']
        }
      }
    },
    default_metadata: {
      achievement_description: 'provided clean water access',
      number_achieved: 5000,
      impact_unit: 'people helped'
    },
    preview_config: {
      style: 'banner',
      theme: 'success',
      icon: '🌟',
      colorScheme: 'green'
    },
    performance_hints: {
      conversion_rate: 14.2,
      engagement_score: 9.6,
      industry_benchmark: 11.8
    },
    tags: ['impact', 'milestone', 'social-good', 'transparency']
  },
  {
    id: 'ngo-donation',
    name: 'Donation Drive',
    description: 'Promote donation campaigns and fundraising',
    category: 'promotion',
    business_type: 'ngo',
    event_type: 'donation_campaign',
    template_message: '💝 Help us reach our goal! ${raised_amount} raised of ${goal_amount} - Every ${minimum_donation} makes a difference!',
    form_schema: {
      raised_amount: {
        type: 'number',
        label: 'Amount Raised',
        placeholder: '15000',
        required: true,
        validation: { min: 100, max: 10000000 }
      },
      goal_amount: {
        type: 'number',
        label: 'Goal Amount',
        placeholder: '25000',
        required: true,
        validation: { min: 500, max: 10000000 }
      },
      minimum_donation: {
        type: 'number',
        label: 'Minimum Donation',
        placeholder: '25',
        required: true,
        validation: { min: 5, max: 1000 }
      }
    },
    default_metadata: {
      raised_amount: 15000,
      goal_amount: 25000,
      minimum_donation: 25
    },
    preview_config: {
      style: 'banner',
      theme: 'urgency',
      icon: '💝',
      colorScheme: 'red'
    },
    performance_hints: {
      conversion_rate: 12.5,
      engagement_score: 8.9,
      industry_benchmark: 9.7
    },
    tags: ['donation', 'fundraising', 'campaign', 'charity']
  },

  // EDUCATION TEMPLATES
  {
    id: 'education-enrollment',
    name: 'Course Enrollment',
    description: 'Promote course enrollments and education programs',
    category: 'promotion',
    business_type: 'education',
    event_type: 'course_enrollment',
    template_message: '🎓 {course_name} - {spots_remaining} spots left! Join {enrolled_count}+ students already enrolled',
    form_schema: {
      course_name: {
        type: 'text',
        label: 'Course Name',
        placeholder: 'Digital Marketing Fundamentals',
        required: true,
        validation: { maxLength: 80 }
      },
      spots_remaining: {
        type: 'number',
        label: 'Spots Remaining',
        placeholder: '15',
        required: true,
        validation: { min: 1, max: 500 }
      },
      enrolled_count: {
        type: 'number',
        label: 'Students Enrolled',
        placeholder: '120',
        required: true,
        validation: { min: 10, max: 100000 }
      }
    },
    default_metadata: {
      course_name: 'Digital Marketing Fundamentals',
      spots_remaining: 15,
      enrolled_count: 120
    },
    preview_config: {
      style: 'notification',
      theme: 'urgency',
      icon: '🎓',
      colorScheme: 'purple'
    },
    performance_hints: {
      conversion_rate: 18.3,
      engagement_score: 8.7,
      industry_benchmark: 14.9
    },
    tags: ['enrollment', 'education', 'limited-spots', 'course']
  },
  {
    id: 'education-scholarship',
    name: 'Scholarship Opportunity',
    description: 'Promote scholarships and financial aid',
    category: 'promotion',
    business_type: 'education',
    event_type: 'scholarship_offer',
    template_message: '💰 {scholarship_name} - Up to ${scholarship_amount} available! Application deadline: {deadline}',
    form_schema: {
      scholarship_name: {
        type: 'text',
        label: 'Scholarship Name',
        placeholder: 'Merit Excellence Scholarship',
        required: true,
        validation: { maxLength: 60 }
      },
      scholarship_amount: {
        type: 'number',
        label: 'Scholarship Amount',
        placeholder: '5000',
        required: true,
        validation: { min: 500, max: 100000 }
      },
      deadline: {
        type: 'text',
        label: 'Application Deadline',
        placeholder: 'March 15th',
        required: true,
        validation: { maxLength: 30 }
      }
    },
    default_metadata: {
      scholarship_name: 'Merit Excellence Scholarship',
      scholarship_amount: 5000,
      deadline: 'March 15th'
    },
    preview_config: {
      style: 'banner',
      theme: 'success',
      icon: '💰',
      colorScheme: 'green'
    },
    performance_hints: {
      conversion_rate: 21.4,
      engagement_score: 9.3,
      industry_benchmark: 17.6
    },
    tags: ['scholarship', 'financial-aid', 'opportunity', 'deadline']
  },

  // REAL ESTATE TEMPLATES
  {
    id: 'realestate-listing',
    name: 'New Property Listing',
    description: 'Showcase new property listings',
    category: 'feature',
    business_type: 'real_estate',
    event_type: 'new_listing',
    template_message: '🏡 NEW LISTING: {property_type} in {location} - ${price} | {bedrooms}bd {bathrooms}ba',
    form_schema: {
      property_type: {
        type: 'select',
        label: 'Property Type',
        required: true,
        validation: {
          options: ['House', 'Condo', 'Townhouse', 'Apartment', 'Commercial', 'Land']
        }
      },
      location: {
        type: 'text',
        label: 'Location/Neighborhood',
        placeholder: 'Downtown Miami',
        required: true,
        validation: { maxLength: 50 }
      },
      price: {
        type: 'number',
        label: 'Price',
        placeholder: '450000',
        required: true,
        validation: { min: 50000, max: 50000000 }
      },
      bedrooms: {
        type: 'number',
        label: 'Bedrooms',
        placeholder: '3',
        required: true,
        validation: { min: 1, max: 20 }
      },
      bathrooms: {
        type: 'number',
        label: 'Bathrooms',
        placeholder: '2',
        required: true,
        validation: { min: 1, max: 20 }
      }
    },
    default_metadata: {
      property_type: 'House',
      location: 'Downtown',
      price: 450000,
      bedrooms: 3,
      bathrooms: 2
    },
    preview_config: {
      style: 'notification',
      theme: 'info',
      icon: '🏡',
      colorScheme: 'blue'
    },
    performance_hints: {
      conversion_rate: 13.7,
      engagement_score: 8.4,
      industry_benchmark: 10.9
    },
    tags: ['listing', 'property', 'new', 'real-estate']
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
        validation: { min: 50, max: 1000000 }
      },
      content_type: {
        type: 'select',
        label: 'Content Focus',
        required: true,
        validation: {
          options: ['Marketing', 'Business', 'Tech', 'Design', 'Productivity', 'Lifestyle']
        }
      }
    },
    default_metadata: {
      subscriber_count: 1200,
      content_type: 'Marketing'
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
  },
  {
    id: 'blog-download',
    name: 'Free Download',
    description: 'Promote lead magnets and free resources',
    category: 'promotion',
    business_type: 'blog',
    event_type: 'resource_download',
    template_message: '📥 Get your FREE {resource_type}: "{resource_title}" - Downloaded {download_count}+ times!',
    form_schema: {
      resource_type: {
        type: 'select',
        label: 'Resource Type',
        required: true,
        validation: {
          options: ['eBook', 'Template', 'Checklist', 'Guide', 'Toolkit', 'Worksheet']
        }
      },
      resource_title: {
        type: 'text',
        label: 'Resource Title',
        placeholder: 'Ultimate Content Marketing Guide',
        required: true,
        validation: { maxLength: 80 }
      },
      download_count: {
        type: 'number',
        label: 'Download Count',
        placeholder: '500',
        required: true,
        validation: { min: 50, max: 100000 }
      }
    },
    default_metadata: {
      resource_type: 'eBook',
      resource_title: 'Ultimate Content Marketing Guide',
      download_count: 500
    },
    preview_config: {
      style: 'notification',
      theme: 'success',
      icon: '📥',
      colorScheme: 'green'
    },
    performance_hints: {
      conversion_rate: 13.8,
      engagement_score: 8.2,
      industry_benchmark: 10.5
    },
    tags: ['download', 'lead-magnet', 'free-resource']
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