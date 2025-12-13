import { useState, useEffect } from "react";
import { Archive, RotateCcw, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ArchivedWebsite {
  id: string;
  name: string;
  domain: string;
  deleted_at: string;
  business_type: string;
}

interface ArchivedWebsitesSectionProps {
  userId: string | undefined;
  onRestored: () => void;
}

export function ArchivedWebsitesSection({ userId, onRestored }: ArchivedWebsitesSectionProps) {
  const [archivedWebsites, setArchivedWebsites] = useState<ArchivedWebsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchArchivedWebsites = async () => {
    if (!userId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('websites')
      .select('id, name, domain, deleted_at, business_type')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (!error && data) {
      setArchivedWebsites(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchArchivedWebsites();
    }
  }, [isOpen, userId]);

  const handleRestore = async (websiteId: string) => {
    setRestoring(websiteId);
    try {
      const { data, error } = await supabase.rpc('restore_website', { _website_id: websiteId });
      
      if (error) throw error;
      
      toast.success('Website restored successfully!');
      setArchivedWebsites(prev => prev.filter(w => w.id !== websiteId));
      onRestored();
    } catch (error) {
      toast.error('Failed to restore website');
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteId) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', permanentDeleteId);
      
      if (error) throw error;
      
      toast.success('Website permanently deleted');
      setArchivedWebsites(prev => prev.filter(w => w.id !== permanentDeleteId));
    } catch (error) {
      toast.error('Failed to delete website');
    } finally {
      setDeleting(false);
      setPermanentDeleteId(null);
    }
  };

  const getDaysUntilPurge = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const purgeDate = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysLeft = Math.ceil((purgeDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  if (archivedWebsites.length === 0 && !loading && !isOpen) {
    return null;
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-dashed border-muted-foreground/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">Archived Websites</CardTitle>
                    <CardDescription>
                      {loading ? 'Loading...' : `${archivedWebsites.length} archived website${archivedWebsites.length !== 1 ? 's' : ''}`}
                    </CardDescription>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : archivedWebsites.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No archived websites
                </p>
              ) : (
                <div className="space-y-3">
                  {archivedWebsites.map((website) => {
                    const daysLeft = getDaysUntilPurge(website.deleted_at);
                    
                    return (
                      <div
                        key={website.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{website.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{website.domain}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Archived {formatDistanceToNow(new Date(website.deleted_at))} ago
                            </Badge>
                            {daysLeft <= 7 && (
                              <Badge variant="destructive" className="text-xs">
                                Purges in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(website.id)}
                            disabled={restoring === website.id}
                          >
                            {restoring === website.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restore
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPermanentDeleteId(website.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <AlertDialog open={!!permanentDeleteId} onOpenChange={() => setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Permanently Delete Website</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the website and all associated data including testimonials, campaigns, widgets, and events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
