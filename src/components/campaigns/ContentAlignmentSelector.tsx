import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from "lucide-react";

export type ContentAlignment = 'top' | 'center' | 'bottom';

interface ContentAlignmentSelectorProps {
  value: ContentAlignment;
  onChange: (value: ContentAlignment) => void;
  className?: string;
}

const ALIGNMENT_OPTIONS: { value: ContentAlignment; label: string; icon: React.ReactNode }[] = [
  { 
    value: 'top', 
    label: 'Top',
    icon: <AlignVerticalJustifyStart className="h-5 w-5" />
  },
  { 
    value: 'center', 
    label: 'Center',
    icon: <AlignVerticalJustifyCenter className="h-5 w-5" />
  },
  { 
    value: 'bottom', 
    label: 'Bottom',
    icon: <AlignVerticalJustifyEnd className="h-5 w-5" />
  },
];

export function ContentAlignmentSelector({ value, onChange, className }: ContentAlignmentSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>Content Alignment</Label>
      <div className="flex gap-2">
        {ALIGNMENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
              value === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            {option.icon}
            <span className="text-xs font-medium">{option.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Align content vertically inside the notification card
      </p>
    </div>
  );
}
