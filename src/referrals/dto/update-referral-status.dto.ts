import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

enum ReferralStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export class UpdateReferralStatusDto {
  @IsNotEmpty()
  @IsEnum(ReferralStatus)
  status: ReferralStatus;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  responseMessage?: string;
}
