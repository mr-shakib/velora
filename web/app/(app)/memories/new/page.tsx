'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Upload, X, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { memoriesApi } from '@/lib/api/memories';
import { apiClient } from '@/lib/api/client';

const schema = z.object({
  caption: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  mood: z.string().optional(),
  tags: z.string().optional(),
  memoryDate: z.string(),
  isPrivate: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

const MOODS = [
  { value: 'HAPPY', label: '😊 Happy' },
  { value: 'LOVED', label: '🥰 Loved' },
  { value: 'CALM', label: '😌 Calm' },
  { value: 'TIRED', label: '😴 Tired' },
  { value: 'EXCITED', label: '🤩 Excited' },
  { value: 'GRATEFUL', label: '🙏 Grateful' },
  { value: 'MISSING_YOU', label: '🥺 Missing you' },
  { value: 'SAD', label: '😢 Sad' },
];

interface UploadedMedia {
  publicId: string;
  url: string;
  mediaType: 'IMAGE' | 'VIDEO';
  bytes: number;
  width?: number;
  height?: number;
  preview?: string;
}

export default function NewMemoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { memoryDate: new Date().toISOString().split('T')[0] },
  });

  const mood = watch('mood');
  const city = watch('city');

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => memoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      toast.success('Memory added!');
      router.push('/memories');
    },
    onError: () => toast.error('Failed to create memory'),
  });

  async function handleFileUpload(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    try {
      const signatureRes = await memoriesApi.getUploadSignature('memories');
      const sig = signatureRes.data;

      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video/');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('signature', sig.signature);
        formData.append('timestamp', String(sig.timestamp));
        formData.append('api_key', sig.apiKey);
        formData.append('folder', sig.folder);

        const res = await axios.post(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/${isVideo ? 'video' : 'image'}/upload`,
          formData,
        );

        const preview = isVideo ? undefined : URL.createObjectURL(file);
        setUploadedMedia((prev) => [
          ...prev,
          {
            publicId: res.data.public_id,
            url: res.data.secure_url,
            mediaType: isVideo ? 'VIDEO' : 'IMAGE',
            bytes: res.data.bytes,
            width: res.data.width,
            height: res.data.height,
            preview,
          },
        ]);
      }
      toast.success('Media uploaded!');
    } catch {
      toast.error('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

  async function suggestCaption() {
    setAiLoading(true);
    try {
      const res = await apiClient.post('/ai/caption-suggest', { mood, location: city });
      const suggestions = res.data?.data?.suggestions ?? [];
      if (suggestions.length) {
        setValue('caption', suggestions[0]);
        toast.success('Caption suggested by AI ✨');
      }
    } catch {
      toast.error('AI not available. Give consent in settings.');
    } finally {
      setAiLoading(false);
    }
  }

  function onSubmit(data: FormData) {
    createMutation.mutate({
      ...data,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      media: uploadedMedia.map(({ preview: _p, ...m }) => m),
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--clr-text)' }}>Add a memory</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Media upload */}
        <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          <CardContent className="pt-5">
            <div
              className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--clr-border)', background: 'var(--clr-bg)' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={32} className="animate-spin" style={{ color: 'var(--clr-primary)' }} />
                  <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>Uploading…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={32} style={{ color: 'var(--clr-muted)' }} />
                  <p className="font-medium text-sm" style={{ color: 'var(--clr-text)' }}>Drop photos or videos here</p>
                  <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>or click to browse · Max 100MB per file</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            />

            {uploadedMedia.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {uploadedMedia.map((m, i) => (
                  <motion.div key={m.publicId} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative aspect-square rounded-xl overflow-hidden">
                    {m.preview ? (
                      <img src={m.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: 'var(--clr-bg)' }}>🎬</div>
                    )}
                    <button
                      type="button"
                      onClick={() => setUploadedMedia((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)' }}>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Caption</Label>
                <button
                  type="button"
                  onClick={suggestCaption}
                  disabled={aiLoading}
                  className="text-xs flex items-center gap-1 hover:underline"
                  style={{ color: 'var(--clr-secondary)' }}
                >
                  <Sparkles size={12} /> {aiLoading ? 'Generating…' : 'AI suggest'}
                </button>
              </div>
              <Textarea placeholder="What made this moment special?" rows={3} {...register('caption')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" {...register('memoryDate')} />
              </div>
              <div className="space-y-1.5">
                <Label>Mood</Label>
                <Select onValueChange={(v) => setValue('mood', v)}>
                  <SelectTrigger style={{ borderColor: 'var(--clr-border)' }}>
                    <SelectValue placeholder="How were you feeling?" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input placeholder="City" {...register('city')} />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input placeholder="Country" {...register('country')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tags <span style={{ color: 'var(--clr-muted)' }}>(comma-separated)</span></Label>
              <Input placeholder="travel, anniversary, food…" {...register('tags')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1" style={{ borderColor: 'var(--clr-border)' }}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={createMutation.isPending} style={{ background: 'var(--clr-primary)', color: 'var(--clr-text)' }}>
            {createMutation.isPending ? 'Saving…' : 'Save memory'}
          </Button>
        </div>
      </form>
    </div>
  );
}
