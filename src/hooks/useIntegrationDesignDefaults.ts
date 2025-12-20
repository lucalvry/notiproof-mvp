import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DesignDefaults {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  primaryColor?: string;
  linkColor?: string;
  borderRadius?: string;
  shadow?: string;
  fontSize?: string;
  position?: string;
  animation?: string;
  borderColor?: string;
  borderWidth?: string;
  fontFamily?: string;
  hoverEffect?: string;
  textAlignment?: string;
  lineHeight?: string;
  notificationPadding?: string;
}

const DEFAULT_DESIGN: DesignDefaults = {
  backgroundColor: '#ffffff',
  textColor: '#1a1a1a',
  accentColor: '#2563EB',
  borderRadius: '12',
  shadow: 'md',
  fontSize: 'md',
  position: 'bottom-left',
  animation: 'slide-in',
  borderColor: 'transparent',
  borderWidth: '0',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  hoverEffect: 'subtle',
  textAlignment: 'left',
  lineHeight: '1.4',
  notificationPadding: '16',
};

export function useIntegrationDesignDefaults(
  integrationId: string | null, 
  integrationType: 'native' | 'connector'
) {
  const [designDefaults, setDesignDefaults] = useState<DesignDefaults>(DEFAULT_DESIGN);
  const [loading, setLoading] = useState(false);
  const [hasDefaults, setHasDefaults] = useState(false);

  const fetchDesignDefaults = useCallback(async () => {
    if (!integrationId) return;

    setLoading(true);
    try {
      const table = integrationType === 'native' ? 'integrations' : 'integration_connectors';
      
      const { data, error } = await supabase
        .from(table)
        .select('design_defaults')
        .eq('id', integrationId)
        .single();

      if (error) throw error;

      const defaults = data?.design_defaults as DesignDefaults | null;
      if (defaults && Object.keys(defaults).length > 0) {
        setDesignDefaults({ ...DEFAULT_DESIGN, ...defaults });
        setHasDefaults(true);
      } else {
        setDesignDefaults(DEFAULT_DESIGN);
        setHasDefaults(false);
      }
    } catch (error) {
      console.error('Error fetching design defaults:', error);
    } finally {
      setLoading(false);
    }
  }, [integrationId, integrationType]);

  const saveDesignDefaults = useCallback(async (newDefaults: DesignDefaults) => {
    if (!integrationId) {
      toast.error('No integration selected');
      return false;
    }

    setLoading(true);
    try {
      const table = integrationType === 'native' ? 'integrations' : 'integration_connectors';
      
      // Cast to any to avoid type issues with JSONB column
      const { error } = await supabase
        .from(table)
        .update({ design_defaults: newDefaults as any })
        .eq('id', integrationId);

      if (error) throw error;

      setDesignDefaults(newDefaults);
      setHasDefaults(true);
      toast.success('Design defaults saved');
      return true;
    } catch (error) {
      console.error('Error saving design defaults:', error);
      toast.error('Failed to save design defaults');
      return false;
    } finally {
      setLoading(false);
    }
  }, [integrationId, integrationType]);

  const resetToSystemDefaults = useCallback(() => {
    setDesignDefaults(DEFAULT_DESIGN);
  }, []);

  return {
    designDefaults,
    setDesignDefaults,
    loading,
    hasDefaults,
    fetchDesignDefaults,
    saveDesignDefaults,
    resetToSystemDefaults,
    DEFAULT_DESIGN,
  };
}

// Helper to fetch design defaults for campaign wizard
export async function fetchIntegrationDesignDefaults(
  integrationId: string,
  integrationType: 'native' | 'connector'
): Promise<DesignDefaults | null> {
  try {
    const table = integrationType === 'native' ? 'integrations' : 'integration_connectors';
    
    const { data, error } = await supabase
      .from(table)
      .select('design_defaults')
      .eq('id', integrationId)
      .single();

    if (error) throw error;

    const defaults = data?.design_defaults as DesignDefaults | null;
    if (defaults && Object.keys(defaults).length > 0) {
      return { ...DEFAULT_DESIGN, ...defaults };
    }
    return null;
  } catch (error) {
    console.error('Error fetching design defaults:', error);
    return null;
  }
}
