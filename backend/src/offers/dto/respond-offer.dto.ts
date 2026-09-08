import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, ValidateIf } from 'class-validator';

export enum OfferResponseAction {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  COUNTER = 'COUNTER',
}

export class RespondOfferDto {
  @ApiProperty({ enum: OfferResponseAction })
  @IsEnum(OfferResponseAction)
  action!: OfferResponseAction;

  @ApiPropertyOptional({ description: 'Required when action is COUNTER' })
  @ValidateIf((dto: RespondOfferDto) => dto.action === OfferResponseAction.COUNTER)
  @IsInt()
  @IsPositive()
  counterAmount?: number;
}
