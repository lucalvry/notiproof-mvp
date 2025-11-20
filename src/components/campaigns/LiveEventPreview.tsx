import { useState, useEffect } from 'react';
import { adapterRegistry } from '@/lib/integrations';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface LiveEventPreviewProps {
  connectorId: string;
  integrationId: string;
  template: string;
}

export function LiveEventPreview({ connectorId, integrationId, template }: LiveEventPreviewProps) {
  const [sampleEvents, setSampleEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSampleEvents();
  }, [connectorId, integrationId]);

  const loadSampleEvents = async () => {
    try {
      const adapter = adapterRegistry.get(integrationId);

      if (!adapter) {
        setSampleEvents([]);
        setLoading(false);
        return;
      }

      // Use sample events from adapter
      const samples = adapter.getSampleEvents();
      setSampleEvents(samples.slice(0, 3));
    } catch (error) {
      console.error('Error loading sample events:', error);
      setSampleEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const renderTemplate = (event: any) => {
    let rendered = template || event.normalized?.message || 'Sample event';

    // Replace placeholders with normalized fields
    if (event.normalized) {
      Object.entries(event.normalized).forEach(([key, value]) => {
        rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      });
    }

    return rendered;
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p className="mt-2 text-sm">Loading events...</p>
      </div>
    );
  }

  if (sampleEvents.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">No events available yet</p>
        <p className="text-xs mt-1">Events will appear here once synced</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sampleEvents.map((event, idx) => (
        <Card
          key={idx}
          className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary/20"
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={event.normalized?.user_avatar || event.normalized?.image_url} />
              <AvatarFallback>{event.normalized?.user_name?.[0] || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{renderTemplate(event)}</p>
              {event.normalized?.user_location && (
                <p className="text-xs text-muted-foreground mt-1">📍 {event.normalized.user_location}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                ✓ {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Sample Data
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
