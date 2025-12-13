import { useState, useEffect } from "react";
import { AlertTriangle, Archive, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface DeletionImpact {
  testimonials: number;
  campaigns: number;
  widgets: number;
  events: number;
  integrations: number;
}

interface DeleteWebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  website: {
    id: string;
    name: string;
    domain: string;
  } | null;
  onArchive: (websiteId: string) => Promise<unknown>;
}

export function DeleteWebsiteDialog({
  open,
  onOpenChange,
  website,
  onArchive,
}: DeleteWebsiteDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (open && website) {
      setConfirmText("");
      setLoading(true);
      
      // Fetch deletion impact
      supabase
        .rpc('get_website_deletion_impact', { _website_id: website.id })
        .then(({ data, error }) => {
          if (!error && data) {
            setImpact(data as unknown as DeletionImpact);
          }
          setLoading(false);
        });
    }
  }, [open, website]);

  const handleArchive = async () => {
    if (!website) return;
    
    setArchiving(true);
    try {
      await onArchive(website.id);
      onOpenChange(false);
    } finally {
      setArchiving(false);
    }
  };

  const totalAffected = impact
    ? impact.testimonials + impact.campaigns + impact.widgets + impact.events + impact.integrations
    : 0;

  const isConfirmValid = confirmText === website?.domain;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Archive Website
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to archive <strong>{website?.name}</strong> ({website?.domain}).
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : impact && totalAffected > 0 ? (
                <div className="rounded-lg border border-warning bg-warning/10 p-4 space-y-2">
                  <p className="font-medium text-warning-foreground">
                    This will affect the following data:
                  </p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {impact.testimonials > 0 && (
                      <li>• {impact.testimonials} testimonial{impact.testimonials !== 1 ? 's' : ''}</li>
                    )}
                    {impact.campaigns > 0 && (
                      <li>• {impact.campaigns} campaign{impact.campaigns !== 1 ? 's' : ''}</li>
                    )}
                    {impact.widgets > 0 && (
                      <li>• {impact.widgets} widget{impact.widgets !== 1 ? 's' : ''}</li>
                    )}
                    {impact.events > 0 && (
                      <li>• {impact.events.toLocaleString()} event{impact.events !== 1 ? 's' : ''}</li>
                    )}
                    {impact.integrations > 0 && (
                      <li>• {impact.integrations} integration{impact.integrations !== 1 ? 's' : ''}</li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="rounded-lg border border-muted bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    No associated data found for this website.
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-success/50 bg-success/10 p-4">
                <p className="text-sm text-success-foreground">
                  <strong>Good news:</strong> Archived websites can be restored within 30 days. 
                  All associated data will be preserved.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-domain">
                  Type <strong>{website?.domain}</strong> to confirm
                </Label>
                <Input
                  id="confirm-domain"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={website?.domain}
                  className="font-mono"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="default"
            onClick={handleArchive}
            disabled={!isConfirmValid || archiving}
            className="gap-2"
          >
            {archiving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Archive Website
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
