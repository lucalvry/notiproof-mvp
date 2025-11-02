import { ReactNode } from "react";
import { IntegrationMetadata } from "./integrationMetadata";

export type AuthFlowType = 'oauth' | 'webhook' | 'api_key' | 'custom';

export interface IntegrationPlugin {
  id: string;
  metadata: IntegrationMetadata;
  authFlow: AuthFlowType;
  
  // OAuth specific methods
  getOAuthUrl?: (config: {
    websiteId: string;
    redirectUri?: string;
  }) => Promise<string>;
  
  handleOAuthCallback?: (code: string, state: string) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }>;
  
  // Webhook specific methods
  getWebhookUrl?: (websiteId: string) => string;
  
  validateWebhookSignature?: (
    payload: any,
    signature: string,
    secret: string
  ) => boolean;
  
  transformWebhookData?: (payload: any) => {
    event_type: string;
    message: string;
    user_name?: string;
    user_location?: string;
    custom_data?: any;
  };
  
  // API Key specific methods
  validateApiKey?: (apiKey: string) => Promise<boolean>;
  
  syncData?: (config: {
    apiKey: string;
    lastSync: Date;
  }) => Promise<Array<{
    event_type: string;
    message: string;
    timestamp: Date;
    custom_data?: any;
  }>>;
  
  // Common methods
  testConnection?: (config: any) => Promise<{
    success: boolean;
    message: string;
  }>;
  
  getSetupGuide?: () => ReactNode;
}

// Plugin Registry
const pluginRegistry = new Map<string, IntegrationPlugin>();

export function registerPlugin(plugin: IntegrationPlugin) {
  pluginRegistry.set(plugin.id, plugin);
}

export function getPlugin(integrationId: string): IntegrationPlugin | undefined {
  return pluginRegistry.get(integrationId);
}

export function getAllPlugins(): IntegrationPlugin[] {
  return Array.from(pluginRegistry.values());
}

// Helper to get auth flow type from integration metadata
export function getAuthFlowType(integration: any): AuthFlowType {
  const metadata = integration.metadata || integration;
  
  if (metadata.requiresOauth || metadata.connectorType === 'oauth') {
    return 'oauth';
  }
  
  if (metadata.connectorType === 'webhook' || metadata.connectorType === 'zapier_proxy') {
    return 'webhook';
  }
  
  if (metadata.connectorType === 'api_key') {
    return 'api_key';
  }
  
  return 'webhook'; // Default fallback
}
