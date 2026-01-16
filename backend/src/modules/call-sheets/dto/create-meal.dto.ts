import { IsString, IsInt, IsOptional, IsEnum } from "class-validator";

export class CreateMealDto {
  @IsEnum(["BREAKFAST", "LUNCH", "SECOND_MEAL", "CRAFT_SERVICES", "CATERING"])
  mealType: string;

  @IsString()
  time: string;

  @IsOptional()
  @IsInt()
  duration?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMealDto {
  @IsOptional()
  @IsEnum(["BREAKFAST", "LUNCH", "SECOND_MEAL", "CRAFT_SERVICES", "CATERING"])
  mealType?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsInt()
  duration?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
