import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ResendModule } from './resend/resend.module';
import { EmailModule } from './email/email.module';
import { AppController } from './app.controller';
import { StudyLevelModule } from './studylevel/study-level.module';
import { CommonModule } from './common/common.module';
import { ReferralsModule } from './referrals/referrals.module';
import { PublicReferralsModule } from './referrals/public-referrals.module';
import { CompanyModule } from './company/company.module';
import { StripeModule } from './stripe/stripe.module';
import { JobsFtModule } from './jobs_ft/jobs_ft.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    ProfilesModule,
    ResendModule,
    EmailModule,
    StudyLevelModule,
    CommonModule,
    ReferralsModule,
    PublicReferralsModule,
    CompanyModule,
    StripeModule,
    JobsFtModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
