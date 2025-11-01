import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HourData {
  hour: number;
  views: number;
  intensity: number; // 0-100
}

interface HourHeatmapProps {
  hourlyData: HourData[];
  isLoading?: boolean;
}

export function HourHeatmap({ hourlyData, isLoading = false }: HourHeatmapProps) {
  const getIntensityColor = (intensity: number) => {
    if (intensity >= 75) return 'bg-primary';
    if (intensity >= 50) return 'bg-chart-2';
    if (intensity >= 25) return 'bg-chart-3';
    return 'bg-muted';
  };

  const peakHour = hourlyData.reduce((max, curr) => 
    curr.views > max.views ? curr : max, 
    hourlyData[0] || { hour: 0, views: 0, intensity: 0 }
  );

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity by Hour</CardTitle>
        <CardDescription>
          {peakHour.views > 0 
            ? `Peak activity at ${formatHour(peakHour.hour)} with ${peakHour.views.toLocaleString()} views`
            : 'No hourly data available'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : hourlyData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-muted-foreground">No hourly data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-2">
              {hourlyData.map((data) => (
                <div
                  key={data.hour}
                  className="flex flex-col items-center gap-1"
                  title={`${formatHour(data.hour)}: ${data.views.toLocaleString()} views`}
                >
                  <div 
                    className={`w-full h-16 rounded ${getIntensityColor(data.intensity)} transition-all hover:scale-105`}
                  />
                  <span className="text-xs text-muted-foreground">{data.hour}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-muted" />
                <span>Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-chart-3" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-chart-2" />
                <span>High</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary" />
                <span>Peak</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
