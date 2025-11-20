import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, Image, TrendingUp } from "lucide-react";

interface TestimonialMetricsCardProps {
  metrics: {
    totalTestimonials: number;
    approvedTestimonials: number;
    averageRating: number;
    testimonialsWithMedia: number;
    testimonialViews: number;
    testimonialClicks: number;
    testimonialCtr: number;
  };
  isLoading?: boolean;
}

export function TestimonialMetricsCard({ metrics, isLoading }: TestimonialMetricsCardProps) {
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader className="animate-pulse">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-64 mt-2" />
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Testimonial Performance
        </CardTitle>
        <CardDescription>
          Insights into your testimonial campaigns and social proof effectiveness
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Testimonials</p>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.totalTestimonials}</p>
              <p className="text-xs text-muted-foreground">
                {metrics.approvedTestimonials} approved
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <Star className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.averageRating.toFixed(1)}</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < Math.floor(metrics.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">With Media</p>
              <Image className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.testimonialsWithMedia}</p>
              <p className="text-xs text-muted-foreground">
                {metrics.totalTestimonials > 0 
                  ? `${Math.round((metrics.testimonialsWithMedia / metrics.totalTestimonials) * 100)}%` 
                  : '0%'} of total
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Engagement</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.testimonialCtr.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">
                {metrics.testimonialViews} views, {metrics.testimonialClicks} clicks
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
