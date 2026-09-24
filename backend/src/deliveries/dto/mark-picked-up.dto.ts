import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MarkPickedUpDto {
  @ApiProperty({ description: 'The QR code token scanned from the parcel' })
  @IsString()
  qrCode!: string;
}
