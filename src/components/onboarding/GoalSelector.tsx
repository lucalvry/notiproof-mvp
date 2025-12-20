import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Activity, Megaphone, Plug, Clock, Sparkles } from "lucide-react";
import { OnboardingPath } from "@/hooks/useOnboarding";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

interface GoalSelectorProps {
  onSelect: (path: OnboardingPath) => void;
  onBack: () => void;
  isLTD?: boolean;
}

const goals = [
  {
    id: 'testimonials' as OnboardingPath,
    title: 'Collect & Display Testimonials',
    description: 'Create a form to collect reviews, then display as notifications or embed on your site',
    icon: MessageSquare,
    time: '~3 min',
    highlight: 'Quickest win',
    color: 'from-purple-500/10 to-purple-500/5',
    borderColor: 'border-purple-500/20',
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'social_proof' as OnboardingPath,
    title: 'Show Real-Time Activity',
    description: 'Display live signups, purchases, and form submissions from your website',
    icon: Activity,
    time: '~5 min',
    highlight: 'Most popular',
    color: 'from-blue-500/10 to-blue-500/5',
    borderColor: 'border-blue-500/20',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'announcements' as OnboardingPath,
    title: 'Create Smart Announcements',
    description: 'Show promotions, alerts, and updates with custom notifications',
    icon: Megaphone,
    time: '~2 min',
    highlight: 'Instant setup',
    color: 'from-green-500/10 to-green-500/5',
    borderColor: 'border-green-500/20',
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'integrations' as OnboardingPath,
    title: 'Connect My Tools',
    description: 'Integrate with Stripe, Shopify, Zapier, and other platforms',
    icon: Plug,
    time: '~10 min',
    highlight: 'Advanced',
    color: 'from-orange-500/10 to-orange-500/5',
    borderColor: 'border-orange-500/20',
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
];

export function GoalSelector({ onSelect, onBack, isLTD = false }: GoalSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">What would you like to do first?</h2>
          {isLTD && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Crown className="h-3 w-3 mr-1" />
              All Included
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          {isLTD 
            ? "All features are included in your lifetime deal — pick your starting point!"
            : "Choose your starting point - you can always explore other features later"
          }
        </p>
      </div>

      {/* Goal Cards */}
      <div className="grid gap-4">
        {goals.map((goal) => {
          const Icon = goal.icon;
          return (
            <Card 
              key={goal.id}
              className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] bg-gradient-to-br ${goal.color} ${goal.borderColor}`}
              onClick={() => onSelect(goal.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full ${goal.bgColor} p-3`}>
                      <Icon className={`h-5 w-5 ${goal.iconColor}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      <CardDescription className="mt-1">{goal.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{goal.time}</span>
                  </div>
                  {goal.highlight && (
                    <div className="flex items-center gap-1.5 text-primary font-medium">
                      <Sparkles className="h-4 w-4" />
                      <span>{goal.highlight}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
