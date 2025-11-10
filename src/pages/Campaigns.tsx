import { useState, useEffect } from "react";
import { Plus, Plug, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CampaignWizard } from "@/components/campaigns/CampaignWizard";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { CampaignGridSkeleton } from "@/components/ui/campaign-skeleton";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { FreeTrialLimitBanner } from "@/components/billing/FreeTrialLimitBanner";
import confetti from "canvas-confetti";

// Using database schema types
interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  organization_id: string | null;
  website_id: string;
  data_source: string;
  display_rules: any;
  polling_config: any;
  start_date: string | null;
  end_date: string | null;
  auto_repeat: boolean;
  repeat_config: any;
  created_at: string;
  updated_at: string;
  settings?: any;
  total_views?: number;
  total_clicks?: number;
  widgets?: any[];
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [userId, setUserId] = useState<string>();
  const navigate = useNavigate();
  
  const { maxCampaignTemplates, planName } = useSubscription(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view campaigns");
        setLoading(false);
        return;
      }

      // Fetch campaigns with optional widgets and events (left join)
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          widgets(
            id,
            events!events_widget_id_fkey(views, clicks)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Calculate totals for each campaign
      const campaignsWithStats = (data || []).map(campaign => {
        const allEvents = campaign.widgets?.flatMap(w => w.events || []) || [];
        const total_views = allEvents.reduce((sum: number, e: any) => sum + (e.views || 0), 0);
        const total_clicks = allEvents.reduce((sum: number, e: any) => sum + (e.clicks || 0), 0);
        
        return {
          ...campaign,
          total_views,
          total_clicks,
        };
      });
      
      setCampaigns(campaignsWithStats);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      // Celebrate activation with confetti
      if (newStatus === "active") {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        toast.success("🎉 Campaign activated!", {
          description: "Your notification is now live and visible to visitors"
        });
      } else {
        toast.success("Campaign paused");
      }
      
      fetchCampaigns();
    } catch (error) {
      console.error("Error updating campaign:", error);
      toast.error("Failed to update campaign");
    }
  };

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("campaigns")
        .insert([{
          user_id: user.id,
          name: `${campaign.name} (Copy)`,
          description: campaign.description,
          status: "draft",
          website_id: campaign.website_id,
          data_source: campaign.data_source || 'manual',
          display_rules: campaign.display_rules,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          auto_repeat: campaign.auto_repeat,
          repeat_config: campaign.repeat_config,
          organization_id: campaign.organization_id,
          polling_config: campaign.polling_config,
        }]);

      if (error) throw error;
      
      toast.success("✨ Campaign duplicated!", {
        description: "Edit the copy to customize it for your needs"
      });
      fetchCampaigns();
    } catch (error) {
      console.error("Error duplicating campaign:", error);
      toast.error("Failed to duplicate campaign");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // First delete all widgets associated with this campaign
      const { error: widgetsError } = await supabase
        .from("widgets")
        .delete()
        .eq("campaign_id", id);
      
      if (widgetsError) throw widgetsError;
      
      // Then delete the campaign
      const { error: campaignError } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);
      
      if (campaignError) throw campaignError;
      
      toast.success("Campaign deleted");
      fetchCampaigns();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };

  const calculateCTR = (impressions: number, clicks: number) => {
    if (impressions === 0) return "0.00";
    return ((clicks / impressions) * 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-9 w-48 bg-muted animate-pulse rounded" />
            <div className="h-5 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-40 bg-muted animate-pulse rounded" />
            <div className="h-10 w-48 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <CampaignGridSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Create and manage your social proof notifications
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/integrations')}>
            <Plug className="h-4 w-4" />
            Manage Integrations
          </Button>
          <Button className="gap-2" onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Notification
          </Button>
        </div>
      </div>

      {/* Show upgrade banner when approaching campaign template limit */}
      <FreeTrialLimitBanner
        type="templates"
        current={campaigns.length}
        limit={maxCampaignTemplates}
        planName={planName}
      />

      {campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Create Your First Notification</CardTitle>
            <CardDescription className="text-base max-w-md mx-auto">
              Get your first social proof notification live in under 2 minutes with our Quick Start templates. 
              Choose from pre-made designs or connect your own data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-12">
            <Button className="gap-2" onClick={() => setWizardOpen(true)} size="lg">
              <Plus className="h-5 w-5" />
              Get Started with Quick Start
            </Button>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Demo data included
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                No coding required
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Live in 2 minutes
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onStatusChange={handleStatusChange}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onClick={(id, tab) => {
                if (tab) {
                  navigate(`/campaigns/${id}?tab=${tab}`);
                } else {
                  navigate(`/campaigns/${id}`);
                }
              }}
            />
          ))}
        </div>
      )}

      <CampaignWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={() => {
          // Celebrate first campaign creation
          if (campaigns.length === 0) {
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.6 }
            });
          }
          setWizardOpen(false);
          fetchCampaigns();
        }}
      />
    </div>
  );
}
