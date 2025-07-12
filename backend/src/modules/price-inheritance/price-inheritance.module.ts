// Price Inheritance Module - Indonesian Business Management System
// Module configuration for price inheritance with Indonesian business compliance

import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { PriceInheritanceService } from './price-inheritance.service'
import { PriceInheritanceController } from './price-inheritance.controller'

@Module({
  imports: [PrismaModule],
  controllers: [PriceInheritanceController],
  providers: [PriceInheritanceService],
  exports: [PriceInheritanceService]
})
export class PriceInheritanceModule {}