import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Plug, 
  FileText, 
  ExternalLink, 
  Play,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDemoEvents } from '@/hooks/useDemoEvents';

interface WidgetEmptyStateProps {
  widgetId?: string;
  widgetName?: string;
  onSetupIntegrations?: () => void;
  onEnableDemoMode?: () => void;
}

export const WidgetEmptyState = ({ 
  widgetId, 
  widgetName,
  onSetupIntegrations,
  onEnableDemoMode 
}: WidgetEmptyStateProps) => {
  const { profile } = useAuth();
  const { generateDemoEvents, loading } = useDemoEvents();

  const handleGenerateDemo = async () => {
    if (!profile?.id) return;
    await generateDemoEvents(profile.id, profile.business_type || 'saas');
    setTimeout(() => window.location.reload(), 1000);
  };

  const demoModeEnabled = profile?.demo_mode_enabled;

  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            {widgetName ? `${widgetName} has no events yet` : 'No events yet'}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Get started by setting up integrations to capture real user activity, 
            or enable demo mode to see how your widget will look.
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Real Integrations */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary" />
              <h4 className="font-medium">Connect Real Data</h4>
              <Badge variant="default" className="text-xs">Recommended</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Connect your website, e-commerce platform, or APIs to show real user activity
            </p>
            <Button 
              onClick={onSetupIntegrations}
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Setup Integrations
            </Button>
          </div>

          {/* Demo Mode */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium">Demo Mode</h4>
              <Badge variant="outline" className="text-xs">For Testing</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Generate realistic demo events to preview how your widget will look
            </p>
            
            {demoModeEnabled ? (
              <Button 
                variant="outline" 
                onClick={handleGenerateDemo}
                disabled={loading}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Generating...' : 'Generate Demo Events'}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={onEnableDemoMode}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Enable Demo Mode
              </Button>
            )}
          </div>
        </div>

        {/* Preview Widget */}
        {widgetId && (
          <div className="pt-4 border-t">
            <Button variant="ghost" size="sm" asChild>
              <a 
                href={`/test-widget.html?widget=${widgetId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview Widget
              </a>
            </Button>
          </div>
        )}

        {/* Demo Mode Notice */}
        {demoModeEnabled && (
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <strong>Demo Mode Active:</strong> Demo events are temporary and expire after 7 days. 
            Remember to disable demo mode before going live.
          </div>
        )}
      </CardContent>
    </Card>
  );
};