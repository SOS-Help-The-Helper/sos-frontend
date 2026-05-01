'use client';

import { ChevronRight, MapPin, Users } from 'lucide-react';
import type { Survivor } from '../match-wizard';
import { getScoreColor, getFlags } from '../match-wizard';

interface Props {
  survivors: Survivor[];
  selectedRequest: Survivor | null;
  onSelect: (s: Survivor) => void;
  onNext: () => void;
}

export function WizardStep1Survivor({ survivors, selectedRequest, onSelect, onNext }: Props) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Select Survivor
      </h3>
      {survivors.length === 0 ? (
        <p className="text-sm text-gray-500 italic py-6 text-center">No active requests</p>
      ) : (
        <div className="space-y-2">
          {survivors.map(s => {
            const selected = selectedRequest?.id === s.id;
            const flags = getFlags(s);
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  selected
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${getScoreColor(s.priority_score)}`}
                  >
                    {s.priority_score}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-100 truncate">{s.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {s.location || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {s.household_size}
                      </span>
                    </div>
                  </div>
                  {flags.length > 0 && (
                    <div className="flex gap-1 flex-shrink-0">
                      {flags.map(f => (
                        <span key={f} className="text-xs" title={f}>
                          {f.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedRequest && (
        <div className="flex justify-end mt-4">
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
