export interface CustomCategory {
  id: string;
  name: string;
  nameKh: string;
  icon?: string;
}

export const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'featured', name: 'Featured Games', nameKh: 'ពេញនិយម (Featured)', icon: '🔥' },
  { id: 'all', name: 'All Games', nameKh: 'ហ្គេមទាំងអស់', icon: '🎮' },
];

const CAT_STORAGE_KEY = 'kstore_custom_categories';

export function getStoredCategories(): CustomCategory[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem(CAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.filter((c: any) => c.id !== 'panel' && c.id !== 'robux');
        if (cleaned.length >= 2) return cleaned;
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
  const exists = current.some((c) => c.id === newCat.id);
  const updated = exists ? current.map((c) => (c.id === newCat.id ? newCat : c)) : [...current, newCat];
  return saveStoredCategories(updated);
}

export function deleteStoredCategory(catId: string): CustomCategory[] {
  const current = getStoredCategories();
  // Prevent deleting default core categories
  if (catId === 'featured' || catId === 'all') return current;
  const updated = current.filter((c) => c.id !== catId);
  return saveStoredCategories(updated);
}
