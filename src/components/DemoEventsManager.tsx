import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDemoEvents } from '@/hooks/useDemoEvents';
import { useAuth } from '@/hooks/useAuth';

const businessTypes = [
  { value: 'ecommerce', label: 'E-commerce', description: 'Smart purchase & review notifications' },
  { value: 'saas', label: 'SaaS', description: 'Context-aware trial signups & upgrades' },
  { value: 'services', label: 'Services', description: 'Intelligent booking & consultation messages' },
  { value: 'events', label: 'Events', description: 'Smart registration & ticket sale notifications' },
  { value: 'blog', label: 'Blog/Content', description: 'Adaptive subscription & engagement messages' },
  { value: 'marketing_agency', label: 'Marketing Agency', description: 'Context-aware client inquiry notifications' },
  { value: 'ngo', label: 'NGO/Non-profit', description: 'Smart donation & volunteer signup messages' },
  { value: 'education', label: 'Education', description: 'Intelligent course enrollment notifications' }
];

export const DemoEventsManager = () => {
  const [selectedBusinessType, setSelectedBusinessType] = useState('saas');
  const { generateDemoEvents, cleanupExpiredEvents, clearAllDemoEvents, loading } = useDemoEvents();
  const { profile } = useAuth();

  const handleGenerateEvents = async () => {
    if (!profile?.id) return;
    await generateDemoEvents(profile.id, selectedBusinessType);
  };

  const handleClearAll = async () => {
    if (!profile?.id) return;
    const success = await clearAllDemoEvents(profile.id);
    if (success) {
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const selectedType = businessTypes.find(type => type.value === selectedBusinessType);
  const demoModeEnabled = profile?.demo_mode_enabled;

  if (!demoModeEnabled) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Demo Mode Disabled</h3>
          <p className="text-muted-foreground mb-4">
            Enable demo mode in your settings to generate demo events for testing
          </p>
          <Button variant="outline" asChild>
            <a href="/dashboard/settings">Enable Demo Mode</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Demo Events Manager
          <Badge variant="secondary" className="text-xs">Demo Mode Active</Badge>
        </CardTitle>
        <CardDescription>
          Generate smart, context-aware demo events with AI-powered messages that adapt to your business type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="businessType">Business Type</Label>
          <Select value={selectedBusinessType} onValueChange={setSelectedBusinessType}>
            <SelectTrigger>
              <SelectValue placeholder="Select your business type" />
            </SelectTrigger>
            <SelectContent>
              {businessTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedType && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{selectedType.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedType.description}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateEvents} 
              disabled={loading || !profile?.id}
              className="flex-1"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Demo Events
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={cleanupExpiredEvents}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Expired
            </Button>
          </div>

          <Button 
            variant="destructive" 
            onClick={handleClearAll}
            disabled={loading}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {loading ? 'Clearing...' : 'Clear All Demo Events'}
          </Button>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Demo events are for testing only and expire after 7 days. 
            Clear all demo events before going live with real data.
          </AlertDescription>
        </Alert>

        <div className="text-sm text-muted-foreground">
          <p>Smart demo events will:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Generate 5 context-aware events with smart messaging</li>
            <li>Adapt message templates to your business type</li>
            <li>Use fallback logic when customer data is incomplete</li>
            <li>Include location data from major cities worldwide</li>
            <li>Automatically expire after 7 days for testing safety</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};