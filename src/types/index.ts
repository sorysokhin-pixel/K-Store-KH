export type Language = 'kh' | 'en';

export type UserRole = 'admin' | 'moderator' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  encryptedData?: string; // AES-GCM encrypted sensitive personal data
  balanceUsd: number;
  createdAt: string;
  updatedAt: string;
}

export type LogLevel = 'info' | 'security' | 'warning' | 'action';

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  level: LogLevel;
  timestamp: string;
  ipOrClient?: string;
}

export type OrderStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface OrderItem {
  orderId: string;
  userId: string;
  userEmail: string;
  gameId: string;
  gameTitle: string;
  packageTitle: string;
  amountUsd: number;
  playerId: string;
  zoneId?: string;
  encryptedPlayerSecret?: string;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  khqrData?: string;
  // Key Service / Digital License Key additions
  isKeyService?: boolean;
  licenseKey?: string;
  unlockUrl?: string;
  backupContact?: string;
}

export interface GamePackage {
  id: string;
  name: string;
  nameKh?: string;
  amount: string;
  priceUsd: number;
  originalPriceUsd?: number; // Base cost before reseller profit markup
  popular?: boolean;
  bonus?: string;
  stock?: number; // Package available stock count
  durationHours?: number; // e.g. 1, 2, 6, 12, 24, 72, 168, 720 hours
  durationLabel?: string; // e.g. "1 ម៉ោង", "24 ម៉ោង (1 ថ្ងៃ)", "7 ថ្ងៃ"
  keys?: string[]; // Array of stored license keys for this hourly tier
  externalPackageId?: number; // Khmer-TopUp package_id
}

export interface GameItem {
  id: string;
  title: string;
  titleKh: string;
  category: 'featured' | 'all' | 'panel' | 'robux';
  badge?: string;
  badgeKh?: string;
  badgeType?: 'flag' | 'vip' | 'gift' | 'pass' | 'global' | 'token' | 'default';
  countryFlag?: string;
  icon: string;
  coverImage: string;
  needsZoneId?: boolean;
  zonePlaceholder?: string;
  packages: GamePackage[];
  isHot?: boolean;
  rating?: number;
  stockCount?: number; // Total stock units across packages
  // Key Service additions
  isKeyService?: boolean;
  keyFeatures?: string[];
  unlockUrl?: string;
  // Khmer-TopUp API connection
  externalSlug?: string;
  idLabel?: string;
  serverLabel?: string;
  isApiConnected?: boolean;
  priority?: number;
}

export interface KhmerTopupPackage {
  package_id: number;
  name: string;
  price: number;
  tag?: string;
}

export interface KhmerTopupGame {
  slug: string;
  name: string;
  id_label: string;
  server_label: string | null;
  packages: KhmerTopupPackage[];
}

export interface KhmerTopupSettings {
  apiKey: string;
  baseUrl: string;
  username?: string;
  role?: string;
  balance?: number;
  currency?: string;
  lastSyncTime?: string;
  nextSyncTime?: string;
  autoSync: boolean;
  syncIntervalMinutes: number; // Interval in minutes (e.g. 15, 30, 60, 120, 1440)
  profitPercentage: number; // Markup profit percentage for resell (e.g. 0, 5, 8, 10, 15)
}
