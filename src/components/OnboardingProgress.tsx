import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingStep {
  step: number;
  title: string;
  status: 'completed' | 'current' | 'pending' | 'warning';
  description: string;
  actionLink?: string;
  actionText?: string;
  warningText?: string;
}

interface OnboardingProgressProps {
  compact?: boolean;
}

export const OnboardingProgress = ({ compact = false }: OnboardingProgressProps) => {
  const { profile } = useAuth();
  const [steps, setSteps] = useState<OnboardingStep[]>([
    { step: 1, title: "Create Widget", status: "pending", description: "Set up your first social proof widget", actionLink: "/dashboard/widgets/create", actionText: "Create Widget" },
    { step: 2, title: "Install Code", status: "pending", description: "Add the widget code to your website", actionLink: "/installation", actionText: "Get Code" },
    { step: 3, title: "Connect Data", status: "pending", description: "Link integrations or add events manually", actionLink: "/dashboard/integrations", actionText: "Setup Integrations" },
    { step: 4, title: "Moderate Content", status: "pending", description: "Review and approve your social proof content", actionLink: "/dashboard/moderation", actionText: "Review Content" },
    { step: 5, title: "See Analytics", status: "pending", description: "Monitor your widget performance", actionLink: "/dashboard/widgets", actionText: "View Analytics" }
  ]);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!profile) return;

      try {
        // Check widgets
        const { data: widgets } = await supabase
          .from('widgets')
          .select('id, status')
          .eq('user_id', profile.id);

        // Check events
        const { data: events } = await supabase
          .from('events')
          .select('id, status')
          .in('widget_id', widgets?.map(w => w.id) || []);

        // Check integrations
        const { data: integrations } = await supabase
          .from('integration_hooks')
          .select('id, type')
          .eq('user_id', profile.id);

        // Check social connectors
        const { data: connectors } = await supabase
          .from('social_connectors')
          .select('id, type, status')
          .eq('user_id', profile.id);

        // Check social items (pending moderation)
        const { data: socialItems } = await supabase
          .from('social_items')
          .select('id, moderation_status')
          .in('connector_id', connectors?.map(c => c.id) || []);

        const hasWidgets = widgets && widgets.length > 0;
        const hasActiveWidgets = widgets?.some(w => w.status === 'active');
        const hasEvents = events && events.length > 0;
        const hasApprovedEvents = events?.some(e => e.status === 'approved');
        const hasIntegrations = integrations && integrations.length > 0;
        const hasConnectors = connectors && connectors.length > 0;
        const hasPendingItems = socialItems?.some(item => item.moderation_status === 'pending');

        setSteps(prevSteps => prevSteps.map(step => {
          switch (step.step) {
            case 1: // Create Widget
              return {
                ...step,
                status: hasWidgets ? 'completed' : 'current'
              };
            case 2: // Install Code  
              return {
                ...step,
                status: hasWidgets ? (hasActiveWidgets ? 'completed' : 'current') : 'pending'
              };
            case 3: // Connect Data
              const hasData = hasIntegrations || hasConnectors || hasEvents;
              return {
                ...step,
                status: hasWidgets ? (hasData ? 'completed' : 'current') : 'pending'
              };
            case 4: // Moderate Content
              if (!hasWidgets) return { ...step, status: 'pending' };
              if (hasPendingItems) {
                return {
                  ...step,
                  status: 'warning',
                  warningText: `${socialItems?.filter(item => item.moderation_status === 'pending').length} items need review`
                };
              }
              return {
                ...step,
                status: hasApprovedEvents ? 'completed' : 'current'
              };
            case 5: // See Analytics
              return {
                ...step,
                status: hasApprovedEvents ? 'completed' : (hasWidgets ? 'current' : 'pending')
              };
            default:
              return step;
          }
        }));
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, [profile]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'current':
        return <Circle className="h-5 w-5 text-primary fill-primary" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'current':
        return <Badge variant="default">Current</Badge>;
      case 'warning':
        return <Badge variant="destructive">Needs Attention</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Setup Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {steps.map((step) => (
              <div key={step.step} className="flex items-center gap-3">
                {getStepIcon(step.status)}
                <span className="text-sm font-medium">{step.title}</span>
                {step.status === 'warning' && step.warningText && (
                  <Badge variant="destructive" className="text-xs">{step.warningText}</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Getting Started</CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete these steps to set up your social proof widgets
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.step} className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex flex-col items-center">
                {getStepIcon(step.status)}
                {index < steps.length - 1 && (
                  <div className="w-px h-8 bg-border mt-2" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{step.title}</h4>
                  {getStatusBadge(step.status)}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {step.description}
                </p>
                
                {step.status === 'warning' && step.warningText && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    {step.warningText}
                  </div>
                )}
                
                {(step.status === 'current' || step.status === 'warning') && step.actionLink && (
                  <Button size="sm" asChild>
                    <Link to={step.actionLink}>
                      {step.actionText}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};