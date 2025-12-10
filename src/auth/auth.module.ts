import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersService } from '../prisma/services/user.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LinkedInOAuth2Strategy } from './strategies/linkedin-oauth2.strategy';
import { GoogleOAuth2Strategy } from './strategies/google-oauth2.strategy';
import { ConfigModule } from '@nestjs/config';
import { ResendModule } from '../resend/resend.module';
import * as passport from 'passport';
import { HttpModule } from '@nestjs/axios';
import { ProfileService } from '../prisma/services/profile.service';
import { EmailModule } from '../email/email.module';
import { DatabaseModule } from '../database/database.module';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { User } from '@prisma/client';

@Module({
  imports: [
    PassportModule.register({ session: true }),
    ConfigModule,
    ResendModule,
    HttpModule,
    EmailModule,
    DatabaseModule,
    SupabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    LocalStrategy,
    JwtStrategy,
    LinkedInOAuth2Strategy,
    GoogleOAuth2Strategy,
    ProfileService,
  ],
  exports: [AuthService],
})
export class AuthModule {
  constructor(private usersService: UsersService) {
    // User serialization
    passport.serializeUser((user: User, done) => {
      done(null, user.id);
    });
    // User deserialization
    passport.deserializeUser((id: string, done) => {
      this.usersService
        .user({ id })
        .then((user) => {
          done(null, user);
        })
        .catch((err) => done(err, null));
    });
  }
}
