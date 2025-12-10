import { Module } from '@nestjs/common';
import { StudyLevelService } from './study-level.service';
import { StudyLevelController } from './study-level.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [StudyLevelController],
  providers: [StudyLevelService],
})
export class StudyLevelModule {}
