import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { User, BucketStatus } from '@prisma/client';
import { IsString, IsOptional, IsDateString, IsEnum, IsArray } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BucketService } from './bucket.service';

class CreateBucketItemDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsDateString() deadline?: string;
  @IsOptional() @IsString() mediaPublicId?: string;
}

class UpdateBucketItemDto extends CreateBucketItemDto {
  @IsOptional() @IsEnum(BucketStatus) status?: BucketStatus;
}

class ReorderDto {
  @IsArray() @IsString({ each: true }) orderedIds: string[];
}

@Controller('bucket')
@UseGuards(JwtAuthGuard)
export class BucketController {
  constructor(private bucketService: BucketService) {}

  @Get()
  findAll(@CurrentUser() user: User, @Query('status') status?: BucketStatus) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.bucketService.findAll(user.coupleId, status);
  }

  @Get('stats')
  getStats(@CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.bucketService.getStats(user.coupleId);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateBucketItemDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.bucketService.create(user.coupleId, user.id, {
      ...dto,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
    });
  }

  @Patch('reorder')
  reorder(@CurrentUser() user: User, @Body() dto: ReorderDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.bucketService.reorder(user.coupleId, dto.orderedIds);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdateBucketItemDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.bucketService.update(id, user.coupleId, {
      ...dto,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.bucketService.remove(id, user.coupleId);
  }
}
