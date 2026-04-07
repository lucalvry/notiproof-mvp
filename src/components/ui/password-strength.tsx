import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Criterion {
  label: string;
  met: boolean;
}

export interface PasswordStrengthResult {
  score: number; // 0-5
  label: string;
  criteria: Criterion[];
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const criteria: Criterion[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "At least 12 characters", met: password.length >= 12 },
    { label: "Uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter (a-z)", met: /[a-z]/.test(password) },
    { label: "Number (0-9)", met: /[0-9]/.test(password) },
    { label: "Special character (!@#$...)", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = criteria.filter((c) => c.met).length;

  const labels: Record<number, string> = {
    0: "Very Weak",
    1: "Very Weak",
    2: "Weak",
    3: "Fair",
    4: "Strong",
    5: "Very Strong",
  };

  return { score, label: labels[Math.min(score, 5)] ?? "Very Strong", criteria };
}

const strengthColors: Record<number, string> = {
  0: "bg-destructive",
  1: "bg-destructive",
  2: "bg-[hsl(var(--warning))]",
  3: "bg-[hsl(38,92%,50%)]",
  4: "bg-[hsl(var(--success))]",
  5: "bg-emerald-500",
};

const strengthTextColors: Record<number, string> = {
  0: "text-destructive",
  1: "text-destructive",
  2: "text-[hsl(var(--warning))]",
  3: "text-[hsl(38,92%,50%)]",
  4: "text-[hsl(var(--success))]",
  5: "text-emerald-500",
};

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const { score, label, criteria } = useMemo(
    () => evaluatePasswordStrength(password),
    [password],
  );

  if (!password) return null;

  const segments = 5;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                i < score ? strengthColors[score] : "bg-muted",
              )}
            />
          ))}
        </div>
        <span className={cn("text-xs font-medium", strengthTextColors[score])}>
          {label}
        </span>
      </div>

      {/* Criteria checklist */}
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {criteria.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5 text-xs">
            {c.met ? (
              <Check className="h-3 w-3 text-[hsl(var(--success))] shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            <span className={c.met ? "text-foreground" : "text-muted-foreground"}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
