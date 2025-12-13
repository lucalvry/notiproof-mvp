import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, ClipboardList, BarChart3, FileInput, Sliders } from "lucide-react";
import { FormCaptureSetup } from "@/components/form-captures/FormCaptureSetup";
import { FormCaptureSubmissionsList } from "@/components/form-captures/FormCaptureSubmissionsList";
import { FormCaptureAnalytics } from "@/components/form-captures/FormCaptureAnalytics";
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

export default function FormCaptures() {
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
              Please select a website to manage form captures.
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
            <BreadcrumbPage>Form Captures</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Form Captures</h1>
          <p className="text-muted-foreground mt-1">
            Capture and display real form submissions as social proof notifications
          </p>
        </div>
        <Button onClick={() => navigate("/events")}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Review All Events
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="setup" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Submissions
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
                  <FileInput className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Form Capture Configuration</CardTitle>
                  <CardDescription>
                    Configure which forms to capture and how to display them
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FormCaptureSetup websiteId={currentWebsite.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Captured Submissions</CardTitle>
                  <CardDescription>
                    Review and moderate form submissions before displaying
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => navigate("/events")}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Full Moderation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FormCaptureSubmissionsList websiteId={currentWebsite.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <FormCaptureAnalytics websiteId={currentWebsite.id} />
        </TabsContent>

        <TabsContent value="weights" className="space-y-6">
          <IntegrationWeightsTab eventType="form_capture" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
