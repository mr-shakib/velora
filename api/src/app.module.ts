import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoupleModule } from './couple/couple.module';
import { MemoriesModule } from './memories/memories.module';
import { TimelineModule } from './timeline/timeline.module';
import { PlannerModule } from './planner/planner.module';
import { BucketModule } from './bucket/bucket.module';
import { ChatModule } from './chat/chat.module';
import { ThemeModule } from './theme/theme.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadModule } from './upload/upload.module';
import { AiModule } from './ai/ai.module';
import { HealthModule } from './health/health.module';
import { CronModule } from './cron/cron.module';
import { CountdownsModule } from './countdowns/countdowns.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoupleModule,
    MemoriesModule,
    TimelineModule,
    PlannerModule,
    BucketModule,
    ChatModule,
    ThemeModule,
    NotificationsModule,
    UploadModule,
    AiModule,
    HealthModule,
    CronModule,
    CountdownsModule,
    EmailModule,
  ],
})
export class AppModule {}
