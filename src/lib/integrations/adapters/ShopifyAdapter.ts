import { BaseAdapter } from '../BaseAdapter';
import { CanonicalEvent, NormalizedField } from '../types';

export class ShopifyAdapter extends BaseAdapter {
  provider = 'shopify';
  displayName = 'Shopify';
  
  availableFields(): NormalizedField[] {
    return [
      {
        key: 'template.customer_name',
        label: 'Customer Name',
        type: 'string',
        description: 'Customer full name',
        example: 'John Doe',
      },
      {
        key: 'template.customer_email',
        label: 'Customer Email',
        type: 'string',
        description: 'Customer email address',
        example: 'john@example.com',
      },
      {
        key: 'template.customer_location',
        label: 'Customer Location',
        type: 'string',
        description: 'Customer city and country',
        example: 'New York, USA',
      },
      {
        key: 'template.product_name',
        label: 'Product Name',
        type: 'string',
        description: 'Product title',
        example: 'Classic Sneakers',
        required: true,
      },
      {
        key: 'template.product_image',
        label: 'Product Image',
        type: 'image',
        description: 'Product image URL',
        example: 'https://cdn.shopify.com/...',
      },
      {
        key: 'template.price',
        label: 'Price',
        type: 'currency',
        description: 'Product price',
        example: 49.99,
        required: true,
      },
      {
        key: 'template.currency',
        label: 'Currency',
        type: 'string',
        description: 'Currency code',
        example: 'USD',
      },
      {
        key: 'template.order_id',
        label: 'Order ID',
        type: 'string',
        description: 'Order number',
        example: '#1234',
      },
      {
        key: 'template.time_ago',
        label: 'Time Ago',
        type: 'string',
        description: 'Relative time',
        example: '5 minutes ago',
      },
    ];
  }
  
  normalize(rawEvent: any): CanonicalEvent {
    const isOrder = rawEvent.topic === 'orders/create' || rawEvent.event_type === 'order_created';
    const order = rawEvent.order || rawEvent;
    
    // Extract customer info
    const customer = order.customer || {};
    const customerName = customer.first_name && customer.last_name 
      ? `${customer.first_name} ${customer.last_name}`
      : customer.email?.split('@')[0] || 'Someone';
    
    // Extract location
    const shippingAddress = order.shipping_address || {};
    const customerLocation = shippingAddress.city && shippingAddress.country
      ? `${shippingAddress.city}, ${shippingAddress.country}`
      : shippingAddress.country || undefined;
    
    // Extract first product
    const lineItems = order.line_items || [];
    const firstProduct = lineItems[0] || {};
    
    // Calculate relative time
    const createdAt = order.created_at || new Date().toISOString();
    const timeAgo = this.getRelativeTime(createdAt);
    
    return {
      event_id: this.generateEventId('shopify'),
      provider: 'shopify',
      provider_event_type: rawEvent.topic || 'order_created',
      timestamp: createdAt,
      payload: rawEvent,
      normalized: {
        'template.customer_name': customerName,
        'template.customer_email': customer.email,
        'template.customer_location': customerLocation,
        'template.product_name': firstProduct.title || firstProduct.name,
        'template.product_image': firstProduct.image?.src || firstProduct.featured_image,
        'template.price': parseFloat(firstProduct.price || '0'),
        'template.currency': order.currency || 'USD',
        'template.order_id': `#${order.order_number || order.id}`,
        'template.time_ago': timeAgo,
        'meta.total_items': lineItems.length,
        'meta.total_price': parseFloat(order.total_price || '0'),
      },
    };
  }
  
  getSampleEvents(): CanonicalEvent[] {
    return [
      {
        event_id: 'shopify_sample_1',
        provider: 'shopify',
        provider_event_type: 'order_created',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.customer_name': 'Sarah Johnson',
          'template.customer_email': 'sarah@example.com',
          'template.customer_location': 'Los Angeles, USA',
          'template.product_name': 'Premium Wireless Headphones',
          'template.product_image': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
          'template.price': 199.99,
          'template.currency': 'USD',
          'template.order_id': '#10234',
          'template.time_ago': '2 minutes ago',
        },
      },
      {
        event_id: 'shopify_sample_2',
        provider: 'shopify',
        provider_event_type: 'order_created',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.customer_name': 'Michael Chen',
          'template.customer_location': 'Toronto, Canada',
          'template.product_name': 'Organic Cotton T-Shirt',
          'template.product_image': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
          'template.price': 29.99,
          'template.currency': 'CAD',
          'template.order_id': '#10235',
          'template.time_ago': '5 minutes ago',
        },
      },
    ];
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
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}
