import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Button, Space, App, Spin, theme, Tooltip, Dropdown, Tag, Typography, Alert } from 'antd';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useBuilderStore } from '../store/builder';
import {
  SaveOutlined,
  EyeOutlined,
  FilePdfOutlined,
  UndoOutlined,
  RedoOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  AppstoreAddOutlined,
  FileImageOutlined,
  DeleteOutlined,
  CheckSquareOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import html2canvas from 'html2canvas';
import { produce } from 'immer';
import type { LayoutItem as GridLayout } from 'react-grid-layout';
import ReportBuilderCanvas from '../components/report-builder/ReportBuilderCanvas';
import ComponentPalette from '../components/report-builder/ComponentPalette';
import PropertiesPanel from '../components/report-builder/PropertiesPanel';
import WidgetContainer from '../components/report-builder/widgets/WidgetContainer';
import ChartWidget from '../components/report-builder/widgets/ChartWidget';
import TextWidget from '../components/report-builder/widgets/TextWidget';
import MetricWidget from '../components/report-builder/widgets/MetricWidget';
import DividerWidget from '../components/report-builder/widgets/DividerWidget';
import CalloutWidget from '../components/report-builder/widgets/CalloutWidget';
import TableWidget from '../components/report-builder/widgets/TableWidget';
import {
  Widget,
  WidgetType,
  WIDGET_DEFAULTS,
  DEFAULT_GRID_COLS,
  DataSource,
  ChartConfig,
  TextConfig,
  MetricConfig,
  DividerConfig,
  CalloutConfig,
  TableConfig,
} from '../types/report-builder';
import { socialMediaReportsService } from '../services/social-media-reports';
import { SocialMediaReport, ReportSection } from '../types/report';

const { Header, Content, Sider } = Layout;
const { useToken } = theme;
const { Text } = Typography;

export const ReportBuilderPage: React.FC = () => {
  const { id, sectionId } = useParams<{ id: string; sectionId: string }>();
  const navigate = useNavigate();
  const { token } = useToken();
  const { message, modal } = App.useApp();
  const isMobile = useIsMobile();

  // Page-specific state (keep as useState)
  const [report, setReport] = useState<SocialMediaReport | null>(null);
  const [section, setSection] = useState<ReportSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Builder state (migrated to Zustand)
  const widgets = useBuilderStore(state => state.widgets);
  const selectedWidgetId = useBuilderStore(state => state.selectedWidgetId);
  const selectedWidgetIds = useBuilderStore(state => state.selectedWidgetIds);
  const showProperties = useBuilderStore(state => state.showProperties);
  const showPalette = useBuilderStore(state => state.showPalette);
  const previewMode = useBuilderStore(state => state.previewMode);
  const isDraggingOrResizing = useBuilderStore(state => state.isDraggingOrResizing);
  const isSelecting = useBuilderStore(state => state.isSelecting);

  // Builder actions
  const setWidgets = useBuilderStore(state => state.setWidgets);
  const selectWidget = useBuilderStore(state => state.selectWidget);
  const selectWidgets = useBuilderStore(state => state.selectWidgets);
  const clearSelection = useBuilderStore(state => state.clearSelection);
  const selectAll = useBuilderStore(state => state.selectAll);
  const setShowProperties = useBuilderStore(state => state.setShowProperties);
  const setShowPalette = useBuilderStore(state => state.setShowPalette);
  const setPreviewMode = useBuilderStore(state => state.setPreviewMode);
  const setIsDraggingOrResizing = useBuilderStore(state => state.setIsDraggingOrResizing);
  const setIsSelecting = useBuilderStore(state => state.setIsSelecting);
  const updateWidget = useBuilderStore(state => state.updateWidget);
  const deleteWidget = useBuilderStore(state => state.deleteWidget);
  const deleteWidgets = useBuilderStore(state => state.deleteWidgets);
  const addWidget = useBuilderStore(state => state.addWidget);
  const batchUpdateLayouts = useBuilderStore(state => state.batchUpdateLayouts);
  const undo = useBuilderStore(state => state.undo);
  const redo = useBuilderStore(state => state.redo);
  const addToHistory = useBuilderStore(state => state.addToHistory);
  const canUndo = useBuilderStore(state => state.canUndo);
  const canRedo = useBuilderStore(state => state.canRedo);
  const setDragStartPosition = useBuilderStore(state => state.setDragStartPosition);
  const setDraggedWidgetId = useBuilderStore(state => state.setDraggedWidgetId);
  const clearDragState = useBuilderStore(state => state.clearDragState);

  // Refs for synchronous access during drag (still needed for react-grid-layout callbacks)
  const selectedWidgetIdsRef = useRef<string[]>([]);
  const widgetsRef = useRef<Widget[]>([]);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const draggedWidgetIdRef = useRef<string | null>(null);

  // Sync Zustand state to refs for drag callbacks
  useEffect(() => {
    selectedWidgetIdsRef.current = selectedWidgetIds;
  }, [selectedWidgetIds]);

  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  // Load report and section data
  useEffect(() => {
    if (id) {
      loadReportData();
    }
  }, [id, sectionId]);

  // Keyboard shortcuts for undo/redo and multi-select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input/textarea (don't trigger shortcuts while typing)
      const target = e.target as HTMLElement;
      const isEditing = target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.isContentEditable;

      // Ctrl+Z or Cmd+Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !isEditing) {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y for Redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z' && !isEditing) ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y' && !isEditing)) {
        e.preventDefault();
        handleRedo();
      }

      // Ctrl+A or Cmd+A for Select All
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isEditing) {
        e.preventDefault();
        handleSelectAll();
      }

      // Delete or Backspace for bulk delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditing && selectedWidgetIds.length > 0) {
        e.preventDefault();
        handleBulkDelete();
      }

      // Escape to clear selection
      if (e.key === 'Escape' && !isEditing) {
        e.preventDefault();
        clearSelection(); // Use Zustand's clearSelection action
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidgetIds, clearSelection]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      console.log('[ReportBuilder] Loading report data for ID:', id, 'sectionId:', sectionId);
      const reportData = await socialMediaReportsService.getReport(id!);
      console.log('[ReportBuilder] Report data loaded:', reportData.sections?.length, 'sections');
      setReport(reportData);

      // Multi-section mode (no sectionId in URL) - NEW BEHAVIOR
      if (!sectionId) {
        console.log('[ReportBuilder] Multi-section mode activated');
        if (!reportData.sections || reportData.sections.length === 0) {
          message.warning('No sections found in this report');
          navigate(`/social-media-reports/${id}`);
          return;
        }

        // Load ALL sections and combine their widgets vertically
        const allWidgets: Widget[] = [];
        let currentY = 0;
        const SECTION_SPACING = 4; // Grid rows between sections

        reportData.sections
          .sort((a: ReportSection, b: ReportSection) => a.order - b.order)
          .forEach((sec: ReportSection, index: number) => {
            // Add section header widget
            const headerWidget = createWidget('text', 0, currentY);
            headerWidget.id = `section-header-${sec.id}`;
            headerWidget.config = {
              content: `<h2>${sec.title}</h2><p style="color: #666;">${sec.rowCount} rows</p>`,
              fontSize: 24,
              alignment: 'left',
              fontWeight: 700,
            };
            headerWidget.layout.w = 24; // Full width
            headerWidget.layout.h = 2;
            headerWidget.sectionId = sec.id; // Mark which section this belongs to
            allWidgets.push(headerWidget);
            currentY += 2;

            // Load section widgets or create default
            let sectionWidgets: Widget[] = [];
            if (sec.layout && Array.isArray(sec.layout.widgets)) {
              sectionWidgets = sec.layout.widgets.map((w: Widget) => ({
                ...w,
                sectionId: sec.id, // Mark section ownership
              }));
            } else {
              sectionWidgets = createDefaultLayout(sec).map((w: Widget) => ({
                ...w,
                sectionId: sec.id,
              }));
            }

            // Offset all widgets by currentY
            sectionWidgets.forEach((widget: Widget) => {
              widget.layout.y += currentY;
              allWidgets.push(widget);
            });

            // Calculate max Y for this section
            const widgetBottoms = sectionWidgets.map((w: Widget) => w.layout.y + w.layout.h);
            const maxY = widgetBottoms.length > 0 ? Math.max(...widgetBottoms) : currentY;
            currentY = maxY + SECTION_SPACING;
          });

        console.log('[ReportBuilder] Combined widgets:', allWidgets.length, 'widgets total');
        setWidgets(allWidgets);
        addToHistory(); // Initialize history with current state
        setSection(null); // No single section in multi-section mode
      }
      // Single-section mode (sectionId present) - LEGACY BEHAVIOR
      else {
        const sectionData = reportData.sections?.find((s: ReportSection) => s.id === sectionId);
        if (!sectionData) {
          message.error('Section not found');
          navigate(`/social-media-reports/${id}`);
          return;
        }

        setSection(sectionData);

        // Load existing layout or create default
        if (sectionData.layout && Array.isArray(sectionData.layout.widgets)) {
          setWidgets(sectionData.layout.widgets);
          addToHistory(); // Initialize history
        } else {
          // Create a default layout with suggested visualizations
          const defaultWidgets = createDefaultLayout(sectionData);
          setWidgets(defaultWidgets);
          addToHistory(); // Initialize history
        }
      }
    } catch (error: any) {
      console.error('Failed to load report:', error);

      if (error.response?.status === 404) {
        message.error('Report not found. Redirecting to reports list...');
        setTimeout(() => navigate('/social-media-reports'), 1500);
      } else {
        message.error(`Failed to load report: ${error.response?.data?.message || error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const createDefaultLayout = (section: ReportSection): Widget[] => {
    const defaultWidgets: Widget[] = [];

    // Add a title text block
    defaultWidgets.push(createWidget('text', 0, 0));

    // Add visualizations if they exist (migrate from old format)
    if (section.visualizations && Array.isArray(section.visualizations)) {
      section.visualizations.forEach((viz: any, index: number) => {
        const yPosition = (index + 1) * 4;
        const widget = createWidget('chart', 0, yPosition);

        // Normalize yAxis: ensure it's an array for line/bar/area charts
        let normalizedYAxis = viz.yAxis;
        const chartType = viz.type;
        if (chartType === 'line' || chartType === 'bar' || chartType === 'area') {
          if (!Array.isArray(normalizedYAxis)) {
            // Convert string to array, preserving data
            normalizedYAxis = normalizedYAxis ? [normalizedYAxis] : [];
          }
        }

        widget.config = {
          chartType: viz.type || 'line',
          title: viz.title || 'Chart',
          xAxis: viz.xAxis || '',
          yAxis: normalizedYAxis,
          nameKey: viz.nameKey,
          valueKey: viz.valueKey,
          colors: [],
          showLegend: true,
          showGrid: true,
          showDataLabels: false,
        };
        defaultWidgets.push(widget);
      });
    }

    return defaultWidgets;
  };

  // Create data source from section(s)
  const dataSource: DataSource = (() => {
    // Single-section mode
    if (section) {
      return {
        columns: Object.entries(section.columnTypes as Record<string, string>).map(([name, type]) => ({
          name,
          type: type as 'DATE' | 'NUMBER' | 'STRING',
        })),
        rows: section.rawData as any[],
        rowCount: section.rowCount,
      };
    }
    // Multi-section mode - combine all sections
    else if (report && report.sections && report.sections.length > 0) {
      // Use the first section as the primary data source for now
      // This is a simplified approach - widgets use their sectionId to access correct data
      const firstSection = report.sections[0];
      return {
        columns: Object.entries(firstSection.columnTypes as Record<string, string>).map(([name, type]) => ({
          name,
          type: type as 'DATE' | 'NUMBER' | 'STRING',
        })),
        rows: firstSection.rawData as any[],
        rowCount: firstSection.rowCount,
      };
    }
    // Fallback
    return { columns: [], rows: [], rowCount: 0 };
  })();

  // Widget management
  const createWidget = (type: WidgetType, x: number = 0, y: number = 0): Widget => {
    const id = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const defaults = WIDGET_DEFAULTS[type];

    let config: any = {};
    switch (type) {
      case 'chart':
        config = {
          chartType: 'line',
          title: 'New Chart',
          xAxis: '',
          yAxis: [],
          colors: [],
          showLegend: true,
          showGrid: true,
        } as ChartConfig;
        break;
      case 'text':
        config = { content: 'Type your text here...', alignment: 'left' } as TextConfig;
        break;
      case 'metric':
        config = {
          title: 'New Metric',
          valueKey: '',
          aggregation: 'sum',
          precision: 0,
        } as MetricConfig;
        break;
      case 'divider':
        config = { thickness: 1, style: 'solid' } as DividerConfig;
        break;
      case 'callout':
        config = {
          type: 'info',
          title: 'Note',
          content: 'Add your message here...',
          showIcon: true,
        } as CalloutConfig;
        break;
      case 'table':
        config = { showHeader: true, striped: false, bordered: true } as TableConfig;
        break;
    }

    return {
      id,
      type,
      layout: {
        i: id,
        x,
        y,
        w: defaults.w!,
        h: defaults.h!,
        minW: defaults.minW,
        minH: defaults.minH,
        maxH: defaults.maxH,
      },
      config,
    } as Widget;
  };

  const handleWidgetAdd = useCallback(
    (type: WidgetType) => {
      // Find a good position for the new widget
      const maxY = widgets.reduce((max, w) => Math.max(max, w.layout.y + w.layout.h), 0);
      const newWidget = createWidget(type, 0, maxY);

      const newWidgets = [...widgets, newWidget];
      updateWidgetsWithHistory(newWidgets);
      selectWidget(newWidget.id); // Use Zustand's selectWidget (also sets showProperties)
      setShowPalette(false); // Close palette after adding widget
      message.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added to canvas`);
    },
    [widgets]
  );

  const handleWidgetUpdate = useCallback(
    (widgetId: string, updates: Partial<Widget>) => {
      const newWidgets = produce(widgets, (draft) => {
        const widget = draft.find((w) => w.id === widgetId);
        if (widget) {
          Object.assign(widget, updates);
        }
      });
      setWidgets(newWidgets);
    },
    [widgets]
  );

  const handleWidgetDelete = useCallback(
    (widgetId: string) => {
      modal.confirm({
        title: 'Delete Widget',
        content: 'Are you sure you want to delete this widget?',
        okText: 'Delete',
        okType: 'danger',
        onOk: () => {
          const newWidgets = widgets.filter((w) => w.id !== widgetId);
          updateWidgetsWithHistory(newWidgets);
          selectWidget(null); // Use Zustand's selectWidget to clear selection
          message.success('Widget deleted');
        },
      });
    },
    [widgets, modal, message]
  );

  const handleLayoutChange = useCallback(
    (layout: readonly GridLayout[]) => {
      const isDragging = isDraggingRef.current;
      const draggedWidgetId = draggedWidgetIdRef.current;
      const dragStartPositions = dragStartPositionsRef.current;
      const currentSelectedIds = selectedWidgetIdsRef.current;
      const currentWidgets = widgetsRef.current;

      // GROUP DRAG: Process multi-select drag movement
      if (isDragging && draggedWidgetId && currentSelectedIds.length > 1 && currentSelectedIds.includes(draggedWidgetId) && dragStartPositions.size > 0) {
        const draggedItem = layout.find((item) => item.i === draggedWidgetId);
        const startPosition = dragStartPositions.get(draggedWidgetId);

        if (draggedItem && startPosition) {
          // Calculate delta from stored start position
          const deltaX = draggedItem.x - startPosition.x;
          const deltaY = draggedItem.y - startPosition.y;

          // Create new widgets array with group movement applied
          const newWidgets = produce(currentWidgets, (draft) => {
            draft.forEach((widget) => {
              if (currentSelectedIds.includes(widget.id)) {
                const widgetStartPos = dragStartPositions.get(widget.id);
                if (widgetStartPos) {
                  widget.layout = {
                    ...widget.layout,
                    x: widgetStartPos.x + deltaX,
                    y: widgetStartPos.y + deltaY,
                  };
                }
              } else {
                // Update non-selected widgets from layout (collision handling)
                const layoutItem = layout.find((l) => l.i === widget.id);
                if (layoutItem) {
                  widget.layout = { ...widget.layout, ...layoutItem };
                }
              }
            });
          });

          setWidgets(newWidgets);
          return; // Early return - don't process as normal drag
        }
      }

      // NORMAL DRAG/RESIZE: Single widget or non-group movement
      let hasChanges = false;
      const newWidgets = produce(currentWidgets, (draft) => {
        layout.forEach((item) => {
          const widget = draft.find((w) => w.id === item.i);
          if (widget) {
            if (widget.layout.x !== item.x || widget.layout.y !== item.y ||
                widget.layout.w !== item.w || widget.layout.h !== item.h) {
              hasChanges = true;
            }
            widget.layout = { ...widget.layout, ...item };
          }
        });
      });

      if (hasChanges) {
        setWidgets(newWidgets);
      }
    },
    []  // No dependencies - all state accessed via refs
  );

  // Multi-select handlers
  const handleSelectAll = useCallback(() => {
    selectAll(); // Use Zustand's selectAll action
    message.info(`Selected ${widgets.length} widgets`);
  }, [selectAll, widgets.length]);

  const handleBulkDelete = useCallback(() => {
    if (selectedWidgetIds.length === 0) return;

    modal.confirm({
      title: `Delete ${selectedWidgetIds.length} Widgets`,
      content: `Are you sure you want to delete ${selectedWidgetIds.length} selected widget(s)?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        deleteWidgets(selectedWidgetIds); // Use Zustand's deleteWidgets action (includes history)
        message.success(`${selectedWidgetIds.length} widget(s) deleted`);
      },
    });
  }, [widgets, selectedWidgetIds, modal, message]);

  const handleWidgetClick = useCallback(
    (widgetId: string, event?: React.MouseEvent) => {
      // Prevent click during drag/resize
      if (isDraggingOrResizing) return;

      const isCtrlOrCmd = event?.ctrlKey || event?.metaKey;
      const isShift = event?.shiftKey;

      if (isCtrlOrCmd) {
        // Toggle selection with Ctrl/Cmd (multi-select mode)
        selectWidget(widgetId, true); // Use Zustand's multi-select
      } else if (isShift && selectedWidgetId) {
        // Range selection - select all widgets between last selected and current
        const currentIndex = widgets.findIndex((w) => w.id === widgetId);
        const lastIndex = widgets.findIndex((w) => w.id === selectedWidgetId);
        const startIndex = Math.min(currentIndex, lastIndex);
        const endIndex = Math.max(currentIndex, lastIndex);
        const rangeIds = widgets.slice(startIndex, endIndex + 1).map((w) => w.id);
        selectWidgets(rangeIds); // Use Zustand's selectWidgets
      } else {
        // FIXED: If clicking an already-selected widget with multiple selections,
        // update the selectedWidgetId (primary widget) but preserve multi-selection for drag
        if (selectedWidgetIds.length > 1 && selectedWidgetIds.includes(widgetId)) {
          // Update primary selection widget without changing the array
          // This allows the user to indicate which widget drives the group drag
          selectWidgets(selectedWidgetIds, widgetId); // Re-select with clicked widget as primary
          return;
        }

        // Single selection (clear others)
        selectWidget(widgetId, false); // Use Zustand's single select
      }
    },
    [widgets, selectedWidgetId, selectedWidgetIds, isDraggingOrResizing, selectWidget, selectWidgets]
  );

  // Drag-box selection handler
  const handleDragBoxSelection = useCallback(
    (widgetIds: string[]) => {
      selectWidgets(widgetIds); // Use Zustand's selectWidgets
    },
    [selectWidgets]
  );

  // History management (Zustand handles history automatically)
  const updateWidgetsWithHistory = (newWidgets: Widget[]) => {
    setWidgets(newWidgets); // Zustand setWidgets
    addToHistory(); // Zustand's history tracking
  };

  const handleUndo = () => {
    undo(); // Use Zustand's undo action
  };

  const handleRedo = () => {
    redo(); // Use Zustand's redo action
  };

  // Save layout
  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);

      // Single-section mode (legacy)
      if (sectionId) {
        const layout = {
          widgets,
          cols: DEFAULT_GRID_COLS,
          rowHeight: 30,
          layoutVersion: 1,
        };

        await socialMediaReportsService.updateSectionLayout(id, sectionId, layout);
        message.success('Layout saved successfully!');
      }
      // Multi-section mode (new) - split widgets back to their sections
      else {
        if (!report || !report.sections) {
          message.error('No sections found');
          return;
        }

        // Group widgets by sectionId
        const widgetsBySectionId = new Map<string, Widget[]>();

        // Filter out section header widgets
        const contentWidgets = widgets.filter((w) => !w.id.startsWith('section-header-'));

        contentWidgets.forEach((widget) => {
          const secId = widget.sectionId;
          if (secId) {
            if (!widgetsBySectionId.has(secId)) {
              widgetsBySectionId.set(secId, []);
            }
            widgetsBySectionId.get(secId)!.push(widget);
          }
        });

        // Calculate Y offset for each section to normalize widget positions
        const sectionYOffsets = new Map<string, number>();
        let currentY = 0;
        const SECTION_SPACING = 4;

        report.sections
          .sort((a: ReportSection, b: ReportSection) => a.order - b.order)
          .forEach((sec: ReportSection) => {
            sectionYOffsets.set(sec.id, currentY + 2); // +2 for header height

            // Calculate max Y for this section's widgets
            const sectionWidgets = widgetsBySectionId.get(sec.id) || [];
            const maxY = Math.max(...sectionWidgets.map((w) => w.layout.y + w.layout.h), currentY + 2);
            currentY = maxY + SECTION_SPACING;
          });

        // Save each section's layout with normalized widget positions
        const savePromises = report.sections.map(async (sec: ReportSection) => {
          const sectionWidgets = widgetsBySectionId.get(sec.id) || [];
          const yOffset = sectionYOffsets.get(sec.id) || 0;

          // Normalize Y positions (subtract section offset)
          const normalizedWidgets = sectionWidgets.map((w) => ({
            ...w,
            layout: {
              ...w.layout,
              y: w.layout.y - yOffset,
            },
          }));

          const layout = {
            widgets: normalizedWidgets,
            cols: DEFAULT_GRID_COLS,
            rowHeight: 30,
            layoutVersion: 1,
          };

          return socialMediaReportsService.updateSectionLayout(id, sec.id, layout);
        });

        await Promise.all(savePromises);
        message.success(`Layout saved for ${report.sections.length} sections!`);
      }
    } catch (error: any) {
      message.error('Failed to save layout');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Export PDF using server-side rendering (RELIABLE approach)
  const handleExportPDF = async () => {
    if (!id) return;

    try {
      message.loading('Generating PDF from visual builder...', 0);

      // Single-section mode
      if (sectionId) {
        await socialMediaReportsService.generatePDF(id, { sectionId });
      }
      // Multi-section mode - generate full report PDF
      else {
        await socialMediaReportsService.generatePDF(id);
      }

      message.destroy();
      message.success('PDF downloaded successfully!');
    } catch (error: any) {
      message.destroy();
      message.error('Failed to generate PDF');
      console.error(error);
    }
  };

  // Export all widgets as separate PNGs
  const handleExportPNGs = async () => {
    if (!widgets.length) {
      message.warning('No widgets to export');
      return;
    }

    try {
      message.loading(`Exporting ${widgets.length} widgets as PNG...`, 0);

      for (let i = 0; i < widgets.length; i++) {
        const widget = widgets[i];

        // Find the widget element by data-widget-id attribute
        const element = document.querySelector(`[data-widget-id="${widget.id}"]`) as HTMLElement;

        if (element) {
          // Capture the widget as canvas
          const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2, // Higher quality
            logging: true,
            useCORS: true,
          });

          // Convert to PNG and download
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          const filename = `${report?.title || 'report'}_${section?.title || 'section'}_widget-${i + 1}_${widget.type}.png`;
          link.download = filename.replace(/[^a-z0-9_\-\.]/gi, '_'); // Sanitize filename
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Small delay between downloads to prevent browser blocking
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          console.error(`Could not find element for widget ${widget.id}`);
        }
      }

      message.destroy();
      message.success(`${widgets.length} widgets exported as PNG!`);
    } catch (error: any) {
      message.destroy();
      message.error('Failed to export widgets as PNG');
      console.error('PNG Export Error:', error);
    }
  };

  if (loading) {
    return (
      <Spin size="large" spinning={true} tip="Loading report builder...">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} />
      </Spin>
    );
  }

  // PDF Preview Mode - matches PDF output exactly
  if (previewMode) {
    // Group widgets by row (y position) - same as PDF generator
    const rowGroups = new Map<number, typeof widgets>();
    widgets.forEach(widget => {
      const y = widget.layout?.y || 0;
      if (!rowGroups.has(y)) {
        rowGroups.set(y, []);
      }
      rowGroups.get(y)!.push(widget);
    });

    // Sort rows by y position
    const sortedRows = Array.from(rowGroups.entries()).sort((a, b) => a[0] - b[0]);

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#fff',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        {/* Exit Preview Button (floating) */}
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 1000,
          }}
        >
          <Button
            icon={<PlusOutlined />}
            type="primary"
            size="large"
            onClick={() => setPreviewMode(false)}
          >
            Exit Preview
          </Button>
        </div>

        {/* PDF-style content */}
        <div style={{ padding: '40px', maxWidth: '210mm', margin: '0 auto' }}>
          {/* Header - matches PDF (minimal - only title) */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 40,
              paddingBottom: 20,
              borderBottom: '3px solid #1890ff',
            }}
          >
            <h1 style={{ color: '#1890ff', fontSize: 32, marginBottom: 0 }}>{report?.title}</h1>
          </div>

          {/* Section Content - No wrapper box */}
          <div>
            {/* Widget Grid - matches PDF layout exactly */}
            {sortedRows.map(([y, rowWidgets]) => {
              // Sort widgets in this row by x position
              const sortedRowWidgets = [...rowWidgets].sort((a, b) => (a.layout?.x || 0) - (b.layout?.x || 0));

              return (
                <div
                  key={y}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, 1fr)',
                    gap: '16px',
                    width: '100%',
                    marginBottom: '20px',
                  }}
                >
                  {sortedRowWidgets.map((widget) => {
                    // Render widget directly without Card wrapper to match PDF
                    let widgetContent = null;
                    switch (widget.type) {
                      case 'chart':
                        widgetContent = <ChartWidget widget={widget} dataSource={dataSource} onChange={() => {}} />;
                        break;
                      case 'text':
                        widgetContent = <TextWidget widget={widget} onChange={() => {}} readonly={true} />;
                        break;
                      case 'metric':
                        widgetContent = <MetricWidget widget={widget} dataSource={dataSource} onChange={() => {}} />;
                        break;
                      case 'divider':
                        widgetContent = <DividerWidget widget={widget} onChange={() => {}} />;
                        break;
                      case 'callout':
                        widgetContent = <CalloutWidget widget={widget} onChange={() => {}} readonly={true} />;
                        break;
                      case 'table':
                        widgetContent = <TableWidget widget={widget} dataSource={dataSource} onChange={() => {}} />;
                        break;
                    }

                    return (
                      <div
                        key={widget.id}
                        style={{
                          gridColumn: `span ${widget.layout.w}`,
                          minHeight: `${widget.layout.h * 30}px`,
                        }}
                      >
                        {widgetContent}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <Layout style={{ height: '100vh' }}>
      {/* Toolbar */}
      <Header
        style={{
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorder}`,
          padding: `0 ${token.paddingLG}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/social-media-reports/${id}`)}>
            Back to Report
          </Button>
          <div style={{ marginLeft: token.marginLG }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{report?.title}</div>
            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {section ? section.title : `All Sections (${report?.sections?.length || 0})`}
            </div>
          </div>
          {/* ✅ Print Preview Mode Indicator */}
          <Tag
            color="blue"
            icon={<PrinterOutlined />}
            style={{ marginLeft: token.marginLG }}
          >
            Print Preview (794px × A4)
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Layout matches PDF export exactly
          </Text>
        </Space>

        <Space>
          {/* Selection indicator */}
          {selectedWidgetIds.length > 0 && (
            <>
              <div
                style={{
                  padding: '4px 12px',
                  background: token.colorPrimaryBg,
                  borderRadius: token.borderRadiusLG,
                  border: `1px solid ${token.colorPrimaryBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckSquareOutlined style={{ color: token.colorPrimary }} />
                <span style={{ color: token.colorPrimary, fontWeight: 500 }}>
                  {selectedWidgetIds.length} selected
                </span>
              </div>
              <Tooltip title="Delete selected (Delete)">
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  onClick={handleBulkDelete}
                >
                  Delete
                </Button>
              </Tooltip>
            </>
          )}
          <Dropdown
            open={showPalette}
            onOpenChange={setShowPalette}
            trigger={['click']}
            popupRender={() => (
              <div
                style={{
                  width: 280,
                  maxHeight: 600,
                  background: token.colorBgContainer,
                  borderRadius: token.borderRadiusLG,
                  boxShadow: token.boxShadowSecondary,
                  border: `1px solid ${token.colorBorder}`,
                }}
              >
                <ComponentPalette onWidgetAdd={handleWidgetAdd} />
              </div>
            )}
          >
            <Button icon={<AppstoreAddOutlined />} type={showPalette ? 'primary' : 'default'}>
              Add Widget
            </Button>
          </Dropdown>
          <Tooltip title="Undo (Ctrl+Z)">
            <Button
              icon={<UndoOutlined />}
              disabled={!canUndo()}
              onClick={handleUndo}
            />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Shift+Z)">
            <Button
              icon={<RedoOutlined />}
              disabled={!canRedo()}
              onClick={handleRedo}
            />
          </Tooltip>
          <Button
            icon={<EyeOutlined />}
            onClick={() => setPreviewMode(true)}
          >
            Preview PDF
          </Button>
          <Button icon={<SaveOutlined />} type="primary" loading={saving} onClick={handleSave}>
            Save Layout
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={handleExportPDF}>
            Export PDF
          </Button>
          <Button icon={<FileImageOutlined />} onClick={handleExportPNGs}>
            Export as PNGs
          </Button>
        </Space>
      </Header>

      <Layout style={{ overflow: 'hidden', flex: 1 }}>
        {/* Mobile Warning */}
        {isMobile && (
          <Alert
            message="Limited Mobile Support"
            description="The visual report builder is optimized for desktop use. For the best experience with drag-and-drop editing, please use a device with a larger screen."
            type="warning"
            showIcon
            closable
            style={{ margin: token.marginLG }}
          />
        )}

        {/* Canvas */}
        <Content
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'auto',
            position: 'relative',
          }}
        >
          <ReportBuilderCanvas
            widgets={widgets}
            dataSource={dataSource}
            selectedWidgetId={selectedWidgetId}
            selectedWidgetIds={selectedWidgetIds}
            showProperties={showProperties}
            onWidgetSelect={selectWidget}
            onWidgetClick={handleWidgetClick}
            onSelectionChange={handleDragBoxSelection}
            onToggleProperties={() => setShowProperties(!showProperties)}
            onWidgetUpdate={handleWidgetUpdate}
            onWidgetDelete={handleWidgetDelete}
            onLayoutChange={handleLayoutChange}
            onDragStart={(widgetId) => {
              setIsDraggingOrResizing(true);
              setShowProperties(false);

              // Set dragging flag FIRST so onLayoutChange knows we're in a drag
              isDraggingRef.current = true;

              // Initialize refs in onDragStart
              draggedWidgetIdRef.current = widgetId;

              // Get current selection from ref (most up-to-date)
              const currentSelectedIds = selectedWidgetIdsRef.current;

              // Store start positions for all selected widgets (for group drag)
              if (currentSelectedIds.length > 1 && currentSelectedIds.includes(widgetId)) {
                const positions = new Map<string, { x: number; y: number }>();
                currentSelectedIds.forEach((id) => {
                  const widget = widgetsRef.current.find((w) => w.id === id);
                  if (widget) {
                    positions.set(id, { x: widget.layout.x, y: widget.layout.y });
                  }
                });
                dragStartPositionsRef.current = positions;
              } else {
                dragStartPositionsRef.current = new Map();
              }
            }}
            onDragStop={(widgetId) => {
              setIsDraggingOrResizing(false);

              // Add to history when drag stops
              // Use setTimeout to ensure handleLayoutChange has completed
              setTimeout(() => {
                addToHistory();
              }, 50);

              // Cleanup refs after a delay to allow onLayoutChange to process first
              setTimeout(() => {
                isDraggingRef.current = false;
                draggedWidgetIdRef.current = null;
                dragStartPositionsRef.current = new Map();
              }, 100);
            }}
            onResizeStart={() => {
              setIsDraggingOrResizing(true);
              setShowProperties(false);
            }}
            onResizeStop={() => {
              setIsDraggingOrResizing(false);
              // Add to history when resize stops
              setTimeout(() => {
                addToHistory();
              }, 50);
            }}
            readonly={false}
          />
        </Content>

        {/* Properties Panel - Only show for single widget selection */}
        {selectedWidgetId && showProperties && !isDraggingOrResizing && selectedWidgetIds.length === 1 && (
          <Sider
            width={320}
            style={{
              background: token.colorBgContainer,
              borderLeft: `1px solid ${token.colorBorder}`,
              flexShrink: 0,
              overflow: 'auto',
            }}
          >
            <PropertiesPanel
              widget={widgets.find((w) => w.id === selectedWidgetId)!}
              dataSource={dataSource}
              onChange={(updates) => handleWidgetUpdate(selectedWidgetId, updates)}
            />
          </Sider>
        )}
      </Layout>
    </Layout>
  );
};

export default ReportBuilderPage;
