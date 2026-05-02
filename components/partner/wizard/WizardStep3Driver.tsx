'use client';

import { AlertTriangle, ChevronLeft, ChevronRight, Truck, User } from 'lucide-react';
import type { DriverInfo, DriverRow, Proposal, RvInfo } from '../match-wizard';
import { parseDriverName } from '../match-wizard';

interface Props {
  allDrivers: DriverRow[];
  recommendedDriver: DriverInfo | null;
  selectedDriver: DriverInfo | DriverRow | null;
  selectedRv: RvInfo | null;
  proposals: Proposal[];
  onSelect: (d: DriverInfo | DriverRow) => void;
  onNext: () => void;
  onBack: () => void;
}

function getHitchWarning(
  driver: DriverInfo | DriverRow,
  selectedRv: RvInfo | null,
  proposals: Proposal[],
): string | null {
  if (!selectedRv) return null;
  const proposal = proposals.find(p => p.rv.id === selectedRv.id);
  const rvWeight = proposal?.rv.weight ?? selectedRv.weight;
  const driverHitch = ('hitch' in driver ? driver.hitch : (driver as DriverRow).hitch_type) || '';
  if (rvWeight && rvWeight > 10000 && driverHitch.toLowerCase().includes('receiver')) {
    return `RV weighs ${rvWeight.toLocaleString()} lbs — receiver hitch may be insufficient`;
  }
  if (
    rvWeight &&
    rvWeight > 15000 &&
    !driverHitch.toLowerCase().includes('fifth') &&
    !driverHitch.toLowerCase().includes('gooseneck')
  ) {
    return `RV weighs ${rvWeight.toLocaleString()} lbs — may need fifth wheel or gooseneck hitch`;
  }
  return null;
}

function DriverCard({
  name,
  vehicle,
  hitch,
  range,
  availability,
  warning,
  recommended,
}: {
  name: string;
  vehicle?: string;
  hitch?: string;
  range?: string;
  availability?: string;
  warning: string | null;
  recommended?: boolean;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <User className={`h-5 w-5 mt-0.5 flex-shrink-0 ${recommended ? 'text-green-400' : 'text-gray-500'}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-100 truncate">{name}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-0.5">
            {vehicle && (
              <span className="flex items-center gap-1">
                <Truck className="h-3 w-3" /> {vehicle}
              </span>
            )}
            {hitch && <span>Hitch: {hitch}</span>}
            {range && <span>Range: {range}</span>}
            {availability && (
              <span className={availability === 'available' ? 'text-green-400' : 'text-gray-500'}>
                {availability}
              </span>
            )}
          </div>
        </div>
      </div>
      {warning && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          {warning}
        </div>
      )}
    </div>
  );
}

export function WizardStep3Driver({
  allDrivers,
  recommendedDriver,
  selectedDriver,
  selectedRv,
  proposals,
  onSelect,
  onNext,
  onBack,
}: Props) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Select Driver
      </h3>

      {recommendedDriver && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wide text-green-500 font-semibold mb-1.5">
            Recommended
          </p>
          <button
            onClick={() => onSelect(recommendedDriver)}
            className={`w-full text-left rounded-xl border p-3 transition-colors ${
              selectedDriver?.id === recommendedDriver.id
                ? 'border-green-500 bg-green-900/20'
                : 'border-green-800 bg-green-900/10 hover:border-green-600'
            }`}
          >
            <DriverCard
              name={parseDriverName(recommendedDriver.description)}
              vehicle={recommendedDriver.tow_vehicle}
              hitch={recommendedDriver.hitch}
              range={recommendedDriver.travel_range}
              availability={recommendedDriver.availability}
              warning={getHitchWarning(recommendedDriver, selectedRv, proposals)}
              recommended
            />
          </button>
        </div>
      )}

      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1.5">
        All Available Drivers
      </p>
      {allDrivers.length === 0 ? (
        <p className="text-sm text-gray-500 italic py-4 text-center">No drivers found</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {allDrivers
            .filter(d => d.id !== recommendedDriver?.id)
            .map(d => {
              const selected = selectedDriver?.id === d.id;
              const warning = getHitchWarning(d, selectedRv, proposals);
              return (
                <button
                  key={d.id}
                  onClick={() => onSelect(d)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${
                    selected
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <DriverCard
                    name={parseDriverName(d.description)}
                    vehicle={d.tow_vehicle}
                    hitch={d.hitch_type}
                    range={d.travel_range}
                    availability={d.availability}
                    warning={warning}
                  />
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
        {selectedDriver && (
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
