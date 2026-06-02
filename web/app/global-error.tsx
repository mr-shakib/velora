'use client';

import { useEffect } from 'react';

// Catches errors thrown in the root layout itself. Must render its own
// <html>/<body>. This is the last line of defense against a full white screen.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#F8F4EC',
          color: '#2B2B2B',
        }}
      >
        <div style={{ fontSize: 48 }}>💔</div>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h2>
        <p style={{ opacity: 0.7, maxWidth: 380 }}>
          The app failed to load. This is often a stale cached version — a hard
          refresh (Ctrl+Shift+R) usually fixes it.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            background: '#A8D5BA',
            color: '#2B2B2B',
            fontWeight: 500,
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
