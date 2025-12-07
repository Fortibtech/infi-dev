import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
  Res,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto, AuthResponse } from './dto/auth.dto';
import { IsVerifiedGuard } from './guards/is-verified.guard';
import { LinkedInAuthGuard } from './guards/linkedin-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from 'src/common/guards/throttler.guard';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Connexion avec email et mot de passe' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Authentification réussie',
    type: AuthResponse,
  })
  @ApiResponse({ status: 401, description: 'Authentification échouée' })
  @HttpCode(200)
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const authResult = await this.authService.login(req.user);

    if (authResult.cookie) {
      res.cookie(
        authResult.cookie.name,
        authResult.cookie.value,
        authResult.cookie.options,
      );
    }

    const { cookie, ...responseData } = authResult;
    return responseData; // { accessToken, onboardingTermine, user }
  }

  @Post('register')
  @ApiOperation({ summary: "Inscription d'un nouvel utilisateur" })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Utilisateur créé avec succès',
    type: AuthResponse,
  })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);

    if (result.cookie) {
      res.cookie(
        result.cookie.name,
        result.cookie.value,
        result.cookie.options,
      );
    }

    const { cookie, ...responseData } = result;
    return responseData; // { accessToken, onboardingTermine:false, user, message }
  }

  @Get('verify')
  @ApiOperation({ summary: "Vérification de l'email avec un token" })
  @ApiQuery({ name: 'token', type: String, required: true })
  @ApiResponse({
    status: 200,
    description: 'Email vérifié avec succès',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Votre email a été vérifié avec succès',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Token expiré ou invalide' })
  @ApiResponse({ status: 404, description: 'Token introuvable' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @Throttle(1, 60)
  @ApiOperation({ summary: "Renvoyer l'email de vérification" })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'utilisateur@exemple.com',
        },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email de vérification renvoyé avec succès',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Un nouvel email de vérification a été envoyé',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @ApiResponse({ status: 429, description: 'Trop de requêtes' })
  async resendVerificationEmail(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @Get('linkedin')
  @UseGuards(LinkedInAuthGuard)
  @ApiOperation({ summary: 'Authentification via LinkedIn (redirection)' })
  @ApiResponse({ status: 302, description: 'Redirection vers LinkedIn' })
  async linkedinAuth() {
    // La redirection est gérée par le guard
  }

  @Get('linkedin/callback')
  @UseGuards(LinkedInAuthGuard)
  @ApiOperation({ summary: 'Callback après authentification LinkedIn' })
  @ApiResponse({
    status: 302,
    description: "Redirection vers la page d'accueil avec token",
  })
  async linkedinAuthCallback(
    @Request() req,
    @Res() res: Response,
    @Query('state') state: string,
  ) {
    // Afficher le state brut
    console.log('State brut reçu:', state);

    // Afficher l'URL originale décodée
    if (state) {
      try {
        const originalUrl = Buffer.from(state, 'base64').toString('utf-8');
        console.log('URL originale décodée du state:', originalUrl);

        // Essayer d'extraire le typeUser si c'est un JSON valide
        try {
          const stateObj = JSON.parse(originalUrl);
          if (stateObj && stateObj.url) {
            const url = new URL(stateObj.url);
            const typeUser = url.searchParams.get('typeUser');
            if (typeUser) {
              console.log(
                "Type d'utilisateur extrait dans le controller:",
                typeUser,
              );
            }
          }
        } catch (jsonError) {
          // Si ce n'est pas un JSON valide, essayer de parser directement comme URL
          try {
            const url = new URL(originalUrl);
            const typeUser = url.searchParams.get('typeUser');
            if (typeUser) {
              console.log(
                "Type d'utilisateur extrait dans le controller:",
                typeUser,
              );
            }
          } catch (urlError) {
            console.error(
              "Impossible de parser l'URL originale:",
              urlError.message,
            );
          }
        }
      } catch (error) {
        console.error('Erreur lors du décodage du state:', error);
      }
    }

    // Afficher l'URL originale attachée à la requête par le guard
    console.log('URL originale depuis la requête:', req.originalRequestUrl);

    // Afficher toute la session dans la console
    console.log('Session complète:', req.session);

    // Afficher le type d'utilisateur (s'il a été défini)
    if (req.user && req.user.type) {
      console.log("Type d'utilisateur enregistré:", req.user.type);
    }

    const loginResult = await this.authService.loginWithLinkedIn(req.user);
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    // Définir le cookie HTTP-only
    if (loginResult.cookie) {
      res.cookie(
        loginResult.cookie.name,
        loginResult.cookie.value,
        loginResult.cookie.options,
      );
    }

    // Créer l'URL de redirection avec l'information isFirstLogin
    let redirectUrl = '';
    console.log('req.user.type', req.user.type);
    // Vérifier le type d'utilisateur pour déterminer la redirection
    if (req.user && req.user.type === 'RECRUITER') {
      // Pour les recruteurs, redirection directe vers le dashboard
      redirectUrl = `${frontendUrl}/dashboard?auth=google&isFirstLogin=${loginResult.user.isFirstLogin}`;
    } else if (
      req.user &&
      (req.user.type === 'USER' || req.user.type === 'RECOMMENDER')
    ) {
      // Pour les utilisateurs et recommandeurs, vérifier si l'onboarding est complété
      const isOnboardingCompleted =
        await this.authService.isOnboardingCompleted(req.user.id);

      console.log('isOnboardingCompleted', isOnboardingCompleted);

      if (isOnboardingCompleted) {
        // Si onboarding terminé, rediriger vers le dashboard
        redirectUrl = `${frontendUrl}/dashboard?auth=google&isFirstLogin=${loginResult.user.isFirstLogin}`;
      } else {
        // Si onboarding non terminé, rediriger vers la page appropriée selon le type
        if (req.user.type === 'USER') {
          redirectUrl = `${frontendUrl}/onboard/graduation?auth=google&isFirstLogin=${loginResult.user.isFirstLogin}`;
        } else if (req.user.type === 'RECOMMENDER') {
          redirectUrl = `${frontendUrl}/onboard/find-recommender?auth=google&isFirstLogin=${loginResult.user.isFirstLogin}`;
        }
      }
    } else {
      // Cas par défaut, rediriger vers la page d'accueil
      redirectUrl = `${frontendUrl}?auth=google&isFirstLogin=${loginResult.user.isFirstLogin}`;
    }

    return res.redirect(redirectUrl);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Authentification via Google (redirection)' })
  @ApiResponse({ status: 302, description: 'Redirection vers Google' })
  async googleAuth() {
    // La redirection est gérée par le guard
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Callback de Google après authentification' })
  @ApiResponse({
    status: 302,
    description: 'Redirection vers le frontend avec le token',
  })
  async googleAuthCallback(
    @Request() req,
    @Res() res: Response,
    @Query('state') state: string,
  ) {
    // Afficher le state brut
    if (state) {
      try {
        const decodedState = Buffer.from(state, 'base64').toString();
        console.log('State décodé:', decodedState);
      } catch (e) {
        console.error('Erreur de décodage du state:', e);
        console.log('State brut:', state);
      }
    }

    // Afficher toute la session dans la console
    console.log('Session complète:', req.session);

    // Afficher le type d'utilisateur (s'il a été défini)
    if (req.user && req.user.type) {
      console.log("Type d'utilisateur enregistré:", req.user.type);
    }

    const loginResult = await this.authService.loginWithGoogle(req.user);
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    // Définir le cookie HTTP-only
    if (loginResult.cookie) {
      res.cookie(
        loginResult.cookie.name,
        loginResult.cookie.value,
        loginResult.cookie.options,
      );
    }

    // Créer l'URL de redirection avec l'information isFirstLogin
    let redirectUrl = '';
    console.log('req.user.type', req.user.type);
    // Vérifier le type d'utilisateur pour déterminer la redirection
    if (req.user && req.user.type === 'RECRUITER') {
      // Pour les recruteurs, redirection directe vers le dashboard
      redirectUrl = `${frontendUrl}/dashboard?auth=google&isFirstLogin=${loginResult.user.isFirstLogin}`;
    } else if (
      req.user &&
      (req.user.type === 'USER' || req.user.type === 'RECOMMENDER')
    ) {
      // Pour les utilisateurs et recommandeurs, vérifier si l'onboarding est complété
      const isOnboardingCompleted =
        await this.authService.isOnboardingCompleted(req.user.id);

      console.log('isOnboardingCompleted', isOnboardingCompleted);

      if (isOnboardingCompleted) {
        // Si onboarding terminé, rediriger vers le dashboard
        redirectUrl = `${frontendUrl}/dashboard?auth=google&isFirstLogin=${loginResult.user.isFirstLogin}`;
      } else {
        // Si onboarding non terminé, rediriger vers la page appropriée selon le type
        if (req.user.type === 'USER') {
          redirectUrl = `${frontendUrl}/onboard/graduation?auth=google&isFirstLogin=${loginResult.user.isFirstLogin}`;
        } else if (req.user.type === 'RECOMMENDER') {
          redirectUrl = `${frontendUrl}/onboard/find-recommender?auth=google&isFirstLogin=${loginResult.user.isFirstLogin}`;
        }
      }
    } else {
      // Cas par défaut, rediriger vers la page d'accueil
      redirectUrl = `${frontendUrl}?auth=google&isFirstLogin=${loginResult.user.isFirstLogin}`;
    }

    return res.redirect(redirectUrl);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, IsVerifiedGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer le profil de l'utilisateur connecté" })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré avec succès',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'c8d8e8f0-1234-5678-9abc-def123456789' },
        email: { type: 'string', example: 'utilisateur@exemple.com' },
        isActive: { type: 'boolean', example: true },
        isVerified: { type: 'boolean', example: true },
        profile: {
          type: 'object',
          properties: {
            firstName: { type: 'string', example: 'Jean' },
            lastName: { type: 'string', example: 'Dupont' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Email non vérifié' })
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('logout')
  @ApiOperation({ summary: "Déconnexion de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: 'Déconnexion réussie',
  })
  async logout(@Res({ passthrough: true }) res: Response) {
    // Supprimer le cookie d'authentification
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    });

    return { message: 'Déconnexion réussie' };
  }
}
