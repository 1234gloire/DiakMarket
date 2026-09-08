import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DeliveryMode } from '../../generated/prisma/enums.js';

export class CreateOrderDto {
  @ApiProperty({ enum: DeliveryMode })
  @IsEnum(DeliveryMode)
  deliveryMode!: DeliveryMode;

  @ApiPropertyOptional({ description: 'Required when deliveryMode is HOME_DELIVERY' })
  @IsOptional()
  @IsUUID()
  shippingAddressId?: string;
}
