import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  RotateCcw, 
  Settings,
  Plus,
  Eye,
  EyeOff,
  Timer,
  Shuffle
} from 'lucide-react';
import { useUserQuickWins } from '@/hooks/useUserQuickWins';
import { useEnhancedQuickWinTemplates } from '@/hooks/useEnhancedQuickWinTemplates';
import { EnhancedQuickWinTemplateSelector } from '@/components/EnhancedQuickWinTemplateSelector';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { QuickWinFormData } from '@/types/quickWin';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWebsiteContext } from '@/contexts/WebsiteContext';

interface EnhancedQuickWinManagerProps {
  widgetId: string;
}


export const EnhancedQuickWinManager = ({ widgetId }: EnhancedQuickWinManagerProps) => {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editingQuickWin, setEditingQuickWin] = useState<any>(null);

  const { profile } = useAuth();
  const { selectedWebsite } = useWebsiteContext();
  const { toast } = useToast();
  const { quickWins, loading, toggleQuickWin, removeQuickWin, refetch } = useUserQuickWins(widgetId);
  
  // Use website business_type instead of profile business_type
  const businessType = selectedWebsite?.business_type || profile?.business_type || 'saas';
  const { templates: enhancedTemplates, getTemplateStats } = useEnhancedQuickWinTemplates(businessType);
  
  const templateStats = getTemplateStats();


  const handleCreateQuickWin = async (formData: QuickWinFormData) => {
    try {
      const template = enhancedTemplates.find(t => t.id === formData.templateId);
      if (!template) {
        toast({
          title: "Error",
          description: "Template not found",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('user_quick_wins')
        .insert({
          user_id: profile?.id,
          widget_id: widgetId,
          template_id: formData.templateId,
          custom_metadata: formData.fieldValues,
          expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
          is_enabled: true
        });

      if (error) throw error;

      toast({
        title: "Quick-Win Created!",
        description: `Successfully created quick-win using ${template.name} template`,
      });

      refetch();
      setShowTemplateSelector(false);
    } catch (error) {
      console.error('Error creating quick-win:', error);
      toast({
        title: "Error",
        description: "Failed to create quick-win. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditQuickWin = (quickWin: any) => {
    setEditingQuickWin(quickWin);
  };

  const handleUpdateQuickWin = async (updatedData: Partial<any>) => {
    if (!editingQuickWin) return;

    try {
      const { error } = await supabase
        .from('user_quick_wins')
        .update(updatedData)
        .eq('id', editingQuickWin.id);

      if (error) throw error;

      toast({
        title: "Quick-Win Updated",
        description: "Your quick-win has been updated successfully",
      });

      refetch();
      setEditingQuickWin(null);
    } catch (error) {
      console.error('Error updating quick-win:', error);
      toast({
        title: "Error",
        description: "Failed to update quick-win",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading quick-win manager...</div>;
  }

  const activeQuickWins = quickWins.filter(qw => qw.is_enabled);
  const inactiveQuickWins = quickWins.filter(qw => !qw.is_enabled);

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Quick-Win Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage promotional notifications and automated events
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowTemplateSelector(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Quick-Win ({templateStats.total})
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-lg font-semibold">{activeQuickWins.length}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-lg font-semibold">{inactiveQuickWins.length}</div>
                <div className="text-xs text-muted-foreground">Inactive</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-lg font-semibold">AUTO</div>
                <div className="text-xs text-muted-foreground">Rotation</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-lg font-semibold">{templateStats.total}</div>
                <div className="text-xs text-muted-foreground">Templates</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Quick-Wins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-green-500" />
            Active Quick-Wins ({activeQuickWins.length})
          </CardTitle>
          <CardDescription>
            Currently enabled promotional notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeQuickWins.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-semibold mb-2">No Active Quick-Wins</h4>
              <p className="text-muted-foreground mb-4">
                Create your first quick-win to start showing promotional notifications
              </p>
              <Button onClick={() => setShowTemplateSelector(true)}>
                Create Quick-Win
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeQuickWins.map((quickWin) => {
                const template = enhancedTemplates.find(t => t.id === quickWin.template_id);
                
                return (
                  <div key={quickWin.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{template?.name || 'Unknown Template'}</h4>
                          <Badge variant="default">Active</Badge>
                          {quickWin.expires_at && (
                            <Badge variant="outline" className="gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires {new Date(quickWin.expires_at).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="bg-muted/50 rounded p-3 text-sm mb-2">
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

                        {Object.keys(quickWin.custom_metadata || {}).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(quickWin.custom_metadata || {}).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {String(value)}
                              </Badge>
                            ))}
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
                          onClick={() => handleEditQuickWin(quickWin)}
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

      {/* Inactive Quick-Wins */}
      {inactiveQuickWins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-muted-foreground" />
              Inactive Quick-Wins ({inactiveQuickWins.length})
            </CardTitle>
            <CardDescription>
              Disabled promotional notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveQuickWins.map((quickWin) => {
                const template = enhancedTemplates.find(t => t.id === quickWin.template_id);
                
                return (
                  <div key={quickWin.id} className="border rounded-lg p-4 opacity-60">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{template?.name || 'Unknown Template'}</h4>
                          <Badge variant="secondary">Disabled</Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {template?.description}
                        </div>
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
          </CardContent>
        </Card>
      )}

      {/* Template Selector */}
      <EnhancedQuickWinTemplateSelector
        businessType={businessType}
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onSelectTemplate={handleCreateQuickWin}
      />
    </div>
  );
};