import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, CheckCircle, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Website {
  id: string;
  name: string;
  domain: string;
  status: string;
  is_verified: boolean;
  created_at: string;
  user_id: string;
  business_type: string;
  profiles?: {
    name: string;
    email: string;
  } | null;
}

export default function AdminWebsites() {
  const { loading: authLoading } = useAdminAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      fetchWebsites();
    }
  }, [authLoading]);

  const fetchWebsites = async () => {
    try {
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles and auth data separately
      const userIds = [...new Set(data?.map((w) => w.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds) as { data: Array<{ id: string; name: string | null }> | null };

      // Get email from auth.users via admin API
      const { data: authData } = await supabase.auth.admin.listUsers();
      
      const websitesWithProfiles = data?.map((website) => {
        const profile = profiles?.find((p: any) => p.id === website.user_id);
        const authUser = authData?.users.find((u: any) => u.id === website.user_id);
        return {
          ...website,
          profiles: profile ? { 
            name: profile.name || "Unknown", 
            email: authUser?.email || "Unknown" 
          } : null,
        };
      });

      setWebsites(websitesWithProfiles || []);
    } catch (error: any) {
      console.error("Error fetching websites:", error);
      toast.error("Failed to fetch websites");
    } finally {
      setLoading(false);
    }
  };

  const logAdminAction = async (action: string, resourceId: string, details: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action,
      resource_type: "website",
      resource_id: resourceId,
      details,
    });
  };

  const handleVerifyWebsite = async (websiteId: string) => {
    try {
      const { error } = await supabase
        .from("websites")
        .update({ is_verified: true, status: "active" })
        .eq("id", websiteId);

      if (error) throw error;

      await logAdminAction("verify_website", websiteId, { 
        verified_by: "admin",
        method: "manual_override" 
      });

      toast.success("Website verified successfully");
      fetchWebsites();
    } catch (error) {
      console.error("Error verifying website:", error);
      toast.error("Failed to verify website");
    }
  };

  const handleSuspendWebsite = async (websiteId: string) => {
    try {
      const { error } = await supabase
        .from("websites")
        .update({ status: "suspended" })
        .eq("id", websiteId);

      if (error) throw error;

      await logAdminAction("suspend_website", websiteId, { reason: "Admin action" });

      toast.success("Website suspended successfully");
      fetchWebsites();
    } catch (error) {
      console.error("Error suspending website:", error);
      toast.error("Failed to suspend website");
    }
  };

  const handleDeleteWebsite = async (websiteId: string) => {
    if (!confirm("Are you sure you want to delete this website? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("websites").delete().eq("id", websiteId);

      if (error) throw error;

      await logAdminAction("delete_website", websiteId, { deleted_by: "admin" });

      toast.success("Website deleted successfully");
      fetchWebsites();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error deleting website:", error);
      toast.error("Failed to delete website");
    }
  };

  const filteredWebsites = websites.filter((website) => {
    const matchesSearch =
      website.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      website.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || website.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (isVerified) {
      return <Badge variant="default">Verified</Badge>;
    }
    switch (status) {
      case "active":
        return <Badge variant="outline">Active</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Website Management</h1>
        <p className="text-muted-foreground">Manage all registered websites</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Websites</CardTitle>
              <CardDescription>{filteredWebsites.length} total websites</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search websites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWebsites.map((website) => (
                <TableRow key={website.id}>
                  <TableCell className="font-medium">{website.name}</TableCell>
                  <TableCell>{website.domain}</TableCell>
                  <TableCell>
                    {website.profiles ? (
                      <div>
                        <div className="font-medium">{website.profiles.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {website.profiles.email}
                        </div>
                      </div>
                    ) : (
                      "Unknown"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{website.business_type}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(website.status, website.is_verified)}</TableCell>
                  <TableCell>{new Date(website.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedWebsite(website);
                          setDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!website.is_verified && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVerifyWebsite(website.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSuspendWebsite(website.id)}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedWebsite && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedWebsite.name}</DialogTitle>
                <DialogDescription>{selectedWebsite.domain}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Website Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Website ID:</span>
                      <span className="font-mono text-xs">{selectedWebsite.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Business Type:</span>
                      <Badge variant="outline">{selectedWebsite.business_type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedWebsite.status, selectedWebsite.is_verified)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verified:</span>
                      <span>{selectedWebsite.is_verified ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(selectedWebsite.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!selectedWebsite.is_verified && (
                    <Button
                      onClick={() => handleVerifyWebsite(selectedWebsite.id)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Force Verify
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteWebsite(selectedWebsite.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
