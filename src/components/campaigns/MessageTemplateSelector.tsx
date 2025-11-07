import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, User, MapPin, Eye, EyeOff, Check, Library } from "lucide-react";
import { useState } from "react";
import { FullTemplateLibrary } from "./FullTemplateLibrary";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaignTemplates";

export interface MessageTemplateVariant {
  id: string;
  name: string;
  description: string;
  privacyLevel: 'full-details' | 'anonymous' | 'minimal';
  template: string;
  example: string;
  showNames: boolean;
  showLocations: boolean;
}

interface MessageTemplateSelectorProps {
  campaignType: string;
  selectedVariant?: MessageTemplateVariant;
  onSelect: (variant: MessageTemplateVariant) => void;
  onPrivacyChange?: (settings: { showNames: boolean; showLocations: boolean }) => void;
}

export function MessageTemplateSelector({
  campaignType,
  selectedVariant,
  onSelect,
  onPrivacyChange
}: MessageTemplateSelectorProps) {
  const [showNames, setShowNames] = useState(selectedVariant?.showNames ?? true);
  const [showLocations, setShowLocations] = useState(selectedVariant?.showLocations ?? true);
  const [showFullLibrary, setShowFullLibrary] = useState(false);

  // Generate template variations based on campaign type
  const getTemplateVariants = (): MessageTemplateVariant[] => {
    const variants: Record<string, MessageTemplateVariant[]> = {
      'recent-purchase': [
        {
          id: 'full-details',
          name: 'Full Details',
          description: 'Show customer names and locations',
          privacyLevel: 'full-details',
          template: '{{user_name}} from {{location}} just bought {{product_name}}',
          example: 'Sarah from London just bought Wireless Headphones',
          showNames: true,
          showLocations: true,
        },
        {
          id: 'anonymous',
          name: 'Anonymous',
          description: 'Hide customer names, show locations only',
          privacyLevel: 'anonymous',
          template: 'Someone from {{location}} just bought {{product_name}}',
          example: 'Someone from London just bought Wireless Headphones',
          showNames: false,
          showLocations: true,
        },
        {
          id: 'minimal',
          name: 'Minimal Privacy',
          description: 'Hide both names and locations',
          privacyLevel: 'minimal',
          template: 'Someone just bought {{product_name}}',
          example: 'Someone just bought Wireless Headphones',
          showNames: false,
          showLocations: false,
        },
      ],
      'new-signup': [
        {
          id: 'full-details',
          name: 'Full Details',
          description: 'Show user names and locations',
          privacyLevel: 'full-details',
          template: '{{user_name}} from {{location}} just signed up',
          example: 'John from Austin just signed up',
          showNames: true,
          showLocations: true,
        },
        {
          id: 'anonymous',
          name: 'Anonymous',
          description: 'Hide user names, show locations only',
          privacyLevel: 'anonymous',
          template: 'Someone from {{location}} just signed up',
          example: 'Someone from Austin just signed up',
          showNames: false,
          showLocations: true,
        },
        {
          id: 'minimal',
          name: 'Minimal Privacy',
          description: 'Hide both names and locations',
          privacyLevel: 'minimal',
          template: 'Someone just signed up',
          example: 'Someone just signed up',
          showNames: false,
          showLocations: false,
        },
      ],
      'default': [
        {
          id: 'full-details',
          name: 'Full Details',
          description: 'Show all available information',
          privacyLevel: 'full-details',
          template: '{{user_name}} from {{location}} {{action}}',
          example: 'Taylor from Lagos just completed an action',
          showNames: true,
          showLocations: true,
        },
        {
          id: 'anonymous',
          name: 'Anonymous',
          description: 'Hide names, show locations',
          privacyLevel: 'anonymous',
          template: 'Someone from {{location}} {{action}}',
          example: 'Someone from Lagos just completed an action',
          showNames: false,
          showLocations: true,
        },
        {
          id: 'minimal',
          name: 'Minimal Privacy',
          description: 'Hide all personal information',
          privacyLevel: 'minimal',
          template: 'Someone {{action}}',
          example: 'Someone just completed an action',
          showNames: false,
          showLocations: false,
        },
      ],
    };

    return variants[campaignType] || variants['default'];
  };

  const variants = getTemplateVariants();

  const handleVariantSelect = (variant: MessageTemplateVariant) => {
    const updatedVariant = {
      ...variant,
      showNames,
      showLocations,
    };
    onSelect(updatedVariant);
    onPrivacyChange?.({ showNames, showLocations });
  };

  const handlePrivacyToggle = (type: 'names' | 'locations', enabled: boolean) => {
    if (type === 'names') {
      setShowNames(enabled);
    } else {
      setShowLocations(enabled);
    }
    
    // Update selected variant with new privacy settings
    if (selectedVariant) {
      const updatedVariant = {
        ...selectedVariant,
        showNames: type === 'names' ? enabled : showNames,
        showLocations: type === 'locations' ? enabled : showLocations,
      };
      onSelect(updatedVariant);
    }
    
    onPrivacyChange?.({
      showNames: type === 'names' ? enabled : showNames,
      showLocations: type === 'locations' ? enabled : showLocations,
    });
  };

  // Show full template library if toggled
  if (showFullLibrary) {
    return (
      <div className="space-y-4 py-6">
        <Button 
          variant="outline" 
          onClick={() => setShowFullLibrary(false)}
          className="mb-4"
        >
          ← Back to Privacy Variants
        </Button>
        <FullTemplateLibrary 
          onSelectTemplate={(template) => {
            onSelect({
              id: template.id,
              name: template.name,
              description: template.example,
              privacyLevel: 'full-details',
              template: template.messageTemplate,
              example: template.example,
              showNames: true,
              showLocations: true,
            });
            setShowFullLibrary(false);
          }}
          selectedTemplateId={selectedVariant?.id}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Eye className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Choose Message Style</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Select how much customer information you want to display in your notifications
        </p>
      </div>

      {/* Privacy Controls */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Privacy Controls</CardTitle>
          </div>
          <CardDescription>
            Customize which information appears in your notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="show-names" className="text-sm font-medium">
                  Show Customer Names
                </Label>
                <p className="text-xs text-muted-foreground">
                  Display actual customer names or use "Someone"
                </p>
              </div>
            </div>
            <Switch
              id="show-names"
              checked={showNames}
              onCheckedChange={(enabled) => handlePrivacyToggle('names', enabled)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="show-locations" className="text-sm font-medium">
                  Show Locations
                </Label>
                <p className="text-xs text-muted-foreground">
                  Display customer city/country information
                </p>
              </div>
            </div>
            <Switch
              id="show-locations"
              checked={showLocations}
              onCheckedChange={(enabled) => handlePrivacyToggle('locations', enabled)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Template Variants */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Message Templates</Label>
        <div className="grid gap-3">
          {variants.map((variant) => {
            const isSelected = selectedVariant?.id === variant.id;
            const isRecommended = variant.id === 'full-details';
            
            return (
              <Card
                key={variant.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  isSelected ? 'border-primary shadow-sm bg-primary/5' : ''
                }`}
                onClick={() => handleVariantSelect(variant)}
              >
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{variant.name}</h3>
                          {isRecommended && (
                            <Badge variant="secondary" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary ml-auto" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {variant.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {variant.showNames ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <User className="h-3 w-3" />
                          Shows Names
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 opacity-50">
                          <EyeOff className="h-3 w-3" />
                          Hides Names
                        </Badge>
                      )}
                      {variant.showLocations ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <MapPin className="h-3 w-3" />
                          Shows Location
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 opacity-50">
                          <EyeOff className="h-3 w-3" />
                          Hides Location
                        </Badge>
                      )}
                    </div>

                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Example:</p>
                      <p className="text-sm font-medium">{variant.example}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Browse All Templates CTA */}
      <Card className="border-dashed bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6 text-center">
          <Library className="h-8 w-8 mx-auto mb-3 text-primary" />
          <p className="text-sm font-medium mb-2">
            Want more message options?
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Browse {CAMPAIGN_TEMPLATES.length}+ pre-built templates across all categories
          </p>
          <Button 
            variant="outline" 
            onClick={() => setShowFullLibrary(true)}
            className="w-full"
          >
            Browse All Templates →
          </Button>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Privacy Compliance
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Anonymous templates help you comply with GDPR and privacy regulations by not displaying personal information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
