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
  options: Record<string, any> = {}
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
  options: Record<string, any> = {}
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
    placeholderElement('hero', 'image', PADDING, 150, 900, 600, 'Hero Image'),
    placeholderElement('side1', 'image', 990, 150, 450, 290, 'Reference 1'),
    placeholderElement('side2', 'image', 990, 460, 450, 290, 'Reference 2'),
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
    textElement('row1-1', '1', 80, 210, { fontSize: 16, fill: '#1f2937' }),
    textElement('row1-2', 'Wide', 200, 210, { fontSize: 16, fill: '#1f2937' }),
    textElement('row1-3', 'A Cam', 400, 210, { fontSize: 16, fill: '#1f2937' }),
    textElement('row1-4', '24mm', 600, 210, { fontSize: 16, fill: '#1f2937' }),
    textElement('row1-5', 'Dolly In', 800, 210, { fontSize: 16, fill: '#1f2937' }),
    textElement('row1-6', 'Establishing shot of location', 1100, 210, { fontSize: 16, fill: '#1f2937' }),
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
    placeholderElement('panel1', 'image', PADDING, 130, 560, 315, 'Panel 1'),
    textElement('shot1', 'Shot 1:', PADDING, 455, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('desc1', 'Description...', PADDING, 475, { fontSize: 12, fill: '#6b7280' }),
    placeholderElement('panel2', 'image', 680, 130, 560, 315, 'Panel 2'),
    textElement('shot2', 'Shot 2:', 680, 455, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('desc2', 'Description...', 680, 475, { fontSize: 12, fill: '#6b7280' }),
    placeholderElement('panel3', 'image', 1300, 130, 560, 315, 'Panel 3'),
    textElement('shot3', 'Shot 3:', 1300, 455, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('desc3', 'Description...', 1300, 475, { fontSize: 12, fill: '#6b7280' }),
    placeholderElement('panel4', 'image', PADDING, 530, 560, 315, 'Panel 4'),
    textElement('shot4', 'Shot 4:', PADDING, 855, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('desc4', 'Description...', PADDING, 875, { fontSize: 12, fill: '#6b7280' }),
    placeholderElement('panel5', 'image', 680, 530, 560, 315, 'Panel 5'),
    textElement('shot5', 'Shot 5:', 680, 855, { fontSize: 14, fontWeight: 'bold', fill: '#374151' }),
    textElement('desc5', 'Description...', 680, 875, { fontSize: 12, fill: '#6b7280' }),
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
    placeholderElement('photo', 'image', PADDING, PADDING, 600, 850, 'Character Photo'),
    textElement('name', 'CHARACTER NAME', 720, PADDING, {
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#111827',
    }),
    textElement('role', 'Role / Archetype', 720, PADDING + 60, {
      fontSize: 24,
      fill: '#6b7280',
    }),
    shapeElement('divider', 'rect', 720, 160, {
      width: 400,
      height: 3,
      fill: '#3b82f6',
    }),
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
    placeholderElement('main', 'image', PADDING, PADDING, 1200, 600, 'Location Photo'),
    placeholderElement('side1', 'image', 1320, PADDING, 540, 190, 'Angle 1'),
    placeholderElement('side2', 'image', 1320, 260, 540, 190, 'Angle 2'),
    placeholderElement('side3', 'image', 1320, 470, 540, 190, 'Angle 3'),
    textElement('name', 'LOCATION NAME', PADDING, 700, {
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#111827',
    }),
    textElement('address', '123 Example Street, City, Country', PADDING, 750, {
      fontSize: 18,
      fill: '#6b7280',
    }),
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
    shapeElement('divider', 'rect', CANVAS_WIDTH / 2 - 2, 120, {
      width: 4,
      height: 700,
      fill: '#e5e7eb',
    }),
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
    textElement('generalCall', 'GENERAL CALL: ___', PADDING, 150, {
      fontSize: 24,
      fontWeight: 'bold',
      fill: '#dc2626',
    }),
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
    shapeElement('line', 'rect', 100, CANVAS_HEIGHT / 2, {
      width: CANVAS_WIDTH - 200,
      height: 4,
      fill: '#3b82f6',
    }),
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
