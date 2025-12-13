import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

export type DateRangeOption = 7 | 14 | 30 | 90 | "custom";

interface DateRangeFilterProps {
  value: number;
  onChange: (days: number) => void;
}

const presetOptions = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null);

  const isPreset = presetOptions.some((opt) => opt.value === value);
  const selectedLabel = isPreset
    ? presetOptions.find((opt) => opt.value === value)?.label
    : customRange
    ? `${format(customRange.from, "MMM d")} - ${format(customRange.to, "MMM d")}`
    : `Last ${value} days`;

  const handlePresetSelect = (days: number) => {
    onChange(days);
    setCustomRange(null);
    setShowCalendar(false);
    setIsOpen(false);
  };

  const handleCustomRangeSelect = (range: { from: Date; to: Date }) => {
    setCustomRange(range);
    const days = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24));
    onChange(days);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{selectedLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        {!showCalendar ? (
          <div className="p-2 space-y-1">
            {presetOptions.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-between",
                  value === option.value && "bg-accent"
                )}
                onClick={() => handlePresetSelect(option.value)}
              >
                {option.label}
                {value === option.value && <Check className="h-4 w-4" />}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setShowCalendar(true)}
            >
              Custom range...
            </Button>
          </div>
        ) : (
          <div className="p-2">
            <Calendar
              mode="range"
              selected={customRange ? { from: customRange.from, to: customRange.to } : undefined}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  handleCustomRangeSelect({ from: range.from, to: range.to });
                }
              }}
              disabled={(date) => date > new Date()}
              numberOfMonths={1}
            />
            <div className="flex justify-between p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCalendar(false)}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
