import { Module } from '@nestjs/common';
import { WeeksModule } from '../weeks/weeks.module.js';
import { PathController } from './path.controller.js';
import { PathService } from './path.service.js';

@Module({
  imports: [WeeksModule],
  controllers: [PathController],
  providers: [PathService],
  exports: [PathService],
})
export class PathModule {}
