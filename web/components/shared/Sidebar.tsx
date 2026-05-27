'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Image, Clock, CalendarDays, MessageCircle,
  CheckSquare, Timer, Settings, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/memories', icon: Image, label: 'Memories' },
  { href: '/timeline', icon: Clock, label: 'Timeline' },
  { href: '/planner', icon: CalendarDays, label: 'Planner' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/bucket', icon: CheckSquare, label: 'Bucket List' },
  { href: '/countdowns', icon: Timer, label: 'Countdowns' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { clearSession } = useAuthStore();

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    clearSession();
    router.push('/login');
    toast.success('Logged out');
  }

  return (
    <aside
      className="hidden lg:flex flex-col w-60 shrink-0 border-r p-4 gap-1"
      style={{ background: 'var(--clr-surface)', borderColor: 'var(--clr-border)' }}
    >
      <div className="px-3 py-4 mb-2">
        <span className="text-xl font-semibold" style={{ color: 'var(--clr-secondary)' }}>Velora</span>
      </div>

      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active ? 'text-[var(--clr-secondary)]' : 'text-[var(--clr-muted)] hover:text-[var(--clr-text)]',
                )}
                style={{
                  background: active ? 'var(--clr-primary)' : 'transparent',
                }}
              >
                <Icon size={18} />
                {label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t pt-3" style={{ borderColor: 'var(--clr-border)' }}>
        <Link href="/settings">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm" style={{ color: 'var(--clr-muted)' }}>
            <Settings size={18} />
            Settings
          </div>
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm" style={{ color: 'var(--clr-muted)' }}>
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
