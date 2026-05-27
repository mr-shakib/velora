import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { User } from '@prisma/client';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

class ReactDto {
  @IsString() emoji: string;
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('history')
  getHistory(
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('limit') limit = 50,
  ) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.chatService.getHistory(user.coupleId, cursor, Number(limit));
  }

  @Get('unread')
  getUnread(@CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.chatService.getUnreadCount(user.coupleId, user.id);
  }

  @Post(':id/react')
  react(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: ReactDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.chatService.addReaction(id, user.id, dto.emoji);
  }

  @Delete(':id/react')
  unreact(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: ReactDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.chatService.removeReaction(id, user.id, dto.emoji);
  }

  @Delete(':id')
  deleteMessage(@Param('id') id: string, @CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.chatService.deleteMessage(id, user.coupleId, user.id);
  }
}
