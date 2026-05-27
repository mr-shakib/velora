import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { Resend } from 'resend';

interface SendEmailEvent {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private from: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.from = this.config.get<string>('SMTP_FROM', 'Velora <onboarding@resend.dev>');
  }

  @OnEvent('email.send')
  async handleSend(event: SendEmailEvent) {
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: event.to,
        subject: event.subject,
        html: event.html,
      });

      if (error) {
        this.logger.error(`Resend error sending to ${event.to}: ${error.message}`);
      } else {
        this.logger.log(`Email sent to ${event.to}: ${event.subject}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send email to ${event.to}`, err);
    }
  }
}
