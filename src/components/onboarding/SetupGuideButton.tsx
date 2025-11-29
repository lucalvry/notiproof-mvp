import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { useOnboardingState } from "@/hooks/useOnboardingState";

interface SetupGuideButtonProps {
  userId: string;
  onOpenWizard: () => void;
}

export function SetupGuideButton({ userId, onOpenWizard }: SetupGuideButtonProps) {
  const { progress, isLoading } = useOnboardingState(userId);

  if (isLoading || !progress) return null;

  const completionPercentage = progress.completion_percentage || 0;
  const isComplete = completionPercentage === 100;

  // Hide the button entirely when setup is complete
  if (isComplete) return null;

  const milestones = [
    { key: 'websites_added', label: 'Add website', completed: progress.websites_added },
    { key: 'campaigns_created', label: 'Create campaign', completed: progress.campaigns_created },
    { key: 'widget_installed', label: 'Install widget', completed: progress.widget_installed },
    { key: 'first_conversion', label: 'First conversion', completed: progress.first_conversion },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant={isComplete ? "outline" : "default"} 
          size="sm" 
          className="gap-2"
        >
          {isComplete ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="hidden sm:inline">Setup Complete</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Setup Guide</span>
              <span className="text-xs">({completionPercentage}%)</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Setup Progress</h4>
              <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          <div className="space-y-2">
            {milestones.map((milestone) => (
              <div key={milestone.key} className="flex items-center gap-2 text-sm">
                {milestone.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={milestone.completed ? 'text-muted-foreground line-through' : ''}>
                  {milestone.label}
                </span>
              </div>
            ))}
          </div>

          {!isComplete && (
            <Button 
              onClick={onOpenWizard} 
              className="w-full gap-2"
              size="sm"
            >
              <Sparkles className="h-4 w-4" />
              Continue Setup
            </Button>
          )}

          {isComplete && (
            <div className="text-center py-2">
              <p className="text-sm text-success font-medium">
                🎉 You're all set up!
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
