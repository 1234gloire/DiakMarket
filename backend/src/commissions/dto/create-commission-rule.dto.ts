import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { SellerType } from '../../generated/prisma/enums.js';

export class CreateCommissionRuleDto {
  @ApiProperty()
  @IsUUID()
  countryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: SellerType })
  @IsOptional()
  @IsEnum(SellerType)
  sellerType?: SellerType;

  @ApiProperty({ description: 'Basis points, e.g. 800 = 8%', minimum: 0, maximum: 10000 })
  @IsInt()
  @Min(0)
  @Max(10000)
  percentageBps!: number;

  @ApiPropertyOptional({ description: 'Flat fee in minor unit', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  fixedFee?: number;
}
