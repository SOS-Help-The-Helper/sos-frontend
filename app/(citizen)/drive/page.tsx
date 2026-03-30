'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

const STATUS_PIPELINE = [
  { id: 'assigned', label: 'Assigned', icon: '📋' },
  { id: 'picked_up', label: 'Picked Up', icon: '📦' },
  { id: 'en_route', label: 'En Route', icon: '🚗' },
  { id: 'arrived', label: 'Arrived', icon: '📍' },
  { id: 'delivered', label: 'Delivered', icon: '✅' },
  { id: 'docs_uploaded', label: 'Docs Done', icon: '📄' },
];

interface DeliveryAssignment {
  id: string;
  run_id: string;
  slot_number: number;
  driver_person_id: string;
  status: string;
  vehicle_info: any;
  cargo_description: string;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_contact_name: string;
  dropoff_notes: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  delivery_photo_url: string | null;
  document_urls: string[];
}

interface DeliveryRun {
  id: string;
  name: string;
  status: string;
  departure_time: string;
  origin_address: string;
  total_slots: number;
  assignments: DeliveryAssignment[];
}

function DriverContent() {
  const router = useRouter();
  const params = useSearchParams();
  const runId = params.get('run');
  const slotNum = params.get('slot');

  const [run, setRun] = useState<DeliveryRun | null>(null);
  const [assignment, setAssignment] = useState<DeliveryAssignment | null>(null);
  const [caravanMembers, setCaravanMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const personId = typeof window !== 'undefined' ? localStorage.getItem('sos-person-id') : null;

  useEffect(() => {
    if (!runId) { setLoading(false); return; }
    async function load() {
      // Get run
      const { data: runData } = await supabase
        .from('delivery_runs')
        .select('id, name, status, departure_time, origin_address, total_slots')
        .eq('id', runId)
        .single();

      // Get all assignments for this run
      const { data: assignments } = await supabase
        .from('delivery_assignments')
        .select('*')
        .eq('run_id', runId)
        .order('slot_number', { ascending: true });

      if (runData) {
        setRun({ ...runData, assignments: assignments || [] });
      }

      // Find my assignment
      const myAssignment = slotNum
        ? (assignments || []).find(a => a.slot_number === parseInt(slotNum))
        : (assignments || []).find(a => a.driver_person_id === personId);

      setAssignment(myAssignment || null);

      // Caravan members (other drivers in same run)
      setCaravanMembers((assignments || []).filter(a => a.id !== myAssignment?.id));

      setLoading(false);
    }
    load();
  }, [runId, slotNum, personId]);

  // Update status
  async function updateStatus(newStatus: string) {
    if (!assignment) return;
    const updates: any = { status: newStatus };
    if (newStatus === 'picked_up') updates.picked_up_at = new Date().toISOString();
    if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();

    await supabase.from('delivery_assignments').update(updates).eq('id', assignment.id);
    setAssignment(prev => prev ? { ...prev, ...updates } : null);
  }

  // Upload delivery photo
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !assignment || !personId) return;
    setUploading(true);

    const fileName = `deliveries/${assignment.id}/${Date.now()}-delivery.jpg`;
    await supabase.storage.from('delivery-photos').upload(fileName, file, { contentType: file.type });
    const { data: urlData } = supabase.storage.from('delivery-photos').getPublicUrl(fileName);

    await supabase.from('delivery_assignments').update({ delivery_photo_url: urlData?.publicUrl }).eq('id', assignment.id);
    setAssignment(prev => prev ? { ...prev, delivery_photo_url: urlData?.publicUrl || null } : null);
    setUploading(false);
  }

  // Upload document
  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !assignment || !personId) return;
    setUploading(true);

    const fileName = `deliveries/${assignment.id}/${Date.now()}-${file.name}`;
    await supabase.storage.from('delivery-photos').upload(fileName, file, { contentType: file.type });
    const { data: urlData } = supabase.storage.from('delivery-photos').getPublicUrl(fileName);

    const updatedDocs = [...(assignment.document_urls || []), urlData?.publicUrl].filter(Boolean);
    await supabase.from('delivery_assignments').update({ document_urls: updatedDocs }).eq('id', assignment.id);
    setAssignment(prev => prev ? { ...prev, document_urls: updatedDocs as string[] } : null);
    setUploading(false);
  }

  const currentStepIndex = assignment ? STATUS_PIPELINE.findIndex(s => s.id === assignment.status) : -1;
  const nextStatus = currentStepIndex >= 0 && currentStepIndex < STATUS_PIPELINE.length - 1
    ? STATUS_PIPELINE[currentStepIndex + 1] : null;

  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/c')} className="text-white/40 hover:text-white">←</button>
          <div>
            <p className="text-sm font-bold">🚐 Driver Mode</p>
            {run && <p className="text-[10px] text-white/40">{run.name}</p>}
          </div>
        </div>
        {runId && (
          <button onClick={() => router.push(`/drive/chat?run=${runId}`)}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            💬 Caravan Chat
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : !run || !assignment ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <span className="text-4xl mb-3">🚐</span>
          <h2 className="text-base font-bold">No Active Assignment</h2>
          <p className="text-sm text-white/50 mt-1">You&apos;ll see your delivery details here when assigned to a run.</p>
        </div>
      ) : (
        <div className="flex-1 px-4 py-4 space-y-4">
          {/* Status pipeline */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-1">
              {STATUS_PIPELINE.map((step, i) => {
                const isActive = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={step.id} className="flex-1 text-center">
                    <div className={`h-1.5 rounded-full mb-1.5 ${isActive ? 'bg-green-500' : 'bg-white/10'}`} />
                    <span className={`text-[9px] ${isCurrent ? 'text-green-400 font-bold' : isActive ? 'text-white/60' : 'text-white/20'}`}>
                      {step.icon}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs font-bold text-green-400 mt-2">
              {STATUS_PIPELINE[currentStepIndex]?.label || 'Unknown'}
            </p>
          </div>

          {/* Assignment details */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            {assignment.cargo_description && (
              <div>
                <p className="text-[10px] text-white/40 uppercase">Cargo</p>
                <p className="text-sm font-medium">{assignment.cargo_description}</p>
              </div>
            )}
            {assignment.vehicle_info && (
              <div>
                <p className="text-[10px] text-white/40 uppercase">Vehicle</p>
                <p className="text-sm font-medium">{typeof assignment.vehicle_info === 'string' ? assignment.vehicle_info : JSON.stringify(assignment.vehicle_info)}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-white/40 uppercase">Drop-off</p>
              <p className="text-sm font-medium">{assignment.dropoff_address}</p>
              {assignment.dropoff_contact_name && (
                <p className="text-xs text-white/50">Contact: {assignment.dropoff_contact_name}</p>
              )}
              {assignment.dropoff_notes && (
                <p className="text-xs text-white/40 italic">{assignment.dropoff_notes}</p>
              )}
            </div>

            {/* Navigate button */}
            {assignment.dropoff_lat && assignment.dropoff_lng && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${assignment.dropoff_lat},${assignment.dropoff_lng}`}
                target="_blank" rel="noopener noreferrer"
                className="block w-full py-3 rounded-xl bg-sos-accent-600 text-white font-bold text-sm text-center hover:bg-sos-accent-500 transition-colors">
                🧭 Navigate
              </a>
            )}
          </div>

          {/* Advance status button */}
          {nextStatus && (
            <button onClick={() => updateStatus(nextStatus.id)}
              className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-500 transition-colors">
              {nextStatus.icon} Mark as {nextStatus.label}
            </button>
          )}

          {/* Delivery photo + document upload */}
          {(assignment.status === 'delivered' || assignment.status === 'docs_uploaded') && (
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-bold mb-2">📸 Delivery Photo</p>
                {assignment.delivery_photo_url ? (
                  <img src={assignment.delivery_photo_url} alt="Delivery" className="rounded-lg w-full h-40 object-cover" />
                ) : (
                  <label className="block w-full py-3 rounded-xl border border-dashed border-white/20 text-center text-xs text-white/40 cursor-pointer hover:border-white/40 transition-colors">
                    {uploading ? 'Uploading...' : 'Tap to upload delivery photo'}
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-bold mb-2">📄 Documents</p>
                {(assignment.document_urls || []).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-xs text-sos-accent-400 underline mb-1">
                    Document {i + 1}
                  </a>
                ))}
                <label className="block w-full py-2 rounded-lg border border-dashed border-white/20 text-center text-[10px] text-white/40 cursor-pointer hover:border-white/40 transition-colors mt-2">
                  {uploading ? 'Uploading...' : '+ Upload document'}
                  <input type="file" accept="image/*,.pdf" onChange={handleDocUpload} className="hidden" />
                </label>
              </div>

              {assignment.status === 'delivered' && (
                <button onClick={() => updateStatus('docs_uploaded')}
                  className="w-full py-3 rounded-xl bg-sos-blue-800 text-white font-bold text-sm">
                  ✅ Complete — Docs Uploaded
                </button>
              )}
            </div>
          )}

          {/* Caravan members */}
          {caravanMembers.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs font-bold mb-2">🚐 Caravan ({caravanMembers.length + 1} vehicles)</p>
              <div className="space-y-2">
                {caravanMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">Slot #{m.slot_number}</p>
                      <p className="text-[10px] text-white/40">{m.cargo_description || 'No cargo info'}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      m.status === 'delivered' || m.status === 'docs_uploaded' ? 'bg-green-500/20 text-green-400' :
                      m.status === 'en_route' ? 'bg-sos-accent-500/20 text-sos-accent-400' :
                      'bg-white/10 text-white/40'
                    }`}>
                      {m.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DriverPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#0F1E2B]"><div className="w-8 h-8 border-2 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <DriverContent />
    </Suspense>
  );
}
