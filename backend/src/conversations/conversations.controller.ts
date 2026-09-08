import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { ConversationsService } from './conversations.service.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.conversationsService.findMine(user.id);
  }

  @Post()
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartConversationDto) {
    return this.conversationsService.start(user.id, dto);
  }

  @Get(':id/messages')
  getMessages(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.conversationsService.getMessages(id, user.id);
  }

  @Post(':id/messages')
  sendMessage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.conversationsService.sendMessage(id, user.id, dto);
  }
}
