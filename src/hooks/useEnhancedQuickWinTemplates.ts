import { useState, useEffect } from 'react';
import { EnhancedQuickWinTemplate } from '@/types/quickWin';
import { ENHANCED_QUICK_WIN_TEMPLATES, getTemplatesByBusinessType } from '@/data/enhancedQuickWinTemplates';

export const useEnhancedQuickWinTemplates = (businessType?: string) => {
  const [templates, setTemplates] = useState<EnhancedQuickWinTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    
    try {
      let filteredTemplates = ENHANCED_QUICK_WIN_TEMPLATES;
      
      if (businessType && businessType !== 'all') {
        filteredTemplates = getTemplatesByBusinessType(businessType);
      }
      
      setTemplates(filteredTemplates);
      setCategories(Array.from(new Set(filteredTemplates.map(t => t.category))));
    } catch (error) {
      console.error('Error loading enhanced templates:', error);
      setTemplates([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [businessType]);

  const getTemplatesByCategory = (category: string) => {
    if (category === 'all') return templates;
    return templates.filter(template => template.category === category);
  };

  const getTemplateById = (id: string) => {
    return templates.find(template => template.id === id);
  };

  const getFeaturedTemplates = () => {
    return templates.filter(template => template.performance_hints?.conversion_rate && template.performance_hints.conversion_rate > 15);
  };

  const getTemplateStats = () => {
    return {
      total: templates.length,
      categories: categories.length,
      averageConversionRate: templates.reduce((acc, t) => acc + (t.performance_hints?.conversion_rate || 0), 0) / templates.length
    };
  };

  return {
    templates,
    loading,
    categories,
    getTemplatesByCategory,
    getTemplateById,
    getFeaturedTemplates,
    getTemplateStats,
    refetch: () => {
      setLoading(true);
      // Force re-run of useEffect by updating a dependency
      setTemplates([...templates]);
    }
  };
};