import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserType } from '@prisma/client';

/**
 * Decorator pour spécifier les rôles requis
 */
export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserType[]) => {
  return (
    target: any,
    key?: string,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      // Appliqué à une méthode
      Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
      return descriptor;
    }
    // Appliqué à une classe
    Reflect.defineMetadata(ROLES_KEY, roles, target);
    return target;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Vérifier si la route est publique
    const request = context.switchToHttp().getRequest();
    const isPublicRoute =
      request.url === '/referrals/respond' ||
      request.url.startsWith('/referrals/respond?');

    // Si la route est publique, on permet l'accès sans vérification de rôle
    if (isPublicRoute) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Vérifier si l'utilisateur est connecté
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    // Vérifier si l'utilisateur a un des rôles requis
    const hasRole = requiredRoles.some((role) => user.type === role);

    if (!hasRole) {
      throw new UnauthorizedException('Accès non autorisé pour ce rôle');
    }

    return true;
  }
}
