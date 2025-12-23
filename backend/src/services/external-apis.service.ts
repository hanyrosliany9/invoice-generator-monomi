import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { DateTime } from 'luxon';

let tzLookup: any;
try {
  tzLookup = require('@photostructure/tz-lookup');
} catch (e) {
  // Fallback if tz-lookup is not available
  tzLookup = () => 'UTC';
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface WeatherForecast {
  tempHigh: number;
  tempLow: number;
  condition: string;
}

export interface SunTimes {
  sunrise: string;
  sunset: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: number;
}

@Injectable()
export class ExternalApisService {
  private readonly logger = new Logger(ExternalApisService.name);
  private readonly httpClient: AxiosInstance;
  private readonly API_TIMEOUT = 10000; // 10 seconds
  private readonly WEATHER_CODE_MAP: Record<number, string> = {
    0: 'Clear Sky',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing Rime Fog',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    71: 'Slight Snowfall',
    73: 'Moderate Snowfall',
    75: 'Heavy Snowfall',
    80: 'Slight Rain Showers',
    81: 'Moderate Rain Showers',
    82: 'Violent Rain Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Slight Hail',
    99: 'Thunderstorm with Heavy Hail',
  };

  // Simple in-memory caches
  private geocodeCache = new Map<string, { data: GeocodingResult; timestamp: number }>();
  private weatherCache = new Map<string, { data: WeatherForecast; timestamp: number }>();
  private readonly GEOCODE_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly WEATHER_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

  // Rate limiting for Nominatim (1 request per second)
  private geocodingQueue: Array<() => Promise<any>> = [];
  private isProcessingGeocodeQueue = false;
  private lastGeocodeRequestTime = 0;

  constructor() {
    this.httpClient = axios.create({
      timeout: this.API_TIMEOUT,
      headers: {
        'User-Agent': 'invoice-generator-app/1.0 (Call Sheet Auto-Fill)',
      },
    });
  }

  /**
   * Geocode an address to get latitude and longitude
   * Uses Nominatim (OpenStreetMap) API with rate limiting
   */
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!address || address.trim().length === 0) {
      throw new Error('Address cannot be empty');
    }

    // Check cache first
    const cached = this.geocodeCache.get(address);
    if (cached && Date.now() - cached.timestamp < this.GEOCODE_CACHE_TTL) {
      this.logger.debug(`Geocoding cache hit for: ${address}`);
      return cached.data;
    }

    try {
      // Queue the geocoding request with rate limiting
      const result = await this.geocodeWithThrottle(address);
      if (result) {
        this.geocodeCache.set(address, { data: result, timestamp: Date.now() });
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Geocoding failed for address "${address}":`, errorMsg);
      return null;
    }
  }

  /**
   * Get weather forecast for a specific date and location
   * Uses Open-Meteo API
   */
  async getWeatherForecast(lat: number, lng: number, date: Date): Promise<WeatherForecast | null> {
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${dateStr}`;

    // Check cache first
    const cached = this.weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.WEATHER_CACHE_TTL) {
      this.logger.debug(`Weather cache hit for: ${cacheKey}`);
      return cached.data;
    }

    try {
      // Get timezone for the location (for accurate forecast)
      const timezone = this.getTimezoneFromCoords(lat, lng);

      const response = await this.httpClient.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: lat,
          longitude: lng,
          start_date: dateStr,
          end_date: dateStr,
          daily: 'temperature_2m_max,temperature_2m_min,weathercode',
          temperature_unit: 'fahrenheit',
          timezone: timezone,
        },
      });

      const dailyData = response.data.daily;
      if (!dailyData || !dailyData.time || dailyData.time.length === 0) {
        this.logger.warn(`No weather data available for ${dateStr}`);
        return null;
      }

      const tempHigh = Math.round(dailyData.temperature_2m_max[0]);
      const tempLow = Math.round(dailyData.temperature_2m_min[0]);
      const weatherCode = dailyData.weathercode[0];
      const condition = this.WEATHER_CODE_MAP[weatherCode] || 'Unknown';

      const result: WeatherForecast = { tempHigh, tempLow, condition };
      this.weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Weather forecast failed for ${lat},${lng} on ${dateStr}:`, errorMsg);
      return null;
    }
  }

  /**
   * Get sunrise and sunset times for a specific date and location
   * Uses Sunrise-Sunset.org API
   */
  async getSunTimes(lat: number, lng: number, date: Date): Promise<SunTimes | null> {
    try {
      const dateStr = date.toISOString().split('T')[0];

      const response = await this.httpClient.get('https://api.sunrise-sunset.org/json', {
        params: {
          lat: lat,
          lng: lng,
          date: dateStr,
          formatted: 0, // Return ISO 8601 format
        },
      });

      if (response.data.status !== 'OK') {
        this.logger.warn(`Sunrise-Sunset API returned status: ${response.data.status}`);
        return null;
      }

      const results = response.data.results;
      const timezone = this.getTimezoneFromCoords(lat, lng);

      const sunrise = this.convertUtcToLocal(results.sunrise, timezone);
      const sunset = this.convertUtcToLocal(results.sunset, timezone);

      return { sunrise, sunset };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Sun times lookup failed for ${lat},${lng}:`, errorMsg);
      return null;
    }
  }

  /**
   * Find nearest hospitals for a location
   * Uses Overpass API (OpenStreetMap)
   */
  async findNearestHospitals(lat: number, lng: number, limit: number = 3): Promise<Hospital[]> {
    try {
      const hospitals: Hospital[] = [];
      const radiusKmValues = [5, 10, 20]; // Progressive radius expansion

      for (const radiusKm of radiusKmValues) {
        const radiusM = radiusKm * 1000;
        try {
          const results = await this.queryOverpassApi(lat, lng, radiusM);
          hospitals.push(...results);

          if (hospitals.length >= limit) {
            break;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Overpass query failed at ${radiusKm}km radius:`, errorMsg);
          continue;
        }
      }

      // Sort by distance and return top `limit` results
      return hospitals.sort((a, b) => a.distance - b.distance).slice(0, limit);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Hospital search failed for ${lat},${lng}:`, errorMsg);
      return [];
    }
  }

  /**
   * Generate a Google Maps URL for an address
   */
  generateMapUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  // ============ PRIVATE HELPER METHODS ============

  /**
   * Queue geocoding requests with 1-second rate limiting for Nominatim
   */
  private async geocodeWithThrottle(address: string): Promise<GeocodingResult | null> {
    return new Promise((resolve, reject) => {
      this.geocodingQueue.push(async () => {
        try {
          const result = await this.performGeocode(address);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processGeocodeQueue();
    });
  }

  /**
   * Process geocoding queue with rate limiting
   */
  private async processGeocodeQueue(): Promise<void> {
    if (this.isProcessingGeocodeQueue || this.geocodingQueue.length === 0) {
      return;
    }

    this.isProcessingGeocodeQueue = true;

    const task = this.geocodingQueue.shift();
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastGeocodeRequestTime;
    const delayNeeded = Math.max(0, 1000 - timeSinceLastRequest);

    if (delayNeeded > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayNeeded));
    }

    this.lastGeocodeRequestTime = Date.now();

    try {
      if (task) {
        await task();
      }
    } finally {
      this.isProcessingGeocodeQueue = false;
      // Process next item in queue
      this.processGeocodeQueue();
    }
  }

  /**
   * Perform the actual Nominatim geocoding request
   */
  private async performGeocode(address: string): Promise<GeocodingResult | null> {
    try {
      const response = await this.httpClient.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1,
        },
      });

      if (!response.data || response.data.length === 0) {
        this.logger.warn(`No geocoding results for: ${address}`);
        return null;
      }

      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        formattedAddress: result.display_name,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Nominatim geocoding failed:`, errorMsg);
      throw error;
    }
  }

  /**
   * Query Overpass API for hospitals
   */
  private async queryOverpassApi(lat: number, lng: number, radiusM: number): Promise<Hospital[]> {
    const query = `
      [out:json];
      (
        node["amenity"="hospital"](around:${radiusM},${lat},${lng});
        way["amenity"="hospital"](around:${radiusM},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      const response = await this.httpClient.post('https://overpass-api.de/api/interpreter', query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 15000, // Overpass can be slow
      });

      const hospitals: Hospital[] = [];
      const nodeMap = new Map<number, any>();

      // First pass: collect all nodes
      for (const element of response.data.elements) {
        if (element.type === 'node') {
          nodeMap.set(element.id, element);
        }
      }

      // Second pass: extract hospitals (nodes and ways)
      for (const element of response.data.elements) {
        if (element.type === 'node' && element.tags?.amenity === 'hospital') {
          const hospital = this.parseHospitalNode(element, lat, lng);
          if (hospital) hospitals.push(hospital);
        } else if (element.type === 'way' && element.tags?.amenity === 'hospital') {
          // For ways, try to get centroid from first node
          if (element.nodes && element.nodes.length > 0) {
            const firstNode = nodeMap.get(element.nodes[0]);
            if (firstNode) {
              const hospital = this.parseHospitalWay(element, firstNode, lat, lng);
              if (hospital) hospitals.push(hospital);
            }
          }
        }
      }

      return hospitals;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Overpass API query failed:`, errorMsg);
      throw error;
    }
  }

  /**
   * Parse a hospital node from Overpass response
   */
  private parseHospitalNode(element: any, refLat: number, refLng: number): Hospital | null {
    const tags = element.tags || {};
    if (!tags.name) return null;

    const address = this.formatAddress(tags);
    const distance = this.calculateDistance(refLat, refLng, element.lat, element.lon);

    return {
      id: `node-${element.id}`,
      name: tags.name,
      address: address,
      phone: tags.phone || 'Not available',
      distance: distance,
    };
  }

  /**
   * Parse a hospital way from Overpass response
   */
  private parseHospitalWay(element: any, firstNode: any, refLat: number, refLng: number): Hospital | null {
    const tags = element.tags || {};
    if (!tags.name) return null;

    const address = this.formatAddress(tags);
    const distance = this.calculateDistance(refLat, refLng, firstNode.lat, firstNode.lon);

    return {
      id: `way-${element.id}`,
      name: tags.name,
      address: address,
      phone: tags.phone || 'Not available',
      distance: distance,
    };
  }

  /**
   * Format hospital address from OSM tags
   */
  private formatAddress(tags: any): string {
    const parts: string[] = [];

    if (tags['addr:housenumber'] && tags['addr:street']) {
      parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
    } else if (tags['addr:street']) {
      parts.push(tags['addr:street']);
    }

    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:state']) parts.push(tags['addr:state']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);

    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert UTC time to local timezone
   */
  private convertUtcToLocal(utcTimeStr: string, timezone: string): string {
    try {
      const local = DateTime.fromISO(utcTimeStr, { zone: 'UTC' })
        .setZone(timezone)
        .toFormat('h:mm a');
      return local;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to convert time ${utcTimeStr} to timezone ${timezone}:`, errorMsg);
      return 'N/A';
    }
  }

  /**
   * Get timezone string from coordinates
   */
  private getTimezoneFromCoords(lat: number, lng: number): string {
    try {
      const tz = tzLookup(lat, lng);
      return tz || 'UTC';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Timezone lookup failed for ${lat},${lng}:`, errorMsg);
      return 'UTC';
    }
  }

  /**
   * Search addresses using Nominatim API
   */
  async searchAddresses(query: string): Promise<Array<{ value: string; label: string }>> {
    try {
      const response = await this.httpClient.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 5,
          addressdetails: 1,
        },
      });

      return response.data.map((item: any) => ({
        value: item.display_name,
        label: item.display_name,
      }));
    } catch (error) {
      this.logger.error(`Address search failed for "${query}":`, error);
      return [];
    }
  }
}
