import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MoreVertical, 
  Play, 
  Pause, 
  Copy, 
  Trash2, 
  Eye, 
  MousePointerClick,
  TrendingUp,
  Settings
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { NotificationPreview } from "@/components/templates/NotificationPreview";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  data_source: string;
  display_rules: any;
  created_at: string;
  updated_at: string;
  // Optional stats from joins
  total_views?: number;
  total_clicks?: number;
  settings?: any;
}

interface CampaignCardProps {
  campaign: Campaign;
  onStatusChange: (id: string, newStatus: string) => void;
  onDuplicate: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}

export function CampaignCard({
  campaign,
  onStatusChange,
  onDuplicate,
  onDelete,
  onClick,
}: CampaignCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = campaign.status === "active";

  // Get integration metadata for icon
  const integrationMeta = getIntegrationMetadata(campaign.data_source || 'manual');
  const IntegrationIcon = integrationMeta.icon;

  // Calculate CTR
  const views = campaign.total_views || 0;
  const clicks = campaign.total_clicks || 0;
  const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";

  // Format template for NotificationPreview
  const previewTemplate = {
    name: campaign.name,
    template_config: {
      previewData: {
        userName: "Sarah Johnson",
        location: "New York, US",
        message: campaign.description || "just made a purchase",
        time: "Just now",
      },
      position: campaign.settings?.position || "bottom-left",
      animation: campaign.settings?.animation || "slide",
    },
    style_config: campaign.settings || {
      accentColor: "#3B82F6",
      backgroundColor: "#ffffff",
      textColor: "#1a1a1a",
      borderRadius: 12,
    },
  };

  return (
    <Card 
      className={cn(
        "group relative transition-all duration-200 hover:shadow-lg cursor-pointer",
        isActive && "border-primary/20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(campaign.id)}
    >
      {/* Status indicator */}
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full rounded-l-lg transition-colors",
        isActive ? "bg-success" : "bg-muted"
      )} />

      <CardHeader className="pb-3 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Integration icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IntegrationIcon className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base truncate">
                  {campaign.name}
                </h3>
                <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                  {isActive ? (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-success mr-1.5 animate-pulse" />
                      Active
                    </>
                  ) : (
                    campaign.status
                  )}
                </Badge>
              </div>
              
              {campaign.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {campaign.description}
                </p>
              )}
              
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <IntegrationIcon className="h-3 w-3" />
                <span>{integrationMeta.displayName}</span>
              </div>
            </div>
          </div>

          {/* Actions dropdown */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => 
                onStatusChange(campaign.id, checked ? "active" : "paused")
              }
              className="scale-90"
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onClick(campaign.id)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onStatusChange(
                      campaign.id,
                      campaign.status === "active" ? "paused" : "active"
                    )
                  }
                >
                  {isActive ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(campaign)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(campaign.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pl-6">
        {/* Notification Preview */}
        <div className="relative">
          <div className={cn(
            "transition-all duration-300",
            isHovered ? "scale-[1.02]" : "scale-100"
          )}>
            <NotificationPreview template={previewTemplate} />
          </div>
          {isHovered && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="secondary">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="font-medium text-foreground">{views.toLocaleString()}</span>
              <span className="text-xs">views</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MousePointerClick className="h-4 w-4" />
              <span className="font-medium text-foreground">{clicks.toLocaleString()}</span>
              <span className="text-xs">clicks</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium text-foreground">{ctr}%</span>
              <span className="text-xs">CTR</span>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onClick(campaign.id);
            }}
          >
            View Details →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}