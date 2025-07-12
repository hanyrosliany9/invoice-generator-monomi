// Business Journey Module - Indonesian Business Management System
// Module configuration with dependency injection and security setup

import { Module } from '@nestjs/common'
import { BusinessJourneyController } from './business-journey.controller'
import { BusinessJourneyService } from './business-journey.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [BusinessJourneyController],
  providers: [BusinessJourneyService],
  exports: [BusinessJourneyService] // Export service for use in other modules
})
export class BusinessJourneyModule {}