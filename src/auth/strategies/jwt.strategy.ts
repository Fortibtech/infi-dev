import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../dto/auth.dto';
import { UsersService } from '../../prisma/services/user.service';
import { ProfileService } from '../../prisma/services/profile.service';
import { Request } from 'express';

// Fonction personnalisée pour extraire le JWT des cookies ou du header d'autorisation
const fromAuthHeaderAsBearerTokenOrCookie = (cookieName = 'auth_token') => {
  return (request: Request) => {
    // Essayer d'abord d'extraire du header d'autorisation
    const bearerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    if (bearerToken) {
      return bearerToken;
    }

    // Si pas de token dans le header, essayer les cookies
    const cookieToken = request.cookies?.[cookieName];
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  };
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly profileService: ProfileService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: fromAuthHeaderAsBearerTokenOrCookie(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.user({ id: payload.sub });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const profile = await this.profileService.profileByUserId(user.id);

    return {
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      isActive: user.isActive,
      type: user.type,
      hasProfile: !!profile,
      profile: profile
        ? {
            id: profile.id,
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
          }
        : undefined,
    };
  }
}
