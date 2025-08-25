import { useState, useEffect } from 'react';
import { FieldSchema, QuickWinFormData } from '@/types/quickWin';
import { useQuickWinTemplates } from '@/hooks/useQuickWinTemplates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Zap, Calendar, TrendingUp, Star, Sparkles, Info, Crown } from 'lucide-react';

interface EnhancedQuickWinTemplateSelectorProps {
  businessType: string;
  onSelectTemplate: (formData: QuickWinFormData) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EnhancedQuickWinTemplateSelector = ({
  businessType,
  onSelectTemplate,
  open,
  onOpenChange
}: EnhancedQuickWinTemplateSelectorProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [expiresAt, setExpiresAt] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { templates, loading } = useQuickWinTemplates(businessType);
  const categories = Array.from(new Set(templates.map(t => t.category)));

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setFormData(template.default_metadata || {});
    setFormErrors({});
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error for this field
    if (formErrors[fieldName]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateField = (fieldName: string, field: FieldSchema, value: any): string | null => {
    if (field.required && (!value || value === '')) {
      return `${field.label} is required`;
    }

    if (!value) return null;

    const { validation } = field;
    if (!validation) return null;

    switch (field.type) {
      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) return `${field.label} must be a number`;
        if (validation.min !== undefined && numValue < validation.min) {
          return `${field.label} must be at least ${validation.min}`;
        }
        if (validation.max !== undefined && numValue > validation.max) {
          return `${field.label} must be at most ${validation.max}`;
        }
        break;

      case 'text':
      case 'textarea':
        if (validation.minLength && value.length < validation.minLength) {
          return `${field.label} must be at least ${validation.minLength} characters`;
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          return `${field.label} must be at most ${validation.maxLength} characters`;
        }
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          return `${field.label} format is invalid`;
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return `${field.label} must be a valid URL`;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `${field.label} must be a valid email`;
        }
        break;
    }

    return null;
  };

  const validateForm = (): boolean => {
    if (!selectedTemplate) return false;

    const errors: Record<string, string> = {};
    
    // Parse required_fields if it's from database
    const requiredFields = selectedTemplate.required_fields || [];
    const formSchema: Record<string, FieldSchema> = {};
    
    requiredFields.forEach((fieldName: string) => {
      formSchema[fieldName] = {
        type: 'text',
        label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' '),
        required: true
      };
    });
    
    Object.entries(formSchema).forEach(([fieldName, field]) => {
      const error = validateField(fieldName, field, formData[fieldName]);
      if (error) {
        errors[fieldName] = error;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirm = () => {
    if (!selectedTemplate || !validateForm()) return;

    const submitData: QuickWinFormData = {
      templateId: selectedTemplate.id,
      fieldValues: formData,
      expiresAt: expiresAt || undefined,
      customization: {
        style: 'notification',
        theme: 'default'
      }
    };

    onSelectTemplate(submitData);
    
    // Reset state
    setSelectedTemplate(null);
    setFormData({});
    setExpiresAt('');
    setFormErrors({});
    setSearchTerm('');
    setActiveCategory('all');
    onOpenChange(false);
  };

  const renderField = (fieldName: string, field: FieldSchema) => {
    const value = formData[fieldName] || '';
    const error = formErrors[fieldName];

    // Check conditional rendering
    if (field.dependsOn && field.showWhen) {
      const dependencyValue = formData[field.dependsOn];
      if (dependencyValue !== field.showWhen) {
        return null;
      }
    }

    const baseProps = {
      id: fieldName,
      value,
      onChange: (e: any) => handleFieldChange(fieldName, e.target?.value || e),
      className: error ? 'border-destructive' : ''
    };

    return (
      <div key={fieldName} className="space-y-2">
        <Label htmlFor={fieldName} className="flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
        </Label>
        
        {field.type === 'select' ? (
          <Select value={value} onValueChange={(val) => handleFieldChange(fieldName, val)}>
            <SelectTrigger className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.validation?.options?.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'textarea' ? (
          <Textarea
            {...baseProps}
            placeholder={field.placeholder}
            rows={3}
          />
        ) : field.type === 'boolean' ? (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value}
              onCheckedChange={(checked) => handleFieldChange(fieldName, checked)}
            />
            <span className="text-sm">{field.placeholder || 'Enable this option'}</span>
          </div>
        ) : (
          <Input
            {...baseProps}
            type={field.type}
            placeholder={field.placeholder}
          />
        )}
        
        {field.helpText && (
          <p className="text-xs text-muted-foreground">{field.helpText}</p>
        )}
        
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
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

  const getPerformanceColor = (score: number) => {
    if (score >= 15) return 'text-green-600';
    if (score >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Enhanced Quick-Win Templates
          </DialogTitle>
          <DialogDescription>
            Choose from our performance-optimized templates designed for {businessType} businesses.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <p>Loading templates...</p>
            </div>
          ) : !selectedTemplate ? (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex gap-4">
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>

              <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {categories.slice(0, 4).map(category => (
                    <TabsTrigger key={category} value={category} className="capitalize">
                      {getCategoryIcon(category)} {category}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={activeCategory} className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-sm flex items-center gap-2">
                                🎯 {template.name}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {template.description}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-3">
                          <div className="text-xs font-mono bg-muted p-2 rounded">
                            {template.template_message}
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {template.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.event_type}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {filteredTemplates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No templates found matching your criteria.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Template Preview */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        🎯 {selectedTemplate.name}
                      </CardTitle>
                      <CardDescription>{selectedTemplate.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{selectedTemplate.category}</Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="font-mono text-sm bg-muted p-3 rounded">
                    {selectedTemplate.template_message}
                  </div>
                  
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex justify-between text-sm">
                        <span>Event Type: <strong>{selectedTemplate.event_type}</strong></span>
                        <span>Category: <strong>{selectedTemplate.category}</strong></span>
                        <span>Fields Required: <strong>{selectedTemplate.required_fields?.length || 0}</strong></span>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Dynamic Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configure Template</CardTitle>
                  <CardDescription>
                    Fill in the required fields to customize your quick-win event.
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedTemplate.required_fields?.map((fieldName: string) => {
                      const field: FieldSchema = {
                        type: 'text',
                        label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' '),
                        required: true,
                        placeholder: `Enter ${fieldName.replace(/_/g, ' ')}`
                      };
                      return renderField(fieldName, field);
                    })}
                  </div>

                  <div className="mt-6 space-y-2">
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
                      Set when this quick-win should stop showing. Leave empty for no expiry.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTemplate(null)}
                >
                  Back to Templates
                </Button>
                <Button 
                  onClick={handleConfirm}
                  disabled={Object.keys(formErrors).length > 0}
                >
                  Create Quick-Win Event
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};