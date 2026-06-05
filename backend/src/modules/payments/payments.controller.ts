import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  HttpException,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto, UpdatePaymentDto, PaymentResponseDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RequireAdmin } from "../auth/decorators/auth.decorators";
import { ApiResponse } from "../../common/dto/api-response.dto";
import { getErrorMessage } from "../../common/utils/error-handling.util";

@Controller("payments")
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequireAdmin()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 payments per minute (fraud protection)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    // FIX 4 (MED): Return the raw entity so the global ResponseInterceptor wraps
    // it exactly once.  Previously the controller returned a manually-constructed
    // {data,message,status} object which the interceptor then wrapped again,
    // producing a double-nested response.
    try {
      return await this.paymentsService.create(createPaymentDto);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(
        getErrorMessage(error) || "Failed to create payment",
      );
    }
  }

  @Get()
  async findAll(
    @Query("invoiceId") invoiceId?: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    // Returns { data, pagination }; the global ResponseInterceptor passes it
    // through unwrapped because the "pagination" key is present.
    return this.paymentsService.findAll(invoiceId, page, limit);
  }

  @Get("stats")
  async getStats(
    @Query("invoiceId") invoiceId?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const stats = await this.paymentsService.getPaymentStats(invoiceId);
      return {
        data: stats,
        message: "Payment statistics retrieved successfully",
        status: "success",
      };
    } catch (error) {
      return {
        data: null,
        message:
          getErrorMessage(error) || "Failed to retrieve payment statistics",
        status: "error",
      };
    }
  }

  @Get("invoice/:invoiceId")
  async getByInvoice(
    @Param("invoiceId") invoiceId: string,
  ): Promise<ApiResponse<PaymentResponseDto[]>> {
    try {
      const payments =
        await this.paymentsService.getPaymentsByInvoice(invoiceId);
      return {
        data: payments,
        message: "Invoice payments retrieved successfully",
        status: "success",
      };
    } catch (error) {
      return {
        data: [],
        message:
          getErrorMessage(error) || "Failed to retrieve invoice payments",
        status: "error",
      };
    }
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
  ): Promise<ApiResponse<PaymentResponseDto>> {
    try {
      const payment = await this.paymentsService.findOne(id);
      return {
        data: payment,
        message: "Payment retrieved successfully",
        status: "success",
      };
    } catch (error) {
      throw new NotFoundException(
        getErrorMessage(error) || "Failed to retrieve payment",
      );
    }
  }

  @Patch(":id")
  @RequireAdmin()
  async update(
    @Param("id") id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req: any,
  ): Promise<ApiResponse<PaymentResponseDto>> {
    try {
      const payment = await this.paymentsService.update(id, updatePaymentDto, req.user?.id);
      return {
        data: payment,
        message: "Payment updated successfully",
        status: "success",
      };
    } catch (error) {
      throw new BadRequestException(
        getErrorMessage(error) || "Failed to update payment",
      );
    }
  }

  @Patch(":id/confirm")
  @RequireAdmin()
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @Param("id") id: string,
    @Request() req: any,
  ): Promise<PaymentResponseDto> {
    // FIX 4: Pass real userId so journal entries are attributed to the acting user.
    try {
      return await this.paymentsService.update(
        id,
        {
          status: "CONFIRMED" as any,
          confirmedAt: new Date().toISOString(),
        },
        req.user?.id,
      );
    } catch (error) {
      throw new BadRequestException(
        getErrorMessage(error) || "Failed to confirm payment",
      );
    }
  }

  @Delete(":id")
  @RequireAdmin()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<ApiResponse<null>> {
    try {
      await this.paymentsService.remove(id);
      return {
        data: null,
        message: "Payment deleted successfully",
        status: "success",
      };
    } catch (error) {
      return {
        data: null,
        message: getErrorMessage(error) || "Failed to delete payment",
        status: "error",
      };
    }
  }
}
