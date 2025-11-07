import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Building2, BarChart3 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GA4Property {
  property: string;
  displayName: string;
  account: string;
  accountDisplayName: string;
}

interface GA4PropertyPickerProps {
  open: boolean;
  properties: GA4Property[];
  onSelect: (propertyId: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function GA4PropertyPicker({ 
  open, 
  properties, 
  onSelect, 
  onCancel,
  isLoading = false 
}: GA4PropertyPickerProps) {
  const [selectedProperty, setSelectedProperty] = useState<string>("");

  const handleConfirm = () => {
    if (selectedProperty) {
      onSelect(selectedProperty);
    }
  };

  // Group properties by account
  const groupedProperties = properties.reduce((acc, prop) => {
    const accountKey = prop.account;
    if (!acc[accountKey]) {
      acc[accountKey] = {
        accountDisplayName: prop.accountDisplayName,
        properties: []
      };
    }
    acc[accountKey].properties.push(prop);
    return acc;
  }, {} as Record<string, { accountDisplayName: string; properties: GA4Property[] }>);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isLoading && onCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Select GA4 Property
          </DialogTitle>
          <DialogDescription>
            Choose which Google Analytics 4 property you'd like to connect to this website.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <RadioGroup value={selectedProperty} onValueChange={setSelectedProperty}>
            <div className="space-y-4">
              {Object.entries(groupedProperties).map(([accountId, { accountDisplayName, properties }]) => (
                <div key={accountId} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    {accountDisplayName}
                  </div>
                  <div className="ml-6 space-y-2">
                    {properties.map((property) => (
                      <div
                        key={property.property}
                        className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                      >
                        <RadioGroupItem value={property.property} id={property.property} />
                        <Label
                          htmlFor={property.property}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium">{property.displayName}</div>
                          <div className="text-xs text-muted-foreground">{property.property}</div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedProperty || isLoading}
          >
            {isLoading ? "Connecting..." : "Connect Property"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
