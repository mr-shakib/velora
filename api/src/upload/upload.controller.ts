import { Controller, Post, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { User } from '@prisma/client';
import { IsString, IsIn } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CloudinaryService } from './cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';

const STORAGE_LIMIT = BigInt(10 * 1024 * 1024 * 1024); // 10GB

type FolderType = 'memories' | 'timeline' | 'avatars' | 'chat';

class SignatureDto {
  @IsString()
  @IsIn(['memories', 'timeline', 'avatars', 'chat'])
  folderType: FolderType;
}

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    private cloudinary: CloudinaryService,
    private prisma: PrismaService,
  ) {}

  @Post('signature')
  async getUploadSignature(@CurrentUser() user: User, @Body() dto: SignatureDto) {
    if (!user.coupleId) throw new ForbiddenException('You must be linked with a partner to upload.');

    const couple = await this.prisma.couple.findUnique({ where: { id: user.coupleId } });
    if (!couple) throw new ForbiddenException();

    if (couple.usedStorageBytes >= STORAGE_LIMIT) {
      throw new ForbiddenException('Storage limit reached (10 GB). Delete some media to upload more.');
    }

    const folder = `velora/couples/${user.coupleId}/${dto.folderType}`;
    return this.cloudinary.generateUploadSignature(folder);
  }
}
