import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Vérifier si la route est marquée comme publique
    const request = context.switchToHttp().getRequest();
    const isPublicRoute =
      request.url === '/referrals/respond' ||
      request.url.startsWith('/referrals/respond?');

    // Si la route est publique, on permet l'accès sans authentification
    if (isPublicRoute) {
      return true;
    }

    // Sinon, on applique la logique d'authentification JWT standard
    return super.canActivate(context);
  }
}
