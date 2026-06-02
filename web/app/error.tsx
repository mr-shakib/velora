'use client';

import { useEffect } from 'react';

// Route-level error boundary: any render/runtime error in a page below the
// root layout lands here instead of white-screening the whole app.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
        color: 'var(--clr-text, #2B2B2B)',
      }}
    >
      <div style={{ fontSize: 48 }}>💔</div>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h2>
      <p style={{ opacity: 0.7, maxWidth: 380 }}>
        This page hit an unexpected error. Try again, or reload the page. If it
        keeps happening, your browser may be holding an old cached version —
        a hard refresh (Ctrl+Shift+R) usually fixes that.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            background: 'var(--clr-primary, #A8D5BA)',
            color: 'var(--clr-text, #2B2B2B)',
            fontWeight: 500,
          }}
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            cursor: 'pointer',
            background: 'transparent',
            border: '1px solid var(--clr-border, #ddd)',
            color: 'var(--clr-text, #2B2B2B)',
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}
