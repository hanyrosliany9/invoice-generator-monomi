import type { FabricObject } from 'fabric';

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
  properties: Partial<FabricObject> & {
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
