import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { EmailModule } from '../email/email.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [EmailModule, ScheduleModule.forRoot()],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
