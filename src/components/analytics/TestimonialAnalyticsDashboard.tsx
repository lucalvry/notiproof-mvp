import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, MessageSquare, Image, TrendingUp, CheckCircle, Clock, XCircle, BarChart3, Eye, Video, FileText, Mail, MousePointer } from "lucide-react";
import { TestimonialAnalytics } from "@/hooks/useTestimonialAnalytics";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, Funnel, FunnelChart, LabelList } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

interface TestimonialAnalyticsDashboardProps {
  analytics: TestimonialAnalytics;
  isLoading?: boolean;
}

export function TestimonialAnalyticsDashboard({ analytics, isLoading }: TestimonialAnalyticsDashboardProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2" />
                <div className="h-3 bg-muted rounded w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Form Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.formViews?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Public collection page visits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTestimonials}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {analytics.approvedTestimonials} approved
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.approvalRate}%</div>
            <Progress value={analytics.approvalRate} className="mt-2" />
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {analytics.pendingTestimonials} pending
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {analytics.rejectedTestimonials} rejected
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</div>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.floor(analytics.averageRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">With Media</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.testimonialsWithMedia}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {analytics.mediaRate.toFixed(1)}% of submissions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Views and clicks from testimonial campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Views</p>
              <p className="text-2xl font-bold">{analytics.testimonialViews.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Clicks</p>
              <p className="text-2xl font-bold">{analytics.testimonialClicks.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Click-Through Rate</p>
              <p className="text-2xl font-bold">{analytics.testimonialCtr.toFixed(2)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase 10: Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Views to submissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Video Submissions</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.videoSubmissionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Include video content
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Image Submissions</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.imageSubmissionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Include images
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email Engagement Metrics */}
      {analytics.emailsSent > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Email Campaign Performance</CardTitle>
            <CardDescription>Invitation email engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Sent</p>
                </div>
                <p className="text-2xl font-bold">{analytics.emailsSent}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Opened</p>
                </div>
                <p className="text-2xl font-bold">{analytics.emailsOpened}</p>
                <p className="text-xs text-muted-foreground">{analytics.emailOpenRate}% open rate</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Clicked</p>
                </div>
                <p className="text-2xl font-bold">{analytics.emailsClicked}</p>
                <p className="text-xs text-muted-foreground">{analytics.emailClickRate}% click rate</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Conversion</p>
                </div>
                <p className="text-2xl font-bold">
                  {analytics.emailsSent > 0 ? ((analytics.emailsClicked / analytics.emailsSent) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Email to submission</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>From views to approved submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.conversionFunnel.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart 
                  data={analytics.conversionFunnel}
                  layout="vertical"
                  margin={{ left: 60, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis 
                    type="category" 
                    dataKey="stage" 
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`,
                      'Count'
                    ]}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList 
                      dataKey="percentage" 
                      position="right"
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No funnel data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Media Type Distribution</CardTitle>
            <CardDescription>Breakdown by content type</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.mediaTypeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.mediaTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, percentage }) => `${type}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.mediaTypeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `${value} (${props.payload.percentage.toFixed(1)}%)`,
                      props.payload.type
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No media breakdown available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submissions Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions Over Time</CardTitle>
            <CardDescription>Daily submission count</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.submissionsByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analytics.submissionsByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="submissions" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No submission data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>Breakdown by star rating</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.ratingDistribution.some(r => r.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="rating" 
                    className="text-xs"
                    tickFormatter={(value) => `${value}★`}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Submissions']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No rating data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Forms */}
      {analytics.topForms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Forms</CardTitle>
            <CardDescription>Forms with the most submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topForms.map((form, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <span className="font-medium">{form.formName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{form.submissions}</span>
                    <span className="text-sm text-muted-foreground">submissions</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
