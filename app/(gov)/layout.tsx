/**
 * Government route group layout.
 * Clerk auth, read-only role check.
 * Zero PII visible. Aggregated data only.
 */
export default function GovLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {children}
    </div>
  );
}
