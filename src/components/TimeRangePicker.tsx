import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimeRangePickerProps {
  value: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
  className?: string;
}

const presets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

const TimeRangePicker = ({ value, onChange, className }: TimeRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetClick = (days: number) => {
    const to = endOfDay(new Date());
    const from = startOfDay(subDays(to, days - 1));
    onChange({ from, to });
    setIsOpen(false);
  };

  const formatRange = (range: { from: Date; to: Date }) => {
    return `${format(range.from, 'MMM dd, yyyy')} - ${format(range.to, 'MMM dd, yyyy')}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start text-left font-normal", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets */}
          <div className="border-r p-3">
            <h4 className="font-medium mb-3">Quick ranges</h4>
            <div className="space-y-1">
              {presets.map((preset) => (
                <Button
                  key={preset.days}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handlePresetClick(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom date picker */}
          <div className="p-3">
            <h4 className="font-medium mb-3">Custom range</h4>
            <Calendar
              mode="range"
              selected={{
                from: value.from,
                to: value.to,
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onChange({
                    from: startOfDay(range.from),
                    to: endOfDay(range.to),
                  });
                  setIsOpen(false);
                }
              }}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimeRangePicker;