import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Save, Send, Loader2 } from 'lucide-react';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';

const TEMPLATE_TYPES = {
  invite: 'Invitation Email',
  thank_you: 'Thank You Email',
};

const TEMPLATE_NAMES = {
  default: 'Default',
  short: 'Short & Sweet',
  friendly: 'Friendly',
  formal: 'Formal',
};

interface EmailTemplate {
  id: string;
  template_type: 'invite' | 'thank_you';
  template_name: 'default' | 'short' | 'friendly' | 'formal';
  subject: string;
  body: string;
  cta_text: string | null;
}

export default function TestimonialEmailManager() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'invite' | 'thank_you' | 'settings'>('invite');
  const [formData, setFormData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [websiteId, setWebsiteId] = useState<string | null>(null);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<'default' | 'short' | 'friendly' | 'formal'>('default');
  const [inviteTemplates, setInviteTemplates] = useState<Record<string, EmailTemplate>>({});
  const [thankYouTemplates, setThankYouTemplates] = useState<Record<string, EmailTemplate>>({});

  // Email settings state
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDays, setFollowUpDays] = useState(7);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadData();
  }, [formId]);

  const loadData = async () => {
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      setUserId(user.id);

      // Load form
      const { data: form, error: formError } = await supabase
        .from('testimonial_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError) throw formError;
      setFormData(form);
      setWebsiteId(form.website_id);

      // Load email templates
      const { data: templates, error: templatesError } = await supabase
        .from('testimonial_email_templates')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.eq.00000000-0000-0000-0000-000000000000`)
        .in('template_type', ['invite', 'thank_you']);

      if (templatesError) throw templatesError;

      // Organize templates by type and name
      const inviteMap: Record<string, EmailTemplate> = {};
      const thankYouMap: Record<string, EmailTemplate> = {};

      templates?.forEach((template) => {
        if (template.template_type === 'invite') {
          inviteMap[template.template_name] = template as EmailTemplate;
        } else if (template.template_type === 'thank_you') {
          thankYouMap[template.template_name] = template as EmailTemplate;
        }
      });

      setInviteTemplates(inviteMap);
      setThankYouTemplates(thankYouMap);

      // Load email config from form
      const emailConfig = form.email_config as any;
      if (emailConfig?.follow_up_enabled) {
        setFollowUpEnabled(emailConfig.follow_up_enabled);
        setFollowUpDays(emailConfig.follow_up_days || 7);
      }
    } catch (error) {
      console.error('Error loading email data:', error);
      toast.error('Failed to load email settings');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTemplate = (): EmailTemplate | null => {
    const templates = activeTab === 'invite' ? inviteTemplates : thankYouTemplates;
    return templates[selectedTemplate] || null;
  };

  const updateTemplate = (field: keyof EmailTemplate, value: string) => {
    const currentTemplate = getCurrentTemplate();
    if (!currentTemplate) return;

    const templates = activeTab === 'invite' ? inviteTemplates : thankYouTemplates;
    const setter = activeTab === 'invite' ? setInviteTemplates : setThankYouTemplates;

    setter({
      ...templates,
      [selectedTemplate]: {
        ...currentTemplate,
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!userId || !websiteId) return;

    setSaving(true);
    try {
      const currentTemplate = getCurrentTemplate();
      if (!currentTemplate) throw new Error('No template selected');

      // Check if this is a system template
      const isSystemTemplate = currentTemplate.id.includes('00000000-0000-0000-0000-000000000000');

      if (isSystemTemplate) {
        // Create a new user-specific template
        const { error } = await supabase
          .from('testimonial_email_templates')
          .insert({
            user_id: userId,
            website_id: websiteId,
            template_type: currentTemplate.template_type,
            template_name: currentTemplate.template_name,
            subject: currentTemplate.subject,
            body: currentTemplate.body,
            cta_text: currentTemplate.cta_text,
          });

        if (error) throw error;
      } else {
        // Update existing user template
        const { error } = await supabase
          .from('testimonial_email_templates')
          .update({
            subject: currentTemplate.subject,
            body: currentTemplate.body,
            cta_text: currentTemplate.cta_text,
          })
          .eq('id', currentTemplate.id);

        if (error) throw error;
      }

      toast.success('Email template saved');
      await loadData(); // Reload to get the new template
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!formId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('testimonial_forms')
        .update({
          email_config: {
            follow_up_enabled: followUpEnabled,
            follow_up_days: followUpDays,
          },
        })
        .eq('id', formId);

      if (error) throw error;

      toast.success('Email settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !formId) return;

    try {
      const { error } = await supabase.functions.invoke('send-testimonial-invite', {
        body: {
          form_id: formId,
          email: testEmail,
          name: 'Test User',
          is_test: true,
        },
      });

      if (error) throw error;

      toast.success('Test email sent!');
      setTestEmail('');
    } catch (error) {
      console.error('Error sending test:', error);
      toast.error('Failed to send test email');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentTemplate = getCurrentTemplate();

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
            <BreadcrumbPage>Email Manager</BreadcrumbPage>
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
            <h1 className="text-3xl font-bold">Email Templates</h1>
            <p className="text-muted-foreground mt-1">
              Customize your invitation and thank you email templates {formData && `for ${formData.name}`}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="invite">Invite Email</TabsTrigger>
          <TabsTrigger value="thank_you">Thank You</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Invite Email Tab */}
        <TabsContent value="invite" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invitation Email Template</CardTitle>
                  <CardDescription>
                    Customize the email sent to invite people to share testimonials
                  </CardDescription>
                </div>
                <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as any)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_NAMES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentTemplate && (
                <>
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input
                      value={currentTemplate.subject}
                      onChange={(e) => updateTemplate('subject', e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Body</Label>
                    <Textarea
                      value={currentTemplate.body}
                      onChange={(e) => updateTemplate('body', e.target.value)}
                      placeholder="Email content..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available placeholders: {'{'}name{'}'}, {'{'}form_name{'}'}, {'{'}form_url{'}'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Call-to-Action Button Text</Label>
                    <Input
                      value={currentTemplate.cta_text || ''}
                      onChange={(e) => updateTemplate('cta_text', e.target.value)}
                      placeholder="e.g., Share Your Feedback"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Template
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thank You Email Tab */}
        <TabsContent value="thank_you" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Thank You Email Template</CardTitle>
                  <CardDescription>
                    Email sent after someone submits their testimonial
                  </CardDescription>
                </div>
                <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as any)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_NAMES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentTemplate && (
                <>
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input
                      value={currentTemplate.subject}
                      onChange={(e) => updateTemplate('subject', e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Body</Label>
                    <Textarea
                      value={currentTemplate.body}
                      onChange={(e) => updateTemplate('body', e.target.value)}
                      placeholder="Email content..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available placeholders: {'{'}name{'}'}, {'{'}reward_code{'}'}, {'{'}reward_url{'}'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Template
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>Configure follow-up timing and test emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Follow-Up Emails</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Send a reminder if no response after X days
                    </p>
                  </div>
                  <Switch checked={followUpEnabled} onCheckedChange={setFollowUpEnabled} />
                </div>

                {followUpEnabled && (
                  <div className="space-y-2 ml-6">
                    <Label>Follow-Up After (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={followUpDays}
                      onChange={(e) => setFollowUpDays(parseInt(e.target.value) || 7)}
                      className="w-32"
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Send Test Email</h3>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button onClick={handleSendTest} disabled={!testEmail}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Send a test invitation email to verify it looks correct
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
