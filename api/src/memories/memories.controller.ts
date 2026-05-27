import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { User, MoodEmoji, MediaType } from '@prisma/client';
import {
  IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemoriesService } from './memories.service';

class MediaItemDto {
  @IsString() publicId: string;
  @IsEnum(MediaType) mediaType: MediaType;
  @IsString() url: string;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsNumber() durationSec?: number;
  @IsNumber() bytes: number;
  @IsOptional() @IsNumber() order?: number;
}

class CreateMemoryDto {
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsEnum(MoodEmoji) mood?: MoodEmoji;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsDateString() memoryDate: string;
  @IsOptional() @IsString() albumId?: string;
  @IsOptional() @IsBoolean() isPrivate?: boolean;
  @IsOptional() @IsArray() media?: MediaItemDto[];
}

class CreateAlbumDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
}

class MemoryQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
  @IsOptional() @IsString() albumId?: string;
  @IsOptional() @IsEnum(MoodEmoji) mood?: MoodEmoji;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @Type(() => Number) @IsNumber() year?: number;
  @IsOptional() @IsString() search?: string;
}

@Controller('memories')
@UseGuards(JwtAuthGuard)
export class MemoriesController {
  constructor(private memoriesService: MemoriesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateMemoryDto) {
    if (!user.coupleId) throw new ForbiddenException('Link with a partner first.');
    return this.memoriesService.create(user.coupleId, user.id, {
      ...dto,
      memoryDate: new Date(dto.memoryDate),
    });
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query() query: MemoryQueryDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.memoriesService.findAll(user.coupleId, user.id, query);
  }

  @Get('on-this-day')
  getOnThisDay(@CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.memoriesService.getOnThisDay(user.coupleId, user.id);
  }

  @Get('albums')
  getAlbums(@CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.memoriesService.getAlbums(user.coupleId);
  }

  @Post('albums')
  createAlbum(@CurrentUser() user: User, @Body() dto: CreateAlbumDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.memoriesService.createAlbum(user.coupleId, dto.name, dto.description);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.memoriesService.findOne(id, user.coupleId, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: Record<string, unknown>) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.memoriesService.update(id, user.coupleId, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.memoriesService.remove(id, user.coupleId, user.id);
  }
}
