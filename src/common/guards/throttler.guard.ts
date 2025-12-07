import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Map pour stocker les requêtes des utilisateurs
// En production, vous devriez utiliser un stockage externe comme Redis
const requestMap = new Map<string, number[]>();

// Décorateur pour définir les limites de requêtes
export const THROTTLE_KEY = 'throttle';
export const Throttle = (limit: number, ttl: number) => {
  return (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata(THROTTLE_KEY, { limit, ttl }, descriptor.value);
    return descriptor;
  };
};

// Configuration par défaut pour le throttling global
export const DEFAULT_THROTTLE_LIMIT = 60; // 60 requêtes max
export const DEFAULT_THROTTLE_TTL = 60; // sur une période de 60 secondes

@Injectable()
export class ThrottlerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Récupérer les paramètres de throttling depuis le décorateur ou utiliser les valeurs par défaut
    const throttleParams = this.reflector.get<{ limit: number; ttl: number }>(
      THROTTLE_KEY,
      context.getHandler(),
    ) || { limit: DEFAULT_THROTTLE_LIMIT, ttl: DEFAULT_THROTTLE_TTL };

    const request = context.switchToHttp().getRequest();
    const { limit, ttl } = throttleParams;

    // Utiliser l'IP comme identifiant (en production, utilisez un ID plus fiable)
    const ip = request.ip;
    const key = `${ip}-${context.getClass().name}-${context.getHandler().name}`;

    // Nettoyer les anciennes requêtes
    this.cleanRequestTimestamps(key, ttl);

    // Vérifier si la limite est atteinte
    const requestTimestamps = requestMap.get(key) || [];

    if (requestTimestamps.length >= limit) {
      throw new HttpException(
        'Trop de requêtes, veuillez réessayer plus tard',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Ajouter la requête actuelle
    requestTimestamps.push(Date.now());
    requestMap.set(key, requestTimestamps);

    return true;
  }

  private cleanRequestTimestamps(key: string, ttl: number): void {
    const now = Date.now();
    const timestamps = requestMap.get(key) || [];
    const validTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < ttl * 1000,
    );

    if (validTimestamps.length > 0) {
      requestMap.set(key, validTimestamps);
    } else {
      requestMap.delete(key);
    }
  }
}
