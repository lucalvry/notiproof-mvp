import { useEffect, useState } from "react";
import { Plus, Globe, CheckCircle2, Clock, XCircle, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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

const businessTypes = [
  { value: "ecommerce", label: "E-Commerce" },
  { value: "saas", label: "SaaS" },
  { value: "services", label: "Services" },
  { value: "blog", label: "Blog/Content" },
  { value: "education", label: "Education" },
  { value: "healthcare", label: "Healthcare" },
  { value: "real_estate", label: "Real Estate" },
  { value: "hospitality", label: "Hospitality" },
  { value: "retail", label: "Retail" },
  { value: "fitness", label: "Fitness" },
  { value: "beauty", label: "Beauty" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "travel", label: "Travel" },
  { value: "finance", label: "Finance" },
  { value: "technology", label: "Technology" },
  { value: "consulting", label: "Consulting" },
  { value: "marketing_agency", label: "Marketing Agency" },
  { value: "events", label: "Events" },
  { value: "ngo", label: "Non-Profit/NGO" },
  { value: "automotive", label: "Automotive" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "media", label: "Media" },
  { value: "legal", label: "Legal" },
];

export default function Websites() {
  const [userId, setUserId] = useState<string>();
  const { websites, isLoading, addWebsite, deleteWebsite } = useWebsites(userId);
  
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
  const [newSite, setNewSite] = useState({
    name: "",
    domain: "",
    businessType: "",
  });

  const sitesUsed = websites.length;
  const sitesAllowed = 10;
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

  const handleAddWebsite = () => {
    if (!newSite.name || !newSite.domain || !newSite.businessType) {
      toast.error("Please fill in all fields");
      return;
    }

    addWebsite({
      name: newSite.name,
      domain: newSite.domain,
      business_type: newSite.businessType,
    });
    
    setAddDialogOpen(false);
    setVerifyDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Websites</h1>
          <p className="text-muted-foreground">
            Manage your websites and campaigns
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

      {/* Usage Meter */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            You're using {sitesUsed} of {sitesAllowed} sites on your plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(sitesUsed / sitesAllowed) * 100}%` }}
            />
          </div>
          {!canAddSite && (
            <p className="mt-2 text-sm text-destructive">
              You've reached your site limit. Upgrade to add more sites.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Websites Grid */}
      {isLoading ? (
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
                        onClick={() => deleteWebsite(site.id)}
                      >
                        Delete
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
                  <span className="text-sm font-medium capitalize">{site.business_type.replace(/_/g, ' ')}</span>
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
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!site.is_verified}
                >
                  View Dashboard
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Website Dialog */}
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
                <SelectContent>
                  {businessTypes.map((type) => (
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
              <Label>Installation Script</Label>
              <div className="rounded-lg bg-muted p-4">
                <code className="text-sm">
                  {`<script src="https://notiproof.com/widget.js" data-site-token="abc123xyz"></script>`}
                </code>
              </div>
              <p className="text-sm text-muted-foreground">
                Add this script before the closing {`</body>`} tag on your website
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
                <SelectContent>
                  {businessTypes.map((type) => (
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
            <DialogTitle>Installation Snippet</DialogTitle>
            <DialogDescription>
              Copy and paste this code into your website
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Script Tag</Label>
              <div className="rounded-lg bg-muted p-4">
                <code className="text-sm break-all">
                  {`<script src="https://notiproof.com/widget.js" data-site-token="${selectedWebsite?.id}abc"></script>`}
                </code>
              </div>
              <p className="text-sm text-muted-foreground">
                Add this before the closing {`</body>`} tag
              </p>
            </div>
            <div className="space-y-2">
              <Label>Installation Instructions</Label>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Copy the script tag above</li>
                <li>Open your website's HTML file or theme editor</li>
                <li>Paste the script before the closing {`</body>`} tag</li>
                <li>Save and publish your changes</li>
                <li>Wait a few minutes for verification to complete</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              navigator.clipboard.writeText(
                `<script src="https://notiproof.com/widget.js" data-site-token="${selectedWebsite?.id}abc"></script>`
              );
              toast.success("Snippet copied to clipboard!");
            }}>
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
