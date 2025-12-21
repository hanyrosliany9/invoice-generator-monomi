# Phase 8: StudioBinder-Style Templates

> **Executor**: Claude Code Haiku 4.5
> **Prerequisite**: Complete `DECK_OPT_06_ASSET_BROWSER.md` and `DECK_OPT_07_PROPERTIES_PANEL.md` first
> **Estimated Complexity**: High

## Overview

Create production-ready slide templates inspired by StudioBinder, including mood boards, shot lists, storyboards, and character breakdowns.

---

## Step 1: Define Template Types and Structures

**File**: `frontend/src/features/deck-editor/templates/templateTypes.ts`

```typescript
import type { fabric } from 'fabric';

export type SlideTemplateType =
  | 'BLANK'
  | 'TITLE'
  | 'MOOD_BOARD'
  | 'SHOT_LIST'
  | 'STORYBOARD'
  | 'CHARACTER'
  | 'LOCATION'
  | 'SCRIPT_BREAKDOWN'
  | 'CALL_SHEET'
  | 'COMPARISON'
  | 'GRID_4'
  | 'GRID_6'
  | 'TIMELINE';

export interface TemplateElement {
  type: 'text' | 'image' | 'shape' | 'placeholder';
  id: string;
  properties: Partial<fabric.Object> & {
    text?: string;
    placeholder?: string;
    placeholderType?: 'image' | 'text';
  };
}

export interface SlideTemplate {
  id: SlideTemplateType;
  name: string;
  description: string;
  category: 'basic' | 'production' | 'creative';
  thumbnail?: string; // Base64 or URL for preview
  elements: TemplateElement[];
  backgroundColor?: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  templates: SlideTemplateType[];
}

export const templateCategories: TemplateCategory[] = [
  {
    id: 'basic',
    name: 'Basic Layouts',
    templates: ['BLANK', 'TITLE', 'COMPARISON', 'GRID_4', 'GRID_6'],
  },
  {
    id: 'production',
    name: 'Production',
    templates: ['SHOT_LIST', 'STORYBOARD', 'SCRIPT_BREAKDOWN', 'CALL_SHEET', 'TIMELINE'],
  },
  {
    id: 'creative',
    name: 'Creative',
    templates: ['MOOD_BOARD', 'CHARACTER', 'LOCATION'],
  },
];
```

---

## Step 2: Create Template Definitions

**File**: `frontend/src/features/deck-editor/templates/templateDefinitions.ts`

```typescript
import { SlideTemplate, SlideTemplateType } from './templateTypes';

// Canvas dimensions (16:9 aspect ratio)
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const PADDING = 60;

// Helper to create text element
const textElement = (
  id: string,
  text: string,
  left: number,
  top: number,
  options: Partial<any> = {}
): any => ({
  type: 'text',
  id,
  properties: {
    text,
    left,
    top,
    fontSize: 24,
    fontFamily: 'Inter, sans-serif',
    fill: '#1f2937',
    ...options,
  },
});

// Helper to create placeholder
const placeholderElement = (
  id: string,
  placeholderType: 'image' | 'text',
  left: number,
  top: number,
  width: number,
  height: number,
  label: string
): any => ({
  type: 'placeholder',
  id,
  properties: {
    left,
    top,
    width,
    height,
    placeholder: label,
    placeholderType,
    fill: '#f3f4f6',
    stroke: '#d1d5db',
    strokeWidth: 2,
    strokeDashArray: [8, 4],
    rx: 8,
    ry: 8,
  },
});

// Helper to create shape
const shapeElement = (
  id: string,
  shapeType: string,
  left: number,
  top: number,
  options: Partial<any> = {}
): any => ({
  type: 'shape',
  id,
  properties: {
    shapeType,
    left,
    top,
    ...options,
  },
});

// ============================================
// TEMPLATE DEFINITIONS
// ============================================

const blankTemplate: SlideTemplate = {
  id: 'BLANK',
  name: 'Blank',
  description: 'Empty canvas to start from scratch',
  category: 'basic',
  elements: [],
  backgroundColor: '#ffffff',
};

const titleTemplate: SlideTemplate = {
  id: 'TITLE',
  name: 'Title Slide',
  description: 'Large centered title with subtitle',
  category: 'basic',
  backgroundColor: '#1f2937',
  elements: [
    textElement('title', 'Presentation Title', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, {
      fontSize: 72,
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
    }),
    textElement('subtitle', 'Subtitle or tagline goes here', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60, {
      fontSize: 28,
      fill: '#9ca3af',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
    }),
    textElement('date', 'Date / Author', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 80, {
      fontSize: 18,
      fill: '#6b7280',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
    }),
  ],
};

const moodBoardTemplate: SlideTemplate = {
  id: 'MOOD_BOARD',
  name: 'Mood Board',
  description: 'Visual collage for creative direction',
  category: 'creative',
  backgroundColor: '#f9fafb',
  elements: [
    textElement('title', 'MOOD BOARD', PADDING, PADDING, {
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#111827',
    }),
    textElement('subtitle', 'Visual Direction & Tone', PADDING, PADDING + 50, {
      fontSize: 18,
      fill: '#6b7280',
    }),
    // Large hero image
    placeholderElement('hero', 'image', PADDING, 150, 900, 600, 'Hero Image'),
    // Side images
    placeholderElement('side1', 'image', 990, 150, 450, 290, 'Reference 1'),
    placeholderElement('side2', 'image', 990, 460, 450, 290, 'Reference 2'),
    // Bottom row
    placeholderElement('bottom1', 'image', PADDING, 770, 440, 250, 'Color Palette'),
    placeholderElement('bottom2', 'image', 520, 770, 440, 250, 'Texture'),
    placeholderElement('bottom3', 'image', 990, 770, 440, 250, 'Typography'),
  ],
};

const shotListTemplate: SlideTemplate = {
  id: 'SHOT_LIST',
  name: 'Shot List',
  description: 'Detailed shot breakdown with camera info',
  category: 'production',
  backgroundColor: '#ffffff',
  elements: [
    // Header
    textElement('title', 'SHOT LIST', PADDING, PADDING, {
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#111827',
    }),
    textElement('scene', 'Scene: ___', PADDING, PADDING + 50, {
      fontSize: 18,
      fill: '#374151',
    }),
    textElement('page', 'Page ___ of ___', CANVAS_WIDTH - 200, PADDING, {
      fontSize: 14,
      fill: '#6b7280',
    }),
    // Table header
    shapeElement('headerBg', 'rect', PADDING, 130, {
      width: CANVAS_WIDTH - PADDING * 2,
      height: 50,
      fill: '#f3f4f6',
      rx: 4,
      ry: 4,
    }),
    textElement('col1', 'Shot #', 80, 145, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('col2', 'Shot Type', 200, 145, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('col3', 'Camera', 400, 145, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('col4', 'Lens', 600, 145, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('col5', 'Movement', 800, 145, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('col6', 'Description', 1100, 145, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    // Sample rows
    textElement('row1-1', '1', 80, 210, { fontSize: 16, fill: '#1f2937' }),
    textElement('row1-2', 'Wide', 200, 210, { fontSize: 16, fill: '#1f2937' }),
    textElement('row1-3', 'A Cam', 400, 210, { fontSize: 16, fill: '#1f2937' }),
    textElement('row1-4', '24mm', 600, 210, { fontSize: 16, fill: '#1f2937' }),
    textElement('row1-5', 'Dolly In', 800, 210, { fontSize: 16, fill: '#1f2937' }),
    textElement('row1-6', 'Establishing shot of location', 1100, 210, { fontSize: 16, fill: '#1f2937' }),
    // Divider
    shapeElement('divider1', 'rect', PADDING, 250, {
      width: CANVAS_WIDTH - PADDING * 2,
      height: 1,
      fill: '#e5e7eb',
    }),
    textElement('row2-1', '2', 80, 280, { fontSize: 16, fill: '#1f2937' }),
    textElement('row2-2', 'Medium', 200, 280, { fontSize: 16, fill: '#1f2937' }),
    textElement('row2-3', 'A Cam', 400, 280, { fontSize: 16, fill: '#1f2937' }),
    textElement('row2-4', '50mm', 600, 280, { fontSize: 16, fill: '#1f2937' }),
    textElement('row2-5', 'Static', 800, 280, { fontSize: 16, fill: '#1f2937' }),
    textElement('row2-6', 'Character enters frame', 1100, 280, { fontSize: 16, fill: '#1f2937' }),
  ],
};

const storyboardTemplate: SlideTemplate = {
  id: 'STORYBOARD',
  name: 'Storyboard',
  description: '6-panel storyboard with notes',
  category: 'production',
  backgroundColor: '#ffffff',
  elements: [
    textElement('title', 'STORYBOARD', PADDING, PADDING, {
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#111827',
    }),
    textElement('scene', 'Scene: ___', PADDING, PADDING + 45, {
      fontSize: 16,
      fill: '#6b7280',
    }),
    // Panel 1
    placeholderElement('panel1', 'image', PADDING, 130, 560, 315, 'Panel 1'),
    textElement('shot1', 'Shot 1:', PADDING, 455, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('desc1', 'Description...', PADDING, 475, { fontSize: 12, fill: '#6b7280' }),
    // Panel 2
    placeholderElement('panel2', 'image', 680, 130, 560, 315, 'Panel 2'),
    textElement('shot2', 'Shot 2:', 680, 455, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('desc2', 'Description...', 680, 475, { fontSize: 12, fill: '#6b7280' }),
    // Panel 3
    placeholderElement('panel3', 'image', 1300, 130, 560, 315, 'Panel 3'),
    textElement('shot3', 'Shot 3:', 1300, 455, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('desc3', 'Description...', 1300, 475, { fontSize: 12, fill: '#6b7280' }),
    // Panel 4
    placeholderElement('panel4', 'image', PADDING, 530, 560, 315, 'Panel 4'),
    textElement('shot4', 'Shot 4:', PADDING, 855, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('desc4', 'Description...', PADDING, 875, { fontSize: 12, fill: '#6b7280' }),
    // Panel 5
    placeholderElement('panel5', 'image', 680, 530, 560, 315, 'Panel 5'),
    textElement('shot5', 'Shot 5:', 680, 855, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('desc5', 'Description...', 680, 875, { fontSize: 12, fill: '#6b7280' }),
    // Panel 6
    placeholderElement('panel6', 'image', 1300, 530, 560, 315, 'Panel 6'),
    textElement('shot6', 'Shot 6:', 1300, 855, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('desc6', 'Description...', 1300, 875, { fontSize: 12, fill: '#6b7280' }),
  ],
};

const characterTemplate: SlideTemplate = {
  id: 'CHARACTER',
  name: 'Character Profile',
  description: 'Character breakdown with image and details',
  category: 'creative',
  backgroundColor: '#ffffff',
  elements: [
    // Character image (left side)
    placeholderElement('photo', 'image', PADDING, PADDING, 600, 850, 'Character Photo'),
    // Name and role
    textElement('name', 'CHARACTER NAME', 720, PADDING, {
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#111827',
    }),
    textElement('role', 'Role / Archetype', 720, PADDING + 60, {
      fontSize: 24,
      fill: '#6b7280',
    }),
    // Divider
    shapeElement('divider', 'rect', 720, 160, {
      width: 400,
      height: 3,
      fill: '#3b82f6',
    }),
    // Details section
    textElement('bioLabel', 'Biography', 720, 200, {
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#374151',
    }),
    textElement('bio', 'Character biography and background story goes here. Include motivations, fears, desires, and character arc.', 720, 230, {
      fontSize: 14,
      fill: '#6b7280',
      width: 500,
    }),
    textElement('traitsLabel', 'Key Traits', 720, 380, {
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#374151',
    }),
    textElement('traits', '• Trait 1\n• Trait 2\n• Trait 3\n• Trait 4', 720, 410, {
      fontSize: 14,
      fill: '#6b7280',
    }),
    textElement('costumeLabel', 'Costume Notes', 720, 550, {
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#374151',
    }),
    textElement('costume', 'Describe wardrobe, accessories, and visual style...', 720, 580, {
      fontSize: 14,
      fill: '#6b7280',
      width: 500,
    }),
    // Reference images
    placeholderElement('ref1', 'image', 720, 680, 270, 180, 'Reference 1'),
    placeholderElement('ref2', 'image', 1010, 680, 270, 180, 'Reference 2'),
    placeholderElement('ref3', 'image', 1300, 680, 270, 180, 'Reference 3'),
  ],
};

const locationTemplate: SlideTemplate = {
  id: 'LOCATION',
  name: 'Location Scout',
  description: 'Location overview with details',
  category: 'creative',
  backgroundColor: '#ffffff',
  elements: [
    // Main image
    placeholderElement('main', 'image', PADDING, PADDING, 1200, 600, 'Location Photo'),
    // Side images
    placeholderElement('side1', 'image', 1320, PADDING, 540, 190, 'Angle 1'),
    placeholderElement('side2', 'image', 1320, 260, 540, 190, 'Angle 2'),
    placeholderElement('side3', 'image', 1320, 470, 540, 190, 'Angle 3'),
    // Info section
    textElement('name', 'LOCATION NAME', PADDING, 700, {
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#111827',
    }),
    textElement('address', '123 Example Street, City, Country', PADDING, 750, {
      fontSize: 18,
      fill: '#6b7280',
    }),
    // Details grid
    textElement('accessLabel', 'Access:', PADDING, 810, {
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#374151',
    }),
    textElement('access', 'Public / Private / Permit Required', 150, 810, {
      fontSize: 14,
      fill: '#6b7280',
    }),
    textElement('powerLabel', 'Power:', PADDING, 840, {
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#374151',
    }),
    textElement('power', 'Available / Generator Needed', 150, 840, {
      fontSize: 14,
      fill: '#6b7280',
    }),
    textElement('soundLabel', 'Sound:', PADDING, 870, {
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#374151',
    }),
    textElement('sound', 'Quiet / Moderate Traffic / Noisy', 150, 870, {
      fontSize: 14,
      fill: '#6b7280',
    }),
    // Notes
    textElement('notesLabel', 'Notes', 600, 700, {
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#374151',
    }),
    textElement('notes', 'Additional notes about the location, parking, crew area, etc.', 600, 730, {
      fontSize: 14,
      fill: '#6b7280',
      width: 600,
    }),
  ],
};

const comparisonTemplate: SlideTemplate = {
  id: 'COMPARISON',
  name: 'Side by Side',
  description: 'Compare two images or concepts',
  category: 'basic',
  backgroundColor: '#ffffff',
  elements: [
    textElement('title', 'COMPARISON', CANVAS_WIDTH / 2, PADDING, {
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#111827',
      originX: 'center',
    }),
    // Left side
    placeholderElement('left', 'image', PADDING, 120, 870, 700, 'Option A'),
    textElement('leftLabel', 'Option A', PADDING + 435, 840, {
      fontSize: 24,
      fontWeight: 'bold',
      fill: '#374151',
      originX: 'center',
    }),
    textElement('leftDesc', 'Description of option A', PADDING + 435, 880, {
      fontSize: 16,
      fill: '#6b7280',
      originX: 'center',
    }),
    // Divider
    shapeElement('divider', 'rect', CANVAS_WIDTH / 2 - 2, 120, {
      width: 4,
      height: 700,
      fill: '#e5e7eb',
    }),
    // Right side
    placeholderElement('right', 'image', 990, 120, 870, 700, 'Option B'),
    textElement('rightLabel', 'Option B', 990 + 435, 840, {
      fontSize: 24,
      fontWeight: 'bold',
      fill: '#374151',
      originX: 'center',
    }),
    textElement('rightDesc', 'Description of option B', 990 + 435, 880, {
      fontSize: 16,
      fill: '#6b7280',
      originX: 'center',
    }),
  ],
};

const grid4Template: SlideTemplate = {
  id: 'GRID_4',
  name: '4-Up Grid',
  description: 'Four equal image slots',
  category: 'basic',
  backgroundColor: '#ffffff',
  elements: [
    textElement('title', 'TITLE', CANVAS_WIDTH / 2, PADDING, {
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#111827',
      originX: 'center',
    }),
    placeholderElement('img1', 'image', PADDING, 100, 900, 450, 'Image 1'),
    placeholderElement('img2', 'image', 960, 100, 900, 450, 'Image 2'),
    placeholderElement('img3', 'image', PADDING, 570, 900, 450, 'Image 3'),
    placeholderElement('img4', 'image', 960, 570, 900, 450, 'Image 4'),
  ],
};

const grid6Template: SlideTemplate = {
  id: 'GRID_6',
  name: '6-Up Grid',
  description: 'Six equal image slots',
  category: 'basic',
  backgroundColor: '#ffffff',
  elements: [
    textElement('title', 'TITLE', CANVAS_WIDTH / 2, PADDING, {
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#111827',
      originX: 'center',
    }),
    placeholderElement('img1', 'image', PADDING, 100, 580, 450, 'Image 1'),
    placeholderElement('img2', 'image', 670, 100, 580, 450, 'Image 2'),
    placeholderElement('img3', 'image', 1280, 100, 580, 450, 'Image 3'),
    placeholderElement('img4', 'image', PADDING, 570, 580, 450, 'Image 4'),
    placeholderElement('img5', 'image', 670, 570, 580, 450, 'Image 5'),
    placeholderElement('img6', 'image', 1280, 570, 580, 450, 'Image 6'),
  ],
};

const scriptBreakdownTemplate: SlideTemplate = {
  id: 'SCRIPT_BREAKDOWN',
  name: 'Script Breakdown',
  description: 'Scene elements breakdown',
  category: 'production',
  backgroundColor: '#ffffff',
  elements: [
    textElement('title', 'SCRIPT BREAKDOWN', PADDING, PADDING, {
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#111827',
    }),
    textElement('scene', 'Scene: ___ | Pages: ___ | Est. Time: ___', PADDING, PADDING + 45, {
      fontSize: 16,
      fill: '#6b7280',
    }),
    // Synopsis
    textElement('synopsisLabel', 'Synopsis', PADDING, 130, {
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#374151',
    }),
    textElement('synopsis', 'Brief description of what happens in this scene...', PADDING, 160, {
      fontSize: 14,
      fill: '#6b7280',
      width: 600,
    }),
    // Categories
    textElement('castLabel', 'CAST', PADDING, 260, { fontSize: 14, fontWeight: 'bold', fill: '#dc2626' }),
    textElement('cast', '• Character 1\n• Character 2', PADDING, 285, { fontSize: 12, fill: '#6b7280' }),
    textElement('propsLabel', 'PROPS', 350, 260, { fontSize: 14, fontWeight: 'bold', fill: '#2563eb' }),
    textElement('props', '• Prop 1\n• Prop 2', 350, 285, { fontSize: 12, fill: '#6b7280' }),
    textElement('wardrobeLabel', 'WARDROBE', 600, 260, { fontSize: 14, fontWeight: 'bold', fill: '#7c3aed' }),
    textElement('wardrobe', '• Costume 1\n• Costume 2', 600, 285, { fontSize: 12, fill: '#6b7280' }),
    textElement('makeupLabel', 'MAKEUP', 850, 260, { fontSize: 14, fontWeight: 'bold', fill: '#db2777' }),
    textElement('makeup', '• Look 1\n• Look 2', 850, 285, { fontSize: 12, fill: '#6b7280' }),
    textElement('vehiclesLabel', 'VEHICLES', PADDING, 400, { fontSize: 14, fontWeight: 'bold', fill: '#ea580c' }),
    textElement('vehicles', '• Vehicle 1', PADDING, 425, { fontSize: 12, fill: '#6b7280' }),
    textElement('equipmentLabel', 'EQUIPMENT', 350, 400, { fontSize: 14, fontWeight: 'bold', fill: '#0891b2' }),
    textElement('equipment', '• Dolly\n• Jib', 350, 425, { fontSize: 12, fill: '#6b7280' }),
    textElement('sfxLabel', 'SFX', 600, 400, { fontSize: 14, fontWeight: 'bold', fill: '#16a34a' }),
    textElement('sfx', '• Effect 1', 600, 425, { fontSize: 12, fill: '#6b7280' }),
    textElement('notesLabel', 'NOTES', 850, 400, { fontSize: 14, fontWeight: 'bold', fill: '#525252' }),
    textElement('notes', '• Note 1\n• Note 2', 850, 425, { fontSize: 12, fill: '#6b7280' }),
  ],
};

const callSheetTemplate: SlideTemplate = {
  id: 'CALL_SHEET',
  name: 'Call Sheet',
  description: 'Daily production schedule',
  category: 'production',
  backgroundColor: '#ffffff',
  elements: [
    // Header
    shapeElement('headerBg', 'rect', 0, 0, {
      width: CANVAS_WIDTH,
      height: 120,
      fill: '#1f2937',
    }),
    textElement('production', 'PRODUCTION NAME', PADDING, 30, {
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#ffffff',
    }),
    textElement('date', 'Shooting Day: ___ | Date: ___', PADDING, 75, {
      fontSize: 18,
      fill: '#9ca3af',
    }),
    textElement('weather', 'Weather: ___', CANVAS_WIDTH - 300, 30, {
      fontSize: 14,
      fill: '#9ca3af',
    }),
    textElement('sunrise', 'Sunrise: ___ | Sunset: ___', CANVAS_WIDTH - 300, 55, {
      fontSize: 14,
      fill: '#9ca3af',
    }),
    // General call
    textElement('generalCall', 'GENERAL CALL: ___', PADDING, 150, {
      fontSize: 24,
      fontWeight: 'bold',
      fill: '#dc2626',
    }),
    // Schedule table
    textElement('scheduleLabel', 'SCHEDULE', PADDING, 210, {
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#374151',
    }),
    shapeElement('scheduleBg', 'rect', PADDING, 240, {
      width: 800,
      height: 40,
      fill: '#f3f4f6',
    }),
    textElement('colTime', 'Time', 80, 250, { fontSize: 14, fontWeight: 'bold' }),
    textElement('colScene', 'Scene', 200, 250, { fontSize: 14, fontWeight: 'bold' }),
    textElement('colDesc', 'Description', 350, 250, { fontSize: 14, fontWeight: 'bold' }),
    textElement('colLocation', 'Location', 650, 250, { fontSize: 14, fontWeight: 'bold' }),
    // Cast
    textElement('castLabel', 'CAST', 920, 210, {
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#374151',
    }),
    shapeElement('castBg', 'rect', 920, 240, {
      width: 500,
      height: 40,
      fill: '#f3f4f6',
    }),
    textElement('colRole', 'Role', 940, 250, { fontSize: 14, fontWeight: 'bold' }),
    textElement('colActor', 'Actor', 1100, 250, { fontSize: 14, fontWeight: 'bold' }),
    textElement('colCall', 'Call', 1300, 250, { fontSize: 14, fontWeight: 'bold' }),
  ],
};

const timelineTemplate: SlideTemplate = {
  id: 'TIMELINE',
  name: 'Timeline',
  description: 'Project or scene timeline',
  category: 'production',
  backgroundColor: '#ffffff',
  elements: [
    textElement('title', 'PROJECT TIMELINE', CANVAS_WIDTH / 2, PADDING, {
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#111827',
      originX: 'center',
    }),
    // Timeline line
    shapeElement('line', 'rect', 100, CANVAS_HEIGHT / 2, {
      width: CANVAS_WIDTH - 200,
      height: 4,
      fill: '#3b82f6',
    }),
    // Milestones
    shapeElement('dot1', 'circle', 200, CANVAS_HEIGHT / 2, {
      radius: 15,
      fill: '#3b82f6',
      originX: 'center',
      originY: 'center',
    }),
    textElement('milestone1', 'Pre-Production', 200, CANVAS_HEIGHT / 2 + 40, {
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#374151',
      originX: 'center',
    }),
    textElement('date1', 'Week 1-2', 200, CANVAS_HEIGHT / 2 + 65, {
      fontSize: 12,
      fill: '#6b7280',
      originX: 'center',
    }),
    shapeElement('dot2', 'circle', 600, CANVAS_HEIGHT / 2, {
      radius: 15,
      fill: '#3b82f6',
      originX: 'center',
      originY: 'center',
    }),
    textElement('milestone2', 'Production', 600, CANVAS_HEIGHT / 2 - 50, {
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#374151',
      originX: 'center',
    }),
    textElement('date2', 'Week 3-6', 600, CANVAS_HEIGHT / 2 - 75, {
      fontSize: 12,
      fill: '#6b7280',
      originX: 'center',
    }),
    shapeElement('dot3', 'circle', 1000, CANVAS_HEIGHT / 2, {
      radius: 15,
      fill: '#3b82f6',
      originX: 'center',
      originY: 'center',
    }),
    textElement('milestone3', 'Post-Production', 1000, CANVAS_HEIGHT / 2 + 40, {
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#374151',
      originX: 'center',
    }),
    textElement('date3', 'Week 7-10', 1000, CANVAS_HEIGHT / 2 + 65, {
      fontSize: 12,
      fill: '#6b7280',
      originX: 'center',
    }),
    shapeElement('dot4', 'circle', 1400, CANVAS_HEIGHT / 2, {
      radius: 15,
      fill: '#3b82f6',
      originX: 'center',
      originY: 'center',
    }),
    textElement('milestone4', 'Delivery', 1400, CANVAS_HEIGHT / 2 - 50, {
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#374151',
      originX: 'center',
    }),
    textElement('date4', 'Week 11', 1400, CANVAS_HEIGHT / 2 - 75, {
      fontSize: 12,
      fill: '#6b7280',
      originX: 'center',
    }),
    shapeElement('dot5', 'circle', 1720, CANVAS_HEIGHT / 2, {
      radius: 15,
      fill: '#10b981',
      originX: 'center',
      originY: 'center',
    }),
    textElement('milestone5', 'Release', 1720, CANVAS_HEIGHT / 2 + 40, {
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#374151',
      originX: 'center',
    }),
    textElement('date5', 'Week 12', 1720, CANVAS_HEIGHT / 2 + 65, {
      fontSize: 12,
      fill: '#6b7280',
      originX: 'center',
    }),
  ],
};

// Export all templates
export const templates: Record<SlideTemplateType, SlideTemplate> = {
  BLANK: blankTemplate,
  TITLE: titleTemplate,
  MOOD_BOARD: moodBoardTemplate,
  SHOT_LIST: shotListTemplate,
  STORYBOARD: storyboardTemplate,
  CHARACTER: characterTemplate,
  LOCATION: locationTemplate,
  COMPARISON: comparisonTemplate,
  GRID_4: grid4Template,
  GRID_6: grid6Template,
  SCRIPT_BREAKDOWN: scriptBreakdownTemplate,
  CALL_SHEET: callSheetTemplate,
  TIMELINE: timelineTemplate,
};

export const getTemplate = (type: SlideTemplateType): SlideTemplate => {
  return templates[type];
};

export const getAllTemplates = (): SlideTemplate[] => {
  return Object.values(templates);
};
```

---

## Step 3: Create Template Renderer

**File**: `frontend/src/features/deck-editor/templates/templateRenderer.ts`

```typescript
import { fabric } from 'fabric';
import { SlideTemplate, TemplateElement } from './templateTypes';

export const renderTemplateToCanvas = (
  canvas: fabric.Canvas,
  template: SlideTemplate
): void => {
  // Clear existing objects
  canvas.clear();

  // Set background color
  if (template.backgroundColor) {
    canvas.setBackgroundColor(template.backgroundColor, () => {
      canvas.renderAll();
    });
  }

  // Render each element
  template.elements.forEach((element) => {
    const obj = createFabricObject(element);
    if (obj) {
      canvas.add(obj);
    }
  });

  canvas.renderAll();
};

const createFabricObject = (element: TemplateElement): fabric.Object | null => {
  const { type, id, properties } = element;

  let obj: fabric.Object;

  switch (type) {
    case 'text':
      obj = new fabric.IText(properties.text || 'Text', {
        ...properties,
      } as any);
      break;

    case 'placeholder':
      // Create a placeholder rectangle with label
      const group = createPlaceholder(element);
      return group;

    case 'shape':
      obj = createShape(element);
      if (!obj) return null;
      break;

    case 'image':
      // Images need async loading, skip for now
      return null;

    default:
      return null;
  }

  // Add element ID for reference
  (obj as any).templateElementId = id;
  (obj as any).elementType = type;

  return obj;
};

const createPlaceholder = (element: TemplateElement): fabric.Group => {
  const { properties } = element;
  const { left, top, width, height, placeholder, placeholderType } = properties as any;

  // Background rect
  const rect = new fabric.Rect({
    width,
    height,
    fill: '#f9fafb',
    stroke: '#d1d5db',
    strokeWidth: 2,
    strokeDashArray: [8, 4],
    rx: 8,
    ry: 8,
  });

  // Icon based on type
  const iconText = placeholderType === 'image' ? '🖼️' : 'T';
  const icon = new fabric.Text(iconText, {
    fontSize: 48,
    fill: '#9ca3af',
    originX: 'center',
    originY: 'center',
    left: width / 2,
    top: height / 2 - 20,
  });

  // Label
  const label = new fabric.Text(placeholder || 'Placeholder', {
    fontSize: 14,
    fill: '#6b7280',
    originX: 'center',
    originY: 'center',
    left: width / 2,
    top: height / 2 + 30,
  });

  const group = new fabric.Group([rect, icon, label], {
    left,
    top,
  });

  (group as any).templateElementId = element.id;
  (group as any).elementType = 'placeholder';
  (group as any).placeholderType = placeholderType;

  return group;
};

const createShape = (element: TemplateElement): fabric.Object | null => {
  const { properties } = element;
  const shapeType = (properties as any).shapeType || 'rect';

  switch (shapeType) {
    case 'rect':
      return new fabric.Rect(properties as any);
    case 'circle':
      return new fabric.Circle(properties as any);
    case 'line':
      return new fabric.Line([0, 0, properties.width || 100, 0], properties as any);
    default:
      return new fabric.Rect(properties as any);
  }
};

// Helper to replace placeholder with actual image
export const replacePlaceholder = (
  canvas: fabric.Canvas,
  placeholderId: string,
  imageUrl: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const objects = canvas.getObjects();
    const placeholder = objects.find(
      (obj) => (obj as any).templateElementId === placeholderId
    );

    if (!placeholder) {
      reject(new Error(`Placeholder ${placeholderId} not found`));
      return;
    }

    fabric.Image.fromURL(
      imageUrl,
      (img) => {
        // Scale to fit placeholder bounds
        const bounds = placeholder.getBoundingRect();
        const scaleX = bounds.width / (img.width || 1);
        const scaleY = bounds.height / (img.height || 1);
        const scale = Math.min(scaleX, scaleY);

        img.set({
          left: bounds.left,
          top: bounds.top,
          scaleX: scale,
          scaleY: scale,
        });

        (img as any).templateElementId = placeholderId;
        (img as any).elementType = 'image';

        canvas.remove(placeholder);
        canvas.add(img);
        canvas.renderAll();
        resolve();
      },
      { crossOrigin: 'anonymous' }
    );
  });
};
```

---

## Step 4: Create Template Picker Modal

**File**: `frontend/src/features/deck-editor/components/TemplatePicker.tsx`

```tsx
import React, { useState } from 'react';
import { Modal, Tabs, Card, Button, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  templateCategories,
  SlideTemplateType,
} from '../templates/templateTypes';
import { templates, getTemplate } from '../templates/templateDefinitions';

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (templateType: SlideTemplateType) => void;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<SlideTemplateType | null>(null);

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      onClose();
      setSelectedTemplate(null);
    }
  };

  const renderTemplateCard = (templateType: SlideTemplateType) => {
    const template = getTemplate(templateType);
    const isSelected = selectedTemplate === templateType;

    return (
      <Card
        key={templateType}
        hoverable
        className={`cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}
        onClick={() => setSelectedTemplate(templateType)}
        cover={
          <div className="h-32 bg-gray-100 flex items-center justify-center">
            {/* Template preview - simplified */}
            <div className="text-4xl">
              {templateType === 'BLANK' && '⬜'}
              {templateType === 'TITLE' && '📄'}
              {templateType === 'MOOD_BOARD' && '🎨'}
              {templateType === 'SHOT_LIST' && '📋'}
              {templateType === 'STORYBOARD' && '🎬'}
              {templateType === 'CHARACTER' && '👤'}
              {templateType === 'LOCATION' && '📍'}
              {templateType === 'COMPARISON' && '⚖️'}
              {templateType === 'GRID_4' && '⊞'}
              {templateType === 'GRID_6' && '⊟'}
              {templateType === 'SCRIPT_BREAKDOWN' && '📝'}
              {templateType === 'CALL_SHEET' && '📅'}
              {templateType === 'TIMELINE' && '📊'}
            </div>
          </div>
        }
      >
        <Card.Meta
          title={template.name}
          description={
            <span className="text-xs text-gray-500 line-clamp-2">
              {template.description}
            </span>
          }
        />
      </Card>
    );
  };

  const tabItems = templateCategories.map((category) => ({
    key: category.id,
    label: category.name,
    children: (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {category.templates.map(renderTemplateCard)}
      </div>
    ),
  }));

  return (
    <Modal
      title="Choose Template"
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="select"
          type="primary"
          disabled={!selectedTemplate}
          onClick={handleSelect}
        >
          Use Template
        </Button>,
      ]}
    >
      <Tabs items={tabItems} defaultActiveKey="basic" />
    </Modal>
  );
};

export default TemplatePicker;
```

---

## Step 5: Create New Slide Button with Template

**File**: `frontend/src/features/deck-editor/components/NewSlideButton.tsx`

```tsx
import React, { useState, useCallback } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { PlusOutlined, AppstoreOutlined } from '@ant-design/icons';
import { TemplatePicker } from './TemplatePicker';
import { SlideTemplateType } from '../templates/templateTypes';

interface NewSlideButtonProps {
  onAddSlide: (templateType: SlideTemplateType) => void;
  disabled?: boolean;
}

export const NewSlideButton: React.FC<NewSlideButtonProps> = ({
  onAddSlide,
  disabled,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleQuickAdd = useCallback(() => {
    onAddSlide('BLANK');
  }, [onAddSlide]);

  const handleTemplateSelect = useCallback((type: SlideTemplateType) => {
    onAddSlide(type);
  }, [onAddSlide]);

  const quickTemplates: MenuProps['items'] = [
    { key: 'BLANK', label: 'Blank Slide' },
    { key: 'TITLE', label: 'Title Slide' },
    { type: 'divider' },
    { key: 'MOOD_BOARD', label: 'Mood Board' },
    { key: 'STORYBOARD', label: 'Storyboard' },
    { key: 'SHOT_LIST', label: 'Shot List' },
    { type: 'divider' },
    { key: 'browse', label: 'Browse All Templates...' },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'browse') {
      setShowPicker(true);
    } else {
      onAddSlide(key as SlideTemplateType);
    }
  };

  return (
    <>
      <Dropdown.Button
        icon={<AppstoreOutlined />}
        menu={{ items: quickTemplates, onClick: handleMenuClick }}
        onClick={handleQuickAdd}
        disabled={disabled}
      >
        <PlusOutlined /> New Slide
      </Dropdown.Button>

      <TemplatePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleTemplateSelect}
      />
    </>
  );
};

export default NewSlideButton;
```

---

## Step 6: Integration Hook

**File**: `frontend/src/features/deck-editor/hooks/useSlideTemplates.ts`

```tsx
import { useCallback } from 'react';
import { fabric } from 'fabric';
import { SlideTemplateType } from '../templates/templateTypes';
import { getTemplate } from '../templates/templateDefinitions';
import { renderTemplateToCanvas, replacePlaceholder } from '../templates/templateRenderer';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';
import { useAssetBrowserStore, MediaAsset } from '../stores/assetBrowserStore';

export const useSlideTemplates = () => {
  const { canvas, saveHistory } = useDeckCanvasStore();
  const { openModal, setOnAssetSelect } = useAssetBrowserStore();

  const applyTemplate = useCallback((templateType: SlideTemplateType) => {
    if (!canvas) return;

    const template = getTemplate(templateType);
    renderTemplateToCanvas(canvas, template);
    saveHistory();
  }, [canvas, saveHistory]);

  const fillPlaceholder = useCallback((placeholderId: string, imageUrl: string) => {
    if (!canvas) return;

    replacePlaceholder(canvas, placeholderId, imageUrl)
      .then(() => saveHistory())
      .catch(console.error);
  }, [canvas, saveHistory]);

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
```

---

## Step 7: Export from Feature Index

**Edit**: `frontend/src/features/deck-editor/index.ts`

Add exports:

```typescript
export * from './templates/templateTypes';
export * from './templates/templateDefinitions';
export * from './templates/templateRenderer';
export * from './components/TemplatePicker';
export * from './components/NewSlideButton';
export * from './hooks/useSlideTemplates';
```

---

## Verification Checklist

After completing all steps:

1. [ ] `npm run build` in frontend completes without errors
2. [ ] Template picker modal opens with all categories
3. [ ] Clicking a template shows selection highlight
4. [ ] "Use Template" button applies template to canvas
5. [ ] Blank template creates empty slide
6. [ ] Title template shows large title in center
7. [ ] Mood Board template has correct placeholder layout
8. [ ] Shot List template shows table structure
9. [ ] Storyboard template has 6 panel layout
10. [ ] Character template has left image, right details
11. [ ] New Slide dropdown shows quick templates
12. [ ] Placeholders display with icons and labels
13. [ ] Clicking placeholders can trigger asset browser (if integrated)

---

## Common Issues

1. **Templates not rendering**: Check `renderTemplateToCanvas` is called with valid canvas
2. **Placeholders not clickable**: Ensure group objects have proper event handling
3. **Text cut off**: Check `width` property for multi-line text
4. **Wrong positioning**: Verify `originX/originY` for centered elements
5. **Background not changing**: Ensure `canvas.renderAll()` is called after setting background
