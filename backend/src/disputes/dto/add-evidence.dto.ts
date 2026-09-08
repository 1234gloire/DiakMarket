import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class AddEvidenceDto {
  @ApiProperty()
  @IsUrl()
  url!: string;

  @ApiProperty()
  @IsString()
  publicId!: string;

  @ApiProperty({ enum: ['IMAGE', 'VIDEO', 'DOCUMENT'] })
  @IsIn(['IMAGE', 'VIDEO', 'DOCUMENT'])
  type!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
