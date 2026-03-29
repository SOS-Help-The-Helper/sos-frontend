/**
 * Admin route group layout.
 * Restricted to Jonathan's Clerk account. Full access.
 * Organism health, approvals, intelligence feed.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {children}
    </div>
  );
}
