import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateAddressDto } from './dto/create-address.dto.js';
import type { UpdateAddressDto } from './dto/update-address.dto.js';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findMine(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      include: { country: true, city: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) await this.clearDefault(userId);
    return this.prisma.address.create({ data: { userId, ...dto } });
  }

  async update(id: string, userId: string, dto: UpdateAddressDto) {
    await this.assertOwner(id, userId);
    if (dto.isDefault) await this.clearDefault(userId);
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.assertOwner(id, userId);
    await this.prisma.address.delete({ where: { id } });
  }

  private async clearDefault(userId: string) {
    await this.prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
  }

  private async assertOwner(id: string, userId: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException('You do not own this address');
    return address;
  }
}
