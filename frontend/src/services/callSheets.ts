import { apiClient } from '../config/api';
import type {
  CallSheet,
  CreateCallSheetDto,
  CreateCastCallDto,
  CreateCrewCallDto,
  CreateMealDto,
  CreateCompanyMoveDto,
  CreateSpecialReqDto,
  CreateBackgroundDto,
  MealBreak,
  CompanyMove,
  SpecialRequirement,
  BackgroundCall,
} from '../types/callSheet';

export const callSheetsApi = {
  getAll: async (): Promise<CallSheet[]> => {
    const res = await apiClient.get(`/call-sheets`);
    return res.data.data;
  },

  getBySchedule: async (scheduleId: string): Promise<CallSheet[]> => {
    const res = await apiClient.get(`/call-sheets?scheduleId=${scheduleId}`);
    return res.data.data;
  },

  getById: async (id: string): Promise<CallSheet> => {
    const res = await apiClient.get(`/call-sheets/${id}`);
    return res.data.data;
  },

  create: async (dto: CreateCallSheetDto): Promise<CallSheet> => {
    const res = await apiClient.post('/call-sheets', dto);
    return res.data.data;
  },

  update: async (id: string, dto: Partial<CallSheet>): Promise<CallSheet> => {
    const res = await apiClient.put(`/call-sheets/${id}`, dto);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/call-sheets/${id}`);
  },

  // Cast
  addCast: async (
    callSheetId: string,
    dto: CreateCastCallDto
  ): Promise<void> => {
    await apiClient.post(`/call-sheets/${callSheetId}/cast`, dto);
  },

  updateCast: async (
    id: string,
    dto: Partial<CreateCastCallDto>
  ): Promise<void> => {
    await apiClient.put(`/call-sheets/cast/${id}`, dto);
  },

  removeCast: async (id: string): Promise<void> => {
    await apiClient.delete(`/call-sheets/cast/${id}`);
  },

  // Crew
  addCrew: async (
    callSheetId: string,
    dto: CreateCrewCallDto
  ): Promise<void> => {
    await apiClient.post(`/call-sheets/${callSheetId}/crew`, dto);
  },

  updateCrew: async (
    id: string,
    dto: Partial<CreateCrewCallDto>
  ): Promise<void> => {
    await apiClient.put(`/call-sheets/crew/${id}`, dto);
  },

  removeCrew: async (id: string): Promise<void> => {
    await apiClient.delete(`/call-sheets/crew/${id}`);
  },

  // PDF Export
  generatePDF: async (id: string, continuous: boolean = true): Promise<Blob> => {
    const res = await apiClient.get(`/pdf/call-sheet/${id}`, {
      params: { continuous: continuous ? 'true' : 'false' },
      responseType: 'blob',
    });
    return res.data;
  },

  previewPDF: async (id: string, continuous: boolean = true): Promise<Blob> => {
    const res = await apiClient.get(`/pdf/call-sheet/${id}/preview`, {
      params: { continuous: continuous ? 'true' : 'false' },
      responseType: 'blob',
    });
    return res.data;
  },

  // Auto-fill endpoints
  autoFillAll: async (id: string): Promise<CallSheet> => {
    const res = await apiClient.post(`/call-sheets/${id}/auto-fill`);
    return res.data.data;
  },

  autoFillWeather: async (id: string): Promise<CallSheet> => {
    const res = await apiClient.post(`/call-sheets/${id}/auto-fill/weather`);
    return res.data.data;
  },

  autoFillSunTimes: async (id: string): Promise<CallSheet> => {
    const res = await apiClient.post(`/call-sheets/${id}/auto-fill/sun-times`);
    return res.data.data;
  },

  autoFillHospital: async (id: string): Promise<CallSheet> => {
    const res = await apiClient.post(`/call-sheets/${id}/auto-fill/hospital`);
    return res.data.data;
  },

  searchHospitals: async (id: string): Promise<Array<{ id: string; name: string; address: string; phone: string; distance: number }>> => {
    const res = await apiClient.get(`/call-sheets/${id}/search-hospitals`);
    return res.data.data;
  },

  // Address search via backend proxy (avoids CORS issues with Nominatim)
  searchAddresses: async (query: string): Promise<Array<{ value: string; label: string }>> => {
    try {
      const res = await apiClient.get(`/call-sheets/search/addresses`, {
        params: { q: query }
      });
      // Backend wraps response in ApiResponse: { data: [...], message, status, timestamp }
      const results = res.data?.data || res.data || [];
      console.log('[callSheetsApi.searchAddresses] Raw response:', res.data);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('[callSheetsApi.searchAddresses] Error:', error);
      return [];
    }
  },

  // Scenes
  addScene: async (
    callSheetId: string,
    dto: any
  ): Promise<void> => {
    await apiClient.post(`/call-sheets/${callSheetId}/scenes`, dto);
  },

  removeScene: async (id: string): Promise<void> => {
    await apiClient.delete(`/call-sheets/scenes/${id}`);
  },

  // === MEAL BREAKS ===
  addMeal: async (callSheetId: string, dto: CreateMealDto): Promise<MealBreak> => {
    const res = await apiClient.post(`/call-sheets/${callSheetId}/meals`, dto);
    return res.data.data;
  },

  updateMeal: async (id: string, dto: Partial<CreateMealDto>): Promise<MealBreak> => {
    const res = await apiClient.put(`/call-sheets/meals/${id}`, dto);
    return res.data.data;
  },

  removeMeal: async (id: string): Promise<void> => {
    await apiClient.delete(`/call-sheets/meals/${id}`);
  },

  // === COMPANY MOVES ===
  addMove: async (callSheetId: string, dto: CreateCompanyMoveDto): Promise<CompanyMove> => {
    const res = await apiClient.post(`/call-sheets/${callSheetId}/moves`, dto);
    return res.data.data;
  },

  updateMove: async (id: string, dto: Partial<CreateCompanyMoveDto>): Promise<CompanyMove> => {
    const res = await apiClient.put(`/call-sheets/moves/${id}`, dto);
    return res.data.data;
  },

  removeMove: async (id: string): Promise<void> => {
    await apiClient.delete(`/call-sheets/moves/${id}`);
  },

  // === SPECIAL REQUIREMENTS ===
  addSpecialReq: async (callSheetId: string, dto: CreateSpecialReqDto): Promise<SpecialRequirement> => {
    const res = await apiClient.post(`/call-sheets/${callSheetId}/special-reqs`, dto);
    return res.data.data;
  },

  updateSpecialReq: async (id: string, dto: Partial<CreateSpecialReqDto>): Promise<SpecialRequirement> => {
    const res = await apiClient.put(`/call-sheets/special-reqs/${id}`, dto);
    return res.data.data;
  },

  removeSpecialReq: async (id: string): Promise<void> => {
    await apiClient.delete(`/call-sheets/special-reqs/${id}`);
  },

  // === BACKGROUND/EXTRAS ===
  addBackground: async (callSheetId: string, dto: CreateBackgroundDto): Promise<BackgroundCall> => {
    const res = await apiClient.post(`/call-sheets/${callSheetId}/background`, dto);
    return res.data.data;
  },

  updateBackground: async (id: string, dto: Partial<CreateBackgroundDto>): Promise<BackgroundCall> => {
    const res = await apiClient.put(`/call-sheets/background/${id}`, dto);
    return res.data.data;
  },

  removeBackground: async (id: string): Promise<void> => {
    await apiClient.delete(`/call-sheets/background/${id}`);
  },
};
