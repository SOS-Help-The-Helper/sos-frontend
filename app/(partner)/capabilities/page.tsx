'use client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { getVendorProfile, updateVendorProfile, type VendorProfile } from '@/lib/vendor-enhanced-queries';

const SERVICE_CATEGORIES = [
  { id: 'roofing', icon: '🏠', label: 'Roofing' },
  { id: 'debris_removal', icon: '🧹', label: 'Debris Removal' },
  { id: 'tree_service', icon: '🌳', label: 'Tree Service' },
  { id: 'plumbing', icon: '🔧', label: 'Plumbing' },
  { id: 'electrical', icon: '⚡', label: 'Electrical' },
  { id: 'generator_install', icon: '🔋', label: 'Generator Install' },
  { id: 'mold_remediation', icon: '🧪', label: 'Mold Remediation' },
  { id: 'hvac', icon: '❄️', label: 'HVAC' },
  { id: 'fencing', icon: '🏗️', label: 'Fencing' },
  { id: 'painting', icon: '🎨', label: 'Painting' },
  { id: 'flooring', icon: '🪵', label: 'Flooring' },
  { id: 'general_labor', icon: '💪', label: 'General Labor' },
];

export default function CapabilitiesPage() {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Editable state
  const [categories, setCategories] = useState<string[]>([]);
  const [coverageRadius, setCoverageRadius] = useState(15);
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  const { orgId } = useAuthContext();
  const { effectiveOrgId } = useViewContext();
  const currentOrgId = effectiveOrgId || orgId;

  useEffect(() => {
    if (!currentOrgId) return;
    getVendorProfile(currentOrgId).then(p => {
      setProfile(p);
      if (p) {
        setCategories(p.service_categories || []);
        setCoverageRadius(p.coverage_radius_km ? Math.round(p.coverage_radius_km / 1.60934) : 15);
        setMinBudget(p.min_budget ? String(p.min_budget) : '');
        setMaxBudget(p.max_budget ? String(p.max_budget) : '');
      }
      setLoading(false);
    });
  }, [currentOrgId]);

  function toggleCategory(id: string) {
    setCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  async function handleSave() {
    if (!currentOrgId) return;
    setSaving(true);
    await updateVendorProfile(currentOrgId, {
      service_categories: categories,
      capabilities: categories,
      coverage_radius_km: Math.round(coverageRadius * 1.60934),
      min_budget: minBudget ? parseFloat(minBudget) : null,
      max_budget: maxBudget ? parseFloat(maxBudget) : null,
    } as any);
    setEditMode(false);
    setSaving(false);
    // Refresh profile
    const updated = await getVendorProfile(currentOrgId);
    setProfile(updated);
  }

  return (
    <DashboardShell title="Capabilities" subtitle="Your service profile and coverage">
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-sos-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-sos-blue-800">{profile?.name || 'Your Organization'}</h2>
              {profile?.trust_score != null && (
                <p className="text-xs text-sos-gray-500">Trust Score: <span className="font-bold text-sos-blue-800">{Math.round(profile.trust_score * 100)}%</span></p>
              )}
            </div>
            <button
              onClick={() => editMode ? handleSave() : setEditMode(true)}
              disabled={saving}
              className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
                editMode ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-sos-blue-800 text-white hover:bg-sos-blue-700'
              } disabled:opacity-40`}
            >
              {saving ? 'Saving...' : editMode ? '✓ Save Changes' : '✏️ Edit Profile'}
            </button>
          </div>

          {/* Service Categories */}
          <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
            <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Service Categories</h3>
            {editMode ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SERVICE_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-colors ${
                      categories.includes(cat.id) ? 'border-green-400 bg-green-50' : 'border-sos-gray-300 hover:border-sos-gray-400'
                    }`}>
                    <span>{cat.icon}</span>
                    <span className="text-xs font-medium text-sos-blue-800">{cat.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.length > 0 ? categories.map(c => {
                  const cat = SERVICE_CATEGORIES.find(sc => sc.id === c);
                  return <span key={c} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-medium">{cat?.icon} {cat?.label || c}</span>;
                }) : <p className="text-sm text-sos-gray-400">No categories set</p>}
              </div>
            )}
          </div>

          {/* Coverage & Budget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
              <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Coverage Area</h3>
              {editMode ? (
                <div>
                  <label className="text-xs text-sos-gray-600">Radius: {coverageRadius} miles</label>
                  <input type="range" min={1} max={100} value={coverageRadius} onChange={e => setCoverageRadius(Number(e.target.value))} className="w-full mt-1" />
                  <div className="flex justify-between text-[10px] text-sos-gray-400"><span>1 mi</span><span>50 mi</span><span>100 mi</span></div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-sos-accent-50 flex items-center justify-center">
                    <span className="text-xl">📍</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-sos-blue-800">{coverageRadius} mi</p>
                    <p className="text-[10px] text-sos-gray-500">Service radius</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-sos-gray-300 p-5">
              <h3 className="text-sm font-bold text-sos-blue-800 mb-3">Budget Range</h3>
              {editMode ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-sos-gray-600">Min ($)</label>
                    <input type="number" value={minBudget} onChange={e => setMinBudget(e.target.value)} placeholder="500"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                  </div>
                  <div>
                    <label className="text-xs text-sos-gray-600">Max ($)</label>
                    <input type="number" value={maxBudget} onChange={e => setMaxBudget(e.target.value)} placeholder="50000"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-sos-gray-300 text-sm text-sos-blue-800 focus:outline-none focus:border-sos-accent-400" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                    <span className="text-xl">💰</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-sos-blue-800">
                      {minBudget && maxBudget ? `$${Number(minBudget).toLocaleString()} — $${Number(maxBudget).toLocaleString()}` :
                       minBudget ? `$${Number(minBudget).toLocaleString()}+` :
                       maxBudget ? `Up to $${Number(maxBudget).toLocaleString()}` : 'Not set'}
                    </p>
                    <p className="text-[10px] text-sos-gray-500">Job budget range</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
