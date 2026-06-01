import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { User, MoodEmoji } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { IsDate, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(50) displayName?: string;
  @IsOptional() @IsString() @MaxLength(300) bio?: string;
  @IsOptional() @Type(() => Date) @IsDate() birthday?: Date;
  @IsOptional() timezone?: string;
  @IsOptional() avatarPublicId?: string;
}

class SetMoodDto {
  @IsEnum(MoodEmoji) mood: MoodEmoji;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/partner')
  getPartner(@CurrentUser() user: User) {
    return this.usersService.getPartner(user.id);
  }

  @Post('me/mood')
  setMood(@CurrentUser() user: User, @Body() dto: SetMoodDto) {
    return this.usersService.setMood(user.id, dto.mood, dto.note);
  }

  @Get('me/mood')
  getMood(@CurrentUser() user: User) {
    return this.usersService.getCurrentMood(user.id);
  }

  @Post('me/ai-consent')
  giveAiConsent(@CurrentUser() user: User) {
    return this.usersService.giveAiConsent(user.id);
  }

  @Patch('me/ai-consent')
  setAiConsent(@CurrentUser() user: User, @Body() body: { consent: boolean }) {
    return body.consent
      ? this.usersService.giveAiConsent(user.id)
      : this.usersService.revokeAiConsent(user.id);
  }

  @Patch('me/password')
  changePassword(@CurrentUser() user: User, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.usersService.changePassword(user.id, body.currentPassword, body.newPassword);
  }
}
