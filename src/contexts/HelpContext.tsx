import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { HelpState, HelpContextType, HelpContent } from '@/types/help';
import { supabase } from '@/integrations/supabase/client';

const initialState: HelpState = {
  isHelpSidebarOpen: false,
  activeTour: null,
  currentTourStep: 0,
  completedTours: JSON.parse(localStorage.getItem('completedTours') || '[]'),
  helpContent: [],
  userProgress: JSON.parse(localStorage.getItem('userProgress') || '{}'),
};

type HelpAction = 
  | { type: 'TOGGLE_HELP_SIDEBAR' }
  | { type: 'START_TOUR'; payload: string }
  | { type: 'NEXT_TOUR_STEP' }
  | { type: 'PREVIOUS_TOUR_STEP' }
  | { type: 'SKIP_TOUR' }
  | { type: 'COMPLETE_TOUR'; payload: string }
  | { type: 'MARK_FEATURE_COMPLETE'; payload: string }
  | { type: 'SET_HELP_CONTENT'; payload: HelpContent[] };

function helpReducer(state: HelpState, action: HelpAction): HelpState {
  switch (action.type) {
    case 'TOGGLE_HELP_SIDEBAR':
      return { ...state, isHelpSidebarOpen: !state.isHelpSidebarOpen };
    
    case 'START_TOUR':
      return { 
        ...state, 
        activeTour: action.payload, 
        currentTourStep: 0,
        isHelpSidebarOpen: false 
      };
    
    case 'NEXT_TOUR_STEP':
      return { ...state, currentTourStep: state.currentTourStep + 1 };
    
    case 'PREVIOUS_TOUR_STEP':
      return { 
        ...state, 
        currentTourStep: Math.max(0, state.currentTourStep - 1) 
      };
    
    case 'SKIP_TOUR':
    case 'COMPLETE_TOUR':
      const updatedCompleted = action.type === 'COMPLETE_TOUR' 
        ? [...state.completedTours, action.payload]
        : state.completedTours;
      
      localStorage.setItem('completedTours', JSON.stringify(updatedCompleted));
      
      return {
        ...state,
        activeTour: null,
        currentTourStep: 0,
        completedTours: updatedCompleted,
      };
    
    case 'MARK_FEATURE_COMPLETE':
      const updatedProgress = { 
        ...state.userProgress, 
        [action.payload]: true 
      };
      localStorage.setItem('userProgress', JSON.stringify(updatedProgress));
      
      return { ...state, userProgress: updatedProgress };
    
    case 'SET_HELP_CONTENT':
      return { ...state, helpContent: action.payload };
    
    default:
      return state;
  }
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(helpReducer, initialState);

  // Load help content on initialization
  useEffect(() => {
    const loadHelpContent = async () => {
      try {
        const { data: articles, error } = await supabase
          .from('help_articles')
          .select(`
            id,
            title,
            content,
            excerpt,
            tags,
            video_url,
            help_categories(name)
          `)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (!error && articles) {
          const transformedContent: HelpContent[] = articles.map(article => ({
            id: article.id,
            title: article.title,
            content: article.excerpt || article.content,
            category: article.help_categories?.name || 'general',
            tags: article.tags || [],
            videoUrl: article.video_url,
            links: []
          }));

          dispatch({ type: 'SET_HELP_CONTENT', payload: transformedContent });
        }
      } catch (error) {
        console.error('Error loading help content:', error);
      }
    };

    loadHelpContent();
  }, []);

  const toggleHelpSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_HELP_SIDEBAR' });
  }, []);

  const startTour = useCallback((tourId: string) => {
    dispatch({ type: 'START_TOUR', payload: tourId });
  }, []);

  const nextTourStep = useCallback(() => {
    dispatch({ type: 'NEXT_TOUR_STEP' });
  }, []);

  const previousTourStep = useCallback(() => {
    dispatch({ type: 'PREVIOUS_TOUR_STEP' });
  }, []);

  const skipTour = useCallback(() => {
    dispatch({ type: 'SKIP_TOUR' });
  }, []);

  const completeTour = useCallback((tourId: string) => {
    dispatch({ type: 'COMPLETE_TOUR', payload: tourId });
  }, []);

  const markFeatureComplete = useCallback((featureId: string) => {
    dispatch({ type: 'MARK_FEATURE_COMPLETE', payload: featureId });
  }, []);

  const getHelpContent = useCallback((category?: string) => {
    return category 
      ? state.helpContent.filter(content => content.category === category)
      : state.helpContent;
  }, [state.helpContent]);

  const searchHelpContent = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return state.helpContent.filter(content => 
      content.title.toLowerCase().includes(lowercaseQuery) ||
      content.content.toLowerCase().includes(lowercaseQuery) ||
      content.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }, [state.helpContent]);

  const contextValue: HelpContextType = {
    ...state,
    toggleHelpSidebar,
    startTour,
    nextTourStep,
    previousTourStep,
    skipTour,
    completeTour,
    markFeatureComplete,
    getHelpContent,
    searchHelpContent,
  };

  return (
    <HelpContext.Provider value={contextValue}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}