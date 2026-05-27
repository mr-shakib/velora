import type { Metadata, Viewport } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { SocketProvider } from '@/components/providers/SocketProvider';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: { default: 'Velora', template: '%s · Velora' },
  description: 'Your private space, just the two of you.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Velora' },
  icons: { icon: '/icons/icon-192x192.png', apple: '/icons/apple-icon-180.png' },
};

export const viewport: Viewport = {
  themeColor: '#A8D5BA',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('velora:theme');
                if (t) {
                  var c = JSON.parse(t);
                  var r = document.documentElement;
                  if (c.bg) r.style.setProperty('--clr-bg', c.bg);
                  if (c.surface) r.style.setProperty('--clr-surface', c.surface);
                  if (c.primary) r.style.setProperty('--clr-primary', c.primary);
                  if (c.primaryDim) r.style.setProperty('--clr-primary-dim', c.primaryDim);
                  if (c.secondary) r.style.setProperty('--clr-secondary', c.secondary);
                  if (c.text) r.style.setProperty('--clr-text', c.text);
                  if (c.muted) r.style.setProperty('--clr-muted', c.muted);
                  if (c.border) r.style.setProperty('--clr-border', c.border);
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen" style={{ background: 'var(--clr-bg)', color: 'var(--clr-text)' }}>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <SocketProvider>
                {children}
              </SocketProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--clr-surface)',
              color: 'var(--clr-text)',
              border: '1px solid var(--clr-border)',
              borderRadius: 'var(--radius-md)',
            },
          }}
        />
      </body>
    </html>
  );
}
