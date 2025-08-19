import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHelp } from '@/contexts/HelpContext';
import { Tour, TourStep } from '@/types/help';

interface InteractiveTourProps {
  tour: Tour;
  isActive: boolean;
}

interface TourSpotlightProps {
  target: string;
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  showPrevious: boolean;
  showNext: boolean;
}

function TourSpotlight({
  target,
  step,
  stepNumber,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  showPrevious,
  showNext,
}: TourSpotlightProps) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number }>({
    top: 0, left: 0, width: 0, height: 0
  });

  useEffect(() => {
    const element = document.querySelector(target) as HTMLElement;
    setTargetElement(element);

    if (element) {
      const rect = element.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });

      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [target]);

  const getTooltipPosition = useCallback(() => {
    if (!targetElement) return { top: 0, left: 0 };

    const placement = step.placement || 'bottom';
    const offset = 16;

    switch (placement) {
      case 'top':
        return {
          top: position.top - offset,
          left: position.left + position.width / 2,
          transform: 'translate(-50%, -100%)',
        };
      case 'bottom':
        return {
          top: position.top + position.height + offset,
          left: position.left + position.width / 2,
          transform: 'translate(-50%, 0)',
        };
      case 'left':
        return {
          top: position.top + position.height / 2,
          left: position.left - offset,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: position.top + position.height / 2,
          left: position.left + position.width + offset,
          transform: 'translate(0, -50%)',
        };
      default:
        return {
          top: position.top + position.height + offset,
          left: position.left + position.width / 2,
          transform: 'translate(-50%, 0)',
        };
    }
  }, [targetElement, position, step.placement]);

  const tooltipStyle = getTooltipPosition();

  if (!targetElement) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Spotlight */}
      <div
        className="absolute bg-transparent border-4 border-primary rounded-lg shadow-lg shadow-primary/30 animate-pulse"
        style={{
          top: position.top - 4,
          left: position.left - 4,
          width: position.width + 8,
          height: position.height + 8,
        }}
      />

      {/* Tooltip */}
      <Card
        className="absolute max-w-sm shadow-xl border-primary/20 animate-scale-in"
        style={{
          top: tooltipStyle.top,
          left: tooltipStyle.left,
          transform: tooltipStyle.transform,
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{step.title}</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {stepNumber + 1} of {totalSteps}
              </span>
              {step.showSkip && (
                <Button size="sm" variant="ghost" onClick={onSkip}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-4">{step.content}</p>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {showPrevious && (
                <Button size="sm" variant="outline" onClick={onPrevious}>
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {step.showSkip && (
                <Button size="sm" variant="ghost" onClick={onSkip}>
                  <SkipForward className="h-3 w-3 mr-1" />
                  Skip Tour
                </Button>
              )}
              
              {showNext ? (
                <Button size="sm" onClick={onNext}>
                  Next
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={onComplete}>
                  Complete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}

export function InteractiveTour({ tour, isActive }: InteractiveTourProps) {
  const { currentTourStep, nextTourStep, previousTourStep, skipTour, completeTour } = useHelp();

  useEffect(() => {
    if (isActive && tour.steps[currentTourStep]?.action) {
      tour.steps[currentTourStep].action!();
    }
  }, [isActive, currentTourStep, tour.steps]);

  const handleNext = useCallback(() => {
    if (currentTourStep < tour.steps.length - 1) {
      nextTourStep();
    } else {
      completeTour(tour.id);
    }
  }, [currentTourStep, tour.steps.length, tour.id, nextTourStep, completeTour]);

  const handleComplete = useCallback(() => {
    completeTour(tour.id);
  }, [tour.id, completeTour]);

  if (!isActive || !tour.steps[currentTourStep]) return null;

  const currentStep = tour.steps[currentTourStep];
  const showPrevious = currentTourStep > 0 && currentStep.showPrevious !== false;
  const showNext = currentTourStep < tour.steps.length - 1 && currentStep.showNext !== false;

  return (
    <TourSpotlight
      target={currentStep.target}
      step={currentStep}
      stepNumber={currentTourStep}
      totalSteps={tour.steps.length}
      onNext={handleNext}
      onPrevious={previousTourStep}
      onSkip={skipTour}
      onComplete={handleComplete}
      showPrevious={showPrevious}
      showNext={showNext}
    />
  );
}