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
          Please select a website first
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
          <div className="p-8 text-center text-muted-foreground">
            This integration type is not yet supported
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Connect {integration.name}</DialogTitle>
        </DialogHeader>
        {renderAuthFlow()}
      </DialogContent>
    </Dialog>
  );
}
