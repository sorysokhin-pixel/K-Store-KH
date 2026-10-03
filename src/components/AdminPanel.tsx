import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Activity,
  Users,
  Receipt,
  Lock,
  RefreshCw,
  Search,
  Filter,
  Package,
  Plus,
  Edit2,
  Trash2,
  Image,
  Boxes,
  HelpCircle,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Key,
  Upload,
  CreditCard,
  Globe,
  Zap,
  Clock,
  Eye,
  Copy,
  Check,
  Sparkles,
  Send,
  Bell,
  FolderPlus,
  Tag,
  LogOut,
} from 'lucide-react';
import {
  AdminCredentials,
  getStoredAdminCredentials,
  saveStoredAdminCredentials,
} from '../services/adminAuthService';
import {
  CustomCategory,
  getStoredCategories,
  addStoredCategory,
  deleteStoredCategory,
} from '../services/categoryService';
import {
  getStoredPaymentSettings,
  saveStoredPaymentSettings,
  PaymentSettings,
} from '../services/paymentService';
import {
  TelegramConfig,
  getStoredTelegramConfig,
  saveStoredTelegramConfig,
  sendTelegramTestAlert,
} from '../services/telegramService';
import {
  getStoredKhmerTopupSettings,
  saveStoredKhmerTopupSettings,
  checkKhmerTopupBalance,
  syncKhmerTopupCatalog,
  verifyGameAccount,
} from '../services/khmerTopupService';
import {
  ActivityLog,
  GameItem,
  GamePackage,
  OrderItem,
  UserProfile,
  UserRole,
  Language,
  KhmerTopupSettings,
} from '../types';
import {
  getAllUsers,
  updateUserRole,
  updateOrderStatus,
  logActivity,
  saveProduct,
  replenishPackageStock,
  replenishPackageKeys,
  batchSyncGamesToFirestore,
  deleteProduct,
  purgeMockSampleProducts,
} from '../firebase/services';
import { decryptSensitiveData } from '../firebase/encryption';

interface AdminPanelProps {
  lang: Language;
  currentUser: UserProfile | null;
  activityLogs: ActivityLog[];
  orders: OrderItem[];
  products: GameItem[];
  onClose: () => void;
  onLogout?: () => void;
}

const IMAGE_PRESETS = [
  { label: 'Free Fire / Battle Royale', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80' },
  { label: 'Mobile Legends / MOBA', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80' },
  { label: 'Roblox / Gift Cards', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80' },
  { label: 'VPN / VIP Panel', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=80' },
  { label: 'PUBG / Tactical Shooter', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=80' },
  { label: 'Genshin / RPG Fantasy', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=80' },
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  lang,
  currentUser,
  activityLogs,
  orders,
  products,
  onClose,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'stocks' | 'logs' | 'users' | 'orders' | 'security' | 'payments' | 'khmer_topup'>('products');
  const [paymentConfig, setPaymentConfig] = useState<PaymentSettings>(() => getStoredPaymentSettings());
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentSaveMsg, setPaymentSaveMsg] = useState('');

  // Khmer-TopUp State
  const [khmerTopupConfig, setKhmerTopupConfig] = useState<KhmerTopupSettings>(() => getStoredKhmerTopupSettings());
  const [isSavingTopupConfig, setIsSavingTopupConfig] = useState(false);
  const [isSyncingTopup, setIsSyncingTopup] = useState(false);
  const [topupSyncMsg, setTopupSyncMsg] = useState('');
  const [topupBalanceData, setTopupBalanceData] = useState<{ username?: string; role?: string; balance?: number; currency?: string } | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [customProfitInput, setCustomProfitInput] = useState<string>(() => String(khmerTopupConfig.profitPercentage ?? 5));

  // Admin Credentials State
  const [adminCreds, setAdminCreds] = useState<AdminCredentials>(() => getStoredAdminCredentials());
  const [adminCredsMsg, setAdminCredsMsg] = useState('');
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  const handleSaveAdminCreds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCreds.username.trim() || !adminCreds.code.trim()) {
      alert('សូមបញ្ចូល Username និងលេខកូដសម្ងាត់!');
      return;
    }
    setIsSavingCreds(true);
    saveStoredAdminCredentials({
      username: adminCreds.username.trim(),
      code: adminCreds.code.trim(),
      isCustom: true,
    });
    setAdminCredsMsg('✓ បានកែប្រែ Username & លេខកូដសម្ងាត់ជោគជ័យ! (លេខកូដចាស់ត្រូវបានបិទចោលទាំងស្រុង)');
    setIsSavingCreds(false);
    setTimeout(() => setAdminCredsMsg(''), 5000);
  };

  // Live Game Account Verification Tool
  const [verifySlug, setVerifySlug] = useState('mobile-legends');
  const [verifyPlayerId, setVerifyPlayerId] = useState('');
  const [verifyServerId, setVerifyServerId] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ valid?: boolean; nickname?: string; error?: string } | null>(null);
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);

  // Hourly Key Stock Management State
  const [hourlyKeyModal, setHourlyKeyModal] = useState<{
    isOpen: boolean;
    product: GameItem | null;
    packageId: string;
    durationHours: number;
    durationLabel: string;
  }>({
    isOpen: false,
    product: null,
    packageId: '',
    durationHours: 24,
    durationLabel: '24 ម៉ោង (1 ថ្ងៃ)',
  });
  const [rawKeysInput, setRawKeysInput] = useState('');
  const [isSavingHourlyKeys, setIsSavingHourlyKeys] = useState(false);
  const [hourlyKeysMsg, setHourlyKeysMsg] = useState('');
  const [viewingKeysPackage, setViewingKeysPackage] = useState<{ pkg: GamePackage; prod: GameItem } | null>(null);

  // Telegram Order Alerts Service State (@sorysokhin)
  const [telegramSettings, setTelegramSettings] = useState<TelegramConfig>(() => getStoredTelegramConfig());
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isSendingTestAlert, setIsSendingTestAlert] = useState(false);
  const [telegramStatusMsg, setTelegramStatusMsg] = useState('');

  // Category Management State
  const [categories, setCategories] = useState<CustomCategory[]>(() => getStoredCategories());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatForm, setNewCatForm] = useState<CustomCategory>({
    id: '',
    name: '',
    nameKh: '',
    icon: '🎮',
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatForm.id.trim() || !newCatForm.name.trim()) return;
    const catId = newCatForm.id.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
    const created: CustomCategory = {
      id: catId,
      name: newCatForm.name.trim(),
      nameKh: newCatForm.nameKh.trim() || newCatForm.name.trim(),
      icon: newCatForm.icon || '🎮',
    };
    const updated = addStoredCategory(created);
    setCategories(updated);
    setNewCatForm({ id: '', name: '', nameKh: '', icon: '🎮' });
  };

  const handleRemoveCategory = (catId: string) => {
    const updated = deleteStoredCategory(catId);
    setCategories(updated);
  };
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [decryptKeyInput, setDecryptKeyInput] = useState('');
  const [decryptedText, setDecryptedText] = useState<{ [id: string]: string }>({});

  // Product Editing Modal State
  const [editingProduct, setEditingProduct] = useState<GameItem | null>(null);
  const [productForm, setProductForm] = useState<Partial<GameItem>>({
    id: '',
    title: '',
    titleKh: '',
    category: 'featured',
    badge: 'TOPUP',
    badgeKh: 'TOPUP',
    coverImage: IMAGE_PRESETS[0].url,
    needsZoneId: false,
    packages: [
      { id: 'pkg-1', name: 'Standard Package', nameKh: 'កញ្ចប់ស្តង់ដារ', amount: '100 Units', priceUsd: 1.0, stock: 100 },
    ],
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [showStockGuide, setShowStockGuide] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await getAllUsers();
      setUserList(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      await logActivity('RBAC_ROLE_UPDATED', `User ${userId} updated to role: ${newRole}`, 'security');
      setUserList((prev) => prev.map((u) => (u.uid === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: any) => {
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Product Form Handling
  const handleOpenNewProduct = () => {
    const newId = `product-${Date.now().toString(36)}`;
    setProductForm({
      id: newId,
      title: '',
      titleKh: '',
      category: 'featured',
      badge: 'NEW',
      badgeKh: 'ថ្មី',
      coverImage: IMAGE_PRESETS[0].url,
      needsZoneId: false,
      packages: [
        { id: `${newId}-1`, name: 'Package 1', nameKh: 'កញ្ចប់ទី ១', amount: '100 Diamonds', priceUsd: 1.25, stock: 100 },
        { id: `${newId}-2`, name: 'Package 2', nameKh: 'កញ្ចប់ទី ២', amount: '300 Diamonds', priceUsd: 3.50, stock: 50 },
      ],
    });
    setEditingProduct({ id: newId } as GameItem);
  };

  const handleOpenEditProduct = (prod: GameItem) => {
    setProductForm({ ...prod });
    setEditingProduct(prod);
  };

  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title || !productForm.coverImage) {
      alert('សូមបញ្ចូលចំណងជើង និង URL រូបភាព Product!');
      return;
    }

    setIsSavingProduct(true);
    try {
      const totalStock = (productForm.packages || []).reduce((sum, pkg) => sum + (pkg.stock ?? 100), 0);
      const prodToSave: GameItem = {
        id: productForm.id || `product-${Date.now()}`,
        title: productForm.title || 'Game Product',
        titleKh: productForm.titleKh || productForm.title || 'Game Product',
        category: (productForm.category as any) || 'featured',
        badge: productForm.badge || 'TOPUP',
        badgeKh: productForm.badgeKh || productForm.badge || 'TOPUP',
        badgeType: 'vip',
        icon: '🎮',
        coverImage: productForm.coverImage,
        needsZoneId: productForm.needsZoneId || false,
        packages: productForm.packages || [],
        stockCount: totalStock,
      };

      await saveProduct(prodToSave);
      setEditingProduct(null);
    } catch (err) {
      console.error('Failed to save product:', err);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProd = async (prodId: string) => {
    if (confirm('តើអ្នកពិតជាចង់លុប Product នេះមែនទេ?')) {
      await deleteProduct(prodId);
    }
  };

  const handleReplenish = async (product: GameItem, packageId: string, amount: number) => {
    await replenishPackageStock(product, packageId, amount);
  };

  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPayment(true);
    try {
      saveStoredPaymentSettings(paymentConfig);
      await fetch('/api/payment/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentConfig),
      });
      setPaymentSaveMsg('✓ បានរក្សាទុកការកំណត់ទូទាត់ជោគជ័យ!');
      setTimeout(() => setPaymentSaveMsg(''), 3000);
      await logActivity(
        'PAYMENT_SETTINGS_UPDATED',
        `Admin updated payment settings (Provider: ${paymentConfig.activeProvider.toUpperCase()})`,
        'action'
      );
    } catch (err) {
      console.error('Failed to sync payment settings:', err);
      setPaymentSaveMsg('✓ រក្សាទុកក្នុង Browser រួចរាល់!');
      setTimeout(() => setPaymentSaveMsg(''), 3000);
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Khmer-TopUp Settings Save
  const handleSaveKhmerTopupConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTopupConfig(true);
    try {
      saveStoredKhmerTopupSettings(khmerTopupConfig);
      await fetch('/api/khmer-topup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(khmerTopupConfig),
      });
      setTopupSyncMsg('✓ បានរក្សាទុកការកំណត់ Khmer-TopUp API ជោគជ័យ!');
      setTimeout(() => setTopupSyncMsg(''), 3000);
      if (khmerTopupConfig.apiKey) {
        handleCheckTopupBalance();
      }
    } catch (err: any) {
      setTopupSyncMsg('✓ រក្សាទុកក្នុង Browser រួចរាល់!');
      setTimeout(() => setTopupSyncMsg(''), 3000);
    } finally {
      setIsSavingTopupConfig(false);
    }
  };

  // Toggle Automatic API Synchronization
  const handleToggleAutoSync = async (enabled: boolean) => {
    const updated: KhmerTopupSettings = {
      ...khmerTopupConfig,
      autoSync: enabled,
      nextSyncTime: enabled
        ? new Date(Date.now() + (khmerTopupConfig.syncIntervalMinutes || 30) * 60000).toISOString()
        : undefined,
    };
    setKhmerTopupConfig(updated);
    saveStoredKhmerTopupSettings(updated);
    try {
      await fetch('/api/khmer-topup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setTopupSyncMsg(
        enabled
          ? `✓ បានបើកការ Sync ស្វ័យប្រវត្តរៀងរាល់ ${updated.syncIntervalMinutes} នាទី!`
          : '✓ បានបិទការ Sync ស្វ័យប្រវត្ត (Manual Mode Only)'
      );
      setTimeout(() => setTopupSyncMsg(''), 3500);
    } catch (_) {}
  };

  // Update API Sync Frequency Interval
  const handleUpdateSyncInterval = async (minutes: number) => {
    const validMinutes = Math.max(1, Number(minutes) || 30);
    const updated: KhmerTopupSettings = {
      ...khmerTopupConfig,
      syncIntervalMinutes: validMinutes,
      nextSyncTime: khmerTopupConfig.autoSync
        ? new Date(Date.now() + validMinutes * 60000).toISOString()
        : undefined,
    };
    setKhmerTopupConfig(updated);
    saveStoredKhmerTopupSettings(updated);
    try {
      await fetch('/api/khmer-topup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setTopupSyncMsg(`✓ បានកំណត់រយៈពេល Sync រៀងរាល់ ${validMinutes} នាទីម្តង!`);
      setTimeout(() => setTopupSyncMsg(''), 3500);
    } catch (_) {}
  };

  // Update Reseller Profit Margin Markup Percentage
  const handleUpdateProfitPercentage = async (marginPercent: number) => {
    const validMargin = Math.max(0, Number(marginPercent) || 0);
    const updated: KhmerTopupSettings = {
      ...khmerTopupConfig,
      profitPercentage: validMargin,
    };
    setKhmerTopupConfig(updated);
    setCustomProfitInput(String(validMargin));
    saveStoredKhmerTopupSettings(updated);
    try {
      await fetch('/api/khmer-topup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (_) {}

    // Auto recalculate and sync catalog with new margin
    setIsSyncingTopup(true);
    setTopupSyncMsg(`⏳ កំពុងគណនាតម្លៃលក់ត (ចំណេញ: +${validMargin}%) លើទំនិញទាំងអស់...`);
    try {
      const res = await syncKhmerTopupCatalog(khmerTopupConfig.apiKey, validMargin);
      if (res.ok && res.games && res.games.length > 0) {
        await batchSyncGamesToFirestore(res.games);
        setTopupSyncMsg(`✓ បានរក្សាទុកភាគរយចំណេញ +${validMargin}% និងកែប្រែតម្លៃលក់តជោគជ័យ!`);
        setTimeout(() => setTopupSyncMsg(''), 4500);
      }
    } catch (err: any) {
      setTopupSyncMsg(`⚠️ មានបញ្ហាក្នុងការ Sync: ${err.message}`);
      setTimeout(() => setTopupSyncMsg(''), 4000);
    } finally {
      setIsSyncingTopup(false);
    }
  };

  // Telegram Alert Settings Handlers (@sorysokhin)
  const handleSaveTelegramSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTelegram(true);
    try {
      const updated = saveStoredTelegramConfig(telegramSettings);
      await fetch('/api/notifications/telegram-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setTelegramStatusMsg('✓ បានរក្សាទុកការកំណត់ Telegram Alert សម្រាប់ @sorysokhin ជោគជ័យ!');
      setTimeout(() => setTelegramStatusMsg(''), 4000);
    } catch (err: any) {
      setTelegramStatusMsg('✓ រក្សាទុកក្នុង Browser រួចរាល់!');
      setTimeout(() => setTelegramStatusMsg(''), 4000);
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleSendTestTelegramAlert = async () => {
    setIsSendingTestAlert(true);
    setTelegramStatusMsg('⏳ កំពុងផ្ញើសារសាកល្បងទៅកាន់ Telegram @sorysokhin...');
    try {
      const res = await sendTelegramTestAlert();
      if (res.ok) {
        setTelegramStatusMsg('✓ បានផ្ញើសារ Alert សាកល្បងទៅកាន់ @sorysokhin ជោគជ័យ!');
      } else {
        setTelegramStatusMsg(`⚠️ ${res.error || 'Failed to send test alert'}`);
      }
      setTimeout(() => setTelegramStatusMsg(''), 5000);
    } catch (err: any) {
      setTelegramStatusMsg(`⚠️ ${err.message}`);
      setTimeout(() => setTelegramStatusMsg(''), 5000);
    } finally {
      setIsSendingTestAlert(false);
    }
  };

  // Check Khmer-TopUp Balance
  const handleCheckTopupBalance = async () => {
    setIsCheckingBalance(true);
    try {
      const res = await checkKhmerTopupBalance(khmerTopupConfig.apiKey);
      if (res.ok) {
        setTopupBalanceData({
          username: res.username,
          role: res.role,
          balance: res.balance,
          currency: res.currency || 'USD',
        });
        setTopupSyncMsg(`✓ គណនី ${res.username} (${res.role}): $${res.balance?.toFixed(2)} ${res.currency}`);
        setTimeout(() => setTopupSyncMsg(''), 4000);
      } else {
        setTopupSyncMsg(`⚠️ ${res.error || 'Failed to check balance'}`);
        setTimeout(() => setTopupSyncMsg(''), 4000);
      }
    } finally {
      setIsCheckingBalance(false);
    }
  };

  // Auto-Sync Catalog from Khmer-TopUp
  const handleAutoSyncKhmerTopup = async () => {
    setIsSyncingTopup(true);
    setTopupSyncMsg('⏳ កំពុងទាញទំនិញ និងតម្លៃពិតប្រាកដពី https://khmer-topup.com ...');
    try {
      const res = await syncKhmerTopupCatalog(khmerTopupConfig.apiKey);
      if (res.ok && res.games && res.games.length > 0) {
        const syncedCount = await batchSyncGamesToFirestore(res.games);
        setTopupSyncMsg(`✓ បានទាញចូលហ្គេមចំនួន ${res.rawCount || res.games.length} (${syncedCount} Games) ស្វ័យប្រវត្តជោគជ័យ!`);
        setTimeout(() => setTopupSyncMsg(''), 5000);
      } else {
        setTopupSyncMsg(`⚠️ ${res.error || 'រកមិនឃើញទិន្នន័យពី API ទេ'}`);
        setTimeout(() => setTopupSyncMsg(''), 4000);
      }
    } catch (err: any) {
      setTopupSyncMsg(`⚠️ មានបញ្ហាក្នុងការ Sync: ${err.message}`);
      setTimeout(() => setTopupSyncMsg(''), 4000);
    } finally {
      setIsSyncingTopup(false);
    }
  };

  // Purge any remaining mock sample products
  const handlePurgeMockProducts = async () => {
    if (confirm('តើអ្នកពិតជាចង់សម្អាត និងលុបចោលទិន្នន័យគំរូ (Mock Products) ទាំងអស់មែនទេ?')) {
      try {
        const count = await purgeMockSampleProducts();
        setTopupSyncMsg(`✓ បានសម្អាតទិន្នន័យគំរូចំនួន ${count} Products ចេញពី Database រួចរាល់!`);
        setTimeout(() => setTopupSyncMsg(''), 4000);
      } catch (err: any) {
        setTopupSyncMsg(`⚠️ ${err.message}`);
        setTimeout(() => setTopupSyncMsg(''), 4000);
      }
    }
  };

  // Live Player ID verification tester
  const handleVerifyAccountTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPlayerId.trim()) return;
    setIsVerifyingAccount(true);
    setVerifyResult(null);
    try {
      const res = await verifyGameAccount(verifySlug, verifyPlayerId.trim(), verifyServerId.trim() || undefined, khmerTopupConfig.apiKey);
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyResult({ valid: false, error: err.message });
    } finally {
      setIsVerifyingAccount(false);
    }
  };

  // Hourly Key Stock Management Handlers
  const handleOpenHourlyKeyModal = (product: GameItem, pkg: GamePackage) => {
    setHourlyKeyModal({
      isOpen: true,
      product,
      packageId: pkg.id,
      durationHours: pkg.durationHours || 24,
      durationLabel: pkg.durationLabel || (lang === 'kh' ? '24 ម៉ោង (1 ថ្ងៃ)' : '24 Hours (1 Day)'),
    });
    setRawKeysInput('');
    setHourlyKeysMsg('');
  };

  const handleSaveHourlyKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hourlyKeyModal.product || !hourlyKeyModal.packageId) return;

    const parsedKeys = rawKeysInput
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);

    if (parsedKeys.length === 0) {
      setHourlyKeysMsg('⚠️ សូម Paste យ៉ាងហោចណាស់ 1 Key!');
      return;
    }

    setIsSavingHourlyKeys(true);
    try {
      await replenishPackageKeys(
        hourlyKeyModal.product,
        hourlyKeyModal.packageId,
        parsedKeys,
        hourlyKeyModal.durationHours,
        hourlyKeyModal.durationLabel
      );
      setHourlyKeysMsg(`✓ បានបញ្ចូល Key ចំនួន ${parsedKeys.length} សម្រាប់កញ្ចប់ ${hourlyKeyModal.durationLabel} ជោគជ័យ!`);
      setRawKeysInput('');
      setTimeout(() => {
        setHourlyKeyModal((prev) => ({ ...prev, isOpen: false }));
        setHourlyKeysMsg('');
      }, 1500);
    } catch (err: any) {
      setHourlyKeysMsg(`⚠️ Error: ${err.message}`);
    } finally {
      setIsSavingHourlyKeys(false);
    }
  };

  const handleClearPackageKeys = async (product: GameItem, packageId: string) => {
    if (!confirm('តើអ្នកពិតជាចង់លុប License Keys ទាំងអស់ចេញពីកញ្ចប់នេះមែនទេ?')) return;
    const updatedPackages = product.packages.map((pkg) => {
      if (pkg.id === packageId) {
        return { ...pkg, keys: [], stock: 0 };
      }
      return pkg;
    });
    const totalStock = updatedPackages.reduce((sum, p) => sum + (p.stock || 0), 0);
    await saveProduct({ ...product, packages: updatedPackages, stockCount: totalStock });
    if (viewingKeysPackage) {
      setViewingKeysPackage(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchTerm.toLowerCase().trim();
    return !q || p.title.toLowerCase().includes(q) || p.titleKh.toLowerCase().includes(q) || p.id.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-5xl rounded-3xl bg-[#14120e] border border-amber-500/30 shadow-2xl shadow-black flex flex-col h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-[#191612]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>K-STORE KH Admin &amp; Stock Center</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE CLOUD
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                {lang === 'kh'
                  ? 'គ្រប់គ្រង Products, កែប្រែរូបភាព, ពិនិត្យ & បន្ថែមចំនួន Stock, RBAC និង Activity Logs'
                  : 'Product & Stock Management, Custom Images, Inventory Replenishment & RBAC'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                title="ចាកចេញពី Admin (Logout)"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ចាកចេញ (Logout)</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#100f0c] border-b border-stone-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'products'
                ? 'bg-amber-400 text-black font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{lang === 'kh' ? 'គ្រប់គ្រង Products' : 'Products Manager'} ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stocks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'stocks'
                ? 'bg-amber-400 text-black font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>{lang === 'kh' ? 'ពិនិត្យ & បន្ថែម Stock' : 'Stock Replenishment'}</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'logs'
                ? 'bg-amber-400 text-black font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{lang === 'kh' ? 'Activity Logs' : 'Audit Stream'} ({activityLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'users'
                ? 'bg-amber-400 text-black font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{lang === 'kh' ? 'RBAC Users' : 'RBAC Users'}</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'orders'
                ? 'bg-amber-400 text-black font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{lang === 'kh' ? 'Top-Up Orders' : 'Top-Up Orders'} ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'payments'
                ? 'bg-amber-400 text-black font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{lang === 'kh' ? 'Settings Payment' : 'Payment Gateway'} (ABA / Bakong)</span>
          </button>

          <button
            onClick={() => setActiveTab('khmer_topup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'khmer_topup'
                ? 'bg-amber-400 text-black font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>API Khmer-TopUp</span>
            {khmerTopupConfig.apiKey ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ) : null}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {/* TAB 1: PRODUCTS MANAGER */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={lang === 'kh' ? 'ស្វែងរក Product...' : 'Search products...'}
                    className="w-full pl-9 pr-3 py-1.5 bg-[#1b1814] border border-stone-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowStockGuide(!showStockGuide)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#201d17] hover:bg-stone-800 text-xs text-amber-400 border border-amber-500/30 font-bold"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>{lang === 'kh' ? 'ព័ត៌មានអំពីរបៀបប្រើ Stock' : 'Stock Instructions'}</span>
                  </button>

                  <button
                    onClick={handleOpenNewProduct}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-black text-xs transition shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'kh' ? 'បន្ថែម Product ថ្មី' : 'Add New Product'}</span>
                  </button>
                </div>
              </div>

              {/* Stock Guide Cambodian Instructions */}
              {showStockGuide && (
                <div className="p-4 rounded-2xl bg-[#1a1713] border border-amber-500/40 space-y-2 text-xs text-stone-300">
                  <h3 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4" />
                    <span>ព័ត៌មាន និងការណែនាំអំពីការប្រើប្រាស់ Stock &amp; Image Management</span>
                  </h3>
                  <ul className="list-disc list-inside space-y-1.5 text-stone-300 leading-relaxed">
                    <li>
                      <strong>១. របៀបកែប្រែរូបភាព Product:</strong> ចុចលើប៊ូតុង <span className="text-amber-300 font-bold">Edit</span> លើ Product ណាមួយ រួចបញ្ចូល Image URL ថ្មី ឬជ្រើសរើស <em>Image Presets</em> គុណភាពខ្ពស់ដែលត្រៀមរួចជាស្រេច។
                    </li>
                    <li>
                      <strong>២. របៀបពិនិត្យ &amp; បន្ថែម Stocks:</strong> ចូលទៅកាន់ Tab <span className="text-amber-300 font-bold">"ពិនិត្យ &amp; បន្ថែម Stock"</span> ដើម្បីមើលចំនួនស្តុកនៃកញ្ចប់នីមួយៗ។ ចុច <span className="text-emerald-400 font-bold">+10</span>, <span className="text-emerald-400 font-bold">+50</span>, ឬ <span className="text-emerald-400 font-bold">+100</span> ដើម្បីបន្ថែមស្តុកភ្លាមៗ។
                    </li>
                    <li>
                      <strong>៣. ការកាត់ស្កុកស្វ័យប្រវត្ត:</strong> នៅពេលមានអតិថិជនកុម្ម៉ង់ទិញពេជ្រ ឬ Voucher ជោគជ័យ ចំនួនស្តុកនឹងត្រូវកាត់ចេញពី Database ស្វ័យប្រវត្ត។
                    </li>
                    <li>
                      <strong>៤. ស្ថានភាពស្តុក:</strong> បង្ហាញជាសញ្ញា <span className="text-emerald-400 font-bold">In Stock</span>, <span className="text-amber-400 font-bold">Low Stock (&lt; 20)</span>, ឬ <span className="text-red-400 font-bold">Out of Stock (= 0)</span>។
                    </li>
                  </ul>
                </div>
              )}

              {/* Products Table */}
              <div className="rounded-xl border border-stone-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1814] text-stone-400 uppercase font-black tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="p-3">Product Image &amp; Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Badge</th>
                      <th className="p-3">Packages</th>
                      <th className="p-3">Total Stock</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {filteredProducts.map((prod) => {
                      const totalStock = prod.stockCount ?? prod.packages.reduce((sum, p) => sum + (p.stock ?? 100), 0);
                      return (
                        <tr key={prod.id} className="hover:bg-[#181612]">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={prod.coverImage}
                                alt={prod.title}
                                className="w-11 h-11 rounded-xl object-cover border border-stone-800 shadow"
                              />
                              <div>
                                <div className="font-extrabold text-white text-sm">{prod.title}</div>
                                <div className="text-[11px] text-amber-400">{prod.titleKh}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono uppercase text-stone-300">{prod.category}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              {prod.badge || 'TOPUP'}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-stone-200">{prod.packages.length} Packages</td>
                          <td className="p-3">
                            {totalStock === 0 ? (
                              <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 font-black border border-red-500/30">
                                0 Units (Out of Stock)
                              </span>
                            ) : totalStock < 20 ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black border border-amber-500/30">
                                {totalStock} Units (Low Stock)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                                {totalStock} Units
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditProduct(prod)}
                                className="p-1.5 rounded-lg bg-[#25211b] hover:bg-[#322a22] text-amber-400 border border-stone-700 transition"
                                title="Edit Product & Cover Image"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProd(prod.id)}
                                className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 transition"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: STOCK REPLENISHMENT & INVENTORY */}
          {activeTab === 'stocks' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#1a1713] border border-amber-500/30 text-xs text-stone-300 flex items-center justify-between">
                <div>
                  <strong className="text-amber-400 font-bold block text-sm">
                    {lang === 'kh' ? 'គ្រប់គ្រង & បន្ថែមស្តុក (Stock Replenishment Portal)' : 'Inventory & Stock Management'}
                  </strong>
                  <span>{lang === 'kh' ? 'ចុចប៊ូតុង +10, +50, ឬ +100 ដើម្បីបន្ថែមស្តុកកញ្ចប់នីមួយៗស្វ័យប្រវត្ត' : 'Click +10, +50, or +100 to instantly add stock for any package'}</span>
                </div>
              </div>

              <div className="space-y-3">
                {products.map((prod) => (
                  <div key={prod.id} className="p-4 rounded-2xl bg-[#171410] border border-stone-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                      <div className="flex items-center gap-3">
                        <img src={prod.coverImage} alt={prod.title} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <h4 className="text-sm font-black text-white">{prod.title}</h4>
                          <span className="text-xs text-stone-400">{prod.titleKh}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        Total Stock: {prod.stockCount ?? 100} Units
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {prod.packages.map((pkg) => {
                        const stockVal = pkg.stock ?? 100;
                        return (
                          <div key={pkg.id} className="p-3 rounded-xl bg-[#100e0c] border border-stone-800 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                              <span>{pkg.name}</span>
                              <span className="text-amber-400">${pkg.priceUsd.toFixed(2)} USD</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-stone-400">Stock Count:</span>
                              <strong className={`font-mono ${stockVal === 0 ? 'text-red-400' : stockVal < 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {stockVal} Units
                              </strong>
                            </div>

                            {/* Duration Badge & Stored Keys */}
                            <div className="flex items-center justify-between text-[11px] pt-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[10px]">
                                ⏱ {pkg.durationLabel || (pkg.durationHours ? `${pkg.durationHours} ម៉ោង` : 'Standard')}
                              </span>
                              {pkg.keys && pkg.keys.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setViewingKeysPackage({ pkg, prod })}
                                  className="text-[10px] text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>{pkg.keys.length} Keys</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-stone-500">0 Keys</span>
                              )}
                            </div>

                            {/* Hourly Key Replenishment & Numeric Buttons */}
                            <div className="space-y-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleOpenHourlyKeyModal(prod, pkg)}
                                className="w-full py-1 px-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 border border-amber-500/40 text-amber-300 text-[11px] font-black flex items-center justify-center gap-1.5 transition active:scale-98"
                              >
                                <Key className="w-3 h-3" />
                                <span>🔑 បញ្ចូល Key តាមម៉ោង</span>
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleReplenish(prod, pkg.id, 10)}
                                  className="flex-1 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold border border-stone-700 transition"
                                >
                                  +10
                                </button>
                                <button
                                  onClick={() => handleReplenish(prod, pkg.id, 50)}
                                  className="flex-1 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold border border-stone-700 transition"
                                >
                                  +50
                                </button>
                                <button
                                  onClick={() => handleReplenish(prod, pkg.id, 100)}
                                  className="flex-1 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold border border-stone-700 transition"
                                >
                                  +100
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REAL-TIME ACTIVITY LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={lang === 'kh' ? 'ស្វែងរកក្នុងកំណត់ត្រា...' : 'Search logs...'}
                    className="w-full pl-9 pr-3 py-1.5 bg-[#1b1814] border border-stone-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-stone-400" />
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="bg-[#1b1814] border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none"
                  >
                    <option value="all">{lang === 'kh' ? 'កម្រិតទាំងអស់ (All)' : 'All Levels'}</option>
                    <option value="security">Security</option>
                    <option value="action">Action</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[#181612] border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 mt-0.5 ${
                          log.level === 'security'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : log.level === 'action'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {log.level}
                      </span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{log.action}</span>
                          <span className="text-stone-400 font-normal">by {log.userEmail}</span>
                        </div>
                        <p className="text-stone-300 mt-0.5">{log.details}</p>
                      </div>
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RBAC USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-stone-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1814] text-stone-400 uppercase font-black tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="p-3">User Email &amp; UID</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Balance</th>
                      <th className="p-3 text-right">Assign RBAC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {userList.map((usr) => (
                      <tr key={usr.uid} className="hover:bg-[#181612]">
                        <td className="p-3">
                          <div className="font-bold text-white">{usr.displayName}</div>
                          <div className="text-[11px] text-stone-400">{usr.email}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {usr.role}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-400">${(usr.balanceUsd ?? 0).toFixed(2)} USD</td>
                        <td className="p-3 text-right">
                          <select
                            value={usr.role}
                            onChange={(e) => handleRoleChange(usr.uid, e.target.value as UserRole)}
                            className="bg-[#221f1a] border border-stone-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-stone-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1b1814] text-stone-400 uppercase font-black tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="p-3">Order Ref</th>
                      <th className="p-3">Game &amp; Package</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Player ID</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {orders.map((ord) => (
                      <tr key={ord.orderId} className="hover:bg-[#181612]">
                        <td className="p-3 font-mono font-bold text-white">{ord.orderId}</td>
                        <td className="p-3">
                          <div className="font-bold text-white">{ord.gameTitle}</div>
                          <div className="text-stone-400 text-[11px]">{ord.packageTitle}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-400">${ord.amountUsd.toFixed(2)} USD</td>
                        <td className="p-3 font-mono text-stone-200">{ord.playerId}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${ord.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <select
                            value={ord.status}
                            onChange={(e) => handleStatusChange(ord.orderId, e.target.value)}
                            className="bg-[#221f1a] border border-stone-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS PAYMENT (ABA PAYWAY & BAKONG KHQR) */}
          {activeTab === 'payments' && (
            <div className="space-y-4 max-w-4xl">
              {/* Header Box */}
              <div className="p-4 rounded-2xl bg-[#181612] border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>{lang === 'kh' ? 'ផ្ទាំងគ្រប់គ្រងការទូទាត់ (SETTINGS PAYMENT)' : 'Payment Gateway Management'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {paymentConfig.activeProvider === 'aba' ? 'ABA PAYWAY ACTIVE' : 'BAKONG KHQR ACTIVE'}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-400">
                      {lang === 'kh'
                        ? 'កំណត់ Gateway រវាង ABA PayWay ឬ Bakong KHQR និងកែប្រែ API Key, Merchant ID ដោយផ្ទាល់'
                        : 'Switch gateways, customize API credentials, and manage automated payment verification'}
                    </p>
                  </div>
                </div>

                {/* Quick Switch Buttons */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...paymentConfig, activeProvider: 'aba' as const };
                      setPaymentConfig(next);
                      saveStoredPaymentSettings(next);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                      paymentConfig.activeProvider === 'aba'
                        ? 'bg-[#0A243F] text-white border border-red-500 shadow-md'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    ABA PayWay {paymentConfig.activeProvider === 'aba' ? '✓' : ''}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...paymentConfig, activeProvider: 'bakong' as const };
                      setPaymentConfig(next);
                      saveStoredPaymentSettings(next);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                      paymentConfig.activeProvider === 'bakong'
                        ? 'bg-red-950 text-white border border-red-500 shadow-md'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Bakong KHQR {paymentConfig.activeProvider === 'bakong' ? '✓' : ''}
                  </button>
                </div>
              </div>

              {paymentSaveMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{paymentSaveMsg}</span>
                </div>
              )}

              {/* Form Settings */}
              <form onSubmit={handleSavePaymentConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: ABA PayWay & Khmer-System Gateway */}
                  <div className="p-4 rounded-2xl bg-[#181612] border border-blue-900/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">
                          ABA Bank KHQR & PayWay Gateway
                        </h4>
                      </div>
                      <span className="text-[10px] text-blue-400 font-bold">ABA Mobile Official</span>
                    </div>

                    <div>
                      <label className="block text-stone-300 text-xs font-bold mb-1">
                        លេខគណនី ABA Bank / ID (e.g. 001234567 ឬ sokhin_sory@abaa):
                      </label>
                      <input
                        type="text"
                        value={paymentConfig.abaAccount || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, abaAccount: e.target.value })}
                        placeholder="ឧ. 001234567 ឬ sokhin_sory@abaa"
                        className="w-full px-3 py-2 bg-[#12110e] border border-blue-500/50 rounded-lg text-white font-mono text-xs focus:border-blue-400 focus:outline-none"
                        required
                      />
                      <p className="text-[10px] text-blue-300/80 mt-1">
                        ℹ️ បញ្ចូលលេខគណនី ABA ៩ ខ្ទង់ ឬ Bakong ID របស់ ABA ដើម្បីឲ្យពេលស្កេនលោតចូល ABA Bank ផ្ទាល់។
                      </p>
                    </div>

                    <div>
                      <label className="block text-stone-300 text-xs font-bold mb-1">
                        ឈ្មោះម្ចាស់គណនី ABA (Account Name):
                      </label>
                      <input
                        type="text"
                        value={paymentConfig.abaAccountName || ''}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, abaAccountName: e.target.value })}
                        placeholder="ឧ. SORY SOKHIN"
                        className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white text-xs font-bold focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 text-xs font-bold mb-1">
                        ABA Profile API Key (PK_...):
                      </label>
                      <input
                        type="text"
                        value={paymentConfig.abaApiKey}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, abaApiKey: e.target.value })}
                        className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 text-xs font-bold mb-1">
                        ABA Merchant ID (e.g. Yuqg4u):
                      </label>
                      <input
                        type="text"
                        value={paymentConfig.abaMerchantId}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, abaMerchantId: e.target.value })}
                        className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 text-xs font-bold mb-1">
                        Base Gateway URL:
                      </label>
                      <input
                        type="text"
                        value={paymentConfig.gatewayUrl}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, gatewayUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Card 2: Bakong Open API & KHQR */}
                  <div className="p-4 rounded-2xl bg-[#181612] border border-red-900/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">
                          Bakong KHQR (Open API)
                        </h4>
                      </div>
                      <span className="text-[10px] text-red-400 font-bold">National Bank of Cambodia</span>
                    </div>

                    <div>
                      <label className="block text-stone-300 text-xs font-bold mb-1">
                        Bakong Account UID (e.g. sokhin_sory@bkrt):
                      </label>
                      <input
                        type="text"
                        value={paymentConfig.bakongUid}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bakongUid: e.target.value })}
                        className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 text-xs font-bold mb-1">
                        Bakong Merchant Name:
                      </label>
                      <input
                        type="text"
                        value={paymentConfig.bakongName}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bakongName: e.target.value })}
                        className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white text-xs font-bold focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 text-xs font-bold mb-1">
                        Bakong Developer JWT Token:
                      </label>
                      <textarea
                        rows={2}
                        value={paymentConfig.bakongToken}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, bakongToken: e.target.value })}
                        className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-[10px] focus:border-amber-500 focus:outline-none resize-none"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      />
                    </div>
                  </div>

                  {/* Card 3: Telegram Admin Order Alerts Service (@sorysokhin) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#181612] border border-sky-500/30 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-stone-800 gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold">
                          <Send className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <span>សេវាផ្ញើសារ Telegram Alert (Admin @sorysokhin)</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono font-bold">
                              @sorysokhin
                            </span>
                          </h4>
                          <p className="text-[11px] text-stone-400">
                            ផ្ញើសារជូនដំណឹងភ្លាមៗទៅកាន់ @sorysokhin រាល់ពេលមានអតិថិជនបញ្ជាទិញទំនិញថ្មី (Cloud Functions &amp; Server)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                          telegramSettings.enabled
                            ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                            : 'bg-stone-800 border-stone-700 text-stone-400'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${telegramSettings.enabled ? 'bg-sky-400 animate-pulse' : 'bg-stone-500'}`}></span>
                          <span>{telegramSettings.enabled ? 'ACTIVE (@sorysokhin)' : 'DISABLED'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Notification Status Message */}
                    {telegramStatusMsg && (
                      <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                        <Bell className="w-4 h-4 shrink-0 text-sky-400" />
                        <span>{telegramStatusMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-300 font-bold mb-1">
                          Admin Telegram Handle:
                        </label>
                        <input
                          type="text"
                          value="@sorysokhin"
                          readOnly
                          className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-amber-400 font-mono font-bold text-xs cursor-not-allowed"
                        />
                        <p className="text-[10px] text-stone-500 mt-1">
                          * បានកំណត់សម្រាប់ Admin: <strong>@sorysokhin</strong>
                        </p>
                      </div>

                      <div>
                        <label className="block text-stone-300 font-bold mb-1">
                          Telegram Chat ID / User ID:
                        </label>
                        <input
                          type="text"
                          value={telegramSettings.chatId}
                          onChange={(e) => setTelegramSettings({ ...telegramSettings, chatId: e.target.value })}
                          placeholder="e.g. 123456789 (ឆែកតាម @userinfobot)"
                          className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                        />
                        <p className="text-[10px] text-stone-500 mt-1">
                          * ID របស់ @sorysokhin (អាចឆែកតាមរយៈ Telegram bot: @userinfobot)
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-stone-300 font-bold mb-1">
                          Telegram Bot Token (បង្កើតតាម @BotFather):
                        </label>
                        <input
                          type="password"
                          value={telegramSettings.botToken}
                          onChange={(e) => setTelegramSettings({ ...telegramSettings, botToken: e.target.value })}
                          placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ..."
                          className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                        />
                        <p className="text-[10px] text-stone-500 mt-1">
                          * បើក Telegram &gt; ស្វែងរក <code>@BotFather</code> &gt; វាយ <code>/newbot</code> ដើម្បីយក Bot Token
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                      <button
                        type="button"
                        onClick={handleSendTestTelegramAlert}
                        disabled={isSendingTestAlert}
                        className="py-2 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-sky-400 font-bold text-xs transition border border-stone-700 flex items-center gap-1.5"
                      >
                        <Send className={`w-3.5 h-3.5 ${isSendingTestAlert ? 'animate-bounce' : ''}`} />
                        <span>{isSendingTestAlert ? 'Sending...' : 'ផ្ញើសារតេស្តទៅ @sorysokhin'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveTelegramSettings}
                        disabled={isSavingTelegram}
                        className="py-2 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black text-xs transition shadow-md shadow-sky-500/20 active:scale-95 disabled:opacity-50"
                      >
                        {isSavingTelegram ? 'រក្សាទុក...' : 'រក្សាទុក Telegram Alert'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingPayment}
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                  >
                    {isSavingPayment ? 'រក្សាទុក...' : 'រក្សាទុកការកំណត់ទូទាត់ (Save Settings)'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 7: KHMER-TOPUP API INTEGRATION (https://khmer-topup.co / https://khmer-topup.com/api/v1) */}
          {activeTab === 'khmer_topup' && (
            <div className="space-y-4 max-w-4xl">
              {/* Header Card */}
              <div className="p-4 rounded-2xl bg-[#181612] border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xl shadow-lg shadow-amber-500/10">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <span>API KHMER-TOPUP (khmer-topup.co)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                        V1 JSON API
                      </span>
                    </h3>
                    <p className="text-xs text-stone-400">
                      {lang === 'kh'
                        ? 'ទាញយកតម្លៃ និងសេវាកម្មទាំងអស់ស្វ័យប្រវត្ត រួមទាំងរូបភាព ឈ្មោះ និងផ្ទៀងផ្ទាត់ Player ID ផ្ទាល់'
                        : 'Auto-pull games, packages, discounted reseller prices and verify player accounts in real-time'}
                    </p>
                  </div>
                </div>

                {/* Reseller Wallet Balance Display */}
                <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-black/60 border border-stone-800">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      {topupBalanceData?.username ? `@${topupBalanceData.username}` : 'Reseller Wallet'}
                    </div>
                    <div className="text-sm font-black text-amber-400 font-mono">
                      {topupBalanceData?.balance !== undefined
                        ? `$${topupBalanceData.balance.toFixed(2)} ${topupBalanceData.currency || 'USD'}`
                        : khmerTopupConfig.balance !== undefined
                        ? `$${khmerTopupConfig.balance.toFixed(2)} USD`
                        : '--.-- USD'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckTopupBalance}
                    disabled={isCheckingBalance || !khmerTopupConfig.apiKey}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition disabled:opacity-50"
                    title="Refresh Balance"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCheckingBalance ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Status/Message Alert */}
              {topupSyncMsg && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{topupSyncMsg}</span>
                </div>
              )}

              {/* Grid: Credentials & Auto-Sync */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. API Credentials Card */}
                <div className="p-4 rounded-2xl bg-[#181612] border border-stone-800 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        API Authentication (Secret Key)
                      </h4>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">Rate Limit: 120/min</span>
                  </div>

                  <form onSubmit={handleSaveKhmerTopupConfig} className="space-y-3">
                    <div>
                      <label className="block text-stone-300 text-xs font-bold mb-1">
                        API Secret Key:
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={khmerTopupConfig.apiKey}
                          onChange={(e) => setKhmerTopupConfig({ ...khmerTopupConfig, apiKey: e.target.value })}
                          placeholder="Bearer YOUR_API_KEY"
                          className="w-full pl-3 pr-10 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2.5 top-2.5 text-stone-400 hover:text-white"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1">
                        * បញ្ចូល API Key ទទួលបានពី Khmer-TopUp.co / Khmer-Topup.com
                      </p>
                    </div>

                    <div>
                      <label className="block text-stone-300 text-xs font-bold mb-1">
                        Base Endpoint URL:
                      </label>
                      <input
                        type="text"
                        value={khmerTopupConfig.baseUrl}
                        onChange={(e) => setKhmerTopupConfig({ ...khmerTopupConfig, baseUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                        required
                      />
                      <p className="text-[10px] text-stone-500 mt-1">
                        Standard: <code>https://khmer-topup.com/api/v1</code>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleCheckTopupBalance}
                        disabled={isCheckingBalance || !khmerTopupConfig.apiKey}
                        className="py-1.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3 h-3 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                        <span>Check Balance</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isSavingTopupConfig}
                        className="py-1.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition"
                      >
                        {isSavingTopupConfig ? 'រក្សាទុក...' : 'រក្សាទុក API Key'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2. Automated Sync Card */}
                <div className="p-4 rounded-2xl bg-[#181612] border border-stone-800 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">
                          ទាញតម្លៃ និងទំនិញស្វ័យប្រវត្តិ (Auto-Sync)
                        </h4>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">1-Click Live Import</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-stone-800/80 text-xs text-stone-300 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">Sync Target:</span>
                        <strong className="text-white font-mono">/api/v1/games</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">Last Synced:</span>
                        <span className="text-amber-400 font-mono">
                          {khmerTopupConfig.lastSyncTime
                            ? new Date(khmerTopupConfig.lastSyncTime).toLocaleTimeString()
                            : 'Not synced yet'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">Current Catalog:</span>
                        <span className="text-emerald-400 font-bold">{products.length} Products</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      * ចុចប៊ូតុងខាងក្រោមដើម្បីទាញយកហ្គេម និងកញ្ចប់ពេជ្រទាំងអស់ (Mobile Legends, Free Fire, PUBG, 8 Ball Pool, etc.) ជាមួយតម្លៃ Reseller និងរូបភាពស្អាតកម្រិតខ្ពស់ចូលក្នុង Website ភ្លាមៗ!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleAutoSyncKhmerTopup}
                      disabled={isSyncingTopup}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingTopup ? 'animate-spin' : ''}`} />
                      <span>
                        {isSyncingTopup
                          ? 'កំពុងទាញទិន្នន័យ (Syncing Games...)'
                          : '🔄 ទាញទំនិញ & តម្លៃស្វ័យប្រវត្តិ (Sync Now)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePurgeMockProducts}
                      disabled={isSyncingTopup}
                      className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 font-bold text-xs uppercase tracking-wider transition active:scale-98 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>🗑️ សម្អាតទិន្នន័យគំរូចាស់ (Purge Mock)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION: RESELLER PROFIT MARGIN (%) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#181612] border border-amber-500/40 space-y-4 shadow-lg shadow-amber-500/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-stone-800 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>កំណត់ភាគរយលក់តចំណេញ (Reseller Profit Margin %)</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                          +{khmerTopupConfig.profitPercentage ?? 5}%
                        </span>
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        កំណត់ភាគរយបន្ថែមលើតម្លៃដើម Khmer-TopUp ស្វ័យប្រវត្ត សម្រាប់ដាក់លក់យកចំណេញលើ Website
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right px-3 py-1.5 rounded-xl bg-black/40 border border-stone-800/80">
                    <span className="text-[11px] text-stone-400">ឧទាហរណ៍៖ </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      ដើម $1.00 ➔ លក់ចេញ ${(1 * (1 + (khmerTopupConfig.profitPercentage ?? 5) / 100)).toFixed(2)} (+${(1 * ((khmerTopupConfig.profitPercentage ?? 5) / 100)).toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-stone-400 font-medium">ជ្រើសរើសភាគរយរហ័ស (Quick Presets):</span>
                    {[0, 5, 8, 10, 12, 15, 20, 25].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleUpdateProfitPercentage(pct)}
                        disabled={isSyncingTopup}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition font-mono ${
                          (khmerTopupConfig.profitPercentage ?? 5) === pct
                            ? 'bg-amber-400 text-black shadow-md font-black ring-2 ring-amber-400/50'
                            : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                        }`}
                      >
                        {pct === 0 ? '0% (តម្លៃដើម)' : `+${pct}%`}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-xs text-stone-400 shrink-0 font-medium">
                        ឬបញ្ចូលភាគរយផ្ទាល់ខ្លួន (Custom %):
                      </label>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={customProfitInput}
                          onChange={(e) => setCustomProfitInput(e.target.value)}
                          placeholder="ឧ. 10"
                          className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-xl text-white font-mono text-xs focus:border-amber-500 focus:outline-none pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs font-bold font-mono">
                          %
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateProfitPercentage(parseFloat(customProfitInput) || 0)}
                      disabled={isSyncingTopup || !customProfitInput}
                      className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>អនុវត្ត & គណនាតម្លៃឡើងវិញ (Apply Profit %)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION: AUTOMATIC API SYNCHRONIZATION SCHEDULER */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#181612] border border-amber-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-stone-800 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>កាលវិភាគ Sync ស្វ័យប្រវត្តិ (Automatic API Sync Scheduler)</span>
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        បើក/បិទការទាញតម្លៃ និងទំនិញស្វ័យប្រវត្តពី Khmer-TopUp តាមចំនួននាទីកំណត់
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {khmerTopupConfig.autoSync ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>ACTIVE ({khmerTopupConfig.syncIntervalMinutes || 30}m)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-stone-800 border border-stone-700 text-stone-400 text-xs font-bold">
                        ⏸ PAUSED (Manual Only)
                      </span>
                    )}
                  </div>
                </div>

                {/* Enable/Disable Toggle Box */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-stone-800 flex items-center justify-between gap-4">
                  <div>
                    <strong className="text-white text-xs block font-bold">
                      {lang === 'kh'
                        ? 'បើកដំណើរការ Automatic API Synchronization'
                        : 'Enable Automatic API Synchronization'}
                    </strong>
                    <span className="text-[11px] text-stone-400">
                      {khmerTopupConfig.autoSync
                        ? 'ប្រព័ន្ធកំពុងដំណើរការ Sync ស្វ័យប្រវត្តក្នុង Background តាមចន្លោះពេលដែលបានកំណត់'
                        : 'ការ Sync ស្វ័យប្រវត្តត្រូវបានបិទ — អ្នកអាចចុចប៊ូតុង Sync ដោយដៃបានគ្រប់ពេល'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAutoSync(!khmerTopupConfig.autoSync)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      khmerTopupConfig.autoSync ? 'bg-emerald-500' : 'bg-stone-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        khmerTopupConfig.autoSync ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Frequency Interval Configuration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                      <span>ភាពញឹកញាប់នៃការ Sync (Sync Frequency Interval):</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      រៀងរាល់ {khmerTopupConfig.syncIntervalMinutes || 30} នាទីម្តង (Every {khmerTopupConfig.syncIntervalMinutes || 30} min)
                    </span>
                  </div>

                  {/* Input field */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        max="10080"
                        value={khmerTopupConfig.syncIntervalMinutes || 30}
                        onChange={(e) =>
                          handleUpdateSyncInterval(parseInt(e.target.value, 10) || 30)
                        }
                        placeholder="e.g. 30"
                        className="w-full pl-3 pr-20 py-2 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-xs focus:border-amber-500 focus:outline-none font-bold"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] font-bold text-stone-400">
                        នាទី (Minutes)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateSyncInterval(khmerTopupConfig.syncIntervalMinutes || 30)}
                      className="py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition"
                    >
                      រក្សាទុក
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="pt-1">
                    <span className="text-[10px] text-stone-400 font-bold block mb-1">ជម្រើស Preset ញឹកញាប់:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { min: 5, label: '5 នាទី' },
                        { min: 15, label: '15 នាទី' },
                        { min: 30, label: '30 នាទី' },
                        { min: 60, label: '1 ម៉ោង (60m)' },
                        { min: 120, label: '2 ម៉ោង (120m)' },
                        { min: 360, label: '6 ម៉ោង (360m)' },
                        { min: 1440, label: '24 ម៉ោង (1 ថ្ងៃ)' },
                      ].map((preset) => {
                        const isSelected = (khmerTopupConfig.syncIntervalMinutes || 30) === preset.min;
                        return (
                          <button
                            key={preset.min}
                            type="button"
                            onClick={() => handleUpdateSyncInterval(preset.min)}
                            className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition border ${
                              isSelected
                                ? 'bg-amber-400 text-black border-amber-400 font-black shadow-sm'
                                : 'bg-black/50 text-stone-300 border-stone-800 hover:border-stone-700 hover:text-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Metrics / Next Sync Schedule Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-stone-800">
                    <span className="text-stone-400 block text-[10px]">Sync Status:</span>
                    <strong className={khmerTopupConfig.autoSync ? 'text-emerald-400' : 'text-stone-400'}>
                      {khmerTopupConfig.autoSync ? 'Auto-Running' : 'Disabled'}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-stone-800">
                    <span className="text-stone-400 block text-[10px]">Frequency:</span>
                    <strong className="text-amber-400 font-mono">
                      Every {khmerTopupConfig.syncIntervalMinutes || 30} mins
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-stone-800">
                    <span className="text-stone-400 block text-[10px]">Last Sync:</span>
                    <strong className="text-stone-200 font-mono">
                      {khmerTopupConfig.lastSyncTime
                        ? new Date(khmerTopupConfig.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Never'}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-stone-800">
                    <span className="text-stone-400 block text-[10px]">Next Run:</span>
                    <strong className="text-sky-400 font-mono">
                      {khmerTopupConfig.autoSync && khmerTopupConfig.nextSyncTime
                        ? new Date(khmerTopupConfig.nextSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : khmerTopupConfig.autoSync
                        ? `In ~${khmerTopupConfig.syncIntervalMinutes || 30} mins`
                        : 'Paused'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3. Account Verification Live Tester Widget (/api/v1/check) */}
              <div className="p-4 rounded-2xl bg-[#181612] border border-stone-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-400"></div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      តេស្តផ្ទៀងផ្ទាត់ Game Account (/api/v1/check)
                    </h4>
                  </div>
                  <span className="text-[10px] text-sky-400 font-mono">Live Player Nickname Checker</span>
                </div>

                <form onSubmit={handleVerifyAccountTest} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-300 mb-1">ហ្គេម (Game Slug):</label>
                    <select
                      value={verifySlug}
                      onChange={(e) => setVerifySlug(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#12110e] border border-stone-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="mobile-legends">Mobile Legends</option>
                      <option value="free-fire">Free Fire</option>
                      <option value="pubg-mobile">PUBG Mobile</option>
                      <option value="honor-of-kings">Honor of Kings</option>
                      <option value="8-ball-pool">8 Ball Pool</option>
                      <option value="roblox">Roblox</option>
                      <option value="genshin-impact">Genshin Impact</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-300 mb-1">Player ID / User ID:</label>
                    <input
                      type="text"
                      value={verifyPlayerId}
                      onChange={(e) => setVerifyPlayerId(e.target.value)}
                      placeholder="12345678"
                      className="w-full px-2.5 py-1.5 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-300 mb-1">Zone / Server ID:</label>
                    <input
                      type="text"
                      value={verifyServerId}
                      onChange={(e) => setVerifyServerId(e.target.value)}
                      placeholder="1234 (if needed)"
                      className="w-full px-2.5 py-1.5 bg-[#12110e] border border-stone-700 rounded-lg text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isVerifyingAccount || !verifyPlayerId}
                      className="w-full py-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-black text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Zap className={`w-3.5 h-3.5 ${isVerifyingAccount ? 'animate-bounce' : ''}`} />
                      <span>{isVerifyingAccount ? 'Checking...' : 'Check Account'}</span>
                    </button>
                  </div>
                </form>

                {/* Verification Result Box */}
                {verifyResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                      verifyResult.valid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{verifyResult.valid ? 'VALID ✓' : 'INVALID ✗'}</span>
                      {verifyResult.nickname && (
                        <span>
                          Player Nickname: <strong className="text-white underline">{verifyResult.nickname}</strong>
                        </span>
                      )}
                      {verifyResult.error && <span>{verifyResult.error}</span>}
                    </div>
                    <span className="text-[10px] text-stone-400">Response from khmer-topup</span>
                  </div>
                )}
              </div>

              {/* 4. SECTION: ADMIN SECURITY & LOGIN CREDENTIALS */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#181612] border border-stone-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-stone-800 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                        គណនី និងលេខកូដសម្ងាត់ Admin (Admin Login Credentials)
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        កែប្រែ Username និងលេខកូដសម្ងាត់សម្រាប់ Login ចូល Admin Dashboard
                      </p>
                    </div>
                  </div>
                </div>

                {adminCredsMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>{adminCredsMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveAdminCreds} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-300 font-bold mb-1">Admin Username:</label>
                    <input
                      type="text"
                      value={adminCreds.username}
                      onChange={(e) => setAdminCreds({ ...adminCreds, username: e.target.value })}
                      className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-stone-300 font-bold mb-1">Security Code / Password ថ្មី:</label>
                    <input
                      type="text"
                      value={adminCreds.code}
                      onChange={(e) => setAdminCreds({ ...adminCreds, code: e.target.value })}
                      className="w-full px-3 py-2 bg-[#12110e] border border-stone-700 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-800">
                    <p className="text-[11px] text-amber-400/90 font-medium">
                      ⚠️ ចំណាំ៖ នៅពេលរក្សាទុកលេខកូដថ្មីរួច លេខកូដចាស់ (888888 / 123456) នឹងត្រូវបានលុបចោលទាំងស្រុង។
                    </p>
                    <div className="flex items-center gap-2">
                      {onLogout && (
                        <button
                          type="button"
                          onClick={onLogout}
                          className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition"
                        >
                          🚪 ចាកចេញដើម្បីតេស្ត Login ថ្មី
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSavingCreds}
                        className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition active:scale-98 shadow-md"
                      >
                        {isSavingCreds ? 'រក្សាទុក...' : '💾 រក្សាទុកលេខកូដសម្ងាត់ Admin'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hourly Key Stock Replenishment Modal */}
      {hourlyKeyModal.isOpen && hourlyKeyModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#14120e] border border-amber-500/40 p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setHourlyKeyModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center hover:bg-stone-700 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  បញ្ចូល License Keys តាមចំនួនម៉ោង (Hourly / Duration Keys)
                </h3>
                <span className="text-[11px] text-stone-400">
                  {hourlyKeyModal.product.title} - [Pkg: {hourlyKeyModal.packageId}]
                </span>
              </div>
            </div>

            {hourlyKeysMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                {hourlyKeysMsg}
              </div>
            )}

            <form onSubmit={handleSaveHourlyKeys} className="space-y-3.5 text-xs">
              {/* Duration Presets */}
              <div>
                <label className="block text-stone-300 font-bold mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>ជ្រើសរើសចំនួនម៉ោង / រយៈពេល (Duration Preset):</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {[
                    { hours: 1, label: '1 ម៉ោង (1 Hour)' },
                    { hours: 2, label: '2 ម៉ោង (2 Hours)' },
                    { hours: 6, label: '6 ម៉ោង (6 Hours)' },
                    { hours: 12, label: '12 ម៉ោង (12 Hours)' },
                    { hours: 24, label: '24 ម៉ោង (1 ថ្ងៃ)' },
                    { hours: 72, label: '3 ថ្ងៃ (72 ម៉ោង)' },
                    { hours: 168, label: '7 ថ្ងៃ (1 សប្តាហ៍)' },
                    { hours: 720, label: '30 ថ្ងៃ (1 ខែ)' },
                  ].map((preset) => {
                    const isSelected = hourlyKeyModal.durationHours === preset.hours;
                    return (
                      <button
                        key={preset.hours}
                        type="button"
                        onClick={() =>
                          setHourlyKeyModal((prev) => ({
                            ...prev,
                            durationHours: preset.hours,
                            durationLabel: preset.label,
                          }))
                        }
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition border ${
                          isSelected
                            ? 'bg-amber-400 text-black border-amber-400 shadow-md font-black'
                            : 'bg-[#1b1814] text-stone-300 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Duration Label */}
              <div>
                <label className="block text-stone-300 font-bold mb-1">ឈ្មោះកញ្ចប់ម៉ោង (Duration Label):</label>
                <input
                  type="text"
                  value={hourlyKeyModal.durationLabel}
                  onChange={(e) =>
                    setHourlyKeyModal((prev) => ({ ...prev, durationLabel: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-[#1b1814] border border-stone-700 rounded-lg text-white font-bold text-xs focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              {/* Large Textarea for License Keys */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-300 font-bold">
                    Paste License Keys (មួយបន្ទាត់ = 1 Key):
                  </label>
                  <span className="text-amber-400 font-mono font-bold text-[11px]">
                    {rawKeysInput.split('\n').filter((k) => k.trim()).length} Keys Detected
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={rawKeysInput}
                  onChange={(e) => setRawKeysInput(e.target.value)}
                  placeholder={`TRLL-XXXX-YYYY-1HOUR\nTRLL-AAAA-BBBB-1HOUR\nTRLL-CCCC-DDDD-1HOUR`}
                  className="w-full p-3 bg-[#110f0c] border border-stone-700 rounded-xl text-white font-mono text-xs focus:border-amber-500 focus:outline-none resize-none"
                  required
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  * Key នីមួយៗនឹងត្រូវបានបញ្ជូនទៅកាន់អតិថិជនស្វ័យប្រវត្តិ នៅពេលពួកគេបញ្ជាទិញកញ្ចប់ម៉ោងនេះ។
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setHourlyKeyModal((prev) => ({ ...prev, isOpen: false }))}
                  className="py-2 px-4 rounded-xl bg-stone-800 text-stone-300 font-bold hover:bg-stone-700 transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSavingHourlyKeys}
                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSavingHourlyKeys ? 'កំពុងបញ្ចូល...' : '✓ បញ្ចូល Keys ក្នុងស្តុក'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Stored Keys Modal */}
      {viewingKeysPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#14120e] border border-emerald-500/40 p-5 shadow-2xl max-h-[85vh] flex flex-col">
            <button
              onClick={() => setViewingKeysPackage(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center hover:bg-stone-700 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  បញ្ជី Keys ក្នុងស្តុក ({viewingKeysPackage.pkg.keys?.length ?? 0} Keys)
                </h3>
                <span className="text-[11px] text-stone-400">
                  {viewingKeysPackage.prod.title} - {viewingKeysPackage.pkg.name}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-black/60 border border-stone-800 font-mono text-xs">
              {viewingKeysPackage.pkg.keys && viewingKeysPackage.pkg.keys.length > 0 ? (
                viewingKeysPackage.pkg.keys.map((keyStr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded bg-stone-900 border border-stone-800 text-stone-200"
                  >
                    <span>
                      {idx + 1}. {keyStr}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(keyStr)}
                      className="text-stone-400 hover:text-white p-1"
                      title="Copy Key"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center text-stone-500 py-6">គ្មាន Key ក្នុងស្តុកនៅឡើយទេ</div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-800 mt-3 text-xs">
              <button
                type="button"
                onClick={() =>
                  handleClearPackageKeys(viewingKeysPackage.prod, viewingKeysPackage.pkg.id)
                }
                className="py-1.5 px-3 rounded-lg bg-red-950 text-red-300 border border-red-800 font-bold hover:bg-red-900 transition"
              >
                លុប Keys ទាំងអស់
              </button>

              <button
                type="button"
                onClick={() => {
                  const allKeys = (viewingKeysPackage.pkg.keys || []).join('\n');
                  navigator.clipboard.writeText(allKeys);
                  alert(`Copied ${viewingKeysPackage.pkg.keys?.length || 0} keys to clipboard!`);
                }}
                className="py-1.5 px-4 rounded-lg bg-emerald-500 text-black font-black hover:bg-emerald-400 transition"
              >
                ចម្លង Keys ទាំងអស់
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Edit / Create Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#14120e] border border-amber-500/40 p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-black text-white mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              <span>{productForm.id ? 'កែប្រែ Product & រូបភាព' : 'បន្ថែម Product ថ្មី'}</span>
            </h3>

            <form onSubmit={handleSaveProductForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-300 font-bold mb-1">ចំណងជើង Product (English):</label>
                <input
                  type="text"
                  value={productForm.title || ''}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  placeholder="e.g. Free Fire Diamonds"
                  className="w-full px-3 py-2 bg-[#1b1814] border border-stone-800 rounded-lg text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">ចំណងជើង Product (Khmer):</label>
                <input
                  type="text"
                  value={productForm.titleKh || ''}
                  onChange={(e) => setProductForm({ ...productForm, titleKh: e.target.value })}
                  placeholder="ឧ. ពេជ្រ Free Fire កម្ពុជា"
                  className="w-full px-3 py-2 bg-[#1b1814] border border-stone-800 rounded-lg text-white"
                />
              </div>

              {/* Cover Image URL, File Upload & Live Preview */}
              <div className="p-3 rounded-xl bg-[#1b1814] border border-stone-800 space-y-2.5">
                <label className="block text-amber-400 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Image className="w-4 h-4" />
                    <span>Product Cover Image:</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-normal">URL ឬ Upload ផ្ទាល់</span>
                </label>

                {/* Direct File Picker Upload */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setProductForm({ ...productForm, coverImage: event.target.result as string });
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="admin-file-upload-input"
                  />
                  <label
                    htmlFor="admin-file-upload-input"
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs cursor-pointer flex items-center justify-center gap-2 transition shadow active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{lang === 'kh' ? '📁 ជ្រើសរើសរូបភាពពីទូរស័ព្ទ/កុំព្យូទ័រ (Upload File)' : '📁 Upload Local Image File'}</span>
                  </label>
                </div>

                {/* Manual URL Input */}
                <input
                  type="text"
                  value={productForm.coverImage || ''}
                  onChange={(e) => setProductForm({ ...productForm, coverImage: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-[#100e0c] border border-stone-700 rounded-lg text-white font-mono text-[11px]"
                />

                {/* Preset Picker */}
                <div>
                  <span className="text-[11px] text-stone-400 block mb-1">ជ្រើសរើសរូបភាពគំរូ (Presets / Logo):</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, coverImage: '/logo.jpg' })}
                      className="p-1 rounded bg-[#25211b] hover:bg-amber-500/20 border border-stone-700 text-[10px] text-amber-400 font-bold truncate text-left"
                    >
                      👑 K-STORE Logo
                    </button>
                    {IMAGE_PRESETS.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setProductForm({ ...productForm, coverImage: preset.url })}
                        className="p-1 rounded bg-[#25211b] hover:bg-amber-500/20 border border-stone-700 text-[10px] text-stone-300 truncate text-left"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Image Preview */}
                {productForm.coverImage && (
                  <div className="mt-2 flex items-center gap-3 p-2 bg-[#100e0c] rounded-xl border border-stone-800">
                    <img
                      src={productForm.coverImage}
                      alt="Preview"
                      className="w-14 h-14 rounded-xl object-cover border border-amber-500/40 shadow-md bg-stone-900"
                    />
                    <div>
                      <span className="text-xs text-emerald-400 font-bold block">✓ Live Cover Preview Ready</span>
                      <span className="text-[10px] text-stone-400 block truncate max-w-[250px]">
                        {productForm.coverImage.startsWith('data:') ? 'Local Uploaded File (Base64)' : productForm.coverImage}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">Category:</label>
                  <select
                    value={productForm.category || 'featured'}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#1b1814] border border-stone-800 rounded-lg text-white"
                  >
                    <option value="featured">Featured (ពេញនិយម)</option>
                    <option value="all">All Games (ហ្គេមទាំងអស់)</option>
                    <option value="panel">Panel / Hack</option>
                    <option value="robux">Robux Code</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1">Badge Tag:</label>
                  <input
                    type="text"
                    value={productForm.badge || 'TOPUP'}
                    onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1b1814] border border-stone-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProduct}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm uppercase transition shadow-lg mt-2"
              >
                {isSavingProduct ? 'រក្សាទុក...' : 'រក្សាទុក Product & រូបភាព'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
