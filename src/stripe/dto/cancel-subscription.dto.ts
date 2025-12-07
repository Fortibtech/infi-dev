import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiProperty({
    description:
      "Si true, l'abonnement sera annulé à la fin de la période en cours. Si false, l'annulation est immédiate.",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean = true;
}
