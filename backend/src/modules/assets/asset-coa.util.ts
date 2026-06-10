/**
 * Maps an asset CATEGORY to its fixed-asset Chart-of-Accounts code. Single source
 * of truth shared by the assets service (purchase journal + asset code) and the
 * depreciation reporting (grouping). Mirrors the historical category→account map.
 */
export const ASSET_CATEGORY_COA: Record<string, string> = {
  Camera: "1-4510",
  Lens: "1-4510",
  Lensa: "1-4510",
  Lighting: "1-4550",
  "Video Equipment": "1-4530",
  "Audio Equipment": "1-4530",
  Audio: "1-4530",
  Video: "1-4530",
  Gimbal: "1-4530",
  Tripod: "1-4010",
  Computer: "1-4570",
  Laptop: "1-4570",
  Vehicle: "1-4310",
  Furniture: "1-4410",
  Building: "1-4210",
  Land: "1-4110",
  Accessories: "1-4010",
};

/** Fixed-asset COA code for a category (defaults to 1-4010 Equipment). */
export function assetCoaForCategory(category?: string | null): string {
  if (!category) return "1-4010";
  return ASSET_CATEGORY_COA[category] ?? "1-4010";
}

/** 3-letter asset-code prefix per fixed-asset COA, e.g. 1-4510 → PHE. */
export const ASSET_COA_PREFIX: Record<string, string> = {
  "1-4010": "EQP", // General Equipment
  "1-4110": "LND", // Land
  "1-4210": "BLD", // Buildings
  "1-4310": "VHC", // Vehicles
  "1-4410": "FNF", // Office Furniture & Fixtures
  "1-4510": "PHE", // Photography Equipment
  "1-4530": "VAP", // Video & Audio Production Equipment
  "1-4550": "LTE", // Lighting Equipment
  "1-4570": "WSC", // Editing Workstations & Computers
};

/**
 * Asset code in the form PREFIX-COA#-NNN, e.g. PHE-4510-001 for the first
 * Photography Equipment (1-4510) asset.
 */
export function assetCodeForCoa(coaCode: string, sequence: number): string {
  const prefix = ASSET_COA_PREFIX[coaCode] ?? "AST";
  const coaNum = coaCode.replace(/^1-/, ""); // 1-4510 → 4510
  return `${prefix}-${coaNum}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Estimated straight-line useful life (years) per fixed-asset COA category.
 * General/Photography/Video-Audio/Lighting/Computers = 4yr (Kelompok I);
 * Office Furniture = 8yr (Kelompok II); Buildings 20yr, Vehicles 8yr.
 */
export const ASSET_COA_USEFUL_LIFE: Record<string, number> = {
  "1-4010": 4, // General Equipment
  "1-4110": 20, // Land (kept for completeness)
  "1-4210": 20, // Buildings
  "1-4310": 8, // Vehicles
  "1-4410": 8, // Office Furniture & Fixtures
  "1-4510": 4, // Photography Equipment
  "1-4530": 4, // Video & Audio Production Equipment
  "1-4550": 4, // Lighting Equipment
  "1-4570": 4, // Editing Workstations & Computers
};

/** Default straight-line useful life (years) for a COA (defaults to 4). */
export function usefulLifeYearsForCoa(coaCode: string): number {
  return ASSET_COA_USEFUL_LIFE[coaCode] ?? 4;
}

/**
 * Canonical asset CATEGORY for a fixed-asset COA — the reverse of
 * assetCoaForCategory, used when auto-registering an asset from a Pembelian
 * purchase line (where only the COA is known). The chosen category round-trips:
 * assetCoaForCategory(categoryForCoa(coa)) === coa, and feeds the right Kelompok.
 */
export const ASSET_COA_CATEGORY: Record<string, string> = {
  "1-4010": "Equipment",
  "1-4110": "Land",
  "1-4210": "Building",
  "1-4310": "Vehicle",
  "1-4410": "Furniture",
  "1-4510": "Camera",
  "1-4530": "Video Equipment",
  "1-4550": "Lighting",
  "1-4570": "Computer",
};

/** Canonical asset category for a fixed-asset COA (defaults to "Equipment"). */
export function categoryForCoa(coaCode: string): string {
  return ASSET_COA_CATEGORY[coaCode] ?? "Equipment";
}

/** True if the COA code is a fixed-asset COST account we auto-register assets for. */
export function isFixedAssetCostCoa(coaCode?: string | null): boolean {
  if (!coaCode) return false;
  return Object.prototype.hasOwnProperty.call(ASSET_COA_PREFIX, coaCode);
}
