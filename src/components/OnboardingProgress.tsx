import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Zap, Globe, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Website } from '@/hooks/useWebsites';
import type { UserWidget } from '@/hooks/useUserWidgets';

interface OnboardingProgressProps {
  website: Website;
  widgets: UserWidget[];
  onCreateWidget?: () => void;
}

export const OnboardingProgress = ({ website, widgets, onCreateWidget }: OnboardingProgressProps) => {
  const hasWidgets = widgets.length > 0;
  const hasActiveWidgets = widgets.some(w => w.status === 'active');
  const isVerified = website.is_verified;

  const steps = [
    {
      id: 'website',
      title: 'Website Added',
      description: `${website.name} (${website.domain})`,
      status: 'completed' as const,
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      id: 'widget',
      title: 'Widget Created',
      description: hasWidgets ? `${widgets.length} widget${widgets.length > 1 ? 's' : ''} created` : 'Create your first widget',
      status: hasWidgets ? 'completed' : 'pending' as const,
      icon: hasWidgets ? CheckCircle : Clock,
      color: hasWidgets ? 'text-green-600' : 'text-orange-500',
      action: !hasWidgets ? onCreateWidget : undefined
    },
    {
      id: 'install',
      title: 'Install Script',
      description: isVerified ? 'Script successfully detected' : 'Add script to your website',
      status: isVerified ? 'completed' : 'pending' as const,
      icon: isVerified ? CheckCircle : Zap,
      color: isVerified ? 'text-green-600' : 'text-blue-600',
      link: hasWidgets ? '/dashboard/installation' : undefined
    },
    {
      id: 'activate',
      title: 'Widget Activated',
      description: hasActiveWidgets ? 'Your widget is live!' : 'Activate after verification',
      status: hasActiveWidgets ? 'completed' : 'pending' as const,
      icon: hasActiveWidgets ? CheckCircle : Play,
      color: hasActiveWidgets ? 'text-green-600' : 'text-gray-400'
    }
  ];

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Setup Progress
            </CardTitle>
            <CardDescription>
              Get your social proof widget up and running
            </CardDescription>
          </div>
          <Badge variant={progress === 100 ? 'default' : 'secondary'}>
            {completedSteps} of {steps.length} completed
          </Badge>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-4">
            <div className={`p-2 rounded-full ${step.status === 'completed' ? 'bg-green-100' : 'bg-muted'}`}>
              <step.icon className={`h-4 w-4 ${step.color}`} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${step.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
                {step.status === 'completed' && (
                  <Badge variant="outline" className="text-xs">Done</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            
            <div className="flex gap-2">
              {step.action && (
                <Button size="sm" onClick={step.action}>
                  Create Widget
                </Button>
              )}
              {step.link && step.status === 'pending' && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={step.link}>
                    {step.id === 'install' ? 'Get Script' : 'Continue'}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {progress === 100 && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Setup Complete!</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Your social proof widget is now live and collecting engagement data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};