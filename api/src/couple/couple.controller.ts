import { Controller, Get, Post, Patch, Body, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CoupleService } from './couple.service';
import { Public } from '../common/decorators/public.decorator';
import { IsDateString } from 'class-validator';

class UpdateRelationshipStartDto {
  @IsDateString() date: string;
}

@Controller('couple')
@UseGuards(JwtAuthGuard)
export class CoupleController {
  constructor(private coupleService: CoupleService) {}

  @Post('invite')
  createInvite(@CurrentUser() user: User) {
    return this.coupleService.createInvite(user.id);
  }

  @Public()
  @Get('invite/:token')
  getInvitePreview(@Param('token') token: string) {
    return this.coupleService.getInvitePreview(token);
  }

  @Post('accept/:token')
  acceptInvite(@Param('token') token: string, @CurrentUser() user: User) {
    return this.coupleService.acceptInvite(token, user.id);
  }

  @Get('me')
  getMyCouple(@CurrentUser() user: User) {
    if (!user.coupleId) return null;
    return this.coupleService.getCouple(user.coupleId);
  }

  @Patch('relationship-start')
  updateRelationshipStart(@CurrentUser() user: User, @Body() dto: UpdateRelationshipStartDto) {
    if (!user.coupleId) return null;
    return this.coupleService.updateRelationshipStart(user.coupleId, new Date(dto.date));
  }

  @Post('unlink/request')
  requestUnlink(@CurrentUser() user: User) {
    return this.coupleService.requestUnlink(user.id);
  }

  @Post('unlink/confirm')
  confirmUnlink(@CurrentUser() user: User) {
    return this.coupleService.confirmUnlink(user.id);
  }

  @Post('unlink/cancel')
  cancelUnlink(@CurrentUser() user: User) {
    return this.coupleService.cancelUnlinkRequest(user.id);
  }

  @Get('export')
  async exportData(@CurrentUser() user: User, @Res() res: Response) {
    if (!user.coupleId) return res.status(400).json({ message: 'Not in a couple' });
    const data = await this.coupleService.exportData(user.coupleId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="velora-export-${new Date().toISOString().split('T')[0]}.json"`);
    res.send(JSON.stringify(data, null, 2));
  }
}
