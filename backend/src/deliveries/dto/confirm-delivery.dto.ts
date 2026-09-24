import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ConfirmDeliveryDto {
  @ApiProperty({ description: 'The OTP the buyer shared with the courier in person' })
  @IsString()
  @Length(4, 6)
  otpCode!: string;
}
