/**
 * EMS route group layout.
 * Clerk auth, department-verified.
 * Mobile-optimized, write-heavy. 30-second interaction target.
 */
export default function EmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white">
      {children}
    </div>
  );
}
