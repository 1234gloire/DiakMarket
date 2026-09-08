import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class CreateOfferDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Proposed price, in the minor unit of the product currency' })
  @IsInt()
  @IsPositive()
  amount!: number;
}
