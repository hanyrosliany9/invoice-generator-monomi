import { useEffect, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let isLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Loads the Google Maps "places" library once for the whole app.
 * Requires VITE_GOOGLE_MAPS_API_KEY. If the key is missing or loading
 * fails, `error` is set and callers should fall back gracefully.
 */
export function useGoogleMapsLoader() {
  const [loaded, setLoaded] = useState(isLoaded);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError(new Error('Google Maps API key not configured'));
      return;
    }

    if (isLoaded) {
      setLoaded(true);
      return;
    }

    if (!loadPromise) {
      loadPromise = (async () => {
        try {
          // Set API options first (must be before any library import)
          setOptions({ key: apiKey } as any);
          // Import the places library to make it available globally
          await importLibrary('places');
          isLoaded = true;
        } catch (err) {
          // Log error but don't throw - let component handle gracefully
          console.error('Failed to load Google Maps:', err);
          throw err;
        }
      })();
    }

    loadPromise
      .then(() => setLoaded(true))
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(new Error(errorMessage));
      });
  }, []);

  return { loaded, error };
}
