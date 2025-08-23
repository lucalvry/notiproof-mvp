import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WebhookVerifierProps {
  webhookUrl: string;
  platform: string;
}

export const WebhookVerifier = ({ webhookUrl, platform }: WebhookVerifierProps) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [samplePayload, setSamplePayload] = useState('');
  const { toast } = useToast();

  const testWebhook = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      // Test webhook with a sample payload
      const testPayload = platform === 'woocommerce' ? {
        id: 12345,
        number: 'TEST-12345',
        status: 'completed',
        total: '29.99',
        currency: 'USD',
        date_created: new Date().toISOString(),
        billing: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'test@example.com',
          city: 'New York',
          country: 'US'
        },
        line_items: [{
          name: 'Test Product',
          quantity: 1,
          price: 29.99
        }]
      } : {};

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WC-Webhook-Topic': 'order.completed',
          'X-WC-Webhook-Source': 'https://test-store.com',
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult('success');
        setTestMessage(`✅ Webhook test successful! ${result.eventsCreated ? `Created ${result.eventsCreated} event(s)` : 'Endpoint responded correctly'}.`);
        toast({
          title: 'Webhook Test Successful',
          description: 'Your webhook is properly configured and responding.',
        });
      } else {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `HTTP ${response.status}`;
        
        if (response.status === 401) {
          errorMessage += ' - Authentication error. Please verify webhook configuration.';
        } else if (response.status === 404) {
          errorMessage += ' - Webhook endpoint not found. Check the URL.';
        } else if (response.status === 500) {
          errorMessage += ' - Server error. Check function logs for details.';
        } else {
          errorMessage += errorText ? `: ${errorText}` : `: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      setTestResult('error');
      setTestMessage(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'Webhook Test Failed',
        description: 'Please check your webhook configuration.',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const getSamplePayload = () => {
    if (platform === 'woocommerce') {
      return JSON.stringify({
        id: 12345,
        number: "ORDER-12345", 
        status: "completed",
        total: "49.99",
        currency: "USD",
        date_created: "2024-01-15T10:30:00Z",
        billing: {
          first_name: "Jane",
          last_name: "Smith", 
          email: "jane@example.com",
          city: "Los Angeles",
          country: "US"
        },
        line_items: [{
          name: "Premium Product",
          quantity: 2,
          price: 24.99
        }]
      }, null, 2);
    }
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Webhook Verification
        </CardTitle>
        <CardDescription>
          Test your webhook configuration to ensure it's working properly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testWebhook} 
            disabled={testing}
            className="flex-1"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing Webhook...
              </>
            ) : (
              'Test Webhook'
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setSamplePayload(getSamplePayload())}
          >
            Show Sample Data
          </Button>
        </div>

        {testResult && (
          <Alert className={testResult === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {testResult === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={testResult === 'success' ? 'text-green-700' : 'text-red-700'}>
              {testMessage}
            </AlertDescription>
          </Alert>
        )}

        {samplePayload && (
          <div>
            <Label>Sample {platform} Payload</Label>
            <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-40">
              {samplePayload}
            </pre>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium">Troubleshooting Tips:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Ensure your {platform} webhook is set to "Active" status</li>
            <li>Check that the webhook URL is exactly as shown above</li>
            <li>Verify your {platform} admin has webhook permissions</li>
            <li>Test with a real order to confirm automatic notifications</li>
          </ul>
        </div>

        <Button variant="outline" size="sm" className="w-full">
          <ExternalLink className="h-4 w-4 mr-2" />
          View Integration Logs
        </Button>
      </CardContent>
    </Card>
  );
};