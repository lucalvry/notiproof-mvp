import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Globe, Target, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  country: string;
  state?: string;
  city?: string;
  flag?: string;
  coordinates?: { lat: number; lng: number };
}

interface EnhancedLocationInputProps {
  value: string;
  onChange: (value: string, locationData?: Location) => void;
  placeholder?: string;
  className?: string;
  enableIPDetection?: boolean;
  showPopularLocations?: boolean;
}

// Popular locations based on major cities worldwide
const POPULAR_LOCATIONS: Location[] = [
  { id: 'us-ny', name: 'New York, NY', country: 'United States', state: 'New York', city: 'New York', flag: '🇺🇸' },
  { id: 'us-ca-la', name: 'Los Angeles, CA', country: 'United States', state: 'California', city: 'Los Angeles', flag: '🇺🇸' },
  { id: 'uk-london', name: 'London, UK', country: 'United Kingdom', city: 'London', flag: '🇬🇧' },
  { id: 'fr-paris', name: 'Paris, France', country: 'France', city: 'Paris', flag: '🇫🇷' },
  { id: 'de-berlin', name: 'Berlin, Germany', country: 'Germany', city: 'Berlin', flag: '🇩🇪' },
  { id: 'jp-tokyo', name: 'Tokyo, Japan', country: 'Japan', city: 'Tokyo', flag: '🇯🇵' },
  { id: 'au-sydney', name: 'Sydney, Australia', country: 'Australia', city: 'Sydney', flag: '🇦🇺' },
  { id: 'ca-toronto', name: 'Toronto, Canada', country: 'Canada', city: 'Toronto', flag: '🇨🇦' },
  { id: 'in-mumbai', name: 'Mumbai, India', country: 'India', city: 'Mumbai', flag: '🇮🇳' },
  { id: 'br-sao-paulo', name: 'São Paulo, Brazil', country: 'Brazil', city: 'São Paulo', flag: '🇧🇷' },
  { id: 'mx-mexico-city', name: 'Mexico City, Mexico', country: 'Mexico', city: 'Mexico City', flag: '🇲🇽' },
  { id: 'sg-singapore', name: 'Singapore', country: 'Singapore', city: 'Singapore', flag: '🇸🇬' },
  { id: 'ae-dubai', name: 'Dubai, UAE', country: 'United Arab Emirates', city: 'Dubai', flag: '🇦🇪' },
  { id: 'nl-amsterdam', name: 'Amsterdam, Netherlands', country: 'Netherlands', city: 'Amsterdam', flag: '🇳🇱' },
  { id: 'ch-zurich', name: 'Zurich, Switzerland', country: 'Switzerland', city: 'Zurich', flag: '🇨🇭' }
];

// Major countries for search
const MAJOR_COUNTRIES: Location[] = [
  { id: 'us', name: 'United States', country: 'United States', flag: '🇺🇸' },
  { id: 'uk', name: 'United Kingdom', country: 'United Kingdom', flag: '🇬🇧' },
  { id: 'ca', name: 'Canada', country: 'Canada', flag: '🇨🇦' },
  { id: 'de', name: 'Germany', country: 'Germany', flag: '🇩🇪' },
  { id: 'fr', name: 'France', country: 'France', flag: '🇫🇷' },
  { id: 'jp', name: 'Japan', country: 'Japan', flag: '🇯🇵' },
  { id: 'au', name: 'Australia', country: 'Australia', flag: '🇦🇺' },
  { id: 'in', name: 'India', country: 'India', flag: '🇮🇳' },
  { id: 'br', name: 'Brazil', country: 'Brazil', flag: '🇧🇷' },
  { id: 'mx', name: 'Mexico', country: 'Mexico', flag: '🇲🇽' },
  { id: 'sg', name: 'Singapore', country: 'Singapore', flag: '🇸🇬' },
  { id: 'ae', name: 'United Arab Emirates', country: 'United Arab Emirates', flag: '🇦🇪' },
  { id: 'nl', name: 'Netherlands', country: 'Netherlands', flag: '🇳🇱' },
  { id: 'ch', name: 'Switzerland', country: 'Switzerland', flag: '🇨🇭' },
  { id: 'se', name: 'Sweden', country: 'Sweden', flag: '🇸🇪' }
];

export const EnhancedLocationInput = ({ 
  value, 
  onChange, 
  placeholder = "Enter location or search...",
  className,
  enableIPDetection = true,
  showPopularLocations = true
}: EnhancedLocationInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetectingIP, setIsDetectingIP] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<Location | null>(null);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-detect IP location on component mount
  useEffect(() => {
    if (enableIPDetection && !value) {
      detectIPLocation();
    }
  }, [enableIPDetection]);

  // Filter suggestions based on search query
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = [
      ...POPULAR_LOCATIONS,
      ...MAJOR_COUNTRIES
    ].filter(location => 
      location.name.toLowerCase().includes(query) ||
      location.country.toLowerCase().includes(query) ||
      location.city?.toLowerCase().includes(query) ||
      location.state?.toLowerCase().includes(query)
    ).slice(0, 10);

    setSuggestions(filtered);
  }, [searchQuery]);

  const detectIPLocation = async () => {
    setIsDetectingIP(true);
    try {
      // Using ipapi.co for IP geolocation (free tier available)
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.country_name && data.city) {
        const detected: Location = {
          id: `detected-${data.country_code}`,
          name: `${data.city}, ${data.country_name}`,
          country: data.country_name,
          city: data.city,
          state: data.region,
          coordinates: { lat: data.latitude, lng: data.longitude }
        };
        setDetectedLocation(detected);
      }
    } catch (error) {
      console.warn('Failed to detect IP location:', error);
    } finally {
      setIsDetectingIP(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    onChange(location.name, location);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCustomInput = (customValue: string) => {
    onChange(customValue);
    setSearchQuery(customValue);
  };

  const handleUseDetectedLocation = () => {
    if (detectedLocation) {
      handleLocationSelect(detectedLocation);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <Label>Customer Location</Label>
        
        {/* IP Detection Banner */}
        {enableIPDetection && detectedLocation && !value && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Detected: {detectedLocation.name}</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleUseDetectedLocation}
              className="ml-auto"
            >
              Use This Location
            </Button>
          </div>
        )}

        {/* Main Input with Autocomplete */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                value={value}
                onChange={(e) => {
                  handleCustomInput(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={isDetectingIP ? "Detecting location..." : placeholder}
                className="pr-10"
                disabled={isDetectingIP}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isDetectingIP ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                ) : (
                  <Search className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search locations..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {searchQuery.length > 0 ? (
                    <div className="p-4 text-center space-y-2">
                      <p className="text-sm text-muted-foreground">No locations found</p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          onChange(searchQuery);
                          setIsOpen(false);
                        }}
                      >
                        Use "{searchQuery}" as custom location
                      </Button>
                    </div>
                  ) : (
                    "Start typing to search locations..."
                  )}
                </CommandEmpty>

                {/* Popular Locations */}
                {showPopularLocations && searchQuery.length < 2 && (
                  <CommandGroup heading="Popular Locations">
                    {POPULAR_LOCATIONS.slice(0, 8).map((location) => (
                      <CommandItem
                        key={location.id}
                        onSelect={() => handleLocationSelect(location)}
                        className="flex items-center gap-2"
                      >
                        <span className="text-lg">{location.flag}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">{location.name}</span>
                          <span className="text-xs text-muted-foreground">{location.country}</span>
                        </div>
                        {value === location.name && <Check className="h-4 w-4 ml-auto" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Search Results */}
                {suggestions.length > 0 && (
                  <CommandGroup heading="Search Results">
                    {suggestions.map((location) => (
                      <CommandItem
                        key={location.id}
                        onSelect={() => handleLocationSelect(location)}
                        className="flex items-center gap-2"
                      >
                        <span className="text-lg">{location.flag}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">{location.name}</span>
                          <span className="text-xs text-muted-foreground">{location.country}</span>
                        </div>
                        {value === location.name && <Check className="h-4 w-4 ml-auto" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Countries */}
                {searchQuery.length >= 2 && (
                  <CommandGroup heading="Countries">
                    {MAJOR_COUNTRIES
                      .filter(country => 
                        country.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .slice(0, 5)
                      .map((country) => (
                        <CommandItem
                          key={country.id}
                          onSelect={() => handleLocationSelect(country)}
                          className="flex items-center gap-2"
                        >
                          <span className="text-lg">{country.flag}</span>
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span>{country.name}</span>
                          </div>
                          {value === country.name && <Check className="h-4 w-4 ml-auto" />}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Quick Select Popular Locations */}
        {showPopularLocations && !value && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Select</Label>
            <div className="flex flex-wrap gap-1">
              {POPULAR_LOCATIONS.slice(0, 6).map((location) => (
                <Badge
                  key={location.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleLocationSelect(location)}
                >
                  {location.flag} {location.name.split(',')[0]}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Current Selection Info */}
        {value && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>Selected: {value}</span>
          </div>
        )}
      </div>
    </div>
  );
};