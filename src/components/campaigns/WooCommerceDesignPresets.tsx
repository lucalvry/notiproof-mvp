import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Palette, Sparkles } from "lucide-react";

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  themeLogo?: string;
  colors: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    linkColor: string;
    borderRadius: string;
    shadow?: string;
    borderColor?: string;
    borderWidth?: string;
  };
}

export const WOOCOMMERCE_THEME_PRESETS: DesignPreset[] = [
  {
    id: "storefront",
    name: "Storefront",
    description: "Official WooCommerce theme - Clean & minimal",
    themeLogo: "🏪",
    colors: {
      primaryColor: "#96588a",
      backgroundColor: "#ffffff",
      textColor: "#43454b",
      linkColor: "#96588a",
      borderRadius: "3",
      shadow: "sm",
      borderColor: "#e2e8f0",
      borderWidth: "1",
    },
  },
  {
    id: "flatsome",
    name: "Flatsome",
    description: "Most popular WooCommerce theme - Modern & flexible",
    themeLogo: "🎨",
    colors: {
      primaryColor: "#446084",
      backgroundColor: "#ffffff",
      textColor: "#333333",
      linkColor: "#446084",
      borderRadius: "0",
      shadow: "md",
      borderColor: "transparent",
      borderWidth: "0",
    },
  },
  {
    id: "astra",
    name: "Astra",
    description: "Fast & lightweight - Used by millions",
    themeLogo: "⚡",
    colors: {
      primaryColor: "#0170b9",
      backgroundColor: "#ffffff",
      textColor: "#3a3a3a",
      linkColor: "#0170b9",
      borderRadius: "4",
      shadow: "sm",
      borderColor: "#e5e7eb",
      borderWidth: "1",
    },
  },
  {
    id: "oceanwp",
    name: "OceanWP",
    description: "Feature-rich multipurpose theme",
    themeLogo: "🌊",
    colors: {
      primaryColor: "#13aff0",
      backgroundColor: "#ffffff",
      textColor: "#333333",
      linkColor: "#13aff0",
      borderRadius: "6",
      shadow: "md",
      borderColor: "transparent",
      borderWidth: "0",
    },
  },
  {
    id: "woodmart",
    name: "WoodMart",
    description: "Premium eCommerce theme - Feature-packed",
    themeLogo: "🪵",
    colors: {
      primaryColor: "#83b735",
      backgroundColor: "#ffffff",
      textColor: "#1b1b1b",
      linkColor: "#83b735",
      borderRadius: "8",
      shadow: "lg",
      borderColor: "transparent",
      borderWidth: "0",
    },
  },
  {
    id: "flavor-dark",
    name: "Dark Luxury",
    description: "Premium dark mode for luxury stores",
    themeLogo: "✨",
    colors: {
      primaryColor: "#d4af37",
      backgroundColor: "#1a1a1a",
      textColor: "#ffffff",
      linkColor: "#d4af37",
      borderRadius: "8",
      shadow: "lg",
      borderColor: "#333333",
      borderWidth: "1",
    },
  },
];

interface WooCommerceDesignPresetsProps {
  selectedPresetId?: string;
  onSelect: (preset: DesignPreset) => void;
  compact?: boolean;
}

export function WooCommerceDesignPresets({
  selectedPresetId,
  onSelect,
  compact = false,
}: WooCommerceDesignPresetsProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Palette className="h-4 w-4" />
          <span>WooCommerce Theme Presets</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {WOOCOMMERCE_THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelect(preset)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                selectedPresetId === preset.id
                  ? "ring-2 ring-primary bg-primary/5 border-primary"
                  : "hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <div
                className="w-5 h-5 rounded-full border shadow-sm"
                style={{ backgroundColor: preset.colors.primaryColor }}
              />
              <span className="text-sm font-medium">{preset.name}</span>
              {selectedPresetId === preset.id && (
                <Check className="h-3 w-3 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Palette className="h-4 w-4" />
        <span>Match your WooCommerce theme's design</span>
        <Badge variant="secondary" className="ml-auto">
          <Sparkles className="h-3 w-3 mr-1" />
          Quick Setup
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {WOOCOMMERCE_THEME_PRESETS.map((preset) => (
          <Card
            key={preset.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedPresetId === preset.id
                ? "ring-2 ring-primary border-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => onSelect(preset)}
          >
            <CardContent className="p-4 space-y-3">
              {/* Theme Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{preset.themeLogo}</span>
                  <div>
                    <h4 className="font-semibold text-sm">{preset.name}</h4>
                  </div>
                </div>
                {selectedPresetId === preset.id && (
                  <Badge variant="default" className="h-6">
                    <Check className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              
              {/* Color Palette Preview */}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-7 h-7 rounded-full border-2 border-background shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: preset.colors.primaryColor }}
                  title="Primary Color"
                >
                  <span className="text-white text-[8px] font-bold">P</span>
                </div>
                <div
                  className="w-7 h-7 rounded-full border shadow-sm"
                  style={{ backgroundColor: preset.colors.backgroundColor }}
                  title="Background Color"
                />
                <div
                  className="w-7 h-7 rounded-full border shadow-sm"
                  style={{ backgroundColor: preset.colors.textColor }}
                  title="Text Color"
                />
                <div className="flex-1 text-right">
                  <span className="text-[10px] text-muted-foreground">
                    radius: {preset.colors.borderRadius}px
                  </span>
                </div>
              </div>
              
              {/* Mini Notification Preview */}
              <div
                className="p-2.5 rounded border transition-shadow"
                style={{
                  backgroundColor: preset.colors.backgroundColor,
                  borderRadius: `${preset.colors.borderRadius}px`,
                  borderColor: preset.colors.borderColor || 'transparent',
                  borderWidth: preset.colors.borderWidth ? `${preset.colors.borderWidth}px` : '1px',
                  boxShadow: preset.colors.shadow === 'lg' 
                    ? '0 10px 25px -5px rgba(0,0,0,0.15)'
                    : preset.colors.shadow === 'md'
                    ? '0 4px 12px -2px rgba(0,0,0,0.1)'
                    : '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: preset.colors.primaryColor }}
                  >
                    📦
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[11px] font-medium truncate"
                      style={{ color: preset.colors.textColor }}
                    >
                      John from Lagos
                    </p>
                    <p
                      className="text-[10px] truncate"
                      style={{ color: preset.colors.linkColor }}
                    >
                      purchased Premium Plan
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {preset.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
