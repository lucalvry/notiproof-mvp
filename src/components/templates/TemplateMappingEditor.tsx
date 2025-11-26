import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { extractTemplatePlaceholders, buildTemplateMapping } from '@/lib/templateEngine';
import type { NormalizedField } from '@/lib/integrations/types';

interface TemplateMappingEditorProps {
  templateHtml: string;
  requiredFields: string[];
  availableFields: NormalizedField[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

export function TemplateMappingEditor({
  templateHtml,
  requiredFields,
  availableFields,
  mapping,
  onMappingChange,
}: TemplateMappingEditorProps) {
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [autoMapped, setAutoMapped] = useState<Set<string>>(new Set());

  useEffect(() => {
    const extracted = extractTemplatePlaceholders(templateHtml);
    setPlaceholders(extracted);

    // Auto-map on first load if mapping is empty
    if (Object.keys(mapping).length === 0) {
      const adapterFieldKeys = availableFields.map(f => f.key);
      const autoMapping = buildTemplateMapping(adapterFieldKeys, extracted);
      
      // Auto-map template.verified without user input (it's auto-calculated)
      if (extracted.includes('template.verified')) {
        autoMapping['template.verified'] = 'template.verified';
      }
      
      // Auto-map template.rating_stars (it's auto-generated from rating)
      if (extracted.includes('template.rating_stars') && !autoMapping['template.rating_stars']) {
        autoMapping['template.rating_stars'] = 'template.rating_stars';
      }
      
      const mapped = new Set(Object.keys(autoMapping));
      setAutoMapped(mapped);
      onMappingChange(autoMapping);
    }
  }, [templateHtml]);

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
    // Exclude auto-calculated fields from validation
    const coreRequiredFields = requiredFields.filter(
      f => !['template.verified', 'template.rating_stars'].includes(f)
    );
    const isRequired = coreRequiredFields.includes(placeholder);
    const isMapped = placeholder in mapping && mapping[placeholder];
    
    if (!isMapped && isRequired) return 'error';
    if (!isMapped && !isRequired) return 'warning';
    return 'success';
  };

  const getFieldByKey = (key: string) => {
    return availableFields.find(f => f.key === key);
  };

  // Exclude auto-calculated fields from required validation
  const coreRequiredFields = requiredFields.filter(
    f => !['template.verified', 'template.rating_stars'].includes(f)
  );

  const allRequiredMapped = coreRequiredFields.every(
    field => field in mapping && mapping[field]
  );

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-1">Field Mapping</h4>
          <p className="text-sm text-muted-foreground">
            Map template placeholders to integration fields
          </p>
        </div>

        {!allRequiredMapped && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please map all required fields to proceed
            </AlertDescription>
          </Alert>
        )}

        {allRequiredMapped && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              All required fields are mapped
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
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
  );
}
