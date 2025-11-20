import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getIntegrationMetadata } from '@/lib/integrationMetadata';

interface NativeIntegrationFlowProps {
  integration: any;
  websiteId: string;
  onSuccess: () => void;
}

export function NativeIntegrationFlow({
  integration,
  websiteId,
  onSuccess,
}: NativeIntegrationFlowProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const metadata = getIntegrationMetadata(integration.id);
  const Icon = metadata?.icon;

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('connect-native-integration', {
        body: {
          provider: integration.id,
          websiteId,
          name: integration.name,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);

    } catch (err: any) {
      console.error('Error connecting native integration:', err);
      setError(err.message || 'Failed to connect integration');
    } finally {
      setConnecting(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {metadata?.displayName} Connected!
          </h3>
          <p className="text-sm text-muted-foreground">
            You can now use this integration in your campaigns
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        {Icon && (
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          </div>
        )}
        <div>
          <h3 className="text-xl font-semibold mb-2">
            Enable {metadata?.displayName}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {metadata?.description}
          </p>
        </div>
      </div>

      {/* Features/Benefits */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-sm mb-3">What you'll get:</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {integration.id === 'testimonials' && (
            <>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Collect customer testimonials via forms</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Moderate and approve submissions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Display testimonials on your website</span>
              </li>
            </>
          )}
          {integration.id === 'announcements' && (
            <>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Create scheduled announcements</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Promote new features and updates</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Run time-limited offers</span>
              </li>
            </>
          )}
          {integration.id === 'live_visitors' && (
            <>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Show real-time visitor count</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Build social proof automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>No external tools needed</span>
              </li>
            </>
          )}
          {integration.id === 'instant_capture' && (
            <>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Track form submissions instantly</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>No third-party integrations required</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Show signups and conversions live</span>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Connect Button */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={handleConnect}
          disabled={connecting}
          size="lg"
          className="min-w-[200px]"
        >
          {connecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {connecting ? 'Connecting...' : 'Enable Integration'}
        </Button>
      </div>

      {/* Setup Time */}
      {metadata?.setupTime && (
        <p className="text-xs text-center text-muted-foreground">
          Setup time: {metadata.setupTime}
        </p>
      )}
    </div>
  );
}
