import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../prisma/services/user.service';
import { ProfileService } from '../prisma/services/profile.service';
import { RegisterDto, JwtPayload, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';
import { add } from 'date-fns';
import { HttpService } from '@nestjs/axios';
import { Profile, User, Prisma, UserType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AxiosError, AxiosResponse } from 'axios';
import { SupabaseService } from 'src/supabase/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private supabase: SupabaseClient;
  constructor(
    private supabaseService: SupabaseService,
    private usersService: UsersService,
    private profileService: ProfileService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.supabase = this.supabaseService.getClient();
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.user({ email });

    if (!user) {
      return null;
    }

    if (!user.password) {
      return null;
    }

    const isPasswordValid = (await bcrypt.compare(
      password,
      user.password,
    )) as boolean;

    if (!isPasswordValid) {
      return null;
    }

    return {
      ...user,
      password: undefined,
    };
  }

  /**
   * Login email + mot de passe
   * Retourne { accessToken, onboardingTermine, user, cookie }
   */
  async login(loginDto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: loginDto.email,
      password: loginDto.password,
    });
    if (error || !data.user) {
      throw new UnauthorizedException(
        `Échec de l'authentification Supabase: ${error?.message || 'Utilisateur non trouvé'}`,
      );
    }
    const user = await this.usersService.user({ email: loginDto.email });
    const isOnboardingCompleted = await this.isOnboardingCompleted(user!.id);
    return {
      accessToken: data.session?.access_token || '',
      refreshToken: data.session?.refresh_token || '',
      onboardingCompleted: isOnboardingCompleted,
      user: {
        id: user!.id,
        email: user!.email,
        type: user!.type,
        isActive: user!.isActive,
        isVerified: user!.isVerified,
        isFirstLogin: !isOnboardingCompleted,
      },
    };
  }

  /**
   * Inscription email + mot de passe
   * Retourne { accessToken, onboardingTermine:false, user, message, cookie }
   */
  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.user({
      email: registerDto.email,
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }
    const { data, error } = await this.supabase.auth.signUp({
      email: registerDto.email,
      password: registerDto.password,
    });
    if (error) {
      throw new BadRequestException(
        `Erreur lors de la création de l'utilisateur Supabase: ${error.message}`,
      );
    }
    const profileData: {
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    } = {
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phoneNumber: registerDto.phoneNumber,
    };
    const newUser = await this.usersService.createUser({
      email: registerDto.email,
      type: registerDto.type,
      profile: {
        create: profileData,
      },
    });

    if (registerDto.referralToken) {
      const referral = await this.prisma.referral.findFirst({
        where: {
          responseToken: registerDto.referralToken,
        },
      });

      if (!referral) {
        throw new BadRequestException('Token de référence invalide');
      }

      if (referral.tokenExpiry && referral.tokenExpiry < new Date()) {
        throw new BadRequestException('Le token de référence a expiré');
      }

      await this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          referrerId: newUser.id,
          status: 'ACCEPTED',
          responseDate: new Date(),
        },
      });

      const data = await this.prisma.referral.findFirst({
        where: { id: referral.id },
        include: { requester: { include: { profile: true } } },
      });

      if (data && data.requester && data.requester.email) {
        const requesterName = data.requester.profile?.firstName || '';
        await this.emailService.sendAcceptInvitationEmail(
          data.requester.email,
          requesterName,
        );
      }
    }

    return {
      accessToken: data.session?.access_token || '',
      onboardingCompleted: false,
      user: {
        id: data.user?.id || '',
        ...registerDto,
        email: data.user?.email || '',
      },
    };
  }
  async verifyEmail(token: string) {
    const user = await this.usersService.user({ verificationToken: token });

    if (!user) {
      throw new NotFoundException('Token de vérification invalide');
    }

    if (user.isVerified) {
      return { message: 'Votre email est déjà vérifié' };
    }

    if (user.tokenExpiry && new Date(user.tokenExpiry) < new Date()) {
      throw new BadRequestException('Le token de vérification a expiré');
    }

    await this.usersService.updateUser({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        tokenExpiry: null,
      },
    });

    return { message: 'Votre email a été vérifié avec succès' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.user({ email });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.isVerified) {
      return { message: 'Votre email est déjà vérifié' };
    }

    // Générer un nouveau token
    const verificationToken = uuidv4();
    const tokenExpiry = add(new Date(), { hours: 24 });

    // Mettre à jour l'utilisateur
    await this.usersService.updateUser({
      where: { id: user.id },
      data: {
        verificationToken,
        tokenExpiry,
      },
    });

    // Récupérer le profil pour obtenir le prénom
    const profile = await this.profileService.profileByUserId(user.id);
    const firstName = profile?.firstName || '';

    // Renvoyer l'email de vérification
    await this.emailService.sendVerificationEmail(
      user.email,
      firstName,
      verificationToken,
    );

    return { message: 'Un nouvel email de vérification a été envoyé' };
  }

  // Authentification LinkedIn
  async validateLinkedInUser(
    profile: {
      id?: string;
      displayName?: string;
      name?: { familyName?: string; givenName?: string };
      emails?: { value?: string }[];
      photos?: { value?: string }[];
      phoneNumber?: string;
    },
    accessToken?: string,
    userType?: string | null,
    referralToken?: string | null,
  ) {
    this.logger.log(
      `Validating LinkedIn user with profile: ${JSON.stringify(profile)}`,
    );

    if (userType) {
      this.logger.log(`Type d'utilisateur spécifié: ${userType}`);
    }

    if (referralToken) {
      this.logger.log(`Token de parrainage spécifié: ${referralToken}`);
    }

    let email = '';
    let firstName = '';
    let lastName = '';
    let pictureUrl = '';
    let linkedinId = '';
    let phoneNumber = '';

    // Si nous avons un accessToken, essayer de récupérer les informations via l'endpoint userinfo OIDC
    if (accessToken) {
      try {
        this.logger.log(
          'Récupération des informations utilisateur via endpoint userinfo OIDC',
        );
        const userInfo = await this.fetchLinkedInUserInfo(accessToken);

        // Avec OpenID Connect, les champs suivent un format standard
        email = userInfo.email || '';
        firstName = userInfo.given_name || '';
        lastName = userInfo.family_name || '';
        pictureUrl = userInfo.picture || '';
        linkedinId = userInfo.sub || ''; // sub est l'identifiant en OIDC
        phoneNumber = userInfo.phoneNumber || '';
        this.logger.log(
          `Informations extraites via OIDC: email=${email}, name=${firstName} ${lastName}, id=${linkedinId}`,
        );
      } catch (error) {
        this.logger.error(
          `Erreur lors de la récupération des infos LinkedIn: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }

    // Si les informations OIDC ne sont pas complètes, essayer d'extraire du profil
    if (!email && profile.emails && profile.emails.length > 0) {
      email = profile.emails[0].value || '';
    }

    if (!linkedinId && profile.id) {
      linkedinId = profile.id;
    }

    if (!firstName && !lastName && profile.displayName) {
      const nameParts = profile.displayName.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Vérifier que nous avons suffisamment d'informations
    if (!email) {
      this.logger.error('Email manquant dans le profil LinkedIn');
      throw new Error('Email manquant dans le profil LinkedIn');
    }

    if (!linkedinId) {
      this.logger.error('ID LinkedIn manquant dans le profil');
      // Générer un ID temporaire si nécessaire
      linkedinId = `linkedin_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      this.logger.warn(`ID LinkedIn généré: ${linkedinId}`);
    }

    this.logger.log(
      `Informations LinkedIn finales: email=${email}, id=${linkedinId}, nom=${firstName} ${lastName}`,
    );

    // Chercher un utilisateur par email
    let user = await this.usersService.user({ email });
    let userProfile: Profile | null = null;

    // Vérifier si un profil existe avec ce linkedinId
    const profileWithLinkedinId = await this.profileService.profile({
      where: { linkedinId },
    });

    if (profileWithLinkedinId && !user) {
      // Si un profil avec ce linkedinId existe mais pas d'utilisateur avec cet email
      user = await this.usersService.user({ id: profileWithLinkedinId.userId });
    }

    // Créer un objet profile complet pour stocker
    const linkedinProfile = {
      from: 'oidc',
      email,
      firstName,
      lastName,
      pictureUrl,
      linkedinId,
      phoneNumber,
      raw: profile as Record<string, any>, // Garder le profil brut
      lastUpdated: new Date().toISOString(),
    };

    // Si l'utilisateur existe, mettre à jour son profil
    if (user) {
      this.logger.log(
        `Utilisateur existant trouvé: ${user.id} (${user.email})`,
      );

      try {
        // Préparer les données de mise à jour de l'utilisateur
        const userUpdateData: Prisma.UserUpdateInput = {
          isVerified: true,
          updatedAt: new Date(), // Forcer la mise à jour du timestamp
        };

        // Mettre à jour le type d'utilisateur seulement si spécifié et si l'utilisateur a un type par défaut (USER)
        if (userType && user.type === 'USER') {
          // Valider que userType est une valeur valide de l'enum UserType
          if (
            ['USER', 'RECRUITER', 'RECOMMENDER'].includes(
              userType.toUpperCase(),
            )
          ) {
            userUpdateData.type = userType.toUpperCase() as UserType;
            this.logger.log(
              `Mise à jour du type d'utilisateur vers: ${userType.toUpperCase()}`,
            );
          } else {
            this.logger.warn(`Type d'utilisateur invalide ignoré: ${userType}`);
          }
        }

        // Récupérer le profil existant de l'utilisateur
        userProfile = await this.profileService.profileByUserId(user.id);

        if (userProfile) {
          // Mettre à jour le profil existant
          userProfile = await this.profileService.updateProfile({
            where: { id: userProfile.id },
            data: {
              linkedinId,
              linkedinProfile,
              phoneNumber,
              // Ne mettre à jour les noms que s'ils sont vides ou si les nouvelles valeurs ne sont pas vides
              firstName:
                !userProfile.firstName && firstName
                  ? firstName
                  : userProfile.firstName,
              lastName:
                !userProfile.lastName && lastName
                  ? lastName
                  : userProfile.lastName,
            },
          });
        } else {
          // Créer un nouveau profil pour l'utilisateur existant
          userProfile = await this.profileService.createProfile({
            firstName,
            lastName,
            linkedinId,
            linkedinProfile,
            phoneNumber,
            user: {
              connect: { id: user.id },
            },
          });
        }

        // Mettre à jour l'utilisateur
        user = await this.usersService.updateUser({
          where: { id: user.id },
          data: userUpdateData,
        });

        this.logger.log(
          `Utilisateur et profil mis à jour avec succès: ${user.id}`,
        );
        return user;
      } catch (error) {
        this.logger.error(
          `Erreur lors de la mise à jour de l'utilisateur/profil: ${(error as Error).message}`,
          (error as Error).stack,
        );
        throw new Error(
          `Erreur lors de la mise à jour de l'utilisateur/profil: ${(error as Error).message}`,
        );
      }
    }

    // Créer un nouvel utilisateur avec les informations LinkedIn
    this.logger.log(`Création d'un nouvel utilisateur avec email=${email}`);
    try {
      const userData: Prisma.UserCreateInput = {
        email,
        isVerified: true, // L'email est vérifié via LinkedIn
        isActive: true,
        profile: {
          create: {
            firstName: firstName || '',
            lastName: lastName || '',
            linkedinId,
            linkedinProfile,
            phoneNumber,
          },
        },
      };

      // Ajouter le type d'utilisateur s'il est spécifié et valide
      if (
        userType &&
        ['USER', 'RECRUITER', 'RECOMMENDER'].includes(userType.toUpperCase())
      ) {
        userData.type = userType.toUpperCase() as UserType;
        this.logger.log(
          `Définition du type d'utilisateur: ${userType.toUpperCase()}`,
        );
      }

      const newUser = await this.usersService.createUser(userData);

      // Traiter le token de parrainage s'il est spécifié
      if (referralToken) {
        try {
          this.logger.log(
            `Traitement du token de parrainage: ${referralToken}`,
          );
          // Trouver la demande de référence avec le token
          const referral = await this.prisma.referral.findFirst({
            where: {
              responseToken: referralToken,
            },
          });

          if (!referral) {
            this.logger.warn('Token de référence invalide ou inexistant');
          } else {
            // Vérifier que le token n'a pas expiré
            if (referral.tokenExpiry && referral.tokenExpiry < new Date()) {
              this.logger.warn('Le token de référence a expiré');
            } else {
              // Mettre à jour la demande de référence
              await this.prisma.referral.update({
                where: { id: referral.id },
                data: {
                  referrerId: newUser.id,
                  status: 'ACCEPTED',
                  responseDate: new Date(),
                },
              });

              const data = await this.prisma.referral.findFirst({
                where: { id: referral.id },
                include: { requester: { include: { profile: true } } },
              });

              if (data && data.requester && data.requester.email) {
                const requesterName = data.requester.profile?.firstName || '';
                await this.emailService.sendAcceptInvitationEmail(
                  data.requester.email,
                  requesterName,
                );
              }

              this.logger.log(
                `Parrainage associé avec succès à l'utilisateur: ${newUser.id}`,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Erreur lors du traitement du token de parrainage: ${(error as Error).message}`,
          );
          // On ne bloque pas la création de l'utilisateur en cas d'erreur de parrainage
        }
      }

      this.logger.log(`Nouvel utilisateur créé avec succès: ${newUser.id}`);
      return newUser;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la création de l'utilisateur: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new Error(
        `Erreur lors de la création de l'utilisateur: ${(error as Error).message}`,
      );
    }
  }

  // Récupérer les informations utilisateur depuis l'endpoint userinfo d'OpenID Connect
  private async fetchLinkedInUserInfo(accessToken: string) {
    try {
      this.logger.log(
        'Début de la récupération des informations utilisateur LinkedIn',
      );

      // Utiliser le endpoint userinfo correct pour OpenID Connect selon la documentation de LinkedIn
      const response: AxiosResponse<{
        sub?: string;
        email?: string;
        email_verified?: boolean;
        given_name?: string;
        family_name?: string;
        name?: string;
        picture?: string;
        locale?: string;
        raw_response?: any;
      }> = await this.httpService.axiosRef.get(
        'https://api.linkedin.com/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          timeout: 10000, // Timeout de 10 secondes
        },
      );

      if (!response || !response.data) {
        throw new Error("Réponse vide de l'API LinkedIn");
      }

      this.logger.log(
        `Réponse userinfo reçue: ${JSON.stringify(response.data)}`,
      );

      // Vérifier que les données essentielles sont présentes
      if (!response.data.email) {
        this.logger.warn("Email manquant dans la réponse de l'API LinkedIn");
      }

      if (!response.data.sub) {
        this.logger.warn("ID (sub) manquant dans la réponse de l'API LinkedIn");
      }

      // Format attendu selon la documentation:
      // {
      //   "sub": "782bbtaQ",
      //   "name": "John Doe",
      //   "given_name": "John",
      //   "family_name": "Doe",
      //   "picture": "https://media.licdn-ei.com/dms/image/...",
      //   "locale": "en-US",
      //   "email": "doe@email.com",
      //   "email_verified": true
      // }
      const responseData = response.data as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        given_name?: string;
        family_name?: string;
        name?: string;
        picture?: string;
        locale?: string;
        raw_response?: any;
        phoneNumber?: string;
      };
      // Créer un objet plus complet avec des valeurs par défaut
      const userInfo = {
        sub: responseData.sub || '',
        email: responseData.email || '',
        email_verified: responseData.email_verified || false,
        given_name: responseData.given_name || '',
        family_name: responseData.family_name || '',
        name: responseData.name || '',
        picture: responseData.picture || '',
        locale: responseData.locale || '',
        raw_response: responseData,
        phoneNumber: responseData.phoneNumber || '',
      };

      this.logger.log(
        `Informations utilisateur traitées: ${JSON.stringify(userInfo)}`,
      );
      return userInfo;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération des informations LinkedIn: ${(error as AxiosError).message}`,
      );

      if ((error as AxiosError).response) {
        this.logger.error(
          `Données de réponse d'erreur: ${JSON.stringify((error as AxiosError).response?.data)}`,
        );
        this.logger.error(
          `Statut de la réponse: ${(error as AxiosError).response?.status}`,
        );
        this.logger.error(
          `En-têtes de la réponse: ${JSON.stringify((error as AxiosError).response?.headers)}`,
        );
      } else if ((error as AxiosError).request) {
        this.logger.error('Requête envoyée mais pas de réponse reçue');
        this.logger.error(
          `Détails de la requête: ${JSON.stringify((error as AxiosError).request)}`,
        );
      } else {
        this.logger.error(
          `Erreur de configuration: ${(error as AxiosError).message}`,
        );
      }

      throw new Error(
        `Échec de la récupération des informations utilisateur LinkedIn: ${(error as AxiosError).message}`,
      );
    }
  }

  async loginWithLinkedIn(user: User) {
    this.logger.log(`Utilisateur authentifié via LinkedIn: ${user.email}`);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    // Récupérer l'utilisateur complet pour s'assurer d'avoir toutes les informations à jour
    const updatedUser = await this.usersService.user({ id: user.id });

    if (!updatedUser) {
      this.logger.error(
        `Utilisateur ${user.id} introuvable après authentification LinkedIn`,
      );
      throw new Error('Utilisateur introuvable après authentification');
    }

    // Récupérer le profil de l'utilisateur
    const userProfile = await this.profileService.profileByUserId(user.id);

    // Déterminer si c'est la première connexion en vérifiant si l'utilisateur vient d'être créé
    // On considère que c'est une première connexion si l'utilisateur a été créé il y a moins de 30 secondes
    const isFirstLogin =
      new Date().getTime() - new Date(updatedUser.createdAt).getTime() < 30000;

    if (!userProfile) {
      this.logger.error(
        `Profil pour l'utilisateur ${user.id} introuvable après authentification LinkedIn`,
      );
    }

    // Exclure les informations sensibles
    const { ...userInfo } = updatedUser;

    // Extraction sécurisée du pictureUrl depuis linkedinProfile du profil
    const profilePicture = userProfile?.linkedinProfile
      ? typeof userProfile.linkedinProfile === 'object'
        ? (userProfile.linkedinProfile as Record<string, string>).pictureUrl ||
          null
        : null
      : null;

    // Générer le token JWT
    const access_token = this.jwtService.sign(payload);

    // Préparer l'objet cookie
    const cookie = {
      name: 'auth_token',
      value: access_token,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Secure en production uniquement
        sameSite: 'lax' as const,
        maxAge: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
        path: '/',
      },
    };

    return {
      access_token, // Pour la compatibilité avec l'ancien code
      cookie,
      user: {
        id: userInfo.id,
        email: userInfo.email,
        firstName: userProfile?.firstName || '',
        lastName: userProfile?.lastName || '',
        isVerified: userInfo.isVerified,
        linkedinId: userProfile?.linkedinId || null,
        profilePicture,
        createdAt: userInfo.createdAt,
        updatedAt: userInfo.updatedAt,
        isFirstLogin,
      },
      auth_provider: 'linkedin',
      message: 'Authentification LinkedIn réussie',
    };
  }

  // Authentification Google
  async validateGoogleUser(
    profile: {
      id?: string;
      displayName?: string;
      name?: { familyName?: string; givenName?: string };
      emails?: { value?: string }[];
      photos?: { value?: string }[];
    },
    accessToken?: string,
    userType?: string | null,
    referralToken?: string | null,
  ) {
    this.logger.log(
      `Validating Google user with profile: ${JSON.stringify(profile)}`,
    );

    if (userType) {
      this.logger.log(`Type d'utilisateur spécifié: ${userType}`);
    }

    if (referralToken) {
      this.logger.log(`Token de parrainage spécifié: ${referralToken}`);
    }

    let email = '';
    let firstName = '';
    let lastName = '';
    let pictureUrl = '';
    let googleId = '';
    const phoneNumber = '';

    // Extraire les données du profil Google
    if (profile && profile.emails && profile.emails.length > 0) {
      email = profile.emails[0].value || '';
    }

    if (profile && profile.id) {
      googleId = profile.id;
    }

    if (profile && profile.name) {
      firstName = profile.name.givenName || '';
      lastName = profile.name.familyName || '';
    }

    if (profile && profile.photos && profile.photos.length > 0) {
      pictureUrl = profile.photos[0].value || '';
    }

    // Vérifier que nous avons suffisamment d'informations
    if (!email) {
      this.logger.error('Email manquant dans le profil Google');
      throw new Error('Email manquant dans le profil Google');
    }

    if (!googleId) {
      this.logger.error('ID Google manquant dans le profil');
      // Générer un ID temporaire si nécessaire
      googleId = `google_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      this.logger.warn(`ID Google généré: ${googleId}`);
    }

    this.logger.log(
      `Informations Google finales: email=${email}, id=${googleId}, nom=${firstName} ${lastName}`,
    );

    // Chercher un utilisateur par email
    let user = await this.usersService.user({ email });
    let userProfile: Profile | null = null;

    // Créer un objet profile complet pour stocker
    const googleProfile = {
      email,
      firstName,
      lastName,
      pictureUrl,
      googleId,
      phoneNumber,
      raw: profile, // Garder le profil brut
      lastUpdated: new Date().toISOString(),
    };

    if (!user) {
      // Pas d'utilisateur avec cet email, créer un nouvel utilisateur
      this.logger.log(`Création d'un nouvel utilisateur avec Google: ${email}`);

      // Déterminer le type d'utilisateur basé sur le paramètre userType
      let userTypeEnum: UserType;
      if (userType) {
        try {
          // Convertir typeUser (recruiter, recommender) en UserType enum (RECRUITER, RECOMMENDER)
          userTypeEnum = userType.toUpperCase() as UserType;
          if (!Object.values(UserType).includes(userTypeEnum)) {
            this.logger.warn(
              `Type d'utilisateur inconnu: ${userType}, utilisation de la valeur par défaut USER`,
            );
            userTypeEnum = UserType.USER;
          }
        } catch (error) {
          this.logger.error(
            `Erreur lors de la conversion du type d'utilisateur: ${(error as Error).message}`,
          );
          userTypeEnum = UserType.USER;
        }
      } else {
        userTypeEnum = UserType.USER;
      }

      this.logger.log(`Création avec le type d'utilisateur: ${userTypeEnum}`);

      // Créer l'utilisateur et son profil
      const newUser = await this.usersService.createUser({
        email,
        isVerified: true, // L'utilisateur est déjà vérifié via Google
        type: userTypeEnum,
        profile: {
          create: {
            firstName,
            lastName,
            phoneNumber,
            googleId,
            googleProfile: googleProfile,
          },
        },
      });

      // Traiter le token de parrainage s'il est spécifié
      if (referralToken) {
        try {
          this.logger.log(
            `Traitement du token de parrainage: ${referralToken}`,
          );
          // Trouver la demande de référence avec le token
          const referral = await this.prisma.referral.findFirst({
            where: {
              responseToken: referralToken,
            },
          });

          if (!referral) {
            this.logger.warn('Token de référence invalide ou inexistant');
          } else {
            // Vérifier que le token n'a pas expiré
            if (referral.tokenExpiry && referral.tokenExpiry < new Date()) {
              this.logger.warn('Le token de référence a expiré');
            } else {
              // Mettre à jour la demande de référence
              await this.prisma.referral.update({
                where: { id: referral.id },
                data: {
                  referrerId: newUser.id,
                  status: 'ACCEPTED',
                  responseDate: new Date(),
                },
              });

              const data = await this.prisma.referral.findFirst({
                where: { id: referral.id },
                include: { requester: { include: { profile: true } } },
              });

              if (data && data.requester && data.requester.email) {
                const requesterName = data.requester.profile?.firstName || '';
                await this.emailService.sendAcceptInvitationEmail(
                  data.requester.email,
                  requesterName,
                );
              }
              this.logger.log(
                `Parrainage associé avec succès à l'utilisateur: ${newUser.id}`,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Erreur lors du traitement du token de parrainage: ${(error as Error).message}`,
          );
          // On ne bloque pas la création de l'utilisateur en cas d'erreur de parrainage
        }
      }

      user = newUser;
      this.logger.log(`Nouvel utilisateur créé: ${user.id}`);
    } else {
      // Utilisateur existe déjà, mettre à jour son profil
      this.logger.log(`Utilisateur existant: ${user.id}`);
      userProfile = await this.profileService.profileByUserId(user.id);

      if (userProfile) {
        // Mise à jour du profil existant
        this.logger.log(`Mise à jour du profil existant: ${userProfile.id}`);
        userProfile = await this.profileService.updateProfile({
          where: { id: userProfile.id },
          data: {
            firstName: firstName || userProfile.firstName,
            lastName: lastName || userProfile.lastName,
            phoneNumber: phoneNumber || userProfile.phoneNumber,
            googleId,
            googleProfile: googleProfile,
          },
        });
      } else {
        // Création d'un nouveau profil si inexistant
        this.logger.log(
          `Création d'un nouveau profil pour l'utilisateur existant`,
        );
        userProfile = await this.profileService.createProfile({
          user: {
            connect: { id: user.id },
          },
          firstName,
          lastName,
          phoneNumber,
          googleId,
          googleProfile: googleProfile,
        });
      }

      // Mettre à jour l'utilisateur pour s'assurer qu'il est vérifié
      user = await this.usersService.updateUser({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    return user;
  }

  async loginWithGoogle(user: User) {
    this.logger.log(`Utilisateur authentifié via Google: ${user.email}`);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    // Récupérer l'utilisateur complet pour s'assurer d'avoir toutes les informations à jour
    const updatedUser = await this.usersService.user({ id: user.id });

    if (!updatedUser) {
      this.logger.error(
        `Utilisateur ${user.id} introuvable après authentification Google`,
      );
      throw new Error('Utilisateur introuvable après authentification');
    }

    // Récupérer le profil de l'utilisateur
    const userProfile = await this.profileService.profileByUserId(user.id);

    // Déterminer si c'est la première connexion en vérifiant si l'utilisateur vient d'être créé
    // On considère que c'est une première connexion si l'utilisateur a été créé il y a moins de 30 secondes
    const isFirstLogin =
      new Date().getTime() - new Date(updatedUser.createdAt).getTime() < 30000;

    if (!userProfile) {
      this.logger.error(
        `Profil pour l'utilisateur ${user.id} introuvable après authentification Google`,
      );
    }

    // Exclure les informations sensibles
    const { ...userInfo } = updatedUser;

    // Extraction sécurisée du pictureUrl depuis googleProfile du profil
    const profilePicture = userProfile?.googleProfile
      ? typeof userProfile.googleProfile === 'object'
        ? (userProfile.googleProfile as Record<string, string>).pictureUrl ||
          null
        : null
      : null;

    // Générer le token JWT
    const access_token = this.jwtService.sign(payload);

    // Préparer l'objet cookie
    const cookie = {
      name: 'auth_token',
      value: access_token,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Secure en production uniquement
        sameSite: 'lax' as const,
        maxAge: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
        path: '/',
      },
    };

    return {
      access_token, // Pour la compatibilité avec l'ancien code
      cookie,
      user: {
        id: userInfo.id,
        email: userInfo.email,
        firstName: userProfile?.firstName || '',
        lastName: userProfile?.lastName || '',
        isVerified: userInfo.isVerified,
        googleId: userProfile?.googleId || null,
        profilePicture,
        createdAt: userInfo.createdAt,
        updatedAt: userInfo.updatedAt,
        isFirstLogin,
      },
      auth_provider: 'google',
      message: 'Authentification Google réussie',
    };
  }

  /**
   * Vérifie si l'onboarding d'un utilisateur est complété
   * @param userId ID de l'utilisateur
   * @returns boolean indiquant si l'onboarding est complété
   */
  async isOnboardingCompleted(userId: string): Promise<boolean> {
    try {
      // Récupérer l'utilisateur
      const user = await this.usersService.user({ id: userId });

      if (!user) {
        return false;
      }

      // Pour les utilisateurs de type USER et RECOMMENDER
      if (user.type === 'USER' || user.type === 'RECOMMENDER') {
        // Récupérer le profil avec le studyLevel
        const profile = await this.prisma.profile.findUnique({
          where: { userId: user.id },
          include: { studyLevel: true },
        });

        // Vérifier les demandes de referral
        const referrals = await this.prisma.referral.findMany({
          where: { requesterId: user.id },
        });

        // L'onboarding est complet si l'utilisateur a un studyLevel et au moins une demande de referral
        const hasStudyLevel =
          profile?.studyLevel !== null && profile?.studyLevel !== undefined;
        const hasReferralRequest = referrals.length > 0;

        return hasStudyLevel && hasReferralRequest;
      }

      // Pour les recruteurs, retourner toujours true pour l'instant
      if (user.type === 'RECRUITER') {
        return true;
      }

      return false;
    } catch (error) {
      console.error("Erreur lors de la vérification de l'onboarding:", error);
      return false;
    }
  }
}
