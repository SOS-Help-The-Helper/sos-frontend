'use client';

interface PartnerConfig {
  db_url: string;
  anon_key: string;
  api_key: string;
  transport?: Record<string, unknown>;
}

interface DrivePageClientProps {
  transport: Record<string, unknown>;
  orgName: string;
  orgSlug: string;
  partnerConfig: PartnerConfig;
  transportConfig: Record<string, unknown>;
}

export default function DrivePageClient({
  transport,
  orgName,
}: DrivePageClientProps) {
  return (
    <div className="min-h-screen bg-[#0F1E2B] flex items-center justify-center">
      <p className="text-white/60 text-sm">
        {orgName} — {String(transport.id)}
      </p>
    </div>
  );
}
