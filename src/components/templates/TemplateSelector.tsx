import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TemplatePreview } from './TemplatePreview';
import { TemplatePreviewErrorBoundary } from './TemplatePreviewErrorBoundary';
import { Search, Loader2 } from 'lucide-react';
import type { TemplateConfig } from '@/lib/templateEngine';

interface TemplateSelectorProps {
  provider?: string;
  category?: string;
  onSelect: (template: TemplateConfig) => void;
  selectedTemplateId?: string;
}

export function TemplateSelector({ 
  provider, 
  category,
  onSelect,
  selectedTemplateId,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState(category || 'all');
  const [filterVariant, setFilterVariant] = useState('all');
  const [previewScale, setPreviewScale] = useState<'fit' | 'full'>('fit');

  useEffect(() => {
    fetchTemplates();
  }, [provider, filterCategory]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      let query = supabase
        .from('templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (provider) {
        query = query.eq('provider', provider);
      }

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform database data to TemplateConfig
      const transformedData: TemplateConfig[] = (data || []).map(t => ({
        ...t,
        required_fields: Array.isArray(t.required_fields) ? t.required_fields as string[] : [],
        preview_json: typeof t.preview_json === 'object' ? t.preview_json as Record<string, any> : {},
      }));
      
      setTemplates(transformedData);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                         t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesVariant = filterVariant === 'all' || t.style_variant === filterVariant;
    return matchesSearch && matchesVariant;
  });

  const categories = Array.from(new Set(templates.map(t => t.category)));
  const variants = Array.from(new Set(templates.map(t => t.style_variant)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <Badge 
          variant={previewScale === 'fit' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setPreviewScale(previewScale === 'fit' ? 'full' : 'fit')}
        >
          {previewScale === 'fit' ? 'Fit View' : 'Full Size'}
        </Badge>
        
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {!category && (
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterVariant} onValueChange={setFilterVariant}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Styles</SelectItem>
            {variants.map(variant => (
              <SelectItem key={variant} value={variant}>{variant}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No templates found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map(template => (
            <TemplatePreviewErrorBoundary 
              key={template.id} 
              templateName={template.name}
            >
              <TemplatePreview
                template={template}
                onSelect={onSelect}
                selected={template.id === selectedTemplateId}
                showCode
                scale={previewScale === 'fit' ? 0.7 : 1}
              />
            </TemplatePreviewErrorBoundary>
          ))}
        </div>
      )}
    </div>
  );
}
