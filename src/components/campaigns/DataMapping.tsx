import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DataMappingProps {
  fieldMap: any;
  campaignType: string;
  onChange: (fieldMap: any) => void;
}

export function DataMapping({ fieldMap, campaignType, onChange }: DataMappingProps) {
  const [mappings, setMappings] = useState({
    name: "Sarah Johnson",
    product: "Cozy Hoodie",
    city: "London",
    action: "purchased",
    ...fieldMap,
  });

  const [sampleEvents, setSampleEvents] = useState([
    {
      timestamp: "2 minutes ago",
      name: "Sarah Johnson",
      product: "Cozy Hoodie",
      city: "London",
      action: "purchased",
    },
    {
      timestamp: "5 minutes ago",
      name: "Mike Chen",
      product: "Premium Tee",
      city: "San Francisco",
      action: "added to cart",
    },
    {
      timestamp: "8 minutes ago",
      name: "Emma Davis",
      product: "Winter Jacket",
      city: "New York",
      action: "purchased",
    },
  ]);

  useEffect(() => {
    onChange(mappings);
  }, [mappings]);

  const updateMapping = (field: string, value: string) => {
    setMappings((prev) => ({ ...prev, [field]: value }));
  };

  const refreshSampleData = () => {
    toast.success("Sample data refreshed");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Proof Events</CardTitle>
              <CardDescription>
                Sample data from your selected source
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refreshSampleData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sampleEvents.map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {event.name} from {event.city} {event.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Product: {event.product}
                  </p>
                </div>
                <Badge variant="secondary">{event.timestamp}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field Mapping</CardTitle>
          <CardDescription>
            Map your data fields to notification placeholders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Placeholder: <code className="text-xs bg-muted px-1 rounded">{`{{name}}`}</code>
              </Label>
              <Input
                value={mappings.name}
                onChange={(e) => updateMapping("name", e.target.value)}
                placeholder="e.g., customer_name, first_name"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Placeholder: <code className="text-xs bg-muted px-1 rounded">{`{{product}}`}</code>
              </Label>
              <Input
                value={mappings.product}
                onChange={(e) => updateMapping("product", e.target.value)}
                placeholder="e.g., item_name, product_title"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Placeholder: <code className="text-xs bg-muted px-1 rounded">{`{{city}}`}</code>
              </Label>
              <Input
                value={mappings.city}
                onChange={(e) => updateMapping("city", e.target.value)}
                placeholder="e.g., location, city"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Placeholder: <code className="text-xs bg-muted px-1 rounded">{`{{action}}`}</code>
              </Label>
              <Input
                value={mappings.action}
                onChange={(e) => updateMapping("action", e.target.value)}
                placeholder="e.g., event_type, action"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview with Sample Data</CardTitle>
          <CardDescription>
            See how your notification will look with real data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary text-xs">
                IMG
              </div>
              <div>
                <p className="text-sm font-medium">
                  {mappings.name} from {mappings.city} just {mappings.action}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {mappings.product}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
