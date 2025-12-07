import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { stripeConfig } from './configs/stripe.config';
import { DatabaseModule } from '../database/database.module';

/**
 * Module pour gérer les interactions avec Stripe
 */
@Module({
  imports: [ConfigModule.forFeature(stripeConfig), DatabaseModule],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
