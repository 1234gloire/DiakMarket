import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class SendMessageDto {
  @ApiPropertyOptional()
  @ValidateIf((dto: SendMessageDto) => !dto.imageUrl)
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imagePublicId?: string;
}
