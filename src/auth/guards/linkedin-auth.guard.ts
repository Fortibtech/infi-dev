import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LinkedInAuthGuard extends AuthGuard('linkedin') {
  private readonly logger = new Logger(LinkedInAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.log("Tentative d'authentification LinkedIn");

    const request = context.switchToHttp().getRequest();

    // Le processus d'activation du guard - démarre le flux OAuth2
    const activate = (await super.canActivate(context)) as boolean;

    this.logger.log(
      "Super canActivate terminé, connexion de l'utilisateur à la session",
    );

    // Connexion de l'utilisateur à la session
    await super.logIn(request);

    this.logger.log('Utilisateur connecté à la session, continuation du flux');
    return activate;
  }
}
