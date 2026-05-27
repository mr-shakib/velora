import { Injectable, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { AiTask } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MODEL_MAP: Record<AiTask, string> = {
  MONTHLY_RECAP: 'llama-3.3-70b-versatile',
  CAPTION_SUGGEST: 'llama-3.1-8b-instant',
  DATE_IDEAS: 'llama-3.1-8b-instant',
  MEMORY_SUMMARY: 'llama-3.3-70b-versatile',
  RELATIONSHIP_PROMPT: 'llama-3.1-8b-instant',
};

const DAILY_LIMITS: Record<AiTask, number> = {
  MONTHLY_RECAP: 999,
  CAPTION_SUGGEST: 10,
  DATE_IDEAS: 3,
  MEMORY_SUMMARY: 20,
  RELATIONSHIP_PROMPT: 5,
};

const CACHE_TTL_MS: Record<AiTask, number> = {
  MONTHLY_RECAP: 30 * 24 * 60 * 60 * 1000,
  CAPTION_SUGGEST: 0,
  DATE_IDEAS: 24 * 60 * 60 * 1000,
  MEMORY_SUMMARY: 7 * 24 * 60 * 60 * 1000,
  RELATIONSHIP_PROMPT: 24 * 60 * 60 * 1000,
};

@Injectable()
export class AiService {
  private groq: Groq;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.groq = new Groq({ apiKey: this.config.get('GROQ_API_KEY') });
  }

  private async checkConsent(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.aiConsentGiven) throw new ForbiddenException('AI consent required. Please enable AI features in settings.');
  }

  private async checkRateLimit(coupleId: string, task: AiTask) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await this.prisma.aiOutput.count({
      where: { coupleId, task, createdAt: { gte: today } },
    });
    if (count >= DAILY_LIMITS[task]) {
      throw new HttpException(`Daily limit for ${task} reached.`, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async getCached(coupleId: string, task: AiTask) {
    if (!CACHE_TTL_MS[task]) return null;
    const cutoff = new Date(Date.now() - CACHE_TTL_MS[task]);
    return this.prisma.aiOutput.findFirst({
      where: { coupleId, task, createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async saveOutput(coupleId: string, userId: string, task: AiTask, input: object, output: string, model: string, tokens: number) {
    const expiresAt = CACHE_TTL_MS[task] ? new Date(Date.now() + CACHE_TTL_MS[task]) : null;
    return this.prisma.aiOutput.create({
      data: { coupleId, userId, task, input, output, model, tokens, ...(expiresAt ? { expiresAt } : {}) },
    });
  }

  private sanitizeForAi(data: { memories?: Array<{ caption?: string | null; mood?: string | null }>; partner1Name?: string; partner2Name?: string }) {
    return {
      partnerA: 'Partner A',
      partnerB: 'Partner B',
      memories: (data.memories ?? []).map((m) => ({ caption: m.caption, mood: m.mood })),
    };
  }

  async generateMonthlyRecap(coupleId: string, userId: string) {
    await this.checkConsent(userId);
    const cached = await this.getCached(coupleId, AiTask.MONTHLY_RECAP);
    if (cached) return { output: cached.output, cached: true };

    await this.checkRateLimit(coupleId, AiTask.MONTHLY_RECAP);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const memories = await this.prisma.memory.findMany({
      where: { coupleId, createdAt: { gte: thirtyDaysAgo } },
      select: { caption: true, mood: true, memoryDate: true, city: true },
      take: 50,
    });

    const sanitized = this.sanitizeForAi({ memories });
    const model = MODEL_MAP[AiTask.MONTHLY_RECAP];

    const completion = await this.groq.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a warm, thoughtful relationship assistant. Write a heartfelt monthly recap for a couple based on their shared memories. Keep it personal, warm, and under 200 words. Use Partner A and Partner B.',
        },
        {
          role: 'user',
          content: `Here are their memories from this month: ${JSON.stringify(sanitized.memories)}`,
        },
      ],
      max_tokens: 400,
    });

    const output = completion.choices[0]?.message?.content ?? '';
    const tokens = completion.usage?.total_tokens ?? 0;

    await this.saveOutput(coupleId, userId, AiTask.MONTHLY_RECAP, sanitized, output, model, tokens);
    return { output, cached: false };
  }

  async generateCaptionSuggestion(coupleId: string, userId: string, mood?: string, location?: string) {
    await this.checkConsent(userId);
    await this.checkRateLimit(coupleId, AiTask.CAPTION_SUGGEST);

    const model = MODEL_MAP[AiTask.CAPTION_SUGGEST];
    const completion = await this.groq.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are helping a couple write a short, warm photo caption. Return 3 caption suggestions, each on a new line. Keep each under 80 characters. No numbering.',
        },
        {
          role: 'user',
          content: `Mood: ${mood ?? 'happy'}. Location: ${location ?? 'unknown'}.`,
        },
      ],
      max_tokens: 150,
    });

    const output = completion.choices[0]?.message?.content ?? '';
    const tokens = completion.usage?.total_tokens ?? 0;
    const suggestions = output.split('\n').filter(Boolean).slice(0, 3);

    await this.saveOutput(coupleId, userId, AiTask.CAPTION_SUGGEST, { mood, location }, output, model, tokens);
    return { suggestions };
  }

  async generateDateIdeas(coupleId: string, userId: string) {
    await this.checkConsent(userId);

    const cached = await this.getCached(coupleId, AiTask.DATE_IDEAS);
    if (cached) {
      try {
        return { ideas: JSON.parse(cached.output), cached: true };
      } catch { /* ignore */ }
    }

    await this.checkRateLimit(coupleId, AiTask.DATE_IDEAS);

    const completedPlans = await this.prisma.plannerEvent.count({ where: { coupleId } });
    const model = MODEL_MAP[AiTask.DATE_IDEAS];

    const completion = await this.groq.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Generate 5 creative date ideas for a couple. Return as JSON array: [{"title":"...","description":"...","cost":"$|$$|$$$"}]. Vary between indoor/outdoor, active/calm.',
        },
        {
          role: 'user',
          content: `They have been on ${completedPlans} dates together.`,
        },
      ],
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const output = completion.choices[0]?.message?.content ?? '{"ideas":[]}';
    const tokens = completion.usage?.total_tokens ?? 0;

    await this.saveOutput(coupleId, userId, AiTask.DATE_IDEAS, { completedPlans }, output, model, tokens);

    try {
      const parsed = JSON.parse(output);
      return { ideas: parsed.ideas ?? [], cached: false };
    } catch {
      return { ideas: [], cached: false };
    }
  }

  async generateRelationshipPrompt(coupleId: string, userId: string) {
    await this.checkConsent(userId);
    await this.checkRateLimit(coupleId, AiTask.RELATIONSHIP_PROMPT);

    const model = MODEL_MAP[AiTask.RELATIONSHIP_PROMPT];
    const completion = await this.groq.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Generate a thoughtful, warm conversation starter question for a couple to deepen their connection. Keep it under 60 words. No preamble.',
        },
        { role: 'user', content: 'Give me a relationship conversation prompt.' },
      ],
      max_tokens: 100,
    });

    const output = completion.choices[0]?.message?.content ?? '';
    const tokens = completion.usage?.total_tokens ?? 0;

    await this.saveOutput(coupleId, userId, AiTask.RELATIONSHIP_PROMPT, {}, output, model, tokens);
    return { prompt: output };
  }
}
