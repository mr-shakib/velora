import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

interface AuthSocket extends Socket {
  userId: string;
  coupleId: string;
}

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) throw new WsException('Unauthorized');

      const payload = this.jwt.verify(token, { secret: this.config.get('JWT_SECRET') }) as { sub: string; coupleId: string };

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new WsException('Unauthorized');

      (client as AuthSocket).userId = user.id;
      (client as AuthSocket).coupleId = user.coupleId ?? '';

      if (user.coupleId) {
        await client.join(`couple:${user.coupleId}`);
      }
      await client.join(`user:${user.id}`);

      if (user.coupleId) {
        client.to(`couple:${user.coupleId}`).emit('presence:online', { userId: user.id });
      }
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const authClient = client as AuthSocket;
    if (authClient.userId && authClient.coupleId) {
      await this.prisma.user.update({ where: { id: authClient.userId }, data: { updatedAt: new Date() } });
      client.to(`couple:${authClient.coupleId}`).emit('presence:offline', { userId: authClient.userId, lastSeen: new Date().toISOString() });
    }
  }

  @SubscribeMessage('chat:send')
  async handleMessage(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { content?: string; replyToId?: string; pinnedMemoryId?: string; attachments?: Array<{ publicId: string; mediaType: 'IMAGE' | 'VIDEO'; url: string; bytes: number }> }) {
    if (!client.coupleId) throw new WsException('Not in a couple.');
    const message = await this.chatService.sendMessage(client.coupleId, client.userId, data);
    this.server.to(`couple:${client.coupleId}`).emit('chat:message', { message });
    return message;
  }

  @SubscribeMessage('chat:typing')
  handleTyping(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { isTyping: boolean }) {
    if (!client.coupleId) return;
    client.to(`couple:${client.coupleId}`).emit('chat:typing', { userId: client.userId, isTyping: data.isTyping });
  }

  @SubscribeMessage('chat:read')
  async handleRead(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { upToMessageId: string }) {
    if (!client.coupleId) return;
    await this.chatService.markRead(client.coupleId, client.userId, data.upToMessageId);
    client.to(`couple:${client.coupleId}`).emit('chat:read', { userId: client.userId, upToMessageId: data.upToMessageId });
  }

  @SubscribeMessage('chat:react')
  async handleReaction(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { messageId: string; emoji: string }) {
    if (!client.coupleId) return;
    const reaction = await this.chatService.addReaction(data.messageId, client.userId, data.emoji);
    this.server.to(`couple:${client.coupleId}`).emit('chat:reaction', { reaction, messageId: data.messageId });
    return reaction;
  }

  @SubscribeMessage('mood:set')
  async handleMoodSet(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { mood: string; note?: string }) {
    if (!client.coupleId) return;
    client.to(`couple:${client.coupleId}`).emit('mood:updated', { userId: client.userId, mood: data.mood, note: data.note });
  }

  @OnEvent('theme.updated')
  handleThemeUpdated(payload: { coupleId: string; colors: unknown }) {
    this.server.to(`couple:${payload.coupleId}`).emit('theme:updated', { colors: payload.colors });
  }

  @OnEvent('memory.created')
  handleMemoryCreated(payload: { memory: unknown; coupleId: string }) {
    this.server.to(`couple:${payload.coupleId}`).emit('memory:new', { memory: payload.memory });
  }

  @OnEvent('couple.linked')
  handleCoupleLinked(payload: { coupleId: string; inviterId: string; acceptorId: string }) {
    this.server.to(`user:${payload.inviterId}`).emit('couple:linked', { coupleId: payload.coupleId });
    this.server.to(`user:${payload.acceptorId}`).emit('couple:linked', { coupleId: payload.coupleId });
  }

  @OnEvent('notification.send')
  handleNotification(payload: { userId: string; notification: unknown }) {
    this.server.to(`user:${payload.userId}`).emit('notification:new', { notification: payload.notification });
  }

  sendToCouple(coupleId: string, event: string, data: unknown) {
    this.server.to(`couple:${coupleId}`).emit(event, data);
  }

  sendToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
