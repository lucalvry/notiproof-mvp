import { adapterRegistry } from './AdapterRegistry';
import { supabase } from '@/integrations/supabase/client';
import { SyncResult } from './IntegrationAdapter';

export class EventSyncService {
  /**
   * Manual sync triggered by user
   */
  async syncNow(connectorId: string, integrationId: string): Promise<SyncResult> {
    const adapter = adapterRegistry.get(integrationId);
    
    if (!adapter) {
      throw new Error(`No adapter found for ${integrationId}`);
    }
    
    const startTime = Date.now();
    
    try {
      // Get connector to find last_sync
      const { data: connector } = await supabase
        .from('integration_connectors')
        .select('last_sync, config')
        .eq('id', connectorId)
        .single();
      
      const lastSync = connector?.last_sync ? new Date(connector.last_sync) : undefined;
      
      // Fetch new events
      const events = await adapter.fetchEvents(connectorId, {
        since: lastSync,
        limit: adapter.getSyncConfig().maxEventsPerSync,
      });
      
      // Insert normalized events (skip duplicates)
      const { data: inserted, error } = await supabase
        .from('events')
        .upsert(
          events.map(e => ({
            widget_id: connectorId, // Using connector_id as widget_id for now
            integration_type: integrationId as any,
            source: 'connector' as any,
            event_type: e.event_type,
            event_data: e.metadata,
            message_template: e.message,
            user_name: e.user_name,
            user_email: e.user_email,
            user_location: e.user_location,
            external_id: e.external_id,
            created_at: e.timestamp.toISOString(),
          })),
          { onConflict: 'external_id', ignoreDuplicates: true }
        )
        .select();
      
      // Update last_sync timestamp and status
      await supabase
        .from('integration_connectors')
        .update({ 
          last_sync: new Date().toISOString(),
          last_sync_status: {
            success: true,
            events_synced: inserted?.length || 0,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', connectorId);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        events_synced: inserted?.length || 0,
        events_skipped: events.length - (inserted?.length || 0),
        errors: [],
        last_sync_at: new Date(),
      };
    } catch (error: any) {
      // Update last_sync_status with error
      await supabase
        .from('integration_connectors')
        .update({ 
          last_sync_status: {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', connectorId);
      
      return {
        success: false,
        events_synced: 0,
        events_skipped: 0,
        errors: [error.message],
        last_sync_at: new Date(),
      };
    }
  }
  
  /**
   * Get sync status for a connector
   */
  async getSyncStatus(connectorId: string) {
    const { data: connector } = await supabase
      .from('integration_connectors')
      .select('last_sync, integration_type, config, last_sync_status')
      .eq('id', connectorId)
      .single();
    
    if (!connector) return null;
    
    const adapter = adapterRegistry.get(connector.integration_type);
    const syncConfig = adapter?.getSyncConfig();
    
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('integration_type', connector.integration_type);
    
    return {
      last_sync: connector.last_sync ? new Date(connector.last_sync) : null,
      last_sync_status: connector.last_sync_status,
      total_events: count || 0,
      sync_config: syncConfig,
      can_sync_now: syncConfig?.supportsPolling || syncConfig?.supportsWebhook,
    };
  }
}

export const eventSyncService = new EventSyncService();
