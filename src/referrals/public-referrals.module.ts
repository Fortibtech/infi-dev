import { Module } from '@nestjs/common';
import { PublicReferralsController } from './public-referrals.controller';
import { ReferralsModule } from './referrals.module';
import { PrismaService } from '../database/prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ReferralsModule, EmailModule],
  controllers: [PublicReferralsController],
  providers: [PrismaService],
})
export class PublicReferralsModule {}
