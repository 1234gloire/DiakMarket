import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RegisterCourierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  vehicleType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deliveryPartnerId?: string;
}
