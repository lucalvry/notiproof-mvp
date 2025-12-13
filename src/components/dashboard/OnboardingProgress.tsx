import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, ArrowRight } from "lucide-react";

interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  action?: () => void;
}

interface OnboardingProgressProps {
  websiteAdded: boolean;
  notificationCreated: boolean;
  widgetInstalled: boolean;
  hasEvents: boolean;
  onDismiss?: () => void;
}

export function OnboardingProgress({
  websiteAdded,
  notificationCreated,
  widgetInstalled,
  hasEvents,
  onDismiss,
}: OnboardingProgressProps) {
  const navigate = useNavigate();

  const steps: OnboardingStep[] = [
    {
      id: 'website',
      label: 'Add Website',
      completed: websiteAdded,
      action: () => navigate('/websites'),
    },
    {
      id: 'notification',
      label: 'Create Notification',
      completed: notificationCreated,
      action: () => navigate('/campaigns?openWizard=true'),
    },
    {
      id: 'widget',
      label: 'Install Widget',
      completed: widgetInstalled,
      action: () => navigate('/websites'),
    },
    {
      id: 'events',
      label: 'First Interaction',
      completed: hasEvents,
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercentage = (completedCount / steps.length) * 100;
  const isComplete = completedCount === steps.length;

  // Find the next incomplete step
  const nextStep = steps.find(s => !s.completed);

  // Don't show if all steps are complete
  if (isComplete) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Setup Progress</h3>
              <p className="text-sm text-muted-foreground">
                {completedCount} of {steps.length} steps completed
              </p>
            </div>
            <span className="text-2xl font-bold text-primary">{Math.round(progressPercentage)}%</span>
          </div>

          <Progress value={progressPercentage} className="h-2" />

          <div className="flex items-center justify-between gap-2 flex-wrap">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                {step.completed ? (
                  <CheckCircle className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={`text-sm ${step.completed ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 hidden sm:block" />
                )}
              </div>
            ))}
          </div>

          {nextStep && nextStep.action && (
            <Button onClick={nextStep.action} className="w-full sm:w-auto self-start">
              {nextStep.label}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
