import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Clock, Zap, Star, MessageSquare, BarChart3 } from "lucide-react";

interface WelcomeScreenProps {
  onContinue: () => void;
  onSkip: () => void;
}

export function WelcomeScreen({ onContinue, onSkip }: WelcomeScreenProps) {
  return (
    <div className="space-y-8 text-center py-4">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-6">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 rounded-full bg-success p-1.5">
              <Star className="h-4 w-4 text-success-foreground fill-current" />
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to NotiProof! 🎉
        </h1>
        
        <p className="text-muted-foreground max-w-md mx-auto text-lg">
          Turn visitors into customers with real-time social proof notifications
        </p>
      </div>

      {/* Value Props */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6 text-center space-y-2">
            <div className="flex justify-center">
              <div className="rounded-full bg-blue-500/10 p-3">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <h3 className="font-semibold">5 Minute Setup</h3>
            <p className="text-sm text-muted-foreground">
              Get your first notification live in minutes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-6 text-center space-y-2">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-500/10 p-3">
                <BarChart3 className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <h3 className="font-semibold">+35% Conversions</h3>
            <p className="text-sm text-muted-foreground">
              Average increase in conversion rates
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6 text-center space-y-2">
            <div className="flex justify-center">
              <div className="rounded-full bg-purple-500/10 p-3">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <h3 className="font-semibold">No Coding Needed</h3>
            <p className="text-sm text-muted-foreground">
              Simple copy-paste installation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* What You Can Do */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">What you can build:</h3>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Testimonial Popups</p>
                <p className="text-xs text-muted-foreground">Show customer reviews</p>
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
                <p className="font-medium text-sm">Visitor Counts</p>
                <p className="text-xs text-muted-foreground">Show who's browsing</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button onClick={onContinue} size="lg" className="w-full gap-2">
          <Sparkles className="h-5 w-5" />
          Get Started
        </Button>
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Skip for now - I'll explore on my own
        </Button>
      </div>
    </div>
  );
}
