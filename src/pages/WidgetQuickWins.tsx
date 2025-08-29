import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { useUserQuickWins } from '@/hooks/useUserQuickWins';
import { useQuickWinTemplates } from '@/hooks/useQuickWinTemplates';
import { useEnhancedQuickWinTemplates } from '@/hooks/useEnhancedQuickWinTemplates';
import { EnhancedQuickWinTemplateSelector } from '@/components/EnhancedQuickWinTemplateSelector';
import { useAuth } from '@/hooks/useAuth';
import { QuickWinFormData } from '@/types/quickWin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWebsiteContext } from '@/contexts/WebsiteContext';

const WidgetQuickWins = () => {
  const { id } = useParams<{ id: string }>();
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showEnhancedSelector, setShowEnhancedSelector] = useState(false);
  const { profile } = useAuth();
  const { selectedWebsite } = useWebsiteContext();
  const { toast } = useToast();
  const { quickWins, loading, toggleQuickWin, removeQuickWin, addQuickWin, refetch } = useUserQuickWins(id);
  
  // Use website business_type instead of profile business_type
  const businessType = selectedWebsite?.business_type || profile?.business_type || 'saas';
  const { templates } = useQuickWinTemplates(businessType);
  const { templates: enhancedTemplates, getTemplateStats } = useEnhancedQuickWinTemplates(businessType);
  
  const templateStats = getTemplateStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/dashboard/widgets/${id}/events`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Loading Quick-Wins...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/dashboard/widgets/${id}/events`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Quick-Win Management</h1>
            <p className="text-muted-foreground">
              Phase 6: Manage your promotional notifications and business-defined events
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowEnhancedSelector(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Quick-Win ({templateStats.total} templates)
          </Button>
        </div>
      </div>

      {/* Enhanced Template Selector */}
      <EnhancedQuickWinTemplateSelector
        businessType={businessType}
        open={showEnhancedSelector}
        onOpenChange={setShowEnhancedSelector}
        onSelectTemplate={async (formData: QuickWinFormData) => {
          try {
            // Find the enhanced template
            const template = enhancedTemplates.find(t => t.id === formData.templateId);
            if (!template) {
              toast({
                title: "Error",
                description: "Template not found",
                variant: "destructive"
              });
              return;
            }

            // Create the quick-win in user_quick_wins table
            const { error } = await supabase
              .from('user_quick_wins')
              .insert({
                user_id: profile?.id,
                widget_id: id,
                template_id: formData.templateId,
                custom_metadata: formData.fieldValues,
                expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
                is_enabled: true
              });

            if (error) throw error;

            // Also create an event immediately
            const processedMessage = template.template_message.replace(
              /\{(\w+)\}/g,
              (match, key) => formData.fieldValues[key] || match
            );

            const { error: eventError } = await supabase
              .from('events')
              .insert({
                widget_id: id,
                event_type: template.event_type,
                event_data: {
                  message: processedMessage,
                  metadata: formData.fieldValues,
                  quick_win: true,
                  template_id: formData.templateId
                },
                source: 'quick_win',
                status: 'approved',
                business_type: profile?.business_type as any,
                message_template: processedMessage,
                expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
              });

            if (eventError) {
              console.error('Error creating event:', eventError);
            }

            toast({
              title: "Quick-Win Created!",
              description: `Successfully created quick-win using ${template.name} template`,
            });

            refetch();
          } catch (error) {
            console.error('Error creating quick-win:', error);
            toast({
              title: "Error",
              description: "Failed to create quick-win. Please try again.",
              variant: "destructive"
            });
          }
        }}
      />

      {/* Current Quick-Wins */}
      <Card>
        <CardHeader>
          <CardTitle>Active Quick-Wins</CardTitle>
          <CardDescription>
            These promotional notifications will fill gaps when natural events are low
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quickWins.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Quick-Wins Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create promotional notifications to engage visitors when natural events are low.
              </p>
              <Button onClick={() => setShowEnhancedSelector(true)}>
                Create Your First Quick-Win
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {quickWins.map((quickWin) => {
                // First try to find in basic templates, then enhanced templates
                const basicTemplate = templates.find(t => t.id === quickWin.template_id);
                const enhancedTemplate = enhancedTemplates.find(t => t.id === quickWin.template_id);
                const template = basicTemplate || enhancedTemplate;
                
                return (
                  <div key={quickWin.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{template?.name || 'Unknown Template'}</h4>
                          <Badge variant={quickWin.is_enabled ? 'default' : 'secondary'}>
                            {quickWin.is_enabled ? 'Active' : 'Disabled'}
                          </Badge>
                          {enhancedTemplate && (
                            <Badge variant="secondary" className="gap-1">
                              ✨ Enhanced
                            </Badge>
                          )}
                          {quickWin.expires_at && (
                            <Badge variant="outline" className="gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires {new Date(quickWin.expires_at).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {template?.description}
                        </p>
                        
                        {/* Show processed message with metadata */}
                        <div className="bg-muted/50 rounded p-3 text-sm">
                          <strong>Preview:</strong> {template?.template_message && (
                            (() => {
                              let message = template.template_message;
                              Object.entries(quickWin.custom_metadata || {}).forEach(([key, value]) => {
                                message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
                              });
                              return message;
                            })()
                          )}
                        </div>
                        
                        {/* Show custom metadata */}
                        {Object.keys(quickWin.custom_metadata || {}).length > 0 && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Configuration:</span>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(quickWin.custom_metadata || {}).map(([key, value]) => (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key}: {String(value)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Show performance hints for enhanced templates */}
                        {enhancedTemplate?.performance_hints && (
                          <div className="text-xs text-muted-foreground">
                            <span className="text-green-600">
                              ⚡ Avg. conversion: {enhancedTemplate.performance_hints.conversion_rate}%
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={quickWin.is_enabled}
                          onCheckedChange={(enabled) => toggleQuickWin(quickWin.id, enabled)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement edit functionality
                            alert('Edit functionality coming soon!');
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this quick-win?')) {
                              removeQuickWin(quickWin.id);
                            }
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick-Win Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>
                <strong>Keep it genuine:</strong> Use realistic names, locations, and scenarios that match your business.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>
                <strong>Set expiration dates:</strong> Promotional offers should have time limits to create urgency.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>
                <strong>Monitor performance:</strong> Track click-through rates and adjust messaging accordingly.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>
                <strong>Graduate naturally:</strong> As you collect more natural events, reduce reliance on quick-wins.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WidgetQuickWins;