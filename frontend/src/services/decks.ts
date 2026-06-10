import { apiClient } from '../config/api';
import type {
  Deck,
  DeckSlide,
  DeckSlideElement,
  DeckSlideComment,
  DeckCollaborator,
  CreateDeckDto,
  UpdateDeckDto,
  CreateSlideDto,
  UpdateSlideDto,
  CreateElementDto,
  UpdateElementDto,
} from '../types/deck';

// Decks
export const decksApi = {
  create: async (data: CreateDeckDto): Promise<Deck> => {
    const response = await apiClient.post('/decks', data);
    return response.data.data;
  },

  getAll: async (filters?: { status?: string; clientId?: string; projectId?: string }): Promise<Deck[]> => {
    const response = await apiClient.get('/decks', { params: filters });
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Deck> => {
    const response = await apiClient.get(`/decks/${id}`);
    return response.data.data;
  },

  update: async (id: string, data: UpdateDeckDto): Promise<Deck> => {
    const response = await apiClient.put(`/decks/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/decks/${id}`);
  },

  // Import a .pptx file (PowerPoint, or Google Slides via File → Download →
  // .pptx) as a new deck. Server parses slides/text/images into native
  // deck elements.
  importPptx: async (
    file: File,
    options?: { title?: string; clientId?: string; projectId?: string },
  ): Promise<Deck & { importWarnings?: Record<string, number> }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.title) formData.append('title', options.title);
    if (options?.clientId) formData.append('clientId', options.clientId);
    if (options?.projectId) formData.append('projectId', options.projectId);
    const response = await apiClient.post('/decks/import/pptx', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Large decks with many embedded images can take a while to parse+upload.
      timeout: 300000,
    });
    return response.data.data;
  },

  duplicate: async (id: string, title?: string): Promise<Deck> => {
    const response = await apiClient.post(`/decks/${id}/duplicate`, { title });
    return response.data.data;
  },

  enablePublicSharing: async (id: string, accessLevel?: string): Promise<Deck> => {
    const response = await apiClient.post(`/decks/${id}/enable-public-sharing`, { accessLevel });
    return response.data.data;
  },

  disablePublicSharing: async (id: string): Promise<Deck> => {
    const response = await apiClient.post(`/decks/${id}/disable-public-sharing`);
    return response.data.data;
  },

  setPublicAccessLevel: async (id: string, accessLevel: string): Promise<Deck> => {
    const response = await apiClient.post(`/decks/${id}/set-public-access-level`, { accessLevel });
    return response.data.data;
  },

  getPublic: async (token: string): Promise<Deck> => {
    const response = await apiClient.get(`/deck-public/${token}`);
    return response.data.data;
  },

  createPublicComment: async (
    token: string,
    data: {
      slideId: string;
      content: string;
      guestName?: string;
      guestEmail?: string;
      parentId?: string;
      positionX?: number;
      positionY?: number;
    },
  ): Promise<DeckSlideComment> => {
    const response = await apiClient.post(`/deck-public/${token}/comment`, data);
    return response.data.data;
  },

  getPublicComments: async (token: string, slideId: string): Promise<DeckSlideComment[]> => {
    const response = await apiClient.get(`/deck-public/${token}/comments/${slideId}`);
    return response.data.data || [];
  },

  startPublicExportPdf: async (token: string): Promise<{ jobId: string }> => {
    const response = await apiClient.post(`/deck-public/${token}/export-pdf`);
    return response.data;
  },

  getPublicExportPdfStatus: async (token: string, jobId: string): Promise<{ status: string; progress: number; filePath?: string }> => {
    const response = await apiClient.get(`/deck-public/${token}/export-pdf/status/${jobId}`);
    return response.data;
  },
};

// Slides
export const slidesApi = {
  create: async (data: CreateSlideDto): Promise<DeckSlide> => {
    const response = await apiClient.post('/deck-slides', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateSlideDto): Promise<DeckSlide> => {
    const response = await apiClient.put(`/deck-slides/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/deck-slides/${id}`);
  },

  duplicate: async (id: string): Promise<DeckSlide> => {
    const response = await apiClient.post(`/deck-slides/${id}/duplicate`);
    return response.data.data;
  },

  reorder: async (deckId: string, slideIds: string[]): Promise<DeckSlide[]> => {
    const response = await apiClient.post(`/deck-slides/reorder/${deckId}`, { slideIds });
    return response.data.data || [];
  },

  setBackground: async (id: string, url: string, key: string): Promise<DeckSlide> => {
    const response = await apiClient.post(`/deck-slides/${id}/background`, { url, key });
    return response.data.data;
  },
};

// Elements
export const elementsApi = {
  create: async (data: CreateElementDto): Promise<DeckSlideElement> => {
    const response = await apiClient.post('/deck-elements', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateElementDto): Promise<DeckSlideElement> => {
    const response = await apiClient.put(`/deck-elements/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/deck-elements/${id}`);
  },

  // Atomically replace ALL elements for a slide (bulk save). Returns the slide
  // with its persisted elements.
  bulkSaveForSlide: async (
    slideId: string,
    elements: Partial<DeckSlideElement>[],
  ): Promise<DeckSlide> => {
    const response = await apiClient.put(
      `/deck-elements/slide/${slideId}/bulk`,
      { elements },
    );
    return response.data.data;
  },

  bringToFront: async (id: string): Promise<DeckSlideElement> => {
    const response = await apiClient.post(`/deck-elements/${id}/bring-to-front`);
    return response.data.data;
  },

  sendToBack: async (id: string): Promise<DeckSlideElement> => {
    const response = await apiClient.post(`/deck-elements/${id}/send-to-back`);
    return response.data.data;
  },
};

// Comments
export const commentsApi = {
  create: async (data: { slideId: string; content: string; parentId?: string; positionX?: number; positionY?: number }): Promise<DeckSlideComment> => {
    const response = await apiClient.post('/deck-comments', data);
    return response.data.data;
  },

  getBySlide: async (slideId: string): Promise<DeckSlideComment[]> => {
    const response = await apiClient.get(`/deck-comments/slide/${slideId}`);
    return response.data.data || [];
  },

  resolve: async (id: string): Promise<DeckSlideComment> => {
    const response = await apiClient.post(`/deck-comments/${id}/resolve`);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/deck-comments/${id}`);
  },
};

// Collaborators
export const collaboratorsApi = {
  invite: async (data: {
    deckId: string;
    userId?: string;
    guestEmail?: string;
    guestName?: string;
    role: string;
    expiresAt?: string;
  }): Promise<DeckCollaborator> => {
    const response = await apiClient.post('/deck-collaborators/invite', data);
    return response.data.data;
  },

  getByDeck: async (deckId: string): Promise<DeckCollaborator[]> => {
    const response = await apiClient.get(`/deck-collaborators/deck/${deckId}`);
    return response.data.data || [];
  },

  updateRole: async (id: string, role: string): Promise<DeckCollaborator> => {
    const response = await apiClient.put(`/deck-collaborators/${id}/role`, { role });
    return response.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/deck-collaborators/${id}`);
  },

  acceptInvite: async (token: string, name: string, email: string): Promise<DeckCollaborator> => {
    const response = await apiClient.post(`/deck-public/accept-invite/${token}`, { name, email });
    return response.data.data;
  },
};
