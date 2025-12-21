import { useEffect, useCallback, useRef } from 'react';
import { useCollaborationStore } from '../stores/collaborationStore';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';

export const useCollaboration = (deckId: string, userId: string) => {
  // Use selectors to get stable references
  const connect = useCollaborationStore((state) => state.connect);
  const disconnect = useCollaborationStore((state) => state.disconnect);
  const broadcastCursor = useCollaborationStore((state) => state.broadcastCursor);
  const broadcastCanvasChange = useCollaborationStore((state) => state.broadcastCanvasChange);
  const currentSlideId = useCollaborationStore((state) => state.currentSlideId);

  const { canvas } = useDeckCanvasStore();
  const lastCursorRef = useRef({ x: 0, y: 0 });
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  const connectedRef = useRef(false);

  // Connect on mount - only runs once
  useEffect(() => {
    if (!deckId || !userId || connectedRef.current) return;

    connectedRef.current = true;
    connect(deckId, userId);

    return () => {
      connectedRef.current = false;
      disconnect();
    };
  }, [deckId, userId]);

  // Broadcast cursor position
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!currentSlideId) return;

    // Throttle cursor updates
    if (throttleRef.current) return;

    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
    }, 50);

    // Get position relative to canvas
    const canvasEl = document.querySelector('.deck-canvas-container');
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Only broadcast if moved significantly
    if (
      Math.abs(x - lastCursorRef.current.x) > 5 ||
      Math.abs(y - lastCursorRef.current.y) > 5
    ) {
      lastCursorRef.current = { x, y };
      broadcastCursor(x, y, currentSlideId);
    }
  }, [currentSlideId, broadcastCursor]);

  // Listen for mouse movement
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Listen for canvas changes
  useEffect(() => {
    if (!canvas || !currentSlideId) return;

    const handleModified = () => {
      const json = canvas.toJSON();
      broadcastCanvasChange(currentSlideId, json);
    };

    canvas.on('object:modified', handleModified);
    canvas.on('object:added', handleModified);
    canvas.on('object:removed', handleModified);

    return () => {
      canvas.off('object:modified', handleModified);
      canvas.off('object:added', handleModified);
      canvas.off('object:removed', handleModified);
    };
  }, [canvas, currentSlideId]);

  // Listen for remote canvas updates
  useEffect(() => {
    const handleRemoteUpdate = (e: CustomEvent) => {
      if (!canvas || e.detail.slideId !== currentSlideId) return;

      canvas.loadFromJSON(e.detail.canvasData, () => {
        canvas.renderAll();
      });
    };

    window.addEventListener(
      'remote-canvas-update',
      handleRemoteUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        'remote-canvas-update',
        handleRemoteUpdate as EventListener
      );
    };
  }, [canvas, currentSlideId]);
};

export default useCollaboration;
