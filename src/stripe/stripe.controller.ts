import {
  Controller,
  Post,
  Req,
  Res,
  Logger,
  HttpStatus,
  BadRequestException,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeService } from './stripe.service';
import { RELEVANT_STRIPE_EVENTS } from './models/stripe-event.model';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StripeWebhookDto } from './dto/stripe-webhook.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/decorators/user.decorator';

/**
 * Contrôleur pour gérer les interactions avec Stripe
 */
@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(private readonly stripeService: StripeService) {}

  /**
   * Crée une session de paiement Stripe pour un abonnement
   * @param user Utilisateur authentifié
   * @param dto Données pour la session de paiement
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Créer une session de paiement Stripe' })
  @ApiBody({ type: CreateCheckoutSessionDto })
  @ApiResponse({
    status: 200,
    description: 'Session de paiement créée avec succès',
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Utilisateur ou prix non trouvé' })
  async createCheckoutSession(
    @User() user: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    this.logger.log(
      `Création d'une session de paiement pour l'utilisateur ${user.id}`,
    );

    const session = await this.stripeService.createCheckoutSession(
      user.id,
      dto,
    );

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Gère les événements webhook de Stripe
   * @param request Requête Express contenant les données de l'événement Stripe
   * @param response Réponse Express
   */
  @Post('events')
  @ApiOperation({ summary: 'Endpoint webhook pour Stripe' })
  @ApiBody({ type: StripeWebhookDto })
  @ApiResponse({ status: 200, description: 'Événement traité avec succès' })
  @ApiResponse({ status: 400, description: 'Événement invalide ou non traité' })
  async handleEvents(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<Response> {
    const signature = request.headers['stripe-signature'] as string;

    if (!signature) {
      this.logger.error('Signature Stripe manquante dans les en-têtes');
      return response.status(HttpStatus.BAD_REQUEST).json({
        message: 'Signature Stripe manquante',
      });
    }

    try {
      // Construire l'événement Stripe à partir du corps brut de la requête
      const event = this.stripeService.constructEvent(request.body, signature);

      this.logger.log(`Webhook reçu: ${event.type}`);

      // Vérifier si l'événement est pertinent pour notre application
      if (RELEVANT_STRIPE_EVENTS.has(event.type)) {
        await this.stripeService.processEvent(event);
      } else {
        this.logger.warn(`Type d'événement ignoré: ${event.type}`);
      }

      return response.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      this.logger.error(
        `Erreur lors du traitement du webhook: ${error.message}`,
        error.stack,
      );

      return response.status(HttpStatus.BAD_REQUEST).json({
        message: `Erreur de webhook: ${error.message}`,
      });
    }
  }

  /**
   * Annule un abonnement Stripe
   * @param user Utilisateur authentifié
   * @param dto Options d'annulation
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Annuler un abonnement Stripe' })
  @ApiBody({ type: CancelSubscriptionDto })
  @ApiResponse({
    status: 200,
    description: 'Abonnement annulé avec succès',
  })
  @ApiResponse({
    status: 400,
    description: "Données invalides ou pas d'abonnement actif",
  })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async cancelSubscription(
    @User() user: any,
    @Body() dto: CancelSubscriptionDto,
  ) {
    this.logger.log(`Annulation de l'abonnement pour l'utilisateur ${user.id}`);

    await this.stripeService.cancelSubscription(user.id, dto);

    return {
      message: dto.cancelAtPeriodEnd
        ? 'Votre abonnement sera annulé à la fin de la période en cours'
        : 'Votre abonnement a été annulé immédiatement',
    };
  }
}
