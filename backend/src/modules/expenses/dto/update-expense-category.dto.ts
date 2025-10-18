import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min } from 'class-validator';

/**
 * DTO for updating an expense category
 * All fields are optional for partial updates
 */
export class UpdateExpenseCategoryDto {
  @ApiPropertyOptional({
    description: 'PSAK account code (e.g., 6-1010 for selling expenses, 6-2020 for G&A)',
    example: '6-2030',
  })
  @IsString()
  @IsOptional()
  accountCode?: string;

  @ApiPropertyOptional({
    description: 'Account name in English',
    example: 'Office Supplies Expense',
  })
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiPropertyOptional({
    description: 'Account name in English (international)',
    example: 'Office Supplies Expense',
  })
  @IsString()
  @IsOptional()
  accountNameEn?: string;

  @ApiPropertyOptional({
    description: 'Expense class: SELLING (6-1xxx), GENERAL_ADMIN (6-2xxx), or OTHER (8-xxxx)',
    enum: ['SELLING', 'GENERAL_ADMIN', 'OTHER'],
    example: 'GENERAL_ADMIN',
  })
  @IsEnum(['SELLING', 'GENERAL_ADMIN', 'OTHER'])
  @IsOptional()
  expenseClass?: 'SELLING' | 'GENERAL_ADMIN' | 'OTHER';

  @ApiPropertyOptional({
    description: 'Category name (English)',
    example: 'Office Supplies',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Category name (Indonesian)',
    example: 'Perlengkapan Kantor',
  })
  @IsString()
  @IsOptional()
  nameId?: string;

  @ApiPropertyOptional({
    description: 'Category description (English)',
    example: 'Stationery, printer supplies, and other office materials',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Category description (Indonesian)',
    example: 'Alat tulis, supplies printer, dan material kantor lainnya',
  })
  @IsString()
  @IsOptional()
  descriptionId?: string;

  @ApiPropertyOptional({
    description: 'Icon name (Ant Design icon)',
    example: 'shopping',
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Color code (hex)',
    example: '#1890ff',
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    description: 'Default withholding tax type for this category',
    enum: ['NONE', 'PPH23', 'PPH4_2', 'PPH15'],
    example: 'NONE',
  })
  @IsEnum(['NONE', 'PPH23', 'PPH4_2', 'PPH15'])
  @IsOptional()
  withholdingTaxType?: 'NONE' | 'PPH23' | 'PPH4_2' | 'PPH15';

  @ApiPropertyOptional({
    description: 'Default withholding tax rate (0-1)',
    example: 0.02,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  withholdingTaxRate?: number;

  @ApiPropertyOptional({
    description: 'Whether expenses in this category can be billed to clients',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isBillable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this category is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
