import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Widget {
  id: string;
  name: string;
  allow_fallback_content: boolean;
  allowed_event_sources: string[];
  status: string;
}

export default function WidgetConfigManager() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchWidgets();
  }, [profile]);

  const fetchWidgets = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('widgets')
        .select('id, name, allow_fallback_content, allowed_event_sources, status')
        .eq('user_id', profile.id);

      if (error) throw error;
      setWidgets(data || []);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load widget configurations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWidgetConfig = async (widgetId: string, updates: Partial<Widget>) => {
    setSaving(widgetId);
    try {
      const { error } = await supabase
        .from('widgets')
        .update(updates)
        .eq('id', widgetId);

      if (error) throw error;

      setWidgets(prev => prev.map(w => 
        w.id === widgetId ? { ...w, ...updates } : w
      ));

      toast({
        title: 'Configuration updated',
        description: 'Widget settings have been saved successfully.',
      });
    } catch (error) {
      console.error('Error updating widget:', error);
      toast({
        title: 'Error',
        description: 'Failed to update widget configuration',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
    }
  };

  const disableAllFallbacks = async () => {
    setSaving('all');
    try {
      const { error } = await supabase
        .from('widgets')
        .update({ 
          allow_fallback_content: false,
          allowed_event_sources: ['natural', 'integration', 'quick-win']
        })
        .eq('user_id', profile?.id);

      if (error) throw error;

      setWidgets(prev => prev.map(w => ({
        ...w,
        allow_fallback_content: false,
        allowed_event_sources: ['natural', 'integration', 'quick-win']
      })));

      toast({
        title: 'All fallbacks disabled',
        description: 'All widgets now show only legitimate events.',
      });
    } catch (error) {
      console.error('Error disabling fallbacks:', error);
      toast({
        title: 'Error',
        description: 'Failed to disable fallbacks for all widgets',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading widget configurations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Widget Configuration Manager
          </CardTitle>
          <CardDescription>
            Control fallback behavior and event sources for your widgets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  Recommended: Disable All Fallbacks
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Prevent fake "X people viewing" messages from appearing
                </p>
              </div>
            </div>
            <Button 
              onClick={disableAllFallbacks}
              disabled={saving === 'all'}
              variant="outline"
              className="border-yellow-300"
            >
              {saving === 'all' ? 'Updating...' : 'Disable All Fallbacks'}
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Individual Widget Settings</h3>
            
            {widgets.map((widget) => (
              <Card key={widget.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{widget.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={widget.status === 'active' ? 'default' : 'secondary'}>
                          {widget.status}
                        </Badge>
                        {!widget.allow_fallback_content && (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            No Fallbacks
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={`fallback-${widget.id}`} className="text-sm font-medium">
                          Allow Fallback Content
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Show template messages when no real events available
                        </p>
                      </div>
                      <Switch
                        id={`fallback-${widget.id}`}
                        checked={widget.allow_fallback_content}
                        onCheckedChange={(checked) => 
                          updateWidgetConfig(widget.id, { allow_fallback_content: checked })
                        }
                        disabled={saving === widget.id}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Allowed Event Sources</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {widget.allowed_event_sources?.map((source) => (
                          <Badge key={source} variant="outline">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {widget.allow_fallback_content && (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                        <Shield className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-700 dark:text-yellow-300">
                          This widget may show template fallback messages
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}