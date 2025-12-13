import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, DollarSign, Plus, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { useNavigate } from "react-router-dom";
import { GoalCreationDialog } from "@/components/impact/GoalCreationDialog";
import { GoalsTable } from "@/components/impact/GoalsTable";
import { ConversionChart } from "@/components/impact/ConversionChart";
import { ImpactMetrics } from "@/components/impact/ImpactMetrics";
import { ConversionsTable } from "@/components/impact/ConversionsTable";

export default function ImpactBoard() {
  const navigate = useNavigate();
  const { currentWebsite } = useWebsiteContext();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUserId(user.id);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!currentWebsite) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Please select a website to view the Impact Board.</p>
            <Button onClick={() => navigate("/websites")} className="mt-4">
              Go to Websites
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal);
    setGoalDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setGoalDialogOpen(false);
    setEditingGoal(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Impact Board
          </h1>
          <p className="text-muted-foreground">
            Track conversions attributed to NotiProof notifications
          </p>
        </div>
        <Button onClick={() => setGoalDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Goal
        </Button>
      </div>

      {/* Metrics Summary */}
      <ImpactMetrics websiteId={currentWebsite.id} userId={userId!} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-2">
            <Target className="h-4 w-4" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="conversions" className="gap-2">
            <Activity className="h-4 w-4" />
            Conversions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Trend</CardTitle>
              <CardDescription>
                Daily attributed conversions over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConversionChart websiteId={currentWebsite.id} userId={userId!} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Goals</CardTitle>
              <CardDescription>
                Define URL-based goals to track when visitors convert after interacting with notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GoalsTable 
                websiteId={currentWebsite.id} 
                userId={userId!}
                onEditGoal={handleEditGoal}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversions</CardTitle>
              <CardDescription>
                Conversions attributed to NotiProof notification interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConversionsTable websiteId={currentWebsite.id} userId={userId!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <GoalCreationDialog
        open={goalDialogOpen}
        onClose={handleCloseDialog}
        websiteId={currentWebsite.id}
        userId={userId!}
        editingGoal={editingGoal}
      />
    </div>
  );
}
