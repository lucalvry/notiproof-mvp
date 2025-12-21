import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AvatarSelector } from '../AvatarSelector';
import { formTypes, type FormTypeConfig } from '@/data/presetAvatars';
import { supabase } from '@/integrations/supabase/client';
import { Info, FileText, Filter, Target } from 'lucide-react';

interface FormCaptureIntegration {
  id: string;
  name: string;
  config: {
    target_url?: string;
    form_type?: string;
  };
}

interface FormCaptureTemplateStepProps {
  websiteId: string;
  sourceMode?: 'all' | 'type' | 'integration';
  selectedIntegrationId?: string | null;
  selectedFormType: string | null;
  messageTemplate: string;
  avatar: string;
  fieldMappings: Record<string, string>;
  onSourceModeChange?: (mode: 'all' | 'type' | 'integration') => void;
  onIntegrationIdChange?: (id: string | null) => void;
  onFormTypeSelect: (formType: string) => void;
  onMessageTemplateChange: (message: string) => void;
  onAvatarChange: (avatar: string) => void;
  onFieldMappingsChange: (mappings: Record<string, string>) => void;
}

export function FormCaptureTemplateStep({
  websiteId,
  sourceMode = 'type',
  selectedIntegrationId,
  selectedFormType,
  messageTemplate,
  avatar,
  fieldMappings,
  onSourceModeChange,
  onIntegrationIdChange,
  onFormTypeSelect,
  onMessageTemplateChange,
  onAvatarChange,
  onFieldMappingsChange,
}: FormCaptureTemplateStepProps) {
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<FormCaptureIntegration[]>([]);

  // Load form capture integrations
  useEffect(() => {
    async function loadIntegrations() {
      if (!websiteId) return;

      const { data } = await supabase
        .from('integration_connectors')
        .select('id, name, config')
        .eq('website_id', websiteId)
        .eq('integration_type', 'form_hook')
        .eq('status', 'active');

      if (data) {
        setIntegrations(data.map(d => ({
          id: d.id,
          name: d.name,
          config: d.config as FormCaptureIntegration['config'],
        })));
      }
    }

    loadIntegrations();
  }, [websiteId]);

  // Load recent form submissions for preview
  useEffect(() => {
    async function loadRecentSubmissions() {
      if (!websiteId) return;
      
      const { data } = await supabase
        .from('events')
        .select('event_data, created_at')
        .eq('website_id', websiteId)
        .eq('event_type', 'form_submission')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (data) {
        setRecentSubmissions(data);
      }
    }
    
    loadRecentSubmissions();
  }, [websiteId]);

  const handleFormTypeClick = (formType: FormTypeConfig) => {
    onFormTypeSelect(formType.id);
    onMessageTemplateChange(formType.defaultMessage);
    onAvatarChange(formType.defaultAvatar);
    
    // Set default field mappings based on suggested fields
    const mappings: Record<string, string> = {};
    formType.suggestedFields.forEach(field => {
      mappings[field] = field; // Map field to itself by default
    });
    onFieldMappingsChange(mappings);
  };

  // Generate preview message with sample data
  const getPreviewMessage = () => {
    const sampleData: Record<string, string> = {
      name: 'Sarah',
      email: 'sarah@example.com',
      company: 'Acme Inc',
      location: 'New York',
      product: 'Premium Plan',
      message: 'Hello!',
    };

    let preview = messageTemplate;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return preview;
  };

  // Extract variables from message template
  const extractVariables = (template: string): string[] => {
    const matches = template.match(/{{(\w+)}}/g) || [];
    return matches.map(m => m.replace(/[{}]/g, ''));
  };

  const variables = extractVariables(messageTemplate);

  return (
    <div className="space-y-6">
      {/* Form Source Selection */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Label className="text-base font-semibold">Form Source</Label>
          
          <RadioGroup 
            value={sourceMode} 
            onValueChange={(value) => onSourceModeChange?.(value as 'all' | 'type' | 'integration')}
            className="space-y-3"
          >
            <div 
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                sourceMode === 'all' 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onSourceModeChange?.('all')}
            >
              <RadioGroupItem value="all" id="all-forms" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <Label htmlFor="all-forms" className="font-medium cursor-pointer">All Forms</Label>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Show all captured forms with their original messages from integration rules
                </p>
              </div>
            </div>
            
            <div 
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                sourceMode === 'type' 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onSourceModeChange?.('type')}
            >
              <RadioGroupItem value="type" id="by-type" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <Label htmlFor="by-type" className="font-medium cursor-pointer">By Form Type</Label>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Group by type (newsletter, registration, contact, etc.)
                </p>
              </div>
            </div>
            
            <div 
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                sourceMode === 'integration' 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onSourceModeChange?.('integration')}
            >
              <RadioGroupItem value="integration" id="specific-form" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <Label htmlFor="specific-form" className="font-medium cursor-pointer">Specific Form</Label>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Show submissions from a specific form capture rule
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* All Forms Info Banner */}
      {sourceMode === 'all' && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Each form will use its original message
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Notifications will display with the message template configured in each integration rule. 
              For example, newsletter signups might show "Someone just subscribed!" while contact forms 
              show "John just reached out to us".
            </p>
          </div>
        </div>
      )}

      {/* Integration Selector for Specific Form mode */}
      {sourceMode === 'integration' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label className="text-sm font-medium">Select a Form Capture Rule</Label>
            {integrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No form capture rules found. Create one in the Integrations section first.
              </p>
            ) : (
              <Select
                value={selectedIntegrationId || ''}
                onValueChange={(value) => onIntegrationIdChange?.(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a form capture rule..." />
                </SelectTrigger>
                <SelectContent>
                  {integrations.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id}>
                      <div className="flex flex-col">
                        <span>{integration.name}</span>
                        {integration.config?.target_url && (
                          <span className="text-xs text-muted-foreground">
                            {integration.config.target_url}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form Type Selection - Only show for 'type' mode */}
      {sourceMode === 'type' && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">What type of form is this?</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {formTypes.map((formType) => (
              <button
                key={formType.id}
                type="button"
                onClick={() => handleFormTypeClick(formType)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-[1.02]',
                  selectedFormType === formType.id
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50 bg-card'
                )}
              >
                <span className="text-3xl">{formType.icon}</span>
                <span className="text-sm font-medium text-center">{formType.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Avatar and Message Template - Show for 'type' mode with selected form type */}
      {sourceMode === 'type' && selectedFormType && (
        <>
          {/* Avatar Selection */}
          <Card>
            <CardContent className="pt-6">
              <AvatarSelector
                value={avatar}
                onChange={onAvatarChange}
              />
            </CardContent>
          </Card>

          {/* Message Template */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message-template" className="text-sm font-medium">
                  Notification Message
                </Label>
                <Textarea
                  id="message-template"
                  value={messageTemplate}
                  onChange={(e) => onMessageTemplateChange(e.target.value)}
                  placeholder="{{name}} just signed up!"
                  className="min-h-[80px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{variable}}"} syntax to insert form data dynamically.
                </p>
              </div>

              {/* Available Variables */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Available Variables</Label>
                <div className="flex flex-wrap gap-2">
                  {['name', 'email', 'company', 'location', 'phone', 'product', 'message'].map((variable) => (
                    <Badge
                      key={variable}
                      variant="secondary"
                      className={cn(
                        'cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors',
                        variables.includes(variable) && 'bg-primary/20'
                      )}
                      onClick={() => {
                        const newMessage = messageTemplate + ` {{${variable}}}`;
                        onMessageTemplateChange(newMessage);
                      }}
                    >
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <Label className="text-sm font-medium mb-4 block">Live Preview</Label>
              <div className="flex items-start gap-3 p-4 bg-background rounded-lg border shadow-sm max-w-md">
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  {avatar.startsWith('http') ? (
                    <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl">{avatar}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {getPreviewMessage()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Just now</p>
                </div>
              </div>

              {/* Show with real data if available */}
              {recentSubmissions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">With your recent form data:</p>
                  {recentSubmissions.slice(0, 1).map((submission, idx) => {
                    let realPreview = messageTemplate;
                    const data = submission.event_data || {};
                    Object.entries(data).forEach(([key, value]) => {
                      realPreview = realPreview.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
                    });
                    
                    return (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-background rounded-lg border shadow-sm max-w-md">
                        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                          <span className="text-2xl">{avatar}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{realPreview}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(submission.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
