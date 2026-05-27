'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Palette, User, Bell, Database } from 'lucide-react';

const TABS = [
  { href: '/settings/appearance', label: 'Appearance', icon: Palette },
  { href: '/settings/account', label: 'Account', icon: User },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/data', label: 'Data & Privacy', icon: Database },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--clr-text)' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="shrink-0 w-40 space-y-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? 'var(--clr-primary)' : 'transparent',
                  color: active ? 'var(--clr-text)' : 'var(--clr-muted)',
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
