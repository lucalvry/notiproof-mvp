import { BaseAdapter } from '../BaseAdapter';
import { CanonicalEvent, NormalizedField } from '../types';

export class StripeAdapter extends BaseAdapter {
  provider = 'stripe';
  displayName = 'Stripe';
  
  availableFields(): NormalizedField[] {
    return [
      {
        key: 'template.customer_name',
        label: 'Customer Name',
        type: 'string',
        description: 'Name of the customer',
        example: 'John Davis',
        required: true,
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
        description: 'Customer location',
        example: 'London, UK',
      },
      {
        key: 'template.amount',
        label: 'Payment Amount',
        type: 'currency',
        description: 'Payment amount with currency',
        example: '$49.99',
        required: true,
      },
      {
        key: 'template.currency',
        label: 'Currency',
        type: 'string',
        description: 'Payment currency code',
        example: 'USD',
      },
      {
        key: 'template.payment_id',
        label: 'Payment ID',
        type: 'string',
        description: 'Stripe payment intent ID',
        example: 'pi_1234567890',
      },
      {
        key: 'template.plan_name',
        label: 'Plan Name',
        type: 'string',
        description: 'Subscription plan name',
        example: 'Pro Plan',
      },
      {
        key: 'template.subscription_id',
        label: 'Subscription ID',
        type: 'string',
        description: 'Stripe subscription ID',
        example: 'sub_1234567890',
      },
      {
        key: 'template.time_ago',
        label: 'Time Ago',
        type: 'string',
        description: 'Relative time',
        example: '2 minutes ago',
      },
    ];
  }
  
  normalize(rawEvent: any): CanonicalEvent {
    const payment = rawEvent.payment || rawEvent.data?.object || rawEvent;
    
    // Extract customer info
    const customerName = payment.customer_name || 
                         payment.billing_details?.name || 
                         payment.customer_details?.name || 
                         'Someone';
    const customerEmail = payment.customer_email || 
                          payment.billing_details?.email || 
                          payment.customer_details?.email;
    const customerLocation = payment.customer_location || 
                            payment.billing_details?.address?.city || 
                            payment.billing_details?.address?.country;
    
    // Extract payment info
    const amount = payment.amount ? `${(payment.amount / 100).toFixed(2)}` : '0.00';
    const currency = (payment.currency || 'USD').toUpperCase();
    const formattedAmount = `${this.getCurrencySymbol(currency)}${amount}`;
    
    // Calculate time ago
    const timestamp = payment.created ? new Date(payment.created * 1000).toISOString() : new Date().toISOString();
    const timeAgo = this.getRelativeTime(timestamp);
    
    return {
      event_id: this.generateEventId('stripe'),
      provider: 'stripe',
      provider_event_type: rawEvent.type || 'payment_intent.succeeded',
      timestamp,
      payload: rawEvent,
      normalized: {
        'template.customer_name': customerName,
        'template.customer_email': customerEmail,
        'template.customer_location': customerLocation,
        'template.amount': formattedAmount,
        'template.currency': currency,
        'template.payment_id': payment.id || payment.payment_intent,
        'template.plan_name': payment.plan?.nickname || payment.price?.nickname,
        'template.subscription_id': payment.subscription,
        'template.time_ago': timeAgo,
        'meta.status': payment.status,
        'meta.payment_method': payment.payment_method_types?.[0] || payment.payment_method?.type,
      },
    };
  }
  
  getSampleEvents(): CanonicalEvent[] {
    return [
      {
        event_id: 'stripe_sample_1',
        provider: 'stripe',
        provider_event_type: 'payment_intent.succeeded',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.customer_name': 'John Davis',
          'template.customer_location': 'London, UK',
          'template.amount': '$49.99',
          'template.currency': 'USD',
          'template.payment_id': 'pi_1234567890',
          'template.plan_name': 'Pro Plan',
          'template.time_ago': '2 minutes ago',
        },
      },
      {
        event_id: 'stripe_sample_2',
        provider: 'stripe',
        provider_event_type: 'payment_intent.succeeded',
        timestamp: new Date().toISOString(),
        payload: {},
        normalized: {
          'template.customer_name': 'Sarah Johnson',
          'template.customer_location': 'New York, NY',
          'template.amount': '$99.00',
          'template.currency': 'USD',
          'template.payment_id': 'pi_0987654321',
          'template.plan_name': 'Enterprise Plan',
          'template.time_ago': '5 minutes ago',
        },
      },
    ];
  }
  
  private getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      NGN: '₦',
    };
    return symbols[currency] || currency + ' ';
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
