'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronRight, ChevronLeft, Check, AlertTriangle,
  Users, MapPin, Truck, User, Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Survivor {
  id: string;
  name: string;
  priority_score: number;
  urgency: string;
  household_size: number;
  location: string;
  veteran: boolean;
  first_responder: boolean;
  medical_needs: boolean;
  single_parent: boolean;
  disaster: string;
  submitted: string;
}

interface RvInfo {
  id: string;
  description: string;
  type: string;
  sleeps: number;
  vin: string;
  condition: string;
  location: string;
  weight: number | null;
}

interface DriverInfo {
  id: string;
  description: string;
  tow_vehicle: string;
  hitch: string;
  tow_rating: string;
  travel_range: string;
  availability: string;
  driver_to_rv_miles: number | null;
  total_trip_miles: number | null;
}

interface Proposal {
  rv: RvInfo;
  best_driver: DriverInfo | null;
  rv_to_survivor_miles: number | null;
  match_score: number;
  reasoning: string[];
  display_lines: string[];
}

interface DriverRow {
  id: string;
  description?: string;
  tow_vehicle?: string;
  tow_rating?: string;
  hitch_type?: string;
  availability?: string;
  travel_range?: string;
  cdl?: boolean;
}

interface MatchWizardProps {
  preselected?: {
    requestId?: string;
    resourceId?: string;
    driverResourceId?: string;
  };
  onClose: () => void;
  onPropose: (chainId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://rtduqguwhkczexnoawej.supabase.co';

const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const STEPS = [
  { num: 1, label: 'Survivor' },
  { num: 2, label: 'RV' },
  { num: 3, label: 'Driver' },
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number) {
  if (score >= 80) return 'text-red-400 bg-red-900/40';
  if (score >= 50) return 'text-orange-400 bg-orange-900/40';
  if (score >= 30) return 'text-yellow-400 bg-yellow-900/40';
  return 'text-gray-400 bg-gray-700/60';
}

function parseDriverName(desc?: string): string {
  if (!desc) return 'Unknown Driver';
  const m = desc.match(/Volunteer driver:\s*(.+?)\s*-/i);
  return m ? m[1].trim() : desc.slice(0, 40);
}

function getFlags(s: Survivor): string[] {
  const f: string[] = [];
  if (s.veteran) f.push('🎖️ Veteran');
  if (s.first_responder) f.push('🚒 FR');
  if (s.medical_needs) f.push('🏥 Medical');
  if (s.single_parent) f.push('👨‍👧 Single Parent');
  return f;
}

async function efPost(fn: string, body: Record<string, unknown>) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`${fn} returned ${resp.status}`);
  return resp.json();
}

/* ------------------------------------------------------------------ */
/*  Step Indicator                                                     */
/* ------------------------------------------------------------------ */

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 py-5">
      {STEPS.map((s, i) => {
        const done = current > s.num;
        const active = current === s.num;
        return (
          <div key={s.num} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  done
                    ? 'bg-green-600 border-green-500 text-white'
                    : active
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-500'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span
                className={`text-[10px] mt-1.5 font-medium ${
                  done ? 'text-green-400' : active ? 'text-blue-400' : 'text-gray-500'
                }`}
              >
                {s.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-2 mb-5 ${
                  current > s.num ? 'bg-green-600' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function MatchWizard({ preselected, onClose, onPropose }: MatchWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedRequest, setSelectedRequest] = useState<Survivor | null>(null);
  const [selectedRv, setSelectedRv] = useState<RvInfo | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverInfo | DriverRow | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 data
  const [survivors, setSurvivors] = useState<Survivor[]>([]);

  // Step 3 data
  const [allDrivers, setAllDrivers] = useState<DriverRow[]>([]);
  const [recommendedDriver, setRecommendedDriver] = useState<DriverInfo | null>(null);

  // Step 4 result
  const [chainId, setChainId] = useState<string | null>(null);

  /* ---- Escape to close ---- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* ---- Step 1: fetch survivors ---- */
  useEffect(() => {
    if (step !== 1) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    efPost('erv-query', { query_type: 'priority_queue', limit: 20 })
      .then(data => {
        if (cancelled) return;
        setSurvivors(data.queue || []);
        // Auto-select if preselected
        if (preselected?.requestId) {
          const found = (data.queue || []).find(
            (s: Survivor) => s.id === preselected.requestId,
          );
          if (found) {
            setSelectedRequest(found);
            setStep(2);
          }
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load queue');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [step, preselected?.requestId]);

  /* ---- Step 2: fetch proposals ---- */
  useEffect(() => {
    if (step !== 2 || !selectedRequest) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    efPost('erv-query', {
      query_type: 'propose_match',
      filters: { name: selectedRequest.name },
    })
      .then(data => {
        if (cancelled) return;
        setProposals(data.proposals || []);
        // Auto-select if preselected
        if (preselected?.resourceId) {
          const found = (data.proposals || []).find(
            (p: Proposal) => p.rv.id === preselected.resourceId,
          );
          if (found) {
            setSelectedRv(found.rv);
            if (found.best_driver) setRecommendedDriver(found.best_driver);
            setStep(3);
          }
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load proposals');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [step, selectedRequest, preselected?.resourceId]);

  /* ---- Step 3: fetch all drivers ---- */
  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Find the recommended driver from the selected proposal
    const proposal = proposals.find(p => p.rv.id === selectedRv?.id);
    if (proposal?.best_driver) setRecommendedDriver(proposal.best_driver);

    efPost('erv-query', { query_type: 'driver_status', limit: 50 })
      .then(data => {
        if (cancelled) return;
        setAllDrivers(data.drivers || []);
        // Auto-select recommended driver or preselected
        if (preselected?.driverResourceId) {
          const found = (data.drivers || []).find(
            (d: DriverRow) => d.id === preselected.driverResourceId,
          );
          if (found) {
            setSelectedDriver(found);
            setStep(4);
          }
        } else if (proposal?.best_driver) {
          setSelectedDriver(proposal.best_driver);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load drivers');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [step, selectedRv?.id, proposals, preselected?.driverResourceId]);

  /* ---- Step 4: confirm match ---- */
  const handleConfirm = useCallback(async () => {
    if (!selectedRequest || !selectedRv || !selectedDriver) return;
    setLoading(true);
    setError(null);
    try {
      const data = await efPost('erv-match-propose', {
        request_id: selectedRequest.id,
        resource_id: selectedRv.id,
        driver_resource_id: selectedDriver.id,
      });
      if (data.success) {
        setChainId(data.chain_id);
        onPropose(data.chain_id);
      } else {
        setError(data.error || 'Match proposal failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to propose match');
    } finally {
      setLoading(false);
    }
  }, [selectedRequest, selectedRv, selectedDriver, onPropose]);

  /* ---- Hitch mismatch check ---- */
  const getHitchWarning = useCallback(
    (driver: DriverInfo | DriverRow): string | null => {
      if (!selectedRv) return null;
      const proposal = proposals.find(p => p.rv.id === selectedRv.id);
      const rvWeight = proposal?.rv.weight ?? selectedRv.weight;
      const driverHitch = ('hitch' in driver ? driver.hitch : (driver as DriverRow).hitch_type) || '';
      // Basic hitch compatibility: if RV is heavy and driver has receiver hitch
      if (rvWeight && rvWeight > 10000 && driverHitch.toLowerCase().includes('receiver')) {
        return `RV weighs ${rvWeight.toLocaleString()} lbs — receiver hitch may be insufficient`;
      }
      if (rvWeight && rvWeight > 15000 && !driverHitch.toLowerCase().includes('fifth') && !driverHitch.toLowerCase().includes('gooseneck')) {
        return `RV weighs ${rvWeight.toLocaleString()} lbs — may need fifth wheel or gooseneck hitch`;
      }
      return null;
    },
    [selectedRv, proposals],
  );

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8 md:pt-16">
        <div
          className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* ---- Header ---- */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-700">
            <h2 className="text-lg font-bold text-gray-100">Propose Match</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ---- Step Indicator ---- */}
          <StepIndicator current={Math.min(step, 3)} />

          {/* ---- Scrollable Body ---- */}
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto px-5 pb-5">
            {/* Error banner */}
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Loading spinner */}
            {loading && step !== 4 && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                <span className="ml-2 text-sm text-gray-400">Loading…</span>
              </div>
            )}

            {/* ======== STEP 1: Select Survivor ======== */}
            {step === 1 && !loading && (
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
                          onClick={() => setSelectedRequest(s)}
                          className={`w-full text-left rounded-xl border p-3 transition-colors ${
                            selected
                              ? 'border-blue-500 bg-blue-900/20'
                              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Score circle */}
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${getScoreColor(s.priority_score)}`}
                            >
                              {s.priority_score}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-100 truncate">
                                {s.name}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {s.location || '—'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" /> {s.household_size}
                                </span>
                              </div>
                            </div>
                            {/* Flags */}
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

                {/* Next */}
                {selectedRequest && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => setStep(2)}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ======== STEP 2: Select RV ======== */}
            {step === 2 && !loading && (
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
                          onClick={() => setSelectedRv(p.rv)}
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
                              {/* Display lines from proposal engine */}
                              {p.display_lines.length > 0 && (
                                <div className="mt-2 space-y-0.5">
                                  {p.display_lines.slice(0, 3).map((line, i) => (
                                    <p key={i} className="text-xs text-gray-500">{line}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Match score */}
                            <span className="text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded-md flex-shrink-0">
                              {p.match_score}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Nav */}
                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 text-sm font-semibold border border-gray-600 hover:text-gray-100 hover:border-gray-500 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                  {selectedRv && (
                    <button
                      onClick={() => setStep(3)}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ======== STEP 3: Select Driver ======== */}
            {step === 3 && !loading && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  Select Driver
                </h3>

                {/* Recommended driver highlight */}
                {recommendedDriver && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wide text-green-500 font-semibold mb-1.5">
                      Recommended
                    </p>
                    <button
                      onClick={() => setSelectedDriver(recommendedDriver)}
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
                        warning={getHitchWarning(recommendedDriver)}
                        recommended
                      />
                    </button>
                  </div>
                )}

                {/* All drivers */}
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
                        const warning = getHitchWarning(d);
                        return (
                          <button
                            key={d.id}
                            onClick={() => setSelectedDriver(d)}
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

                {/* Nav */}
                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 text-sm font-semibold border border-gray-600 hover:text-gray-100 hover:border-gray-500 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                  {selectedDriver && (
                    <button
                      onClick={() => setStep(4)}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ======== STEP 4: Confirm ======== */}
            {step === 4 && (
              <div>
                {chainId ? (
                  /* ---- Success ---- */
                  <div className="flex flex-col items-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-900/40 flex items-center justify-center mb-4">
                      <Check className="h-8 w-8 text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-100 mb-1">Match Proposed!</h3>
                    <p className="text-sm text-gray-400 mb-2">
                      Chain ID: <span className="font-mono text-gray-300">{chainId}</span>
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-4 px-6 py-2.5 rounded-lg bg-gray-800 text-gray-300 text-sm font-semibold border border-gray-600 hover:text-gray-100 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  /* ---- Summary ---- */
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
                      Confirm Match
                    </h3>

                    {/* Chain visualization */}
                    <div className="space-y-3">
                      {/* Survivor */}
                      <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/50 p-3">
                        <User className="h-5 w-5 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-gray-500">Survivor</p>
                          <p className="text-sm font-semibold text-gray-100 truncate">
                            {selectedRequest?.name}
                          </p>
                          <p className="text-xs text-gray-400">{selectedRequest?.location}</p>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center">
                        <div className="flex flex-col items-center text-gray-600">
                          <div className="w-px h-3 bg-gray-700" />
                          <ChevronRight className="h-4 w-4 rotate-90" />
                          {(() => {
                            const proposal = proposals.find(p => p.rv.id === selectedRv?.id);
                            return proposal?.rv_to_survivor_miles != null ? (
                              <span className="text-[10px] text-gray-500">
                                {Math.round(proposal.rv_to_survivor_miles)} mi
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      {/* RV */}
                      <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/50 p-3">
                        <Truck className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-gray-500">RV</p>
                          <p className="text-sm font-semibold text-gray-100 truncate">
                            {selectedRv?.description}
                          </p>
                          <p className="text-xs text-gray-400">{selectedRv?.location}</p>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center">
                        <div className="flex flex-col items-center text-gray-600">
                          <div className="w-px h-3 bg-gray-700" />
                          <ChevronRight className="h-4 w-4 rotate-90" />
                        </div>
                      </div>

                      {/* Driver */}
                      <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/50 p-3">
                        <User className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-gray-500">Driver</p>
                          <p className="text-sm font-semibold text-gray-100 truncate">
                            {parseDriverName(selectedDriver?.description)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {'tow_vehicle' in (selectedDriver || {})
                              ? (selectedDriver as DriverInfo).tow_vehicle
                              : (selectedDriver as DriverRow)?.tow_vehicle}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Confirm / Back */}
                    <div className="flex justify-between mt-6">
                      <button
                        onClick={() => setStep(3)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 text-sm font-semibold border border-gray-600 hover:text-gray-100 hover:border-gray-500 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" /> Back
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Proposing…
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Confirm Match
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Driver Card (shared sub-component)                                 */
/* ------------------------------------------------------------------ */

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
