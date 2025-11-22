import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AutomaticTriggerConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  websiteId: string;
}

export function AutomaticTriggerConfigDialog({
  open,
  onOpenChange,
  formId,
  websiteId,
}: AutomaticTriggerConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>('');
  const [triggerEnabled, setTriggerEnabled] = useState(true);
  const [delayDays, setDelayDays] = useState(1);
  const [conditions, setConditions] = useState<Record<string, any>>({});

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integration_connectors')
        .select('*')
        .eq('website_id', websiteId)
        .eq('status', 'active');

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedIntegration) {
      toast.error('Please select an integration');
      return;
    }

    setLoading(true);
    try {
      const integration = integrations.find(i => i.id === selectedIntegration);
      const updatedConfig = {
        ...integration.config,
        trigger_config: {
          enabled: triggerEnabled,
          delay_days: delayDays,
          conditions,
          form_id: formId,
        },
      };

      const { error } = await supabase
        .from('integration_connectors')
        .update({ config: updatedConfig })
        .eq('id', selectedIntegration);

      if (error) throw error;

      toast.success('Automatic trigger configured successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving trigger config:', error);
      toast.error('Failed to save trigger configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Automatic Triggers</DialogTitle>
          <DialogDescription>
            Set up automatic testimonial invitations based on integration events
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Select Integration</Label>
            <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an integration..." />
              </SelectTrigger>
              <SelectContent>
                {integrations.map((integration) => (
                  <SelectItem key={integration.id} value={integration.id}>
                    {integration.name} ({integration.integration_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {integrations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active integrations found. Connect an integration first.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Automatic Triggers</Label>
              <p className="text-sm text-muted-foreground">
                Send invitations automatically when events occur
              </p>
            </div>
            <Switch checked={triggerEnabled} onCheckedChange={setTriggerEnabled} />
          </div>

          {triggerEnabled && (
            <>
              <div className="space-y-2">
                <Label>Delay Before Sending (days)</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={delayDays}
                  onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
                  placeholder="Number of days to wait"
                />
                <p className="text-xs text-muted-foreground">
                  Send invitation after this many days from the trigger event
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-semibold text-sm">Trigger Conditions</h4>
                <p className="text-xs text-muted-foreground">
                  Invitations will be sent when:
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Stripe: After successful payment</li>
                  <li>Mailchimp: After new subscriber added</li>
                  <li>Calendly: After booking confirmed</li>
                  <li>Custom Webhook: When webhook received</li>
                </ul>
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !selectedIntegration}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
