import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string) {
    this.logger.debug(`Tentative de validation pour l'email: ${email}`);

    if (!email || !password) {
      this.logger.error('Email ou mot de passe manquant');
      throw new UnauthorizedException('Email et mot de passe requis');
    }

    try {
      const user = await this.authService.validateUser(email, password);

      if (!user) {
        this.logger.warn(`Authentification échouée pour l'email: ${email}`);
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      this.logger.debug(
        `Authentification réussie pour l'utilisateur: ${user.id}`,
      );
      return user;
    } catch (error) {
      this.logger.error(`Erreur lors de la validation: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        "Une erreur est survenue lors de l'authentification",
      );
    }
  }
}
