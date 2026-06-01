import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private events: EventEmitter2,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('An account with this email already exists.');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });

    await this.sendOtp(user);
    return { message: 'Account created. Check your email for a verification code.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('Invalid verification attempt.');

    const otp = await this.prisma.otp.findFirst({
      where: {
        userId: user.id,
        code: dto.code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException('Invalid or expired code. Please request a new one.');

    await this.prisma.$transaction([
      this.prisma.otp.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.UNLINKED },
      }),
    ]);

    return this.issueTokens(user);
  }

  async login(dto: LoginDto, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password.');

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      await this.sendOtp(user);
      throw new ForbiddenException('Please verify your email first. A new code has been sent.');
    }

    return this.issueTokens(user, userAgent);
  }

  async refresh(userId: string, tokenId: string, userAgent?: string) {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    return this.issueTokens(user, userAgent);
  }

  async logout(tokenId: string) {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully.' };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If this email exists, a code was sent.' };

    const recentOtp = await this.prisma.otp.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (recentOtp) throw new BadRequestException('Please wait 60 seconds before requesting a new code.');

    await this.sendOtp(user);
    return { message: 'A new verification code has been sent.' };
  }

  private async issueTokens(user: User, userAgent?: string) {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, coupleId: user.coupleId },
      {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create the row first so its id can be embedded as the JWT's jti. The
    // refresh token is a signed JWT (the JwtRefreshStrategy verifies it); the
    // row gives us per-token revocation/rotation.
    const record = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: crypto.randomUUID(),
        deviceInfo: userAgent,
        expiresAt,
      },
    });

    const refreshToken = this.jwt.sign(
      { sub: user.id, jti: record.id },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      },
    );

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { tokenHash },
    });

    return { accessToken, refreshToken, user };
  }

  private async sendOtp(user: User) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otp.create({
      data: { userId: user.id, code, expiresAt },
    });

    this.events.emit('email.send', {
      to: user.email,
      subject: 'Your Velora verification code',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #5C7A6B;">Your verification code</h2>
          <p>Hi ${user.displayName},</p>
          <p>Use the code below to verify your email. It expires in 10 minutes.</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2B2B2B; padding: 24px; background: #F8F4EC; border-radius: 12px; text-align: center; margin: 24px 0;">
            ${code}
          </div>
          <p style="color: #8C8C8C; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  }
}
