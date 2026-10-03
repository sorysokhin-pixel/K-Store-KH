import {
  GameItem,
  GamePackage,
  KhmerTopupGame,
  KhmerTopupSettings,
} from '../types';

export const DEFAULT_KHMER_TOPUP_SETTINGS: KhmerTopupSettings = {
  apiKey: '',
  baseUrl: 'https://khmer-topup.com/api/v1',
  autoSync: true,
  syncIntervalMinutes: 30,
  profitPercentage: 5,
};

const STORAGE_KEY = 'kstore_khmertopup_config';

export function getStoredKhmerTopupSettings(): KhmerTopupSettings {
  if (typeof window === 'undefined') return DEFAULT_KHMER_TOPUP_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_KHMER_TOPUP_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load KhmerTopup settings:', e);
  }
  return DEFAULT_KHMER_TOPUP_SETTINGS;
}

export function saveStoredKhmerTopupSettings(
  partial: Partial<KhmerTopupSettings>
): KhmerTopupSettings {
  const current = getStoredKhmerTopupSettings();
  const updated = { ...current, ...partial };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save KhmerTopup settings:', e);
    }
  }
  return updated;
}

// Curated game assets database with official Khmer-TopUp images, flags, and titles
export const GAME_ASSETS_MAP: Record<
  string,
  {
    coverImage: string;
    icon: string;
    titleKh: string;
    category: GameItem['category'];
    badge: string;
    priority: number;
    countryFlag?: string;
  }
> = {
  'freefire-sgmy': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/free-fire-real.webp',
    icon: '🔥',
    titleKh: 'Free Fire',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/kh.svg?f=2',
    priority: 1,
  },
  'free-fire': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/free-fire-real.webp',
    icon: '🔥',
    titleKh: 'Free Fire',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/kh.svg?f=2',
    priority: 1,
  },
  'freefire': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/free-fire-real.webp',
    icon: '🔥',
    titleKh: 'Free Fire',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/kh.svg?f=2',
    priority: 1,
  },
  'mobile-legends': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/mobile-legends-real.webp',
    icon: '⚔️',
    titleKh: 'Mobile Legends Cambodia',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/kh.svg?f=2',
    priority: 2,
  },
  'mlbb': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/mobile-legends-real.webp',
    icon: '⚔️',
    titleKh: 'Mobile Legends Cambodia',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/kh.svg?f=2',
    priority: 2,
  },
  'telegram': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/telegram-0d8b2c.webp',
    icon: '✈️',
    titleKh: 'Telegram',
    category: 'featured',
    badge: 'POPULAR',
    priority: 3,
  },
  'mobile-legends-exclusive': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/mobile-legends-exclusive-e26b73bc.webp',
    icon: '⚔️',
    titleKh: 'Mobile Legends Exclusive Cambodia',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/kh.svg?f=2',
    priority: 4,
  },
  'mobile-legends-special': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/mobile-legends-real.webp',
    icon: '⚔️',
    titleKh: 'Mobile Legends Special',
    category: 'featured',
    badge: 'POPULAR',
    priority: 5,
  },
  'freefire-indonesia': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/free-fire-real.webp',
    icon: '🔥',
    titleKh: 'Freefire Indonesia',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/id.svg?f=2',
    priority: 6,
  },
  'honor-of-kings': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/honor-of-kings-real.webp',
    icon: '👑',
    titleKh: 'Honor of Kings',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/tw.svg?f=2',
    priority: 7,
  },
  'freefire-taiwan': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/free-fire-real.webp',
    icon: '🔥',
    titleKh: 'Freefire Taiwan',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/tw.svg?f=2',
    priority: 8,
  },
  'freefire-vietnam': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/free-fire-real.webp',
    icon: '🔥',
    titleKh: 'Freefire Vietnam',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/vn.svg?f=2',
    priority: 9,
  },
  'pubg-mobile': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/pubg-mobile-real.webp',
    icon: '🎯',
    titleKh: 'PUBG Mobile Global',
    category: 'featured',
    badge: 'POPULAR',
    priority: 10,
  },
  'pubg': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/pubg-mobile-real.webp',
    icon: '🎯',
    titleKh: 'PUBG Mobile Global',
    category: 'featured',
    badge: 'POPULAR',
    priority: 10,
  },
  'eafc-mobile-cambodia': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/eafc-mobile-cambodia-8be68c.webp',
    icon: '⚽',
    titleKh: 'EA Sports FC Mobile',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/kh.svg?f=2',
    priority: 11,
  },
  'eafc-mobile': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/eafc-mobile-cambodia-8be68c.webp',
    icon: '⚽',
    titleKh: 'EA Sports FC Mobile',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/kh.svg?f=2',
    priority: 11,
  },
  'magic-chess-gogo': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/magic-chess-gogo-real.webp',
    icon: '♟️',
    titleKh: 'Magic Chess GoGo',
    category: 'featured',
    badge: 'POPULAR',
    priority: 12,
  },
  'blood-strike': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/blood-strike-real.webp',
    icon: '🩸',
    titleKh: 'Blood Strike',
    category: 'featured',
    badge: 'POPULAR',
    priority: 13,
  },
  '8-ball-pool': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/8-ball-pool-ee52e7.webp',
    icon: '🎱',
    titleKh: '8 Ball Pool Miniclip',
    category: 'featured',
    badge: 'POPULAR',
    priority: 14,
  },
  'arena-breakout': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/arena-breakout-dfc4b0.webp',
    icon: '💥',
    titleKh: 'Arena Breakout',
    category: 'featured',
    badge: 'POPULAR',
    priority: 15,
  },
  'wild-rift-cambodia': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/wild-rift-cambodia-44c6db.webp',
    icon: '🛡️',
    titleKh: 'Wild Rift Cambodia',
    category: 'featured',
    badge: 'POPULAR',
    countryFlag: 'https://khmer-topup.com/static/flags/kh.svg?f=2',
    priority: 16,
  },
  'racing-master-sea': {
    coverImage: 'https://khmer-topup.com/static/uploads/games/racing-master-sea-9d951a.webp',
    icon: '🏎️',
    titleKh: 'Racing Master SEA',
    category: 'featured',
    badge: 'POPULAR',
    priority: 17,
  },
  'roblox': {
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    icon: '🧱',
    titleKh: 'Roblox Robux Instant',
    category: 'robux',
    badge: 'Robux 1s',
    priority: 18,
  },
  'age-of-empire-mobile': {
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    icon: '🏰',
    titleKh: 'Age of Empire Mobile',
    category: 'featured',
    badge: 'Empire Coins',
    priority: 19,
  },
  'age-of-empires': {
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    icon: '🏰',
    titleKh: 'Age of Empire Mobile',
    category: 'featured',
    badge: 'Empire Coins',
    priority: 19,
  },
  'genshin-impact': {
    coverImage: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80',
    icon: '✨',
    titleKh: 'Genshin Impact Genesis',
    category: 'featured',
    badge: 'Crystals',
    priority: 20,
  },
};

// Fallback game posters
const FALLBACK_COVERS = [
  'https://khmer-topup.com/static/uploads/games/free-fire-real.webp',
  'https://khmer-topup.com/static/uploads/games/mobile-legends-real.webp',
  'https://khmer-topup.com/static/uploads/games/pubg-mobile-real.webp',
  'https://khmer-topup.com/static/uploads/games/honor-of-kings-real.webp',
  'https://khmer-topup.com/static/uploads/games/eafc-mobile-cambodia-8be68c.webp',
];

export function getCanonicalGameId(slug: string): string {
  const s = (slug || '').toLowerCase().trim();
  if (s === 'mobile-legends' || s === 'mlbb') return 'mlbb';
  if (s === 'free-fire' || s === 'freefire') return 'freefire';
  if (s === 'pubg-mobile' || s === 'pubg') return 'pubg';
  if (s === '8-ball-pool') return '8-ball-pool';
  if (s === 'arena-breakout') return 'arena-breakout';
  if (s === 'age-of-empires' || s === 'age-of-empires-mobile') return 'age-of-empires';
  if (s === 'honor-of-kings' || s === 'hok') return 'honor-of-kings';
  if (s === 'roblox') return 'roblox';
  if (s === 'genshin-impact' || s === 'genshin') return 'genshin-impact';
  return `kt-${s}`;
}

/**
 * Transforms games from Khmer-TopUp API or scraper into our GameItem[] representation
 * Automatically applies Admin's Reseller Profit Margin (%)
 */
export function convertKhmerTopupToGameItems(
  khmerGames: any[],
  customProfitMargin?: number
): GameItem[] {
  const currentSettings = getStoredKhmerTopupSettings();
  const margin =
    customProfitMargin !== undefined
      ? Number(customProfitMargin) || 0
      : (Number(currentSettings.profitPercentage) || 0);

  const validGames = (khmerGames || []).filter((g) => g && (g.slug || g.name || g.title || g.id));

  const converted: GameItem[] = validGames.map((kg, index) => {
    const rawSlug = (kg.externalSlug || kg.slug || kg.id || '').toLowerCase().trim();
    const slugKey = rawSlug.replace(/^kt-/, '');

    // Look for real image provided by the API/scraper:
    const rawApiImage =
      kg.coverImage ||
      kg.image ||
      kg.cover ||
      kg.icon ||
      kg.thumbnail ||
      kg.banner ||
      kg.logo ||
      kg.img ||
      kg.image_url;

    let finalImage = '';
    if (rawApiImage && typeof rawApiImage === 'string' && rawApiImage.trim()) {
      if (rawApiImage.startsWith('http://') || rawApiImage.startsWith('https://')) {
        finalImage = rawApiImage;
      } else {
        const cleanPath = rawApiImage.startsWith('/') ? rawApiImage : `/${rawApiImage}`;
        finalImage = `https://khmer-topup.com${cleanPath}`;
      }
    }

    const asset = GAME_ASSETS_MAP[slugKey] || GAME_ASSETS_MAP[kg.id] || {
      coverImage: finalImage || FALLBACK_COVERS[index % FALLBACK_COVERS.length],
      icon: '🎮',
      titleKh: kg.titleKh || kg.title || kg.name,
      category: 'all' as const,
      badge: 'POPULAR',
      priority: 99 + index,
    };

    if (!finalImage) {
      finalImage = asset.coverImage;
    }

    // Parse packages directly from live API or scraper
    const rawPackages = kg.packages || kg.denominations || kg.items || [];
    const packages: GamePackage[] = rawPackages.map((pkg: any, pIdx: number) => {
      const pkgId = pkg.externalPackageId || pkg.package_id || pkg.id || pIdx + 1;
      const pkgName = pkg.name || pkg.title || `${pkg.amount || ''} Units`;
      const baseCost = Number(pkg.priceUsd !== undefined ? pkg.priceUsd : (pkg.price !== undefined ? pkg.price : (pkg.amount || 0)));
      
      // Calculate Resale Selling Price with profit margin markup
      const finalPrice = margin > 0
        ? Math.round(baseCost * (1 + margin / 100) * 100) / 100
        : baseCost;

      const isBestSeller = Boolean(
        pkg.popular ||
        pkg.bonus === 'BEST SELLER' ||
        pkg.badge === 'BEST SELLER' ||
        String(pkg.tag || '').toLowerCase().includes('best') ||
        String(pkg.tag || '').toLowerCase().includes('popular')
      );

      return {
        id: pkg.id ? String(pkg.id) : `pkg-${slugKey}-${pkgId}`,
        name: pkgName,
        nameKh: pkg.nameKh || pkgName,
        amount: pkg.amount || pkgName,
        priceUsd: finalPrice,
        originalPriceUsd: baseCost,
        popular: isBestSeller,
        bonus: isBestSeller ? 'BEST SELLER' : pkg.bonus || pkg.tag || undefined,
        stock: pkg.stock ?? 9999,
        externalPackageId: typeof pkgId === 'number' ? pkgId : parseInt(String(pkgId).replace(/[^0-9]/g, ''), 10) || undefined,
      };
    });

    const isFeatured = kg.category === 'featured' || (asset.priority && asset.priority <= 15) || index < 12;
    const finalFlag = kg.countryFlag || asset.countryFlag;

    return {
      id: kg.id || slugKey,
      title: kg.title || kg.name || slugKey,
      titleKh: kg.titleKh || asset.titleKh || kg.title || kg.name || slugKey,
      category: (kg.category as any) || (isFeatured ? 'featured' : (asset.category || 'all')),
      badge: kg.badge || asset.badge || (isFeatured ? 'POPULAR' : 'TOPUP'),
      badgeKh: kg.badgeKh || asset.badge || (isFeatured ? 'POPULAR' : 'TOPUP'),
      badgeType: 'vip' as const,
      countryFlag: finalFlag,
      icon: kg.icon || asset.icon || '🎮',
      coverImage: finalImage,
      needsZoneId: Boolean(kg.needsZoneId || kg.server_label),
      zonePlaceholder: kg.zonePlaceholder || kg.server_label || (kg.needsZoneId ? 'Zone ID / Server ID' : undefined),
      packages: packages.length > 0 ? packages : [
        { id: `pkg-${slugKey}-1`, name: 'Standard Package', nameKh: 'កញ្ចប់ស្តង់ដារ', amount: '100', priceUsd: 1.0, stock: 9999 }
      ],
      isHot: isFeatured,
      rating: kg.rating || 4.9,
      stockCount: 9999,
      externalSlug: kg.externalSlug || slugKey,
      idLabel: kg.idLabel || kg.id_label || (slugKey === 'telegram' ? 'Telegram Username' : 'Player ID'),
      serverLabel: kg.serverLabel || kg.server_label || undefined,
      isApiConnected: true,
      priority: kg.priority || asset.priority || (100 + index),
    };
  });

  // Sort popular priority games to the top
  converted.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  return converted;
}

/**
 * Check balance from /api/v1/me via backend proxy
 */
export async function checkKhmerTopupBalance(apiKey?: string): Promise<{
  ok: boolean;
  username?: string;
  role?: string;
  balance?: number;
  currency?: string;
  error?: string;
}> {
  try {
    const key = apiKey || getStoredKhmerTopupSettings().apiKey;
    if (!key) {
      return { ok: false, error: 'Missing API key' };
    }

    const res = await fetch('/api/khmer-topup/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key }),
    });

    const data = await res.json();
    if (res.ok && data.ok) {
      saveStoredKhmerTopupSettings({
        balance: data.balance,
        currency: data.currency,
        username: data.username,
        role: data.role,
      });
      return {
        ok: true,
        username: data.username,
        role: data.role,
        balance: data.balance,
        currency: data.currency,
      };
    }
    return { ok: false, error: data.error || data.message || 'Failed to check balance' };
  } catch (err: any) {
    if (err?.name === 'AbortError') return { ok: false, error: 'Aborted' };
    return { ok: false, error: err.message || 'Network error' };
  }
}

/**
 * Fetch live catalog directly from backend scraper cache
 */
export async function fetchLiveKhmerTopupCatalog(profitMargin?: number): Promise<{
  ok: boolean;
  games?: GameItem[];
  rawCount?: number;
  error?: string;
}> {
  try {
    const res = await fetch('/api/khmer-topup/live-catalog');
    const data = await res.json();
    if (res.ok && data.games && data.games.length > 0) {
      const transformed = convertKhmerTopupToGameItems(data.games, profitMargin);
      return {
        ok: true,
        games: transformed,
        rawCount: data.games.length,
      };
    }
  } catch (err) {
    console.warn('Live catalog fetch error, trying sync endpoint:', err);
  }

  // Fallback to sync endpoint
  return syncKhmerTopupCatalog(undefined, profitMargin);
}

/**
 * Fetch catalog and sync with website (with or without API key, with custom profit margin)
 */
export async function syncKhmerTopupCatalog(
  apiKey?: string,
  profitMargin?: number
): Promise<{
  ok: boolean;
  games?: GameItem[];
  rawCount?: number;
  error?: string;
}> {
  try {
    const key = apiKey !== undefined ? apiKey : getStoredKhmerTopupSettings().apiKey;

    // Call /api/khmer-topup/games which automatically falls back to live scraped catalog
    const res = await fetch('/api/khmer-topup/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key || '' }),
    });

    const data = await res.json();
    if (res.ok && (data.games || data.ok)) {
      const rawGames: any[] = data.games || [];
      const transformed = convertKhmerTopupToGameItems(rawGames, profitMargin);

      const now = new Date();
      const currentSettings = getStoredKhmerTopupSettings();
      const intervalMinutes = currentSettings.syncIntervalMinutes || 30;
      const nextSync = new Date(now.getTime() + intervalMinutes * 60 * 1000);

      saveStoredKhmerTopupSettings({
        lastSyncTime: now.toISOString(),
        nextSyncTime: nextSync.toISOString(),
        ...(profitMargin !== undefined ? { profitPercentage: profitMargin } : {}),
      });

      return {
        ok: true,
        games: transformed,
        rawCount: rawGames.length,
      };
    }
    return { ok: false, error: data.error || data.message || 'Failed to load games from API' };
  } catch (err: any) {
    if (err?.name === 'AbortError') return { ok: false, error: 'Aborted' };
    return { ok: false, error: err.message || 'Network connection error' };
  }
}

/**
 * Verify game player ID & Zone ID
 */
export async function verifyGameAccount(
  slug: string,
  playerId: string,
  serverId?: string,
  apiKey?: string
): Promise<{
  valid: boolean;
  nickname?: string;
  error?: string;
}> {
  try {
    const key = apiKey || getStoredKhmerTopupSettings().apiKey;
    const res = await fetch('/api/khmer-topup/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, player_id: playerId, server_id: serverId, apiKey: key }),
    });

    const data = await res.json();
    if (data.result === 'valid' || data.nickname) {
      return { valid: true, nickname: data.nickname || 'Verified Player' };
    }
    return { valid: false, error: data.message || 'Account not found' };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Verification failed' };
  }
}
