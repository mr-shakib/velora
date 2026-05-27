import { Module } from '@nestjs/common';
import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [MemoriesController],
  providers: [MemoriesService],
})
export class MemoriesModule {}
