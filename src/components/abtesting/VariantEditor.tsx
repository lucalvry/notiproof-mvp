import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { ABTestVariant, useABTestVariants } from "@/hooks/useABTests";

interface VariantEditorProps {
  testId: string;
  variant: ABTestVariant;
  canDelete: boolean;
}

export function VariantEditor({ testId, variant, canDelete }: VariantEditorProps) {
  const [message, setMessage] = useState(variant.message_template || "");
  const [position, setPosition] = useState(variant.position || "bottom-right");
  const [animation, setAnimation] = useState(variant.animation || "slide");
  
  const { updateVariant, deleteVariant } = useABTestVariants(testId);

  useEffect(() => {
    setMessage(variant.message_template || "");
    setPosition(variant.position || "bottom-right");
    setAnimation(variant.animation || "slide");
  }, [variant]);

  const handleSave = () => {
    updateVariant.mutate({
      id: variant.id,
      updates: {
        message_template: message,
        position,
        animation,
      },
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this variant?')) {
      deleteVariant.mutate(variant.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{variant.name}</CardTitle>
            {variant.is_control && <Badge variant="secondary">Control</Badge>}
          </div>
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          {variant.views} views • {variant.clicks} clicks • {(variant.conversion_rate || 0).toFixed(2)}% CTR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`message-${variant.id}`}>Message Template</Label>
          <Textarea
            id={`message-${variant.id}`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Someone from {{location}} just {{action}}"
          />
          <p className="text-xs text-muted-foreground">
            Use variables like {"{{location}}"}, {"{{action}}"}, {"{{name}}"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`position-${variant.id}`}>Position</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="top-left">Top Left</SelectItem>
                <SelectItem value="top-right">Top Right</SelectItem>
                <SelectItem value="bottom-center">Bottom Center</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`animation-${variant.id}`}>Animation</Label>
            <Select value={animation} onValueChange={setAnimation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slide">Slide</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="bounce">Bounce</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
