import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Palette, Users, Code } from "lucide-react";

interface DashboardQuickActionsProps {
  widgetInstalled: boolean;
}

export function DashboardQuickActions({ widgetInstalled }: DashboardQuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      label: "New Notification",
      icon: Plus,
      onClick: () => navigate('/campaigns?openWizard=true'),
      variant: "default" as const,
    },
    {
      label: "Customize Style",
      icon: Palette,
      onClick: () => navigate('/settings?tab=theme'),
      variant: "outline" as const,
    },
    {
      label: "Invite Team",
      icon: Users,
      onClick: () => navigate('/team'),
      variant: "outline" as const,
    },
  ];

  // Add install widget action if not installed
  if (!widgetInstalled) {
    actions.unshift({
      label: "Install Widget",
      icon: Code,
      onClick: () => navigate('/websites'),
      variant: "default" as const,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks to get you started</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant={action.variant}
                onClick={action.onClick}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
