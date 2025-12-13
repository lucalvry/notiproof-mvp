import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";

interface SetupGuideButtonProps {
  userId: string;
  onOpenOnboarding: () => void;
}

export function SetupGuideButton({ userId, onOpenOnboarding }: SetupGuideButtonProps) {
  const { progress, isLoading, websiteCount, campaignCount } = useOnboarding();

  if (isLoading) return null;

  // Calculate real completion based on actual database data
  const realMilestones = {
    website_added: websiteCount > 0 || progress.website_added,
    campaign_created: campaignCount > 0 || progress.campaign_created,
    widget_installed: progress.widget_installed,
    first_conversion: progress.first_conversion,
  };

  const completedCount = Object.values(realMilestones).filter(Boolean).length;
  const completionPercentage = Math.round((completedCount / 4) * 100);
  const isComplete = completionPercentage === 100;

  // Hide the button entirely when setup is complete or dismissed
  if (isComplete || progress.dismissed) return null;

  const milestones = [
    { key: 'website_added', label: 'Add website', completed: realMilestones.website_added },
    { key: 'campaign_created', label: 'Create notification', completed: realMilestones.campaign_created },
    { key: 'widget_installed', label: 'Install widget', completed: realMilestones.widget_installed },
    { key: 'first_conversion', label: 'First conversion', completed: realMilestones.first_conversion },
  ];

  // Additional feature milestones based on path
  const featureMilestones = [];
  if (progress.selected_path === 'testimonials') {
    featureMilestones.push(
      { key: 'testimonial_form_created', label: 'Create testimonial form', completed: progress.testimonial_form_created },
      { key: 'first_testimonial_collected', label: 'Collect first testimonial', completed: progress.first_testimonial_collected },
    );
  }

  const allMilestones = [...milestones, ...featureMilestones];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="default" 
          size="sm" 
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Setup Guide</span>
          <span className="text-xs">({completionPercentage}%)</span>
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
            {allMilestones.map((milestone) => (
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

          <Button 
            onClick={onOpenOnboarding} 
            className="w-full gap-2"
            size="sm"
          >
            <Sparkles className="h-4 w-4" />
            Continue Setup
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
