/**
 * Citizen route group layout.
 * NO Clerk — phone auth via Supabase (Phase 2).
 * PWA-optimized, mobile-first.
 */
export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {children}
    </div>
  );
}
