import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  progress: number;
}

export function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  return (
    <div className="px-6 py-3">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-muted-foreground">Setup Progress</span>
        <span className="font-medium">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
