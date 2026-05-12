import { Module } from '@nestjs/common';
import { ConsentService } from './consent.service.js';
import { ExportService } from './export.service.js';
import { LegalController } from './legal.controller.js';

@Module({
  providers: [ConsentService, ExportService],
  controllers: [LegalController],
  exports: [ConsentService, ExportService],
})
export class LegalModule {}
