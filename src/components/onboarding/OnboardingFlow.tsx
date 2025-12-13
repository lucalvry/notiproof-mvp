import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useOnboarding, OnboardingPath } from "@/hooks/useOnboarding";
import { WelcomeScreen } from "./WelcomeScreen";
import { GoalSelector } from "./GoalSelector";
import { PathGuide } from "./PathGuide";
import { ProgressIndicator } from "./components/ProgressIndicator";

interface OnboardingFlowProps {
  userId: string;
}

type FlowStep = 'welcome' | 'goal' | 'path';

export function OnboardingFlow({ userId }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const { isOpen, closeOnboarding, progress, setPath } = useOnboarding();
  const [currentFlowStep, setCurrentFlowStep] = useState<FlowStep>('welcome');
  const [selectedPath, setSelectedPath] = useState<OnboardingPath>(null);

  // Resume from saved progress
  useEffect(() => {
    if (progress.selected_path) {
      setSelectedPath(progress.selected_path);
      setCurrentFlowStep('path');
    }
  }, [progress.selected_path]);

  const handlePathSelect = (path: OnboardingPath) => {
    // Optimistic UI update - navigate immediately for responsiveness
    setSelectedPath(path);
    setCurrentFlowStep('path');
    
    // Save to database in background (don't block UI)
    setPath(path).catch(console.error);
  };

  const handleStartCreation = () => {
    closeOnboarding();
    
    // Navigate to the appropriate page based on the selected path
    switch (selectedPath) {
      case 'testimonials':
        navigate('/testimonials');
        break;
      case 'social_proof':
        navigate('/campaigns?openWizard=true&type=social_proof');
        break;
      case 'announcements':
        navigate('/campaigns?openWizard=true&type=announcement');
        break;
      case 'integrations':
        navigate('/integrations');
        break;
    }
  };

  const handleBack = () => {
    if (currentFlowStep === 'path') {
      setCurrentFlowStep('goal');
      setSelectedPath(null);
    } else if (currentFlowStep === 'goal') {
      setCurrentFlowStep('welcome');
    }
  };

  const renderContent = () => {
    switch (currentFlowStep) {
      case 'welcome':
        return (
          <WelcomeScreen onContinue={() => setCurrentFlowStep('goal')} onSkip={closeOnboarding} />
        );
      case 'goal':
        return (
          <GoalSelector onSelect={handlePathSelect} onBack={() => setCurrentFlowStep('welcome')} />
        );
      case 'path':
        return (
          <PathGuide 
            path={selectedPath} 
            onContinue={handleStartCreation} 
            onBack={handleBack} 
          />
        );
    }
  };

  const getProgress = () => {
    if (currentFlowStep === 'welcome') return 0;
    if (currentFlowStep === 'goal') return 33;
    return 66;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeOnboarding()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <VisuallyHidden>
          <DialogTitle>Getting Started</DialogTitle>
        </VisuallyHidden>
        <div className="sticky top-0 z-10 bg-background border-b">
          <ProgressIndicator progress={getProgress()} />
        </div>
        <div className="p-6">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
