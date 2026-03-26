'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { getOrganizations, getOrgOffers, getOrgAffiliations, getOrgTypeColor, Organization } from '@/lib/org-queries';

export default function Organizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgOffers, setOrgOffers] = useState<any[]>([]);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getOrganizations();
      setOrgs(data);
      setLoading(false);
    }
    load();
  }, []);

  async function selectOrg(org: Organization) {
    setSelectedOrg(org);
    const [offers, members] = await Promise.all([
      getOrgOffers(org.id),
      getOrgAffiliations(org.id),
    ]);
    setOrgOffers(offers);
    setOrgMembers(members);
  }

  if (loading) {
    return (
      <DashboardShell title="Organizations" subtitle="Loading...">
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5 h-24 animate-pulse" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Organizations" subtitle={`${orgs.length} partners in the network`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Org List (2 cols) */}
        <div className="col-span-1 md:col-span-2 space-y-3">
          {orgs.map(org => (
            <div
              key={org.id}
              onClick={() => selectOrg(org)}
              className={`bg-[#FDFCFA] rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
                selectedOrg?.id === org.id
                  ? 'border-sos-accent-400 shadow-sm'
                  : 'border-sos-gray-300 hover:border-sos-accent-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-sos-blue-800">{org.name}</h3>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getOrgTypeColor(org.org_type)}`}>
                      {org.org_type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {org.domain && (
                    <p className="text-xs text-sos-gray-500 mt-0.5">{org.domain}</p>
                  )}
                </div>
                {org.trust_score != null && (
                  <div className="text-right">
                    <span className="text-xs text-sos-gray-500">Trust</span>
                    <p className={`text-lg font-bold ${
                      org.trust_score >= 0.7 ? 'text-green-600' :
                      org.trust_score >= 0.5 ? 'text-sos-accent-700' :
                      'text-sos-red-500'
                    }`}>
                      {Math.round(org.trust_score * 100)}
                    </p>
                  </div>
                )}
              </div>

              {/* Capabilities */}
              {org.capabilities && org.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {(org.capabilities as string[]).map((cap: string, i: number) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-sos-gray-200 text-sos-gray-600 capitalize">
                      {cap.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}

              {org.service_area_description && (
                <p className="text-[11px] text-sos-gray-500 mt-2">{org.service_area_description}</p>
              )}
            </div>
          ))}
        </div>

        {/* Detail Panel (1 col) */}
        <div className="space-y-4">
          {selectedOrg ? (
            <>
              {/* Org Detail */}
              <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
                <h3 className="text-sm font-bold text-sos-blue-800 mb-3">{selectedOrg.name}</h3>
                <div className="space-y-2.5">
                  {selectedOrg.website && (
                    <div>
                      <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Website</span>
                      <p className="text-xs text-sos-accent-700">{selectedOrg.website}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Type</span>
                    <p className="text-xs text-sos-blue-800 capitalize">{selectedOrg.org_type?.replace(/_/g, ' ')}</p>
                  </div>
                  {selectedOrg.verified_domain && (
                    <div>
                      <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Verified Domain</span>
                      <p className="text-xs text-green-600">✓ {selectedOrg.verified_domain}</p>
                    </div>
                  )}
                  {selectedOrg.specializations && (selectedOrg.specializations as string[]).length > 0 && (
                    <div>
                      <span className="text-[10px] text-sos-gray-500 uppercase tracking-wider">Specializations</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(selectedOrg.specializations as string[]).map((s: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-sos-accent-50 text-sos-accent-700 capitalize">
                            {s.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Offers */}
              <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
                <h3 className="text-sm font-bold text-sos-blue-800 mb-3">
                  Resources ({orgOffers.length})
                </h3>
                {orgOffers.length > 0 ? (
                  <div className="space-y-2">
                    {orgOffers.slice(0, 8).map((offer: any) => (
                      <div key={offer.id} className="flex items-center justify-between py-1.5 border-b border-sos-gray-200 last:border-0">
                        <span className="text-xs text-sos-blue-800 capitalize">{offer.category?.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-sos-gray-500">
                            {offer.capacity_available} avail
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            offer.status === 'available' ? 'bg-green-50 text-green-600' :
                            offer.status === 'deployed' ? 'bg-sos-accent-50 text-sos-accent-600' :
                            'bg-sos-gray-200 text-sos-gray-500'
                          }`}>
                            {offer.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-sos-gray-500 italic">No offers registered</p>
                )}
              </div>

              {/* Members */}
              <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-5">
                <h3 className="text-sm font-bold text-sos-blue-800 mb-3">
                  Members ({orgMembers.length})
                </h3>
                {orgMembers.length > 0 ? (
                  <div className="space-y-2">
                    {orgMembers.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between py-1.5 border-b border-sos-gray-200 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-sos-blue-800 capitalize">{member.role}</span>
                          {member.phone_verified && (
                            <span className="text-[9px] text-green-500">📱✓</span>
                          )}
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                          member.status === 'active' ? 'bg-green-50 text-green-600' :
                          member.status === 'invited' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-sos-gray-200 text-sos-gray-500'
                        }`}>
                          {member.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-sos-gray-500 italic">No members yet</p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-[#FDFCFA] rounded-xl border border-sos-gray-300 p-8 text-center">
              <p className="text-xs text-sos-gray-500">Select an organization to view details</p>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
