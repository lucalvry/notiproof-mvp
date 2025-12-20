import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ContentAlignmentSelector, ContentAlignment } from "@/components/campaigns/ContentAlignmentSelector";

interface InstantCaptureConfigProps {
  config: {
    target_url: string;
    auto_detect: boolean;
    field_mappings: Record<string, string>;
    require_moderation: boolean;
    content_alignment?: ContentAlignment;
  };
  onChange: (config: any) => void;
}

export function InstantCaptureConfig({ config, onChange }: InstantCaptureConfigProps) {
  const [captureMode, setCaptureMode] = useState<'auto' | 'manual'>('auto');
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!isListening) return;
    
    const handleFormCapture = (event: CustomEvent) => {
      const { fields } = event.detail;
      setDetectedFields(Object.keys(fields));
      toast.success(`Captured form with fields: ${Object.keys(fields).join(', ')}`);
      setIsListening(false);
    };
    
    window.addEventListener('notiproof:form-captured', handleFormCapture as EventListener);
    return () => window.removeEventListener('notiproof:form-captured', handleFormCapture as EventListener);
  }, [isListening]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>📝 Instant Form Capture Setup</CardTitle>
        <CardDescription>
          Track form submissions and show them as social proof
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Target Page URL */}
        <div className="space-y-2">
          <Label>Which page has your form?</Label>
          <Input
            placeholder="e.g., /contact, /signup, /register"
            value={config.target_url}
            onChange={(e) => {
              const updatedConfig = { ...config, target_url: e.target.value };
              onChange(updatedConfig);
            }}
          />
          <p className="text-sm text-muted-foreground">
            We'll automatically detect form submissions on this page
          </p>
        </div>

        {/* Step 2: Capture Mode */}
        <div className="space-y-3">
          <Label>Field Detection</Label>
          <Tabs value={captureMode} onValueChange={(v) => setCaptureMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auto">Auto-Detect (Recommended)</TabsTrigger>
              <TabsTrigger value="manual">Manual Mapping</TabsTrigger>
            </TabsList>
            
            <TabsContent value="auto" className="space-y-3 mt-3">
              <Alert>
                <AlertDescription>
                  🎯 <strong>Test your form now:</strong>
                  <ol className="mt-2 ml-4 list-decimal space-y-1">
                    <li>Visit <code className="text-xs bg-muted px-1 py-0.5 rounded">{config.target_url || 'your form page'}</code></li>
                    <li>Fill out and submit the form</li>
                    <li>We'll auto-detect the fields</li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <Button
                variant={isListening ? "destructive" : "default"}
                onClick={() => setIsListening(!isListening)}
                className="w-full"
              >
                {isListening ? '🔴 Listening for submissions...' : '▶️ Start Listening'}
              </Button>
              
              {detectedFields.length > 0 && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                  <p className="font-semibold text-success">✅ Detected Fields:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {detectedFields.map(field => (
                      <Badge key={field} variant="secondary">
                        {`{{${field}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="manual" className="space-y-3 mt-3">
              <Label>Map form fields to variables:</Label>
              <div className="text-sm text-muted-foreground">
                Manual field mapping will be available in the next step
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Step 3: Content Alignment */}
        <ContentAlignmentSelector
          value={config.content_alignment || 'top'}
          onChange={(alignment) => onChange({ ...config, content_alignment: alignment })}
        />

        {/* Step 4: Moderation Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label>Require approval before showing</Label>
            <p className="text-sm text-muted-foreground">
              Review submissions before they appear as notifications
            </p>
          </div>
          <Switch
            checked={config.require_moderation}
            onCheckedChange={(checked) => onChange({ ...config, require_moderation: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
