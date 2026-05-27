import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

interface ThemeColors {
  preset?: string;
  bg?: string;
  surface?: string;
  primary?: string;
  primaryDim?: string;
  secondary?: string;
  text?: string;
  muted?: string;
  border?: string;
}

@Injectable()
export class ThemeService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async getTheme(coupleId: string) {
    const theme = await this.prisma.theme.findUnique({ where: { coupleId } });
    if (!theme) throw new NotFoundException('Theme not configured.');
    return theme;
  }

  async updateTheme(coupleId: string, colors: ThemeColors) {
    const theme = await this.prisma.theme.upsert({
      where: { coupleId },
      create: { coupleId, ...colors },
      update: colors,
    });

    this.events.emit('theme.updated', { coupleId, colors: theme });
    return theme;
  }
}
