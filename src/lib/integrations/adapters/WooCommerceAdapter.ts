import { BaseAdapter } from '../BaseAdapter';
import { CanonicalEvent, NormalizedField } from '../types';

// Default WooCommerce template - simple text (widget.js handles styling)
const DEFAULT_WOOCOMMERCE_TEMPLATE = `{{template.customer_name}} purchased {{template.product_name}}`;

export class WooCommerceAdapter extends BaseAdapter {
  provider = 'woocommerce';
  displayName = 'WooCommerce';
  
  availableFields(): NormalizedField[] {
    return [
      {
        key: 'template.customer_name',
        label: 'Customer Name',
        type: 'string',
        description: 'Customer full name',
        example: 'Jane Smith',
        required: true,
      },
      {
        key: 'template.customer_email',
        label: 'Customer Email',
        type: 'string',
        description: 'Customer email address',
        example: 'jane@example.com',
      },
      {
        key: 'template.customer_location',
        label: 'Customer Location',
        type: 'string',
        description: 'Customer city/country',
        example: 'Lagos, Nigeria',
      },
      {
        key: 'template.product_name',
        label: 'Product Name',
        type: 'string',
        description: 'Name of purchased product',
        example: 'Premium Sneakers',
        required: true,
      },
      {
        key: 'template.product_image',
        label: 'Product Image',
        type: 'image',
        description: 'Product image URL',
        example: 'https://example.com/product.jpg',
      },
      {
        key: 'template.product_price',
        label: 'Product Price',
        type: 'currency',
        description: 'Product price',
        example: '$129.99',
      },
      {
        key: 'template.order_total',
        label: 'Order Total',
        type: 'currency',
        description: 'Total order amount',
        example: '$149.99',
        required: true,
      },
      {
        key: 'template.order_id',
        label: 'Order ID',
        type: 'string',
        description: 'WooCommerce order number',
        example: '#12345',
      },
      {
        key: 'template.quantity',
        label: 'Quantity',
        type: 'number',
        description: 'Number of items purchased',
        example: 2,
      },
      {
        key: 'template.time_ago',
        label: 'Time Ago',
        type: 'string',
        description: 'Relative time',
        example: '10 minutes ago',
      },
    ];
  }
  
  /**
   * Get the default template HTML for WooCommerce events
   */
  getDefaultTemplateHtml(): string {
    return DEFAULT_WOOCOMMERCE_TEMPLATE;
  }
  
  /**
   * Render event data with a template
   */
  renderWithTemplate(templateHtml: string, data: Record<string, any>): string {
    let rendered = templateHtml;
    
    // Handle section blocks {{#key}}...{{/key}} (show if truthy)
    rendered = rendered.replace(/\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      const value = data[key.trim()];
      return (value !== undefined && value !== null && value !== '' && value !== false) ? content : '';
    });
    
    // Handle inverted blocks {{^key}}...{{/key}} (show if falsy)
    rendered = rendered.replace(/\{\{\^([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      const value = data[key.trim()];
      return (value === undefined || value === null || value === '' || value === false) ? content : '';
    });
    
    // Handle simple substitutions {{key}}
    rendered = rendered.replace(/\{\{([^#^/][^}]*)\}\}/g, (match, key) => {
      const value = data[key.trim()];
      return value !== undefined && value !== null ? String(value) : '';
    });
    
    return rendered;
  }
  
  normalize(rawEvent: any): CanonicalEvent {
    const order = rawEvent.order || rawEvent;
    
    // Extract customer info
    const billing = order.billing || {};
    const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Someone';
    const customerLocation = [billing.city, billing.country].filter(Boolean).join(', ');
    
    // Extract product info (first line item)
    const lineItems = order.line_items || [];
    const firstItem = lineItems[0] || {};
    const productName = firstItem.name || 'a product';
    const productImage = firstItem.image?.src || order.product_image;
    
    // Calculate total quantity
    const totalQuantity = lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    
    // Format prices
    const currency = order.currency || 'USD';
    const orderTotal = this.formatCurrency(parseFloat(order.total || 0), currency);
    const productPrice = this.formatCurrency(parseFloat(firstItem.price || 0), currency);
    
    // Calculate time ago
    const timestamp = order.date_created || new Date().toISOString();
    const timeAgo = this.getRelativeTime(timestamp);
    
    const normalized = {
      'template.customer_name': customerName,
      'template.customer_email': billing.email,
      'template.customer_location': customerLocation || 'your store',
      'template.product_name': productName,
      'template.product_image': productImage,
      'template.product_price': productPrice,
      'template.order_total': orderTotal,
      'template.order_id': `#${order.id || order.number}`,
      'template.quantity': totalQuantity,
      'template.time_ago': timeAgo,
      'meta.status': order.status,
      'meta.payment_method': order.payment_method_title,
      'meta.currency': currency,
    };
    
    return {
      event_id: this.generateEventId('woocommerce'),
      provider: 'woocommerce',
      provider_event_type: order.status === 'completed' ? 'order.completed' : 'order.created',
      timestamp,
      payload: rawEvent,
      normalized,
    };
  }
  
  /**
   * Normalize and render - returns both normalized data and rendered HTML
   */
  normalizeAndRender(rawEvent: any, templateHtml?: string): { 
    canonical: CanonicalEvent; 
    renderedHtml: string;
  } {
    const canonical = this.normalize(rawEvent);
    const template = templateHtml || this.getDefaultTemplateHtml();
    const renderedHtml = this.renderWithTemplate(template, canonical.normalized);
    
    return {
      canonical,
      renderedHtml,
    };
  }
  
  getSampleEvents(): CanonicalEvent[] {
    return [
      {
        event_id: 'woo_sample_1',
        provider: 'woocommerce',
        provider_event_type: 'order.completed',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.customer_name': 'Jane Smith',
          'template.customer_location': 'Lagos, Nigeria',
          'template.product_name': 'Premium Sneakers',
          'template.product_image': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
          'template.product_price': '₦45,000',
          'template.order_total': '₦45,000',
          'template.order_id': '#12345',
          'template.quantity': 1,
          'template.time_ago': '5 minutes ago',
        },
      },
      {
        event_id: 'woo_sample_2',
        provider: 'woocommerce',
        provider_event_type: 'order.completed',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.customer_name': 'Michael Brown',
          'template.customer_location': 'Abuja, Nigeria',
          'template.product_name': 'Designer Watch',
          'template.product_image': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
          'template.product_price': '₦120,000',
          'template.order_total': '₦240,000',
          'template.order_id': '#12346',
          'template.quantity': 2,
          'template.time_ago': '15 minutes ago',
        },
      },
    ];
  }
  
  private formatCurrency(amount: number, currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      NGN: '₦',
      GHS: 'GH₵',
      KES: 'KSh',
      ZAR: 'R',
    };
    
    const symbol = symbols[currency] || currency + ' ';
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return `${symbol}${formatted}`;
  }
  
  private getRelativeTime(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return then.toLocaleDateString();
  }
}
