import { Module } from '@nestjs/common';
import { CallSheetsController } from './call-sheets.controller';
import { CallSheetsService } from './call-sheets.service';
import { ExternalApisService } from '../../services/external-apis.service';

@Module({
  controllers: [CallSheetsController],
  providers: [CallSheetsService, ExternalApisService],
  exports: [CallSheetsService],
})
export class CallSheetsModule {}
