import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Eye } from "lucide-react";

export default function Analytics() {
  const stats = [
    { label: "Total Views", value: "12,420", icon: Eye, trend: "+12.5%" },
    { label: "Total Clicks", value: "3,847", icon: Users, trend: "+8.2%" },
    { label: "Conversion Rate", value: "3.2%", icon: TrendingUp, trend: "+2.1%" },
    { label: "Active Campaigns", value: "5", icon: BarChart3, trend: "—" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Detailed insights about your campaigns
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-success">
                  {stat.trend} from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Campaign Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>
            View and compare your campaign metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "Recent Purchases", views: 5420, clicks: 1632, rate: "30.1%" },
              { name: "Live Visitor Count", views: 3850, clicks: 1205, rate: "31.3%" },
              { name: "Customer Reviews", views: 2180, clicks: 687, rate: "31.5%" },
              { name: "Recent Sign-ups", views: 970, clicks: 323, rate: "33.3%" },
            ].map((campaign) => (
              <div key={campaign.name} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="space-y-1">
                  <p className="font-medium">{campaign.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {campaign.views.toLocaleString()} views • {campaign.clicks.toLocaleString()} clicks
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{campaign.rate}</p>
                  <p className="text-xs text-muted-foreground">Click rate</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Traffic Sources */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Pages with most campaign views</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { page: "/", views: 4230 },
                { page: "/products", views: 3120 },
                { page: "/checkout", views: 2450 },
                { page: "/about", views: 1820 },
              ].map((page) => (
                <div key={page.page} className="flex items-center justify-between">
                  <p className="text-sm font-mono">{page.page}</p>
                  <p className="text-sm font-medium">{page.views.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>Views by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { device: "Desktop", views: 6850, percentage: 55 },
                { device: "Mobile", views: 4320, percentage: 35 },
                { device: "Tablet", views: 1250, percentage: 10 },
              ].map((device) => (
                <div key={device.device} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{device.device}</span>
                    <span className="text-muted-foreground">{device.views.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${device.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
