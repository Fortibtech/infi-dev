import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ResendModule } from '../resend/resend.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ResendModule, ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
