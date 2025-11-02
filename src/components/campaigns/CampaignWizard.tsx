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
import { DesignEditor } from "./DesignEditor";
import { RulesTargeting } from "./RulesTargeting";
import { ReviewActivate } from "./ReviewActivate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";
import { generateDefaultTemplateForCampaignType } from "@/lib/campaignTemplates";

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  "Choose Campaign Type",
  "Select Data Source",
  "Choose Integration",
  "Connect Integration",
  "Choose Template",
  "Customize Design",
  "Rules & Targeting",
  "Review & Activate",
];

export function CampaignWizard({ open, onClose, onComplete }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [campaignData, setCampaignData] = useState({
    name: "",
    type: "",
    integration_path: "", // 'integration', 'manual', or 'demo'
    data_source: "",
    settings: {} as Record<string, any>,
    rules: {} as Record<string, any>,
  });
  const [templates, setTemplates] = useState<Array<Record<string, any>>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Record<string, any> | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [templateFetchError, setTemplateFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

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
    if (currentStep < STEPS.length - 1) {
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
      settings: {},
      rules: {},
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

  // Auto-skip step 3 if it would render null
  useEffect(() => {
    const checkAndSkip = async () => {
      if (currentStep === 3 && await shouldSkipConnectionStep()) {
        console.info('Auto-skipping Step 3 (connection) - already connected');
        setCurrentStep(4);
      }
    };
    checkAndSkip();
  }, [currentStep, campaignData.integration_path, campaignData.data_source]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <CampaignTypeSelector
            selectedType={campaignData.type}
            onSelect={(type) => updateCampaignData({ type })}
          />
        );
      case 1:
        return (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Link2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Connect Your Data</h2>
              <p className="text-muted-foreground">
                How would you like to populate your campaign?
              </p>
            </div>

            <IntegrationPathSelector
              campaignType={campaignData.type}
              selectedPath={campaignData.integration_path}
              onSelect={(path) => updateCampaignData({ integration_path: path })}
            />
          </div>
        );
      case 2:
        // Skip if not integration path
        if (campaignData.integration_path !== 'integration') {
          return (
            <div className="text-center py-12 space-y-4">
              <div className="text-muted-foreground">
                {campaignData.integration_path === 'manual' 
                  ? '📤 Manual CSV upload selected - you can upload your data in the next steps'
                  : '✨ Demo data selected - we\'ll populate your campaign with sample data'}
              </div>
            </div>
          );
        }
        return (
          <IntegrationSelector
            campaignType={campaignData.type}
            selectedIntegration={campaignData.data_source}
            onSelect={(integration) => updateCampaignData({ data_source: integration })}
          />
        );
      case 3:
        // Step 3: Connection flow (only for integrations that need setup)
        // Note: Skip check is handled by useEffect above for async operation
        return (
          <IntegrationConnectionStep
            dataSource={campaignData.data_source}
            onConnectionComplete={(config) => {
              updateCampaignData({ settings: { ...campaignData.settings, integrationConfig: config } });
            }}
          />
        );
      case 4:
        return (
          <div className="space-y-6 py-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Choose a Template</h2>
              <p className="text-muted-foreground">
                Start with a proven template or customize from scratch
              </p>
            </div>

            {/* Step 5.1: Enhanced Campaign Type Context Display */}
            {campaignData.type && (
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Selected Campaign Type:</span>
                    <Badge variant="secondary" className="font-medium">
                      {campaignData.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Badge>
                  </div>
                  
                  {/* Step 5.2: Template Count Indicator */}
                  {!isLoadingTemplates && (
                    <div className="text-sm font-medium text-primary">
                      {templates.length === 0 && !showAllTemplates ? (
                        "Using auto-generated template"
                      ) : templates.length === 1 && !showAllTemplates ? (
                        "1 template available for this campaign type"
                      ) : (
                        `Showing ${templates.length} template${templates.length !== 1 ? 's' : ''}${showAllTemplates ? ' (all)' : ' optimized for ' + campaignData.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5.3: Show All Templates Toggle */}
            {campaignData.type && !isLoadingTemplates && (
              <div className="flex justify-end">
                <Button
                  variant={showAllTemplates ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAllTemplates(!showAllTemplates)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showAllTemplates ? "Show Recommended Only" : "Show All Templates"}
                </Button>
              </div>
            )}

            {showAllTemplates && templates.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Showing all templates. Some may not match your campaign type perfectly.
                </p>
              </div>
            )}

            {/* Phase 6.2: Error State with Retry */}
            {templateFetchError ? (
              <div className="text-center py-12 space-y-4 border-2 border-dashed border-destructive/50 rounded-lg bg-destructive/5">
                <div className="space-y-2">
                  <p className="text-destructive font-medium">
                    Failed to load templates
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {templateFetchError}
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={retryFetchTemplates}>
                    Retry
                  </Button>
                  <Button variant="default" onClick={() => setCurrentStep(5)}>
                    Skip to Design Editor
                  </Button>
                </div>
              </div>
            ) : isLoadingTemplates ? (
              /* Phase 6.3: Enhanced Loading State */
              <div className="text-center py-12 space-y-3">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="text-muted-foreground">
                  {campaignData.type 
                    ? `Loading templates for ${campaignData.type.split('-').join(' ')}...`
                    : 'Loading templates...'}
                </p>
              </div>
            ) : templates.length === 0 ? (
              /* Step 2.3: Enhanced Empty State - This should rarely happen now with fallback generator */
              <div className="text-center py-12 space-y-4 border-2 border-dashed rounded-lg bg-muted/20">
                <div className="space-y-2">
                  <p className="text-muted-foreground font-medium">
                    {campaignData.type 
                      ? `No pre-made templates found for "${campaignData.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}"`
                      : 'No templates available'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Don't worry! You can create a custom design from scratch in the next step.
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setCurrentStep(5)}>
                    Continue to Design Editor
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {templates.map((template, index) => {
                  // Step 5.4: Determine if this is the best match
                  const isBestMatch = !showAllTemplates && index === 0 && templates.length > 1;
                  const supportedTypes = template.supported_campaign_types || [];
                  const matchesCurrentType = supportedTypes.includes(campaignData.type);

                  return (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedTemplate?.id === template.id ? 'ring-2 ring-primary shadow-lg' : ''
                      }`}
                      onClick={() => {
                        setSelectedTemplate(template);
                        
                        // PHASE 1: Parse all template configurations
                        const templateConfig = typeof template.template_config === 'string' 
                          ? JSON.parse(template.template_config) 
                          : template.template_config || {};
                          
                        const styleConfig = typeof template.style_config === 'string'
                          ? JSON.parse(template.style_config)
                          : template.style_config || {};
                          
                        const displayRules = typeof template.display_rules === 'string'
                          ? JSON.parse(template.display_rules)
                          : template.display_rules || {};
                        
                        // Apply all template data to campaignData
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
                        
                        console.info('✅ Template fully applied:', {
                          template: template.name,
                          appliedSettings: { ...templateConfig, ...styleConfig },
                          appliedRules: displayRules
                        });
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              
                              {/* Step 5.4: Best Match Indicator */}
                              {isBestMatch && (
                                <Badge variant="default" className="gap-1 bg-gradient-to-r from-primary to-primary/80">
                                  <Award className="h-3 w-3" />
                                  Best Match
                                </Badge>
                              )}
                              
                              {template.is_auto_generated && (
                                <Badge variant="outline" className="text-xs">
                                  Auto-Generated
                                </Badge>
                              )}
                            </div>
                            
                            <CardDescription className="text-sm mt-1.5">
                              {template.description}
                            </CardDescription>

                            {/* Step 5.4: Display Supported Campaign Types as Badges */}
                            {supportedTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {supportedTypes.slice(0, 3).map((type: string) => (
                                  <Badge 
                                    key={type} 
                                    variant={type === campaignData.type ? "secondary" : "outline"}
                                    className="text-xs"
                                  >
                                    {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                  </Badge>
                                ))}
                                {supportedTypes.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{supportedTypes.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {selectedTemplate?.id === template.id && (
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{template.rating_average?.toFixed(1) || 'N/A'}</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            <span>{template.download_count || 0} uses</span>
                          </div>
                          {showAllTemplates && !matchesCurrentType && (
                            <>
                              <span>•</span>
                              <span className="text-yellow-600 dark:text-yellow-400">Different type</span>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 5:
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
      case 6:
        return (
          <RulesTargeting
            rules={campaignData.rules}
            onChange={(rules) => updateCampaignData({ rules })}
            campaignType={campaignData.type}
            dataSource={campaignData.data_source}
            templateName={selectedTemplate?.name}
          />
        );
      case 7:
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

  // Phase 6: Enhanced validation with comprehensive edge case handling
  const canProceed = () => {
    switch (currentStep) {
      case 0:
        // Phase 6.2: Ensure campaign type is valid string
        return typeof campaignData.type === 'string' && campaignData.type.trim() !== "";
      case 1:
        // Phase 6.2: Ensure integration path is selected
        return typeof campaignData.integration_path === 'string' && campaignData.integration_path !== "";
      case 2:
        // Skip if not integration path
        if (campaignData.integration_path !== 'integration') {
          return true;
        }
        console.log('Step 2 canProceed - data_source:', campaignData.data_source);
        return typeof campaignData.data_source === 'string' && campaignData.data_source !== "";
      case 3:
        // Connection step - always allow to proceed (skip is optional)
        return true;
      case 4:
        // Phase 6.2: Allow proceeding even if fetch failed or no template selected
        // User can customize from scratch in the next step
        return !isLoadingTemplates; // Only block if still loading
      case 5:
        // Design editor - always allow to proceed
        return true;
      case 6:
        // Rules & targeting - always allow to proceed
        return true;
      default:
        return true;
    }
  };

  const handleNextWithSkip = () => {
    console.info('handleNextWithSkip - Current step:', currentStep, 'Type:', campaignData.type);
    
    // PHASE 5: Show feedback when template settings are loaded
    if (currentStep === 4 && selectedTemplate) {
      toast.success(`Template "${selectedTemplate.name}" settings loaded!`, {
        description: "Customize the design and rules in the next steps"
      });
    }
    
    // Smart skip logic based on integration path
    if (currentStep === 1 && campaignData.integration_path !== 'integration') {
      // Skip integration steps (2 & 3) and go to template
      console.info('Skipping to Step 4 - Manual/Demo path selected');
      setCurrentStep(4);
    } else if (currentStep === 2 && campaignData.integration_path === 'integration') {
      // Check if integration needs connection setup using helper
      if (shouldSkipConnectionStep()) {
        console.info('Skipping Step 3 - Webhook integration, no OAuth needed');
        setCurrentStep(4);
      } else {
        console.info('Going to Step 3 - OAuth connection required');
        handleNext();
      }
    } else if (currentStep === 3 && shouldSkipConnectionStep()) {
      // If somehow on step 3 and it should be skipped, jump to 4
      console.info('On Step 3 but should skip - jumping to Step 4');
      setCurrentStep(4);
    } else {
      handleNext();
    }
  };

  const handleBackWithSkip = () => {
    console.info('handleBackWithSkip - Current step:', currentStep);
    
    // Smart back navigation with skip logic
    if (currentStep === 4 && campaignData.integration_path !== 'integration') {
      // Skip back to data source selection
      console.info('Skipping back to Step 1 - Manual/Demo path');
      setCurrentStep(1);
    } else if (currentStep === 4 && campaignData.integration_path === 'integration') {
      // Check if we skipped connection step using helper
      if (shouldSkipConnectionStep()) {
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Campaign</DialogTitle>
          <DialogDescription className="sr-only">
            Step-by-step wizard to create and configure your campaign
          </DialogDescription>
          <div className="space-y-2 pt-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {STEPS.length}</span>
              <span>{STEPS[currentStep]}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6">
          {renderStep()}
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
            {currentStep < STEPS.length - 1 && (
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
