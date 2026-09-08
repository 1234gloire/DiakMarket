import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RegisterCourierDto } from './dto/register-courier.dto.js';

@Injectable()
export class CouriersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterCourierDto) {
    const existing = await this.prisma.courier.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException('You are already registered as a courier');

    const courier = await this.prisma.courier.create({
      data: { userId, vehicleType: dto.vehicleType, deliveryPartnerId: dto.deliveryPartnerId },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { roles: { push: 'COURIER' } } });
    return courier;
  }

  getMine(userId: string) {
    return this.prisma.courier.findUniqueOrThrow({ where: { userId } });
  }

  async setAvailability(userId: string, isAvailable: boolean) {
    const courier = await this.prisma.courier.findUniqueOrThrow({ where: { userId } });
    if (!courier.isVerified) throw new BadRequestException('Your courier account is not verified yet');
    return this.prisma.courier.update({ where: { userId }, data: { isAvailable } });
  }

  async verify(courierId: string) {
    return this.prisma.courier.update({ where: { id: courierId }, data: { isVerified: true } });
  }
}
