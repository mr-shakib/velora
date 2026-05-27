import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private app: admin.app.App | null = null;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase not configured — push notifications disabled.');
      return;
    }

    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      this.app = admin.apps[0]!;
    }
  }

  async sendToTokens(tokens: string[], payload: { title: string; body: string; data?: Record<string, string> }): Promise<string[]> {
    if (!this.app || !tokens.length) return [];

    try {
      const response = await admin.messaging(this.app).sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
        webpush: {
          notification: { icon: '/icons/icon-192x192.png', badge: '/icons/badge-72x72.png' },
        },
      });

      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && (resp.error?.code === 'messaging/invalid-registration-token' || resp.error?.code === 'messaging/registration-token-not-registered')) {
          failedTokens.push(tokens[idx]);
        }
      });

      return failedTokens;
    } catch (err) {
      this.logger.error('FCM send error', err);
      return [];
    }
  }
}
