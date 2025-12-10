import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { SupabaseClient, User } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  private readonly logger = new Logger(SupabaseStrategy.name);
  private supabase: SupabaseClient;
  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService,
  ) {
    super({
      //   usernameField: 'email',
    });
    this.supabase = this.supabaseService.getClient();
  }

  async authenticate(idToken: string, options: any) {
    this.logger.debug(`Début de l'authentification Supabase.`);
    try {
      //   const user = await this.validate(idToken);
      this.logger.debug(`Utilisateur Supabase authentifié avec succès.`);
      options.state = JSON.stringify(null) || null;
      return super.authenticate(idToken, options);
    } catch (error) {
      this.logger.error(
        `Échec de l'authentification Supabase: ${(error as Error).message}`,
      );
    }
  }
  async validate(idToken: string): Promise<User> {
    this.logger.debug(`Tentative de validation avec Supabase.`);
    const { data, error } = await this.supabase.auth.signInWithIdToken({
      token: idToken,
      provider: 'google',
    });
    if (error) {
      this.logger.error(
        `Erreur d'authentification Supabase. Détails: ${error.message}`,
      );
      throw new UnauthorizedException("Échec de l'authentification Supabase");
    }
    this.logger.debug(`Authentification Supabase réussie.`);
    return data.user;
  }
}
