/**
 * Types d'événements Stripe pertinents pour l'application
 */
export enum StripeEventType {
  CHECKOUT_SESSION_COMPLETED = 'checkout.session.completed',
  CUSTOMER_SUBSCRIPTION_CREATED = 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED = 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED = 'customer.subscription.deleted',
}

/**
 * Ensemble des types d'événements Stripe pertinents
 */
export const RELEVANT_STRIPE_EVENTS = new Set<string>([
  StripeEventType.CHECKOUT_SESSION_COMPLETED,
  StripeEventType.CUSTOMER_SUBSCRIPTION_CREATED,
  StripeEventType.CUSTOMER_SUBSCRIPTION_UPDATED,
  StripeEventType.CUSTOMER_SUBSCRIPTION_DELETED,
]);
