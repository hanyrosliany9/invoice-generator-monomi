import { ApiProperty } from "@nestjs/swagger";

export class PaginationDto {
  @ApiProperty({ description: "Current page number", example: 1 })
  page!: number;

  @ApiProperty({ description: "Number of items per page", example: 10 })
  limit!: number;

  @ApiProperty({ description: "Total number of items", example: 100 })
  total!: number;

  @ApiProperty({ description: "Total number of pages", example: 10 })
  pages!: number;
}

export class ApiResponse<T> {
  @ApiProperty({ description: "Response data" })
  data: T;

  @ApiProperty({
    description: "Response message",
    example: "Operation successful",
  })
  message: string;

  @ApiProperty({ description: "Response status", example: "success" })
  status: "success" | "error";

  @ApiProperty({ description: "Timestamp", example: "2024-01-01T00:00:00Z" })
  timestamp?: string;

  constructor(
    data: T,
    message: string,
    status: "success" | "error" = "success",
  ) {
    this.data = data;
    this.message = message;
    this.status = status;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(
    data: T,
    message: string = "Operation successful",
  ): ApiResponse<T> {
    return new ApiResponse(data, message, "success");
  }

  static error<T>(message: string, data: T = null as T): ApiResponse<T> {
    return new ApiResponse(data, message, "error");
  }
}

export class PaginatedResponse<T> extends ApiResponse<T> {
  @ApiProperty({ description: "Pagination information", type: PaginationDto })
  pagination: PaginationDto;

  constructor(
    data: T,
    pagination: PaginationDto,
    message: string = "Operation successful",
  ) {
    super(data, message);
    this.pagination = pagination;
  }
}
