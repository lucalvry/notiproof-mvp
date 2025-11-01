import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ABTest {
  id: string;
  campaign_id: string;
  user_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  traffic_split: {
    type: 'equal' | 'custom';
    distribution: number[];
  };
  start_date?: string;
  end_date?: string;
  winner_variant_id?: string;
  winner_declared_at?: string;
  confidence_level: number;
  total_views: number;
  total_clicks: number;
  created_at: string;
  updated_at: string;
}

export interface ABTestVariant {
  id: string;
  test_id: string;
  name: string;
  is_control: boolean;
  message_template?: string;
  style_config: Record<string, any>;
  position?: string;
  animation?: string;
  timing_config: Record<string, any>;
  views: number;
  clicks: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

export const useABTests = (userId: string | undefined, campaignId?: string) => {
  const queryClient = useQueryClient();

  const { data: tests, isLoading } = useQuery({
    queryKey: ['ab-tests', userId, campaignId],
    queryFn: async (): Promise<ABTest[]> => {
      if (!userId) return [];

      let query = supabase
        .from('ab_tests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as ABTest[]) || [];
    },
    enabled: !!userId,
  });

  const createTest = useMutation({
    mutationFn: async (testData: any) => {
      const { data, error } = await supabase
        .from('ab_tests')
        .insert([testData])
        .select()
        .single();

      if (error) throw error;
      return data as ABTest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('A/B test created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create test: ${error.message}`);
    },
  });

  const updateTest = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ABTest> }) => {
      const { data, error } = await supabase
        .from('ab_tests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Test updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update test: ${error.message}`);
    },
  });

  const deleteTest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ab_tests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Test deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete test: ${error.message}`);
    },
  });

  const startTest = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('ab_tests')
        .update({ status: 'running', start_date: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Test started successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to start test: ${error.message}`);
    },
  });

  const pauseTest = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('ab_tests')
        .update({ status: 'paused' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Test paused');
    },
    onError: (error: Error) => {
      toast.error(`Failed to pause test: ${error.message}`);
    },
  });

  const makeWinnerPermanent = useMutation({
    mutationFn: async (testId: string) => {
      // Get the test and winner variant
      const { data: test, error: testError } = await supabase
        .from('ab_tests')
        .select('*, winner_variant:ab_test_variants!winner_variant_id(*)')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      if (!test.winner_variant_id) throw new Error('No winner declared yet');

      // This would update the campaign with the winning variant's settings
      // Implementation depends on campaign structure
      return test;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      toast.success('Winner applied to campaign');
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply winner: ${error.message}`);
    },
  });

  return {
    tests,
    isLoading,
    createTest,
    updateTest,
    deleteTest,
    startTest,
    pauseTest,
    makeWinnerPermanent,
  };
};

export const useABTestVariants = (testId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: variants, isLoading } = useQuery({
    queryKey: ['ab-test-variants', testId],
    queryFn: async (): Promise<ABTestVariant[]> => {
      if (!testId) return [];

      const { data, error } = await supabase
        .from('ab_test_variants')
        .select('*')
        .eq('test_id', testId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data as ABTestVariant[]) || [];
    },
    enabled: !!testId,
  });

  const createVariant = useMutation({
    mutationFn: async (variantData: any) => {
      const { data, error } = await supabase
        .from('ab_test_variants')
        .insert([variantData])
        .select()
        .single();

      if (error) throw error;
      return data as ABTestVariant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-test-variants'] });
      toast.success('Variant created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create variant: ${error.message}`);
    },
  });

  const updateVariant = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ABTestVariant> }) => {
      const { data, error } = await supabase
        .from('ab_test_variants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-test-variants'] });
      toast.success('Variant updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update variant: ${error.message}`);
    },
  });

  const deleteVariant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ab_test_variants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-test-variants'] });
      toast.success('Variant deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete variant: ${error.message}`);
    },
  });

  return {
    variants,
    isLoading,
    createVariant,
    updateVariant,
    deleteVariant,
  };
};
