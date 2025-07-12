import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocalizationService } from './localization.service';
import { CalculateVATDto, FormatCurrencyDto, ValidateBusinessDataDto } from './dto';
import { getErrorMessage } from '../../common/utils/error-handling.util';

@ApiTags('localization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('localization')
export class LocalizationController {
  constructor(private readonly localizationService: LocalizationService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get Indonesian business configuration' })
  @ApiResponse({
    status: 200,
    description: 'Indonesian business configuration retrieved successfully'
  })
  async getIndonesianBusinessConfig() {
    try {
      const config = this.localizationService.getIndonesianBusinessConfig();
      return {
        data: config,
        message: 'Indonesian business configuration retrieved successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get available payment methods' })
  @ApiResponse({
    status: 200,
    description: 'Payment methods retrieved successfully'
  })
  async getPaymentMethods(
    @Query('includeUnavailable') includeUnavailable: string = 'false',
    @Query('type') type?: string
  ) {
    try {
      let paymentMethods;
      
      if (type) {
        paymentMethods = this.localizationService.getPaymentMethodsByType(type as any);
      } else {
        paymentMethods = this.localizationService.getPaymentMethods(includeUnavailable === 'true');
      }
      
      return {
        data: paymentMethods,
        message: 'Payment methods retrieved successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Get('payment-methods/popular')
  @ApiOperation({ summary: 'Get popular payment methods in Indonesia' })
  @ApiResponse({
    status: 200,
    description: 'Popular payment methods retrieved successfully'
  })
  async getPopularPaymentMethods() {
    try {
      const paymentMethods = this.localizationService.getPopularPaymentMethods();
      return {
        data: paymentMethods,
        message: 'Popular payment methods retrieved successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Get('payment-methods/:id')
  @ApiOperation({ summary: 'Get payment method by ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment method retrieved successfully'
  })
  async getPaymentMethodById(@Param('id') id: string) {
    try {
      const paymentMethod = this.localizationService.getPaymentMethodById(id);
      
      if (!paymentMethod) {
        return {
          data: null,
          message: 'Payment method not found',
          status: 'error'
        };
      }
      
      return {
        data: paymentMethod,
        message: 'Payment method retrieved successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Post('format-currency')
  @ApiOperation({ summary: 'Format amount as Indonesian currency' })
  @ApiResponse({
    status: 200,
    description: 'Currency formatted successfully'
  })
  async formatCurrency(@Body() formatCurrencyDto: FormatCurrencyDto) {
    try {
      const formatted = this.localizationService.formatCurrency(formatCurrencyDto.amount);
      const inWords = this.localizationService.formatAmountInWords(formatCurrencyDto.amount);
      
      return {
        data: {
          amount: formatCurrencyDto.amount,
          formatted,
          inWords
        },
        message: 'Currency formatted successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Post('calculate-vat')
  @ApiOperation({ summary: 'Calculate VAT for Indonesian business' })
  @ApiResponse({
    status: 200,
    description: 'VAT calculated successfully'
  })
  async calculateVAT(@Body() calculateVATDto: CalculateVATDto) {
    try {
      const vatAmount = this.localizationService.calculateVAT(calculateVATDto.amount);
      const totalWithVAT = this.localizationService.calculateTotalWithVAT(calculateVATDto.amount);
      
      return {
        data: {
          amount: calculateVATDto.amount,
          vatAmount,
          totalWithVAT,
          vatRate: this.localizationService.getIndonesianBusinessConfig().vatRate
        },
        message: 'VAT calculated successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Post('validate-business-data')
  @ApiOperation({ summary: 'Validate Indonesian business data' })
  @ApiResponse({
    status: 200,
    description: 'Business data validated successfully'
  })
  async validateBusinessData(@Body() validateBusinessDataDto: ValidateBusinessDataDto) {
    try {
      const results = {
        phone: validateBusinessDataDto.phone ? 
          this.localizationService.validateIndonesianPhone(validateBusinessDataDto.phone) : null,
        npwp: validateBusinessDataDto.npwp ? 
          this.localizationService.validateNPWP(validateBusinessDataDto.npwp) : null,
        formattedNPWP: validateBusinessDataDto.npwp ? 
          this.localizationService.formatNPWP(validateBusinessDataDto.npwp) : null
      };
      
      return {
        data: results,
        message: 'Business data validated successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Get('provinces')
  @ApiOperation({ summary: 'Get Indonesian provinces' })
  @ApiResponse({
    status: 200,
    description: 'Indonesian provinces retrieved successfully'
  })
  async getIndonesianProvinces() {
    try {
      const provinces = this.localizationService.getIndonesianProvinces();
      return {
        data: provinces,
        message: 'Indonesian provinces retrieved successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get Indonesian business document templates' })
  @ApiResponse({
    status: 200,
    description: 'Document templates retrieved successfully'
  })
  async getDocumentTemplates() {
    try {
      const templates = this.localizationService.getDocumentTemplates();
      const terms = this.localizationService.getTermsAndConditions();
      
      return {
        data: {
          templates,
          termsAndConditions: terms
        },
        message: 'Document templates retrieved successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }

  @Get('working-days/check/:date')
  @ApiOperation({ summary: 'Check if date is working day in Indonesia' })
  @ApiResponse({
    status: 200,
    description: 'Working day check completed successfully'
  })
  async checkWorkingDay(@Param('date') dateStr: string) {
    try {
      const date = new Date(dateStr);
      const isWorkingDay = this.localizationService.isWorkingDay(date);
      const isBankHoliday = this.localizationService.isIndonesianBankHoliday(date);
      const nextWorkingDay = this.localizationService.getNextWorkingDay(date);
      
      return {
        data: {
          date: dateStr,
          isWorkingDay,
          isBankHoliday,
          nextWorkingDay: nextWorkingDay.toISOString().split('T')[0]
        },
        message: 'Working day check completed successfully',
        status: 'success'
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error),
        status: 'error'
      };
    }
  }
}
