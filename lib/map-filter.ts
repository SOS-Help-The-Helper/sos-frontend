/**
 * Map layer filtering from agent conversation.
 * When agent searches for a category, non-matching points are hidden.
 * When search clears, all points are restored.
 */

// Category keyword → GeoJSON filter value mapping
const CATEGORY_ALIASES: Record<string, string[]> = {
  food: ['food', 'food_water', 'food_service', 'meal'],
  shelter: ['shelter', 'housing', 'transport_housing', 'emergency_shelter'],
  medical: ['medical', 'health', 'first_aid'],
  transport: ['transportation', 'transport', 'transport_housing'],
  utilities: ['utilities', 'power', 'generator', 'water'],
  supplies: ['supplies', 'supply_warehouse', 'cleaning', 'tools'],
  safety: ['safety', 'rescue', 'evacuation'],
};

export function applyMapCategoryFilter(map: any, keyword: string) {
  if (!map) return;

  const lower = keyword.toLowerCase();

  // Find matching categories
  let matchingCategories: string[] = [];
  for (const [key, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(key) || aliases.some(a => lower.includes(a))) {
      matchingCategories = aliases;
      break;
    }
  }

  // If no match found, try using the keyword directly
  if (matchingCategories.length === 0) {
    matchingCategories = [lower];
  }

  // Apply filter to resources layer (individual points only — clusters stay visible)
  try {
    const filter: any = ['any',
      ...matchingCategories.map(cat => ['==', ['get', 'category'], cat])
    ];

    if (map.getLayer('resources-points')) {
      map.setFilter('resources-points', ['all', ['!', ['has', 'point_count']], filter]);
    }
    if (map.getLayer('requests-points')) {
      map.setFilter('requests-points', ['all', ['!', ['has', 'point_count']], filter]);
    }
  } catch { /* layer may not exist yet */ }
}

export function clearMapCategoryFilter(map: any) {
  if (!map) return;
  try {
    if (map.getLayer('resources-points')) {
      map.setFilter('resources-points', ['!', ['has', 'point_count']]);
    }
    if (map.getLayer('requests-points')) {
      map.setFilter('requests-points', ['!', ['has', 'point_count']]);
    }
  } catch {}
}
