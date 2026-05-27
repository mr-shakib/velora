export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--clr-bg)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--clr-secondary)' }}>
            Velora
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--clr-muted)' }}>
            Your private space, just the two of you
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
