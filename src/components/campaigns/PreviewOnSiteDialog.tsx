import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Copy, Check, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PreviewOnSiteDialogProps {
  open: boolean;
  onClose: () => void;
  websiteDomain?: string;
  campaignId?: string;
}

export function PreviewOnSiteDialog({ 
  open, 
  onClose, 
  websiteDomain,
  campaignId 
}: PreviewOnSiteDialogProps) {
  const [testUrl, setTestUrl] = useState(websiteDomain || '');
  const [copied, setCopied] = useState(false);

  const previewUrl = testUrl 
    ? `${testUrl}?notiproof_preview=${campaignId || 'test'}&notiproof_mode=preview`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    toast.success('Preview URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPreview = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Preview on Your Website
          </DialogTitle>
          <DialogDescription>
            Test how your notification will look on your actual website
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="test-url">Your Website URL</Label>
            <Input
              id="test-url"
              type="url"
              placeholder="https://example.com"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the URL of a page where you've installed the NotiProof widget
            </p>
          </div>

          {previewUrl && (
            <div className="space-y-2">
              <Label>Preview URL</Label>
              <div className="flex gap-2">
                <Input
                  value={previewUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-2">
              <p><strong>How it works:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Preview mode shows test notifications with your design</li>
                <li>Only you can see preview mode (not visible to other visitors)</li>
                <li>The widget must be installed on your site for this to work</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleOpenPreview}
              disabled={!previewUrl}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
