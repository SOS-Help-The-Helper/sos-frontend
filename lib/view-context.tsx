'use client';

import { createContext, useContext, useState } from 'react';

interface ViewContext {
  currentView: string;
  setCurrentView: (view: string) => void;
  effectiveOrgId: string | null;
  effectiveAgentId: string;
}

const VIEW_AGENT_MAP: Record<string, string> = {
  'admin': 'sos-platform',
  'citizen': 'sos-citizen',
  '43299807-6229-49be-9a6b-0498c9188178': 'sos-aid-arena',
  'da86c92f-d52d-4b13-a474-30e1be8fb808': 'sos-erv',
  '9d894368-51af-4cf7-9318-444a3c216f5d': 'sos-fhm',
  'c1e74116-5e12-410a-9b21-dc80c7646d77': 'sos-partner',
};

const ViewCtx = createContext<ViewContext>({
  currentView: 'admin',
  setCurrentView: () => {},
  effectiveOrgId: null,
  effectiveAgentId: 'sos-platform',
});

export function useViewContext() {
  return useContext(ViewCtx);
}

export function ViewProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState('admin');

  const effectiveOrgId = currentView === 'admin' || currentView === 'citizen' ? null : currentView;
  const effectiveAgentId = VIEW_AGENT_MAP[currentView] || 'sos-citizen';

  return (
    <ViewCtx.Provider value={{ currentView, setCurrentView, effectiveOrgId, effectiveAgentId }}>
      {children}
    </ViewCtx.Provider>
  );
}
