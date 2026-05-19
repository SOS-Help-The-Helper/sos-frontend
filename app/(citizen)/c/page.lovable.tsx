'use client';

import { CitizenShell } from '@/components/citizen-shell';
import { programs } from '@/lib/prototype-data';
import { Search, MapPin } from 'lucide-react';

const tags = ['Housing', 'Food', 'Childcare', 'Medical', 'Repair'];

export default function CitizenMapLovable() {
  return (
    <CitizenShell>
      <div className="px-4 pt-4">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-3 text-white/40" />
          <input
            placeholder="What do you need?"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/8 text-[14px] placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40"
          />
        </div>
        <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide">
          {tags.map((t) => (
            <button key={t} className="shrink-0 px-3 h-7 rounded-full bg-white/6 hover:bg-white/12 text-[12px] font-medium">
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 aspect-square relative overflow-hidden">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              <pattern id="cgrid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="400" height="400" fill="url(#cgrid)" />
            {/* You-are-here */}
            <circle cx="200" cy="200" r="8" fill="#89CFF0" stroke="#0F1E2B" strokeWidth="3" />
            <circle cx="200" cy="200" r="40" fill="#89CFF0" opacity="0.12" />
            {/* Resource pins */}
            {[
              { x: 140, y: 130, c: '#F5EBD6' },
              { x: 280, y: 170, c: '#EF4E4B' },
              { x: 250, y: 280, c: '#34D399' },
              { x: 110, y: 260, c: '#89CFF0' },
              { x: 320, y: 320, c: '#F5EBD6' },
            ].map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="7" fill={p.c} stroke="#0F1E2B" strokeWidth="2" />
                <circle cx={p.x} cy={p.y} r="14" fill={p.c} opacity="0.25" />
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="px-4 mt-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-3">Nearby · 5 resources</p>
        <div className="space-y-2">
          {programs.slice(0, 4).map((p) => (
            <div key={p.id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-semibold text-[12px]" style={{ background: `${p.color}26`, color: p.color }}>
                  {p.org.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/50">{p.taxonomy}</p>
                  <p className="font-medium text-[14px] mt-0.5">{p.title}</p>
                  <p className="text-[12px] text-white/55 mt-1 line-clamp-2">{p.blurb}</p>
                  <div className="flex items-center gap-3 mt-2 font-mono text-[10px] text-white/45">
                    <span className="flex items-center gap-1"><MapPin size={10} /> {p.org}</span>
                    <span>· responds in {p.responseHrs}h</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CitizenShell>
  );
}
