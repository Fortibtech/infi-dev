import { registerAs } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Configuration pour Stripe
 */
export const stripeConfig = registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
}));

/**
 * Interface pour la configuration Stripe
 */
export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  apiVersion: Stripe.LatestApiVersion;
}
