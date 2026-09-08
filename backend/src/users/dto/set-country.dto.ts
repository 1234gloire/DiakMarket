import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SetCountryDto {
  @ApiProperty()
  @IsUUID()
  countryId!: string;
}
