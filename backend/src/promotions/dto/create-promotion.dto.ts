import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { PromotionType } from '../../generated/prisma/enums.js';

export class CreatePromotionDto {
  @ApiProperty({ enum: PromotionType })
  @IsEnum(PromotionType)
  type!: PromotionType;

  @ApiPropertyOptional({ description: 'productId for BOOST_PRODUCT, storeId for STORE_HIGHLIGHT' })
  @IsOptional()
  @IsUUID()
  targetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  amount?: number;

  @ApiProperty()
  @IsDateString()
  startsAt!: string;

  @ApiProperty()
  @IsDateString()
  endsAt!: string;
}
