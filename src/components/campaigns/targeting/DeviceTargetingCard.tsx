import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Monitor, Smartphone, Tablet } from "lucide-react";

interface DeviceTargetingCardProps {
  devices: ('desktop' | 'mobile' | 'tablet')[];
  onChange: (devices: ('desktop' | 'mobile' | 'tablet')[]) => void;
}

export function DeviceTargetingCard({ devices, onChange }: DeviceTargetingCardProps) {
  const toggleDevice = (device: 'desktop' | 'mobile' | 'tablet') => {
    if (devices.includes(device)) {
      // Don't allow unchecking if it's the last one
      if (devices.length === 1) return;
      onChange(devices.filter((d) => d !== device));
    } else {
      onChange([...devices, device]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Targeting</CardTitle>
        <CardDescription>
          Choose which devices should display this notification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
            <Checkbox
              id="desktop"
              checked={devices.includes('desktop')}
              onCheckedChange={() => toggleDevice('desktop')}
            />
            <Label
              htmlFor="desktop"
              className="flex items-center gap-2 cursor-pointer flex-1"
            >
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <span>Desktop</span>
            </Label>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
            <Checkbox
              id="mobile"
              checked={devices.includes('mobile')}
              onCheckedChange={() => toggleDevice('mobile')}
            />
            <Label
              htmlFor="mobile"
              className="flex items-center gap-2 cursor-pointer flex-1"
            >
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span>Mobile</span>
            </Label>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
            <Checkbox
              id="tablet"
              checked={devices.includes('tablet')}
              onCheckedChange={() => toggleDevice('tablet')}
            />
            <Label
              htmlFor="tablet"
              className="flex items-center gap-2 cursor-pointer flex-1"
            >
              <Tablet className="h-4 w-4 text-muted-foreground" />
              <span>Tablet</span>
            </Label>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          At least one device type must be selected
        </p>
      </CardContent>
    </Card>
  );
}
