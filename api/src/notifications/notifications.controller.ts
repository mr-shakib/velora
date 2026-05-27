import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { IsString, IsIn, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

class RegisterTokenDto {
  @IsString() token: string;
  @IsIn(['WEB', 'ANDROID', 'IOS']) platform: 'WEB' | 'ANDROID' | 'IOS';
  @IsOptional() @IsString() deviceInfo?: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getAll(@CurrentUser() user: User, @Query('page') page = 1) {
    return this.notificationsService.getAll(user.id, Number(page));
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Post('register-token')
  registerToken(@CurrentUser() user: User, @Body() dto: RegisterTokenDto) {
    return this.notificationsService.registerToken(user.id, dto.token, dto.platform, dto.deviceInfo);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markRead(id, user.id);
  }
}
