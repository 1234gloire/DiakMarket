import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

export class UpdateUserRolesDto {
  @ApiProperty({ enum: Role, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Role, { each: true })
  roles!: Role[];
}
