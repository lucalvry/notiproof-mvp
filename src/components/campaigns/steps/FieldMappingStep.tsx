import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Layers, Filter, Info } from 'lucide-react';
import { TemplatePreview } from '@/components/templates/TemplatePreview';
import { adapterRegistry } from '@/lib/integrations/AdapterRegistry';
import { extractTemplatePlaceholders, buildTemplateMapping } from '@/lib/templateEngine';
import { TestimonialPicker } from '../native/TestimonialPicker';
import type { TemplateConfig } from '@/lib/templateEngine';
import type { NormalizedField } from '@/lib/integrations/types';

interface FieldMappingStepProps {
  selectedIntegrations: Array<{ id: string; provider: string; name: string; website_id?: string }>;
  template: TemplateConfig;
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
  testimonialFilters?: {
    minRating: number;
    mediaFilter: 'all' | 'text_only' | 'with_image' | 'with_video';
    onlyVerified: boolean;
  };
  onTestimonialFiltersChange?: (filters: any) => void;
  displayMode?: 'specific' | 'filtered';
  onDisplayModeChange?: (mode: 'specific' | 'filtered') => void;
  selectedTestimonialIds?: string[];
  onTestimonialIdsChange?: (ids: string[]) => void;
}

export function FieldMappingStep({
  selectedIntegrations,
  template,
  mapping,
  onMappingChange,
  testimonialFilters = { minRating: 1, mediaFilter: 'all', onlyVerified: false },
  onTestimonialFiltersChange,
  displayMode = 'filtered',
  onDisplayModeChange,
  selectedTestimonialIds = [],
  onTestimonialIdsChange,
}: FieldMappingStepProps) {
  const [availableFields, setAvailableFields] = useState<NormalizedField[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [autoMapped, setAutoMapped] = useState<Set<string>>(new Set());
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  
  const hasTestimonials = selectedIntegrations.some(i => i.provider === 'testimonials');

  useEffect(() => {
    loadAvailableFields();
    extractPlaceholders();
  }, [selectedIntegrations, template]);

  useEffect(() => {
    // Auto-map fields on first load
    if (Object.keys(mapping).length === 0 && availableFields.length > 0 && placeholders.length > 0) {
      performAutoMapping();
    }
    generatePreviewData();
  }, [availableFields, placeholders, mapping]);

  function extractPlaceholders() {
    const extracted = extractTemplatePlaceholders(template.html_template);
    setPlaceholders(extracted);
  }

  function loadAvailableFields() {
    const allFields: NormalizedField[] = [];
    
    // Collect fields from all selected integrations
    selectedIntegrations.forEach(integration => {
      const adapter = adapterRegistry.get(integration.provider);
      if (adapter) {
        const fields = adapter.availableFields();
        
        // For testimonials, always include raw keys for template mapping
        if (integration.provider === 'testimonials') {
          allFields.push(...fields);
          
          // If multiple integrations, also add prefixed variants for UI clarity
          if (selectedIntegrations.length > 1) {
            const prefixedFields = fields.map(field => ({
              ...field,
              key: `${integration.provider}.${field.key}`,
              label: `${integration.name} - ${field.label}`,
            }));
            allFields.push(...prefixedFields);
          }
        } else {
          // For other integrations, use prefixed keys when multiple sources
          const prefixedFields = fields.map(field => ({
            ...field,
            key: selectedIntegrations.length > 1 
              ? `${integration.provider}.${field.key}` 
              : field.key,
            label: selectedIntegrations.length > 1
              ? `${integration.name} - ${field.label}`
              : field.label,
          }));
          allFields.push(...prefixedFields);
        }
      }
    });

    setAvailableFields(allFields);
  }

  function performAutoMapping() {
    const adapterFieldKeys = availableFields.map(f => f.key);
    const autoMapping = buildTemplateMapping(adapterFieldKeys, placeholders);
    
    // Auto-map template.verified without user input (it's auto-calculated)
    if (placeholders.includes('template.verified')) {
      autoMapping['template.verified'] = 'template.verified';
    }
    
    // Auto-map template.rating_stars (it's auto-generated from rating)
    if (placeholders.includes('template.rating_stars') && !autoMapping['template.rating_stars']) {
      autoMapping['template.rating_stars'] = 'template.rating_stars';
    }
    
    const mapped = new Set(Object.keys(autoMapping));
    setAutoMapped(mapped);
    onMappingChange(autoMapping);
  }

  function generatePreviewData() {
    const preview: Record<string, any> = {};
    
    // Generate sample data based on mapping
    Object.entries(mapping).forEach(([placeholder, fieldKey]) => {
      const field = availableFields.find(f => f.key === fieldKey);
      if (field) {
        preview[placeholder] = field.example || field.label;
      }
    });

    setPreviewData(preview);
  }

  const handleFieldChange = (placeholder: string, fieldKey: string) => {
    const newMapping = { ...mapping, [placeholder]: fieldKey };
    onMappingChange(newMapping);
    setAutoMapped(prev => {
      const next = new Set(prev);
      next.delete(placeholder);
      return next;
    });
  };

  const getMappingStatus = (placeholder: string) => {
    const isRequired = template.required_fields.includes(placeholder);
    const isMapped = placeholder in mapping && mapping[placeholder];
    
    if (!isMapped && isRequired) return 'error';
    if (!isMapped && !isRequired) return 'warning';
    return 'success';
  };

  const getFieldByKey = (key: string) => {
    return availableFields.find(f => f.key === key);
  };

  // Filter required fields to exclude auto-calculated fields
  const coreRequiredFields = template.required_fields.filter(
    f => !['template.verified', 'template.rating_stars'].includes(f)
  );

  const allRequiredMapped = coreRequiredFields.every(
    field => field in mapping && mapping[field]
  );

  // Categorize fields for tabs
  const autoMappedFields = placeholders.filter(p => mapping[p] && autoMapped.has(p));
  const needsReviewFields = placeholders.filter(p => {
    const isRequired = coreRequiredFields.includes(p);
    const isMapped = p in mapping && mapping[p];
    return isRequired && !isMapped;
  });
  const advancedFields = placeholders.filter(p => !autoMapped.has(p) || !mapping[p]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Map Template Fields</h3>
        <p className="text-sm text-muted-foreground">
          Most fields are auto-mapped. Review and adjust if needed.
        </p>
      </div>

      {selectedIntegrations.length > 1 && (
        <Alert>
          <Layers className="h-4 w-4" />
          <AlertDescription>
            You have {selectedIntegrations.length} integrations selected. 
            You can map fields from any of them to create a unified notification.
          </AlertDescription>
        </Alert>
      )}

      {!allRequiredMapped && needsReviewFields.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {needsReviewFields.length} required field{needsReviewFields.length > 1 ? 's' : ''} need{needsReviewFields.length === 1 ? 's' : ''} mapping
          </AlertDescription>
        </Alert>
      )}

      {allRequiredMapped && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            ✅ All required fields are mapped! You can proceed or fine-tune in Advanced tab.
          </AlertDescription>
        </Alert>
      )}

      {hasTestimonials && onDisplayModeChange && onTestimonialIdsChange && (
        <TestimonialPicker
          websiteId={selectedIntegrations[0]?.website_id || ''}
          displayMode={displayMode}
          selectedTestimonialIds={selectedTestimonialIds}
          onDisplayModeChange={onDisplayModeChange}
          onTestimonialIdsChange={onTestimonialIdsChange}
          testimonialFilters={testimonialFilters}
          onFiltersChange={onTestimonialFiltersChange || (() => {})}
        />
      )}

      <Tabs defaultValue={needsReviewFields.length > 0 ? 'review' : 'auto'} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="auto">
            ✅ Auto-Mapped ({autoMappedFields.length})
          </TabsTrigger>
          <TabsTrigger value="review" className={needsReviewFields.length > 0 ? 'text-destructive' : ''}>
            {needsReviewFields.length > 0 ? '⚠️' : '✓'} Review ({needsReviewFields.length})
          </TabsTrigger>
          <TabsTrigger value="advanced">
            🔧 Advanced ({advancedFields.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="auto" className="mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Successfully Auto-Mapped
                </h4>
                <p className="text-sm text-muted-foreground">
                  These fields were automatically mapped based on their names
                </p>
              </div>
              
              {autoMappedFields.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No fields were auto-mapped. Check the Review tab.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {autoMappedFields.map(placeholder => {
                    const currentMapping = mapping[placeholder];
                    const field = getFieldByKey(currentMapping);
                    
                    return (
                      <div key={placeholder} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm">{placeholder}</span>
                            <Badge variant="secondary" className="text-xs">Auto</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            → {field?.label || currentMapping}
                          </div>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="review" className="mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1 flex items-center gap-2">
                  {needsReviewFields.length > 0 ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  Review Required Fields
                </h4>
                <p className="text-sm text-muted-foreground">
                  {needsReviewFields.length > 0 
                    ? 'Map these required fields to proceed'
                    : 'All required fields are mapped!'}
                </p>
              </div>

              {needsReviewFields.length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    ✅ All required fields are properly mapped. You're good to go!
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {needsReviewFields.map(placeholder => {
                    const status = getMappingStatus(placeholder);
                    const currentMapping = mapping[placeholder];

                    return (
                      <div key={placeholder} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex-1">
                            {placeholder}
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Required
                            </Badge>
                          </Label>
                          {status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>

                        <Select
                          value={currentMapping || '__none__'}
                          onValueChange={(value) => {
                            const mappedValue = value === '__none__' ? '' : value;
                            handleFieldChange(placeholder, mappedValue);
                          }}
                        >
                          <SelectTrigger className={status === 'error' ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Select a field..." />
                          </SelectTrigger>
                          <SelectContent 
                            position="popper"
                            className="z-[9999] bg-popover text-popover-foreground border-border shadow-lg max-h-[300px]"
                            sideOffset={4}
                          >
                            <SelectItem value="__none__">None</SelectItem>
                            {availableFields.map(field => (
                              <SelectItem key={field.key} value={field.key}>
                                <div className="flex items-center gap-2">
                                  <span>{field.label}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {field.type}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {currentMapping && getFieldByKey(currentMapping) && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <div>
                              <div>{getFieldByKey(currentMapping)?.description}</div>
                              {getFieldByKey(currentMapping)?.example && (
                                <div className="mt-1 font-mono text-xs">
                                  Example: {String(getFieldByKey(currentMapping)?.example)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced" className="mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Advanced Mapping</h4>
                <p className="text-sm text-muted-foreground">
                  Manually override any field mappings or map optional fields
                </p>
              </div>

              <div className="space-y-4">
                {placeholders.map(placeholder => {
                  const status = getMappingStatus(placeholder);
                  const isRequired = coreRequiredFields.includes(placeholder);
                  const currentMapping = mapping[placeholder];
                  const isAutoMapped = autoMapped.has(placeholder);
                  const isAutoCalculated = ['template.verified', 'template.rating_stars'].includes(placeholder);

                  return (
                    <div key={placeholder} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="flex-1">
                          {placeholder}
                          {isRequired && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Required
                            </Badge>
                          )}
                          {isAutoMapped && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Auto-mapped
                            </Badge>
                          )}
                          {isAutoCalculated && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Auto-calculated
                            </Badge>
                          )}
                        </Label>
                        {status === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        {status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>

                      <Select
                        value={currentMapping || '__none__'}
                        onValueChange={(value) => {
                          const mappedValue = value === '__none__' ? '' : value;
                          handleFieldChange(placeholder, mappedValue);
                        }}
                        disabled={isAutoCalculated}
                      >
                        <SelectTrigger className={status === 'error' ? 'border-destructive' : ''}>
                          <SelectValue placeholder={isAutoCalculated ? 'Auto-calculated' : 'Select a field...'} />
                        </SelectTrigger>
                        <SelectContent 
                          position="popper"
                          className="z-[9999] bg-popover text-popover-foreground border-border shadow-lg max-h-[300px]"
                          sideOffset={4}
                        >
                          <SelectItem value="__none__">None</SelectItem>
                          {availableFields.map(field => (
                            <SelectItem key={field.key} value={field.key}>
                              <div className="flex items-center gap-2">
                                <span>{field.label}</span>
                                <Badge variant="outline" className="text-xs">
                                  {field.type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {currentMapping && getFieldByKey(currentMapping) && (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <div>{getFieldByKey(currentMapping)?.description}</div>
                            {getFieldByKey(currentMapping)?.example && (
                              <div className="mt-1 font-mono text-xs">
                                Example: {String(getFieldByKey(currentMapping)?.example)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              <TemplatePreview
                template={template}
                showCode={true}
              />
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium mb-2">Mapped Data Preview:</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  {Object.entries(previewData).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-mono">{key}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Tip:</strong> Most fields are auto-mapped intelligently. Only required unmapped fields need your attention.
        </p>
      </div>
    </div>
  );
}