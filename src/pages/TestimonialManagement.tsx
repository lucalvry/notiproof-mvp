import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList, MessageSquare, BarChart3, Mail, Send, Zap } from "lucide-react";
import { TestimonialFormsManager } from "@/components/testimonials/TestimonialFormsManager";
import { TestimonialSubmissionsList } from "@/components/testimonials/TestimonialSubmissionsList";
import { TriggerSelector } from "@/components/testimonials/TriggerSelector";
import { useNavigate } from "react-router-dom";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { useTestimonialAnalytics } from "@/hooks/useTestimonialAnalytics";
import { TestimonialAnalyticsDashboard } from "@/components/analytics/TestimonialAnalyticsDashboard";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";

export default function TestimonialManagement() {
  const [activeTab, setActiveTab] = useState("forms");
  const navigate = useNavigate();
  const { currentWebsite } = useWebsiteContext();
  
  // Always call hooks unconditionally - before any early returns
  const { data: analytics, isLoading } = useTestimonialAnalytics(
    currentWebsite?.id || '', 
    30
  );

  if (!currentWebsite) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>No Website Selected</CardTitle>
            <CardDescription>
              Please select a website to manage testimonials.
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
            <BreadcrumbLink onClick={() => navigate("/dashboard")}>Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Testimonials</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testimonials</h1>
          <p className="text-muted-foreground mt-1">
            Collect, manage, and display customer testimonials
          </p>
        </div>
        <Button onClick={() => navigate("/testimonial-moderation")}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Review Submissions
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-4xl grid-cols-5">
          <TabsTrigger value="forms" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Forms
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Submissions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="triggers" className="gap-2">
            <Zap className="h-4 w-4" />
            Triggers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Collection Forms</CardTitle>
                  <CardDescription>
                    Create and manage testimonial collection forms
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TestimonialFormsManager websiteId={currentWebsite.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Submissions</CardTitle>
                  <CardDescription>
                    Latest testimonial submissions from all forms
                  </CardDescription>
                </div>
                <Button onClick={() => navigate("/testimonial-moderation")}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  View All in Moderation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TestimonialSubmissionsList websiteId={currentWebsite.id} limit={10} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Testimonial Analytics</h2>
              <p className="text-muted-foreground mt-1">
                Track performance and engagement across all your testimonial forms
              </p>
            </div>
            <TestimonialAnalyticsDashboard 
              analytics={analytics || {
                totalTestimonials: 0,
                approvedTestimonials: 0,
                pendingTestimonials: 0,
                rejectedTestimonials: 0,
                approvalRate: 0,
                averageRating: 0,
                testimonialsWithMedia: 0,
                mediaRate: 0,
                formViews: 0,
                testimonialViews: 0,
                testimonialClicks: 0,
                testimonialCtr: 0,
                videoSubmissionRate: 0,
                imageSubmissionRate: 0,
                textOnlyRate: 0,
                conversionRate: 0,
                averageTimeToSubmit: null,
                emailsSent: 0,
                emailsOpened: 0,
                emailsClicked: 0,
                emailOpenRate: 0,
                emailClickRate: 0,
                ratingDistribution: [],
                submissionsByDay: [],
                topForms: [],
                conversionFunnel: [],
                mediaTypeBreakdown: [],
              }}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Customize your invitation and thank you email templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Email Templates</h3>
                <p className="text-muted-foreground mb-4">
                  Select a form to customize its email templates
                </p>
                <p className="text-sm text-muted-foreground">
                  Go to Forms tab → Edit a form → Configure email settings
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invitation Triggers</CardTitle>
              <CardDescription>
                Choose how you want to invite customers to share testimonials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TriggerSelector 
                formId={null} 
                onCsvUpload={async (recipients) => {
                  console.log('Bulk invite:', recipients);
                }} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
