import React, { useState } from 'react';
import { App, Spin } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DrawingCanvas, DrawingData } from './DrawingCanvas';
import { mediaCollabService, CreateFrameDrawingDto } from '../../services/media-collab';
import { getErrorMessage } from '../../utils/errorHandlers';
import { useAuthStore } from '../../store/auth';

interface DrawingCanvasContainerProps {
  assetId: string;
  frameId?: string;
  imageUrl: string;
  width?: number;
  height?: number;
  timecode?: number;
  onClose?: () => void;
  readOnly?: boolean;
}

/**
 * DrawingCanvasContainer
 *
 * Wrapper around DrawingCanvas that handles API integration:
 * - Fetches existing drawings from backend
 * - Saves new drawings to backend
 * - Handles loading states and errors
 * - Manages frame creation if needed
 */
export const DrawingCanvasContainer: React.FC<DrawingCanvasContainerProps> = ({
  assetId,
  frameId: initialFrameId,
  imageUrl,
  width,
  height,
  timecode = 0,
  onClose,
  readOnly = false,
}) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [frameId, setFrameId] = useState(initialFrameId);

  // Fetch existing drawings for this asset
  const { data: drawings = [], isLoading: drawingsLoading } = useQuery({
    queryKey: ['frame-drawings', assetId, timecode],
    queryFn: () => mediaCollabService.getDrawingsAtTimecode(assetId, timecode),
    enabled: !!assetId && readOnly, // Only fetch in read-only mode (for display)
  });

  // Fetch drawings for specific frame (if frameId provided)
  const { data: frameDrawings = [], isLoading: frameDrawingsLoading } = useQuery({
    queryKey: ['frame-drawings-by-frame', frameId],
    queryFn: () => mediaCollabService.getDrawingsByAsset(assetId),
    enabled: !!frameId && !readOnly,
  });

  // Create drawing mutation
  const createDrawingMutation = useMutation({
    mutationFn: async (drawingData: any) => {
      // First, we need to ensure we have a frame
      // If frameId doesn't exist, the backend will create it
      const dto: CreateFrameDrawingDto = {
        assetId,
        timestamp: timecode,
        drawingType: 'FREEHAND', // Default, can be enhanced to detect type
        coordinates: drawingData,
        color: '#ff0000', // Default color
        strokeWidth: 3,
      };

      return mediaCollabService.createDrawing(dto);
    },
    onSuccess: (data) => {
      message.success('Drawing saved successfully');

      // Update frameId if it was just created
      if (data.frameId && !frameId) {
        setFrameId(data.frameId);
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['frame-drawings', assetId] });
      queryClient.invalidateQueries({ queryKey: ['frames', assetId] });

      if (onClose) {
        onClose();
      }
    },
    onError: (error: unknown) => {
      message.error(getErrorMessage(error, 'Failed to save drawing'));
    },
  });

  const handleSave = async (drawingData: any) => {
    if (!user) {
      message.error('You must be logged in to save drawings');
      return;
    }

    await createDrawingMutation.mutateAsync(drawingData);
  };

  // Combine existing drawings from both queries
  const existingDrawings = readOnly ? drawings : frameDrawings;

  // Transform MediaFrameDrawing to DrawingData format
  const transformedDrawings: DrawingData[] = existingDrawings.map((drawing) => ({
    type: drawing.drawingType.toLowerCase() as 'arrow' | 'rectangle' | 'circle' | 'freehand' | 'text',
    x: 0, // Will be extracted from coordinates
    y: 0, // Will be extracted from coordinates
    color: drawing.color || '#ff0000',
    strokeWidth: drawing.strokeWidth || 3,
    text: drawing.text,
    drawingData: drawing.coordinates,
  }));

  if (drawingsLoading || frameDrawingsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Loading drawings..." />
      </div>
    );
  }

  return (
    <DrawingCanvas
      assetId={assetId}
      frameId={frameId}
      imageUrl={imageUrl}
      width={width}
      height={height}
      timecode={timecode}
      onSave={readOnly ? undefined : handleSave}
      onClose={onClose}
      existingDrawings={transformedDrawings}
      readOnly={readOnly}
    />
  );
};
