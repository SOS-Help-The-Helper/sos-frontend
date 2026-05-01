'use client';

import { ChevronLeft, ChevronRight, MapPin, Truck, Users } from 'lucide-react';
import type { Proposal, RvInfo, Survivor } from '../match-wizard';

interface Props {
  proposals: Proposal[];
  selectedRequest: Survivor | null;
  selectedRv: RvInfo | null;
  onSelect: (rv: RvInfo) => void;
  onNext: () => void;
  onBack: () => void;
}

export function WizardStep2RV({ proposals, selectedRequest, selectedRv, onSelect, onNext, onBack }: Props) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Select RV for {selectedRequest?.name}
      </h3>
      {proposals.length === 0 ? (
        <p className="text-sm text-gray-500 italic py-6 text-center">No available RVs found</p>
      ) : (
        <div className="space-y-2">
          {proposals.map(p => {
            const selected = selectedRv?.id === p.rv.id;
            return (
              <button
                key={p.rv.id}
                onClick={() => onSelect(p.rv)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  selected
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Truck className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-100 truncate">
                      {p.rv.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> Sleeps {p.rv.sleeps}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {p.rv.location || '—'}
                      </span>
                      {p.rv_to_survivor_miles != null && (
                        <span className="text-blue-400">
                          {Math.round(p.rv_to_survivor_miles)} mi to survivor
                        </span>
                      )}
                    </div>
                    {p.display_lines.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {p.display_lines.slice(0, 3).map((line, i) => (
                          <p key={i} className="text-xs text-gray-500">{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded-md flex-shrink-0">
                    {p.match_score}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-between mt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 text-sm font-semibold border border-gray-600 hover:text-gray-100 hover:border-gray-500 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {selectedRv && (
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
