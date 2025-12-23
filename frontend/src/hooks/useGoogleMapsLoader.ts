import { useEffect, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let isLoaded = false;
let loadPromise: Promise<void> | null = null;

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
          setOptions({ key: apiKey, version: 'weekly' });
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
        // Set error state and continue - AddressAutocomplete will fallback
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(new Error(errorMessage));
      });
  }, []);

  return { loaded, error };
}
