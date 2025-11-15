import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error occurred";
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

// Standardized error handler for Indonesian business context
export function handleServiceError(
  error: unknown,
  operation: string,
  entityType: string = "data",
): never {
  console.error(`Error in ${operation}:`, error);

  // Handle Prisma-specific errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        throw new ConflictException(
          `${entityType} dengan data tersebut sudah ada`,
        );
      case "P2025":
        throw new NotFoundException(`${entityType} tidak ditemukan`);
      case "P2003":
        throw new BadRequestException(`Data terkait tidak valid`);
      case "P2014":
        throw new BadRequestException(`Operasi gagal karena konflik data`);
      default:
        throw new InternalServerErrorException(
          `Terjadi kesalahan database: ${error.message}`,
        );
    }
  }

  // Handle validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new BadRequestException("Data input tidak valid");
  }

  // Handle connection errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw new InternalServerErrorException("Tidak dapat terhubung ke database");
  }

  // Handle business logic errors
  if (
    error instanceof BadRequestException ||
    error instanceof NotFoundException ||
    error instanceof ConflictException
  ) {
    throw error;
  }

  // Handle generic errors with Indonesian context
  const message = getErrorMessage(error);
  throw new InternalServerErrorException(
    `Terjadi kesalahan pada ${operation}: ${message}`,
  );
}

// Indonesian business validation helper
export function validateIndonesianBusinessRules(data: any): void {
  // NPWP validation
  if (data.npwp && !isValidNPWP(data.npwp)) {
    throw new BadRequestException("Format NPWP tidak valid");
  }

  // Phone number validation (Indonesian format)
  // Skip validation for placeholder values like "-" or "N/A"
  if (data.phone && data.phone.trim() !== "-" && data.phone.trim().toLowerCase() !== "n/a" && !isValidIndonesianPhone(data.phone)) {
    throw new BadRequestException("Format nomor telepon Indonesia tidak valid");
  }

  // Amount validation for materai
  if (
    data.totalAmount &&
    typeof data.totalAmount === "number" &&
    data.totalAmount > 5000000
  ) {
    // Just validation, not enforcement
    console.log("Materai required for amount > 5 million IDR");
  }
}

// NPWP validation (Indonesian tax number)
function isValidNPWP(npwp: string): boolean {
  // Remove spaces and dots
  const cleanNPWP = npwp.replace(/[\s.-]/g, "");
  // NPWP format: 15 digits
  return /^\d{15}$/.test(cleanNPWP);
}

// Indonesian phone number validation
function isValidIndonesianPhone(phone: string): boolean {
  // Remove spaces, dots, and dashes
  const cleanPhone = phone.replace(/[\s.-]/g, "");
  // Indonesian phone formats: +62, 62, or 0
  return /^(\+62|62|0)[0-9]{8,13}$/.test(cleanPhone);
}

// Sanitize input for Indonesian context
export function sanitizeIndonesianInput(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Basic XSS prevention
    .substring(0, 1000); // Prevent extremely long inputs
}
