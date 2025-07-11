import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocalizationService } from './localization.service';
import { LocalizationController } from './localization.controller';

@Module({
  imports: [
    ConfigModule
  ],
  controllers: [LocalizationController],
  providers: [LocalizationService],
  exports: [LocalizationService]
})
export class LocalizationModule {}
