import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_OPTIONS } from "@/types/targeting";

interface GeoTargetingCardProps {
  includeCountries: string[];
  excludeCountries: string[];
  onChange: (includeCountries: string[], excludeCountries: string[]) => void;
}

export function GeoTargetingCard({ includeCountries, excludeCountries, onChange }: GeoTargetingCardProps) {
  const addIncludeCountry = (country: string) => {
    if (!includeCountries.includes(country)) {
      onChange([...includeCountries, country], excludeCountries);
    }
  };

  const removeIncludeCountry = (country: string) => {
    onChange(
      includeCountries.filter((c) => c !== country),
      excludeCountries
    );
  };

  const addExcludeCountry = (country: string) => {
    if (!excludeCountries.includes(country)) {
      onChange(includeCountries, [...excludeCountries, country]);
    }
  };

  const removeExcludeCountry = (country: string) => {
    onChange(
      includeCountries,
      excludeCountries.filter((c) => c !== country)
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle>Geographic Targeting</CardTitle>
        </div>
        <CardDescription>
          Target visitors from specific countries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Include Countries (Show only to these countries)</Label>
          <Select onValueChange={addIncludeCountry}>
            <SelectTrigger>
              <SelectValue placeholder="Select countries to target..." />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_OPTIONS.filter(
                (c) => !includeCountries.includes(c.value)
              ).map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {includeCountries.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {includeCountries.map((code) => {
                const country = COUNTRY_OPTIONS.find((c) => c.value === code);
                return (
                  <Badge key={code} variant="secondary" className="gap-1">
                    {country?.label || code}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeIncludeCountry(code)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          )}
          {includeCountries.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Empty = show to all countries
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Exclude Countries (Never show to these countries)</Label>
          <Select onValueChange={addExcludeCountry}>
            <SelectTrigger>
              <SelectValue placeholder="Select countries to exclude..." />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_OPTIONS.filter(
                (c) => !excludeCountries.includes(c.value)
              ).map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {excludeCountries.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {excludeCountries.map((code) => {
                const country = COUNTRY_OPTIONS.find((c) => c.value === code);
                return (
                  <Badge key={code} variant="destructive" className="gap-1">
                    {country?.label || code}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeExcludeCountry(code)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
