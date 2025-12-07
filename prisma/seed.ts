import {
  PrismaClient,
  PricingType,
  PricingPlanInterval,
  PlanType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Début du seeding...');

  // Supprimer les données existantes pour éviter les doublons
  await prisma.subscriptions.deleteMany({});
  await prisma.prices.deleteMany({});
  await prisma.products.deleteMany({});

  // Créer le produit Standard
  const standardProduct = await prisma.products.create({
    data: {
      productId: 'prod_S06GXFUrCy0ZmF',
      active: true,
      name: 'Abonnement Standard',
      description: 'Abonnement aux services Infiny - Niveau Standard',
    },
  });

  // Créer le produit Premium
  const premiumProduct = await prisma.products.create({
    data: {
      productId: 'prod_S06GJb9TKbA2It',
      active: true,
      name: 'Abonnement Premium',
      description: 'Abonnement aux services Infiny - Niveau Premium',
    },
  });

  // Créer le produit Master
  const masterProduct = await prisma.products.create({
    data: {
      productId: 'prod_S06GrfAirAFRO6',
      active: true,
      name: 'Abonnement Master',
      description: 'Abonnement aux services Infiny - Niveau Master',
    },
  });

  console.log('Produits créés:');
  console.log('Standard:', standardProduct);
  console.log('Premium:', premiumProduct);
  console.log('Master:', masterProduct);

  // Créer les prix pour chaque produit
  const standardPrice = await prisma.prices.create({
    data: {
      priceId: 'price_1R663YHyTSZY2hzun91lihnZ', // Remplacez par votre vrai ID de prix Stripe
      productId: standardProduct.id,
      description: 'Abonnement Standard Mensuel',
      unitAmount: 40000, // 400€ en centimes
      currency: 'EUR',
      pricingType: PricingType.RECURRING,
      pricingPlanInterval: PricingPlanInterval.MONTH,
      intervalCount: 1,
      type: PlanType.STANDARD,
    },
  });

  const premiumPrice = await prisma.prices.create({
    data: {
      priceId: 'price_1R663tHyTSZY2hzuUM7YFBwv', // Remplacez par votre vrai ID de prix Stripe
      productId: premiumProduct.id,
      description: 'Abonnement Premium Mensuel',
      unitAmount: 120000, // 1200€ en centimes
      currency: 'EUR',
      pricingType: PricingType.RECURRING,
      pricingPlanInterval: PricingPlanInterval.MONTH,
      intervalCount: 1,
      type: PlanType.PREMIUM,
    },
  });

  const masterPrice = await prisma.prices.create({
    data: {
      priceId: 'price_1R6648HyTSZY2hzu0MJQGiQe', // Remplacez par votre vrai ID de prix Stripe
      productId: masterProduct.id,
      description: 'Abonnement Master Mensuel',
      unitAmount: 200000, // 2000€ en centimes
      currency: 'EUR',
      pricingType: PricingType.RECURRING,
      pricingPlanInterval: PricingPlanInterval.MONTH,
      intervalCount: 1,
      type: PlanType.MASTER,
    },
  });

  console.log('Prix créés:');
  console.log('Standard:', standardPrice);
  console.log('Premium:', premiumPrice);
  console.log('Master:', masterPrice);

  console.log('Seeding terminé avec succès!');
}

main()
  .catch((e) => {
    console.error('Erreur pendant le seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
