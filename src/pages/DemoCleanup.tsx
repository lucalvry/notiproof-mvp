import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Trash2, CheckCircle, AlertTriangle, Ban, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import WidgetConfigManager from '@/components/WidgetConfigManager';

export default function DemoCleanup() {
  const [demoLoading, setDemoLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [demoCleared, setDemoCleared] = useState(false);
  const [manualCleared, setManualCleared] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const clearDemoEvents = async () => {
    if (!profile?.id) return;

    setDemoLoading(true);
    try {
      // Use comprehensive cleanup function
      const { error } = await supabase.rpc('cleanup_all_template_events', {
        _user_id: profile.id
      });

      if (error) throw error;

      setDemoCleared(true);
      toast({
        title: 'All template events cleared',
        description: 'Demo, manual, and template events have been completely removed.',
      });
    } catch (error) {
      console.error('Error clearing template events:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear template events. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDemoLoading(false);
    }
  };

  const clearManualEvents = async () => {
    if (!profile?.id) return;

    setManualLoading(true);
    try {
      const { error } = await supabase.rpc('clear_manual_events', {
        _user_id: profile.id
      });

      if (error) throw error;

      setManualCleared(true);
      toast({
        title: 'Manual events cleared',
        description: 'All manual events have been purged. Only natural and quick-win events will display.',
      });
    } catch (error) {
      console.error('Error clearing manual events:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear manual events. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setManualLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-4">
              Please log in to clear demo events
            </p>
            <Button asChild>
              <a href="/auth/login">Log In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Demo Events Cleanup
          </CardTitle>
          <CardDescription>
            Remove all demo notifications and transition to real events only
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Demo Events Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Demo Events Cleanup
            </h3>
            
            {demoCleared ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Success!</strong> All demo events have been cleared.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>CRITICAL:</strong> Remove ALL fake notifications including "5 people viewing", "25 people browsing", etc. 
                    This comprehensive cleanup removes demo, manual, template, and fallback events completely.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={clearDemoEvents} 
                  disabled={demoLoading}
                  variant="destructive"
                  className="w-full"
                >
                  {demoLoading ? (
                    <>
                      <Trash2 className="h-4 w-4 mr-2 animate-spin" />
                      Clearing Demo Events...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear ALL Template Events (Recommended)
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          <Separator />

          {/* Manual Events Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Manual Events Purge
            </h3>
            
            {manualCleared ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Success!</strong> All manual events have been purged. Only natural events and quick-wins will display.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Recommended:</strong> Remove all manually created events like "someone just signed up". 
                    This ensures only genuine integrations and quick-win templates are shown.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <h4 className="font-medium">What happens after purging manual events:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>All manually created "someone just..." events will be removed</li>
                    <li>Widget will only show natural events from integrations</li>
                    <li>Quick-win templates will supplement when natural events are low</li>
                    <li>No more generic fallback messages will appear</li>
                    <li>Creates authentic user experience with real data only</li>
                  </ul>
                </div>

                <Button 
                  onClick={clearManualEvents} 
                  disabled={manualLoading}
                  variant="destructive"
                  className="w-full"
                >
                  {manualLoading ? (
                    <>
                      <Ban className="h-4 w-4 mr-2 animate-spin" />
                      Purging Manual Events...
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Purge All Manual Events
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {(demoCleared || manualCleared) && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Widget Configuration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ensure your widgets are properly configured to prevent future fake notifications.
                </p>
                
                <WidgetConfigManager />
              </div>

              <Separator />
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <a href="/dashboard">Go to Dashboard</a>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <a href="/widgets">View Your Widgets</a>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}