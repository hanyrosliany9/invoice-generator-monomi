/**
 * Maps an asset CATEGORY to its fixed-asset Chart-of-Accounts code + display name.
 * Mirrors the backend `asset-coa.util.ts` so the Assets page can group by COA the
 * same way the depreciation report does.
 */
export const ASSET_CATEGORY_COA: Record<string, string> = {
  Camera: '1-4510',
  Lens: '1-4510',
  Lensa: '1-4510',
  Lighting: '1-4550',
  'Video Equipment': '1-4530',
  'Audio Equipment': '1-4530',
  Audio: '1-4530',
  Video: '1-4530',
  Gimbal: '1-4530',
  Tripod: '1-4010',
  Computer: '1-4570',
  Laptop: '1-4570',
  Vehicle: '1-4310',
  Furniture: '1-4410',
  Building: '1-4210',
  Land: '1-4110',
  Accessories: '1-4010',
};

export const COA_NAME: Record<string, string> = {
  '1-4010': 'Peralatan',
  '1-4110': 'Tanah',
  '1-4210': 'Bangunan',
  '1-4310': 'Kendaraan',
  '1-4410': 'Perabotan Kantor',
  '1-4510': 'Kamera & Peralatan Fotografi',
  '1-4530': 'Peralatan Produksi Video & Audio',
  '1-4550': 'Peralatan Pencahayaan',
  '1-4570': 'Workstation Editing & Komputer',
};

/** Fixed-asset COA code for a category (defaults to 1-4010 Equipment). */
export function assetCoaForCategory(category?: string | null): string {
  if (!category) return '1-4010';
  return ASSET_CATEGORY_COA[category] ?? '1-4010';
}

export function coaName(code: string): string {
  return COA_NAME[code] ?? code;
}
