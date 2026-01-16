import { IsArray, IsEnum, IsString, IsOptional } from "class-validator";

export class VisualizationConfig {
  @IsEnum(["line", "bar", "pie", "area", "table", "metric_card"])
  type: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  xAxis?: string; // Column name

  @IsOptional()
  yAxis?: string | string[]; // Column name(s)

  @IsOptional()
  @IsString()
  groupBy?: string;

  @IsOptional()
  @IsString()
  metric?: string;

  @IsOptional()
  @IsEnum(["sum", "avg", "count", "min", "max"])
  aggregation?: string;

  @IsOptional()
  @IsArray()
  colors?: string[];
}

export class UpdateVisualizationsDto {
  @IsArray()
  visualizations: VisualizationConfig[];
}
