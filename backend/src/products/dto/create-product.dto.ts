import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductCondition } from '../../generated/prisma/enums.js';

export class CreateProductDto {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty()
  @IsUUID()
  countryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ description: 'Price in the minor unit of the country currency (e.g. 30000 for 30 000 XOF)' })
  @IsInt()
  @IsPositive()
  price!: number;

  @ApiProperty({ enum: ProductCondition })
  @IsEnum(ProductCondition)
  condition!: ProductCondition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
