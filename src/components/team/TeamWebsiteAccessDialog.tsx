import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { TeamMember } from "@/hooks/useTeamPermissions";
import { useWebsites } from "@/hooks/useWebsites";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe } from "lucide-react";

interface TeamWebsiteAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember;
  onSuccess: () => void;
}

export function TeamWebsiteAccessDialog({ open, onOpenChange, member, onSuccess }: TeamWebsiteAccessDialogProps) {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>();
  const [accessType, setAccessType] = useState<'all' | 'specific'>(member.website_access?.type || 'all');
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>(member.website_access?.website_ids || []);

  const { websites } = useWebsites(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  useEffect(() => {
    if (open) {
      setAccessType(member.website_access?.type || 'all');
      setSelectedWebsites(member.website_access?.website_ids || []);
    }
  }, [open, member]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          website_access: {
            type: accessType,
            website_ids: accessType === 'specific' ? selectedWebsites : [],
          },
        })
        .eq('id', member.id);

      if (error) throw error;

      toast.success("Website access updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating website access:", error);
      toast.error(error.message || "Failed to update website access");
    } finally {
      setLoading(false);
    }
  };

  const toggleWebsite = (websiteId: string) => {
    setSelectedWebsites(prev =>
      prev.includes(websiteId)
        ? prev.filter(id => id !== websiteId)
        : [...prev, websiteId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Website Access - {member.profile?.name}</DialogTitle>
          <DialogDescription>
            Control which websites this team member can access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={accessType} onValueChange={(value: any) => setAccessType(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="cursor-pointer">
                All Websites - Full access to all current and future websites
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="specific" id="specific" />
              <Label htmlFor="specific" className="cursor-pointer">
                Specific Websites - Select individual websites
              </Label>
            </div>
          </RadioGroup>

          {accessType === 'specific' && (
            <div className="space-y-2 border rounded-lg p-4">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Select Websites
              </Label>
              {websites && websites.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {websites.map((website) => (
                    <div key={website.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={website.id}
                        checked={selectedWebsites.includes(website.id)}
                        onCheckedChange={() => toggleWebsite(website.id)}
                      />
                      <Label
                        htmlFor={website.id}
                        className="cursor-pointer font-normal flex-1"
                      >
                        {website.name}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({website.domain})
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No websites available</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
