import { useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { message } from 'antd';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';

export const useAutosave = (
  deckId: string,
  slideId: string,
  enabled: boolean = true
) => {
  const { canvas } = useDeckCanvasStore();
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (canvasData: string) => {
      // TODO: Implement actual save to backend
      // await slidesApi.update(slideId, { canvasData });
      return { success: true };
    },
    onSuccess: () => {
      isSavingRef.current = false;
    },
    onError: (error) => {
      console.error('Autosave failed:', error);
      message.error('Failed to save changes');
      isSavingRef.current = false;
    },
  });

  // Debounced save function
  const triggerSave = useCallback(() => {
    if (!enabled || !canvas || isSavingRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      const canvasData = JSON.stringify(canvas.toJSON());

      // Only save if content changed
      if (canvasData !== lastSavedRef.current) {
        isSavingRef.current = true;
        lastSavedRef.current = canvasData;
        saveMutation.mutate(canvasData);
      }
    }, 2000);
  }, [canvas, enabled, saveMutation]);

  // Watch for canvas changes
  useEffect(() => {
    if (!enabled || !canvas) return;

    const handleChange = () => {
      triggerSave();
    };

    canvas.on('object:modified', handleChange);
    canvas.on('object:added', handleChange);
    canvas.on('object:removed', handleChange);

    return () => {
      canvas.off('object:modified', handleChange);
      canvas.off('object:added', handleChange);
      canvas.off('object:removed', handleChange);
    };
  }, [canvas, enabled, triggerSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const hasUnsavedChanges = canvas ? JSON.stringify(canvas.toJSON()) !== lastSavedRef.current : false;
  const isSaving = saveMutation.isPending;

  return {
    hasUnsavedChanges,
    isSaving,
    saveNow: () => {
      if (!canvas) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const canvasData = JSON.stringify(canvas.toJSON());
      lastSavedRef.current = canvasData;
      saveMutation.mutate(canvasData);
    },
  };
};

export default useAutosave;
