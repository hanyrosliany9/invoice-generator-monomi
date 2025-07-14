import { ProjectStatus } from "@prisma/client";

export class ProjectResponseDto {
  id: string;
  number: string;
  description: string;
  output: string;
  projectType: {
    id: string;
    code: string;
    name: string;
    prefix: string;
    color: string;
  };
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  estimatedBudget?: string; // Convert Decimal to string
  createdAt: string;
  updatedAt: string;

  // Client reference
  client: {
    id: string;
    name: string;
    email?: string;
    company?: string;
  };

  // Relations - summary counts only
  _count?: {
    quotations: number;
    invoices: number;
  };

  // Project progress
  progress?: {
    quotationsApproved: number;
    invoicesPaid: number;
    totalRevenue: string;
  };
}
