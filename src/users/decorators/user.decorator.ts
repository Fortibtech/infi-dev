import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Décorateur pour extraire l'utilisateur de la requête
 * La donnée de l'utilisateur a été ajoutée par le JwtAuthGuard
 */
export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
