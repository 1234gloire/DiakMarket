import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty({ description: 'Mobile Money payer phone number, in international format' })
  @IsPhoneNumber()
  payerPhone!: string;
}
