import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";
import { getAuthFlowType } from "@/lib/integrationPlugins";
import { OAuthFlow } from "./OAuthFlow";
import { WebhookFlow } from "./WebhookFlow";
import { APIKeyFlow } from "./APIKeyFlow";

interface IntegrationConnectionDialogProps {
  integration: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  websiteId: string | null;
  onSuccess: () => void;
}

export function IntegrationConnectionDialog({
  integration,
  open,
  onOpenChange,
  websiteId,
  onSuccess,
}: IntegrationConnectionDialogProps) {
  const metadata = getIntegrationMetadata(integration.id);
  const authFlow = getAuthFlowType({ metadata });

  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  const renderAuthFlow = () => {
    if (!websiteId) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">Website Required</p>
          <p className="text-sm">Please create a website first to connect integrations.</p>
        </div>
      );
    }

    // Route to correct flow based on auth type
    switch (authFlow) {
      case 'oauth':
        return (
          <OAuthFlow 
            integration={integration} 
            websiteId={websiteId}
            onSuccess={handleSuccess}
          />
        );
      
      case 'webhook':
        return (
          <WebhookFlow 
            integration={integration} 
            websiteId={websiteId}
            onSuccess={handleSuccess}
          />
        );
      
      case 'api_key':
        return (
          <APIKeyFlow 
            integration={integration} 
            websiteId={websiteId}
            onSuccess={handleSuccess}
          />
        );
      
      default:
        return (
          <div className="p-8 text-center space-y-4">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium mb-2">Coming Soon</p>
              <p className="text-sm">
                This integration is being prepared. Check back soon!
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">
            Connect {integration?.name || 'Integration'}
          </DialogTitle>
        </DialogHeader>
        {renderAuthFlow()}
      </DialogContent>
    </Dialog>
  );
}
