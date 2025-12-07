import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleOAuth2Strategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleOAuth2Strategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });

    this.logger.log('Stratégie Google OAuth 2.0 initialisée');
    this.logger.log(
      `URL de callback: ${configService.get<string>('GOOGLE_CALLBACK_URL')}`,
    );
    this.logger.log(`Scopes utilisés: email, profile`);
  }

  authenticate(req: any, options: any = {}) {
    if (!req.url.includes('/callback')) {
      const fullUrl = `${req.protocol}://${req.headers.host}${req.url}`;
      this.logger.log(`Définition du state avec l'URL originale: ${fullUrl}`);

      const stateObj = {
        url: fullUrl,
        timestamp: Date.now(),
      };
      options.state = Buffer.from(JSON.stringify(stateObj)).toString('base64');
    }

    return super.authenticate(req, options);
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    try {
      this.logger.log('Authentification Google réussie, token obtenu');
      this.logger.log(`Profile Google reçu: ${JSON.stringify(profile)}`);

      let userType: string | null = null;
      let referralToken: string | null = null;

      if (req.query && req.query.state) {
        try {
          const stateData = JSON.parse(
            Buffer.from(req.query.state, 'base64').toString(),
          );
          if (stateData && stateData.url) {
            req.originalRequestUrl = stateData.url;
            this.logger.log(
              `URL originale récupérée du state: ${stateData.url}`,
            );

            try {
              const url = new URL(stateData.url);
              userType = url.searchParams.get('typeUser');
              referralToken = url.searchParams.get('referralToken');

              if (userType) {
                this.logger.log(`Type d'utilisateur détecté: ${userType}`);
              }

              if (referralToken) {
                this.logger.log(
                  `Token de parrainage détecté: ${referralToken}`,
                );
              }
            } catch (urlError) {
              this.logger.error(
                `Erreur lors du parsing de l'URL: ${urlError.message}`,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Erreur lors du décodage du state: ${error.message}`,
          );
        }
      }

      const user = await this.authService.validateGoogleUser(
        profile,
        accessToken,
        userType,
        referralToken,
      );

      this.logger.log(`Utilisateur authentifié: ${user.email}`);
      done(null, user);
    } catch (error) {
      this.logger.error(
        `Erreur de validation Google: ${error.message}`,
        error.stack,
      );
      done(error, false);
    }
  }
}
