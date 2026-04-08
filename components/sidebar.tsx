'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { getPortalConfig } from '@/lib/portal-config';
import { useNotifications } from '@/lib/notification-context';
import {
  MessageSquare,
  Map,
  GitCompare,
  ClipboardList,
  BarChart3,
  Building2,
  Settings,
  Shield,
  Eye,
  Briefcase,
  Wrench,
  DollarSign,
  Truck,
  Warehouse,
  ListOrdered,
} from 'lucide-react';

const allNavItems = [
  { path: '/agent', label: 'Agent', icon: MessageSquare, adminOnly: false, vendorOnly: false },
  { path: '/map', label: 'Map', icon: Map, adminOnly: false, vendorOnly: false },
  { path: '/matching', label: 'Matches', icon: GitCompare, adminOnly: false, vendorOnly: false },
  { path: '/fleet', label: 'Fleet', icon: Warehouse, adminOnly: false, vendorOnly: false, logisticsOnly: true },
  { path: '/queue', label: 'Queue', icon: ListOrdered, adminOnly: false, vendorOnly: false, logisticsOnly: true },
  { path: '/drivers', label: 'Drivers', icon: Truck, adminOnly: false, vendorOnly: false, logisticsOnly: true },
  { path: '/management', label: 'Management', icon: ClipboardList, adminOnly: false, vendorOnly: false },
  { path: '/reporting', label: 'Reports', icon: BarChart3, adminOnly: false, vendorOnly: false },
  { path: '/runs', label: 'Delivery Runs', icon: Truck, adminOnly: false, vendorOnly: false, logisticsOnly: true },
  { path: '/jobs', label: 'Job Queue', icon: Briefcase, adminOnly: false, vendorOnly: true },
  { path: '/capabilities', label: 'Capabilities', icon: Wrench, adminOnly: false, vendorOnly: true },
  { path: '/revenue', label: 'Revenue', icon: DollarSign, adminOnly: false, vendorOnly: true },
  { path: '/view', label: 'View As', icon: Eye, adminOnly: true, vendorOnly: false },
  { path: '/organizations', label: 'Network', icon: Building2, adminOnly: false, vendorOnly: false, networkOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings, adminOnly: true, vendorOnly: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { orgName, orgType, isAdmin, isPartner, loading } = useAuthContext();
  const { effectiveOrgType } = useViewContext();
  const { unreadCount } = useNotifications();
  const portalConfig = getPortalConfig(effectiveOrgType);

  const LABEL_MAP: Record<string, keyof typeof portalConfig.labels> = {
    '/': 'agent',
    '/map': 'map',
    '/matching': 'matching',
    '/management': 'management',
    '/reporting': 'reporting',
  };

  const isVendor = effectiveOrgType === 'vendor';
  const isLogistics = effectiveOrgType === 'transport_housing';
  const hasNetworkView = portalConfig.features.networkView;
  // When viewing as a specific org, use that org's nav — don't show admin-only items
  const showAdminItems = isAdmin && effectiveOrgType === 'admin';
  const navItems = allNavItems
    .filter(item => (showAdminItems || !item.adminOnly) && (!item.vendorOnly || isVendor || showAdminItems) && (!(item as any).logisticsOnly || isLogistics || showAdminItems) && (!(item as any).networkOnly || hasNetworkView || showAdminItems))
    .map(item => {
      const configKey = LABEL_MAP[item.path];
      if (configKey && portalConfig.labels[configKey]) {
        return { ...item, label: portalConfig.labels[configKey] };
      }
      return item;
    });

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 flex flex-col bg-sos-blue-800 z-50">
      <div className="p-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logomark.svg" alt="SOS" className="h-8 w-8" />
          <div>
            <h1 className="text-white text-base font-bold tracking-tight leading-none">SOS</h1>
            <p className="text-sos-accent-500 text-[10px] font-medium tracking-wide mt-0.5">CONNECT</p>
          </div>
        </Link>
      </div>

      {!loading && (isAdmin || isPartner) && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10">
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-sos-red-400" />
              <div>
                <p className="text-[10px] font-semibold text-white">Admin</p>
                <p className="text-[9px] text-white/40">All organizations</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-semibold text-white">{orgName}</p>
              <p className="text-[9px] text-white/40 capitalize">{orgType?.replace(/_/g, ' ')}</p>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-sos-red-500 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              {item.label}
              {item.path === '/matching' && unreadCount > 0 && (
                <span className="ml-auto bg-sos-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-[10px] text-white/30 font-medium">Everyone Is a Helper</p>
      </div>
    </aside>
  );
}
