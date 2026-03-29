'use client';

import { useRef } from 'react';

interface ImpactCertificateProps {
  orgName: string;
  disasterName: string;
  familiesHelped: number;
  avgResponseHrs: number;
  fulfillmentRate: number;
  onClose: () => void;
}

/**
 * Shareable impact certificate card.
 * Partners can screenshot or copy for social media / grant reports.
 */
export function ImpactCertificate({ orgName, disasterName, familiesHelped, avgResponseHrs, fulfillmentRate, onClose }: ImpactCertificateProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: `${orgName} — SOS Impact`,
        text: `${orgName} helped ${familiesHelped} families during ${disasterName} with a ${fulfillmentRate}% fulfillment rate. #SOSConnect #EveryoneIsAHelper`,
        url: 'https://sosconnect.org',
      });
    } else {
      await navigator.clipboard.writeText(
        `${orgName} helped ${familiesHelped} families during ${disasterName} with a ${fulfillmentRate}% fulfillment rate and ${avgResponseHrs}hr avg response time. 🆘 sosconnect.org #EveryoneIsAHelper`
      );
      alert('Copied to clipboard!');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
        {/* The card */}
        <div ref={cardRef} className="bg-sos-blue-800 rounded-2xl p-6 text-white overflow-hidden relative">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-4 right-4 text-[100px] leading-none">🆘</div>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 mb-5">
              <img src="/logomark.svg" alt="SOS" className="h-8 w-8" />
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Impact Certificate</p>
                <p className="text-xs text-sos-accent-400">{disasterName}</p>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-6">{orgName}</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-3xl font-bold">{familiesHelped}</p>
                <p className="text-[10px] text-white/60">Families Helped</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{avgResponseHrs}<span className="text-lg">h</span></p>
                <p className="text-[10px] text-white/60">Avg Response</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{fulfillmentRate}<span className="text-lg">%</span></p>
                <p className="text-[10px] text-white/60">Fulfilled</p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 flex items-center justify-between">
              <p className="text-[10px] text-white/40">sosconnect.org</p>
              <p className="text-[10px] text-white/40">Everyone is a helper</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/20 text-white text-sm font-semibold">Close</button>
          <button onClick={handleShare} className="flex-1 py-2.5 rounded-xl bg-white text-sos-blue-800 text-sm font-bold">📤 Share</button>
        </div>
      </div>
    </div>
  );
}
