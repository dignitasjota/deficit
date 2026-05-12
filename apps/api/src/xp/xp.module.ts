import { Module } from '@nestjs/common';
import { WeeksModule } from '../weeks/weeks.module.js';
import { XpController } from './xp.controller.js';
import { XpService } from './xp.service.js';

@Module({
  imports: [WeeksModule],
  controllers: [XpController],
  providers: [XpService],
  exports: [XpService],
})
export class XpModule {}
