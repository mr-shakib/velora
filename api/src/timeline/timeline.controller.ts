import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { User } from '@prisma/client';
import { IsString, IsOptional, IsDateString, IsNumber, IsArray } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TimelineService } from './timeline.service';

class CreateTimelineEventDto {
  @IsString() title: string;
  @IsOptional() @IsString() story?: string;
  @IsDateString() eventDate: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() mediaPublicId?: string;
  @IsOptional() @IsNumber() order?: number;
}

class ReorderDto {
  @IsArray() @IsString({ each: true }) orderedIds: string[];
}

@Controller('timeline')
@UseGuards(JwtAuthGuard)
export class TimelineController {
  constructor(private timelineService: TimelineService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.timelineService.findAll(user.coupleId);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTimelineEventDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.timelineService.create(user.coupleId, user.id, { ...dto, eventDate: new Date(dto.eventDate) });
  }

  @Patch('reorder')
  reorder(@CurrentUser() user: User, @Body() dto: ReorderDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.timelineService.reorder(user.coupleId, dto.orderedIds);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: Record<string, unknown>) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.timelineService.update(id, user.coupleId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.timelineService.remove(id, user.coupleId, user.id);
  }
}
