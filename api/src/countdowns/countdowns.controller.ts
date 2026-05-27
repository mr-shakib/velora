import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CountdownsService } from './countdowns.service';

@Controller('countdowns')
@UseGuards(JwtAuthGuard)
export class CountdownsController {
  constructor(private readonly service: CountdownsService) {}

  @Get()
  findAll(@CurrentUser() user: { coupleId: string }) {
    return this.service.findAll(user.coupleId);
  }

  @Post()
  create(
    @CurrentUser() user: { coupleId: string },
    @Body() body: { label: string; targetAt: string; emoji?: string },
  ) {
    return this.service.create(user.coupleId, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { coupleId: string },
    @Body() body: { label?: string; targetAt?: string; emoji?: string },
  ) {
    return this.service.update(id, user.coupleId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { coupleId: string }) {
    return this.service.remove(id, user.coupleId);
  }
}
