import { useState } from 'react';
import { useQuickWinTemplates, ProcessedQuickWinTemplate } from '@/hooks/useQuickWinTemplates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, Calendar, Link } from 'lucide-react';

interface QuickWinTemplateSelectorProps {
  businessType: string;
  onSelectTemplate: (template: ProcessedQuickWinTemplate, customMetadata: Record<string, any>, expiresAt?: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickWinTemplateSelector = ({
  businessType,
  onSelectTemplate,
  open,
  onOpenChange
}: QuickWinTemplateSelectorProps) => {
  const { templates, loading, getTemplatesByCategory } = useQuickWinTemplates(businessType);
  const [selectedTemplate, setSelectedTemplate] = useState<ProcessedQuickWinTemplate | null>(null);
  const [customMetadata, setCustomMetadata] = useState<Record<string, any>>({});
  const [expiresAt, setExpiresAt] = useState('');

  const templatesByCategory = getTemplatesByCategory();

  const handleTemplateSelect = (template: ProcessedQuickWinTemplate) => {
    setSelectedTemplate(template);
    setCustomMetadata(template.default_metadata || {});
  };

  const handleMetadataChange = (field: string, value: string) => {
    setCustomMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    if (!selectedTemplate) return;

    onSelectTemplate(
      selectedTemplate, 
      customMetadata, 
      expiresAt || undefined
    );
    
    // Reset state
    setSelectedTemplate(null);
    setCustomMetadata({});
    setExpiresAt('');
    onOpenChange(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'promotion': return '🎉';
      case 'urgency': return '⚡';
      case 'credibility': return '🏆';
      case 'welcome': return '👋';
      case 'feature': return '✨';
      default: return '📢';
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            Loading templates...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Add Quick-Win Event
          </DialogTitle>
          <DialogDescription>
            Choose a template to create engaging proof events that encourage visitor interaction.
          </DialogDescription>
        </DialogHeader>

        {!selectedTemplate ? (
          <div className="space-y-6">
            {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCategoryIcon(category)}</span>
                  <h3 className="font-semibold capitalize">{category}</h3>
                  <Badge variant="outline">{categoryTemplates.length}</Badge>
                </div>
                
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {categoryTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs font-mono bg-muted p-2 rounded">
                          {template.template_message}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.required_fields.map(field => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {templates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No templates available for {businessType} business type.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedTemplate.name}</CardTitle>
                <CardDescription>{selectedTemplate.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-sm bg-muted p-3 rounded mb-4">
                  {selectedTemplate.template_message}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-semibold">Configure Template Fields</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                {selectedTemplate.required_fields.map(field => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field} className="capitalize">
                      {field.replace(/_/g, ' ')}
                    </Label>
                    {field.includes('link') || field.includes('url') ? (
                      <div className="flex items-center gap-2">
                        <Link className="w-4 h-4 text-muted-foreground" />
                        <Input
                          id={field}
                          type="url"
                          value={customMetadata[field] || ''}
                          onChange={(e) => handleMetadataChange(field, e.target.value)}
                          placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                        />
                      </div>
                    ) : field.includes('description') || field.includes('message') ? (
                      <Textarea
                        id={field}
                        value={customMetadata[field] || ''}
                        onChange={(e) => handleMetadataChange(field, e.target.value)}
                        placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={field}
                        value={customMetadata[field] || ''}
                        onChange={(e) => handleMetadataChange(field, e.target.value)}
                        placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires_at" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Expiry Date (Optional)
                </Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no expiry. This quick-win will stop showing after this date.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setSelectedTemplate(null)}
              >
                Back to Templates
              </Button>
              <Button onClick={handleConfirm}>
                Add Quick-Win
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};