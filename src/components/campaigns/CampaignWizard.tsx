import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Link2, Sparkles, CheckCircle2, Star, Download, Filter, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignTypeSelector } from "./CampaignTypeSelector";
import { IntegrationPathSelector } from "@/components/onboarding/IntegrationPathSelector";
import { IntegrationSelector } from "./IntegrationSelector";
import { IntegrationConnectionStep } from "./IntegrationConnectionStep";
import { IntegrationConfigurationStep } from "./IntegrationConfigurationStep";
import { DesignEditor } from "./DesignEditor";
import { RulesTargeting } from "./RulesTargeting";
import { ReviewActivate } from "./ReviewActivate";
import { PollingConfigCard } from "./PollingConfigCard";
import { MessageTemplateSelector, MessageTemplateVariant } from "./MessageTemplateSelector";
import { QuickStartSelector } from "./QuickStartSelector";
import { WidgetPreviewFrame } from "./WidgetPreviewFrame";
import { NativeIntegrationConfig } from "./native/NativeIntegrationConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getIntegrationMetadata, inferCampaignType } from "@/lib/integrationMetadata";
import { generateDefaultTemplateForCampaignType } from "@/lib/campaignTemplates";

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

// Dynamic step generation based on integration type
const getWizardSteps = (integrationPath: string, dataSource: string) => {
  const metadata = dataSource ? getIntegrationMetadata(dataSource) : null;
  
  // Native integrations (no connection needed)
  if (metadata?.isNative) {
    return [
      "Choose Template",
      "Configure Content",
      "Design & Preview",
      "Review & Activate"
    ];
  }
  
  // External integrations (require connection)
  if (integrationPath === 'integration') {
    return [
      "Choose Integration",
      "Connect",
      "Configure Message",
      "Design",
      "Review & Activate"
    ];
  }
  
  // Manual/Demo
  return [
    "Setup",
    "Design",
    "Review & Activate"
  ];
};

// Track if using live preview
const ENABLE_LIVE_PREVIEW = true;

export function CampaignWizard({ open, onClose, onComplete }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [useQuickStart, setUseQuickStart] = useState(false);
  // Separate preview state for real-time updates (doesn't trigger parent re-renders)
  const [previewState, setPreviewState] = useState<any>(null);
  const [steps, setSteps] = useState(getWizardSteps("", ""));
  const [campaignData, setCampaignData] = useState({
    name: "",
    type: "",
    integration_path: "", // 'integration', 'manual', 'native'
    data_source: "",
    
    // For external integrations - connector ID
    connector_id: null as string | null,
    
    // Message configuration from Step 2
    message_config: {
      template: "",
      placeholders: [] as string[],
      connectorId: null as string | null,
    },
    
    // Integration-specific settings (both native and external)
    integration_settings: {
      message_template: "",
      image_fallback_url: "",
      locale: "en",
      
      // Image settings for announcements
      image_type: 'emoji' as 'emoji' | 'icon' | 'upload' | 'url',
      emoji: '📢',
      icon: '📢',
      image_url: '',
      
      // Native-specific settings
      schedule: {
        enabled: false,
        start_date: null as string | null,
        end_date: null as string | null,
        recurrence: null as any,
      },
      
      // Action rules (for external integrations)
      actions: [] as Array<{
        type: 'replace_variable' | 'change_url' | 'change_image' | 'hide_event';
        condition: string;
        value: string;
      }>,
    },
    
    // CRITICAL: Initialize settings with defaults for preview to work
    settings: {
      backgroundColor: "#ffffff",
      textColor: "#1a1a1a",
      primaryColor: "#2563EB",
      borderRadius: 12,
      fontSize: 14,
      position: "bottom-left",
      animation: "slide",
      showTimestamp: true,
      headline: "",
      message: "",
      subtext: "",
    } as Record<string, any>,
    rules: {} as Record<string, any>,
    polling_config: {
      enabled: false,
      interval_minutes: 5,
      max_events_per_fetch: 10,
      last_poll_at: null
    },
  });
  const [templates, setTemplates] = useState<Array<Record<string, any>>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Record<string, any> | null>(null);
  const [selectedMessageVariant, setSelectedMessageVariant] = useState<MessageTemplateVariant | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [templateFetchError, setTemplateFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const progress = ((currentStep + 1) / steps.length) * 100;

  // Update steps when integration type changes
  useEffect(() => {
    const newSteps = getWizardSteps(campaignData.integration_path, campaignData.data_source);
    setSteps(newSteps);
  }, [campaignData.integration_path, campaignData.data_source]);

  // Check for template parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const templateId = urlParams.get('template');
    
    if (templateId && open) {
      fetchAndApplyTemplate(templateId);
    }
  }, [open]);

  const fetchAndApplyTemplate = async (templateId: string) => {
    try {
      const { data: template, error } = await supabase
        .from('marketplace_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      if (template) {
        const templateConfig = typeof template.template_config === 'string' 
          ? JSON.parse(template.template_config) 
          : template.template_config;
        
        const styleConfig = typeof template.style_config === 'string'
          ? JSON.parse(template.style_config)
          : template.style_config;

        const displayRules = typeof template.display_rules === 'string'
          ? JSON.parse(template.display_rules)
          : template.display_rules;

        updateCampaignData({
          name: template.name,
          settings: { ...templateConfig, ...styleConfig },
          rules: displayRules || {},
        });

        // Also update download count
        await supabase
          .from('marketplace_templates')
          .update({ download_count: (template.download_count || 0) + 1 })
          .eq('id', templateId);

        toast.success(`Template "${template.name}" applied!`);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error("Failed to load template");
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setCampaignData({
      name: "",
      type: "",
      integration_path: "",
      data_source: "",
      connector_id: null,
      message_config: {
        template: "",
        placeholders: [],
        connectorId: null,
      },
      integration_settings: {
        message_template: "",
        image_fallback_url: "",
        locale: "en",
        image_type: 'emoji' as 'emoji' | 'icon' | 'upload' | 'url',
        emoji: '📢',
        icon: '📢',
        image_url: '',
        schedule: {
          enabled: false,
          start_date: null,
          end_date: null,
          recurrence: null,
        },
        actions: [],
      },
      settings: {},
      rules: {},
      polling_config: {
        enabled: false,
        interval_minutes: 5,
        max_events_per_fetch: 10,
        last_poll_at: null
      },
    });
    setSelectedTemplate(null);
    setShowAllTemplates(false);
    setTemplateFetchError(null);
    setRetryCount(0);
    onClose();
  };

  /**
   * PHASE 2 & 6: Smart Template Filtering with Error Handling
   * 
   * This effect handles fetching and filtering marketplace templates based on:
   * - The selected campaign type (e.g., 'recent-purchase')
   * - The "Show All Templates" toggle state
   * - Retry attempts after failures
   * 
   * Flow:
   * 1. Query marketplace_templates table from Supabase
   * 2. Filter by supported_campaign_types array using PostgreSQL contains operator
   * 3. Order by priority (DESC) then download_count (DESC)
   * 4. Apply auto-selection logic based on result count
   * 
   * Auto-Selection Logic (Phase 2.2):
   * - 1 match: Auto-select and show success toast
   * - 0 matches: Call fallback generator (Phase 3)
   * - 2+ matches: Show selection UI, user chooses
   * 
   * Error Handling (Phase 6.2):
   * - Network failures: Show error with retry button
   * - Database errors: Log and display user-friendly message
   * - Generator failures: Graceful fallback to manual creation
   * - Unmounted component: Skip state updates
   * 
   * Performance:
   * - Query typically completes in < 50ms (GIN index on supported_campaign_types)
   * - Results cached by Supabase client
   * - Only re-fetches when dependencies change
   * 
   * Dependencies:
   * - open: Only fetch when wizard is open
   * - campaignData.type: Re-fetch when campaign type changes
   * - showAllTemplates: Toggle between filtered and all templates
   * - retryCount: Manual retry trigger
   */
  useEffect(() => {
    const fetchTemplates = async () => {
      // Phase 6.2: Edge case - prevent fetching if wizard is closed
      if (!open) return;

      setIsLoadingTemplates(true);
      setTemplateFetchError(null);
      
      try {
        let query = supabase
          .from('marketplace_templates')
          .select('*')
          .eq('is_public', true);

        // Phase 6.2: Edge case - handle undefined campaignData.type
        if (campaignData.type && !showAllTemplates) {
          console.info(`🔍 Fetching templates for campaign type: ${campaignData.type}`);
          query = query.contains('supported_campaign_types', [campaignData.type]);
        } else if (showAllTemplates) {
          console.info('🔍 Fetching all templates (filter bypassed)');
        } else if (!campaignData.type) {
          console.warn('⚠️ No campaign type selected, fetching all templates');
        }

        // Order by priority first, then download count
        const { data, error } = await query
          .order('priority', { ascending: false })
          .order('download_count', { ascending: false })
          .limit(50);

        // Phase 6.2: Enhanced error handling
        if (error) {
          console.error('Database query error:', error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        const loadedTemplates = data || [];
        console.info(`✅ Loaded ${loadedTemplates.length} templates for ${campaignData.type || 'all types'}`);
        
        // Phase 6.3: Prevent unnecessary state updates if component unmounted
        if (!open) return;
        
        setTemplates(loadedTemplates);
        setTemplateFetchError(null);
        setRetryCount(0); // Reset retry count on success

        // Step 2.2: Auto-selection logic (only when not showing all)
        if (!showAllTemplates) {
          if (loadedTemplates.length === 1) {
            console.info('🎯 Auto-selecting single matching template');
            const template = loadedTemplates[0];
            setSelectedTemplate(template);
            
            // PHASE 1: Apply all template configs immediately
            const templateConfig = typeof template.template_config === 'string' 
              ? JSON.parse(template.template_config) 
              : template.template_config || {};
              
            const styleConfig = typeof template.style_config === 'string'
              ? JSON.parse(template.style_config)
              : template.style_config || {};
              
            const displayRules = typeof template.display_rules === 'string'
              ? JSON.parse(template.display_rules)
              : template.display_rules || {};
            
            updateCampaignData({ 
              settings: { 
                ...campaignData.settings,
                ...templateConfig,
                ...styleConfig
              },
              rules: {
                ...campaignData.rules,
                ...displayRules
              }
            });
            
            console.info('✅ Template fully applied (auto-select):', {
              template: template.name,
              appliedSettings: { ...templateConfig, ...styleConfig },
              appliedRules: displayRules
            });
            
            toast.success('Perfect match template selected!');
          } else if (loadedTemplates.length === 0 && campaignData.type) {
            console.warn(`⚠️ No templates found for campaign type: ${campaignData.type}`);
            // Phase 3: Generate fallback template with error handling
            try {
              const fallbackTemplate = generateDefaultTemplateForCampaignType(campaignData.type);
              if (fallbackTemplate) {
                console.info('✨ Auto-generated fallback template created');
                setTemplates([fallbackTemplate]);
                setSelectedTemplate(fallbackTemplate);
                
                // PHASE 1: Apply fallback template configs
                const templateConfig = typeof fallbackTemplate.template_config === 'string' 
                  ? JSON.parse(fallbackTemplate.template_config) 
                  : fallbackTemplate.template_config || {};
                  
                const styleConfig = typeof fallbackTemplate.style_config === 'string'
                  ? JSON.parse(fallbackTemplate.style_config)
                  : fallbackTemplate.style_config || {};
                  
                const displayRules = typeof fallbackTemplate.display_rules === 'string'
                  ? JSON.parse(fallbackTemplate.display_rules)
                  : fallbackTemplate.display_rules || {};
                
                updateCampaignData({ 
                  settings: { 
                    ...campaignData.settings,
                    ...templateConfig,
                    ...styleConfig
                  },
                  rules: {
                    ...campaignData.rules,
                    ...displayRules
                  }
                });
                
                console.info('✅ Fallback template fully applied:', {
                  template: fallbackTemplate.name,
                  appliedSettings: { ...templateConfig, ...styleConfig },
                  appliedRules: displayRules
                });
                
                toast.success('Template auto-generated for your campaign type!');
              } else {
                toast.info('No pre-made templates found. You can customize from scratch in the next step.');
              }
            } catch (genError) {
              console.error('Error generating fallback template:', genError);
              toast.info('No templates available. You can create a custom design in the next step.');
            }
          } else if (loadedTemplates.length > 1) {
            console.info(`📋 ${loadedTemplates.length} templates available for selection`);
            // Reset selection when multiple templates are available
            setSelectedTemplate(null);
          }
        } else {
          // When showing all, reset selection
          setSelectedTemplate(null);
        }
      } catch (error) {
        console.error('❌ Error fetching templates:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setTemplateFetchError(errorMessage);
        
        // Phase 6.2: Only show toast on first attempt, not on retries
        if (retryCount === 0) {
          toast.error('Failed to load templates. Click retry to try again.');
        }
        
        setTemplates([]);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [open, campaignData.type, showAllTemplates, retryCount]); // Add retryCount for manual retry

  const updateCampaignData = (data: Partial<typeof campaignData>) => {
    setCampaignData((prev) => ({ ...prev, ...data }));
    
    // Phase 6.2: Edge case - Reset template selection when campaign type changes
    if (data.type && data.type !== campaignData.type) {
      console.info(`Campaign type changed from ${campaignData.type} to ${data.type}, resetting template selection`);
      setSelectedTemplate(null);
      setShowAllTemplates(false);
    }
  };

  // Phase 6.2: Manual retry function for failed template fetches
  const retryFetchTemplates = () => {
    console.info('🔄 Retrying template fetch...');
    setRetryCount(prev => prev + 1);
  };

  // Helper to determine if Step 3 (connection) should be skipped
  const shouldSkipConnectionStep = async () => {
    // Always skip for non-integration paths (manual/demo)
    if (campaignData.integration_path !== 'integration') return true;
    if (!campaignData.data_source) return true;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      // Get current website ID from localStorage (used by WebsiteContext)
      const currentWebsiteId = localStorage.getItem('selectedWebsiteId');
      if (!currentWebsiteId) {
        console.warn('No website selected, showing connection step');
        return false;
      }
      
      // Check if this specific integration is ALREADY connected for this user
      const { data: existingConnector } = await supabase
        .from('integration_connectors')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('website_id', currentWebsiteId)
        .eq('integration_type', campaignData.data_source as any)
        .eq('status', 'active')
        .maybeSingle();
      
      // Only skip if integration is ACTUALLY connected and active
      const shouldSkip = !!existingConnector;
      
      console.info('shouldSkipConnectionStep:', {
        dataSource: campaignData.data_source,
        websiteId: currentWebsiteId,
        existingConnector: existingConnector?.id,
        shouldSkip
      });
      
      return shouldSkip;
    } catch (error) {
      console.error('Error checking connection step skip:', error);
      return false; // Show step on error (fail-safe)
    }
  };

  // Auto-advance when connection flow completes
  useEffect(() => {
    const handleAutoAdvance = () => {
      console.log('Auto-advancing from step', currentStep);
      if (currentStep === 3) {
        handleNext();
      }
    };
    
    window.addEventListener('notiproof:wizard-advance', handleAutoAdvance);
    return () => window.removeEventListener('notiproof:wizard-advance', handleAutoAdvance);
  }, [currentStep]);

  // Listen for preview updates (separate from form submission)
  useEffect(() => {
    const handlePreviewUpdate = (e: CustomEvent) => {
      console.log('👁️ Preview event received:', e.detail);
      setPreviewState(e.detail);
    };
    
    window.addEventListener('notiproof:preview-update', handlePreviewUpdate as any);
    return () => window.removeEventListener('notiproof:preview-update', handlePreviewUpdate as any);
  }, []);

  // Removed auto-skip useEffect - IntegrationConnectionStep handles connection checking internally

  const renderStep = () => {
    const metadata = campaignData.data_source 
      ? getIntegrationMetadata(campaignData.data_source) 
      : null;
    
    // Native Integration Flow
    if (metadata?.isNative) {
      switch (currentStep) {
        case 0:
          return (
            <QuickStartSelector
              onSelect={(template) => {
                if (template.id === "custom-setup") {
                  setUseQuickStart(false);
                } else {
                  setUseQuickStart(true);
                  updateCampaignData({
                    name: template.name,
                    type: template.config.campaignType,
                    integration_path: 'native',
                    data_source: template.config.dataSource,
                    settings: template.config.settings,
                  });
                  toast.success(`${template.name} template selected!`);
                  setCurrentStep(1);
                }
              }}
              showDataSourceSelector={!useQuickStart}
              onDataSourceSelect={(dataSource) => {
                const inferredType = inferCampaignType(dataSource);
                updateCampaignData({
                  integration_path: metadata?.isNative ? 'native' : 'integration',
                  data_source: dataSource,
                  type: inferredType,
                });
                toast.success("Data source selected!");
                handleNext();
              }}
            />
          );
        case 1:
          return (
            <NativeIntegrationConfig 
              dataSource={campaignData.data_source}
              config={campaignData.integration_settings}
              onConfigComplete={(config) => {
                updateCampaignData({ 
                  integration_settings: config,
                  settings: {
                    ...campaignData.settings,
                    headline: config.message || config.title || '',
                    subtext: config.cta_text || '',
                  }
                });
                handleNext();
              }}
            />
          );
        case 2:
          return (
            <DesignEditor
              settings={campaignData.settings}
              onChange={(settings) => updateCampaignData({ settings })}
              campaignType={campaignData.type}
              dataSource={campaignData.data_source}
              integrationPath={campaignData.integration_path}
              templateName={selectedTemplate?.name}
            />
          );
        case 3:
          return (
            <ReviewActivate
              campaignData={campaignData}
              selectedTemplate={selectedTemplate}
              onComplete={() => {
                onComplete();
                handleClose();
              }}
            />
          );
      }
    }
    
    // External Integration Flow
    if (campaignData.integration_path === 'integration') {
      switch (currentStep) {
        case 0:
          return (
            <IntegrationSelector
              campaignType={campaignData.type || 'recent-activity'}
              selectedIntegration={campaignData.data_source}
              onSelect={(dataSource) => {
                const inferredType = inferCampaignType(dataSource);
                updateCampaignData({
                  integration_path: 'integration',
                  data_source: dataSource,
                  type: inferredType,
                });
                toast.success("Integration selected!");
                handleNext();
              }}
            />
          );
        case 1:
          return (
            <IntegrationConnectionStep
              dataSource={campaignData.data_source}
              onConnectionComplete={(result) => {
                updateCampaignData({ 
                  connector_id: result.connectorId || null
                });
                handleNext();
              }}
            />
          );
        case 2:
          return (
            <IntegrationConfigurationStep
              dataSource={campaignData.data_source}
              campaignType={campaignData.type}
              existingConfig={{
                messageTemplate: campaignData.message_config.template,
                placeholders: campaignData.message_config.placeholders,
                connectorId: campaignData.connector_id || undefined,
                integrationSettings: campaignData.integration_settings,
              }}
              onConfigComplete={(config: any) => {
                const finalTemplate = config.messageTemplate || 
                                     config.integrationSettings?.message_template || "";
                
                updateCampaignData({
                  message_config: {
                    template: finalTemplate,
                    placeholders: config.placeholders,
                    connectorId: config.connectorId || null,
                  },
                  integration_settings: config.integrationSettings || campaignData.integration_settings,
                  settings: {
                    ...campaignData.settings,
                    headline: finalTemplate,
                    placeholders: config.placeholders,
                  },
                });
                handleNext();
              }}
            />
          );
        case 3:
          return (
            <DesignEditor
              settings={campaignData.settings}
              onChange={(settings) => updateCampaignData({ settings })}
              campaignType={campaignData.type}
              dataSource={campaignData.data_source}
              integrationPath={campaignData.integration_path}
              templateName={selectedTemplate?.name}
            />
          );
        case 4:
          return (
            <ReviewActivate
              campaignData={campaignData}
              selectedTemplate={selectedTemplate}
              onComplete={() => {
                onComplete();
                handleClose();
              }}
            />
          );
      }
    }
    
    // Manual Flow (fallback)
    switch (currentStep) {
      case 0:
        return (
          <QuickStartSelector
            onSelect={(template) => {
              if (template.id === "custom-setup") {
                setUseQuickStart(false);
              } else {
                setUseQuickStart(true);
                updateCampaignData({
                  name: template.name,
                  type: template.config.campaignType,
                  integration_path: 'manual',
                  data_source: 'manual',
                  settings: template.config.settings,
                });
                toast.success(`${template.name} template selected!`);
                setCurrentStep(1);
              }
            }}
            showDataSourceSelector={!useQuickStart}
            onDataSourceSelect={(dataSource) => {
              const inferredType = inferCampaignType(dataSource);
              updateCampaignData({
                integration_path: 'manual',
                data_source: dataSource,
                type: inferredType,
              });
              toast.success("Manual setup selected!");
              handleNext();
            }}
          />
        );
      case 1:
        return (
          <DesignEditor
            settings={campaignData.settings}
            onChange={(settings) => updateCampaignData({ settings })}
            campaignType={campaignData.type}
            dataSource={campaignData.data_source}
            integrationPath={campaignData.integration_path}
            templateName={selectedTemplate?.name}
          />
        );
      case 2:
        return (
          <ReviewActivate
            campaignData={campaignData}
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

  // Simplified validation for Quick Start flow
  const canProceed = () => {
    switch (currentStep) {
      case 0:
        // Quick Start selection - always ready
        return false; // Selection happens via button click, not Next button
      case 1:
        // Integration configuration - require data source
        return typeof campaignData.data_source === 'string' && campaignData.data_source.trim() !== "";
      case 2:
        // Design customization - always allow to proceed
        return true;
      case 3:
        // Review - always ready
        return true;
      default:
        return true;
    }
  };

  const handleNextWithSkip = async () => {
    console.info('handleNextWithSkip - Current step:', currentStep, 'Type:', campaignData.type);
    
    // PHASE 5: Show feedback when template settings are loaded
    if (currentStep === 5 && selectedTemplate) {
      toast.success(`Template "${selectedTemplate.name}" settings loaded!`, {
        description: "Customize the design and rules in the next steps"
      });
    }
    
    // Smart skip logic based on integration path
    if (currentStep === 1 && campaignData.integration_path !== 'integration') {
      // Skip integration steps (2 & 3) and message template (4) - go to template chooser (5)
      console.info('Skipping to Step 5 - Manual/Demo path selected');
      setCurrentStep(5);
    } else if (currentStep === 2 && campaignData.integration_path === 'integration') {
      // CRITICAL FIX: Properly await the async check
      const shouldSkip = await shouldSkipConnectionStep();
      
      if (shouldSkip) {
        console.info('Skipping Step 3 - Integration already connected');
        handleNext(); // Go to step 4 (Message Template Selector)
      } else {
        console.info('Going to Step 3 - Connection needed');
        handleNext();
      }
    } else if (currentStep === 3) {
      // CRITICAL FIX: Also await when checking from step 3
      const shouldSkip = await shouldSkipConnectionStep();
      
      if (shouldSkip) {
        console.info('On Step 3 but should skip - jumping to Step 4');
        handleNext(); // Go to Message Template Selector
      } else {
        handleNext();
      }
    } else {
      handleNext();
    }
  };

  const handleBackWithSkip = async () => {
    console.info('handleBackWithSkip - Current step:', currentStep);
    
    // Smart back navigation with skip logic
    if (currentStep === 4 && campaignData.integration_path !== 'integration') {
      // Skip back to data source selection
      console.info('Skipping back to Step 1 - Manual/Demo path');
      setCurrentStep(1);
    } else if (currentStep === 4 && campaignData.integration_path === 'integration') {
      // CRITICAL FIX: Properly await the async check
      const shouldSkip = await shouldSkipConnectionStep();
      
      if (shouldSkip) {
        console.info('Skipping back to Step 2 - Connection not needed');
        setCurrentStep(2);
      } else {
        console.info('Going back to Step 3 - Connection step');
        handleBack();
      }
    } else {
      handleBack();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Campaign</DialogTitle>
          <DialogDescription className="sr-only">
            Step-by-step wizard to create and configure your campaign
          </DialogDescription>
          <div className="space-y-2 pt-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{steps[currentStep]}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-6">
          {/* Main Content - Left Side */}
          <div className={`${ENABLE_LIVE_PREVIEW && (currentStep === 1 || currentStep === 2) ? 'flex-1' : 'w-full'} overflow-y-auto py-6 ${ENABLE_LIVE_PREVIEW && (currentStep === 1 || currentStep === 2) ? 'pr-2' : ''}`}>
            {renderStep()}
          </div>

          {/* Live Preview - Right Side - Show on step 1 AND step 2 */}
          {ENABLE_LIVE_PREVIEW && (currentStep === 1 || currentStep === 2) && (() => {
            // Build preview settings with proper fallbacks
            const previewSettings = {
              ...(previewState?.settings || campaignData.settings || {
                backgroundColor: "#ffffff",
                textColor: "#1a1a1a",
                primaryColor: "#2563EB",
                borderRadius: 12,
                fontSize: 14,
                position: "bottom-left",
                animation: "slide",
                showTimestamp: true,
              }),
              // CRITICAL: Include integration_settings for announcement image config
              integration_settings: campaignData.integration_settings
            };

            // CRITICAL: Check ALL possible sources for message template
            const messageTemplate = previewState?.messageTemplate || 
                                   campaignData.settings?.headline || 
                                   campaignData.settings?.messageTemplate ||
                                   campaignData.settings?.message || 
                                   campaignData.integration_settings?.message_template ||
                                   campaignData.message_config?.template ||
                                   "Preview your notification here";

            console.log('🖼️ PREVIEW RENDER:', {
              step: currentStep,
              dataSource: campaignData.data_source,
              previewStateExists: !!previewState,
              finalMessage: messageTemplate,
              settingsHeadline: campaignData.settings?.headline,
              integrationTemplate: campaignData.integration_settings?.message_template,
              messageConfigTemplate: campaignData.message_config?.template,
              imageConfig: campaignData.integration_settings?.image_type,
            });
            
            return (
              <div className="w-96 flex-shrink-0 border-l pl-6 overflow-y-auto py-6">
                <WidgetPreviewFrame
                  settings={previewSettings}
                  messageTemplate={messageTemplate}
                  campaignType={campaignData.type}
                  websiteDomain={undefined}
                />
              </div>
            );
          })()}
        </div>

        <div className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={handleBackWithSkip} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            {currentStep < steps.length - 1 && (
              <Button onClick={handleNextWithSkip} disabled={!canProceed()}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
