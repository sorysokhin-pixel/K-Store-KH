export interface CustomCategory {
  id: string;
  name: string;
  nameKh: string;
  icon?: string;
}

export const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'featured', name: 'Featured Games', nameKh: 'ពេញនិយម (Featured)', icon: '🔥' },
  { id: 'all', name: 'All Games', nameKh: 'ហ្គេមទាំងអស់', icon: '🎮' },
  { id: 'panel', name: 'Panel / Mod', nameKh: 'ផែននែល (Panel)', icon: '⚡' },
  { id: 'robux', name: 'Robux', nameKh: 'Robux', icon: '💎' },
];

const CAT_STORAGE_KEY = 'kstore_custom_categories';

export function getStoredCategories(): CustomCategory[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem(CAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map<string, CustomCategory>();
        DEFAULT_CATEGORIES.forEach((c) => map.set(c.id.toLowerCase(), c));
        parsed.forEach((c: CustomCategory) => {
          if (c && c.id) map.set(c.id.toLowerCase(), c);
        });
        return Array.from(map.values());
      }
    }
  } catch (_) {}
  return DEFAULT_CATEGORIES;
}

export function saveStoredCategories(categories: CustomCategory[]): CustomCategory[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(categories));
    } catch (_) {}
  }
  return categories;
}

export function addStoredCategory(newCat: CustomCategory): CustomCategory[] {
  const current = getStoredCategories();
  const normalizedId = newCat.id.toLowerCase().trim();
  const exists = current.some((c) => c.id.toLowerCase().trim() === normalizedId);
  const updated = exists
    ? current.map((c) => (c.id.toLowerCase().trim() === normalizedId ? { ...c, ...newCat, id: normalizedId } : c))
    : [...current, { ...newCat, id: normalizedId }];
  return saveStoredCategories(updated);
}

export function deleteStoredCategory(catId: string): CustomCategory[] {
  const current = getStoredCategories();
  const normalizedId = catId.toLowerCase().trim();
  if (normalizedId === 'featured' || normalizedId === 'all') return current;
  const updated = current.filter((c) => c.id.toLowerCase().trim() !== normalizedId);
  return saveStoredCategories(updated);
}
