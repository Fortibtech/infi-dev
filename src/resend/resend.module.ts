import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResendService } from './resend.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'RESEND_CONFIGURATION',
      useFactory: (configService: ConfigService) => ({
        apiKey: configService.get<string>('RESEND_API_KEY'),
      }),
      inject: [ConfigService],
    },
    ResendService,
  ],
  exports: [ResendService],
})
export class ResendModule {}
