'use client';

import { useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Home, Truck, Car } from 'lucide-react';

export type Persona = 'survivor' | 'donor' | 'driver';

const ALL_PERSONAS: Persona[] = ['survivor', 'donor', 'driver'];

const PERSONA_CONFIG: { id: Persona; label: string; shortLabel: string; Icon: typeof Home }[] = [
  { id: 'survivor', label: 'Survivors', shortLabel: 'SOS', Icon: Home },
  { id: 'donor', label: 'Donors', shortLabel: 'RV', Icon: Truck },
  { id: 'driver', label: 'Drivers', shortLabel: 'Drv', Icon: Car },
];

function parsePersonaParam(param: string | null): Persona[] {
  if (!param) return ALL_PERSONAS;
  const parsed = param.split(',').filter((p): p is Persona =>
    ALL_PERSONAS.includes(p as Persona)
  );
  return parsed.length > 0 ? parsed : ALL_PERSONAS;
}

/**
 * Hook to read/write persona selection from URL search params.
 * Requires a Suspense boundary above the calling component.
 */
export function usePersonas(): [Persona[], (selected: Persona[]) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const personas = parsePersonaParam(searchParams.get('persona'));

  const setPersonas = useCallback((selected: Persona[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selected.length === ALL_PERSONAS.length) {
      params.delete('persona');
    } else {
      params.set('persona', selected.join(','));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  return [personas, setPersonas];
}

interface PersonaToggleProps {
  selectedPersonas: Persona[];
  onPersonaChange: (selected: Persona[]) => void;
}

export function PersonaToggle({ selectedPersonas, onPersonaChange }: PersonaToggleProps) {
  const handleToggle = useCallback((persona: Persona) => {
    const isSelected = selectedPersonas.includes(persona);
    if (isSelected && selectedPersonas.length === 1) return; // keep at least one
    const next = isSelected
      ? selectedPersonas.filter(p => p !== persona)
      : [...selectedPersonas, persona];
    onPersonaChange(next);
  }, [selectedPersonas, onPersonaChange]);

  return (
    <div className="flex rounded-xl border-2 border-sos-gray-300/80 bg-[#FDFCFA] p-1 dark:bg-slate-800 dark:border-slate-600">
      {PERSONA_CONFIG.map(({ id, label, shortLabel, Icon }) => {
        const active = selectedPersonas.includes(id);
        return (
          <button
            key={id}
            onClick={() => handleToggle(id)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              active
                ? 'bg-sos-blue-800 text-white dark:bg-sos-accent-600'
                : 'text-sos-gray-600 hover:text-sos-blue-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
