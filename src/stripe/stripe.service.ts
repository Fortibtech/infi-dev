import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeConfig } from './configs/stripe.config';
import { StripeEventType } from './models/stripe-event.model';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PlanType, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

/**
 * Service pour gérer les interactions avec l'API Stripe
 */
@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const config = this.configService.get<StripeConfig>('stripe');

    if (!config?.secretKey) {
      throw new Error(
        'La clé secrète Stripe est manquante dans la configuration',
      );
    }

    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion,
    });
  }

  /**
   * Construit un événement Stripe à partir des données brutes et de la signature
   * @param payload Données brutes de la requête
   * @param signature Signature de la requête
   * @returns Événement Stripe construit
   */
  public constructEvent(payload: string, signature: string): Stripe.Event {
    const webhookSecret =
      this.configService.get<StripeConfig>('stripe')?.webhookSecret;

    if (!webhookSecret) {
      throw new Error(
        'Le secret du webhook Stripe est manquant dans la configuration',
      );
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }

  /**
   * Crée une session de paiement Stripe pour un abonnement
   * @param userId ID de l'utilisateur
   * @param dto Données pour la session de paiement
   * @returns Session de paiement créée
   */
  public async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<Stripe.Checkout.Session> {
    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${userId} non trouvé`);
    }

    // Vérifier si l'utilisateur a déjà un abonnement actif
    if (user.subscription?.status === 'ACTIVE') {
      throw new BadRequestException("L'utilisateur a déjà un abonnement actif");
    }

    // Récupérer le prix correspondant au plan choisi
    const price = await this.prisma.prices.findFirst({
      where: {
        type: dto.planType,
        pricingType: 'RECURRING', // Pour les abonnements
      },
    });

    if (!price) {
      throw new NotFoundException(
        `Aucun prix trouvé pour le plan ${dto.planType}`,
      );
    }

    // Préparer les métadonnées
    const metadata = {
      userId,
      planType: dto.planType,
      ...dto.metadata,
    };

    // Créer la session Stripe avec des paramètres de sécurité supplémentaires
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: dto.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: dto.cancelUrl,
      client_reference_id: userId,
      customer_email: user.email,
      metadata,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      payment_method_collection: 'if_required',
    });

    this.logger.log(
      `Session de paiement créée pour l'utilisateur ${userId}: ${session.id}`,
    );

    return session;
  }

  /**
   * Gère les changements de statut des abonnements
   * @param subscriptionId ID de l'abonnement
   * @param customerId ID du client
   * @param isCreated Indique si l'abonnement vient d'être créé
   */
  public async manageSubscriptionStatusChange(
    subscriptionId: string,
    customerId: string,
    isCreated: boolean = false,
  ): Promise<void> {
    this.logger.log(
      `Gestion du changement de statut d'abonnement: ${subscriptionId} pour le client ${customerId}`,
    );
    this.logger.log(`Action de création: ${isCreated}`);

    try {
      // Récupérer les détails de l'abonnement depuis Stripe
      const stripeSubscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      // Récupérer les métadonnées de l'abonnement
      const metadata = stripeSubscription.metadata || {};
      const userId = metadata.userId;

      // Si nous n'avons pas d'userId dans les métadonnées, essayer de trouver l'utilisateur par email
      let userIdToUse = userId;
      if (!userIdToUse && stripeSubscription.customer) {
        const customer = await this.stripe.customers.retrieve(
          stripeSubscription.customer as string,
        );
        if ('email' in customer && customer.email) {
          // Trouver l'utilisateur par email
          const user = await this.prisma.user.findUnique({
            where: { email: customer.email },
          });
          if (user) {
            userIdToUse = user.id;
          }
        }
      }

      if (!userIdToUse) {
        this.logger.error(
          `Impossible de trouver l'utilisateur pour l'abonnement ${subscriptionId}`,
        );
        return;
      }

      // Convertir le statut Stripe en statut de notre application
      const status = this.mapStripeStatusToDbStatus(
        stripeSubscription.status as string,
      );

      // Récupérer les détails du produit/plan
      const stripeItem = stripeSubscription.items.data[0];
      const priceId = stripeItem.price.id;

      // Trouver le produit dans notre base de données
      const price = await this.prisma.prices.findUnique({
        where: { priceId },
      });

      if (!price) {
        this.logger.error(`Prix non trouvé pour ${priceId}`);
        return;
      }

      // Vérifier si un abonnement existe déjà pour cet ID Stripe
      const existingSubscription = await this.prisma.subscriptions.findFirst({
        where: {
          OR: [
            { providerSubscriptionId: subscriptionId },
            { userId: userIdToUse },
          ],
        },
      });

      if (existingSubscription) {
        // Mettre à jour l'abonnement existant
        await this.prisma.subscriptions.update({
          where: { id: existingSubscription.id },
          data: {
            providerSubscriptionId: subscriptionId,
            status,
            priceId: price.id,
            planType: price.type,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            currentPeriodStart: new Date(
              stripeSubscription.current_period_start * 1000,
            ),
            currentPeriodEnd: new Date(
              stripeSubscription.current_period_end * 1000,
            ),
            cancelAt: stripeSubscription.cancel_at
              ? new Date(stripeSubscription.cancel_at * 1000)
              : null,
            canceledAt: stripeSubscription.canceled_at
              ? new Date(stripeSubscription.canceled_at * 1000)
              : null,
            endedAt: stripeSubscription.ended_at
              ? new Date(stripeSubscription.ended_at * 1000)
              : null,
            quantity: stripeItem.quantity || 1,
          },
        });
      } else {
        // Créer un nouvel abonnement
        await this.prisma.subscriptions.create({
          data: {
            subscriptionId: this.generateSubscriptionId(),
            providerSubscriptionId: subscriptionId,
            userId: userIdToUse,
            status,
            priceId: price.id,
            planType: price.type,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            currentPeriodStart: new Date(
              stripeSubscription.current_period_start * 1000,
            ),
            currentPeriodEnd: new Date(
              stripeSubscription.current_period_end * 1000,
            ),
            cancelAt: stripeSubscription.cancel_at
              ? new Date(stripeSubscription.cancel_at * 1000)
              : null,
            canceledAt: stripeSubscription.canceled_at
              ? new Date(stripeSubscription.canceled_at * 1000)
              : null,
            endedAt: stripeSubscription.ended_at
              ? new Date(stripeSubscription.ended_at * 1000)
              : null,
            quantity: stripeItem.quantity || 1,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Erreur lors de la mise à jour de l'abonnement ${subscriptionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Génère un ID d'abonnement unique
   * @returns ID d'abonnement généré
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Convertit un statut d'abonnement Stripe en statut de notre base de données
   * @param stripeStatus Statut Stripe
   * @returns Statut pour notre base de données
   */
  private mapStripeStatusToDbStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'incomplete':
        return SubscriptionStatus.INCOMPLETE;
      case 'incomplete_expired':
        return SubscriptionStatus.INCOMPLETE_EXPIRED;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      default:
        this.logger.warn(`Statut Stripe non reconnu: ${stripeStatus}`);
        return SubscriptionStatus.INCOMPLETE;
    }
  }

  /**
   * Traite un événement Stripe selon son type
   * @param event Événement Stripe à traiter
   */
  public async processEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Traitement de l'événement Stripe: ${event.type}`);

    try {
      switch (event.type) {
        case StripeEventType.CUSTOMER_SUBSCRIPTION_CREATED:
        case StripeEventType.CUSTOMER_SUBSCRIPTION_UPDATED:
        case StripeEventType.CUSTOMER_SUBSCRIPTION_DELETED: {
          const subscription = event.data.object as Stripe.Subscription;
          await this.manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            event.type === StripeEventType.CUSTOMER_SUBSCRIPTION_CREATED,
          );
          break;
        }
        case StripeEventType.CHECKOUT_SESSION_COMPLETED: {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode === 'subscription' && session.subscription) {
            await this.manageSubscriptionStatusChange(
              session.subscription as string,
              session.customer as string,
              true,
            );
          }
          break;
        }
        default:
          this.logger.warn(`Type d'événement non géré: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Erreur lors du traitement de l'événement ${event.type}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Annule un abonnement Stripe
   * @param userId ID de l'utilisateur
   * @param dto Options d'annulation
   * @returns L'abonnement annulé
   */
  public async cancelSubscription(
    userId: string,
    dto: CancelSubscriptionDto,
  ): Promise<void> {
    // Vérifier si l'utilisateur existe et a un abonnement actif
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${userId} non trouvé`);
    }

    if (!user.subscription) {
      throw new BadRequestException("L'utilisateur n'a pas d'abonnement actif");
    }

    if (!user.subscription.providerSubscriptionId) {
      throw new BadRequestException("L'abonnement n'a pas d'ID Stripe associé");
    }

    try {
      // Annuler l'abonnement dans Stripe
      const subscription = await this.stripe.subscriptions.update(
        user.subscription.providerSubscriptionId,
        {
          cancel_at_period_end: dto.cancelAtPeriodEnd,
        },
      );

      // Mettre à jour le statut dans notre base de données
      await this.prisma.subscriptions.update({
        where: { id: user.subscription.id },
        data: {
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          cancelAt: subscription.cancel_at
            ? new Date(subscription.cancel_at * 1000)
            : null,
          canceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : null,
          status: dto.cancelAtPeriodEnd
            ? SubscriptionStatus.ACTIVE
            : SubscriptionStatus.CANCELED,
        },
      });

      this.logger.log(
        `Abonnement ${user.subscription.providerSubscriptionId} annulé pour l'utilisateur ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'annulation de l'abonnement: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
