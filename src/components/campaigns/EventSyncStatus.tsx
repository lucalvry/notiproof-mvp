import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { eventSyncService } from '@/lib/integrations/EventSyncService';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface EventSyncStatusProps {
  connectorId: string;
  integrationId: string;
}

export function EventSyncStatus({ connectorId, integrationId }: EventSyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadSyncStatus();
  }, [connectorId]);
  
  const loadSyncStatus = async () => {
    try {
      const status = await eventSyncService.getSyncStatus(connectorId);
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading sync status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const result = await eventSyncService.syncNow(connectorId, integrationId);
      
      if (result.success) {
        toast.success(
          `✅ Synced ${result.events_synced} new events${result.events_skipped > 0 ? ` (${result.events_skipped} duplicates skipped)` : ''}`,
          { duration: 5000 }
        );
        await loadSyncStatus();
      } else {
        toast.error(`Sync failed: ${result.errors.join(', ')}`);
      }
    } catch (error: any) {
      toast.error(`Sync error: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!syncStatus?.can_sync_now) {
    return null; // Don't show for native/webhook-only integrations
  }
  
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Event Sync Status
            </CardTitle>
            <CardDescription>
              {syncStatus.total_events} events synced from this integration
            </CardDescription>
          </div>
          <Button
            onClick={handleSyncNow}
            disabled={syncing}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last Sync:</span>
          <div className="flex items-center gap-2">
            {syncStatus.last_sync ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{formatDistanceToNow(syncStatus.last_sync, { addSuffix: true })}</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span>Never synced</span>
              </>
            )}
          </div>
        </div>
        
        {syncStatus.sync_config && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sync Mode:</span>
            <div className="flex gap-2">
              {syncStatus.sync_config.supportsWebhook && (
                <Badge variant="outline">⚡ Real-time Webhook</Badge>
              )}
              {syncStatus.sync_config.supportsPolling && (
                <Badge variant="outline">🔁 Manual Sync</Badge>
              )}
            </div>
          </div>
        )}
        
        {syncStatus.last_sync_status && !syncStatus.last_sync_status.success && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Last sync failed: {syncStatus.last_sync_status.error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
