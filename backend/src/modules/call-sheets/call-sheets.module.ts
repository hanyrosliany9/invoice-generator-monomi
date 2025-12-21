import { Module } from '@nestjs/common';
import { CallSheetsController } from './call-sheets.controller';
import { CallSheetsService } from './call-sheets.service';

@Module({
  controllers: [CallSheetsController],
  providers: [CallSheetsService],
  exports: [CallSheetsService],
})
export class CallSheetsModule {}
