'use client';

// TODO: rewire to lib/api.ts (Phase 3-5) — import { MatchEvent, getStatusColor } from '@/lib/match-queries';

interface MatchTimelineProps {
  events: MatchEvent[];
}

export function MatchTimeline({ events }: MatchTimelineProps) {
  if (!events.length) {
    return (
      <div className="text-xs text-sos-gray-500 italic py-3">
        No events recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        return (
          <div key={event.id} className="flex items-start gap-3">
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                event.event_type === 'fulfilled' ? 'bg-green-500' :
                event.event_type === 'failed' || event.event_type === 'declined' ? 'bg-sos-red-500' :
                event.event_type === 'connected' ? 'bg-green-400' :
                event.event_type === 'proposed' ? 'bg-sos-accent-500' :
                'bg-sos-gray-400'
              }`} />
              {!isLast && <div className="w-px h-6 bg-sos-gray-300" />}
            </div>

            {/* Event content */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${getStatusColor(event.event_type)}`}>
                  {(event.event_type ?? '').replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-sos-gray-500">
                  by {event.actor_type}
                </span>
                {event.channel && (
                  <span className="text-[10px] text-sos-gray-400">
                    via {event.channel}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-sos-gray-500 mt-0.5">
                {new Date(event.created_at).toLocaleString()}
              </p>
              {event.details && Object.keys(event.details).length > 0 && (
                <p className="text-[10px] text-sos-gray-600 mt-0.5">
                  {JSON.stringify(event.details).slice(0, 100)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
