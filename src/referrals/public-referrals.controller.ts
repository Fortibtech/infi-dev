import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../database/prisma.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/guards/roles.guard';
import { UserType } from '@prisma/client';
import { UseGuards } from '@nestjs/common';
import { EmailService } from '../email/email.service';

@ApiTags('Acceptation Parrainage')
@Controller('public/referrals')
export class PublicReferralsController {
  constructor(
    private readonly referralsService: ReferralsService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Post('accept')
  @UseGuards(RolesGuard)
  @Roles(UserType.USER, UserType.RECOMMENDER)
  @ApiOperation({
    summary: 'Accepter une demande de parrainage via lien',
    description:
      "Permet d'accepter une demande de parrainage via un lien d'invitation sans être connecté",
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        referralId: {
          type: 'string',
          description: 'ID de la demande de parrainage',
        },
        responseMessage: {
          type: 'string',
          description: 'Message de réponse optionnel',
        },
        token: {
          type: 'string',
          description: 'Token de sécurité (obligatoire)',
        },
      },
      required: ['referralId', 'token'],
    },
  })
  @ApiOkResponse({ description: 'Demande de parrainage acceptée avec succès' })
  @ApiBadRequestResponse({
    description: 'Demande de parrainage non trouvée ou paramètres invalides',
  })
  @ApiUnauthorizedResponse({
    description: 'Token manquant, invalide ou expiré',
  })
  async acceptReferral(
    @Body()
    responseData: {
      referralId: string;
      responseMessage?: string;
      token: string;
    },
  ) {
    // Vérifier le token de sécurité
    const referral = await this.referralsService.verifyResponseToken(
      responseData.referralId,
      responseData.token,
    );

    if (!referral || !referral.referrerId) {
      throw new BadRequestException('Demande de parrainage non trouvée');
    }

    // Toujours définir le statut comme ACCEPTED
    return this.referralsService.update(
      responseData.referralId,
      {
        status: 'ACCEPTED',
        responseMessage:
          responseData.responseMessage || 'Demande acceptée via lien',
      },
      referral.referrerId,
    );
  }

  @Get('accept')
  @ApiOperation({
    summary: 'Accepter directement une demande de parrainage via URL',
    description:
      "Permet d'accepter une demande de parrainage en ouvrant directement l'URL dans un navigateur",
  })
  @ApiOkResponse({ description: 'Demande de parrainage acceptée avec succès' })
  async acceptReferralByGet(
    @Query('referralId') referralId: string,
    @Query('token') token: string,
  ) {
    if (!referralId || !token) {
      throw new BadRequestException('referralId et token sont requis');
    }

    try {
      // Vérifier le token de sécurité
      await this.referralsService.verifyResponseToken(referralId, token);

      // Log pour le débogage
      console.log('=== VALIDATION DU LIEN DE PARRAINAGE ===');
      console.log(`Token valide pour la demande: ${referralId}`);

      // Récupérer la référence
      const referral = await this.prisma.referral.findUnique({
        where: { id: referralId },
      });

      if (!referral || !referral.referrerId) {
        throw new BadRequestException('Demande de parrainage non trouvée');
      }

      // Accepter la demande
      const result = await this.referralsService.update(
        referralId,
        {
          status: 'ACCEPTED',
          responseMessage: 'Demande acceptée automatiquement via lien direct',
        },
        referral.referrerId,
      );

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

      return {
        success: true,
        message: 'Demande de parrainage acceptée avec succès',
        data: result,
      };
    } catch (error) {
      console.error(`Erreur lors de la validation du lien: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
