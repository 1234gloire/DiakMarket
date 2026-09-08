import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const CART_INCLUDE = {
  items: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' as const } } } } } },
};

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async getMyCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return this.prisma.cart.findUniqueOrThrow({ where: { id: cart.id }, include: CART_INCLUDE });
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') throw new NotFoundException('Product not available');
    if (product.sellerId === userId) throw new BadRequestException('You cannot buy your own product');
    if (quantity > product.quantity) throw new BadRequestException('Not enough stock available');

    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity },
    });

    return this.getMyCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return this.getMyCart(userId);
  }
}
