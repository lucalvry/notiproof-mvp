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

      // Try to fetch real recent events
      const events = await adapter.fetchEvents(connectorId, { limit: 3 });

      if (events.length > 0) {
        setSampleEvents(events);
      } else {
        // Fallback to sample
        setSampleEvents([adapter.getSampleEvent()]);
      }
    } catch (error) {
      console.error('Error loading sample events:', error);
      // Fallback to sample on error
      const adapter = adapterRegistry.get(integrationId);
      if (adapter) {
        setSampleEvents([adapter.getSampleEvent()]);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderTemplate = (event: any) => {
    let rendered = template || event.message;

    // Replace placeholders
    Object.entries(event.metadata || {}).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    });

    rendered = rendered
      .replace(/\{\{user_name\}\}/g, event.user_name || 'Someone')
      .replace(/\{\{user_location\}\}/g, event.user_location || '');

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
              <AvatarImage src={event.user_avatar || event.image_url} />
              <AvatarFallback>{event.user_name?.[0] || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{renderTemplate(event)}</p>
              {event.user_location && (
                <p className="text-xs text-muted-foreground mt-1">📍 {event.user_location}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                ✓ {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Live Data
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
