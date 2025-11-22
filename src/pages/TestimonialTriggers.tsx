import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { TriggerSelector } from '@/components/testimonials/TriggerSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function TestimonialTriggers() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);

  const handleBulkSend = async (recipients: Array<{ email: string; name?: string; company?: string }>) => {
    if (!formId || recipients.length === 0) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-testimonial-invites', {
        body: {
          form_id: formId,
          recipients,
        },
      });

      if (error) throw error;

      toast.success(`Sent ${data.sent} invitations successfully`);
      
      if (data.failed > 0) {
        toast.warning(`${data.failed} invitations failed to send`);
      }
    } catch (error) {
      console.error('Error sending bulk invites:', error);
      toast.error('Failed to send invitations');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate('/dashboard')}>Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate('/testimonials')}>Testimonials</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Send Invitations</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/testimonials')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Send Invitations</h1>
            <p className="text-muted-foreground mt-1">
              Choose how you want to invite people to share testimonials
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitation Methods</CardTitle>
          <CardDescription>
            Select the best way to reach your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Sending invitations...</span>
            </div>
          ) : (
            <TriggerSelector formId={formId!} onCsvUpload={handleBulkSend} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
