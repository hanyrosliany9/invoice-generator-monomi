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

  getPublic: async (token: string): Promise<Deck> => {
    const response = await apiClient.get(`/deck-public/${token}`);
    return response.data.data;
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
