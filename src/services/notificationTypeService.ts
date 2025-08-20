interface NotificationTypeMapping {
  id: string;
  name: string;
  eventTypes: string[];
  messageTemplates: {
    ecommerce: string[];
    saas: string[];
    services: string[];
    events: string[];
    blog: string[];
    marketing_agency: string[];
    ngo: string[];
    education: string[];
  };
}

export class NotificationTypeService {
  private static readonly NOTIFICATION_TYPE_MAPPINGS: NotificationTypeMapping[] = [
    {
      id: 'recent-purchase',
      name: 'Recent Purchase',
      eventTypes: ['purchase', 'conversion'],
      messageTemplates: {
        ecommerce: [
          '{name} from {location} just bought {product} for ${amount}',
          '{name} purchased {product} {timeAgo}',
          'Someone from {location} just completed a purchase'
        ],
        saas: [
          '{name} from {location} upgraded to {product} plan',
          '{name} just purchased {product} subscription',
          'Someone from {location} upgraded their plan'
        ],
        services: [
          '{name} from {location} booked {service} for ${amount}',
          '{name} just purchased {service}',
          'Someone from {location} hired us for {service}'
        ],
        events: [
          '{name} from {location} bought a ticket to {product}',
          '{name} just registered for {product}',
          'Someone from {location} joined {product}'
        ],
        blog: [
          '{name} from {location} subscribed to premium content',
          '{name} purchased access to {product}',
          'Someone from {location} became a premium member'
        ],
        marketing_agency: [
          '{name} from {location} purchased {service} package',
          '{name} just bought our {product} service',
          'Someone from {location} hired us for {service}'
        ],
        ngo: [
          '{name} from {location} donated ${amount} to {service}',
          '{name} made a donation of ${amount}',
          'Someone from {location} supported our cause'
        ],
        education: [
          '{name} from {location} enrolled in {product}',
          '{name} purchased {product} course',
          'Someone from {location} joined our program'
        ]
      }
    },
    {
      id: 'live-visitors',
      name: 'Live Visitor Count',
      eventTypes: ['view', 'visitor'],
      messageTemplates: {
        ecommerce: [
          '{count} people are shopping on your store right now',
          '{count} visitors are browsing products',
          '{count} people are viewing this page'
        ],
        saas: [
          '{count} people are exploring your platform right now',
          '{count} users are active on your site',
          '{count} visitors are checking out your features'
        ],
        services: [
          '{count} people are viewing your services right now',
          '{count} potential clients are browsing',
          '{count} visitors are on your site'
        ],
        events: [
          '{count} people are viewing this event right now',
          '{count} attendees are checking event details',
          '{count} visitors are browsing events'
        ],
        blog: [
          '{count} people are reading your content right now',
          '{count} readers are active on your blog',
          '{count} visitors are exploring articles'
        ],
        marketing_agency: [
          '{count} businesses are viewing your services',
          '{count} potential clients are browsing',
          '{count} visitors are exploring your portfolio'
        ],
        ngo: [
          '{count} supporters are viewing your mission',
          '{count} people are learning about your cause',
          '{count} visitors are exploring your impact'
        ],
        education: [
          '{count} students are exploring courses',
          '{count} learners are browsing programs',
          '{count} visitors are viewing educational content'
        ]
      }
    },
    {
      id: 'contact-form',
      name: 'Contact Submission',
      eventTypes: ['contact', 'conversion'],
      messageTemplates: {
        ecommerce: [
          '{name} from {location} submitted a product inquiry',
          'New customer inquiry from {location}',
          '{name} asked about {product}'
        ],
        saas: [
          '{name} from {location} requested a demo',
          'New demo request from {location}',
          '{name} contacted us about {product}'
        ],
        services: [
          '{name} from {location} requested a quote for {service}',
          'New service inquiry from {location}',
          '{name} contacted us about {service}'
        ],
        events: [
          '{name} from {location} inquired about {product}',
          'New event inquiry from {location}',
          '{name} asked about event details'
        ],
        blog: [
          '{name} from {location} submitted a contact form',
          'New reader inquiry from {location}',
          '{name} reached out about collaboration'
        ],
        marketing_agency: [
          '{name} from {location} requested a strategy consultation',
          'New business inquiry from {location}',
          '{name} asked about {service} services'
        ],
        ngo: [
          '{name} from {location} volunteered to help',
          'New volunteer inquiry from {location}',
          '{name} wants to support {service}'
        ],
        education: [
          '{name} from {location} inquired about {product}',
          'New student inquiry from {location}',
          '{name} asked about course details'
        ]
      }
    },
    {
      id: 'signup-notification',
      name: 'New Signup',
      eventTypes: ['signup'],
      messageTemplates: {
        ecommerce: [
          '{name} from {location} created an account',
          'New customer from {location} signed up',
          '{name} just joined your store'
        ],
        saas: [
          '{name} from {location} started their free trial',
          'New user from {location} signed up',
          '{name} just activated their account'
        ],
        services: [
          '{name} from {location} signed up for updates',
          'New client from {location} joined',
          '{name} subscribed to your newsletter'
        ],
        events: [
          '{name} from {location} registered for {product}',
          'New attendee from {location} signed up',
          '{name} just registered for the event'
        ],
        blog: [
          '{name} from {location} subscribed to your newsletter',
          'New subscriber from {location}',
          '{name} joined your mailing list'
        ],
        marketing_agency: [
          '{name} from {location} signed up for insights',
          'New lead from {location}',
          '{name} subscribed to marketing tips'
        ],
        ngo: [
          '{name} from {location} signed up to volunteer',
          'New supporter from {location}',
          '{name} joined our community'
        ],
        education: [
          '{name} from {location} enrolled in {product}',
          'New student from {location} signed up',
          '{name} started their learning journey'
        ]
      }
    },
    {
      id: 'review-testimonial',
      name: 'Reviews & Testimonials',
      eventTypes: ['review'],
      messageTemplates: {
        ecommerce: [
          '{name} left a {rating}-star review for {product}',
          '"{name} - Amazing product quality!"',
          '{name} rated {product} {rating}/5 stars'
        ],
        saas: [
          '{name} gave {product} {rating} stars',
          '"{name} - This platform changed our workflow!"',
          '{name} left a glowing review'
        ],
        services: [
          '{name} rated our {service} {rating}/5 stars',
          '"{name} - Excellent service and results!"',
          '{name} left a positive review'
        ],
        events: [
          '{name} rated {product} {rating}/5 stars',
          '"{name} - Best event I\'ve attended!"',
          '{name} left fantastic feedback'
        ],
        blog: [
          '{name} loved your article on {product}',
          '"{name} - Great insights, thank you!"',
          '{name} left positive feedback'
        ],
        marketing_agency: [
          '{name} rated our {service} {rating}/5 stars',
          '"{name} - ROI exceeded expectations!"',
          '{name} left an excellent review'
        ],
        ngo: [
          '{name} shared their volunteer experience',
          '"{name} - Proud to support this cause!"',
          '{name} left inspiring feedback'
        ],
        education: [
          '{name} rated {product} course {rating}/5 stars',
          '"{name} - Learned so much, highly recommend!"',
          '{name} left a testimonial'
        ]
      }
    }
  ];

  /**
   * Get notification type mapping by ID
   */
  static getNotificationTypeMapping(notificationTypeId: string): NotificationTypeMapping | null {
    return this.NOTIFICATION_TYPE_MAPPINGS.find(mapping => mapping.id === notificationTypeId) || null;
  }

  /**
   * Get event types for selected notification types
   */
  static getEventTypesForNotificationTypes(notificationTypeIds: string[]): string[] {
    const eventTypes = new Set<string>();
    
    notificationTypeIds.forEach(typeId => {
      const mapping = this.getNotificationTypeMapping(typeId);
      if (mapping) {
        mapping.eventTypes.forEach(eventType => eventTypes.add(eventType));
      }
    });
    
    return Array.from(eventTypes);
  }

  /**
   * Get appropriate message template for notification type and business type
   */
  static getMessageTemplate(
    notificationTypeId: string,
    businessType: string,
    data: any = {}
  ): string | null {
    const mapping = this.getNotificationTypeMapping(notificationTypeId);
    if (!mapping) return null;

    const templates = mapping.messageTemplates[businessType as keyof typeof mapping.messageTemplates];
    if (!templates || templates.length === 0) return null;

    // Simple template selection - in practice you might want more sophisticated logic
    const template = templates[0];
    
    // Replace placeholders with actual values
    return this.replacePlaceholders(template, data);
  }

  /**
   * Replace placeholders in template with data
   */
  private static replacePlaceholders(template: string, data: any): string {
    let result = template;
    
    // Replace common placeholders
    const placeholders = {
      '{name}': data.name || data.customer_name || 'Someone',
      '{location}': data.location || data.customer_location || 'Unknown',
      '{product}': data.product || data.product_name || 'our product',
      '{service}': data.service || data.service_name || 'our service',
      '{amount}': data.amount || '99',
      '{rating}': data.rating || '5',
      '{count}': data.count || Math.floor(Math.random() * 20) + 1,
      '{timeAgo}': data.timeAgo || 'just now'
    };

    Object.entries(placeholders).forEach(([placeholder, value]) => {
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value));
    });

    return result;
  }

  /**
   * Generate appropriate events for selected notification types
   */
  static generateEventsForNotificationTypes(
    notificationTypeIds: string[],
    businessType: string,
    widgetId: string,
    count: number = 5
  ): any[] {
    const events: any[] = [];
    
    notificationTypeIds.forEach(typeId => {
      const mapping = this.getNotificationTypeMapping(typeId);
      if (!mapping) return;

      // Generate events for each notification type
      const eventsPerType = Math.ceil(count / notificationTypeIds.length);
      
      for (let i = 0; i < eventsPerType && events.length < count; i++) {
        const eventType = mapping.eventTypes[i % mapping.eventTypes.length];
        const messageTemplate = this.getMessageTemplate(typeId, businessType, {
          name: this.getRandomName(),
          location: this.getRandomLocation(),
          product: this.getRandomProduct(businessType),
          service: this.getRandomService(businessType),
          amount: this.getRandomAmount(),
          rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
          count: Math.floor(Math.random() * 50) + 1
        });

        if (messageTemplate) {
          events.push({
            widget_id: widgetId,
            event_type: eventType,
            event_data: {
              message: messageTemplate,
              notification_type: typeId,
              demo: true
            },
            source: 'demo',
            status: 'approved',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          });
        }
      }
    });

    return events.slice(0, count);
  }

  private static getRandomName(): string {
    const names = ['John D.', 'Sarah M.', 'Alex K.', 'Emma L.', 'Mike R.',  'Lisa T.', 'David S.', 'Anna P.', 'Chris W.', 'Maria G.'];
    return names[Math.floor(Math.random() * names.length)];
  }

  private static getRandomLocation(): string {
    const locations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA'];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  private static getRandomProduct(businessType: string): string {
    const products = {
      ecommerce: ['Wireless Headphones', 'Smart Watch', 'Running Shoes', 'Coffee Maker', 'Laptop Bag'],
      saas: ['Pro Plan', 'Premium Subscription', 'Enterprise Package', 'Premium Features', 'Business Plan'],
      services: ['SEO Consultation', 'Web Design', 'Marketing Strategy', 'Brand Development', 'Content Creation'],
      events: ['Tech Conference 2024', 'Marketing Summit', 'Design Workshop', 'Business Networking', 'Leadership Training'],
      blog: ['Premium Content', 'Member Access', 'VIP Newsletter', 'Exclusive Guide', 'Insider Tips'],
      marketing_agency: ['Growth Package', 'Marketing Audit', 'Strategy Session', 'Campaign Management', 'Brand Package'],
      ngo: ['Clean Water Project', 'Education Fund', 'Community Support', 'Healthcare Initiative', 'Environmental Program'],
      education: ['JavaScript Course', 'Marketing Bootcamp', 'Design Fundamentals', 'Business Strategy', 'Leadership Program']
    };
    
    const typeProducts = products[businessType as keyof typeof products] || products.ecommerce;
    return typeProducts[Math.floor(Math.random() * typeProducts.length)];
  }

  private static getRandomService(businessType: string): string {
    const services = {
      ecommerce: ['Customer Support', 'Product Consultation', 'Express Delivery', 'Custom Design', 'Installation'],
      saas: ['Onboarding', 'Training Session', 'Custom Integration', 'Support Package', 'Consultation'],
      services: ['Consultation', 'Strategy Session', 'Implementation', 'Optimization', 'Support'],
      events: ['Event Planning', 'Venue Setup', 'Catering', 'Audio/Visual', 'Coordination'],
      blog: ['Content Strategy', 'SEO Optimization', 'Social Media', 'Email Marketing', 'Analytics'],
      marketing_agency: ['SEO', 'PPC Management', 'Social Media', 'Content Marketing', 'Brand Strategy'],
      ngo: ['Volunteer Training', 'Community Outreach', 'Fundraising', 'Awareness Campaign', 'Support Program'],
      education: ['Tutoring', 'Career Coaching', 'Skill Assessment', 'Learning Path', 'Certification']
    };
    
    const typeServices = services[businessType as keyof typeof services] || services.services;
    return typeServices[Math.floor(Math.random() * typeServices.length)];
  }

  private static getRandomAmount(): string {
    const amounts = ['29', '49', '99', '149', '199', '299', '499', '999'];
    return amounts[Math.floor(Math.random() * amounts.length)];
  }
}