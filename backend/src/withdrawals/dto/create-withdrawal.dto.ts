import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsObject, IsPositive } from 'class-validator';
import { PaymentProviderCode } from '../../generated/prisma/enums.js';

export class CreateWithdrawalDto {
  @ApiProperty({ description: 'Amount to withdraw, in the minor unit of your wallet currency' })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiProperty({ enum: PaymentProviderCode })
  @IsEnum(PaymentProviderCode)
  provider!: PaymentProviderCode;

  @ApiProperty({ description: 'Payout destination, e.g. { phone: "+221771234567" } — never full card/account secrets' })
  @IsObject()
  destination!: Record<string, string>;
}
