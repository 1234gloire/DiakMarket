import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

export class SimulatePaymentDto {
  @ApiProperty()
  @IsUUID()
  transactionId!: string;

  @ApiProperty({ enum: ['SUCCEEDED', 'FAILED'] })
  @IsIn(['SUCCEEDED', 'FAILED'])
  outcome!: 'SUCCEEDED' | 'FAILED';
}
