import { useRef, useEffect, useState, useCallback } from 'react';
import { Input, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader';
import { useTheme } from '../../theme';

interface AddressAutocompleteProps {
  value?: string;
  onChange?: (address: string, coords?: { lat: number; lng: number }) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

interface Suggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteSessionToken: new () => any;
          AutocompleteService: new () => any;
          PlacesService: new (attrContainer: HTMLElement) => any;
        };
        Geocoder: new () => any;
      };
    };
  }
}

export function AddressAutocomplete({
  value = '',
  onChange,
  onBlur,
  placeholder = 'Ketik alamat... (contoh: Jakarta, Bandung)',
  disabled = false,
}: AddressAutocompleteProps) {
  const { theme } = useTheme();
  const { loaded, error } = useGoogleMapsLoader();
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<any>(null);

  // Initialize session token when loaded
  useEffect(() => {
    if (loaded && window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, [loaded]);

  // Sync external value
  useEffect(() => {
    if (value && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);

        // Use the AutocompleteService API from Google Maps
        const autocompleteService = new window.google!.maps!.places!.AutocompleteService();

        const request = {
          input: query,
          componentRestrictions: { country: 'id' }, // Indonesia only
          sessionToken: sessionTokenRef.current,
        };

        autocompleteService.getPlacePredictions(request, (predictions: any, status: any) => {
          setIsSearching(false);

          if (status !== 'OK' || !predictions) {
            console.log('AutocompleteService status:', status);
            setSuggestions([]);
            return;
          }

          const formattedSuggestions: Suggestion[] = predictions.map(
            (prediction: any) => ({
              place_id: prediction.place_id || '',
              description: prediction.description || '',
              main_text: prediction.structured_formatting?.main_text || prediction.description || '',
              secondary_text: prediction.structured_formatting?.secondary_text || '',
            })
          );

          setSuggestions(formattedSuggestions);
        });
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setSuggestions([]);
        setIsSearching(false);
      }
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowDropdown(true);

    // Debounce the search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (loaded) {
        fetchSuggestions(newValue);
      }
    }, 300);
  };

  const handleSelect = async (suggestion: Suggestion) => {
    setInputValue(suggestion.description);
    setSuggestions([]);
    setShowDropdown(false);

    try {
      // Use PlacesService to get place details including coordinates
      const placesService = new window.google!.maps!.places!.PlacesService(
        document.createElement('div') // Attribution container (required but not displayed)
      );

      placesService.getDetails(
        {
          placeId: suggestion.place_id,
          fields: ['geometry', 'formatted_address'],
          sessionToken: sessionTokenRef.current,
        },
        (place: any, status: any) => {
          if (status === 'OK' && place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            onChange?.(suggestion.description, { lat, lng });
          } else {
            // Fallback: pass address without coordinates
            console.warn('Could not get place details, using address only');
            onChange?.(suggestion.description);
          }

          // Consume the session token and generate a new one
          sessionTokenRef.current = new window.google!.maps!.places!.AutocompleteSessionToken();
        }
      );
    } catch (err) {
      console.error('Error selecting place:', err);
      onChange?.(suggestion.description);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setShowDropdown(false);
      onBlur?.();
    }, 200);
  };

  if (error || !loaded) {
    // Fallback to simple input if Google Maps fails to load
    return (
      <Input
        value={inputValue}
        onChange={(e) => {
          const newValue = e.target.value;
          setInputValue(newValue);
          onChange?.(newValue);
        }}
        onBlur={onBlur}
        placeholder={placeholder}
        prefix={<EnvironmentOutlined style={{ color: theme.colors.text.tertiary }} />}
        suffix={!loaded ? <Spin size="small" /> : null}
        disabled={disabled || !loaded}
      />
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled || !loaded}
        prefix={<EnvironmentOutlined style={{ color: theme.colors.text.tertiary }} />}
        suffix={isSearching ? <Spin size="small" /> : null}
      />

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: theme.colors.background.primary,
            border: `1px solid ${theme.colors.border.default}`,
            borderRadius: 4,
            marginTop: 4,
            maxHeight: 250,
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.place_id}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(suggestion);
              }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderBottom: `1px solid ${theme.colors.border.light}`,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.colors.background.tertiary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ fontWeight: 500, color: theme.colors.text.primary }}>
                {suggestion.main_text}
              </div>
              <div style={{ fontSize: 12, color: theme.colors.text.secondary }}>
                {suggestion.secondary_text}
              </div>
            </div>
          ))}
          {/* Google Attribution (required) */}
          <div
            style={{
              padding: '6px 12px',
              fontSize: 11,
              color: theme.colors.text.tertiary,
              textAlign: 'right',
              borderTop: `1px solid ${theme.colors.border.light}`,
            }}
          >
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
