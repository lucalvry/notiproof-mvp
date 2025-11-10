export interface NormalizedEvent {
  id: string;
  source: string; // Integration type
  event_type: string;
  timestamp: Date;
  
  // Core fields
  message: string;
  user_name?: string;
  user_email?: string;
  user_location?: string;
  user_avatar?: string;
  
  // Flexible metadata
  metadata: Record<string, any>;
  
  // Image handling
  image_url?: string;
  
  // Tracking
  external_id?: string; // ID from source system
  raw_data: any; // Original payload
}

export interface FetchOptions {
  limit?: number;
  since?: Date;
  until?: Date;
  event_types?: string[];
}

export interface ConnectorResponse {
  success: boolean;
  connector_id?: string;
  config?: any;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  events_synced: number;
  events_skipped: number;
  errors: string[];
  last_sync_at: Date;
}

export interface IntegrationAdapter {
  // Metadata
  id: string;
  displayName: string;
  type: 'native' | 'external' | 'manual';
  
  // Connection (only for external)
  connect?(websiteId: string, userId: string): Promise<ConnectorResponse>;
  testConnection?(connectorId: string): Promise<{ success: boolean; message: string }>;
  
  // Event Management
  fetchEvents(connectorId: string, options?: FetchOptions): Promise<NormalizedEvent[]>;
  normalizeEvent(rawEvent: any): NormalizedEvent;
  
  // Template Support
  getTemplateFields(): string[];
  getSampleEvent(): NormalizedEvent;
  
  // Sync Configuration
  getSyncConfig(): {
    supportsWebhook: boolean;
    supportsPolling: boolean;
    defaultInterval: number; // minutes
    maxEventsPerSync: number;
  };
}
