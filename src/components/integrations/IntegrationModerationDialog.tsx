import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Edit2, Eye, Trash2, Shield, MapPin, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { NotificationPreview } from "@/components/templates/NotificationPreview";

interface Event {
  id: string;
  message_template: string;
  user_name: string | null;
  user_location: string | null;
  event_type: string;
  event_data: any;
  moderation_status: "pending" | "approved" | "rejected" | "flagged";
  status: string;
  created_at: string;
  widget_id: string;
  views: number;
  clicks: number;
  source: string;
  integration_type: string;
}

interface IntegrationModerationDialogProps {
  integrationType: string;
  integrationName: string;
  open: boolean;
  onClose: () => void;
}

export function IntegrationModerationDialog({
  integrationType,
  integrationName,
  open,
  onClose,
}: IntegrationModerationDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [editForm, setEditForm] = useState({
    message_template: "",
    user_name: "",
    user_location: "",
  });
  const queryClient = useQueryClient();

  // Fetch events filtered by integration type
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events-moderation", integrationType, selectedStatus],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          widgets!inner(user_id, campaign_id)
        `)
        .eq("widgets.user_id", user.id)
        .eq("integration_type", integrationType as any)
        .eq("moderation_status", selectedStatus)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Event[];
    },
    enabled: open,
  });

  // Update event moderation status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("events")
        .update({ moderation_status: status, status: status === "approved" ? "approved" : "rejected" })
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["integration-pending-count"] });
      toast.success(
        variables.status === "approved" 
          ? "Event approved and ready to display" 
          : "Event rejected"
      );
    },
    onError: (error) => {
      toast.error("Failed to update event status");
      console.error(error);
    },
  });

  // Update event details
  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string; updates: any }) => {
      const { error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events-moderation"] });
      toast.success("Event updated successfully");
      setEditingEvent(null);
    },
    onError: (error) => {
      toast.error("Failed to update event");
      console.error(error);
    },
  });

  // Delete event
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["integration-pending-count"] });
      toast.success("Event deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete event");
      console.error(error);
    },
  });

  // Bulk approve all pending
  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      const pendingIds = events
        .filter(e => e.moderation_status === 'pending')
        .map(e => e.id);

      if (pendingIds.length === 0) return 0;

      const { error } = await supabase
        .from("events")
        .update({ moderation_status: "approved", status: "approved" })
        .in("id", pendingIds);

      if (error) throw error;
      return pendingIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["events-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["integration-pending-count"] });
      toast.success(`Approved ${count} events`);
    },
    onError: (error) => {
      toast.error("Failed to approve events");
      console.error(error);
    },
  });

  // Bulk delete rejected
  const bulkDeleteRejectedMutation = useMutation({
    mutationFn: async () => {
      const rejectedIds = events
        .filter(e => e.moderation_status === 'rejected')
        .map(e => e.id);

      if (rejectedIds.length === 0) return 0;

      const { error } = await supabase
        .from("events")
        .delete()
        .in("id", rejectedIds);

      if (error) throw error;
      return rejectedIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["events-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["integration-pending-count"] });
      toast.success(`Deleted ${count} rejected events`);
    },
    onError: (error) => {
      toast.error("Failed to delete events");
      console.error(error);
    },
  });

  const handleApprove = (eventId: string) => {
    updateStatusMutation.mutate({ eventId, status: "approved" });
  };

  const handleReject = (eventId: string) => {
    updateStatusMutation.mutate({ eventId, status: "rejected" });
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setEditForm({
      message_template: event.message_template || "",
      user_name: event.user_name || "",
      user_location: event.user_location || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingEvent) return;
    
    updateEventMutation.mutate({
      eventId: editingEvent.id,
      updates: editForm,
    });
  };

  const pendingCount = events.filter(e => e.moderation_status === "pending").length;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Moderate {integrationName} Events</DialogTitle>
                <DialogDescription>
                  Review and approve events from this integration before they appear on your site
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="relative">
                Pending
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedStatus} className="mt-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading events...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    No {selectedStatus} events
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedStatus === 'pending' 
                      ? "All events have been reviewed!" 
                      : `No ${selectedStatus} events from ${integrationName}`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Bulk Actions */}
                  {selectedStatus === 'pending' && events.length > 0 && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => bulkApproveMutation.mutate()}
                        disabled={bulkApproveMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve All ({events.length})
                      </Button>
                    </div>
                  )}
                  {selectedStatus === 'rejected' && events.length > 0 && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => bulkDeleteRejectedMutation.mutate()}
                        disabled={bulkDeleteRejectedMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All ({events.length})
                      </Button>
                    </div>
                  )}
                  {events.map((event) => (
                    <Card key={event.id} className={event.moderation_status === 'pending' ? "border-l-4 border-l-orange-500" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {event.event_data?.ga4_event_name || event.event_type}
                              </Badge>
                              <Badge
                                variant={
                                  event.moderation_status === "approved"
                                    ? "default"
                                    : event.moderation_status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {event.moderation_status}
                              </Badge>
                              {event.source && (
                                <Badge variant="outline" className="text-xs">
                                  {event.source}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base font-medium leading-tight">
                              {event.message_template || "No message template"}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {event.user_name && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              <span>{event.user_name}</span>
                            </div>
                          )}
                          {event.user_location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{event.user_location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            <span>{event.views} views · {event.clicks} clicks</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewEvent(event)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(event)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          {event.moderation_status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(event.id)}
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(event.id)}
                                disabled={updateStatusMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}
                          {event.moderation_status === "rejected" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(event.id)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                          )}
                          {event.moderation_status === "approved" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(event.id)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteEventMutation.mutate(event.id)}
                            disabled={deleteEventMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Modify the event details before approving
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message Template</Label>
              <Textarea
                id="message"
                value={editForm.message_template}
                onChange={(e) =>
                  setEditForm({ ...editForm, message_template: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_name">User Name</Label>
              <Input
                id="user_name"
                value={editForm.user_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, user_name: e.target.value })
                }
                placeholder="Anonymous"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={editForm.user_location}
                onChange={(e) =>
                  setEditForm({ ...editForm, user_location: e.target.value })
                }
                placeholder="Unknown"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEvent(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateEventMutation.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewEvent} onOpenChange={() => setPreviewEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Preview</DialogTitle>
            <DialogDescription>
              How this event will appear to visitors
            </DialogDescription>
          </DialogHeader>
          <div className="h-96">
            {previewEvent && (
              <NotificationPreview
                template={{
                  name: "Preview",
                  template_config: {
                    position: "bottom-right",
                    animation: "slide",
                    previewData: {
                      message: previewEvent.message_template,
                      location: previewEvent.user_location,
                      time: formatDistanceToNow(new Date(previewEvent.created_at), { addSuffix: true }),
                    },
                  },
                  style_config: {
                    accentColor: "#3B82F6",
                    backgroundColor: "#ffffff",
                    textColor: "#1a1a1a",
                    borderRadius: 12,
                  },
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewEvent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
