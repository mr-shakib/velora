import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { User, PlannerEventStatus } from '@prisma/client';
import { IsString, IsOptional, IsDateString, IsNumber, IsArray, IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PlannerService } from './planner.service';

class CreatePlannerEventDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsDateString() startsAt: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsDateString() reminderAt?: string;
  @IsOptional() @IsArray() checklist?: Array<{ text: string; done: boolean }>;
}

class UpdatePlannerEventDto extends CreatePlannerEventDto {
  @IsOptional() @IsEnum(PlannerEventStatus) status?: PlannerEventStatus;
}

@Controller('planner')
@UseGuards(JwtAuthGuard)
export class PlannerController {
  constructor(private plannerService: PlannerService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.plannerService.findAll(user.coupleId, month ? Number(month) : undefined, year ? Number(year) : undefined);
  }

  @Get('upcoming')
  getUpcoming(@CurrentUser() user: User, @Query('days') days = '7') {
    if (!user.coupleId) throw new ForbiddenException();
    return this.plannerService.getUpcoming(user.coupleId, Number(days));
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreatePlannerEventDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.plannerService.create(user.coupleId, user.id, {
      ...dto,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdatePlannerEventDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.plannerService.update(id, user.coupleId, {
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.plannerService.remove(id, user.coupleId);
  }
}
