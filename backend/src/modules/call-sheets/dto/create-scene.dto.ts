export interface CreateCallSheetSceneDto {
  sceneNumber: string;
  sceneName?: string;
  intExt?: string; // 'INT' or 'EXT'
  dayNight?: string; // 'DAY' or 'NIGHT'
  location?: string;
  pageCount?: number;
  castIds?: string; // Comma-separated cast numbers
  description?: string;
}
