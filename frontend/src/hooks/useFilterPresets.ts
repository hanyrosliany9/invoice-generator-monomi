import { useState, useEffect } from 'react';

interface FilterPreset {
  id: string;
  name: string;
  filters: {
    status?: string;
    platform?: string;
    clientId?: string;
    projectId?: string;
  };
}

/**
 * Hook for managing filter presets with localStorage persistence
 * @param userId - User ID for scoping presets
 * @returns Filter preset management functions
 */
export function useFilterPresets(userId: string) {
  const storageKey = `content-calendar-presets-${userId}`;

  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load filter presets:', error);
      return [];
    }
  });

  /**
   * Save a new filter preset
   * @param name - Preset name
   * @param filters - Filter configuration
   */
  const savePreset = (name: string, filters: FilterPreset['filters']) => {
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name,
      filters,
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save filter preset:', error);
    }
  };

  /**
   * Delete a filter preset
   * @param id - Preset ID to delete
   */
  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to delete filter preset:', error);
    }
  };

  /**
   * Apply a saved preset and return its filters
   * @param id - Preset ID to apply
   * @returns Filter configuration or undefined
   */
  const applyPreset = (id: string): FilterPreset['filters'] | undefined => {
    return presets.find((p) => p.id === id)?.filters;
  };

  /**
   * Update an existing preset
   * @param id - Preset ID to update
   * @param name - New preset name
   * @param filters - New filter configuration
   */
  const updatePreset = (
    id: string,
    name: string,
    filters: FilterPreset['filters']
  ) => {
    const updated = presets.map((p) =>
      p.id === id ? { ...p, name, filters } : p
    );
    setPresets(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update filter preset:', error);
    }
  };

  /**
   * Clear all presets
   */
  const clearAllPresets = () => {
    setPresets([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear filter presets:', error);
    }
  };

  return {
    presets,
    savePreset,
    deletePreset,
    applyPreset,
    updatePreset,
    clearAllPresets,
  };
}
