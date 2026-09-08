import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { DisputeStatus } from '../../generated/prisma/enums.js';

const RESOLUTION_STATUSES = [
  DisputeStatus.ACCEPTED,
  DisputeStatus.REJECTED,
  DisputeStatus.RETURN_REQUESTED,
  DisputeStatus.REFUNDED,
  DisputeStatus.PARTIALLY_REFUNDED,
  DisputeStatus.CLOSED,
] as const;

export class ResolveDisputeDto {
  @ApiProperty({ enum: RESOLUTION_STATUSES })
  @IsEnum(DisputeStatus)
  status!: (typeof RESOLUTION_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;

  @ApiPropertyOptional({ description: 'Required for REFUNDED / PARTIALLY_REFUNDED' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  refundAmount?: number;
}
