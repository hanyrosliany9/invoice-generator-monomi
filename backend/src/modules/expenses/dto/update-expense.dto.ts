import { PartialType } from "@nestjs/swagger";
import { CreateExpenseDto } from "./create-expense.dto";

/**
 * Update Expense DTO
 * All fields from CreateExpenseDto are optional for updates
 */
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
