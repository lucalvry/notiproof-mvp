import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Globe, Zap, HeadphonesIcon, Infinity, ArrowRight, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import logo from "@/assets/NotiProof_Logo.png";

const benefits = [
  {
    icon: Globe,
    title: "3 Websites",
    description: "Connect up to 3 domains with full access",
  },
  {
    icon: Zap,
    title: "25,000 Events/mo",
    description: "Generous monthly event quota",
  },
  {
    icon: Infinity,
    title: "Lifetime Access",
    description: "One-time payment, forever yours",
  },
  {
    icon: HeadphonesIcon,
    title: "Priority Support",
    description: "Get help when you need it",
  },
];

export default function LTDSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showContent, setShowContent] = useState(false);
  
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Trigger confetti celebration
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // Show content after a brief delay
    setTimeout(() => setShowContent(true), 300);

    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    // Navigate to dashboard - the onboarding will trigger there
    navigate("/websites");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <div className={`max-w-2xl w-full transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="NotiProof" className="h-10" />
        </div>

        {/* Success Card */}
        <Card className="border-2 border-primary/20 shadow-2xl shadow-primary/10">
          <CardContent className="pt-8 pb-8 px-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="rounded-full bg-gradient-to-br from-success/20 to-success/5 p-6 animate-pulse">
                    <CheckCircle2 className="h-16 w-16 text-success" />
                  </div>
                  <div className="absolute -top-2 -right-2 rounded-full bg-primary p-2">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Welcome to the Family! 🎉
              </h1>
              
              <p className="text-xl text-muted-foreground">
                Your <span className="text-primary font-semibold">Lifetime Deal</span> is now active
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-4">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div 
                    key={benefit.title}
                    className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{benefit.title}</p>
                      <p className="text-xs text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fair Use Notice */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                ✨ You're locked in at this price <strong>forever</strong> — no monthly fees, ever!
              </p>
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <Button 
                onClick={handleGetStarted} 
                size="lg" 
                className="w-full gap-2 text-lg h-14"
              >
                Start Setting Up Your First Website
                <ArrowRight className="h-5 w-5" />
              </Button>
              
              <p className="text-center text-sm text-muted-foreground">
                We'll guide you through adding your website and creating your first notification
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Questions? Reach out to us at{" "}
          <a href="mailto:support@notiproof.com" className="text-primary hover:underline">
            support@notiproof.com
          </a>
        </p>
      </div>
    </div>
  );
}
