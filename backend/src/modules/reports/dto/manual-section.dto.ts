import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateBy,
  ValidateNested,
} from "class-validator";
import { MAX_MANUAL_CELL_CHARS } from "../utils/report-data-import";

export const GRID_COLUMN_TYPES = ["date", "number", "percent", "currency", "text"] as const;

export class ManualColumnDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsIn(GRID_COLUMN_TYPES)
  type: (typeof GRID_COLUMN_TYPES)[number];
}

/**
 * Data typed into the report builder instead of uploaded as a file.
 * `rows` are arrays of cells (text or numbers) in column order.
 */
export class ManualSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** "table" = spreadsheet grid, "metrics" = one row of headline numbers. */
  @IsOptional()
  @IsIn(["table", "metrics"])
  kind?: "table" | "metrics";

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ManualColumnDto)
  columns: ManualColumnDto[];

  @IsArray()
  @ArrayMaxSize(400)
  @IsManualRows()
  rows: unknown[][];
}

/**
 * Every row is an array of at most 30 plain cells (text up to
 * MAX_MANUAL_CELL_CHARS, finite number, boolean or empty). Bounds the payload
 * at 400 x 30 cells and keeps objects out of the stored section data.
 */
function IsManualRows(): PropertyDecorator {
  return ValidateBy({
    name: "isManualRows",
    validator: {
      validate: (value: unknown) =>
        Array.isArray(value) &&
        value.every(
          (row) =>
            Array.isArray(row) &&
            row.length <= 30 &&
            row.every(
              (v: unknown) =>
                v === null ||
                typeof v === "boolean" ||
                (typeof v === "number" && Number.isFinite(v)) ||
                (typeof v === "string" && v.length <= MAX_MANUAL_CELL_CHARS),
            ),
        ),
      defaultMessage: () =>
        `Setiap baris berisi maksimum 30 sel berupa teks (maksimum ${MAX_MANUAL_CELL_CHARS} karakter), angka, atau kosong.`,
    },
  });
}
