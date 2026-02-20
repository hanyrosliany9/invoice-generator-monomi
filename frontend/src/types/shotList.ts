export type ShotStatus = 'PLANNED' | 'IN_PROGRESS' | 'SHOT' | 'WRAPPED' | 'CUT';

export interface Shot {
  id: string;
  sceneId: string;
  shotNumber: string;
  order: number;
  shotSize?: string;
  shotType?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  lens?: string;
  frameRate?: string;
  camera?: string;
  description?: string;
  action?: string;
  dialogue?: string;
  notes?: string;
  storyboardUrl?: string;
  storyboardKey?: string;
  setupNumber?: number;
  estimatedTime?: number;
  status: ShotStatus;
  vfx?: string;
  sfx?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShotListScene {
  id: string;
  shotListId: string;
  sceneNumber: string;
  name: string;
  location?: string;
  intExt?: string;
  dayNight?: string;
  description?: string;
  order: number;
  shots: Shot[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ShotList {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  project?: { id: string; name: string; description?: string };
  createdById: string;
  createdBy?: { id: string; name: string };
  scenes: ShotListScene[];
  createdAt: string;
  updatedAt: string;
}
