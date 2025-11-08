import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MessageTemplateBuilder } from "./MessageTemplateBuilder";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";

interface ActionRule {
  type: 'replace_variable' | 'change_url' | 'change_image' | 'hide_event';
  condition: string;
  value: string;
}

interface IntegrationConfig {
  message_template: string;
  image_fallback_url: string;
  locale: string;
  actions: ActionRule[];
}

interface IntegrationConfigCardProps {
  dataSource: string;
  campaignType: string;
  config: IntegrationConfig;
  onChange: (config: IntegrationConfig) => void;
}

export function IntegrationConfigCard({ 
  dataSource, 
  campaignType,
  config, 
  onChange 
}: IntegrationConfigCardProps) {
  
  const addActionRule = () => {
    const newAction: ActionRule = {
      type: 'replace_variable',
      condition: '',
      value: ''
    };
    
    onChange({
      ...config,
      actions: [...config.actions, newAction]
    });
    
    toast.success('Action rule added');
  };

  const removeActionRule = (index: number) => {
    const newActions = config.actions.filter((_, i) => i !== index);
    onChange({ ...config, actions: newActions });
    toast.success('Action rule removed');
  };

  const updateActionRule = (index: number, field: keyof ActionRule, value: string) => {
    const newActions = [...config.actions];
    newActions[index] = {
      ...newActions[index],
      [field]: value
    };
    onChange({ ...config, actions: newActions });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Integration Settings</CardTitle>
        <CardDescription>
          Configure advanced options for this integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="template" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="translation">Translation</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4">
            <MessageTemplateBuilder
              dataSource={dataSource}
              campaignType={campaignType}
              value={config.message_template}
              onChange={(value) => onChange({ ...config, message_template: value })}
            />
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-fallback">Default Image Fallback URL</Label>
              <Input
                id="image-fallback"
                placeholder="https://example.com/default-avatar.png"
                value={config.image_fallback_url}
                onChange={(e) => onChange({ ...config, image_fallback_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                This image will be used when an event doesn't have an image
              </p>
            </div>

            {config.image_fallback_url && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border rounded-lg p-4 flex items-center gap-3 bg-muted/50">
                  <img 
                    src={config.image_fallback_url} 
                    alt="Fallback preview" 
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">?</text></svg>';
                    }}
                  />
                  <div className="text-sm text-muted-foreground">
                    Fallback image loaded successfully
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="translation" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="locale">Notification Language</Label>
              <Select
                value={config.locale}
                onValueChange={(locale) => onChange({ ...config, locale })}
              >
                <SelectTrigger id="locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                  <SelectItem value="pt">🇧🇷 Português</SelectItem>
                  <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                  <SelectItem value="ja">🇯🇵 日本語</SelectItem>
                  <SelectItem value="zh">🇨🇳 中文</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default language for notifications (time/date formatting)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Event Action Rules</h4>
                <p className="text-xs text-muted-foreground">
                  Automatically modify events based on conditions
                </p>
              </div>
              <Button size="sm" onClick={addActionRule}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>

            {config.actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p className="text-sm">No action rules configured</p>
                <p className="text-xs mt-1">Click "Add Rule" to create your first rule</p>
              </div>
            ) : (
              <div className="space-y-3">
                {config.actions.map((action, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Rule {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeActionRule(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Action Type</Label>
                          <Select
                            value={action.type}
                            onValueChange={(value) => updateActionRule(index, 'type', value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="replace_variable">Replace Variable</SelectItem>
                              <SelectItem value="change_url">Change URL</SelectItem>
                              <SelectItem value="change_image">Change Image</SelectItem>
                              <SelectItem value="hide_event">Hide Event</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Condition</Label>
                          <Input
                            placeholder='e.g., {{user_name}} contains "Test"'
                            value={action.condition}
                            onChange={(e) => updateActionRule(index, 'condition', e.target.value)}
                            className="h-9 text-sm font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">
                            {action.type === 'hide_event' ? 'Note (optional)' : 'Replacement Value'}
                          </Label>
                          <Input
                            placeholder={
                              action.type === 'replace_variable' ? 'e.g., Anonymous User' :
                              action.type === 'change_url' ? 'e.g., https://example.com' :
                              action.type === 'change_image' ? 'e.g., https://example.com/image.png' :
                              'Optional note'
                            }
                            value={action.value}
                            onChange={(e) => updateActionRule(index, 'value', e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>

                      <div className="bg-muted/50 p-2 rounded text-xs">
                        <p className="font-medium mb-1">Preview:</p>
                        <p className="text-muted-foreground">
                          If <code className="bg-background px-1 rounded">{action.condition || 'condition'}</code>
                          {' '}then <code className="bg-background px-1 rounded">{action.type.replace('_', ' ')}</code>
                          {action.type !== 'hide_event' && action.value && (
                            <> to <code className="bg-background px-1 rounded">{action.value}</code></>
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Example Use Cases:
              </h5>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Hide test events: condition = <code>user_name contains "Test"</code></li>
                <li>Replace sensitive data: condition = <code>email contains "@"</code>, value = <code>Anonymous</code></li>
                <li>Change product URLs: condition = <code>product_name = "Demo"</code>, value = <code>/demo-page</code></li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
