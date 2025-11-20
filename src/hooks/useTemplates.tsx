import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TemplateConfig } from '@/lib/templateEngine';

export function useTemplates(provider?: string, category?: string) {
  return useQuery({
    queryKey: ['templates', provider, category],
    queryFn: async (): Promise<TemplateConfig[]> => {
      let query = supabase
        .from('templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (provider) {
        query = query.eq('provider', provider);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform database data to TemplateConfig
      return (data || []).map(t => ({
        ...t,
        required_fields: Array.isArray(t.required_fields) ? t.required_fields as string[] : [],
        preview_json: typeof t.preview_json === 'object' ? t.preview_json as Record<string, any> : {},
      }));
    },
  });
}

export function useTemplate(templateId: string) {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: async (): Promise<TemplateConfig | null> => {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        required_fields: Array.isArray(data.required_fields) ? data.required_fields as string[] : [],
        preview_json: typeof data.preview_json === 'object' ? data.preview_json as Record<string, any> : {},
      };
    },
    enabled: !!templateId,
  });
}
