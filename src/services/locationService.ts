interface IPLocationData {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  org?: string;
}

interface LocationData {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  org?: string;
}

export class LocationService {
  private static readonly IP_API_ENDPOINT = 'https://ipapi.co/json/';
  private static readonly FALLBACK_API_ENDPOINT = 'https://ip-api.com/json/';
  
  /**
   * Detect user's location based on IP address
   */
  static async detectIPLocation(): Promise<LocationData | null> {
    try {
      // Try primary API first (ipapi.co)
      const response = await fetch(this.IP_API_ENDPOINT, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data: IPLocationData = await response.json();
        
        // Validate required fields
        if (data.country_name && data.city) {
          return {
            ip: data.ip,
            city: data.city,
            region: data.region,
            country: data.country_name,
            country_code: data.country_code?.toUpperCase(),
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone,
            org: data.org,
          };
        }
      }
      
      // Fallback to secondary API if primary fails
      return await this.detectIPLocationFallback();
      
    } catch (error) {
      console.warn('Primary IP detection failed, trying fallback:', error);
      return await this.detectIPLocationFallback();
    }
  }

  /**
   * Fallback IP detection using alternative service
   */
  private static async detectIPLocationFallback(): Promise<LocationData | null> {
    try {
      const response = await fetch(this.FALLBACK_API_ENDPOINT);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'success' && data.country && data.city) {
          return {
            ip: data.query,
            city: data.city,
            region: data.regionName,
            country: data.country,
            country_code: data.countryCode?.toUpperCase(),
            latitude: data.lat,
            longitude: data.lon,
            timezone: data.timezone,
            org: data.org,
          };
        }
      }
    } catch (error) {
      console.warn('Fallback IP detection also failed:', error);
    }
    
    return null;
  }

  /**
   * Format location data for display
   */
  static formatLocation(locationData: LocationData): string {
    if (!locationData.city && !locationData.country) {
      return 'Unknown Location';
    }

    const parts: string[] = [];
    
    if (locationData.city) {
      parts.push(locationData.city);
    }
    
    if (locationData.region && locationData.region !== locationData.city) {
      parts.push(locationData.region);
    }
    
    if (locationData.country) {
      parts.push(locationData.country);
    }

    return parts.join(', ');
  }

  /**
   * Get country flag emoji from country code
   */
  static getCountryFlag(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) {
      return '🌍';
    }

    const flagMap: Record<string, string> = {
      'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺', 'DE': '🇩🇪',
      'FR': '🇫🇷', 'JP': '🇯🇵', 'IN': '🇮🇳', 'BR': '🇧🇷', 'MX': '🇲🇽',
      'SG': '🇸🇬', 'AE': '🇦🇪', 'NL': '🇳🇱', 'CH': '🇨🇭', 'SE': '🇸🇪',
      'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'IT': '🇮🇹', 'ES': '🇪🇸',
    };

    return flagMap[countryCode.toUpperCase()] || '🌍';
  }

  /**
   * Validate if a location string appears to be valid
   */
  static validateLocation(location: string): boolean {
    if (!location || location.trim().length < 2) {
      return false;
    }

    // Basic validation: should contain at least one letter and be reasonable length
    const hasLetter = /[a-zA-Z]/.test(location);
    const reasonableLength = location.trim().length >= 2 && location.trim().length <= 100;
    
    return hasLetter && reasonableLength;
  }

  /**
   * Generate location suggestions based on input
   */
  static generateLocationSuggestions(input: string): string[] {
    if (!input || input.length < 2) {
      return [];
    }

    const commonLocations = [
      'New York, NY, USA', 'Los Angeles, CA, USA', 'Chicago, IL, USA',
      'London, UK', 'Paris, France', 'Berlin, Germany', 'Tokyo, Japan',
      'Sydney, Australia', 'Toronto, Canada', 'Mumbai, India',
      'São Paulo, Brazil', 'Mexico City, Mexico', 'Singapore',
      'Dubai, UAE', 'Amsterdam, Netherlands', 'Zurich, Switzerland'
    ];

    const inputLower = input.toLowerCase();
    
    return commonLocations
      .filter(location => location.toLowerCase().includes(inputLower))
      .slice(0, 5);
  }

  /**
   * Extract structured location data from a location string
   */
  static parseLocation(locationString: string): Partial<LocationData> {
    if (!locationString) {
      return {};
    }

    const parts = locationString.split(',').map(part => part.trim());
    
    if (parts.length === 1) {
      return { city: parts[0] };
    }
    
    if (parts.length === 2) {
      return { 
        city: parts[0], 
        country: parts[1] 
      };
    }
    
    if (parts.length === 3) {
      return { 
        city: parts[0], 
        region: parts[1], 
        country: parts[2] 
      };
    }

    return { city: parts[0], country: parts[parts.length - 1] };
  }

  /**
   * Get timezone for a location (basic implementation)
   */
  static getTimezoneForLocation(locationData: LocationData): string {
    return locationData.timezone || 'UTC';
  }

  /**
   * Check if location detection is supported in current environment
   */
  static isLocationDetectionSupported(): boolean {
    return typeof window !== 'undefined' && 'fetch' in window;
  }

  /**
   * Get anonymous location (for privacy-focused scenarios)
   */
  static getAnonymousLocation(locationData: LocationData): string {
    if (!locationData.country) {
      return 'Unknown';
    }

    // Return only country for privacy
    return locationData.country;
  }
}