import { Module } from '@nestjs/common';
import { EntriesModule } from '../entries/entries.module.js';
import { AttributesController } from './attributes.controller.js';
import { AttributesService } from './attributes.service.js';

@Module({
  imports: [EntriesModule],
  controllers: [AttributesController],
  providers: [AttributesService],
  exports: [AttributesService],
})
export class AttributesModule {}
