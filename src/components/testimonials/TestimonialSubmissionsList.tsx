import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Image, Video, CheckCircle, Clock, XCircle, ClipboardList } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "./EmptyState";

interface TestimonialSubmission {
  id: string;
  author_name: string;
  rating: number;
  message: string;
  status: string;
  avatar_url?: string;
  video_url?: string;
  created_at: string;
}

interface TestimonialSubmissionsListProps {
  websiteId: string;
  limit?: number;
}

export function TestimonialSubmissionsList({ 
  websiteId, 
  limit = 10 
}: TestimonialSubmissionsListProps) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<TestimonialSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, [websiteId]);

  async function loadSubmissions() {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No submissions yet"
        description="When customers submit testimonials through your forms, they'll appear here for review and moderation."
        actionLabel="View All Forms"
        onAction={() => navigate("/testimonials")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <Card key={submission.id} className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-medium truncate">{submission.author_name}</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < submission.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <Badge 
                    variant={
                      submission.status === 'approved' 
                        ? 'default' 
                        : submission.status === 'pending'
                        ? 'secondary'
                        : 'destructive'
                    }
                    className="ml-2"
                  >
                    {submission.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {submission.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {submission.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                    {submission.status}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {submission.message}
                </p>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                  {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                </span>
                {submission.avatar_url && (
                    <span className="flex items-center gap-1">
                      <Image className="h-3 w-3" />
                      Photo
                    </span>
                  )}
                  {submission.video_url && (
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      Video
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
