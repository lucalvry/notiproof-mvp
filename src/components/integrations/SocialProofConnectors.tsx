import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ThumbsUp, MessageCircle, Plus, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface SocialConnector {
  id: string;
  type: string;
  name: string;
  config: any;
  status: string;
  last_sync?: string;
  itemCount?: number;
}

const connectorTypes = [
  { value: "google_reviews", label: "Google Reviews", icon: Star },
  { value: "trustpilot", label: "Trustpilot", icon: ThumbsUp },
  { value: "product_reviews", label: "Product Reviews", icon: MessageCircle },
];

export function SocialProofConnectors() {
  const [connectors, setConnectors] = useState<SocialConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    name: "",
    placeId: "",
    apiKey: "",
    businessId: "",
  });

  useEffect(() => {
    fetchConnectors();
  }, []);

  const fetchConnectors = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: connectorsData, error } = await supabase
        .from("social_connectors")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      // Get item counts for each connector
      const connectorsWithCounts = await Promise.all(
        (connectorsData || []).map(async (connector) => {
          const { count } = await supabase
            .from("social_items")
            .select("*", { count: "exact", head: true })
            .eq("connector_id", connector.id);

          return {
            ...connector,
            itemCount: count || 0,
          };
        })
      );

      setConnectors(connectorsWithCounts);
    } catch (error) {
      console.error("Error fetching connectors:", error);
      toast.error("Failed to load social proof connectors");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const config: any = {};
      
      if (formData.type === "google_reviews") {
        config.place_id = formData.placeId;
      } else if (formData.type === "trustpilot") {
        config.business_id = formData.businessId;
      }

      const { error } = await supabase
        .from("social_connectors")
        .insert({
          user_id: user.id,
          type: formData.type,
          name: formData.name,
          config,
          status: "active",
        });

      if (error) throw error;

      toast.success("Social proof connector created!");
      setDialogOpen(false);
      setFormData({ type: "", name: "", placeId: "", apiKey: "", businessId: "" });
      fetchConnectors();
    } catch (error) {
      console.error("Error creating connector:", error);
      toast.error("Failed to create connector");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("social_connectors")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Connector deleted");
      fetchConnectors();
    } catch (error) {
      console.error("Error deleting connector:", error);
      toast.error("Failed to delete connector");
    }
  };

  const handleSync = async (connector: SocialConnector) => {
    try {
      toast.info("Syncing reviews...");
      
      // Update last_sync
      const { error } = await supabase
        .from("social_connectors")
        .update({ last_sync: new Date().toISOString() })
        .eq("id", connector.id);

      if (error) throw error;

      toast.success("Sync initiated");
      fetchConnectors();
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error("Failed to sync");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Social Proof Sources</h3>
          <p className="text-sm text-muted-foreground">
            Connect review platforms to automatically display customer testimonials
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Social Proof Source</DialogTitle>
              <DialogDescription>
                Connect a review platform to display customer testimonials
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source type" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectorTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g., Main Store Reviews"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {formData.type === "google_reviews" && (
                <div className="space-y-2">
                  <Label>Google Place ID</Label>
                  <Input
                    placeholder="ChIJ..."
                    value={formData.placeId}
                    onChange={(e) => setFormData({ ...formData, placeId: e.target.value })}
                  />
                </div>
              )}

              {formData.type === "trustpilot" && (
                <div className="space-y-2">
                  <Label>Business ID</Label>
                  <Input
                    placeholder="Your Trustpilot business ID"
                    value={formData.businessId}
                    onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
                  />
                </div>
              )}

              <Button onClick={handleCreate} className="w-full">
                Create Connector
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {connectors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No social proof sources connected</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Connect review platforms to automatically display customer testimonials
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Source
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connectors.map((connector) => {
            const typeInfo = connectorTypes.find((t) => t.value === connector.type);
            const Icon = typeInfo?.icon || MessageCircle;

            return (
              <Card key={connector.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{connector.name}</CardTitle>
                        <Badge variant={connector.status === "active" ? "default" : "secondary"} className="mt-1">
                          {connector.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription>
                    {typeInfo?.label || connector.type}
                  </CardDescription>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items collected:</span>
                      <span className="font-medium">{connector.itemCount || 0}</span>
                    </div>
                    {connector.last_sync && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last sync:</span>
                        <span>{new Date(connector.last_sync).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSync(connector)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(connector.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
