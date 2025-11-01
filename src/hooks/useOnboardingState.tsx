import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OnboardingProgress {
  step_completed: number;
  dismissed: boolean;
  last_seen: string;
  websites_added: boolean;
  campaigns_created: boolean;
  widget_installed: boolean;
  first_conversion: boolean;
  completion_percentage: number;
}

interface OnboardingState {
  shouldShowOnboarding: boolean;
  onboardingType: 'wizard' | 'prompt' | null;
  progress: OnboardingProgress | null;
  websiteCount: number;
  campaignCount: number;
  hasActivity: boolean;
  isLoading: boolean;
  updateMilestone: (milestone: keyof Omit<OnboardingProgress, 'step_completed' | 'dismissed' | 'last_seen' | 'completion_percentage'>, completed?: boolean) => Promise<void>;
  dismissOnboarding: () => Promise<void>;
  restartOnboarding: () => Promise<void>;
}

export function useOnboardingState(userId: string | undefined): OnboardingState {
  const queryClient = useQueryClient();

  // Fetch user profile with onboarding progress
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_progress')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch websites count
  const { data: websiteCount = 0 } = useQuery({
    queryKey: ['websites-count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('websites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });

  // Fetch campaigns count
  const { data: campaignCount = 0 } = useQuery({
    queryKey: ['campaigns-count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });

  // Fetch widget activity
  const { data: hasActivity = false } = useQuery({
    queryKey: ['widget-activity', userId],
    queryFn: async () => {
      if (!userId) return false;
      
      // First get user's widgets
      const { data: widgets, error: widgetsError } = await supabase
        .from('widgets')
        .select('id')
        .eq('user_id', userId);
      
      if (widgetsError) throw widgetsError;
      if (!widgets || widgets.length === 0) return false;
      
      const widgetIds = widgets.map(w => w.id);
      
      // Then check for events
      const { count, error } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('widget_id', widgetIds)
        .limit(1);
      
      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!userId,
  });

  // Update milestone mutation
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestone, completed = true }: { milestone: string; completed?: boolean }) => {
      if (!userId) throw new Error('No user ID');
      
      const { error } = await supabase.rpc('update_onboarding_milestone', {
        _user_id: userId,
        _milestone: milestone,
        _completed: completed,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  // Dismiss onboarding mutation
  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No user ID');
      
      const currentProgress = (profile?.onboarding_progress as any) || {};
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_progress: {
            step_completed: currentProgress.step_completed || 0,
            dismissed: true,
            last_seen: new Date().toISOString(),
            websites_added: currentProgress.websites_added || false,
            campaigns_created: currentProgress.campaigns_created || false,
            widget_installed: currentProgress.widget_installed || false,
            first_conversion: currentProgress.first_conversion || false,
            completion_percentage: currentProgress.completion_percentage || 0,
          },
        })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  // Restart onboarding mutation
  const restartMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No user ID');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_progress: {
            step_completed: 0,
            dismissed: false,
            last_seen: new Date().toISOString(),
            websites_added: false,
            campaigns_created: false,
            widget_installed: false,
            first_conversion: false,
            completion_percentage: 0,
          },
        })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  const progress: OnboardingProgress | null = profile?.onboarding_progress 
    ? (profile.onboarding_progress as unknown as OnboardingProgress)
    : null;

  // Auto-update milestones based on user activity
  useEffect(() => {
    if (!userId || !progress) return;

    // Update websites_added milestone
    if (websiteCount > 0 && !progress.websites_added) {
      updateMilestoneMutation.mutate({ milestone: 'websites_added', completed: true });
    }

    // Update campaigns_created milestone
    if (campaignCount > 0 && !progress.campaigns_created) {
      updateMilestoneMutation.mutate({ milestone: 'campaigns_created', completed: true });
    }

    // Update first_conversion milestone
    if (hasActivity && !progress.first_conversion) {
      updateMilestoneMutation.mutate({ milestone: 'first_conversion', completed: true });
    }
  }, [userId, websiteCount, campaignCount, hasActivity, progress]);

  // Determine if onboarding should be shown
  const shouldShowOnboarding = !progress?.dismissed && (progress?.completion_percentage || 0) < 100;
  
  // Determine onboarding type
  let onboardingType: 'wizard' | 'prompt' | null = null;
  if (shouldShowOnboarding) {
    // Show wizard for new users (0 websites and 0 campaigns)
    if (websiteCount === 0 && campaignCount === 0) {
      onboardingType = 'wizard';
    } else {
      // Show prompts for users with some progress
      onboardingType = 'prompt';
    }
  }

  return {
    shouldShowOnboarding,
    onboardingType,
    progress,
    websiteCount,
    campaignCount,
    hasActivity,
    isLoading: profileLoading,
    updateMilestone: async (milestone, completed = true) => {
      await updateMilestoneMutation.mutateAsync({ milestone, completed });
    },
    dismissOnboarding: async () => {
      await dismissMutation.mutateAsync();
    },
    restartOnboarding: async () => {
      await restartMutation.mutateAsync();
    },
  };
}
