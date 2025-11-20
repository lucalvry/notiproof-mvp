import { IntegrationAdapter, CanonicalEvent, ConnectionResult, TestResult, NormalizedField } from './types';

/**
 * Base adapter class with common functionality
 */
export abstract class BaseAdapter implements IntegrationAdapter {
  abstract provider: string;
  abstract displayName: string;
  
  /**
   * Default connection implementation - override if needed
   */
  async connect(credentials: Record<string, any>): Promise<ConnectionResult> {
    return {
      success: true,
      credentials,
    };
  }
  
  /**
   * Default test connection - override for actual testing
   */
  async testConnection(credentials: Record<string, any>): Promise<TestResult> {
    return {
      success: true,
      message: 'Connection active',
    };
  }
  
  /**
   * Default event validation - override for webhook signature validation
   */
  validateEvent(rawEvent: any, signature?: string, secret?: string): boolean {
    return rawEvent && typeof rawEvent === 'object';
  }
  
  /**
   * Generate unique event ID
   */
  protected generateEventId(prefix: string = 'evt'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Must implement: list available normalized fields
   */
  abstract availableFields(): NormalizedField[];
  
  /**
   * Must implement: normalize raw event to canonical shape
   */
  abstract normalize(rawEvent: any): CanonicalEvent;
  
  /**
   * Must implement: provide sample events
   */
  abstract getSampleEvents(): CanonicalEvent[];
}
