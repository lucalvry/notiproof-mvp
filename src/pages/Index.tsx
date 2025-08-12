import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Zap, BarChart3 } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  // Redirect authenticated users to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-8">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold">NotiProof</div>
          <div className="space-x-4">
            <Button asChild variant="outline">
              <Link to="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6">
            Boost Your Website's 
            <span className="text-primary"> Conversions</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create and manage real-time social proof notifications that build trust and drive more sales on your website.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to="/auth/signup">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth/login">View Demo</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Notifications</h3>
            <p className="text-muted-foreground">
              Display live social proof notifications to boost visitor confidence and conversions.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy Setup</h3>
            <p className="text-muted-foreground">
              Add a simple script tag to your website and start showing social proof in minutes.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Analytics & Insights</h3>
            <p className="text-muted-foreground">
              Track views, clicks, and performance metrics to optimize your social proof strategy.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
