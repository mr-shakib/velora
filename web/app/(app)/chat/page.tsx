'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Send, Image, Smile, Reply, X, Heart } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSocketStore } from '@/lib/stores/socket.store';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

interface Message {
  id: string;
  content?: string;
  senderId: string;
  createdAt: string;
  readAt?: string;
  isEdited: boolean;
  deletedForAll: boolean;
  replyTo?: { id: string; content?: string; sender: { displayName: string } };
  reactions: Array<{ emoji: string; userId: string }>;
  attachments: Array<{ url: string; mediaType: string }>;
  sender: { id: string; displayName: string; avatarPublicId?: string };
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

export default function ChatPage() {
  const { user } = useAuthStore();
  const { connected } = useSocketStore();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [socketRef] = useState<{ current: Socket | null }>({ current: null });
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['chat', 'history'],
    queryFn: ({ pageParam }) => apiClient.get('/chat/history', { params: { cursor: pageParam, limit: 50 } }).then((r) => r.data?.data),
    getNextPageParam: (lastPage) => lastPage?.meta?.hasMore ? lastPage.meta.nextCursor : undefined,
    initialPageParam: undefined,
  });

  useEffect(() => {
    const allMessages = data?.pages.flatMap((p) => p?.data ?? []) ?? [];
    setMessages(allMessages);
  }, [data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('chat:message', ({ message }: { message: Message }) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    socket.on('chat:typing', ({ userId, isTyping: typing }: { userId: string; isTyping: boolean }) => {
      if (userId !== user?.id) setPartnerTyping(typing);
    });

    socket.on('chat:reaction', ({ reaction, messageId }: { reaction: { emoji: string; userId: string }; messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: [...m.reactions.filter((r) => !(r.userId === reaction.userId && r.emoji === reaction.emoji)), reaction] }
            : m,
        ),
      );
    });

    return () => { socket.disconnect(); };
  }, [user?.id]);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current?.emit('chat:typing', { isTyping: true });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('chat:typing', { isTyping: false });
    }, 2000);
  }, [isTyping]);

  function sendMessage() {
    if (!text.trim()) return;
    socketRef.current?.emit('chat:send', { content: text.trim(), replyToId: replyTo?.id });
    setText('');
    setReplyTo(null);
    setIsTyping(false);
    socketRef.current?.emit('chat:typing', { isTyping: false });
  }

  function addReaction(messageId: string, emoji: string) {
    socketRef.current?.emit('chat:react', { messageId, emoji });
  }

  const isMine = (msg: Message) => msg.senderId === user?.id;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--clr-border)' }}>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--clr-text)' }}>Chat</h1>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--clr-muted)' }}>
          <div className="h-2 w-2 rounded-full" style={{ background: connected ? 'var(--clr-success)' : 'var(--clr-error)' }} />
          {connected ? 'Live' : 'Reconnecting…'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-2">
        {hasNextPage && (
          <div className="text-center">
            <button className="text-xs hover:underline" style={{ color: 'var(--clr-muted)' }} onClick={() => fetchNextPage()}>
              Load earlier messages
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`flex gap-2 ${i % 2 ? 'flex-row-reverse' : ''}`}>
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className={`h-12 rounded-2xl ${i % 2 ? 'w-2/3' : 'w-1/2'}`} />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.filter((m) => !m.deletedForAll).map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 group ${isMine(msg) ? 'flex-row-reverse' : ''}`}
              >
                {!isMine(msg) && (
                  <Avatar className="h-8 w-8 shrink-0 self-end">
                    <AvatarFallback style={{ background: 'var(--clr-primary)', fontSize: '0.7rem' }}>
                      {msg.sender.displayName[0]}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={`max-w-[75%] space-y-1 ${isMine(msg) ? 'items-end' : 'items-start'} flex flex-col`}>
                  {msg.replyTo && (
                    <div className="px-3 py-1.5 rounded-xl text-xs opacity-70 border-l-2" style={{ borderColor: 'var(--clr-secondary)', background: 'var(--clr-bg)', color: 'var(--clr-muted)' }}>
                      <span className="font-medium">{msg.replyTo.sender.displayName}</span>: {msg.replyTo.content}
                    </div>
                  )}

                  <div
                    className="px-4 py-2.5 rounded-2xl text-sm relative"
                    style={{
                      background: isMine(msg) ? 'var(--clr-primary)' : 'var(--clr-surface)',
                      color: 'var(--clr-text)',
                      border: isMine(msg) ? 'none' : '1px solid var(--clr-border)',
                    }}
                  >
                    {msg.content}
                    {msg.attachments.map((a) => (
                      <img key={a.url} src={a.url} alt="attachment" className="rounded-xl mt-1 max-w-full" />
                    ))}
                  </div>

                  <div className={`flex items-center gap-2 ${isMine(msg) ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px]" style={{ color: 'var(--clr-muted)' }}>
                      {format(new Date(msg.createdAt), 'h:mm a')}
                      {isMine(msg) && msg.readAt && ' · ✓✓'}
                    </span>

                    {msg.reactions.length > 0 && (
                      <div className="flex gap-0.5">
                        {[...new Map(msg.reactions.map((r) => [r.emoji, r])).values()].map((r) => (
                          <button key={r.emoji} onClick={() => addReaction(msg.id, r.emoji)} className="text-xs rounded-full px-1.5 py-0.5" style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}>
                            {r.emoji} {msg.reactions.filter((x) => x.emoji === r.emoji).length}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Quick actions */}
                    <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMine(msg) ? 'flex-row-reverse' : ''}`}>
                      <button onClick={() => setReplyTo(msg)} className="p-1 rounded-full hover:opacity-70" style={{ color: 'var(--clr-muted)' }}>
                        <Reply size={12} />
                      </button>
                      {QUICK_REACTIONS.slice(0, 3).map((emoji) => (
                        <button key={emoji} onClick={() => addReaction(msg.id, emoji)} className="text-xs hover:scale-125 transition-transform">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {partnerTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
            <Avatar className="h-8 w-8"><AvatarFallback style={{ background: 'var(--clr-primary)', fontSize: '0.7rem' }}>P</AvatarFallback></Avatar>
            <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => <div key={i} className="h-2 w-2 rounded-full animate-bounce" style={{ background: 'var(--clr-muted)', animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2" style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}>
          <div className="flex-1 text-xs" style={{ color: 'var(--clr-muted)' }}>
            Replying to <span className="font-medium" style={{ color: 'var(--clr-text)' }}>{replyTo.sender.displayName}</span>: {replyTo.content?.slice(0, 60)}
          </div>
          <button onClick={() => setReplyTo(null)}><X size={14} style={{ color: 'var(--clr-muted)' }} /></button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--clr-border)' }}>
        <Input
          placeholder="Say something sweet…"
          value={text}
          onChange={(e) => { setText(e.target.value); handleTyping(); }}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
          style={{ borderColor: 'var(--clr-border)', background: 'var(--clr-surface)' }}
        />
        <Button
          onClick={sendMessage}
          disabled={!text.trim()}
          style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
