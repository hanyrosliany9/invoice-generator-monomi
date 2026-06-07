import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

/**
 * One desired element in a bulk save. `id` is ignored on the server — the bulk
 * replace deletes the slide's existing elements and re-creates the incoming set
 * fresh, numbering `zIndex` by array order. Position fields are percentages of
 * the slide (0–100). `content` holds the type-specific JSON.
 */
export class BulkSaveElementItemDto {
  @IsOptional() @IsString() id?: string;

  @IsString() type: string;

  @IsOptional() @IsNumber() x?: number;
  @IsOptional() @IsNumber() y?: number;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsNumber() rotation?: number;
  @IsOptional() @IsNumber() zIndex?: number;

  @IsOptional() @IsObject() content?: Record<string, any>;
  @IsOptional() @IsBoolean() isLocked?: boolean;
}

/**
 * Replace a slide's elements in one atomic transaction: the slide's existing
 * elements are deleted and the full desired set is re-created. Mirrors the
 * shot-list bulk save strategy.
 */
export class BulkSaveElementsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSaveElementItemDto)
  elements: BulkSaveElementItemDto[];
}
