import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Layers, Filter } from 'lucide-react';
import { TemplateMappingEditor } from '@/components/templates/TemplateMappingEditor';
import { TemplatePreview } from '@/components/templates/TemplatePreview';
import { adapterRegistry } from '@/lib/integrations/AdapterRegistry';
import type { TemplateConfig } from '@/lib/templateEngine';
import type { NormalizedField } from '@/lib/integrations/types';

interface FieldMappingStepProps {
  selectedIntegrations: Array<{ id: string; provider: string; name: string }>;
  template: TemplateConfig;
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
  testimonialFilters?: {
    minRating: number;
    mediaFilter: 'all' | 'text_only' | 'with_image' | 'with_video';
    onlyVerified: boolean;
  };
  onTestimonialFiltersChange?: (filters: any) => void;
}

export function FieldMappingStep({
  selectedIntegrations,
  template,
  mapping,
  onMappingChange,
  testimonialFilters = { minRating: 1, mediaFilter: 'all', onlyVerified: false },
  onTestimonialFiltersChange,
}: FieldMappingStepProps) {
  const [availableFields, setAvailableFields] = useState<NormalizedField[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  
  const hasTestimonials = selectedIntegrations.some(i => i.provider === 'testimonials');

  useEffect(() => {
    loadAvailableFields();
    generatePreviewData();
  }, [selectedIntegrations, mapping]);

  function loadAvailableFields() {
    const allFields: NormalizedField[] = [];
    
    // Collect fields from all selected integrations
    selectedIntegrations.forEach(integration => {
      const adapter = adapterRegistry.get(integration.provider);
      if (adapter) {
        const fields = adapter.availableFields();
        // Prefix fields with integration name for clarity when multiple sources
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
    });

    setAvailableFields(allFields);
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

  const allRequiredMapped = template.required_fields.every(
    field => field in mapping && mapping[field]
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Map Template Fields</h3>
        <p className="text-sm text-muted-foreground">
          Connect template placeholders to your integration data
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

      {!allRequiredMapped && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please map all required fields before continuing
          </AlertDescription>
        </Alert>
      )}

      {allRequiredMapped && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            All required fields mapped! Review the preview and continue.
          </AlertDescription>
        </Alert>
      )}

      {hasTestimonials && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Testimonial Filters
            </CardTitle>
            <CardDescription>
              Choose which testimonials to display in your campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Minimum Rating</Label>
              <Select 
                value={String(testimonialFilters.minRating)} 
                onValueChange={(v) => onTestimonialFiltersChange?.({ 
                  ...testimonialFilters, 
                  minRating: Number(v) 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <SelectItem key={rating} value={String(rating)}>
                      {rating} Star{rating > 1 ? 's' : ''} & Above ⭐
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Media Type</Label>
              <Select 
                value={testimonialFilters.mediaFilter} 
                onValueChange={(v) => onTestimonialFiltersChange?.({ 
                  ...testimonialFilters, 
                  mediaFilter: v 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Testimonials</SelectItem>
                  <SelectItem value="text_only">Text Only</SelectItem>
                  <SelectItem value="with_image">With Image</SelectItem>
                  <SelectItem value="with_video">With Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="verified" 
                checked={testimonialFilters.onlyVerified}
                onCheckedChange={(checked) => onTestimonialFiltersChange?.({ 
                  ...testimonialFilters, 
                  onlyVerified: checked === true 
                })}
              />
              <Label htmlFor="verified" className="text-sm font-normal cursor-pointer">
                Show only verified purchases
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="mapping" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="mapping" className="mt-4">
          <TemplateMappingEditor
            templateHtml={template.html_template}
            requiredFields={template.required_fields}
            availableFields={availableFields}
            mapping={mapping}
            onMappingChange={onMappingChange}
          />
        </TabsContent>
        
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
          💡 <strong>Tip:</strong> Field mapping allows you to customize how data from your integrations 
          appears in notifications. Required fields must be mapped to proceed.
        </p>
      </div>
    </div>
  );
}
