import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { EmailModule } from '../email/email.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [EmailModule, ScheduleModule.forRoot(), SupabaseModule],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
