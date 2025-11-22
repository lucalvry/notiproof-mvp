import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageSequenceEditor } from './PageSequenceEditor';
import { QuestionEditor } from './QuestionEditor';
import { RewardSettings } from './RewardSettings';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';

interface FormConfigPanelProps {
  config: any;
  onChange: (config: any) => void;
}

export function FormConfigPanel({ config, onChange }: FormConfigPanelProps) {
  const updateSettings = (key: string, value: any) => {
    onChange({
      ...config,
      settings: {
        ...config.settings,
        [key]: value,
      },
    });
  };

  return (
    <Tabs defaultValue="pages" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="pages">Pages</TabsTrigger>
        <TabsTrigger value="questions">Questions</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="rewards">Rewards</TabsTrigger>
      </TabsList>

      <TabsContent value="pages" className="space-y-4 mt-4">
        <PageSequenceEditor
          sequence={config.pages_config?.sequence || []}
          onChange={(sequence) => 
            onChange({
              ...config,
              pages_config: { ...config.pages_config, sequence },
            })
          }
        />
      </TabsContent>

      <TabsContent value="questions" className="space-y-4 mt-4">
        <QuestionEditor
          questions={config.questions || []}
          onChange={(questions) => onChange({ ...config, questions })}
        />
      </TabsContent>

      <TabsContent value="settings" className="space-y-4 mt-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Form Settings</h3>
          <p className="text-xs text-muted-foreground">
            Configure form behavior and features
          </p>
        </div>

        <Card className="p-4 space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Avatar:</strong> Required (max 2MB)
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Video:</strong> Recording only (no uploads)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Negative Feedback</Label>
              <p className="text-xs text-muted-foreground">
                Branch for low ratings
              </p>
            </div>
            <Switch
              checked={config.settings?.negative_feedback_enabled ?? false}
              onCheckedChange={(checked) => updateSettings('negative_feedback_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Private Feedback</Label>
              <p className="text-xs text-muted-foreground">
                Allow private notes
              </p>
            </div>
            <Switch
              checked={config.settings?.private_feedback_enabled ?? false}
              onCheckedChange={(checked) => updateSettings('private_feedback_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Consent Required</Label>
              <p className="text-xs text-muted-foreground">
                Require permission checkbox
              </p>
            </div>
            <Switch
              checked={config.settings?.consent_required ?? true}
              onCheckedChange={(checked) => updateSettings('consent_required', checked)}
            />
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="rewards" className="space-y-4 mt-4">
        <RewardSettings
          config={config.reward_config || { enabled: false }}
          onChange={(reward_config) => onChange({ ...config, reward_config })}
        />
      </TabsContent>
    </Tabs>
  );
}
