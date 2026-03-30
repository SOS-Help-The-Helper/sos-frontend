import { redirect } from 'next/navigation';

/**
 * Root / → public homepage (marketing page)
 * TODO: Build full marketing page with copy from design/website/COPY.md
 * For now: redirect to /app (citizen) if authenticated, show landing if not
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img src="/logomark.svg" alt="SOS" className="h-8 w-8" />
          <span className="text-xl font-bold">SOS | Connect</span>
        </div>
        <div className="flex gap-3">
          <a href="/auth" className="text-sm px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition">Log In</a>
          <a href="/auth" className="text-sm px-4 py-2 rounded-lg bg-[#EF4E4B] hover:bg-[#d94440] transition font-medium">Get Started</a>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 pt-24 text-center">
        <h1 className="text-4xl font-bold leading-tight mb-4">Everyone is a helper.</h1>
        <p className="text-lg text-white/70 mb-8">Prepare your family. Help your neighbors. Coordinate when disaster strikes.</p>
        <a href="/auth" className="inline-block px-8 py-4 rounded-xl bg-[#EF4E4B] hover:bg-[#d94440] text-lg font-bold transition">Join SOS Connect →</a>
      </main>
    </div>
  );
}
