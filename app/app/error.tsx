'use client';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F1E2B] text-white gap-4 p-8">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-white/60 max-w-md text-center">
        We hit an unexpected error loading this page. Please try again or contact support if it keeps happening.
      </p>
      {error.digest && <p className="text-xs text-white/30">Reference: {error.digest}</p>}
      <button onClick={reset} className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors">
        Try again
      </button>
    </div>
  );
}
