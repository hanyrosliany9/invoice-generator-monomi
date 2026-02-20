export type SlideTemplate =
  | 'TITLE'
  | 'TITLE_CONTENT'
  | 'TWO_COLUMN'
  | 'FULL_MEDIA'
  | 'MOOD_BOARD'
  | 'CHARACTER'
  | 'SHOT_LIST'
  | 'SCHEDULE'
  | 'COMPARISON'
  | 'BLANK'
  | 'STORYBOARD'
  | 'LOCATION'
  | 'SCRIPT_BREAKDOWN'
  | 'CALL_SHEET'
  | 'GRID_4'
  | 'GRID_6'
  | 'TIMELINE';

export type DeckStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CollaboratorRole = 'OWNER' | 'EDITOR' | 'COMMENTER' | 'VIEWER';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface DeckTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
}

export interface Deck {
  id: string;
  title: string;
  description?: string;
  status: DeckStatus;
  theme?: DeckTheme;
  slideWidth: number;
  slideHeight: number;
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  clientId?: string;
  client?: { id: string; name: string };
  projectId?: string;
  project?: { id: string; name: string; projectNumber?: string };
  mediaProjectId?: string;
  mediaProject?: { id: string; name: string; assets?: any[] };
  isPublic: boolean;
  publicShareToken?: string;
  publicShareUrl?: string;
  publicViewCount: number;
  slides: DeckSlide[];
  collaborators: DeckCollaborator[];
  _count?: { slides: number; collaborators: number };
  createdAt: string;
  updatedAt: string;
}

export interface DeckSlide {
  id: string;
  deckId: string;
  order: number;
  template: SlideTemplate;
  title?: string;
  subtitle?: string;
  content: Record<string, any>;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundImageKey?: string;
  notes?: string;
  transition?: string;
  transitionDuration?: number;
  elements: DeckSlideElement[];
  _count?: { comments: number };
  createdAt: string;
  updatedAt: string;
}

export interface DeckSlideElement {
  id: string;
  slideId: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHAPE' | 'ICON';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: Record<string, any>;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeckSlideComment {
  id: string;
  slideId: string;
  userId?: string;
  user?: { id: string; name: string; email: string };
  guestName?: string;
  guestEmail?: string;
  content: string;
  positionX?: number;
  positionY?: number;
  parentId?: string;
  replies?: DeckSlideComment[];
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeckCollaborator {
  id: string;
  deckId: string;
  userId?: string;
  user?: { id: string; name: string; email: string };
  guestEmail?: string;
  guestName?: string;
  role: CollaboratorRole;
  inviteToken?: string;
  invitedBy: string;
  inviter: { id: string; name: string };
  status: InviteStatus;
  expiresAt?: string;
  acceptedAt?: string;
  createdAt: string;
}

// DTOs
export interface CreateDeckDto {
  title: string;
  description?: string;
  clientId?: string;
  projectId?: string;
  mediaProjectId?: string;
  theme?: DeckTheme;
  slideWidth?: number;
  slideHeight?: number;
}

export interface UpdateDeckDto extends Partial<CreateDeckDto> {
  status?: DeckStatus;
}

export interface CreateSlideDto {
  deckId: string;
  order?: number;
  template?: SlideTemplate;
  title?: string;
  subtitle?: string;
  content?: Record<string, any>;
  backgroundColor?: string;
  notes?: string;
}

export interface UpdateSlideDto extends Partial<Omit<CreateSlideDto, 'deckId'>> {
  transition?: string;
  transitionDuration?: number;
}

export interface CreateElementDto {
  slideId: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHAPE' | 'ICON';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  content?: Record<string, any>;
  isLocked?: boolean;
}

export interface UpdateElementDto extends Partial<Omit<CreateElementDto, 'slideId'>> {}
