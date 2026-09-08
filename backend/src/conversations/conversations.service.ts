import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StartConversationDto } from './dto/start-conversation.dto.js';
import type { SendMessageDto } from './dto/send-message.dto.js';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(userId: string, dto: StartConversationDto) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        productId: dto.productId ?? null,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: dto.otherUserId } } },
        ],
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        productId: dto.productId,
        participants: { create: [{ userId }, { userId: dto.otherUserId }] },
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, profile: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(conversationId: string, senderId: string, dto: SendMessageDto) {
    await this.assertParticipant(conversationId, senderId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        type: dto.imageUrl ? 'IMAGE' : 'TEXT',
        content: dto.content,
        imageUrl: dto.imageUrl,
        imagePublicId: dto.imagePublicId,
      },
    });

    await this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    return message;
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('You are not part of this conversation');
    if (participant.isBlocked) throw new ForbiddenException('This conversation is blocked');
    return participant;
  }
}
