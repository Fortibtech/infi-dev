import { Module } from '@nestjs/common';
import { AppController } from './prisma.controller';
import { UserController } from './controllers/user.controller';
import { ProfileController } from './controllers/profile.controller';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { EmailModule } from '../email/email.module';
import { ResendModule } from '../resend/resend.module';

// Importation des services pour compatibilité
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { ProfilesService } from '../profiles/profiles.service';
import { EmailService } from '../email/email.service';

/**
 * @deprecated Ce module est maintenu pour compatibilité, utilisez les modules spécifiques à la place
 */
@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    ProfilesModule,
    EmailModule,
    ResendModule,
  ],
  controllers: [AppController, UserController, ProfileController],
  providers: [],
  exports: [],
})
export class PrismaModule {}
