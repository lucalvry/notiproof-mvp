import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList, MessageSquare, BarChart3 } from "lucide-react";
import { TestimonialFormsManager } from "@/components/testimonials/TestimonialFormsManager";
import { TestimonialSubmissionsList } from "@/components/testimonials/TestimonialSubmissionsList";
import { useNavigate } from "react-router-dom";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { useTestimonialAnalytics } from "@/hooks/useTestimonialAnalytics";
import { TestimonialAnalyticsDashboard } from "@/components/analytics/TestimonialAnalyticsDashboard";

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
        <TabsList className="grid w-full max-w-md grid-cols-3">
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
                testimonialViews: 0,
                testimonialClicks: 0,
                testimonialCtr: 0,
                ratingDistribution: [],
                submissionsByDay: [],
                topForms: [],
              }}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
