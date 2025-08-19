export interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showSkip?: boolean;
  showPrevious?: boolean;
  showNext?: boolean;
  action?: () => void;
}

export interface Tour {
  id: string;
  name: string;
  steps: TourStep[];
  autoStart?: boolean;
  persistent?: boolean;
}

export interface HelpContent {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  videoUrl?: string;
  links?: Array<{
    text: string;
    url: string;
    external?: boolean;
  }>;
}

export interface HelpState {
  isHelpSidebarOpen: boolean;
  activeTour: string | null;
  currentTourStep: number;
  completedTours: string[];
  helpContent: HelpContent[];
  userProgress: Record<string, boolean>;
}

export interface HelpContextType extends HelpState {
  toggleHelpSidebar: () => void;
  startTour: (tourId: string) => void;
  nextTourStep: () => void;
  previousTourStep: () => void;
  skipTour: () => void;
  completeTour: (tourId: string) => void;
  markFeatureComplete: (featureId: string) => void;
  getHelpContent: (category?: string) => HelpContent[];
  searchHelpContent: (query: string) => HelpContent[];
}