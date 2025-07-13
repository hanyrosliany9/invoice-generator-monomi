import { PaymentMethod, PaymentStatus } from "@prisma/client";

export class PaymentResponseDto {
  id!: string;
  invoiceId!: string;
  amount!: string; // Convert Decimal to string for frontend
  paymentDate!: string;
  paymentMethod!: PaymentMethod;
  transactionRef?: string;
  bankDetails?: string;
  status!: PaymentStatus;
  confirmedAt?: string;
  createdAt!: string;
  updatedAt!: string;

  // Relations
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    client: {
      id: string;
      name: string;
      email?: string;
    };
  };
}
