import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, Pause, Lock, FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useABTests, useABTestVariants } from "@/hooks/useABTests";
import { ABTestDialog } from "@/components/abtesting/ABTestDialog";
import { VariantEditor } from "@/components/abtesting/VariantEditor";
import { ABTestResults } from "@/components/abtesting/ABTestResults";

export default function ABTesting() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string>();

  const { subscription } = useSubscription(userId);
  const { tests, isLoading, startTest, pauseTest, makeWinnerPermanent } = useABTests(userId);
  const { variants } = useABTestVariants(selectedTestId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const isProPlan = subscription?.plan?.name?.toLowerCase().includes('pro') || false;

  const selectedTest = tests?.find(t => t.id === selectedTestId);

  if (!isProPlan) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground">
            Optimize your campaigns with data-driven experiments
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Lock className="h-16 w-16 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Pro+ Feature</h3>
              <p className="text-muted-foreground max-w-md">
                A/B testing allows you to test different variations of your campaigns and automatically
                identify winners with statistical confidence. Upgrade to Pro+ to unlock this feature.
              </p>
            </div>
            <Button onClick={() => navigate('/billing')} size="lg">
              Upgrade to Pro+
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground">
            Run experiments to find the best-performing campaign variations
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Test
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : tests && tests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <FlaskConical className="h-16 w-16 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">No A/B Tests Yet</h3>
              <p className="text-muted-foreground max-w-md">
                Create your first A/B test to start optimizing your campaigns with data-driven insights.
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Test
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Test List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-semibold">Your Tests</h3>
            {tests?.map((test) => (
              <Card
                key={test.id}
                className={`cursor-pointer transition-colors ${
                  selectedTestId === test.id ? 'border-primary' : ''
                }`}
                onClick={() => setSelectedTestId(test.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{test.name}</CardTitle>
                    <Badge
                      variant={
                        test.status === 'running'
                          ? 'default'
                          : test.status === 'completed'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {test.status}
                    </Badge>
                  </div>
                  {test.description && (
                    <CardDescription className="text-xs">{test.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Views:</span>
                      <span className="font-medium">{test.total_views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <span className="font-medium">{test.confidence_level.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Test Details */}
          <div className="lg:col-span-2">
            {selectedTest ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedTest.name}</CardTitle>
                        {selectedTest.description && (
                          <CardDescription>{selectedTest.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {selectedTest.status === 'draft' && (
                          <Button onClick={() => startTest.mutate(selectedTest.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Start Test
                          </Button>
                        )}
                        {selectedTest.status === 'running' && (
                          <Button
                            variant="outline"
                            onClick={() => pauseTest.mutate(selectedTest.id)}
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Tabs defaultValue="results">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="results">Results</TabsTrigger>
                    <TabsTrigger value="variants">Variants</TabsTrigger>
                  </TabsList>

                  <TabsContent value="results" className="space-y-4 mt-4">
                    {variants && variants.length > 0 ? (
                      <ABTestResults
                        test={selectedTest}
                        variants={variants}
                        onMakeWinnerPermanent={() => makeWinnerPermanent.mutate(selectedTest.id)}
                      />
                    ) : (
                      <Alert>
                        <AlertDescription>No variants yet. Create variants to start testing.</AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="variants" className="space-y-4 mt-4">
                    {variants?.map((variant) => (
                      <VariantEditor
                        key={variant.id}
                        testId={selectedTest.id}
                        variant={variant}
                        canDelete={variants.length > 2}
                      />
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card>
                <CardContent className="flex h-[400px] items-center justify-center">
                  <p className="text-muted-foreground">Select a test to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <ABTestDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        campaignId="" // Would be selected from campaigns
        userId={userId || ""}
      />
    </div>
  );
}
