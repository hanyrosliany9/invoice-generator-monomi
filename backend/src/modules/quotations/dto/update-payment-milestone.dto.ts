import { PartialType } from "@nestjs/mapped-types";
import { CreatePaymentMilestoneDto } from "./create-payment-milestone.dto";

/**
 * DTO for updating a payment milestone
 * Allows partial updates of milestone data
 */
export class UpdatePaymentMilestoneDto extends PartialType(
  CreatePaymentMilestoneDto,
) {}
