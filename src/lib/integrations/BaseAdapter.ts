import { IntegrationAdapter, NormalizedEvent, FetchOptions } from './IntegrationAdapter';

export abstract class BaseIntegrationAdapter implements IntegrationAdapter {
  abstract id: string;
  abstract displayName: string;
  abstract type: 'native' | 'external' | 'manual';
  
  // Default implementations
  async testConnection(connectorId: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Connection active' };
  }
  
  getSyncConfig() {
    return {
      supportsWebhook: false,
      supportsPolling: true,
      defaultInterval: 60, // 1 hour
      maxEventsPerSync: 100,
    };
  }
  
  // Must implement
  abstract fetchEvents(connectorId: string, options?: FetchOptions): Promise<NormalizedEvent[]>;
  abstract normalizeEvent(rawEvent: any): NormalizedEvent;
  abstract getTemplateFields(): string[];
  abstract getSampleEvent(): NormalizedEvent;
}
