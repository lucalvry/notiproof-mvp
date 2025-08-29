import { useEffect, useState } from 'react';
import { WebsiteList } from '@/components/WebsiteList';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useWebsites } from '@/hooks/useWebsites';
import { useUserWidgets } from '@/hooks/useUserWidgets';
import { QuickStartWizard } from '@/components/QuickStartWizard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const WebsiteManagement = () => {
  const { selectedWebsite } = useWebsites();
  const { widgets, refetch: refetchWidgets } = useUserWidgets(selectedWebsite?.id);
  const [showWizard, setShowWizard] = useState(false);
  const { toast } = useToast();

  const shouldShowProgress = selectedWebsite && (!selectedWebsite.is_verified || widgets.length === 0);

  return (
    <div className="space-y-6">
      {shouldShowProgress && (
        <OnboardingProgress 
          website={selectedWebsite}
          widgets={widgets}
          onCreateWidget={() => setShowWizard(true)}
        />
      )}
      
      <WebsiteList />

      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Widget</DialogTitle>
          </DialogHeader>
          <QuickStartWizard 
            onComplete={(widgetId) => {
              setShowWizard(false);
              refetchWidgets();
              toast({
                title: "Widget created!",
                description: "Your new widget has been created successfully.",
              });
            }}
            onSkip={() => setShowWizard(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebsiteManagement;