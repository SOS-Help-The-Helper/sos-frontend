// TODO(Phase3-5): migrate supabase.from() calls below to lib/api.ts EF calls
/**
 * Map views CRUD — org-scoped saved map tabs.
 * Each partner can save custom map views with viewport, layers, pins.
 */

import { supabase } from '@/lib/supabase-client';
import type { FilterConfig } from '@/lib/filter-engine';

export interface MapView {
  id: string;
  org_id: string;
  name: string;
  disaster_id: string | null;
  config: Record<string, any>;
  center_lat: number;
  center_lng: number;
  zoom: number;
  layers: string[];
  pins: Array<{ lat: number; lng: number; label: string; color?: string }>;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function getMapViews(orgId: string): Promise<MapView[]> {
  const { data } = await supabase
    .from('map_views')
    .select('*')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: true });
  return data || [];
}

export async function createMapView(
  view: Partial<MapView>,
  filterConfig?: FilterConfig,
): Promise<MapView | null> {
  const config = { ...(view.config || {}), ...(filterConfig ? { filterConfig } : {}) };

  const { data, error } = await supabase
    .from('map_views')
    .insert({
      org_id: view.org_id,
      name: view.name || 'New View',
      disaster_id: view.disaster_id || null,
      config,
      center_lat: view.center_lat || 0,
      center_lng: view.center_lng || 0,
      zoom: view.zoom || 4,
      layers: view.layers || ['all'],
      pins: view.pins || [],
      is_default: view.is_default || false,
      sort_order: view.sort_order || 99,
    })
    .select()
    .single();

  if (error) { console.error('[map-views] Create error:', error); return null; }
  return data;
}

export async function updateMapView(id: string, updates: Partial<MapView>): Promise<boolean> {
  const { error } = await supabase
    .from('map_views')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

/** Patch only the filterConfig inside the config JSONB column. */
export async function updateMapViewFilters(
  viewId: string,
  filterConfig: FilterConfig,
): Promise<boolean> {
  // Read current config so we merge rather than overwrite other keys
  const { data: existing } = await supabase
    .from('map_views')
    .select('config')
    .eq('id', viewId)
    .single();

  const merged = { ...(existing?.config || {}), filterConfig };
  const { error } = await supabase
    .from('map_views')
    .update({ config: merged, updated_at: new Date().toISOString() })
    .eq('id', viewId);

  if (error) { console.error('[map-views] Filter update error:', error); return false; }
  return true;
}

export async function deleteMapView(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('map_views')
    .delete()
    .eq('id', id);
  return !error;
}

export async function reorderMapViews(views: { id: string; sort_order: number }[]): Promise<boolean> {
  // Update each view's sort_order
  const updates = views.map(v =>
    supabase.from('map_views').update({ sort_order: v.sort_order }).eq('id', v.id)
  );
  const results = await Promise.all(updates);
  return results.every(r => !r.error);
}
