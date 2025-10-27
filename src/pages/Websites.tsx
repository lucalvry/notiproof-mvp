import { useState } from "react";
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

const platforms = [
  "Shopify",
  "WooCommerce",
  "WordPress",
  "Magento",
  "Framer",
  "Wix",
  "Squarespace",
  "BigCommerce",
  "Custom",
];

export default function Websites() {
  const [websites] = useState(mockWebsites);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [snippetDialogOpen, setSnippetDialogOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<typeof mockWebsites[0] | null>(null);
  const [newSite, setNewSite] = useState({
    name: "",
    domain: "",
    platform: "",
  });

  const sitesUsed = websites.length;
  const sitesAllowed = 10;
  const canAddSite = sitesUsed < sitesAllowed;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge variant="default" className="bg-success text-success-foreground">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case "pending_verification":
        return (
          <Badge variant="default" className="bg-pending text-pending-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleAddWebsite = () => {
    if (!newSite.name || !newSite.domain || !newSite.platform) {
      toast.error("Please fill in all fields");
      return;
    }

    // TODO: Implement actual website creation
    setAddDialogOpen(false);
    setVerifyDialogOpen(true);
    toast.success("Website added! Please verify your site.");
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
                    <DropdownMenuItem className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(site.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Platform</span>
                <span className="text-sm font-medium">{site.platform}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Campaigns</span>
                <span className="text-sm font-medium">{site.campaigns}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Views</span>
                <span className="text-sm font-medium">
                  {site.views.toLocaleString()}
                </span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                disabled={site.status !== "verified"}
              >
                View Dashboard
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

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
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={newSite.platform}
                onValueChange={(value) =>
                  setNewSite({ ...newSite, platform: value })
                }
              >
                <SelectTrigger id="platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
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
              <Label htmlFor="edit-platform">Platform</Label>
              <Select defaultValue={selectedWebsite?.platform}>
                <SelectTrigger id="edit-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
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
