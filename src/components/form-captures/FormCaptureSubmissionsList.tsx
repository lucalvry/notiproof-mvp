import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Check, 
  X, 
  Clock, 
  User, 
  Mail, 
  MapPin,
  MoreHorizontal,
  Eye,
  FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface FormCaptureSubmissionsListProps {
  websiteId: string;
  limit?: number;
}

interface FormSubmission {
  id: string;
  event_type: string;
  event_data: any;
  user_name: string | null;
  user_email: string | null;
  user_location: string | null;
  message_template: string | null;
  moderation_status: string | null;
  status: string | null;
  created_at: string;
  page_url: string | null;
}

export function FormCaptureSubmissionsList({ websiteId, limit = 20 }: FormCaptureSubmissionsListProps) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadSubmissions();
  }, [websiteId, statusFilter]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      // Query events that are form captures - using tracking source with form_capture event type
      let query = supabase
        .from("events")
        .select("*")
        .eq("website_id", websiteId)
        .eq("event_type", "form_capture")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (statusFilter !== "all") {
        query = query.eq("moderation_status", statusFilter as "approved" | "pending" | "rejected" | "flagged");
      }

      const { data, error } = await query;
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error loading submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (submissionId: string, newStatus: "approved" | "pending" | "rejected") => {
    try {
      const updateData: { moderation_status: "approved" | "pending" | "rejected" | "flagged"; status?: "approved" | "pending" | "rejected" } = {
        moderation_status: newStatus,
      };
      if (newStatus === "approved" || newStatus === "pending" || newStatus === "rejected") {
        updateData.status = newStatus;
      }
      
      await supabase
        .from("events")
        .update(updateData)
        .eq("id", submissionId);

      toast.success(`Submission ${newStatus}`);
      loadSubmissions();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No form submissions yet</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Form submissions will appear here once visitors start submitting forms on your website.
          Make sure the widget is installed and form capture is enabled.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Submissions</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {submissions.map((submission) => (
          <Card key={submission.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {submission.user_name || "Anonymous"}
                    </span>
                    {getStatusBadge(submission.moderation_status)}
                  </div>

                  {/* Message Preview */}
                  {submission.message_template && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {submission.message_template
                        .replace("{{name}}", submission.user_name || "Someone")
                        .replace("{{location}}", submission.user_location || "")
                        .replace("{{email}}", submission.user_email || "")}
                    </p>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {submission.user_email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{submission.user_email}</span>
                      </div>
                    )}
                    {submission.user_location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{submission.user_location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>

                  {/* Page URL */}
                  {submission.page_url && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      From: {submission.page_url}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {submission.moderation_status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleStatusChange(submission.id, "approved")}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleStatusChange(submission.id, "rejected")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusChange(submission.id, "approved")}>
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(submission.id, "rejected")}>
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(submission.id, "pending")}>
                        <Clock className="h-4 w-4 mr-2" />
                        Set Pending
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
