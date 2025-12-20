import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Clock, Zap, Star, MessageSquare, BarChart3, Infinity, Globe, HeadphonesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LTDWelcomeScreenProps {
  onContinue: () => void;
  onSkip: () => void;
}

export function LTDWelcomeScreen({ onContinue, onSkip }: LTDWelcomeScreenProps) {
  return (
    <div className="space-y-8 text-center py-4">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <div className="rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-6">
              <Crown className="h-12 w-12 text-amber-500" />
            </div>
            <div className="absolute -top-1 -right-1 rounded-full bg-primary p-1.5">
              <Star className="h-4 w-4 text-primary-foreground fill-current" />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Crown className="h-3 w-3 mr-1" />
            Lifetime Member
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, Lifetime Member! 🎉
          </h1>
        </div>
        
        <p className="text-muted-foreground max-w-md mx-auto text-lg">
          You have <span className="text-primary font-semibold">unlimited lifetime access</span> to NotiProof. Let's set you up for success!
        </p>
      </div>

      {/* LTD Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-6 text-center space-y-2">
            <div className="flex justify-center">
              <div className="rounded-full bg-amber-500/10 p-3">
                <Globe className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <h3 className="font-semibold">3 Websites</h3>
            <p className="text-sm text-muted-foreground">
              Full access for all domains
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-6 text-center space-y-2">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-500/10 p-3">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <h3 className="font-semibold">25K Events/mo</h3>
            <p className="text-sm text-muted-foreground">
              Generous monthly quota
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6 text-center space-y-2">
            <div className="flex justify-center">
              <div className="rounded-full bg-purple-500/10 p-3">
                <Infinity className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <h3 className="font-semibold">Forever Yours</h3>
            <p className="text-sm text-muted-foreground">
              One payment, lifetime access
            </p>
          </CardContent>
        </Card>
      </div>

      {/* What You Can Do */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Your lifetime access includes:</h3>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Testimonial Popups</p>
                <p className="text-xs text-muted-foreground">Collect & display reviews</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Live Activity</p>
                <p className="text-xs text-muted-foreground">Real-time signups & sales</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                <Star className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Smart Announcements</p>
                <p className="text-xs text-muted-foreground">Promos, alerts & updates</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Full Analytics</p>
                <p className="text-xs text-muted-foreground">Track your performance</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button onClick={onContinue} size="lg" className="w-full gap-2">
          <Crown className="h-5 w-5" />
          Let's Set Up Your First Website
        </Button>
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Skip for now - I'll explore on my own
        </Button>
      </div>
    </div>
  );
}
