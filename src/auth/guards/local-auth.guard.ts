import {
  Injectable,
  Logger,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  private readonly logger = new Logger(LocalAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.debug("Tentative d'authentification locale");

    const request = context.switchToHttp().getRequest();
    this.logger.debug(
      `Données reçues: ${JSON.stringify({
        email: request.body?.email || 'non fourni',
        passwordProvided: !!request.body?.password,
      })}`,
    );

    try {
      const result = await super.canActivate(context);
      this.logger.debug('Authentification réussie');
      return result as boolean;
    } catch (error) {
      this.logger.error(`Échec d'authentification: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException(
          error.message || 'Email ou mot de passe incorrect',
        );
      }
      throw error;
    }
  }

  handleRequest(err, user, info, context) {
    if (err || !user) {
      this.logger.error(
        `HandleRequest échec: ${err?.message || 'Utilisateur non trouvé'}`,
      );
      throw new UnauthorizedException(
        err?.message || info?.message || 'Email ou mot de passe incorrect',
      );
    }

    this.logger.debug('HandleRequest succès: utilisateur trouvé');
    return user;
  }
}
