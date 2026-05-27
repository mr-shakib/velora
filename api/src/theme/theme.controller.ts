import { Controller, Get, Patch, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { User } from '@prisma/client';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThemeService } from './theme.service';

class UpdateThemeDto {
  @IsOptional() @IsString() preset?: string;
  @IsOptional() @IsString() bg?: string;
  @IsOptional() @IsString() surface?: string;
  @IsOptional() @IsString() primary?: string;
  @IsOptional() @IsString() primaryDim?: string;
  @IsOptional() @IsString() secondary?: string;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsString() muted?: string;
  @IsOptional() @IsString() border?: string;
}

@Controller('theme')
@UseGuards(JwtAuthGuard)
export class ThemeController {
  constructor(private themeService: ThemeService) {}

  @Get()
  getTheme(@CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.themeService.getTheme(user.coupleId);
  }

  @Patch()
  updateTheme(@CurrentUser() user: User, @Body() dto: UpdateThemeDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.themeService.updateTheme(user.coupleId, dto);
  }
}
