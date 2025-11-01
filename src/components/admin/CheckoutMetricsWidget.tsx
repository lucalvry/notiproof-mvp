import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CheckoutStats {
  attempts: number;
  successes: number;
  errors: number;
  successRate: number;
  avgDuration: number;
  recentErrors: Array<{
    error_message: string;
    created_at: string;
    details: any;
  }>;
}

export function CheckoutMetricsWidget() {
  const [stats, setStats] = useState<CheckoutStats>({
    attempts: 0,
    successes: 0,
    errors: 0,
    successRate: 0,
    avgDuration: 0,
    recentErrors: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: logs } = await supabase
        .from('integration_logs')
        .select('*')
        .eq('integration_type', 'stripe_checkout')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (!logs) {
        setLoading(false);
        return;
      }

      const attempts = logs.filter(l => l.action === 'checkout_initiated').length;
      const successes = logs.filter(l => l.action === 'checkout_created' && l.status === 'success').length;
      const errors = logs.filter(l => l.status === 'error').length;
      
      const successfulCheckouts = logs.filter(l => 
        l.action === 'checkout_created' && 
        l.status === 'success' && 
        l.duration_ms
      );
      
      const avgDuration = successfulCheckouts.length > 0
        ? successfulCheckouts.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / successfulCheckouts.length
        : 0;

      const recentErrors = logs
        .filter(l => l.status === 'error')
        .slice(0, 5)
        .map(l => ({
          error_message: l.error_message || 'Unknown error',
          created_at: l.created_at,
          details: l.details,
        }));

      setStats({
        attempts,
        successes,
        errors,
        successRate: attempts > 0 ? (successes / attempts * 100) : 0,
        avgDuration,
        recentErrors,
      });
    } catch (error) {
      console.error('Failed to fetch checkout stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checkout Success Rate (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isHealthy = stats.successRate >= 90;
  const isWarning = stats.successRate >= 70 && stats.successRate < 90;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Checkout Success Rate (24h)</span>
          {isHealthy ? (
            <TrendingUp className="h-5 w-5 text-success" />
          ) : isWarning ? (
            <AlertCircle className="h-5 w-5 text-warning" />
          ) : (
            <TrendingDown className="h-5 w-5 text-destructive" />
          )}
        </CardTitle>
        <CardDescription>Real-time monitoring of Stripe checkout flow</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Rate */}
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <div className={`text-4xl font-bold ${
              isHealthy ? 'text-success' : isWarning ? 'text-warning' : 'text-destructive'
            }`}>
              {stats.successRate.toFixed(1)}%
            </div>
            <Badge variant={isHealthy ? "default" : isWarning ? "secondary" : "destructive"}>
              {isHealthy ? "Healthy" : isWarning ? "Warning" : "Critical"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {stats.successes} successful / {stats.attempts} total attempts
            {stats.errors > 0 && (
              <span className="text-destructive ml-2">
                ({stats.errors} errors)
              </span>
            )}
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Avg Duration</span>
            </div>
            <div className="text-2xl font-semibold">
              {stats.avgDuration > 0 ? `${(stats.avgDuration / 1000).toFixed(1)}s` : 'N/A'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Sessions Created</span>
            </div>
            <div className="text-2xl font-semibold">{stats.successes}</div>
          </div>
        </div>

        {/* Recent Errors */}
        {stats.recentErrors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Recent Errors
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {stats.recentErrors.map((error, i) => (
                <div key={i} className="text-xs p-2 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="font-medium text-destructive">{error.error_message}</div>
                  <div className="text-muted-foreground mt-1">
                    {new Date(error.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Errors State */}
        {stats.attempts > 0 && stats.errors === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-success/10 border border-success/20">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm text-success font-medium">
              All checkouts processing successfully
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
