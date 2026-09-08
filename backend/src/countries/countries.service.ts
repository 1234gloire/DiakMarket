import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.country.findMany({
      where: { isActive: true },
      include: { currency: true },
      orderBy: { name: 'asc' },
    });
  }
}
