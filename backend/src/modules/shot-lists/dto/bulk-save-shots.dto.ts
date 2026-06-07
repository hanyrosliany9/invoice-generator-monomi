import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

/**
 * One desired shot in a bulk save. `id` present = update an existing shot;
 * absent = create. `sceneId` absent (or not belonging to this list) falls back
 * to the list's first scene. `order` is intentionally NOT accepted — the server
 * numbers shots per-scene by their position in the array.
 */
export class BulkSaveShotItemDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() sceneId?: string;

  @IsString() shotNumber: string;

  @IsOptional() @IsString() shotSize?: string;
  @IsOptional() @IsString() shotType?: string;
  @IsOptional() @IsString() cameraAngle?: string;
  @IsOptional() @IsString() cameraMovement?: string;
  @IsOptional() @IsString() lens?: string;
  @IsOptional() @IsString() frameRate?: string;
  @IsOptional() @IsString() camera?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() dialogue?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsInt() setupNumber?: number;
  @IsOptional() @IsInt() estimatedTime?: number;
  @IsOptional() @IsString() vfx?: string;
  @IsOptional() @IsString() sfx?: string;
}

/**
 * Replace a shot list's shots (and optionally its name/description) in one
 * atomic transaction: the full desired set is diffed against what's stored —
 * missing shots are deleted, existing ones updated, new ones created.
 */
export class BulkSaveShotsDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSaveShotItemDto)
  shots: BulkSaveShotItemDto[];
}
