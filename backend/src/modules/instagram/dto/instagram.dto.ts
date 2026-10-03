import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsOptional } from "class-validator";
import { INSTAGRAM_SECTION_KEYS, InstagramSectionKey } from "../utils/instagram-report-builder";

export class ConnectInstagramDto {
  /** Staff only: overwrite the client's IG handle/avatar/bio even when already filled. */
  @IsOptional()
  @IsBoolean()
  syncProfile?: boolean;
}

export class DisconnectInstagramDto {
  /** Also delete every synced metric/media row ("hapus data"). Default: keep history. */
  @IsOptional()
  @IsBoolean()
  purge?: boolean;
}

export class AddInstagramSectionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(INSTAGRAM_SECTION_KEYS, { each: true })
  sections: InstagramSectionKey[];

  /** Replace this report's existing Instagram sections of the same kind (confirmed in the UI). */
  @IsOptional()
  @IsBoolean()
  replace?: boolean;

  /** Keep headline metrics whose data covers less than 80% of the month (staff confirmed). */
  @IsOptional()
  @IsBoolean()
  includePartial?: boolean;
}
