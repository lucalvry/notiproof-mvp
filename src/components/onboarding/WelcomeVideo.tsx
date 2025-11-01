import { Shield, Zap, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

export function WelcomeVideo() {
  return (
    <div className="space-y-6 text-center">
      <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center border-2 border-dashed border-primary/20">
        <div className="text-center p-8">
          <h3 className="text-2xl font-bold mb-3">How NotiProof Works</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Display real-time customer activity notifications on your website to build trust, create urgency, and boost conversions by up to 35%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h4 className="font-semibold">Build Trust</h4>
          <p className="text-sm text-muted-foreground">
            Show real customer activity to prove your credibility
          </p>
        </Card>

        <Card className="p-4 space-y-2 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Zap className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h4 className="font-semibold">Create Urgency</h4>
          <p className="text-sm text-muted-foreground">
            Display live visitor counts and low stock alerts
          </p>
        </Card>

        <Card className="p-4 space-y-2 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h4 className="font-semibold">Boost Sales</h4>
          <p className="text-sm text-muted-foreground">
            Increase conversions by an average of 35%
          </p>
        </Card>
      </div>
    </div>
  );
}
