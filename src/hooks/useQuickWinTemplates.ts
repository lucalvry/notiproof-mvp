import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QuickWinTemplate {
  id: string;
  name: string;
  description: string;
  business_type: string;
  event_type: string;
  template_message: string;
  required_fields: any; // Json type from Supabase
  default_metadata: any; // Json type from Supabase
  category: string;
  is_active: boolean;
}

export interface ProcessedQuickWinTemplate extends Omit<QuickWinTemplate, 'required_fields' | 'default_metadata'> {
  required_fields: string[];
  default_metadata: Record<string, any>;
}

export const useQuickWinTemplates = (businessType?: string) => {
  const [templates, setTemplates] = useState<ProcessedQuickWinTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, [businessType]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('quick_win_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      // First try with business type filter
      if (businessType) {
        query = query.eq('business_type', businessType as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      let finalData = data || [];

      // If no templates found for specific business type, fall back to all templates
      if (businessType && finalData.length === 0) {
        console.log(`No templates found for business type '${businessType}', falling back to all templates`);
        const { data: allData, error: allError } = await supabase
          .from('quick_win_templates')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (allError) throw allError;
        finalData = allData || [];
      }

      // Process the data to convert Json types to proper TypeScript types
      const processedData = finalData.map(template => ({
        ...template,
        required_fields: Array.isArray(template.required_fields) 
          ? template.required_fields 
          : JSON.parse(template.required_fields as string),
        default_metadata: typeof template.default_metadata === 'object' 
          ? template.default_metadata 
          : JSON.parse(template.default_metadata as string || '{}')
      }));
      setTemplates(processedData);
    } catch (error) {
      console.error('Error fetching quick-win templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quick-win templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTemplatesByCategory = () => {
    return templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    }, {} as Record<string, ProcessedQuickWinTemplate[]>);
  };

  return {
    templates,
    loading,
    refetch: fetchTemplates,
    getTemplatesByCategory
  };
};