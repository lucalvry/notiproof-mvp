import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface EventSyncStatusProps {
  connectorId: string;
  integrationId: string;
}

/**
 * Event sync status component - currently simplified
 * Full sync functionality will be implemented in Phase 7
 */
export function EventSyncStatus({ connectorId, integrationId }: EventSyncStatusProps) {
  return (
    <Card className="border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <CardDescription>
            Events will sync automatically based on your integration settings
          </CardDescription>
        </div>
      </CardContent>
    </Card>
  );
}
