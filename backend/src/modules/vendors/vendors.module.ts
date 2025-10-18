import { Module } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Vendors Module
 *
 * Purchase-to-pay vendor master data management system.
 *
 * Features:
 * - Complete vendor CRUD with validation
 * - Indonesian tax compliance (NPWP validation, PKP status)
 * - Vendor categorization and classification
 * - Payment terms management
 * - Banking information tracking
 * - Credit limit management
 * - Bilingual support (Indonesian/English)
 * - Role-based access control
 * - Vendor statistics and analytics
 *
 * Services:
 * - VendorsService: Core business logic, NPWP validation, code generation
 *
 * Dependencies:
 * - PrismaModule: Database access
 * - AuthModule: JWT authentication (imported by guards)
 */
@Module({
  imports: [PrismaModule],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
