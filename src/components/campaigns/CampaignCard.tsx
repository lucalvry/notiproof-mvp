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
  data_sources: any;
  display_rules: any;
  created_at: string;
  updated_at: string;
  // Optional stats from joins
  total_views?: number;
  total_clicks?: number;
  settings?: any;
  native_config?: any;
  integration_settings?: any;
}

interface CampaignCardProps {
  campaign: Campaign;
  onStatusChange: (id: string, newStatus: string) => void;
  onDuplicate: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  onClick: (id: string, tab?: string) => void;
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
  const primaryProvider = Array.isArray(campaign.data_sources) && campaign.data_sources.length > 0
    ? campaign.data_sources[0].provider
    : 'manual';
  const integrationMeta = getIntegrationMetadata(primaryProvider);
  const IntegrationIcon = integrationMeta.icon;

  // Calculate CTR
  const views = campaign.total_views || 0;
  const clicks = campaign.total_clicks || 0;
  const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";

  // Check if this is an announcement campaign
  const dataSources = Array.isArray(campaign.data_sources) ? campaign.data_sources : [];
  const isAnnouncementCampaign = dataSources.some((ds: any) => ds.provider === 'announcements');
  const announcementData = campaign.native_config || campaign.integration_settings || {};

  // Format template for NotificationPreview
  const previewTemplate = {
    name: campaign.name,
    template_config: {
      previewData: isAnnouncementCampaign ? {
        userName: announcementData.title || campaign.name,
        message: announcementData.message || campaign.description || "Announcement message",
        time: announcementData.cta_text || "Just now",
        location: "",
      } : {
        userName: "Sarah Johnson",
        location: "New York, US",
        message: campaign.description || "just made a purchase",
        time: "Just now",
      },
      position: campaign.display_rules?.position || campaign.settings?.position || "bottom-left",
      animation: campaign.display_rules?.animation || campaign.settings?.animation || "slide",
    },
    style_config: campaign.settings || campaign.display_rules || {
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

      <CardHeader className="pb-3 px-4 md:pl-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
            {/* Integration icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IntegrationIcon className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-sm md:text-base break-words">
                  {campaign.name}
                </h3>
                <Badge variant={isActive ? "default" : "secondary"} className="text-xs shrink-0">
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
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                  {campaign.description}
                </p>
              )}
              
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground flex-wrap">
                <IntegrationIcon className="h-3 w-3 shrink-0" />
                <span className="break-all">{integrationMeta.displayName}</span>
              </div>
            </div>
          </div>

          {/* Actions dropdown */}
          <div className="flex items-center gap-1 md:gap-2" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => 
                onStatusChange(campaign.id, checked ? "active" : "paused")
              }
              className="scale-75 md:scale-90 shrink-0"
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onClick(campaign.id, 'settings')}>
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

      <CardContent className="space-y-4 px-4 md:pl-6">
        {/* Notification Preview */}
        <div className="relative">
          <div className={cn(
            "transition-all duration-300",
            isHovered ? "scale-[1.02]" : "scale-100"
          )}>
            <NotificationPreview template={previewTemplate} />
          </div>
          {isHovered && (
            <div className="hidden md:flex absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="secondary">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t gap-3">
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
            <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
              <Eye className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="font-medium text-foreground">{views.toLocaleString()}</span>
              <span className="text-xs">views</span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
              <MousePointerClick className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="font-medium text-foreground">{clicks.toLocaleString()}</span>
              <span className="text-xs">clicks</span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="font-medium text-foreground">{ctr}%</span>
              <span className="text-xs">CTR</span>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs w-full sm:w-auto"
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