'use client';

import { useState } from 'react';
import { CitizenHeader } from '@/components/citizen-header';
import { SOSBottomSheet } from '@/components/sos-bottom-sheet';

interface PartnerConfig {
  db_url: string;
  anon_key: string;
  api_key: string;
}

interface Transport {
  id: string;
  match_id?: string;
  resource_id?: string;
  request_id?: string;
  driver_person_id?: string | null;
  status: string;
  origin?: string;
  destination?: string;
  resource_description?: string;
  driver_name?: string;
  current_lat?: number | null;
  current_lng?: number | null;
  admin_notes?: string;
  notes?: string;
}

interface TransportConfig {
  status_pipeline?: string[];
  require_photos_at?: string[];
  driver_onboarding?: Record<string, unknown>;
  branding?: { color?: string; name?: string };
}

interface DrivePageClientProps {
  transport: Transport;
  orgName: string;
  orgSlug: string;
  partnerConfig: PartnerConfig;
  transportConfig: TransportConfig;
}

const DEFAULT_PIPELINE = [
  'accepted',
  'en_route',
  'at_pickup',
  'loaded',
  'in_transit',
  'delivered',
  'verified',
];

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Accept Delivery',
  en_route: 'On My Way',
  at_pickup: 'At Pickup Location',
  loaded: 'Loaded Up',
  hooked_up: 'Hooked Up',
  in_transit: 'Driving',
  arrived: 'Arrived',
  delivered: 'Mark as Delivered',
  verified: 'Complete',
};

const STATUS_PILL_COLORS: Record<string, string> = {
  accepted: 'bg-blue-500/20 text-blue-300',
  en_route: 'bg-yellow-500/20 text-yellow-300',
  at_pickup: 'bg-orange-500/20 text-orange-300',
  loaded: 'bg-orange-400/20 text-orange-200',
  hooked_up: 'bg-orange-400/20 text-orange-200',
  in_transit: 'bg-purple-500/20 text-purple-300',
  arrived: 'bg-green-400/20 text-green-300',
  delivered: 'bg-green-500/20 text-green-300',
  verified: 'bg-green-600/20 text-green-200',
};

function cityOnly(address: string): string {
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length <= 2) return address;
  return parts.slice(-2).join(', ');
}

export default function DrivePageClient({
  transport,
  orgName,
  orgSlug,
  transportConfig,
}: DrivePageClientProps) {
  const [agentOpen, setAgentOpen] = useState(false);

  const pipeline = transportConfig.status_pipeline ?? DEFAULT_PIPELINE;
  const brandColor = transportConfig.branding?.color ?? '#EF4E4B';

  const currentIndex = pipeline.indexOf(transport.status);
  const nextStatus = currentIndex >= 0 && currentIndex < pipeline.length - 1
    ? pipeline[currentIndex + 1]
    : null;
  const atEnd = currentIndex >= pipeline.length - 1;

  const beforeAtPickup =
    currentIndex < 0 || currentIndex < pipeline.indexOf('at_pickup');

  const destination = transport.destination ?? '';
  const displayedDestination =
    beforeAtPickup && destination ? cityOnly(destination) : destination;

  const pillClass =
    STATUS_PILL_COLORS[transport.status] ?? 'bg-white/10 text-white/60';

  const notes = transport.admin_notes || transport.notes;

  return (
    <div className="relative w-full bg-[#0F1E2B]" style={{ minHeight: '100dvh' }}>
      <CitizenHeader
        onAgentTap={() => setAgentOpen(true)}
        locationName={`${orgName} Delivery`}
        status="safe"
        agentOpen={agentOpen}
      />

      {/* Main content */}
      <div className="px-5 pt-20 pb-24">
        {/* No driver banner */}
        {!transport.driver_person_id && (
          <div className="mb-4 rounded-xl border border-[#EF4E4B]/40 bg-[#EF4E4B]/10 px-4 py-3 text-center">
            <p className="text-sm font-medium text-white">
              Tap the SOS button to get started
            </p>
            <p className="mt-0.5 text-xs text-white/50">
              The agent will guide you through onboarding
            </p>
          </div>
        )}

        {/* Transport card */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          {/* Title + status */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-lg font-semibold text-white leading-tight">
              {transport.resource_description || 'Delivery'}
            </p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${pillClass}`}
            >
              {transport.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="border-t border-white/10 my-4" />

          {/* Pickup */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              Pickup
            </p>
            <p className="text-sm text-white mb-2">
              {transport.origin || '—'}
            </p>
            {transport.origin && (
              <button
                onClick={() =>
                  window.open(
                    'https://maps.google.com/?q=' +
                      encodeURIComponent(transport.origin!),
                    '_blank'
                  )
                }
                className="text-xs bg-white/10 px-3 py-1.5 rounded-lg text-white/80 hover:bg-white/20 transition-colors"
              >
                Navigate
              </button>
            )}
          </div>

          {/* Dropoff */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              Dropoff
            </p>
            <p className="text-sm text-white mb-2">
              {displayedDestination || '—'}
            </p>
            {destination && (
              <button
                onClick={() =>
                  window.open(
                    'https://maps.google.com/?q=' +
                      encodeURIComponent(destination),
                    '_blank'
                  )
                }
                className="text-xs bg-white/10 px-3 py-1.5 rounded-lg text-white/80 hover:bg-white/20 transition-colors"
              >
                Navigate
              </button>
            )}
          </div>

          {/* Distance placeholder */}
          {transport.origin && destination && (
            <p className="text-xs text-white/30 mb-4">
              Estimated distance will be calculated
            </p>
          )}

          {/* Driver notes */}
          {notes && (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                Notes
              </p>
              <p className="text-sm text-white/70">{notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#0F1E2B] via-[#0F1E2B]/95 to-transparent">
        {atEnd ? (
          <button
            disabled
            className="w-full py-4 rounded-2xl text-white font-bold text-sm bg-green-600/60 cursor-default"
          >
            Delivery Complete ✓
          </button>
        ) : nextStatus ? (
          <button
            onClick={() => console.log('Advance status to:', nextStatus)}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm transition-opacity active:opacity-80"
            style={{ backgroundColor: brandColor }}
          >
            {STATUS_LABELS[nextStatus] ?? nextStatus.replace(/_/g, ' ')}
          </button>
        ) : null}
      </div>

      <SOSBottomSheet
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        context="partner"
        partner={orgSlug}
      />
    </div>
  );
}
