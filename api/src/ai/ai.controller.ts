import { Controller, Post, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { User } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';

class CaptionDto {
  @IsOptional() @IsString() mood?: string;
  @IsOptional() @IsString() location?: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('monthly-recap')
  monthlyRecap(@CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.aiService.generateMonthlyRecap(user.coupleId, user.id);
  }

  @Post('caption-suggest')
  captionSuggest(@CurrentUser() user: User, @Body() dto: CaptionDto) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.aiService.generateCaptionSuggestion(user.coupleId, user.id, dto.mood, dto.location);
  }

  @Post('date-ideas')
  dateIdeas(@CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.aiService.generateDateIdeas(user.coupleId, user.id);
  }

  @Post('relationship-prompt')
  relationshipPrompt(@CurrentUser() user: User) {
    if (!user.coupleId) throw new ForbiddenException();
    return this.aiService.generateRelationshipPrompt(user.coupleId, user.id);
  }
}
