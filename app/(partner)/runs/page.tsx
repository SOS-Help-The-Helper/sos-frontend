'use client';
import { db } from '@/lib/api';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';

interface DeliveryRun {
  id: string;
  name: string;
  org_id: string;
  status: string;
  origin_address: string;
  departure_time: string;
  total_slots: number;
  created_at: string;
}

interface SlotDraft {
  driver_name: string;
  driver_person_id: string;
  cargo_description: string;
  vehicle_info: string;
  dropoff_address: string;
  dropoff_contact_name: string;
  dropoff_notes: string;
}

type View = 'list' | 'create' | 'detail';

export default function DeliveryRunsPage() {
  const [view, setView] = useState<View>('list');
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { orgId } = useAuthContext();
  const { effectiveOrgId } = useViewContext();
  const currentOrgId = effectiveOrgId || orgId;

  // Create form state
  const [runName, setRunName] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [slots, setSlots] = useState<SlotDraft[]>([emptySlot()]);

  // Detail view
  const [selectedRun, setSelectedRun] = useState<DeliveryRun | null>(null);
  const [runAssignments, setRunAssignments] = useState<any[]>([]);

  // Helpers list for driver selection
  const [helpers, setHelpers] = useState<any[]>([]);

  function emptySlot(): SlotDraft {
    return { driver_name: '', driver_person_id: '', cargo_description: '', vehicle_info: '', dropoff_address: '', dropoff_contact_name: '', dropoff_notes: '' };
  }

  useEffect(() => {
    if (!currentOrgId) return;
    async function load() {
      const [{ data: runData }, { data: helperData }] = await Promise.all([
        db.from('delivery_runs').select('*').eq('org_id', currentOrgId).order('created_at', { ascending: false }),
        db.from('resources').select('id, person_id, category, details_sanitized').eq('source', 'citizen_offer').in('category', ['transportation', 'labor']).limit(50),
      ]);
      setRuns(runData || []);
      setHelpers(helperData || []);
      setLoading(false);
    }
    load();
  }, [currentOrgId]);

  async function createRun() {
    if (!runName.trim() || !currentOrgId) return;
    setSaving(true);

    // Create run
    const { data: runData, error: runError } = await db.from('delivery_runs').insert({
      name: runName,
      org_id: currentOrgId,
      status: 'planning',
      origin_address: originAddress,
      departure_time: departureDate || null,
      total_slots: slots.length,
    }).select().single();

    if (runError || !runData) { setSaving(false); return; }

    // Create assignments for each slot
    const assignmentInserts = slots.map((slot, i) => ({
      run_id: runData.id,
      slot_number: i + 1,
      driver_person_id: slot.driver_person_id || null,
      driver_name: slot.driver_name || null,
      status: 'assigned',
      cargo_description: slot.cargo_description || null,
      vehicle_info: slot.vehicle_info || null,
      dropoff_address: slot.dropoff_address || null,
      dropoff_contact_name: slot.dropoff_contact_name || null,
      dropoff_notes: slot.dropoff_notes || null,
    }));

    await db.from('delivery_assignments').insert(assignmentInserts);

    setRuns(prev => [runData, ...prev]);
    setView('list');
    setRunName('');
    setOriginAddress('');
    setDepartureDate('');
    setSlots([emptySlot()]);
    setSaving(false);
  }

  async function viewRunDetail(run: DeliveryRun) {
    setSelectedRun(run);
    const { data } = await db.from('delivery_assignments').select('*').eq('run_id', run.id).order('slot_number');
    setRunAssignments(data || []);
    setView('detail');
  }

  function updateSlot(index: number, field: keyof SlotDraft, value: string) {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  function getDriverLink(runId: string, slotNumber: number) {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/drive?run=${runId}&slot=${slotNumber}`;
  }

  return (
    <DashboardShell title="Delivery Runs" subtitle="Create and manage delivery caravans">
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : view === 'list' ? (
        <div className="space-y-4">
          <button onClick={() => setView('create')}
            className="w-full py-3 rounded-xl border-2 border-dashed border-sos-accent-300 text-sos-accent-700 font-bold text-sm hover:bg-sos-accent-50 transition-colors">
            + Create Delivery Run
          </button>

          {runs.length === 0 ? (
            <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-8 text-center">
              <span className="text-3xl">🚐</span>
              <h3 className="text-base font-bold text-sos-blue-800 mt-2">No Delivery Runs</h3>
              <p className="text-sm text-sos-gray-600">Create a run to coordinate driver assignments and deliveries.</p>
            </div>
          ) : runs.map(run => (
            <button key={run.id} onClick={() => viewRunDetail(run)}
              className="w-full text-left bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-sos-blue-800">{run.name}</h3>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  run.status === 'active' ? 'bg-green-50 text-green-700' :
                  run.status === 'planning' ? 'bg-yellow-50 text-yellow-700' :
                  run.status === 'completed' ? 'bg-sos-gray-200 text-sos-gray-600' :
                  'bg-sos-gray-200 text-sos-gray-500'
                }`}>{run.status}</span>
              </div>
              <p className="text-xs text-sos-gray-600">{run.origin_address || 'No origin set'}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-sos-gray-400">
                <span>🚐 {run.total_slots} slots</span>
                {run.departure_time && <span>📅 {new Date(run.departure_time).toLocaleDateString()}</span>}
              </div>
            </button>
          ))}
        </div>
      ) : view === 'create' ? (
        <div className="space-y-4">
          <button onClick={() => setView('list')} className="text-sm text-sos-gray-500 hover:text-sos-blue-800">← Back to runs</button>
          <h2 className="text-base font-bold text-sos-blue-800">Create Delivery Run</h2>

          {/* Run details */}
          <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-sos-gray-600">Run Name *</label>
              <input type="text" value={runName} onChange={e => setRunName(e.target.value)} placeholder="e.g. Hurricane Relief Run #3"
                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-sos-gray-600">Origin Address</label>
              <input type="text" value={originAddress} onChange={e => setOriginAddress(e.target.value)} placeholder="Staging location address"
                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-sos-gray-600">Departure Date</label>
              <input type="datetime-local" value={departureDate} onChange={e => setDepartureDate(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
            </div>
          </div>

          {/* Slots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-sos-blue-800">Driver Slots ({slots.length})</h3>
              <button onClick={() => setSlots(prev => [...prev, emptySlot()])}
                className="text-xs font-bold text-sos-accent-700 hover:text-sos-accent-900">+ Add Slot</button>
            </div>

            <div className="space-y-3">
              {slots.map((slot, i) => (
                <div key={i} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-sos-blue-800">Slot #{i + 1}</span>
                    {slots.length > 1 && (
                      <button onClick={() => setSlots(prev => prev.filter((_, j) => j !== i))}
                        className="text-[10px] text-sos-red-500 hover:text-sos-red-700">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-sos-gray-500">Driver Name</label>
                      <input type="text" value={slot.driver_name} onChange={e => updateSlot(i, 'driver_name', e.target.value)}
                        placeholder="Name" className="w-full mt-0.5 px-3 py-2 rounded-lg border border-sos-gray-300 text-xs text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-sos-gray-500">Vehicle</label>
                      <input type="text" value={slot.vehicle_info} onChange={e => updateSlot(i, 'vehicle_info', e.target.value)}
                        placeholder="e.g. RV #4" className="w-full mt-0.5 px-3 py-2 rounded-lg border border-sos-gray-300 text-xs text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-sos-gray-500">Cargo</label>
                      <input type="text" value={slot.cargo_description} onChange={e => updateSlot(i, 'cargo_description', e.target.value)}
                        placeholder="What's being delivered" className="w-full mt-0.5 px-3 py-2 rounded-lg border border-sos-gray-300 text-xs text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-sos-gray-500">Drop-off Address</label>
                      <input type="text" value={slot.dropoff_address} onChange={e => updateSlot(i, 'dropoff_address', e.target.value)}
                        placeholder="Destination address" className="w-full mt-0.5 px-3 py-2 rounded-lg border border-sos-gray-300 text-xs text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-sos-gray-500">Contact Name</label>
                      <input type="text" value={slot.dropoff_contact_name} onChange={e => updateSlot(i, 'dropoff_contact_name', e.target.value)}
                        placeholder="Recipient" className="w-full mt-0.5 px-3 py-2 rounded-lg border border-sos-gray-300 text-xs text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-sos-gray-500">Notes</label>
                      <input type="text" value={slot.dropoff_notes} onChange={e => updateSlot(i, 'dropoff_notes', e.target.value)}
                        placeholder="Gate code, etc." className="w-full mt-0.5 px-3 py-2 rounded-lg border border-sos-gray-300 text-xs text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={createRun} disabled={!runName.trim() || saving}
            className="w-full py-3.5 rounded-xl bg-sos-red-500 text-white font-bold disabled:opacity-40 transition-colors">
            {saving ? 'Creating...' : `Create Run with ${slots.length} Slot${slots.length > 1 ? 's' : ''}`}
          </button>
        </div>
      ) : view === 'detail' && selectedRun ? (
        <div className="space-y-4">
          <button onClick={() => setView('list')} className="text-sm text-sos-gray-500 hover:text-sos-blue-800">← Back to runs</button>

          <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-sos-blue-800">{selectedRun.name}</h2>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                selectedRun.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
              }`}>{selectedRun.status}</span>
            </div>
            <p className="text-xs text-sos-gray-600">{selectedRun.origin_address}</p>
            {selectedRun.departure_time && <p className="text-[10px] text-sos-gray-400 mt-1">📅 {new Date(selectedRun.departure_time).toLocaleString()}</p>}
          </div>

          <h3 className="text-sm font-bold text-sos-blue-800">Slots ({runAssignments.length})</h3>

          <div className="space-y-2">
            {runAssignments.map(a => (
              <div key={a.id} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-sos-blue-800">Slot #{a.slot_number}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    a.status === 'delivered' || a.status === 'docs_uploaded' ? 'bg-green-50 text-green-700' :
                    a.status === 'en_route' ? 'bg-sos-accent-50 text-sos-accent-700' :
                    'bg-sos-gray-200 text-sos-gray-500'
                  }`}>{a.status?.replace(/_/g, ' ')}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {a.driver_name && <div><span className="text-sos-gray-500">Driver:</span> <span className="text-sos-blue-800 font-medium">{a.driver_name}</span></div>}
                  {a.vehicle_info && <div><span className="text-sos-gray-500">Vehicle:</span> <span className="text-sos-blue-800 font-medium">{a.vehicle_info}</span></div>}
                  {a.cargo_description && <div className="col-span-2"><span className="text-sos-gray-500">Cargo:</span> <span className="text-sos-blue-800">{a.cargo_description}</span></div>}
                  {a.dropoff_address && <div className="col-span-2"><span className="text-sos-gray-500">Drop-off:</span> <span className="text-sos-blue-800">{a.dropoff_address}</span></div>}
                </div>

                {/* Driver link */}
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(getDriverLink(selectedRun.id, a.slot_number)); }}
                    className="text-[10px] font-medium text-sos-accent-700 bg-sos-accent-50 px-2.5 py-1 rounded-full hover:bg-sos-accent-100 transition-colors">
                    🔗 Copy Driver Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
