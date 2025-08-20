import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationTypeEvents } from '@/hooks/useNotificationTypeEvents';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Trash2, RefreshCw, Info, AlertCircle } from 'lucide-react';

interface DemoEventManagerProps {
  widgetId: string;
  notificationTypes: string[];
  businessType: string;
  className?: string;
}

const notificationTypeNames: Record<string, string> = {
  'recent-purchase': 'Recent Purchase',
  'live-visitors': 'Live Visitor Count',
  'contact-form': 'Contact Submission',
  'signup-notification': 'New Signup',
  'review-testimonial': 'Reviews & Testimonials',
  'limited-offer': 'Limited Time Offer',
  'stock-alert': 'Low Stock Alert',
  'download-notification': 'Recent Download',
  'booking-appointment': 'Recent Booking',
  'milestone-celebration': 'Milestone Celebration'
};

export const DemoEventManager = ({ 
  widgetId, 
  notificationTypes, 
  businessType,
  className = "" 
}: DemoEventManagerProps) => {
  const [demoModeEnabled, setDemoModeEnabled] = useState(false);
  const [demoEvents, setDemoEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const { generateDemoEvents, clearDemoEvents, isGenerating } = useNotificationTypeEvents({
    widgetId,
    notificationTypes,
    businessType
  });

  // Load current demo events and demo mode status
  useEffect(() => {
    loadDemoData();
  }, [widgetId]);

  const loadDemoData = async () => {
    try {
      setLoading(true);
      
      // Check if there are any demo events for this widget
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('widget_id', widgetId)
        .eq('source', 'demo')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setDemoEvents(events || []);
      setDemoModeEnabled((events || []).length > 0);
    } catch (error) {
      console.error('Error loading demo data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDemoMode = async (enabled: boolean) => {
    if (enabled) {
      if (notificationTypes.length === 0) {
        toast({
          title: 'No Notification Types Selected',
          description: 'Please select notification types first to generate demo events.',
          variant: 'destructive'
        });
        return;
      }
      await generateDemoEvents();
      await loadDemoData();
    } else {
      await clearDemoEvents();
      await loadDemoData();
    }
  };

  const handleRefreshDemoEvents = async () => {
    if (notificationTypes.length === 0) {
      toast({
        title: 'No Notification Types Selected',
        description: 'Please select notification types first to generate demo events.',
        variant: 'destructive'
      });
      return;
    }
    await generateDemoEvents();
    await loadDemoData();
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading demo settings...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Demo Mode
            </CardTitle>
            <CardDescription>
              Generate sample events to preview your widget before real data arrives
            </CardDescription>
          </div>
          <Switch
            checked={demoModeEnabled}
            onCheckedChange={handleToggleDemoMode}
            disabled={isGenerating}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {notificationTypes.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Select notification types to enable demo mode and see contextually relevant sample events.
            </AlertDescription>
          </Alert>
        )}

        {notificationTypes.length > 0 && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Selected Notification Types</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {notificationTypes.map(typeId => (
                  <Badge key={typeId} variant="secondary" className="text-xs">
                    {notificationTypeNames[typeId] || typeId}
                  </Badge>
                ))}
              </div>
            </div>

            {demoModeEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Demo Events ({demoEvents.length})
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshDemoEvents}
                    disabled={isGenerating}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {demoEvents.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {demoEvents.slice(0, 3).map((event, index) => (
                      <div 
                        key={event.id}
                        className="text-xs p-2 bg-muted rounded border-l-2 border-primary/30"
                      >
                        {event.event_data?.message || 'Demo event message'}
                      </div>
                    ))}
                    {demoEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        And {demoEvents.length - 3} more demo events...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No demo events generated yet
                  </div>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Demo events will automatically expire after 7 days. Turn off demo mode once you have real events.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}

        {!demoModeEnabled && notificationTypes.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Enable demo mode to generate sample {notificationTypes.map(id => notificationTypeNames[id]).join(', ')} 
              events for your {businessType} business.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};