import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Sparkles, Trash2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoEvents } from '@/hooks/useDemoEvents';
import { useToast } from '@/hooks/use-toast';

export const DemoModeSettings = () => {
  const { profile, refreshProfile } = useAuth();
  const { clearAllDemoEvents, loading } = useDemoEvents();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const handleToggleDemoMode = async (enabled: boolean) => {
    if (!profile) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ demo_mode_enabled: enabled })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: enabled ? 'Demo mode enabled' : 'Demo mode disabled',
        description: enabled 
          ? 'You can now generate demo events for testing'
          : 'Demo mode has been turned off',
      });
    } catch (error) {
      console.error('Error updating demo mode:', error);
      toast({
        title: 'Error',
        description: 'Failed to update demo mode setting',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleClearDemoEvents = async () => {
    if (!profile?.id) return;
    
    const success = await clearAllDemoEvents(profile.id);
    if (success) {
      // Refresh page to update stats
      window.location.reload();
    }
  };

  if (!profile) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Demo Mode Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Demo Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="demo-mode" className="text-base font-medium">
              Enable Demo Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              Generate realistic demo events for testing and preview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="demo-mode"
              checked={profile.demo_mode_enabled || false}
              onCheckedChange={handleToggleDemoMode}
              disabled={updating}
            />
            {profile.demo_mode_enabled && (
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            )}
          </div>
        </div>

        {/* Demo Mode Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Demo mode is designed for testing and preview purposes only. 
            Demo events are temporary and will expire after 7 days.
          </AlertDescription>
        </Alert>

        {/* Clear Demo Events */}
        {profile.demo_mode_enabled && (
          <div className="space-y-3">
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Manage Demo Data</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Remove all demo events to start fresh or before going live
              </p>
              
              <Button 
                variant="outline"
                onClick={handleClearDemoEvents}
                disabled={loading}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {loading ? 'Clearing...' : 'Clear All Demo Events'}
              </Button>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Before going live:</strong> Remember to disable demo mode 
                and clear all demo events to ensure only real user data is displayed.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Disabled State Info */}
        {!profile.demo_mode_enabled && (
          <Alert>
            <AlertDescription>
              Demo mode is currently disabled. Enable it to generate demo events 
              for testing your notification widgets.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};