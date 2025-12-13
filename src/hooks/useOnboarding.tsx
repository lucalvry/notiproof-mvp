import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type OnboardingPath = 'testimonials' | 'social_proof' | 'announcements' | 'integrations' | null;

export interface OnboardingProgress {
  // Journey tracking
  onboarding_started_at: string | null;
  onboarding_completed_at: string | null;
  selected_path: OnboardingPath;
  
  // Core milestones
  website_added: boolean;
  campaign_created: boolean;
  widget_installed: boolean;
  first_conversion: boolean;
  
  // Feature adoption milestones
  testimonial_form_created: boolean;
  first_testimonial_collected: boolean;
  integration_connected: boolean;
  playlist_created: boolean;
  template_customized: boolean;
  team_member_invited: boolean;
  
  // State
  dismissed: boolean;
  completion_percentage: number;
  current_step: string;
  steps_completed: string[];
}

const defaultProgress: OnboardingProgress = {
  onboarding_started_at: null,
  onboarding_completed_at: null,
  selected_path: null,
  website_added: false,
  campaign_created: false,
  widget_installed: false,
  first_conversion: false,
  testimonial_form_created: false,
  first_testimonial_collected: false,
  integration_connected: false,
  playlist_created: false,
  template_customized: false,
  team_member_invited: false,
  dismissed: false,
  completion_percentage: 0,
  current_step: 'welcome',
  steps_completed: [],
};

interface OnboardingContextType {
  progress: OnboardingProgress;
  isLoading: boolean;
  isOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  setPath: (path: OnboardingPath) => Promise<void>;
  updateStep: (step: string) => Promise<void>;
  completeStep: (step: string) => Promise<void>;
  updateMilestone: (milestone: keyof OnboardingProgress, value: boolean) => Promise<void>;
  dismissOnboarding: () => Promise<void>;
  restartOnboarding: () => Promise<void>;
  shouldShowOnboarding: boolean;
  websiteCount: number;
  campaignCount: number;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children, userId }: { children: React.ReactNode; userId: string | undefined }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch user profile with onboarding progress
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-onboarding', userId],
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

  const progress: OnboardingProgress = profile?.onboarding_progress 
    ? { ...defaultProgress, ...(profile.onboarding_progress as unknown as Partial<OnboardingProgress>) }
    : defaultProgress;

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (updates: Partial<OnboardingProgress>) => {
      if (!userId) throw new Error('No user ID');
      
      // Ensure currentProgress is always an object
      const rawProgress = profile?.onboarding_progress;
      const currentProgress: OnboardingProgress = (typeof rawProgress === 'object' && rawProgress !== null && !Array.isArray(rawProgress)) 
        ? { ...defaultProgress, ...(rawProgress as Partial<OnboardingProgress>) }
        : defaultProgress;
      
      const newProgress = { ...currentProgress, ...updates };
      
      // Calculate completion percentage
      const milestones = [
        newProgress.website_added,
        newProgress.campaign_created,
        newProgress.widget_installed,
        newProgress.first_conversion,
      ];
      const completed = milestones.filter(Boolean).length;
      newProgress.completion_percentage = Math.round((completed / milestones.length) * 100);
      
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_progress: newProgress })
        .eq('id', userId);
      
      if (error) throw error;
      return newProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-onboarding', userId] });
    },
  });

  const setPath = useCallback(async (path: OnboardingPath) => {
    await updateProgressMutation.mutateAsync({ 
      selected_path: path,
      onboarding_started_at: new Date().toISOString(),
    } as Partial<OnboardingProgress>);
  }, [updateProgressMutation]);

  const updateStep = useCallback(async (step: string) => {
    await updateProgressMutation.mutateAsync({ current_step: step });
  }, [updateProgressMutation]);

  const completeStep = useCallback(async (step: string) => {
    const newSteps = [...(progress.steps_completed || [])];
    if (!newSteps.includes(step)) {
      newSteps.push(step);
    }
    await updateProgressMutation.mutateAsync({ steps_completed: newSteps });
  }, [progress.steps_completed, updateProgressMutation]);

  const updateMilestone = useCallback(async (milestone: keyof OnboardingProgress, value: boolean) => {
    await updateProgressMutation.mutateAsync({ [milestone]: value });
  }, [updateProgressMutation]);

  const dismissOnboarding = useCallback(async () => {
    await updateProgressMutation.mutateAsync({ dismissed: true });
    setIsOpen(false);
  }, [updateProgressMutation]);

  const restartOnboarding = useCallback(async () => {
    await updateProgressMutation.mutateAsync({
      ...defaultProgress,
      onboarding_started_at: new Date().toISOString(),
    });
    setIsOpen(true);
  }, [updateProgressMutation]);

  const openOnboarding = useCallback(() => setIsOpen(true), []);
  const closeOnboarding = useCallback(() => setIsOpen(false), []);

  // Determine if onboarding should be shown
  const shouldShowOnboarding = !progress.dismissed && progress.completion_percentage < 100;

  // Auto-update milestones based on data
  useEffect(() => {
    if (!userId || profileLoading) return;

    if (websiteCount > 0 && !progress.website_added) {
      updateMilestone('website_added', true);
    }
    if (campaignCount > 0 && !progress.campaign_created) {
      updateMilestone('campaign_created', true);
    }
  }, [userId, websiteCount, campaignCount, progress.website_added, progress.campaign_created, profileLoading, updateMilestone]);

  // Show onboarding for new users
  useEffect(() => {
    if (!profileLoading && userId && websiteCount === 0 && campaignCount === 0 && !progress.dismissed) {
      setIsOpen(true);
    }
  }, [profileLoading, userId, websiteCount, campaignCount, progress.dismissed]);

  const value: OnboardingContextType = {
    progress,
    isLoading: profileLoading,
    isOpen,
    openOnboarding,
    closeOnboarding,
    setPath,
    updateStep,
    completeStep,
    updateMilestone,
    dismissOnboarding,
    restartOnboarding,
    shouldShowOnboarding,
    websiteCount,
    campaignCount,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

// Standalone hook for components that don't need the full context
export function useOnboardingState(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-onboarding', userId],
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

  const progress: OnboardingProgress = profile?.onboarding_progress 
    ? { ...defaultProgress, ...(profile.onboarding_progress as unknown as Partial<OnboardingProgress>) }
    : defaultProgress;

  return { progress, isLoading };
}
