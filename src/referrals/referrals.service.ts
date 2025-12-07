import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { PrismaService } from '../database/prisma.service';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { CreateReferralWithMailDto } from './dto/create-referral-with-mail.dto';
import { RelationType } from './enums/relation-type.enum';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  // Méthode utilitaire pour générer un token sécurisé
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Méthode utilitaire pour supprimer les mots de passe des objets utilisateurs
  private removePasswordsFromReferral(referral: any): any {
    if (referral.requester && 'password' in referral.requester) {
      delete (referral.requester as any).password;
    }
    if (referral.referrer && 'password' in referral.referrer) {
      delete (referral.referrer as any).password;
    }
    return referral;
  }

  // Envoyer un email de demande de parrainage
  async sendReferralInvitationEmail(
    referralId: string,
    referrerEmail: string,
    referrerName: string,
    requesterName: string,
    message: string,
    invitationLink: string,
    relationType: RelationType,
  ): Promise<void> {
    try {
      const result = await this.emailService.sendReferralInvitationEmail(
        referrerEmail,
        referrerName,
        requesterName,
        message,
        invitationLink,
        relationType,
      );
    } catch (error) {
      console.error(`Échec d'envoi d'email de parrainage: ${error.message}`);
      // On ne propage pas l'erreur pour ne pas bloquer la création du parrainage
    }
  }

  async create(createReferralDto: CreateReferralDto, req: Request) {
    const user = req.user as AuthenticatedUser;

    // Check if the referrer exists
    const referrer = await this.prisma.user.findUnique({
      where: { id: createReferralDto.referrerId },
      include: {
        profile: true,
      },
    });

    if (!referrer) {
      throw new BadRequestException('Referrer not found');
    }

    // Check if a request already exists
    const existingRequest = await this.prisma.referral.findUnique({
      where: {
        requesterId_referrerId: {
          requesterId: user.id,
          referrerId: createReferralDto.referrerId,
        },
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'A referral request already exists between these users',
      );
    }

    // Get requester profile
    const requester = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
      },
    });

    // Get referrer profile
    const referrerProfile = await this.prisma.user.findUnique({
      where: { id: createReferralDto.referrerId },
      include: {
        profile: true,
      },
    });

    // Create the referral request
    const referral = await this.prisma.referral.create({
      data: {
        requesterId: user.id,
        referrerId: createReferralDto.referrerId,
        message: createReferralDto.message,
        referrerFirstName: referrerProfile?.profile?.firstName,
      },
      include: {
        requester: true,
        referrer: true,
      },
    });

    // Générer un token sécurisé et un lien d'invitation
    const appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const invitationData = await this.generateInvitationLink(
      referral.id,
      appUrl,
    );

    // Afficher le lien d'invitation dans les logs pour faciliter les tests
    console.log("=== LIEN D'INVITATION GÉNÉRÉ ===");
    console.log(invitationData.link);
    console.log('================================');

    // Envoyer l'email de parrainage
    try {
      if (requester && referrer) {
        const requesterName = requester.profile
          ? `${requester.profile.firstName || ''} ${requester.profile.lastName || ''}`.trim()
          : requester.email;

        const referrerName = referrer.profile
          ? `${referrer.profile.firstName || ''} ${referrer.profile.lastName || ''}`.trim()
          : referrer.email;

        await this.sendReferralInvitationEmail(
          referral.id,
          referrer.email,
          referrerName,
          requesterName,
          createReferralDto.message || '',
          invitationData.link,
          createReferralDto.relationType,
        );
      }
    } catch (error) {
      console.error(`Échec de l'envoi d'email: ${error.message}`);
      // On continue même si l'email échoue
    }

    // Retirer les mots de passe des objets utilisateurs avant de les renvoyer
    return this.removePasswordsFromReferral(referral);
  }

  async findAll(userId: string) {
    // Find all requests related to this user
    const referrals = await this.prisma.referral.findMany({
      where: {
        OR: [{ requesterId: userId }, { referrerId: userId }],
      },
      include: {
        requester: true,
        referrer: true,
      },
    });

    // Supprimer les mots de passe des résultats
    return referrals.map((referral) =>
      this.removePasswordsFromReferral(referral),
    );
  }

  async findOne(id: string, userId: string) {
    // Find a specific request, ensuring the user has access to it
    const referral = await this.prisma.referral.findFirst({
      where: {
        id,
        OR: [{ requesterId: userId }, { referrerId: userId }],
      },
      include: {
        requester: true,
        referrer: true,
      },
    });

    if (!referral) {
      throw new BadRequestException('Referral request not found');
    }

    // Supprimer les mots de passe
    return this.removePasswordsFromReferral(referral);
  }

  async update(
    id: string,
    updateReferralDto: UpdateReferralDto,
    userId: string,
  ) {
    // Find the referral
    const referral = await this.prisma.referral.findUnique({
      where: { id },
    });

    if (!referral) {
      throw new BadRequestException('Referral request not found');
    }

    // Only the referrer can update the status
    if (referral.referrerId !== userId) {
      throw new BadRequestException(
        'Only the referrer can update this request',
      );
    }

    // Si le statut passe à ACCEPTED, on utilise une transaction pour
    // mettre à jour à la fois la référence et incrémenter le compteur
    if (updateReferralDto.status === 'ACCEPTED') {
      const updatedReferral = await this.prisma.$transaction(async (tx) => {
        // Mettre à jour la référence
        const updatedReferral = await tx.referral.update({
          where: { id },
          data: {
            status: updateReferralDto.status,
            responseMessage: updateReferralDto.responseMessage,
            responseDate: new Date(),
          },
          include: {
            requester: true,
            referrer: true,
          },
        });

        return updatedReferral;
      });

      // Supprimer les mots de passe
      return this.removePasswordsFromReferral(updatedReferral);
    } else {
      // Pour les autres statuts, on met simplement à jour la référence
      const updatedReferral = await this.prisma.referral.update({
        where: { id },
        data: {
          status: updateReferralDto.status,
          responseMessage: updateReferralDto.responseMessage,
          responseDate: new Date(),
        },
        include: {
          requester: true,
          referrer: true,
        },
      });

      // Supprimer les mots de passe
      return this.removePasswordsFromReferral(updatedReferral);
    }
  }

  async remove(id: string, userId: string) {
    // Find the referral
    const referral = await this.prisma.referral.findUnique({
      where: { id },
    });

    if (!referral) {
      throw new BadRequestException('Referral request not found');
    }

    // Only the requester can delete a pending request
    if (referral.requesterId !== userId || referral.status !== 'PENDING') {
      throw new BadRequestException(
        'You can only delete your own pending requests',
      );
    }

    // Delete the referral
    return this.prisma.referral.delete({
      where: { id },
    });
  }

  async findReceived(userId: string) {
    // Find all requests where the user is the referrer
    const referrals = await this.prisma.referral.findMany({
      where: {
        referrerId: userId,
      },
      include: {
        requester: true,
        referrer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Supprimer les mots de passe
    return referrals.map((referral) =>
      this.removePasswordsFromReferral(referral),
    );
  }

  async getStats(userId: string) {
    // Get counts for different types of referrals
    const [
      sentTotal,
      receivedTotal,
      sentPending,
      receivedPending,
      sentAccepted,
      receivedAccepted,
      sentRejected,
      receivedRejected,
    ] = await Promise.all([
      // Sent referrals
      this.prisma.referral.count({
        where: { requesterId: userId },
      }),
      // Received referrals
      this.prisma.referral.count({
        where: { referrerId: userId },
      }),
      // Pending sent
      this.prisma.referral.count({
        where: { requesterId: userId, status: 'PENDING' },
      }),
      // Pending received
      this.prisma.referral.count({
        where: { referrerId: userId, status: 'PENDING' },
      }),
      // Accepted sent
      this.prisma.referral.count({
        where: { requesterId: userId, status: 'ACCEPTED' },
      }),
      // Accepted received
      this.prisma.referral.count({
        where: { referrerId: userId, status: 'ACCEPTED' },
      }),
      // Rejected sent
      this.prisma.referral.count({
        where: { requesterId: userId, status: 'REJECTED' },
      }),
      // Rejected received
      this.prisma.referral.count({
        where: { referrerId: userId, status: 'REJECTED' },
      }),
    ]);

    // Return the statistics
    return {
      sent: {
        total: sentTotal,
        pending: sentPending,
        accepted: sentAccepted,
        rejected: sentRejected,
      },
      received: {
        total: receivedTotal,
        pending: receivedPending,
        accepted: receivedAccepted,
        rejected: receivedRejected,
      },
    };
  }

  /**
   * Génère un lien d'invitation qui peut être envoyé par email
   * @param referralId ID de la demande de référence
   * @param baseUrl URL de base de l'application frontend
   */
  async generateInvitationLink(referralId: string, baseUrl: string) {
    // Récupérer les informations de la demande de référence
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        requester: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!referral) {
      throw new BadRequestException('Referral request not found');
    }

    // Générer un token sécurisé valide pour 48 heures
    const secureToken = this.generateSecureToken();
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 48);

    // Enregistrer le token dans la base de données
    await this.prisma.referral.update({
      where: { id: referralId },
      data: {
        responseToken: secureToken,
        tokenExpiry: expiryDate,
      },
    });

    // Extraire le nom du demandeur
    const firstName = referral.requester.profile?.firstName || '';
    const lastName = referral.requester.profile?.lastName || '';
    const email = referral.requester.email || '';

    // Construire les paramètres de requête
    const queryParams = new URLSearchParams({
      referralId: referralId,
      token: secureToken, // Ajouter le token au lien
    });

    // Générer l'URL complète avec la nouvelle route publique
    const invitationLink = `${baseUrl}/public/referrals/accept?${queryParams.toString()}`;

    return {
      link: invitationLink,
      referralDetails: {
        id: referralId,
        requesterName: `${firstName} ${lastName}`.trim(),
        requesterEmail: email,
        message: referral.message,
        createdAt: referral.createdAt,
        expiryDate: expiryDate,
      },
    };
  }

  // Vérifier la validité d'un token de réponse
  async verifyResponseToken(referralId: string, token: string) {
    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!referral) {
      throw new BadRequestException('Demande de référence non trouvée');
    }

    // Vérifier que le token est valide
    if (referral.responseToken !== token) {
      throw new UnauthorizedException('Token invalide');
    }

    // Vérifier que le token n'a pas expiré
    if (referral.tokenExpiry && referral.tokenExpiry < new Date()) {
      throw new UnauthorizedException('Le lien a expiré');
    }

    return referral;
  }

  async createWithMail(
    createReferralWithMailDto: CreateReferralWithMailDto,
    req: Request,
  ) {
    const { email, firstName, lastName, message, relationType } =
      createReferralWithMailDto;

    const user = req.user as AuthenticatedUser;
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Cette adresse email est déjà utilisée');
    }

    const token = this.generateSecureToken();
    const referral = await this.prisma.referral.create({
      data: {
        requesterId: user.id,
        message,
        responseToken: token,
        tokenExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
        referrerFirstName: createReferralWithMailDto.firstName,
      },
    });

    const invitationLink = `${this.configService.get<string>('APP_URL')}/register?token=${token}`;
    await this.sendReferralInvitationEmail(
      referral.id,
      email,
      firstName,
      user?.profile?.firstName || '',
      message,
      invitationLink,
      relationType,
    );

    return referral;
  }

  // Cron job to process expired referrals
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    console.log('Cron job executed');
    const expiredReferrals = await this.prisma.referral.findMany({
      where: {
        tokenExpiry: {
          lt: new Date(),
        },
        status: 'PENDING', // Only process pending referrals
      },
      include: {
        requester: true, // Include the requester relation
        referrer: {
          // Include the referrer relation
          include: {
            profile: true, // Include the profile nested within the referrer
          },
        },
      },
    });
    console.log(
      `Found ${expiredReferrals.length} expired referrals to process.`,
    );

    for (const referral of expiredReferrals) {
      // Check if necessary data exists before proceeding
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { status: 'REJECTED' },
      });
      if (referral.requester?.email && referral.referrerFirstName) {
        try {
          await this.emailService.sendRefusalInvitationEmail(
            referral.requester.email,
            referral.referrerFirstName,
          );
          console.log(
            `Processed and sent refusal email for referral ${referral.id}`,
          );
        } catch (error) {
          console.error(
            `Failed to process referral ${referral.id}: ${error.message}`,
          );
          // Consider whether to continue or stop processing on error
        }
      } else {
        console.warn(
          `Skipping referral ${referral.id} due to missing requester/referrer data.`,
        );
        // Optionally update the status even if email fails
        // await this.prisma.referral.update({
        //   where: { id: referral.id },
        //   data: { status: 'REJECTED', responseMessage: 'Expired - Missing data for notification' },
        // });
      }
    }
  }
}
