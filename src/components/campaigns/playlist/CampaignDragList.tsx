import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIntegrationMetadata } from "@/lib/integrationMetadata";

interface Campaign {
  id: string;
  name: string;
  status: string;
  priority: number | null;
}

interface CampaignDragListProps {
  campaigns: Campaign[];
  selectedIds: string[];
  onReorder: (newOrder: string[]) => void;
}

export function CampaignDragList({
  campaigns,
  selectedIds,
  onReorder,
}: CampaignDragListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const selectedCampaigns = selectedIds
    .map(id => campaigns.find(c => c.id === id))
    .filter(Boolean) as Campaign[];

  const unselectedCampaigns = campaigns.filter(c => !selectedIds.includes(c.id));

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...selectedIds];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, removed);

    onReorder(newOrder);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleCampaign = (campaignId: string, checked: boolean) => {
    if (checked) {
      onReorder([...selectedIds, campaignId]);
    } else {
      onReorder(selectedIds.filter(id => id !== campaignId));
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Campaigns (Draggable) */}
      {selectedCampaigns.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Campaigns ({selectedCampaigns.length})</p>
          <div className="space-y-2">
            {selectedCampaigns.map((campaign, index) => {
              const meta = getIntegrationMetadata('manual');
              const Icon = meta.icon;
              
              return (
                <Card
                  key={campaign.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "p-3 cursor-move hover:shadow-md transition-all",
                    draggedIndex === index && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
                    
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{campaign.name}</span>
                        {campaign.priority && campaign.priority >= 80 && (
                          <Badge variant="outline" className="gap-1">
                            <Zap className="h-3 w-3" />
                            {campaign.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{meta.displayName}</p>
                    </div>

                    <Checkbox
                      checked={true}
                      onCheckedChange={(checked) => toggleCampaign(campaign.id, checked as boolean)}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Campaigns */}
      {unselectedCampaigns.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Available Campaigns</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {unselectedCampaigns.map((campaign) => {
              const meta = getIntegrationMetadata('manual');
              const Icon = meta.icon;
              
              return (
                <Card key={campaign.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{campaign.name}</span>
                        {campaign.priority && campaign.priority >= 80 && (
                          <Badge variant="outline" className="gap-1">
                            <Zap className="h-3 w-3" />
                            {campaign.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{meta.displayName}</p>
                    </div>

                    <Checkbox
                      checked={false}
                      onCheckedChange={(checked) => toggleCampaign(campaign.id, checked as boolean)}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {selectedCampaigns.length === 0 && unselectedCampaigns.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No active campaigns available</p>
          <p className="text-sm mt-1">Create some campaigns first</p>
        </div>
      )}
    </div>
  );
}
