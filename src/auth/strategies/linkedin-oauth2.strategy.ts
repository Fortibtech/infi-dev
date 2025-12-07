import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class LinkedInOAuth2Strategy extends PassportStrategy(
  Strategy,
  'linkedin',
) {
  private readonly logger = new Logger(LinkedInOAuth2Strategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientID: configService.get<string>('LINKEDIN_CLIENT_ID') || '',
      clientSecret: configService.get<string>('LINKEDIN_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('LINKEDIN_CALLBACK_URL') || '',
      scope: ['openid', 'profile', 'email'],
      state: false,
      passReqToCallback: true,
    });

    this.logger.log('Stratégie LinkedIn OpenID Connect initialisée');
    this.logger.log(
      `URL de callback: ${configService.get<string>('LINKEDIN_CALLBACK_URL')}`,
    );
    this.logger.log(`Scopes utilisés: openid, profile, email`);
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
    done: Function,
  ) {
    try {
      this.logger.log('Authentification LinkedIn réussie, token obtenu');

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

      const minimalProfile = { id: 'oauth2_flow', provider: 'linkedin' };

      const user = await this.authService.validateLinkedInUser(
        minimalProfile,
        accessToken,
        userType,
        referralToken,
      );

      this.logger.log(`Utilisateur authentifié: ${user.email}`);
      done(null, user);
    } catch (error) {
      this.logger.error(
        `Erreur de validation LinkedIn: ${error.message}`,
        error.stack,
      );
      done(error, false);
    }
  }
}
