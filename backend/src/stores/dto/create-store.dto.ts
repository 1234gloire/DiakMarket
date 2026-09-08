import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateStoreDto {
  @ApiProperty()
  @IsUUID()
  countryId!: string;

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ description: 'URL-safe unique identifier, e.g. "diak-fashion"' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be lowercase, alphanumeric, dash-separated' })
  @MaxLength(60)
  slug!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
