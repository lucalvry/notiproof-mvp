import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'primary' | 'success';
}

export function FeatureCard({ 
  title, 
  description, 
  icon: Icon, 
  actionLabel, 
  onAction,
  variant = 'default'
}: FeatureCardProps) {
  const variants = {
    default: 'bg-muted/50 border-border',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-success/10 border-success/20',
  };

  return (
    <Card className={`transition-all hover:shadow-sm ${variants[variant]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {actionLabel && onAction && (
        <CardContent className="pt-0">
          <Button variant="ghost" size="sm" onClick={onAction} className="gap-2 -ml-2">
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
