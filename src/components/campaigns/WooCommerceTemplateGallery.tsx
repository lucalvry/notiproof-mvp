import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Layout, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WooCommerceEvent {
  id: string;
  event_data: any;
  user_name?: string;
  user_location?: string;
  created_at: string;
}

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  layout: "card" | "compact" | "minimal";
  preview: (event: WooCommerceEvent | null, design: any) => React.ReactNode;
}

interface WooCommerceTemplateGalleryProps {
  websiteId: string;
  selectedTemplateLayout?: string;
  onSelect: (layout: string) => void;
  designSettings: any;
}

export function WooCommerceTemplateGallery({
  websiteId,
  selectedTemplateLayout,
  onSelect,
  designSettings,
}: WooCommerceTemplateGalleryProps) {
  const [sampleEvent, setSampleEvent] = useState<WooCommerceEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSampleEvent();
  }, [websiteId]);

  const loadSampleEvent = async () => {
    try {
      // Fetch a recent WooCommerce event for live preview
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("website_id", websiteId)
        .eq("source", "woocommerce")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setSampleEvent(data);
      }
    } catch (error) {
      console.error("Error loading sample event:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPreviewData = (event: WooCommerceEvent | null) => {
    if (event?.event_data) {
      return {
        customerName: event.user_name || event.event_data.customer_name || "John D.",
        location: event.user_location || event.event_data.city || "New York",
        productName: event.event_data.product_name || event.event_data.items?.[0]?.name || "Product",
        productImage: event.event_data.product_image || event.event_data.items?.[0]?.image,
        timeAgo: "2 min ago",
      };
    }
    return {
      customerName: "Sarah M.",
      location: "San Francisco",
      productName: "Premium Widget",
      productImage: null,
      timeAgo: "Just now",
    };
  };

  const templates: TemplateOption[] = [
    {
      id: "card",
      name: "Card",
      description: "Full card layout with product image",
      layout: "card",
      preview: (event, design) => {
        const data = getPreviewData(event);
        return (
          <div
            className="p-4 flex items-start gap-3"
            style={{
              backgroundColor: design.backgroundColor || "#ffffff",
              borderRadius: `${design.borderRadius || 12}px`,
              boxShadow: design.shadow === 'lg' 
                ? '0 10px 25px -5px rgba(0,0,0,0.2)'
                : design.shadow === 'md'
                ? '0 4px 12px -2px rgba(0,0,0,0.15)'
                : '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {data.productImage ? (
              <img 
                src={data.productImage} 
                alt="" 
                className="w-12 h-12 rounded-md object-cover"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-md bg-muted flex items-center justify-center"
                style={{ backgroundColor: `${design.primaryColor || '#3B82F6'}20` }}
              >
                <ShoppingCart className="h-5 w-5" style={{ color: design.primaryColor || '#3B82F6' }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p 
                className="text-sm font-medium"
                style={{ color: design.textColor || '#1a1a1a' }}
              >
                {data.customerName} from {data.location}
              </p>
              <p className="text-sm">
                <span style={{ color: design.textColor || '#1a1a1a' }}>purchased </span>
                <span 
                  className="font-medium"
                  style={{ color: design.linkColor || design.primaryColor || '#3B82F6' }}
                >
                  {data.productName}
                </span>
              </p>
              <p className="text-xs mt-1" style={{ color: `${design.textColor || '#1a1a1a'}80` }}>
                {data.timeAgo}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "compact",
      name: "Compact",
      description: "Smaller footprint, minimal design",
      layout: "compact",
      preview: (event, design) => {
        const data = getPreviewData(event);
        return (
          <div
            className="p-3 flex items-center gap-2"
            style={{
              backgroundColor: design.backgroundColor || "#ffffff",
              borderRadius: `${design.borderRadius || 12}px`,
              boxShadow: design.shadow === 'lg' 
                ? '0 10px 25px -5px rgba(0,0,0,0.2)'
                : design.shadow === 'md'
                ? '0 4px 12px -2px rgba(0,0,0,0.15)'
                : '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${design.primaryColor || '#3B82F6'}20` }}
            >
              <ShoppingCart className="h-4 w-4" style={{ color: design.primaryColor || '#3B82F6' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs">
                <span className="font-medium" style={{ color: design.textColor || '#1a1a1a' }}>
                  {data.customerName}
                </span>
                <span style={{ color: `${design.textColor || '#1a1a1a'}80` }}> purchased </span>
                <span 
                  className="font-medium"
                  style={{ color: design.linkColor || design.primaryColor || '#3B82F6' }}
                >
                  {data.productName}
                </span>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "minimal",
      name: "Minimal",
      description: "Text-only, ultra lightweight",
      layout: "minimal",
      preview: (event, design) => {
        const data = getPreviewData(event);
        return (
          <div
            className="px-4 py-2"
            style={{
              backgroundColor: design.backgroundColor || "#ffffff",
              borderRadius: `${design.borderRadius || 12}px`,
              boxShadow: design.shadow === 'lg' 
                ? '0 10px 25px -5px rgba(0,0,0,0.2)'
                : design.shadow === 'md'
                ? '0 4px 12px -2px rgba(0,0,0,0.15)'
                : '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <p className="text-xs">
              <span className="font-medium" style={{ color: design.textColor || '#1a1a1a' }}>
                {data.customerName}
              </span>
              <span style={{ color: `${design.textColor || '#1a1a1a'}80` }}> just bought </span>
              <span 
                className="font-medium"
                style={{ color: design.linkColor || design.primaryColor || '#3B82F6' }}
              >
                {data.productName}
              </span>
            </p>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Layout className="h-4 w-4" />
        <span>
          {sampleEvent 
            ? "Previewing with your actual WooCommerce order data"
            : "Preview with sample data (no orders synced yet)"
          }
        </span>
        {sampleEvent && (
          <Badge variant="outline" className="text-xs">
            Live Data
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedTemplateLayout === template.layout
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => onSelect(template.layout)}
          >
            <CardContent className="p-4 space-y-3">
              {/* Template Preview */}
              <div className="bg-muted/50 rounded-lg p-3 min-h-[80px] flex items-center justify-center">
                {template.preview(sampleEvent, designSettings)}
              </div>
              
              {/* Name & Description */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-sm">{template.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </div>
                {selectedTemplateLayout === template.layout && (
                  <Badge variant="default" className="shrink-0">
                    <Check className="h-3 w-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
