import { useCallback } from 'react';
import { Canvas } from 'fabric';
import { SlideTemplateType } from '../templates/templateTypes';
import { getTemplate } from '../templates/templateDefinitions';
import { renderTemplateToCanvas, replacePlaceholder } from '../templates/templateRenderer';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';
import { useAssetBrowserStore, MediaAsset } from '../stores/assetBrowserStore';

export const useSlideTemplates = () => {
  const { canvas, pushHistory } = useDeckCanvasStore();
  const { openModal, setOnAssetSelect } = useAssetBrowserStore();

  const applyTemplate = useCallback((templateType: SlideTemplateType) => {
    if (!canvas) return;

    const template = getTemplate(templateType);
    renderTemplateToCanvas(canvas, template);
    pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
  }, [canvas, pushHistory]);

  const fillPlaceholder = useCallback((placeholderId: string, imageUrl: string) => {
    if (!canvas) return;

    replacePlaceholder(canvas, placeholderId, imageUrl)
      .then(() => pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType']))))
      .catch(console.error);
  }, [canvas, pushHistory]);

  const openPlaceholderBrowser = useCallback((placeholderId: string) => {
    const handleAssetSelected = (asset: MediaAsset) => {
      fillPlaceholder(placeholderId, asset.url);
    };

    setOnAssetSelect(handleAssetSelected);
    openModal();
  }, [fillPlaceholder, setOnAssetSelect, openModal]);

  return {
    applyTemplate,
    fillPlaceholder,
    openPlaceholderBrowser,
  };
};

export default useSlideTemplates;
