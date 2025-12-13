import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Mail, 
  UserPlus, 
  MessageSquare, 
  ShoppingCart, 
  Settings2,
  Pencil,
  Trash2,
  Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FormCaptureRule {
  id: string;
  targetUrl: string;
  formType: string;
  fieldMappings: Record<string, string>;
  messageTemplate: string;
  requireModeration: boolean;
  enabled: boolean;
  createdAt?: string;
}

interface FormCaptureRuleCardProps {
  rule: FormCaptureRule;
  websiteDomain: string;
  onEdit: (rule: FormCaptureRule) => void;
  onDelete: (ruleId: string) => void;
  onToggle: (ruleId: string, enabled: boolean) => void;
}

const formTypeIcons: Record<string, any> = {
  newsletter: Mail,
  registration: UserPlus,
  contact: MessageSquare,
  checkout: ShoppingCart,
  custom: Settings2,
  book_demo: Calendar,
  rfp: MessageSquare,
};

const formTypeLabels: Record<string, string> = {
  newsletter: "Newsletter",
  registration: "Registration",
  contact: "Contact",
  checkout: "Checkout",
  custom: "Custom",
  book_demo: "Book Demo",
  rfp: "Request Proposal",
};

export function FormCaptureRuleCard({ 
  rule, 
  websiteDomain, 
  onEdit, 
  onDelete, 
  onToggle 
}: FormCaptureRuleCardProps) {
  const Icon = formTypeIcons[rule.formType] || Settings2;
  const typeLabel = formTypeLabels[rule.formType] || rule.formType;

  return (
    <Card className={`transition-all ${rule.enabled ? "border-primary/30" : "opacity-60"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 ${rule.enabled ? "bg-primary/10" : "bg-muted"}`}>
              <Icon className={`h-5 w-5 ${rule.enabled ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{typeLabel}</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {rule.targetUrl || "/*"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                "{rule.messageTemplate}"
              </p>
              {websiteDomain && (
                <p className="text-xs text-muted-foreground mt-1">
                  {websiteDomain}{rule.targetUrl || "/*"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={rule.enabled}
              onCheckedChange={(checked) => onToggle(rule.id, checked)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(rule)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(rule.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
