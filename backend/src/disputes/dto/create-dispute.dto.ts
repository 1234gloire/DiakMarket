import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, MaxLength } from 'class-validator';
import { DisputeReason } from '../../generated/prisma/enums.js';

export class CreateDisputeDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty({ enum: DisputeReason })
  @IsEnum(DisputeReason)
  reason!: DisputeReason;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  description!: string;
}
