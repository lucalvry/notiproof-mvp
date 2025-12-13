import { useEffect, useState, useCallback } from "react";
import { Plus, Globe, CheckCircle2, Clock, XCircle, MoreVertical, AlertCircle, Copy, RefreshCw, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UpgradeCTA } from "@/components/billing/UpgradeCTA";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useWebsites } from "@/hooks/useWebsites";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionWizard } from "@/components/websites/ConnectionWizard";
import { getAllBusinessTypes, getBusinessTypeLabel } from "@/lib/businessTypes";
import { FreeTrialLimitBanner } from "@/components/billing/FreeTrialLimitBanner";
import { DeleteWebsiteDialog } from "@/components/websites/DeleteWebsiteDialog";
import { ArchivedWebsitesSection } from "@/components/websites/ArchivedWebsitesSection";

const mockWebsites = [
  {
    id: 1,
    name: "Example Store",
    domain: "example.com",
    platform: "Shopify",
    status: "verified",
    campaigns: 5,
    views: 12420,
  },
  {
    id: 2,
    name: "My Shop",
    domain: "mystore.com",
    platform: "WooCommerce",
    status: "pending_verification",
    campaigns: 0,
    views: 0,
  },
];

export default function Websites() {
  const allBusinessTypes = getAllBusinessTypes();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>();
  const { websites, isLoading, addWebsiteAsync, archiveWebsite } = useWebsites(userId);
  const { sitesAllowed, planName, isLoading: subscriptionLoading } = useSubscription(userId);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [snippetDialogOpen, setSnippetDialogOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<any>(null);
  const [showConnectionWizard, setShowConnectionWizard] = useState<string | null>(null);
  const [newSite, setNewSite] = useState({
    name: "",
    domain: "",
    businessType: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [websiteToDelete, setWebsiteToDelete] = useState<any>(null);

  // Real-time verification check
  useEffect(() => {
    const unverifiedSites = websites.filter(
      site => !site.is_verified && (site.widgetCount || 0) > 0
    );

    if (unverifiedSites.length === 0) return;

    const interval = setInterval(async () => {
      for (const site of unverifiedSites) {
        const { data, error } = await supabase
          .from('websites')
          .select('is_verified')
          .eq('id', site.id)
          .single();

        if (!error && data?.is_verified) {
          toast.success(`🎉 ${site.name} is now connected!`);
          // Trigger refresh by setting userId again
          supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id);
          });
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [websites]);

  const sitesUsed = websites.length;
  const canAddSite = sitesUsed < sitesAllowed;

  const getStatusBadge = (is_verified: boolean) => {
    if (is_verified) {
      return (
        <Badge variant="default" className="bg-success text-success-foreground">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-pending text-pending-foreground">
        <Clock className="mr-1 h-3 w-3" />
        Pending
      </Badge>
    );
  };

  const handleAddWebsite = async () => {
    if (!newSite.name || !newSite.domain || !newSite.businessType) {
      toast.error("Please fill in all fields");
      return;
    }

    // Check limit before attempting to add
    if (sitesUsed >= sitesAllowed) {
      toast.error(`You've reached your ${planName} plan limit of ${sitesAllowed} website${sitesAllowed !== 1 ? 's' : ''}. Please upgrade to add more.`);
      return;
    }

    try {
      const createdWebsite = await addWebsiteAsync({
        name: newSite.name,
        domain: newSite.domain,
        business_type: newSite.businessType,
      });
      
      if (createdWebsite) {
        setSelectedWebsite(createdWebsite);
        setShowConnectionWizard(createdWebsite.id);
      }
      
      setAddDialogOpen(false);
      setVerifyDialogOpen(true);
    } catch (error) {
      // Error is already handled by the mutation
      console.error('Failed to add website:', error);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Websites</h1>
          <p className="text-muted-foreground">
            {sitesUsed} of {sitesAllowed} websites used on {planName} plan
          </p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          disabled={!canAddSite}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Website
        </Button>
      </div>

      {/* Show upgrade banner when at or approaching limit */}
      <FreeTrialLimitBanner
        type="websites"
        current={sitesUsed}
        limit={sitesAllowed}
        planName={planName}
      />

      {/* Websites Grid */}
      {/* Show connection wizard for new unverified sites */}
      {websites.some(site => !site.is_verified && showConnectionWizard === site.id) && (
        <ConnectionWizard
          website={websites.find(site => site.id === showConnectionWizard)!}
          onViewCode={() => {
            const site = websites.find(s => s.id === showConnectionWizard);
            if (site) {
              setSelectedWebsite(site);
              setSnippetDialogOpen(true);
            }
          }}
        />
      )}

      {isLoading || subscriptionLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-10 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : websites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <Globe className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No Websites Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Get started by adding your first website. You'll be able to create social proof widgets and track their performance.
            </p>
            <Button size="lg" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Website
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {websites.map((site) => (
            <Card key={site.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{site.name}</CardTitle>
                      <CardDescription>{site.domain}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedWebsite(site);
                        setEditDialogOpen(true);
                      }}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedWebsite(site);
                        setSnippetDialogOpen(true);
                      }}>
                        View snippet
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => {
                          setWebsiteToDelete(site);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(site.is_verified)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Business Type</span>
                  <span className="text-sm font-medium">{getBusinessTypeLabel(site.business_type as any)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Widgets</span>
                  <span className="text-sm font-medium">{site.widgetCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Views</span>
                  <span className="text-sm font-medium">
                    {site.totalViews?.toLocaleString() || '0'}
                  </span>
                </div>

                {/* Action buttons based on state */}
                <div className="space-y-2 pt-2">
                  {site.widgetCount === 0 ? (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => {
                          navigate(`/campaigns?website=${site.id}`);
                          setShowConnectionWizard(site.id);
                        }}
                      >
                        Create First Widget
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Step 1: Create a widget to get started
                      </p>
                    </>
                  ) : !site.is_verified ? (
                    <>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSelectedWebsite(site);
                          setSnippetDialogOpen(true);
                        }}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        View Installation Code
                      </Button>
                      <div className="flex items-center justify-center gap-2 text-xs text-pending">
                        <Clock className="h-3 w-3 animate-pulse" />
                        <span>Waiting for widget installation...</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-xs"
                        onClick={() => setShowConnectionWizard(site.id)}
                      >
                        Show setup guide
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => navigate(`/analytics?website=${site.id}`)}
                      >
                        View Dashboard
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/campaigns?website=${site.id}`)}
                      >
                        Create Another Widget
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Archived Websites Section */}
      <ArchivedWebsitesSection 
        userId={userId} 
        onRestored={() => {
          // Refresh the websites list
          supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id);
          });
        }} 
      />
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Website</DialogTitle>
            <DialogDescription>
              Add a website to start creating social proof campaigns
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Website Name</Label>
              <Input
                id="name"
                placeholder="My Store"
                value={newSite.name}
                onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={newSite.domain}
                onChange={(e) => setNewSite({ ...newSite, domain: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select
                value={newSite.businessType}
                onValueChange={(value) =>
                  setNewSite({ ...newSite, businessType: value })
                }
              >
                <SelectTrigger id="businessType">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {allBusinessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWebsite}>Add Website</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify Your Website</DialogTitle>
            <DialogDescription>
              Add this script to your website to complete verification
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Unified Installation Script</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const code = `<script src="https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-script" data-site-token="${selectedWebsite?.verification_token || 'YOUR-TOKEN'}"></script>`;
                    navigator.clipboard.writeText(code);
                    toast.success("Code copied to clipboard!");
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <code className="text-sm break-all font-mono">
                  {`<script src="https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/widget-script" data-site-token="${selectedWebsite?.verification_token || 'YOUR-TOKEN'}"></script>`}
                </code>
              </div>
              <p className="text-sm text-muted-foreground">
                Add this script before the closing {`</body>`} tag. This single script handles verification and all widgets you create.
              </p>
            </div>
            <div className="rounded-lg border border-pending bg-pending/10 p-4">
              <div className="flex gap-3">
                <Clock className="h-5 w-5 text-pending" />
                <div>
                  <p className="font-medium">Verification in progress</p>
                  <p className="text-sm text-muted-foreground">
                    We're checking for the script on your website. This may take a
                    few minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setVerifyDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Website Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Website</DialogTitle>
            <DialogDescription>
              Update your website information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Website Name</Label>
              <Input
                id="edit-name"
                defaultValue={selectedWebsite?.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-domain">Domain</Label>
              <Input
                id="edit-domain"
                defaultValue={selectedWebsite?.domain}
                disabled
              />
              <p className="text-sm text-muted-foreground">
                Contact support to change your domain
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-businessType">Business Type</Label>
              <Select defaultValue={selectedWebsite?.business_type}>
                <SelectTrigger id="edit-businessType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {allBusinessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success("Website updated successfully!");
              setEditDialogOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Snippet Dialog */}
      <Dialog open={snippetDialogOpen} onOpenChange={setSnippetDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Website Verification Code</DialogTitle>
            <DialogDescription>
              Add this code to your website's HTML before the closing {`</body>`} tag
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Installation Code</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const code = `<script src="https://app.notiproof.com/widget.js" data-site-token="${selectedWebsite?.verification_token}"></script>`;
                      navigator.clipboard.writeText(code);
                      toast.success("Code copied to clipboard!");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <code className="text-sm break-all font-mono">
                  {`<script src="https://app.notiproof.com/widget.js" data-site-token="${selectedWebsite?.verification_token || 'TOKEN'}"></script>`}
                </code>
              </div>
              <p className="text-sm text-muted-foreground">
                This unified script handles website verification AND displays all your widgets. Install it once and create unlimited widgets without changing your code!
              </p>
            </div>
            
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-medium text-sm">Installation Steps</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Copy the code above</li>
                    <li>Paste it into your website's HTML</li>
                    <li>Place it right before the closing {`</body>`} tag</li>
                    <li>Save and publish your website</li>
                    <li>Visit your website in a browser to trigger verification</li>
                  </ol>
                  <p className="text-xs text-muted-foreground pt-2">
                    ⚡ <strong>Important:</strong> Verification happens automatically when someone visits your website with the script installed. You can click "Check Connection" below after visiting your site.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                  ✨
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-semibold text-sm">Unified Script Benefits</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Install once, works for all your widgets</li>
                    <li>Automatically verifies your website</li>
                    <li>No code changes needed when creating new widgets</li>
                    <li>All widgets display according to their individual rules</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSnippetDialogOpen(false)}>
              Close
            </Button>
            <Button 
              variant="outline"
              onClick={async () => {
                const { data } = await supabase
                  .from('websites')
                  .select('is_verified, id')
                  .eq('id', selectedWebsite?.id)
                  .single();
                
                // Check widget count
                const { count: widgetCount } = await supabase
                  .from('widgets')
                  .select('*', { count: 'exact', head: true })
                  .eq('website_id', data?.id);
                
                if (data?.is_verified && (widgetCount || 0) > 0) {
                  toast.success("✅ Website verified and widget exists! Your notifications should be displaying.");
                  setSnippetDialogOpen(false);
                  window.location.reload();
                } else if (data?.is_verified && (widgetCount || 0) === 0) {
                  toast.info("✅ Website verified! Now create a widget to display notifications.");
                  window.location.reload();
                } else {
                  toast.error("❌ Not verified yet. The script must be installed on your live website and someone must visit a page with the script for verification to complete. If you've already installed it, try visiting your website in a new tab.");
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Connection
            </Button>
            {selectedWebsite?.is_verified && (
              <Button onClick={() => {
                setSnippetDialogOpen(false);
                navigate(`/campaigns?website=${selectedWebsite?.id}`);
              }}>
                Create First Widget
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Website Confirmation Dialog */}
      <DeleteWebsiteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        website={websiteToDelete}
        onArchive={archiveWebsite}
      />
    </div>
  );
}
