import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Card,
  Button,
  Space,
  Spin,
  App,
  Typography,
  Dropdown,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  LeftOutlined,
  ShareAltOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  FontSizeOutlined,
  PictureOutlined,
  BorderOutlined,
  QuestionCircleOutlined,
  CommentOutlined,
} from '@ant-design/icons';
import { useTheme } from '../theme';
import { decksApi, slidesApi, elementsApi } from '../services/decks';
import '../styles/tiptap.css';
import '../styles/assetBrowser.css';
import SlideCanvas from '../components/deck/SlideCanvas';
import ShapePicker from '../components/deck/ShapePicker';
import TextStylePicker from '../components/deck/TextStylePicker';
import AlignmentTools from '../components/deck/AlignmentTools';
import CanvasContextMenu from '../components/deck/CanvasContextMenu';
import KeyboardShortcutsModal from '../components/deck/KeyboardShortcutsModal';
import LineTool from '../components/deck/LineTool';
import QuickShapeBar from '../components/deck/QuickShapeBar';
import InsertImageButton from '../components/deck/InsertImageButton';
import AssetBrowserModal from '../components/deck/AssetBrowserModal';
import UploadHint from '../components/deck/UploadHint';
import PropertiesPanel from '../components/deck/PropertiesPanel';
import PropertiesPanelToggle from '../components/deck/PropertiesPanelToggle';
import NewSlideButton from '../components/deck/NewSlideButton';
import PresentButton from '../components/deck/PresentButton';
import PresentationView from '../components/deck/presentation/PresentationView';
import SlideContextMenu from '../components/deck/SlideContextMenu';
import ExportButton from '../components/deck/ExportButton';
import { useDeckKeyboardShortcuts } from '../hooks/useDeckKeyboardShortcuts';
import { useSlideTemplates } from '../hooks/useSlideTemplates';
import { useCollaboration } from '../hooks/useCollaboration';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';
import { usePropertiesPanelStore } from '../stores/propertiesPanelStore';
import PresenceIndicator from '../components/deck/collaboration/PresenceIndicator';
import CollaboratorCursors from '../components/deck/collaboration/CollaboratorCursors';
import CommentsPanel from '../components/deck/collaboration/CommentsPanel';
import AddCommentButton from '../components/deck/collaboration/AddCommentButton';
import CommentsOverlay from '../components/deck/collaboration/CommentsOverlay';
import type { SlideTemplateType } from '../templates/templateTypes';
import { getTemplate } from '../templates/templateDefinitions';
import {
  createTextObject,
  createRectObject,
  generateElementId,
  percentToPixel,
} from '../utils/deckCanvasUtils';
import type { Deck, DeckSlide, SlideTemplate, DeckSlideElement } from '../types/deck';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function DeckEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const { theme: themeConfig } = useTheme();

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const { canvas, canUndo, canRedo, undo, redo, selectedObjectIds } = useDeckCanvasStore();
  const { applyTemplate } = useSlideTemplates();

  // Initialize collaboration with stable user ID
  const [userId] = useState(() => 'user-' + Math.random().toString(36).substr(2, 9));
  useCollaboration(id!, userId);

  // Fetch deck
  const { data: deck, isLoading } = useQuery({
    queryKey: ['deck', id],
    queryFn: () => decksApi.getById(id!),
    enabled: !!id,
  });

  // Set initial selected slide
  useEffect(() => {
    if (deck?.slides?.length && !selectedSlideId) {
      setSelectedSlideId(deck.slides[0].id);
    }
  }, [deck, selectedSlideId]);

  // Mutations
  const addSlideMutation = useMutation({
    mutationFn: (templateType: SlideTemplateType) =>
      slidesApi.create({ deckId: id!, template: templateType as SlideTemplate }),
    onSuccess: async (res, templateType) => {
      // Apply template elements if not BLANK
      if (templateType !== 'BLANK') {
        const template = getTemplate(templateType);
        const slideWidth = deck?.slideWidth || 1920;
        const slideHeight = deck?.slideHeight || 1080;

        // Create elements from template
        for (const el of template.elements) {
          const props = el.properties as any;
          await elementsApi.create({
            slideId: res.id,
            type: el.type === 'text' ? 'TEXT' : el.type === 'placeholder' ? 'IMAGE' : 'SHAPE',
            x: (props.left / slideWidth) * 100,
            y: (props.top / slideHeight) * 100,
            width: ((props.width || 200) / slideWidth) * 100,
            height: ((props.height || 100) / slideHeight) * 100,
            rotation: props.angle || 0,
            content: {
              text: props.text,
              placeholder: props.placeholder,
              placeholderType: props.placeholderType,
              fontSize: props.fontSize,
              fontFamily: props.fontFamily,
              fontWeight: props.fontWeight,
              fill: props.fill,
              stroke: props.stroke,
              shapeType: props.shapeType || 'RECT',
              originX: props.originX,
              originY: props.originY,
              textAlign: props.textAlign,
            },
          });
        }

        // Update slide background if template has one
        if (template.backgroundColor) {
          await slidesApi.update(res.id, { backgroundColor: template.backgroundColor });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      setSelectedSlideId(res.id);
      message.success('Slide added');
    },
  });

  const deleteSlideMutation = useMutation({
    mutationFn: (slideId: string) => slidesApi.delete(slideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      setSelectedSlideId(null);
      message.success('Slide deleted');
    },
  });

  const duplicateSlideMutation = useMutation({
    mutationFn: (slideId: string) => slidesApi.duplicate(slideId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      setSelectedSlideId(res.id);
      message.success('Slide duplicated');
    },
  });

  const updateElementMutation = useMutation({
    mutationFn: ({ elementId, data }: { elementId: string; data: any }) =>
      elementsApi.update(elementId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
    },
    onError: (error: any) => {
      // Silently ignore 404 errors - they're expected for newly added elements that don't exist in DB yet
      // These elements are saved as part of the canvas JSON state, not as individual database records
      if (error?.response?.status !== 404) {
        console.error('Error updating element:', error);
        message.error('Failed to update element');
      }
    },
  });

  const createElementMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('[Mutation] Creating element with data:', data);
      return elementsApi.create(data);
    },
    onSuccess: (result) => {
      console.log('[Mutation] Element created successfully:', result);
      console.log('[Mutation] Refetching deck data...');
      // Use refetchQueries to force immediate refetch instead of invalidateQueries
      queryClient.refetchQueries({ queryKey: ['deck', id] });
      message.success('Element added');
    },
    onError: (error: any) => {
      console.error('[Mutation] Element creation failed:', error);
      console.error('[Mutation] Error details:', {
        status: error?.response?.status,
        message: error?.message,
        data: error?.response?.data,
      });
      message.error('Failed to save element: ' + (error?.message || 'Unknown error'));
    },
  });

  const deleteElementMutation = useMutation({
    mutationFn: (elementId: string) => elementsApi.delete(elementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      message.success('Element deleted');
    },
  });

  const selectedSlide = deck?.slides?.find((s) => s.id === selectedSlideId);

  // Add text to canvas
  const handleAddText = useCallback(() => {
    if (!canvas || !selectedSlide) {
      message.warning('Please select a slide first');
      return;
    }
    const text = createTextObject('Double-click to edit');
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();

    // Save to backend
    createElementMutation.mutate({
      slideId: selectedSlide.id,
      type: 'TEXT',
      x: 10,
      y: 10,
      width: 30,
      height: 10,
      content: { text: 'Double-click to edit', fontSize: 24, fill: '#000000' },
    });
  }, [canvas, selectedSlide, createElementMutation]);

  // Add shape to canvas
  const handleAddShape = useCallback(() => {
    if (!canvas || !selectedSlide) {
      message.warning('Please select a slide first');
      return;
    }
    const rect = createRectObject();
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();

    createElementMutation.mutate({
      slideId: selectedSlide.id,
      type: 'SHAPE',
      x: 10,
      y: 10,
      width: 20,
      height: 15,
      content: { shapeType: 'RECT', fill: '#e0e0e0', stroke: '#333333' },
    });
  }, [canvas, selectedSlide, createElementMutation]);

  // Delete selected objects or slide
  const handleDelete = useCallback(() => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach((obj) => {
      const elementId = obj.get('id') as string;
      if (elementId) {
        deleteElementMutation.mutate(elementId);
      }
      canvas.remove(obj);
    });
    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas, deleteElementMutation]);

  // Handle slide deletion via Delete key
  const handleDeleteSlideKeypress = useCallback(() => {
    if (!selectedSlideId) return;

    // Only delete slide if no canvas elements are selected
    if (canvas && canvas.getActiveObjects().length > 0) {
      handleDelete();
      return;
    }

    const selectedSlide = deck?.slides?.find((s) => s.id === selectedSlideId);
    if (!selectedSlide) return;

    modal.confirm({
      title: 'Delete Slide',
      content: 'Are you sure you want to delete this slide?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        deleteSlideMutation.mutate(selectedSlideId);
      },
    });
  }, [selectedSlideId, canvas, deck?.slides, modal, handleDelete, deleteSlideMutation]);

  // Keyboard listener for slide deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        handleDeleteSlideKeypress();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSlideKeypress]);

  // Keyboard shortcuts hook
  const { copy, paste, cut, duplicate, selectAll, bringToFront, sendToBack } =
    useDeckKeyboardShortcuts({
      canvas,
      onSave: () => {
        message.success('Deck saved');
        // TODO: implement actual save
      },
      onDelete: handleDelete,
    });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!deck) {
    return <div>Deck not found</div>;
  }

  return (
    <Layout style={{ height: '100vh', background: themeConfig.colors.background.primary }}>
      {/* Top Toolbar */}
      <Header
        style={{
          background: themeConfig.colors.background.secondary,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${themeConfig.colors.border.default}`,
          height: 48,
        }}
      >
        <Space>
          <Button icon={<LeftOutlined />} onClick={() => navigate('/decks')}>
            Back
          </Button>
          <span style={{ fontWeight: 600, fontSize: 16, color: themeConfig.colors.text.primary }}>
            {deck.title}
          </span>
        </Space>

        {/* Center toolbar */}
        <Space>
          <TextStylePicker
            canvas={canvas}
            disabled={!selectedSlide}
            onTextAdd={(textType) => {
              if (selectedSlide) {
                createElementMutation.mutate({
                  slideId: selectedSlide.id,
                  type: 'TEXT',
                  x: 10,
                  y: 10,
                  width: 30,
                  height: 10,
                  content: { text: textType === 'HEADING' ? 'Title' : 'Text', fontSize: 24 },
                });
              }
            }}
          />
          <ShapePicker
            canvas={canvas}
            disabled={!selectedSlide}
            onShapeAdd={(shapeType) => {
              if (selectedSlide) {
                createElementMutation.mutate({
                  slideId: selectedSlide.id,
                  type: 'SHAPE',
                  x: 10,
                  y: 10,
                  width: 20,
                  height: 15,
                  content: { shapeType, fill: '#e0e0e0', stroke: '#333333' },
                });
              }
            }}
          />
          <LineTool canvas={canvas} disabled={!selectedSlide} />
          <QuickShapeBar canvas={canvas} disabled={!selectedSlide} />
          <InsertImageButton disabled={!selectedSlide} />

          <div style={{ width: 1, height: 24, background: themeConfig.colors.border.default, margin: '0 8px' }} />

          <Tooltip title="Undo (Ctrl+Z)">
            <Button icon={<UndoOutlined />} disabled={!canUndo()} onClick={undo} />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <Button icon={<RedoOutlined />} disabled={!canRedo()} onClick={redo} />
          </Tooltip>

          <div style={{ width: 1, height: 24, background: themeConfig.colors.border.default, margin: '0 8px' }} />

          <AlignmentTools canvas={canvas} disabled={!selectedSlide} />

          <Tooltip title="Keyboard Shortcuts">
            <Button
              icon={<QuestionCircleOutlined />}
              onClick={() => setShortcutsModalOpen(true)}
            />
          </Tooltip>

          <PropertiesPanelToggle />
        </Space>

        <Space>
          <PresenceIndicator />
          <div style={{ width: 1, height: 24, background: themeConfig.colors.border.default, margin: '0 8px' }} />
          <AddCommentButton />
          <Button
            icon={<CommentOutlined />}
            onClick={() => setCommentsPanelOpen(!commentsPanelOpen)}
            type={commentsPanelOpen ? 'primary' : 'default'}
          >
            Comments
          </Button>
          <Button icon={<SaveOutlined />}>Save</Button>
          <Button icon={<ShareAltOutlined />}>Share</Button>
          <ExportButton deckId={id!} currentSlideIndex={selectedSlideId ? deck?.slides?.findIndex(s => s.id === selectedSlideId) ?? 0 : 0} disabled={!deck?.slides?.length} />
          <PresentButton disabled={!deck?.slides?.length} />
        </Space>
      </Header>

      <Layout>
        {/* Slide Thumbnails */}
        <Sider
          width={180}
          style={{
            background: themeConfig.colors.background.secondary,
            padding: 8,
            overflowY: 'auto',
            borderRight: `1px solid ${themeConfig.colors.border.default}`,
          }}
        >
          {deck.slides?.map((slide, index) => (
            <SlideContextMenu
              key={slide.id}
              onDuplicate={() => duplicateSlideMutation.mutate(slide.id)}
              onDelete={() => {
                modal.confirm({
                  title: 'Delete Slide',
                  content: 'Are you sure you want to delete this slide?',
                  okText: 'Delete',
                  okType: 'danger',
                  onOk: () => {
                    deleteSlideMutation.mutate(slide.id);
                  },
                });
              }}
            >
              <Card
                size="small"
                onClick={() => setSelectedSlideId(slide.id)}
                style={{
                  marginBottom: 8,
                  cursor: 'pointer',
                  border:
                    selectedSlideId === slide.id
                      ? `2px solid ${themeConfig.colors.accent.primary}`
                      : `1px solid ${themeConfig.colors.border.default}`,
                  background: themeConfig.colors.background.primary,
                  aspectRatio: '16/9',
                }}
                styles={{ body: { padding: 8 } }}
              >
                <div style={{ fontSize: 11, color: themeConfig.colors.text.secondary }}>
                  {index + 1}
                </div>
              </Card>
            </SlideContextMenu>
          ))}

          <NewSlideButton
            onAddSlide={(templateType) => addSlideMutation.mutate(templateType)}
            disabled={!deck}
          />
        </Sider>

        {/* Main Canvas */}
        <Content
          style={{
            padding: 24,
            background: themeConfig.colors.background.tertiary,
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            position: 'relative',
          }}
        >
          {selectedSlide ? (
            <CanvasContextMenu
              canvas={canvas}
              onCopy={copy}
              onPaste={paste}
              onCut={cut}
              onDuplicate={duplicate}
              onDelete={handleDelete}
              onBringToFront={bringToFront}
              onSendToBack={sendToBack}
            >
              <div style={{ position: 'relative' }} className="deck-canvas-container">
                <SlideCanvas
                  slide={selectedSlide}
                  deckWidth={deck.slideWidth || 1920}
                  deckHeight={deck.slideHeight || 1080}
                  scale={0.5}
                  onElementUpdate={(elementId, data) => {
                    updateElementMutation.mutate({ elementId, data });
                  }}
                  onElementCreate={(element) => {
                    createElementMutation.mutate(element);
                  }}
                />
                {/* Collaboration overlays */}
                <CollaboratorCursors currentSlideId={selectedSlide.id} />
                <CommentsOverlay slideId={selectedSlide.id} />
              </div>
            </CanvasContextMenu>
          ) : (
            <div style={{ textAlign: 'center', marginTop: 100, color: themeConfig.colors.text.secondary }}>
              <Text>Select a slide to start editing</Text>
            </div>
          )}
        </Content>

        {/* Properties Panel */}
        <PropertiesPanel />

        {/* Comments Panel */}
        {commentsPanelOpen && selectedSlide && (
          <CommentsPanel
            slideId={selectedSlide.id}
            onClose={() => setCommentsPanelOpen(false)}
          />
        )}
      </Layout>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Asset Browser Modal */}
      <AssetBrowserModal />

      {/* Upload Hint */}
      <UploadHint />

      {/* Presentation View */}
      {deck?.slides && (
        <PresentationView
          slides={deck.slides.map((slide) => ({
            id: slide.id,
            // Note: content contains canvas data, elements are for structured editing
            data: typeof slide.content === 'string'
              ? slide.content
              : JSON.stringify(slide.content || {}),
            order: slide.order,
          }))}
        />
      )}
    </Layout>
  );
}
