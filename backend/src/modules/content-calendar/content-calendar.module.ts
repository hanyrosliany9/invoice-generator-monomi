import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MediaModule } from "../media/media.module";
import { ContentCalendarService } from "./content-calendar.service";
import { ContentCalendarController } from "./content-calendar.controller";

/**
 * ContentCalendarModule - Content Planning & Calendar Management
 *
 * Provides:
 * - ContentCalendarService for business logic
 * - ContentCalendarController for REST API
 * - Integration with MediaService for R2 storage
 * - Integration with PrismaService for database operations
 *
 * Features:
 * - Create, read, update, delete content calendar items
 * - Media upload and management
 * - Scheduling and publishing workflows
 * - Multi-platform content targeting
 * - Client/Project/Campaign associations
 */
@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [ContentCalendarController],
  providers: [ContentCalendarService],
  exports: [ContentCalendarService],
})
export class ContentCalendarModule {}
