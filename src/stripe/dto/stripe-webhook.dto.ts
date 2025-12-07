import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO représentant les données d'un événement webhook Stripe
 */
export class StripeWebhookDto {
  @ApiProperty({
    description: "Type d'événement Stripe",
    example: 'checkout.session.completed',
  })
  @IsNotEmpty()
  @IsString()
  readonly type: string;

  @ApiProperty({
    description: "Données de l'événement Stripe",
  })
  @IsNotEmpty()
  readonly data: {
    object: unknown;
  };
}
