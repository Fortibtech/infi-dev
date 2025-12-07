import { Module } from '@nestjs/common';
import { StudyLevelService } from './study-level.service';
import { StudyLevelController } from './study-level.controller';

@Module({
  controllers: [StudyLevelController],
  providers: [StudyLevelService],
})
export class StudyLevelModule {}
