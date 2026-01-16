// System Controller - Provides system-level information
import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("system")
@Controller("system")
export class SystemController {
  /**
   * Get current server time in Asia/Jakarta timezone
   * This endpoint is used by frontend for time synchronization
   */
  @Get("time")
  @ApiOperation({
    summary: "Get current server time",
    description:
      "Returns the current server time in ISO 8601 format for time synchronization",
  })
  @ApiResponse({
    status: 200,
    description: "Current server time",
    schema: {
      example: {
        status: "success",
        message: "Current server time",
        data: {
          currentTime: "2025-11-10T21:30:45.123Z",
          timezone: "Asia/Jakarta",
          offset: "+07:00",
          timestamp: 1699651845123,
        },
      },
    },
  })
  getCurrentTime() {
    const now = new Date();

    return {
      status: "success",
      message: "Current server time",
      data: {
        currentTime: now.toISOString(),
        timezone: "Asia/Jakarta",
        offset: "+07:00",
        timestamp: now.getTime(),
      },
    };
  }
}
