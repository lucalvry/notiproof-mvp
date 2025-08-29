import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Plus, Edit, Trash2, Calendar, Play, Pause, RotateCcw, Settings, Eye, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'ended';
  start_date: string | null;
  end_date: string | null;
  auto_repeat: boolean;
  created_at: string;
  widget_count?: number;
}

const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const, icon: Edit },
  active: { label: 'Active', variant: 'default' as const, icon: Play },
  paused: { label: 'Paused', variant: 'outline' as const, icon: Pause },
  ended: { label: 'Ended', variant: 'destructive' as const, icon: Calendar }
};

const Campaigns = () => {
  const { profile } = useAuth();
  const { selectedWebsite, isSwitching } = useWebsiteContext();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!profile) return;

      try {
        // Fetch campaigns with widget counts
        let campaignsQuery = supabase
          .from('campaigns' as any)
          .select(`
            id,
            name,
            description,
            status,
            start_date,
            end_date,
            auto_repeat,
            created_at
          `)
          .eq('user_id', profile.id);
        
        // Note: Campaigns table doesn't have website_id, but we'll show all campaigns
        // This is acceptable since campaigns are user-level, not website-level
        const { data: campaignData, error: campaignError } = await campaignsQuery
          .order('created_at', { ascending: false });

        if (campaignError) throw campaignError;

        // Add widget count (we'll enhance this later)
        const campaignsWithCounts = (campaignData || []).map((campaign: any) => ({
          ...campaign,
          widget_count: 0 // TODO: Fetch actual widget counts
        }));

        setCampaigns(campaignsWithCounts);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        toast({
          title: "Error",
          description: "Failed to load campaigns",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [profile, selectedWebsite, toast]);

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('campaigns' as any)
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(prev => 
        prev.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, status: newStatus as any }
            : campaign
        )
      );

      toast({
        title: "Campaign updated",
        description: `Campaign ${newStatus} successfully`,
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive",
      });
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const { error } = await supabase
        .from('campaigns' as any)
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
      
      toast({
        title: "Campaign deleted",
        description: "Campaign deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    }
  };

  const getStatusActions = (campaign: Campaign) => {
    const actions = [];
    
    if (campaign.status === 'draft' || campaign.status === 'paused') {
      actions.push(
        <Button
          key="activate"
          variant="outline"
          size="sm"
          onClick={() => updateCampaignStatus(campaign.id, 'active')}
        >
          <Play className="h-4 w-4" />
        </Button>
      );
    }
    
    if (campaign.status === 'active') {
      actions.push(
        <Button
          key="pause"
          variant="outline"
          size="sm"
          onClick={() => updateCampaignStatus(campaign.id, 'paused')}
        >
          <Pause className="h-4 w-4" />
        </Button>
      );
    }
    
    if (campaign.status === 'ended' && campaign.auto_repeat) {
      actions.push(
        <Button
          key="restart"
          variant="outline"
          size="sm"
          onClick={() => updateCampaignStatus(campaign.id, 'active')}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      );
    }

    return actions;
  };

  if (loading || isSwitching) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <Button asChild>
          <Link to="/dashboard/campaigns/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground mb-4">
              Campaigns help you organize widgets and control when they're displayed. Create your first campaign to get started.
            </p>
            <div className="space-y-3">
              <Button asChild>
                <Link to="/dashboard/campaigns/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Campaign
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                After creating a campaign, you can assign widgets to it and control their display schedule.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const config = statusConfig[campaign.status];
            const StatusIcon = config.icon;
            
            return (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-3">
                        {campaign.name}
                        <Badge variant={config.variant}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        {campaign.auto_repeat && (
                          <Badge variant="outline">
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Auto-repeat
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{campaign.description}</CardDescription>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Settings className="h-3 w-3" />
                          {campaign.widget_count || 0} widgets
                        </span>
                        {campaign.start_date && (
                          <span>Start: {format(new Date(campaign.start_date), 'MMM dd, yyyy')}</span>
                        )}
                        {campaign.end_date && (
                          <span>End: {format(new Date(campaign.end_date), 'MMM dd, yyyy')}</span>
                        )}
                        <span>Created: {format(new Date(campaign.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {getStatusActions(campaign)}
                      {(campaign.widget_count || 0) > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link to={`/dashboard/widgets?campaign=${campaign.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/dashboard/campaigns/${campaign.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCampaign(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {(campaign.widget_count === 0 || !campaign.widget_count) && (
                  <CardContent className="pt-0">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-2">Next Steps</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <Link to="/dashboard/widgets/create" className="text-primary hover:underline">Create widgets</Link> and assign them to this campaign</li>
                        <li>• Configure display rules in the campaign settings</li>
                        <li>• <Link to="/dashboard/installation" className="text-primary hover:underline">Install the widget code</Link> on your website</li>
                        <li>• Activate the campaign to start showing notifications</li>
                      </ul>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Campaigns;