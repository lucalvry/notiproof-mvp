import { NotificationTypeService } from './notificationTypeService';

interface MessageData {
  name?: string;
  location?: string;
  product?: string;
  amount?: number;
  service?: string;
  category?: string;
  rating?: number;
  timeAgo?: string;
  count?: number;
}

interface MessageContext {
  businessType: 'saas' | 'ecommerce' | 'services' | 'events' | 'blog' | 'marketing_agency' | 'ngo' | 'education';
  eventType: 'purchase' | 'signup' | 'review' | 'download' | 'subscription' | 'booking' | 'contact' | 'view' | 'conversion' | 'visitor';
  data: MessageData;
  fallbackLevel?: 'full' | 'partial' | 'minimal';
}

interface MessageTemplate {
  template: string;
  variables: string[];
  requiredData: (keyof MessageData)[];
  fallbacks: string[];
}

export class MessageGenerationService {
  // Industry-specific message templates
  private static readonly MESSAGE_TEMPLATES: Record<string, Record<string, MessageTemplate[]>> = {
    saas: {
      signup: [
        {
          template: "{name} from {location} just started their free trial of {product}",
          variables: ['name', 'location', 'product'],
          requiredData: ['name', 'location', 'product'],
          fallbacks: [
            "Someone from {location} just started a free trial of {product}",
            "A new user from {location} signed up",
            "Someone just started their free trial"
          ]
        },
        {
          template: "{name} just activated their {product} account",
          variables: ['name', 'product'],
          requiredData: ['name', 'product'],
          fallbacks: [
            "Someone just activated their {product} account",
            "A new user just signed up",
            "Someone joined the platform"
          ]
        }
      ],
      subscription: [
        {
          template: "{name} from {location} upgraded to {product} plan",
          variables: ['name', 'location', 'product'],
          requiredData: ['name', 'location', 'product'],
          fallbacks: [
            "Someone from {location} upgraded to {product}",
            "A customer from {location} upgraded their plan",
            "Someone just upgraded their subscription"
          ]
        }
      ],
      conversion: [
        {
          template: "{name} just booked a demo call",
          variables: ['name'],
          requiredData: ['name'],
          fallbacks: [
            "Someone just booked a demo call",
            "A prospect scheduled a consultation",
            "New demo request received"
          ]
        }
      ]
    },
    ecommerce: {
      purchase: [
        {
          template: "{name} from {location} just bought {product} for ${amount}",
          variables: ['name', 'location', 'product', 'amount'],
          requiredData: ['name', 'location', 'product', 'amount'],
          fallbacks: [
            "Someone from {location} just bought {product}",
            "{name} just made a purchase",
            "Someone just completed their order"
          ]
        },
        {
          template: "{name} purchased {count} items worth ${amount}",
          variables: ['name', 'count', 'amount'],
          requiredData: ['name', 'count', 'amount'],
          fallbacks: [
            "Someone purchased {count} items",
            "A customer just made a purchase",
            "New order received"
          ]
        }
      ],
      view: [
        {
          template: "{count} people are viewing {product} right now",
          variables: ['count', 'product'],
          requiredData: ['count', 'product'],
          fallbacks: [
            "{count} people are shopping right now",
            "High activity on your store",
            "Customers are browsing your products"
          ]
        }
      ],
      review: [
        {
          template: "{name} left a {rating}-star review for {product}",
          variables: ['name', 'rating', 'product'],
          requiredData: ['name', 'rating', 'product'],
          fallbacks: [
            "Someone left a {rating}-star review",
            "New customer review received",
            "A customer shared their feedback"
          ]
        }
      ]
    },
    services: {
      booking: [
        {
          template: "{name} from {location} booked {service}",
          variables: ['name', 'location', 'service'],
          requiredData: ['name', 'location', 'service'],
          fallbacks: [
            "Someone from {location} booked a service",
            "{name} scheduled an appointment",
            "New booking received"
          ]
        }
      ],
      contact: [
        {
          template: "{name} from {location} requested a quote for {service}",
          variables: ['name', 'location', 'service'],
          requiredData: ['name', 'location', 'service'],
          fallbacks: [
            "Someone requested a quote for {service}",
            "New inquiry from {location}",
            "A potential client reached out"
          ]
        }
      ],
      conversion: [
        {
          template: "{name} just scheduled a consultation call",
          variables: ['name'],
          requiredData: ['name'],
          fallbacks: [
            "Someone scheduled a consultation",
            "New consultation request",
            "A prospect wants to connect"
          ]
        }
      ]
    },
    events: {
      signup: [
        {
          template: "{name} from {location} registered for {product}",
          variables: ['name', 'location', 'product'],
          requiredData: ['name', 'location', 'product'],
          fallbacks: [
            "Someone from {location} registered for the event",
            "{name} just signed up",
            "New registration received"
          ]
        }
      ],
      purchase: [
        {
          template: "{name} bought a ticket to {product}",
          variables: ['name', 'product'],
          requiredData: ['name', 'product'],
          fallbacks: [
            "Someone bought a ticket to {product}",
            "New ticket purchase",
            "Someone joined the event"
          ]
        }
      ]
    },
    blog: {
      view: [
        {
          template: "{count} people are reading this article right now",
          variables: ['count'],
          requiredData: ['count'],
          fallbacks: [
            "Someone is reading your content",
            "Your article is getting attention",
            "New reader engagement"
          ]
        }
      ],
      subscription: [
        {
          template: "{name} from {location} subscribed to your newsletter",
          variables: ['name', 'location'],
          requiredData: ['name', 'location'],
          fallbacks: [
            "Someone from {location} subscribed",
            "New newsletter subscriber",
            "Someone joined your mailing list"
          ]
        }
      ]
    },
    marketing_agency: {
      contact: [
        {
          template: "{name} from {location} requested a {service} strategy consultation",
          variables: ['name', 'location', 'service'],
          requiredData: ['name', 'location', 'service'],
          fallbacks: [
            "Someone requested a strategy consultation",
            "New business inquiry from {location}",
            "A potential client reached out"
          ]
        }
      ],
      download: [
        {
          template: "{name} downloaded your {product} guide",
          variables: ['name', 'product'],
          requiredData: ['name', 'product'],
          fallbacks: [
            "Someone downloaded your guide",
            "New resource download",
            "Content engagement detected"
          ]
        }
      ]
    },
    ngo: {
      conversion: [
        {
          template: "{name} from {location} donated ${amount} to support {service}",
          variables: ['name', 'location', 'amount', 'service'],
          requiredData: ['name', 'location', 'amount', 'service'],
          fallbacks: [
            "Someone from {location} made a donation",
            "{name} supported your cause",
            "New donation received"
          ]
        }
      ],
      signup: [
        {
          template: "{name} volunteered for {service}",
          variables: ['name', 'service'],
          requiredData: ['name', 'service'],
          fallbacks: [
            "Someone volunteered to help",
            "New volunteer registered",
            "Someone joined your mission"
          ]
        }
      ]
    },
    education: {
      signup: [
        {
          template: "{name} enrolled in {product}",
          variables: ['name', 'product'],
          requiredData: ['name', 'product'],
          fallbacks: [
            "Someone enrolled in {product}",
            "New student registration",
            "Someone started learning"
          ]
        }
      ],
      booking: [
        {
          template: "{name} scheduled a {service} session",
          variables: ['name', 'service'],
          requiredData: ['name', 'service'],
          fallbacks: [
            "Someone scheduled a session",
            "New appointment booked",
            "A student reached out"
          ]
        }
      ]
    }
  };

  // Generic fallback messages for any business type
  private static readonly GENERIC_FALLBACKS: Record<string, string[]> = {
    purchase: [
      "Someone just made a purchase",
      "New order completed",
      "A customer bought something"
    ],
    signup: [
      "Someone just signed up",
      "New user registration",
      "Someone joined"
    ],
    review: [
      "New customer review",
      "Someone shared feedback",
      "Customer testimonial received"
    ],
    download: [
      "Someone downloaded content",
      "New resource download",
      "Content engagement"
    ],
    subscription: [
      "Someone subscribed",
      "New subscription",
      "Someone upgraded"
    ],
    booking: [
      "New appointment booked",
      "Someone scheduled a meeting",
      "Booking received"
    ],
    contact: [
      "Someone reached out",
      "New inquiry received",
      "Contact form submitted"
    ],
    view: [
      "Someone is browsing",
      "Active visitor detected",
      "Content being viewed"
    ],
    conversion: [
      "Someone converted",
      "New lead generated",
      "Action completed"
    ],
    visitor: [
      "Someone visited",
      "New visitor activity",
      "Site engagement"
    ]
  };

  /**
   * Generate a smart message based on context and available data
   */
  static generateMessage(context: MessageContext, notificationTypeId?: string): string {
    const { businessType, eventType, data } = context;
    
    // If notification type is provided, use notification-specific template
    if (notificationTypeId) {
      const notificationMessage = NotificationTypeService.getMessageTemplate(
        notificationTypeId, 
        businessType, 
        data
      );
      if (notificationMessage) {
        return notificationMessage;
      }
    }
    
    // Get templates for this business type and event type
    const businessTemplates = this.MESSAGE_TEMPLATES[businessType];
    const eventTemplates = businessTemplates?.[eventType] || [];
    
    // Find the best matching template
    const template = this.findBestTemplate(eventTemplates, data);
    
    if (template) {
      return this.processTemplate(template, data);
    }
    
    // Fall back to generic messages
    return this.generateGenericMessage(eventType, data);
  }

  /**
   * Find the best template based on available data
   */
  private static findBestTemplate(templates: MessageTemplate[], data: MessageData): MessageTemplate | null {
    if (!templates.length) return null;
    
    // Sort templates by how much required data they need (prefer more specific)
    const sortedTemplates = templates.sort((a, b) => b.requiredData.length - a.requiredData.length);
    
    // Find first template where we have all required data
    for (const template of sortedTemplates) {
      const hasAllData = template.requiredData.every(key => 
        data[key] !== undefined && data[key] !== null && data[key] !== ''
      );
      
      if (hasAllData) {
        return template;
      }
    }
    
    // If no perfect match, return template with most available data
    let bestTemplate = sortedTemplates[0];
    let bestScore = 0;
    
    for (const template of sortedTemplates) {
      const availableData = template.requiredData.filter(key => 
        data[key] !== undefined && data[key] !== null && data[key] !== ''
      );
      const score = availableData.length / template.requiredData.length;
      
      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
      }
    }
    
    return bestTemplate;
  }

  /**
   * Process template with fallback logic
   */
  private static processTemplate(template: MessageTemplate, data: MessageData): string {
    // Check if we have all required data
    const missingData = template.requiredData.filter(key => 
      data[key] === undefined || data[key] === null || data[key] === ''
    );
    
    if (missingData.length === 0) {
      // Use main template
      return this.replaceVariables(template.template, data);
    }
    
    // Use fallback templates
    for (const fallback of template.fallbacks) {
      const fallbackVariables = this.extractVariables(fallback);
      const hasFallbackData = fallbackVariables.every(variable => 
        data[variable] !== undefined && data[variable] !== null && data[variable] !== ''
      );
      
      if (hasFallbackData) {
        return this.replaceVariables(fallback, data);
      }
    }
    
    // If no fallback works, use the last (most generic) fallback
    const lastFallback = template.fallbacks[template.fallbacks.length - 1];
    return this.replaceVariables(lastFallback, data);
  }

  /**
   * Generate generic message when no specific template exists
   */
  private static generateGenericMessage(eventType: string, data: MessageData): string {
    const genericMessages = this.GENERIC_FALLBACKS[eventType] || [
      "Someone just took action",
      "New activity detected",
      "User engagement"
    ];
    
    // Try to add location if available
    if (data.location) {
      return `Someone from ${data.location} ${genericMessages[0].toLowerCase()}`;
    }
    
    // Try to add name if available
    if (data.name) {
      return `${data.name} ${genericMessages[0].toLowerCase()}`;
    }
    
    // Use basic generic message
    return genericMessages[0];
  }

  /**
   * Replace variables in template string
   */
  private static replaceVariables(template: string, data: MessageData): string {
    let result = template;
    
    // Replace all variables in format {variable}
    const variables = this.extractVariables(template);
    
    for (const variable of variables) {
      const value = data[variable];
      if (value !== undefined && value !== null) {
        const placeholder = `{${variable}}`;
        result = result.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }
    
    return result;
  }

  /**
   * Extract variable names from template string
   */
  private static extractVariables(template: string): string[] {
    const matches = template.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    
    return matches.map(match => match.slice(1, -1));
  }

  /**
   * Generate multiple message variations
   */
  static generateVariations(context: MessageContext, count: number = 3): string[] {
    const { businessType, eventType } = context;
    const variations: string[] = [];
    
    // Get all templates for this context
    const businessTemplates = this.MESSAGE_TEMPLATES[businessType];
    const eventTemplates = businessTemplates?.[eventType] || [];
    
    // Generate from templates
    for (const template of eventTemplates.slice(0, count)) {
      const message = this.processTemplate(template, context.data);
      if (message && !variations.includes(message)) {
        variations.push(message);
      }
    }
    
    // Fill remaining with generic messages
    const genericMessages = this.GENERIC_FALLBACKS[eventType] || [];
    for (const generic of genericMessages) {
      if (variations.length >= count) break;
      
      const processedGeneric = this.replaceVariables(generic, context.data);
      if (!variations.includes(processedGeneric)) {
        variations.push(processedGeneric);
      }
    }
    
    return variations.slice(0, count);
  }

  /**
   * Validate message data for specific business type and event type
   */
  static validateMessageData(businessType: string, eventType: string, data: MessageData): {
    isValid: boolean;
    missingRequired: string[];
    suggestions: string[];
  } {
    const templates = this.MESSAGE_TEMPLATES[businessType]?.[eventType] || [];
    if (!templates.length) {
      return {
        isValid: true,
        missingRequired: [],
        suggestions: ['Consider adding name or location for better personalization']
      };
    }
    
    const bestTemplate = this.findBestTemplate(templates, data);
    if (!bestTemplate) {
      return {
        isValid: false,
        missingRequired: ['name', 'location'],
        suggestions: ['Add customer name and location for personalized messages']
      };
    }
    
    const missing = bestTemplate.requiredData.filter(key => 
      data[key] === undefined || data[key] === null || data[key] === ''
    );
    
    const suggestions: string[] = [];
    if (missing.includes('name')) suggestions.push('Add customer name for personalization');
    if (missing.includes('location')) suggestions.push('Add customer location for social proof');
    if (missing.includes('product')) suggestions.push('Specify product/service name');
    if (missing.includes('amount')) suggestions.push('Include transaction amount');
    
    return {
      isValid: missing.length === 0,
      missingRequired: missing,
      suggestions: suggestions.length ? suggestions : ['Message data looks good!']
    };
  }

  /**
   * Get recommended fields for a business type and event type
   */
  static getRecommendedFields(businessType: string, eventType: string): {
    required: string[];
    optional: string[];
    examples: Record<string, string>;
  } {
    const templates = this.MESSAGE_TEMPLATES[businessType]?.[eventType] || [];
    const allFields = new Set<string>();
    const requiredFields = new Set<string>();
    
    templates.forEach(template => {
      template.requiredData.forEach(field => {
        allFields.add(field);
        requiredFields.add(field);
      });
      template.variables.forEach(field => allFields.add(field));
    });
    
    const examples: Record<string, string> = {
      name: 'John D., Sarah M., Alex',
      location: 'New York, NY, San Francisco, CA',
      product: 'Pro Plan, Premium Course, Marketing Guide',
      amount: '99.99, 299, 1500',
      service: 'SEO Consultation, Web Design, Marketing Strategy',
      category: 'Software, Education, Marketing',
      rating: '5, 4, 3',
      count: '5, 12, 50'
    };
    
    const required = Array.from(requiredFields);
    const optional = Array.from(allFields).filter(f => !requiredFields.has(f));
    
    return { required, optional, examples };
  }
}