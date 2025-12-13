import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WebsiteGate } from './steps/WebsiteGate';
import { IntegrationSelectionStep } from './steps/IntegrationSelectionStep';
import { IntegrationConnectionStep } from './IntegrationConnectionStep';
import { TemplateSelectionStep } from './steps/TemplateSelectionStep';
import { FieldMappingStep } from './steps/FieldMappingStep';
import { OrchestrationStep } from './steps/OrchestrationStep';
import { FormCaptureTemplateStep } from './steps/FormCaptureTemplateStep';
import { RulesTargeting } from './RulesTargeting';
import { ReviewActivate } from './ReviewActivate';
import { AnnouncementConfig } from './native/AnnouncementConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { adapterRegistry } from '@/lib/integrations/AdapterRegistry';
import type { TemplateConfig } from '@/lib/templateEngine';

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface Integration {
  id: string;
  provider: string;
  name: string;
}

const WIZARD_STEPS = [
  'Select Website',
  'Choose Integrations',
  'Connect Integration',
  'Select Template',
  'Map Fields',
  'Orchestration',
  'Rules & Targeting',
  'Review & Activate',
];

export function CampaignWizard({ open, onClose, onComplete }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [campaignName, setCampaignName] = useState('');
  
  // Step 0: Website
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);
  
  // Step 1: Integrations
  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState<string[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [needsConnection, setNeedsConnection] = useState(false);
  const [connectionComplete, setConnectionComplete] = useState(false);
  
  // Step 2: Template
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  
  // Step 3: Field Mapping
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [testimonialFilters, setTestimonialFilters] = useState({
    minRating: 1,
    mediaFilter: 'all' as 'all' | 'text_only' | 'with_image' | 'with_video',
    onlyVerified: false,
  });
  
  // NEW: Testimonial selection state
  const [selectedTestimonialIds, setSelectedTestimonialIds] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState<'specific' | 'filtered'>('filtered');
  
  // Step 3: Announcement Config (for native announcement integration)
  const [announcementConfig, setAnnouncementConfig] = useState({
    title: '',
    message: '',
    cta_text: '',
    cta_url: '',
    schedule_type: 'instant' as 'instant' | 'scheduled' | 'recurring',
    priority: 50,
    variables: {} as Record<string, string>,
    image_type: 'emoji' as 'emoji' | 'icon' | 'upload' | 'url',
    emoji: '📢',
  });
  
  // Form Capture Config (for form_hook integration)
  const [formCaptureConfig, setFormCaptureConfig] = useState({
    formType: null as string | null,
    messageTemplate: '',
    avatar: '✅',
    fieldMappings: {} as Record<string, string>,
  });
  
  // Step 4: Orchestration
  const [priority, setPriority] = useState(50);
  const [frequencyCap, setFrequencyCap] = useState({
    per_user: 3,
    per_session: 1,
    cooldown_seconds: 600,
  });
  const [schedule, setSchedule] = useState({
    enabled: false,
    start_date: null as string | null,
    end_date: null as string | null,
    days_of_week: [] as number[],
    time_ranges: [] as Array<{ start: string; end: string }>,
  });
  
  // Step 5: Rules & Targeting
  const [displayRules, setDisplayRules] = useState<any>({
    show_duration_ms: 5000,
    interval_ms: 8000,
    max_per_page: 5,
    max_per_session: 20,
    url_allowlist: [],
    url_denylist: [],
    referrer_allowlist: [],
    referrer_denylist: [],
    triggers: {
      min_time_on_page_ms: 0,
      scroll_depth_pct: 0,
      exit_intent: false,
    },
    enforce_verified_only: false,
    geo_allowlist: [],
    geo_denylist: [],
  });

  // Load integrations when website is selected
  useEffect(() => {
    if (selectedWebsiteId) {
      loadIntegrations();
    }
  }, [selectedWebsiteId]);

  async function loadIntegrations() {
    if (!selectedWebsiteId) return;
    
    try {
      // Fetch from integrations table (external integrations)
      const { data: externalData, error: externalError } = await supabase
        .from('integrations')
        .select('id, provider, name')
        .eq('website_id', selectedWebsiteId)
        .eq('is_active', true);

      if (externalError) throw externalError;

      // Fetch from integration_connectors table (native integrations like form_hook)
      const { data: nativeData, error: nativeError } = await supabase
        .from('integration_connectors')
        .select('id, integration_type, name, config, status')
        .eq('website_id', selectedWebsiteId)
        .eq('status', 'active');

      if (nativeError) throw nativeError;

      // Map native integrations to same shape (integration_type -> provider)
      const nativeMapped: Integration[] = (nativeData || []).map(native => ({
        id: native.id,
        provider: native.integration_type, // Map integration_type to provider
        name: native.name || adapterRegistry.get(native.integration_type)?.displayName || native.integration_type,
      }));

      // Combine both sources
      setIntegrations([...(externalData || []), ...nativeMapped]);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error('Failed to load integrations');
    }
  }

  // Helper to check if all selected integrations are announcements
  const hasOnlyAnnouncements = () => {
    const selected = integrations.filter(i => selectedIntegrationIds.includes(i.id));
    return selected.length > 0 && selected.every(i => i.provider === 'announcements');
  };

  // Helper to check if form_hook integration is selected
  const hasFormHook = () => {
    const selected = integrations.filter(i => selectedIntegrationIds.includes(i.id));
    return selected.some(i => i.provider === 'form_hook');
  };

  const handleNext = async () => {
    // Special validation before Step 3 (Template Selection)
    if (currentStep === 1) {
      const isValid = await validateSelectedIntegrations();
      if (!isValid) {
        return; // Block progression
      }
    }

    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    // Reset all state
    setCurrentStep(0);
    setSelectedWebsiteId(null);
    setSelectedIntegrationIds([]);
    setIntegrations([]);
    setSelectedTemplate(null);
    setFieldMapping({});
    setTestimonialFilters({
      minRating: 1,
      mediaFilter: 'all',
      onlyVerified: false,
    });
    setSelectedTestimonialIds([]);
    setDisplayMode('filtered');
    setAnnouncementConfig({
      title: '',
      message: '',
      cta_text: '',
      cta_url: '',
      schedule_type: 'instant',
      priority: 50,
      variables: {},
      image_type: 'emoji',
      emoji: '📢',
    });
    setFormCaptureConfig({
      formType: null,
      messageTemplate: '',
      avatar: '✅',
      fieldMappings: {},
    });
    setPriority(50);
    setFrequencyCap({ per_user: 3, per_session: 1, cooldown_seconds: 600 });
    setNeedsConnection(false);
    setConnectionComplete(false);
    setSchedule({
      enabled: false,
      start_date: null,
      end_date: null,
      days_of_week: [],
      time_ranges: [],
    });
    setDisplayRules({
      show_duration_ms: 5000,
      interval_ms: 8000,
      max_per_page: 5,
      max_per_session: 20,
      url_allowlist: [],
      url_denylist: [],
      referrer_allowlist: [],
      referrer_denylist: [],
      triggers: {
        min_time_on_page_ms: 0,
        scroll_depth_pct: 0,
        exit_intent: false,
      },
      enforce_verified_only: false,
      geo_allowlist: [],
      geo_denylist: [],
    });
    onClose();
  };

  const handleConnectNewIntegration = (provider: string) => {
    // Mark that we need connection and proceed to connection step
    setNeedsConnection(true);
    handleNext();
  };

  const handleConnectionComplete = (config?: any) => {
    setConnectionComplete(true);
    // Reload integrations to get the newly connected one
    loadIntegrations();
    toast.success('Integration connected successfully!');
  };

  // Validate that selected integrations exist in database (checks both tables)
  const validateSelectedIntegrations = async (): Promise<boolean> => {
    if (selectedIntegrationIds.length === 0) return false;

    try {
      // Check external integrations table
      const { data: externalData, error: externalError } = await supabase
        .from('integrations')
        .select('id')
        .in('id', selectedIntegrationIds);

      if (externalError) {
        console.error('Error validating external integrations:', externalError);
      }

      // Check native integration_connectors table
      const { data: nativeData, error: nativeError } = await supabase
        .from('integration_connectors')
        .select('id')
        .in('id', selectedIntegrationIds);

      if (nativeError) {
        console.error('Error validating native integrations:', nativeError);
      }

      // Combine found IDs from both tables
      const foundIds = [
        ...(externalData || []).map(d => d.id),
        ...(nativeData || []).map(d => d.id),
      ];

      // Check if all selected integrations exist in either table
      const allFound = selectedIntegrationIds.every(id => foundIds.includes(id));
      
      if (!allFound) {
        toast.error('One or more selected integrations not found. Please reconnect them.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating integrations:', error);
      return false;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!selectedWebsiteId;
      case 1:
        return selectedIntegrationIds.length > 0;
      case 2:
        // Connection step - skip if not needed or already complete
        return !needsConnection || connectionComplete;
      case 3:
        // For form_hook, we use FormCaptureTemplateStep instead
        if (hasFormHook()) {
          return !!formCaptureConfig.formType && formCaptureConfig.messageTemplate.length > 0;
        }
        return !!selectedTemplate;
      case 4:
        // For form_hook, Step 4 is auto-skipped (FormCaptureTemplateStep handles field mapping)
        if (hasFormHook()) {
          return true;
        }
        
        // For announcements, check if title and message are filled
        if (hasOnlyAnnouncements()) {
          return announcementConfig.title.length > 0 && 
                 announcementConfig.message.length > 0;
        }
        
        // For testimonials, check if testimonials are selected or filters applied
        const hasTestimonials = integrations.some(i => i.provider === 'testimonials');
        if (hasTestimonials) {
          if (displayMode === 'specific') {
            return selectedTestimonialIds.length > 0;
          } else {
            return true; // Filtered mode always valid
          }
        }
        
        // For other integrations, check if all required fields are mapped
        // Exclude auto-calculated fields like template.verified and template.rating_stars
        const coreRequiredFields = selectedTemplate?.required_fields.filter(
          f => !['template.verified', 'template.rating_stars'].includes(f)
        ) || [];
        
        // Strict rule for other providers
        return coreRequiredFields.every(
          field => field in fieldMapping && fieldMapping[field]
        );
      case 5:
        return true; // Orchestration always allows proceed
      case 6:
        return true; // Rules always allows proceed
      case 7:
        return false; // Final step, no Next button
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <WebsiteGate
            selectedWebsiteId={selectedWebsiteId}
            onWebsiteSelect={setSelectedWebsiteId}
          />
        );
      
      case 1:
        return (
          <IntegrationSelectionStep
            websiteId={selectedWebsiteId!}
            selectedIntegrations={selectedIntegrationIds}
            onSelectionChange={setSelectedIntegrationIds}
            onConnectNew={handleConnectNewIntegration}
          />
        );
      
      case 2:
        // Connection step - only show if needed
        if (!needsConnection || connectionComplete) {
          // Skip this step, auto-proceed
          if (!connectionComplete) {
            setTimeout(() => handleNext(), 0);
          }
          return (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Integration already connected, proceeding...</p>
            </div>
          );
        }
        
        // Get the first selected integration to determine which one needs connection
        const firstIntegrationId = selectedIntegrationIds[0];
        const integration = integrations.find(i => i.id === firstIntegrationId);
        
        if (!integration) {
          return (
            <div className="py-12 text-center">
              <p className="text-destructive">Integration not found</p>
            </div>
          );
        }
        
        return (
          <IntegrationConnectionStep
            dataSource={integration.provider}
            onConnectionComplete={handleConnectionComplete}
          />
        );
      
      case 3:
        // For form_hook integrations, show FormCaptureTemplateStep
        if (hasFormHook()) {
          return (
            <FormCaptureTemplateStep
              websiteId={selectedWebsiteId!}
              selectedFormType={formCaptureConfig.formType}
              messageTemplate={formCaptureConfig.messageTemplate}
              avatar={formCaptureConfig.avatar}
              fieldMappings={formCaptureConfig.fieldMappings}
              onFormTypeSelect={(formType) => setFormCaptureConfig(prev => ({ ...prev, formType }))}
              onMessageTemplateChange={(messageTemplate) => setFormCaptureConfig(prev => ({ ...prev, messageTemplate }))}
              onAvatarChange={(avatar) => setFormCaptureConfig(prev => ({ ...prev, avatar }))}
              onFieldMappingsChange={(fieldMappings) => setFormCaptureConfig(prev => ({ ...prev, fieldMappings }))}
            />
          );
        }
        
        return (
          <TemplateSelectionStep
            selectedIntegrations={integrations.filter(i => 
              selectedIntegrationIds.includes(i.id)
            )}
            selectedTemplateId={selectedTemplate?.id || null}
            onTemplateSelect={setSelectedTemplate}
          />
        );
      
      case 4:
        // For form_hook, auto-skip Step 4 (FormCaptureTemplateStep already handles field mapping)
        if (hasFormHook()) {
          setTimeout(() => handleNext(), 0);
          return (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Field mapping configured, proceeding...</p>
            </div>
          );
        }
        
        if (!selectedTemplate) return null;
        
        // Check if all integrations are announcements
        if (hasOnlyAnnouncements()) {
          // Show AnnouncementConfig for native announcement integration
          return (
            <AnnouncementConfig
              config={announcementConfig}
              onChange={setAnnouncementConfig}
              selectedTemplate={selectedTemplate}
            />
          );
        }
        
        // Otherwise show FieldMappingStep for regular integrations
        return (
          <FieldMappingStep
            selectedIntegrations={integrations.filter(i => 
              selectedIntegrationIds.includes(i.id)
            )}
            template={selectedTemplate}
            mapping={fieldMapping}
            onMappingChange={setFieldMapping}
            testimonialFilters={testimonialFilters}
            onTestimonialFiltersChange={setTestimonialFilters}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            selectedTestimonialIds={selectedTestimonialIds}
            onTestimonialIdsChange={setSelectedTestimonialIds}
          />
        );
      
      case 5:
        return (
          <OrchestrationStep
            priority={priority}
            frequencyCap={frequencyCap}
            schedule={schedule}
            onPriorityChange={setPriority}
            onFrequencyCapChange={setFrequencyCap}
            onScheduleChange={setSchedule}
          />
        );
      
      case 6:
        return (
          <RulesTargeting
            rules={displayRules}
            onChange={setDisplayRules}
            campaignType="notification"
            dataSource={integrations[0]?.provider || 'manual'}
          />
        );
      
      case 7:
        return (
          <ReviewActivate
            campaignData={{
              name: campaignName || `${selectedTemplate?.name} Campaign`,
              type: selectedTemplate?.category || 'notification',
              website_id: selectedWebsiteId!,
              template_id: selectedTemplate?.id || null,
              template_mapping: fieldMapping,
              data_sources: selectedIntegrationIds.map(id => {
                const integration = integrations.find(i => i.id === id);
                return {
                  integration_id: id,
                  provider: integration?.provider || '',
                };
              }),
              priority,
              frequency_cap: frequencyCap,
              schedule,
              display_rules: displayRules,
              native_config: hasOnlyAnnouncements()
                ? announcementConfig
                : hasFormHook()
                  ? {
                      form_type: formCaptureConfig.formType,
                      message_template: formCaptureConfig.messageTemplate,
                      avatar: formCaptureConfig.avatar,
                      field_mappings: formCaptureConfig.fieldMappings,
                    }
                  : integrations.some(i => i.provider === 'testimonials')
                    ? { 
                        display_mode: displayMode,
                        testimonial_ids: displayMode === 'specific' ? selectedTestimonialIds : null,
                        testimonial_filters: displayMode === 'filtered' ? testimonialFilters : null
                      }
                    : {},
              integration_settings: hasOnlyAnnouncements()
                ? announcementConfig
                : hasFormHook()
                  ? {
                      form_type: formCaptureConfig.formType,
                      message_template: formCaptureConfig.messageTemplate,
                      avatar: formCaptureConfig.avatar,
                      field_mappings: formCaptureConfig.fieldMappings,
                    }
                  : integrations.some(i => i.provider === 'testimonials')
                    ? { 
                        display_mode: displayMode,
                        testimonial_ids: displayMode === 'specific' ? selectedTestimonialIds : null,
                        testimonial_filters: displayMode === 'filtered' ? testimonialFilters : null
                      }
                    : {},
            }}
            selectedTemplate={selectedTemplate}
            onComplete={() => {
              onComplete();
              handleClose();
            }}
          />
        );
      
      default:
        return null;
    }
  };

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          zIndex: 9999,
          isolation: 'isolate',
        }}
      >
        <DialogHeader>
          <DialogTitle>Create Notification</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep]}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex-1 overflow-y-auto px-1">
          {renderStep()}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
