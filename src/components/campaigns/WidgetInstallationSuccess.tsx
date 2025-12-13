import { CheckCircle, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface WidgetInstallationSuccessProps {
  open: boolean;
  onClose: () => void;
  widgetId: string;
  campaignName: string;
  campaignId: string;
}

export function WidgetInstallationSuccess({
  open,
  onClose,
  widgetId,
  campaignName,
  campaignId,
}: WidgetInstallationSuccessProps) {
  const unifiedCode = `<script src="https://app.notiproof.com/widget.js" data-site-token="YOUR-SITE-TOKEN" data-show-active-visitors="true"></script>`;
  const legacyCode = `<script src="https://app.notiproof.com/widget.js" data-widget-id="${widgetId}" data-show-active-visitors="true"></script>`;

  const handleCopyUnifiedCode = () => {
    navigator.clipboard.writeText(unifiedCode);
    toast.success("Unified script copied! Replace YOUR-SITE-TOKEN with your actual site token.");
  };

  const handleCopyLegacyCode = () => {
    navigator.clipboard.writeText(legacyCode);
    toast.success("Widget code copied to clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <DialogTitle>Widget Created Successfully! 🎉</DialogTitle>
              <DialogDescription>
                Your widget is ready to display on your website
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Unified Script Notice */}
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Already installed the unified script?
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              If you've already installed the unified script on your website, this new widget will automatically appear! No additional installation needed.
            </p>
            <p className="text-xs text-muted-foreground">
              The unified script handles all your widgets in one installation.
            </p>
          </div>

          {/* Installation Options */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Option 1: Unified Script (Recommended)</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Install once, display all widgets. Get your site token from the Websites page.
              </p>
              <div className="flex items-center justify-between mb-2">
                <code className="text-xs text-muted-foreground">Uses data-site-token</code>
                <Button size="sm" variant="outline" onClick={handleCopyUnifiedCode}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Template
                </Button>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <code className="text-xs break-all font-mono">{unifiedCode}</code>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Option 2: Widget-Specific Code</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Install this specific widget only (requires new code for each widget).
              </p>
              <div className="flex items-center justify-between mb-2">
                <code className="text-xs text-muted-foreground">Uses data-widget-id</code>
                <Button size="sm" variant="outline" onClick={handleCopyLegacyCode}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <code className="text-xs break-all font-mono">{legacyCode}</code>
              </div>
            </div>
          </div>

          {/* Demo Events Notice */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm">
              <span className="font-medium">🎯 Demo events included!</span> We've added sample
              notifications so you can see your widget in action right away. Replace them with real
              events from your integrations or add manual events.
            </p>
          </div>

          {/* Next Steps */}
          <div className="space-y-2">
            <h3 className="font-semibold">Next Steps</h3>
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  window.open(`/campaign-details/${campaignId}`, "_blank");
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Campaign Analytics
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  window.open("/integrations", "_blank");
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Data Sources
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
