import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

interface JwtRefreshPayload {
  sub: string;
  jti: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'],
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET') ?? '',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtRefreshPayload) {
    const token = req.cookies?.['refresh_token'];
    if (!token) throw new UnauthorizedException();

    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, revokedAt: null },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const isValid = await bcrypt.compare(token, stored.tokenHash);
    if (!isValid) throw new UnauthorizedException();

    return { user: stored.user, tokenId: stored.id };
  }
}
