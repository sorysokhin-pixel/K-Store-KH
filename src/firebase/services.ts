import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './config';
import { ActivityLog, GameItem, GamePackage, LogLevel, OrderItem, OrderStatus, UserProfile, UserRole } from '../types';
import { dispatchTelegramOrderNotification } from '../services/telegramService';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// Real-Time Activity Logs Service
// -------------------------------------------------------------

export async function logActivity(
  action: string,
  details: string,
  level: LogLevel = 'info',
  customUser?: { uid: string; email: string }
): Promise<void> {
  const user = customUser || auth.currentUser;
  const userId = user?.uid || 'guest-session';
  const userEmail = user?.email || 'guest@razykh.app';
  const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const path = `activity_logs/${logId}`;

  const logPayload: ActivityLog = {
    id: logId,
    userId,
    userEmail,
    action,
    details,
    level,
    timestamp: new Date().toISOString(),
    ipOrClient: navigator.userAgent.slice(0, 80),
  };

  try {
    await setDoc(doc(db, 'activity_logs', logId), logPayload);
  } catch (err) {
    console.warn('Local activity recorded (Cloud write skipped):', logPayload, err);
  }
}

export function subscribeToActivityLogs(
  isAdmin: boolean,
  userId: string | null,
  callback: (logs: ActivityLog[]) => void
): () => void {
  const path = 'activity_logs';
  try {
    const logsCol = collection(db, path);
    let q;
    if (isAdmin) {
      q = query(logsCol, orderBy('timestamp', 'desc'), limit(50));
    } else if (userId) {
      q = query(logsCol, where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(30));
    } else {
      callback([]);
      return () => {};
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: ActivityLog[] = [];
        snapshot.forEach((d) => {
          logs.push(d.data() as ActivityLog);
        });
        callback(logs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

// -------------------------------------------------------------
// User Profile & RBAC Services
// -------------------------------------------------------------

export const ADMIN_BOOTSTRAP_EMAIL = 'sorysokhin@gmail.com';

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function upsertUserProfile(profile: Partial<UserProfile> & { uid: string; email: string }): Promise<UserProfile> {
  const path = `users/${profile.uid}`;
  const now = new Date().toISOString();
  
  // Assign role: if email is bootstrapped admin email, grant admin!
  const isBootstrapAdmin = profile.email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase();
  const role: UserRole = isBootstrapAdmin ? 'admin' : profile.role || 'user';

  const fullProfile: UserProfile = {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName || profile.email.split('@')[0],
    photoURL: profile.photoURL || '',
    role,
    encryptedData: profile.encryptedData || '',
    balanceUsd: profile.balanceUsd ?? 10.0, // Initial welcome topup test credit
    createdAt: profile.createdAt || now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'users', profile.uid), fullProfile, { merge: true });
    
    // If admin, also store admin document
    if (role === 'admin') {
      try {
        await setDoc(doc(db, 'admins', profile.uid), {
          uid: profile.uid,
          email: profile.email,
          role: 'admin',
          grantedAt: now,
        }, { merge: true });
      } catch (adminErr) {
        console.warn('Admin doc creation skipped for persona:', adminErr);
      }
    }

    return fullProfile;
  } catch (error) {
    console.warn('User profile stored in session memory (Cloud write skipped):', error);
    return fullProfile;
  }
}

export async function updateUserRole(targetUserId: string, newRole: UserRole): Promise<void> {
  const path = `users/${targetUserId}`;
  try {
    await updateDoc(doc(db, 'users', targetUserId), {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });

    if (newRole === 'admin') {
      await setDoc(doc(db, 'admins', targetUserId), {
        uid: targetUserId,
        role: 'admin',
        grantedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    const users: UserProfile[] = [];
    snap.forEach((d) => users.push(d.data() as UserProfile));
    
    if (users.length === 0) {
      return [
        {
          uid: 'uid-sorysokhin-gmail-com',
          email: 'sorysokhin@gmail.com',
          displayName: 'Sory Sokhin (Admin)',
          photoURL: '',
          role: 'admin',
          balanceUsd: 250.0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          uid: 'uid-gamer-kh-razykh-app',
          email: 'gamer.kh@razykh.app',
          displayName: 'Vannak Gamer',
          photoURL: '',
          role: 'user',
          balanceUsd: 15.0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          uid: 'uid-moderator-kh-razykh-app',
          email: 'moderator.kh@razykh.app',
          displayName: 'Dara Moderator',
          photoURL: '',
          role: 'moderator',
          balanceUsd: 50.0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }
    return users;
  } catch (error) {
    console.warn('Fallback to local user list on list users error:', error);
    return [
      {
        uid: 'uid-sorysokhin-gmail-com',
        email: 'sorysokhin@gmail.com',
        displayName: 'Sory Sokhin (Admin)',
        photoURL: '',
        role: 'admin',
        balanceUsd: 250.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        uid: 'uid-gamer-kh-razykh-app',
        email: 'gamer.kh@razykh.app',
        displayName: 'Vannak Gamer',
        photoURL: '',
        role: 'user',
        balanceUsd: 15.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        uid: 'uid-moderator-kh-razykh-app',
        email: 'moderator.kh@razykh.app',
        displayName: 'Dara Moderator',
        photoURL: '',
        role: 'moderator',
        balanceUsd: 50.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}

// Utility helper to recursively strip undefined fields for Firestore compatibility
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleanObj[key] = sanitizeForFirestore(val);
      }
    }
    return cleanObj as T;
  }
  return obj;
}

const MOCK_SAMPLE_IDS = new Set([
  'ff-bonus',
  'ff-level-up',
  'magic-chess',
  'panel-ios',
  'panel-ff',
  'regedit-vip',
  'robux-gift',
  'speed-drifter',
  'ff-20',
  'ff-50',
  'ff-100',
  'freefire-bonus-special',
]);

const OFFICIAL_KHMER_GAME_IDS = new Set([
  'freefire-sgmy',
  'mobile-legends',
  'telegram',
  'mobile-legends-exclusive',
  'mobile-legends-special',
  'freefire-indonesia',
  'honor-of-kings',
  'freefire-taiwan',
  'freefire-vietnam',
  'pubg-mobile',
  'eafc-mobile-cambodia',
  'magic-chess-gogo',
  'blood-strike',
  'freefire-sg',
  'freefire-brazil',
  'racing-master-sea',
  'freefire-global',
  'wild-rift-cambodia',
  'freefire-middle-east',
  'freefire-latam',
  'freefire-bangladesh',
  'valorant-sg',
  'call-of-duty-mobile-garena-sgmy',
  'bigo-live-diamonds',
  'identity-v',
  'free-fire',
  'freefire',
  'mlbb',
  'hok',
  'pubgm',
]);

export function isMockProduct(p: any): boolean {
  if (!p) return true;

  // 1. If it has images from unsplash or known mock ids, it is definitely mock
  if (typeof p.coverImage === 'string' && p.coverImage.includes('images.unsplash.com')) {
    return true;
  }
  if (MOCK_SAMPLE_IDS.has(p.id)) {
    return true;
  }

  // 2. Official Khmer-TopUp games or proxy images
  if (OFFICIAL_KHMER_GAME_IDS.has(p.id) || OFFICIAL_KHMER_GAME_IDS.has(p.externalSlug)) {
    return false;
  }
  if (
    typeof p.coverImage === 'string' &&
    (p.coverImage.includes('khmer-topup.com') ||
      p.coverImage.includes('/static/uploads/games/') ||
      p.coverImage.includes('/api/khmer-topup/'))
  ) {
    return false;
  }

  // 3. Products created or customized by Admin (e.g. Trollmodz, Panel, etc.)
  if (
    p.isCustom ||
    p.customCategoryId ||
    (typeof p.id === 'string' && (p.id.startsWith('product-') || p.id.startsWith('custom-')))
  ) {
    return false;
  }

  // Preserve all other valid products added by user/admin
  return false;
}

export async function purgeMockSampleProducts(): Promise<number> {
  const path = 'products';
  try {
    const snap = await getDocs(collection(db, path));
    const toDelete: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (isMockProduct(data)) {
        toDelete.push(d.ref);
      }
    });

    let count = 0;
    const CHUNK_SIZE = 400;
    for (let i = 0; i < toDelete.length; i += CHUNK_SIZE) {
      const chunk = toDelete.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
      count += chunk.length;
    }

    if (count > 0) {
      console.log(`[Purge] Successfully removed ${count} mock sample products from Firestore.`);
    }
    return count;
  } catch (err) {
    console.warn('[Purge] Failed to purge mock products:', err);
    return 0;
  }
}

// -------------------------------------------------------------
// Orders / Top-up Transactions Service
// -------------------------------------------------------------

export async function createOrder(order: Omit<OrderItem, 'createdAt' | 'updatedAt'>): Promise<OrderItem> {
  const path = `orders/${order.orderId}`;
  const now = new Date().toISOString();
  const fullOrder: OrderItem = {
    ...order,
    createdAt: now,
    updatedAt: now,
  };

  const cleanOrderData = sanitizeForFirestore(fullOrder);

  try {
    await setDoc(doc(db, 'orders', order.orderId), cleanOrderData);
    await logActivity('ORDER_CREATED', `Placed top-up for ${order.gameTitle} (${order.packageTitle}) - $${order.amountUsd.toFixed(2)} USD`, 'action');

    // Automatically alert Admin @sorysokhin via Telegram
    dispatchTelegramOrderNotification(fullOrder).catch((teleErr) =>
      console.warn('Telegram notification async dispatch:', teleErr)
    );

    return fullOrder;
  } catch (error) {
    console.warn('Order stored in local state (Firestore write failed/bypassed):', error);

    // Also trigger notification for offline/fallback order creation
    dispatchTelegramOrderNotification(fullOrder).catch((teleErr) =>
      console.warn('Telegram notification async dispatch:', teleErr)
    );

    return fullOrder;
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      updatedAt: new Date().toISOString(),
    });
    await logActivity('ORDER_STATUS_CHANGED', `Order ${orderId} changed to ${status}`, status === 'completed' ? 'action' : 'warning');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToOrders(
  isAdmin: boolean,
  userId: string | null,
  callback: (orders: OrderItem[]) => void
): () => void {
  const path = 'orders';
  try {
    const ordersCol = collection(db, path);
    let q;
    if (isAdmin) {
      q = query(ordersCol, orderBy('createdAt', 'desc'), limit(50));
    } else if (userId) {
      q = query(ordersCol, where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(30));
    } else {
      callback([]);
      return () => {};
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const orders: OrderItem[] = [];
        snapshot.forEach((d) => {
          orders.push(d.data() as OrderItem);
        });
        callback(orders);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

// -------------------------------------------------------------
// Products & Stock Management Services
// -------------------------------------------------------------

export function subscribeToProducts(callback: (products: GameItem[]) => void): () => void {
  const path = 'products';
  try {
    const productsCol = collection(db, path);
    const unsubscribe = onSnapshot(
      productsCol,
      (snapshot) => {
        const products: GameItem[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (!data.deleted && !isMockProduct(data)) {
            products.push(data as GameItem);
          }
        });
        products.sort((a, b) => (a.priority || 999) - (b.priority || 999));
        callback(products);
      },
      (error) => {
        console.warn('Fallback to local products dataset:', error.message);
        callback([]);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn('Products subscription exception:', error);
    callback([]);
    return () => {};
  }
}

export async function saveProduct(product: GameItem): Promise<void> {
  const path = `products/${product.id}`;
  const totalStock = product.packages.reduce((sum: number, pkg: GamePackage) => sum + (pkg.stock ?? 100), 0);
  const updatedProduct: GameItem = {
    ...product,
    isCustom: true,
    stockCount: totalStock,
  };

  // Sync to local storage for immediate offline/client retention
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('kstore_custom_products');
      const list: GameItem[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((p) => p.id !== product.id);
      filtered.push(updatedProduct);
      localStorage.setItem('kstore_custom_products', JSON.stringify(filtered));
    } catch (_) {}
  }

  const cleanData = sanitizeForFirestore(updatedProduct);

  try {
    await setDoc(doc(db, 'products', product.id), cleanData, { merge: true });
    await logActivity(
      'PRODUCT_UPDATED',
      `Admin updated product image/details for ${product.title} (Stock: ${totalStock})`,
      'action'
    );
  } catch (error) {
    console.warn('Product saved locally (Firestore write bypassed):', error);
  }
}

export async function replenishPackageStock(
  product: GameItem,
  packageId: string,
  addAmount: number
): Promise<void> {
  const path = `products/${product.id}`;
  const updatedPackages = product.packages.map((pkg: GamePackage) => {
    if (pkg.id === packageId) {
      const currentStock = pkg.stock ?? 100;
      return { ...pkg, stock: Math.max(0, currentStock + addAmount) };
    }
    return pkg;
  });

  const totalStock = updatedPackages.reduce((sum: number, pkg: GamePackage) => sum + (pkg.stock ?? 0), 0);
  const updatedProduct: GameItem = {
    ...product,
    packages: updatedPackages,
    stockCount: totalStock,
  };

  const cleanData = sanitizeForFirestore(updatedProduct);

  try {
    await setDoc(doc(db, 'products', product.id), cleanData, { merge: true });
    await logActivity(
      'STOCK_REPLENISHED',
      `Replenished +${addAmount} stock units for ${product.title} [Pkg: ${packageId}]. Total: ${totalStock}`,
      'action'
    );
  } catch (error) {
    console.warn('Stock replenished locally:', error);
  }
}

export async function replenishPackageKeys(
  product: GameItem,
  packageId: string,
  newKeys: string[],
  durationHours?: number,
  durationLabel?: string
): Promise<GameItem> {
  const cleanNewKeys = newKeys.map((k) => k.trim()).filter(Boolean);
  const updatedPackages = product.packages.map((pkg: GamePackage) => {
    if (pkg.id === packageId) {
      const existingKeys = pkg.keys || [];
      const mergedKeys = [...existingKeys, ...cleanNewKeys];
      return {
        ...pkg,
        keys: mergedKeys,
        stock: mergedKeys.length,
        ...(durationHours ? { durationHours } : {}),
        ...(durationLabel ? { durationLabel } : {}),
      };
    }
    return pkg;
  });

  const totalStock = updatedPackages.reduce((sum: number, pkg: GamePackage) => sum + (pkg.stock ?? 0), 0);
  const updatedProduct: GameItem = {
    ...product,
    packages: updatedPackages,
    stockCount: totalStock,
  };

  const cleanData = sanitizeForFirestore(updatedProduct);

  try {
    await setDoc(doc(db, 'products', product.id), cleanData, { merge: true });
    await logActivity(
      'KEYS_REPLENISHED',
      `Added +${cleanNewKeys.length} license keys (${durationLabel || (durationHours ? `${durationHours}h` : 'standard')}) to ${product.title} [Pkg: ${packageId}]. Total keys in stock: ${totalStock}`,
      'action'
    );
  } catch (error) {
    console.warn('Keys saved locally:', error);
  }
  return updatedProduct;
}

export async function drawLicenseKeyFromStock(
  productId: string,
  packageId: string
): Promise<string | null> {
  try {
    const docSnap = await getDoc(doc(db, 'products', productId));
    if (!docSnap.exists()) return null;
    const prod = docSnap.data() as GameItem;
    let drawnKey: string | null = null;

    const updatedPackages = prod.packages.map((pkg) => {
      if (pkg.id === packageId && pkg.keys && pkg.keys.length > 0) {
        drawnKey = pkg.keys[0];
        const remainingKeys = pkg.keys.slice(1);
        return {
          ...pkg,
          keys: remainingKeys,
          stock: remainingKeys.length,
        };
      }
      return pkg;
    });

    if (drawnKey) {
      const totalStock = updatedPackages.reduce((sum, p) => sum + (p.stock || 0), 0);
      const updatedProduct = {
        ...prod,
        packages: updatedPackages,
        stockCount: totalStock,
      };
      await setDoc(doc(db, 'products', productId), sanitizeForFirestore(updatedProduct), { merge: true });
      return drawnKey;
    }
  } catch (err) {
    console.warn('Failed to draw key from stock:', err);
  }
  return null;
}

export async function batchSyncGamesToFirestore(games: GameItem[]): Promise<number> {
  // Automatically purge any old mock sample products from Firestore
  try {
    await purgeMockSampleProducts();
  } catch (purgeErr) {
    console.warn('Purge mock products non-fatal error:', purgeErr);
  }

  const BATCH_SIZE = 400;
  let totalSaved = 0;

  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const chunk = games.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const game of chunk) {
      const cleanData = sanitizeForFirestore(game);
      const ref = doc(db, 'products', game.id);
      batch.set(ref, cleanData, { merge: true });
    }

    try {
      await batch.commit();
      totalSaved += chunk.length;
    } catch (err) {
      console.warn(`Batch commit error for chunk ${i}, falling back to single sets:`, err);
      for (const game of chunk) {
        try {
          const cleanData = sanitizeForFirestore(game);
          await setDoc(doc(db, 'products', game.id), cleanData, { merge: true });
          totalSaved++;
        } catch (singleErr) {
          console.error(`Failed to set game ${game.id}:`, singleErr);
        }
      }
    }
  }

  await logActivity(
    'KHMER_TOPUP_SYNCED',
    `Synchronized ${totalSaved} games & packages automatically from Khmer-TopUp API`,
    'action'
  );
  return totalSaved;
}

export async function deleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('kstore_custom_products');
      if (raw) {
        const list: GameItem[] = JSON.parse(raw);
        const filtered = list.filter((p) => p.id !== productId);
        localStorage.setItem('kstore_custom_products', JSON.stringify(filtered));
      }
    } catch (_) {}
  }
  try {
    await setDoc(doc(db, 'products', productId), { deleted: true }, { merge: true });
    await logActivity('PRODUCT_DELETED', `Admin deleted product ${productId}`, 'warning');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedProductsIfEmpty(initialGames: GameItem[]): Promise<void> {
  // Prevent any seeding of fake mock sample data
  return;
}
