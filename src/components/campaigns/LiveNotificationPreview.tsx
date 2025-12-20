import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveNotificationPreviewProps {
  design: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    linkColor: string;
    borderRadius: string;
    shadow: string;
    fontSize: string;
    position: string;
    animation: string;
    fontFamily: string;
    textAlignment: string;
    templateLayout?: string;
    contentAlignment?: string;
  };
  sampleData?: {
    customerName?: string;
    customerLocation?: string;
    productName?: string;
    timeAgo?: string;
  };
  compact?: boolean;
}

const getShadowStyle = (shadow: string) => {
  switch (shadow) {
    case 'lg':
      return '0 10px 25px -5px rgba(0,0,0,0.2)';
    case 'md':
      return '0 4px 12px -2px rgba(0,0,0,0.15)';
    case 'sm':
      return '0 1px 3px rgba(0,0,0,0.1)';
    default:
      return 'none';
  }
};

const getPositionClasses = (position: string) => {
  switch (position) {
    case 'bottom-left':
      return 'bottom-3 left-3';
    case 'bottom-right':
      return 'bottom-3 right-3';
    case 'bottom-center':
      return 'bottom-3 left-1/2 -translate-x-1/2';
    case 'top-left':
      return 'top-3 left-3';
    case 'top-right':
      return 'top-3 right-3';
    case 'top-center':
      return 'top-3 left-1/2 -translate-x-1/2';
    default:
      return 'bottom-3 left-3';
  }
};

export function LiveNotificationPreview({
  design,
  sampleData = {
    customerName: "Sarah M.",
    customerLocation: "New York",
    productName: "Premium Widget",
    timeAgo: "2 minutes ago",
  },
  compact = false,
}: LiveNotificationPreviewProps) {
  const positionClasses = getPositionClasses(design.position);
  
  return (
    <div className={cn(
      "relative bg-gradient-to-br from-muted/30 to-muted/60 rounded-lg overflow-hidden",
      compact ? "h-40" : "h-56"
    )}>
      {/* Mock browser header */}
      <div className="bg-muted/80 px-3 py-1.5 flex items-center gap-1.5 border-b border-border/50">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-destructive/60" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
          <div className="w-2 h-2 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-background/50 rounded px-4 py-0.5 text-[10px] text-muted-foreground">
            yourstore.com
          </div>
        </div>
      </div>

      {/* Mock page content */}
      <div className="p-4 space-y-2">
        <div className="h-2 bg-muted/40 rounded w-3/4" />
        <div className="h-2 bg-muted/30 rounded w-1/2" />
        <div className="h-2 bg-muted/20 rounded w-2/3" />
      </div>

      {/* Notification positioned */}
      <div className={cn("absolute", positionClasses)}>
        <div
          className={cn(
            "w-[200px] p-2.5 flex gap-2 transition-all duration-300",
            design.contentAlignment === 'center' ? 'items-center' : 
            design.contentAlignment === 'bottom' ? 'items-end' : 'items-start',
            design.animation === 'bounce' && 'animate-bounce',
          )}
          style={{
            backgroundColor: design.backgroundColor,
            borderRadius: `${design.borderRadius}px`,
            fontFamily: design.fontFamily,
            fontSize: `${Math.max(9, parseInt(design.fontSize) - 2)}px`,
            textAlign: design.textAlignment as any,
            boxShadow: getShadowStyle(design.shadow),
          }}
        >
          <div 
            className="w-7 h-7 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${design.primaryColor}20` }}
          >
            <ShoppingCart 
              className="h-3.5 w-3.5" 
              style={{ color: design.primaryColor }} 
            />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ color: design.textColor }} className="font-medium text-[10px] leading-tight">
              {sampleData.customerName} from {sampleData.customerLocation}
            </p>
            <p style={{ color: design.textColor }} className="text-[9px] leading-tight mt-0.5">
              purchased{" "}
              <span 
                className="font-medium"
                style={{ color: design.linkColor }}
              >
                {sampleData.productName}
              </span>
            </p>
            <p 
              className="text-[8px] mt-0.5"
              style={{ color: `${design.textColor}80` }}
            >
              {sampleData.timeAgo}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
