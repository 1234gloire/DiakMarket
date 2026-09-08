import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  findByCountry(countryId: string) {
    return this.prisma.city.findMany({
      where: { countryId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
