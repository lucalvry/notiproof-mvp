import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, Users, BarChart3, Sliders, Eye } from "lucide-react";
import { VisitorsPulseSetup } from "@/components/visitors-pulse/VisitorsPulseSetup";
import { LiveVisitorsList } from "@/components/visitors-pulse/LiveVisitorsList";
import { VisitorsPulseAnalytics } from "@/components/visitors-pulse/VisitorsPulseAnalytics";
import { IntegrationWeightsTab } from "@/components/weights/IntegrationWeightsTab";
import { useNavigate } from "react-router-dom";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";

export default function VisitorsPulse() {
  const [activeTab, setActiveTab] = useState("setup");
  const navigate = useNavigate();
  const { currentWebsite } = useWebsiteContext();

  if (!currentWebsite) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>No Website Selected</CardTitle>
            <CardDescription>
              Please select a website to manage Visitors Pulse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/websites")}>
              Go to Websites
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate("/integrations")}>Integrations</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Visitors Pulse</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Visitors Pulse</h1>
          <p className="text-muted-foreground mt-1">
            Show real-time visitor counts to create urgency and social proof
          </p>
        </div>
        <Button onClick={() => navigate("/campaigns?type=live_visitors")}>
          <Eye className="h-4 w-4 mr-2" />
          View Campaigns
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="setup" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="visitors" className="gap-2">
            <Users className="h-4 w-4" />
            Live Visitors
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="weights" className="gap-2">
            <Sliders className="h-4 w-4" />
            Weights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Visitors Pulse Configuration</CardTitle>
                  <CardDescription>
                    Configure how visitor counts are tracked and displayed
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VisitorsPulseSetup websiteId={currentWebsite.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visitors" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Visitors</CardTitle>
                  <CardDescription>
                    Real-time view of active visitors on your site
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LiveVisitorsList websiteId={currentWebsite.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <VisitorsPulseAnalytics websiteId={currentWebsite.id} />
        </TabsContent>

        <TabsContent value="weights" className="space-y-6">
          <IntegrationWeightsTab eventType="live_visitors" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
