import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

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
    if (!token || !payload?.jti) throw new UnauthorizedException();

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Bind the presented token to the stored row (JWT signature is already
    // verified by passport-jwt above; this rejects a different token reusing
    // the same jti).
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (tokenHash !== stored.tokenHash || stored.userId !== payload.sub) {
      throw new UnauthorizedException();
    }

    return { user: stored.user, tokenId: stored.id };
  }
}
