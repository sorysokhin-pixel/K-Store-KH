import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import {
  ActivityLog,
  GameItem,
  Language,
  OrderItem,
  UserProfile,
} from './types';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryNav, CategoryFilter } from './components/CategoryNav';
import { GameCard } from './components/GameCard';
import { FeatureHighlights } from './components/FeatureHighlights';
import { Footer } from './components/Footer';
import { TopupModal } from './components/TopupModal';
import { KHQRModal } from './components/KHQRModal';
import { AdminPanel } from './components/AdminPanel';
import { AdminLoginModal } from './components/AdminLoginModal';
import { isAdminSessionValid, setAdminSession } from './services/adminAuthService';
import { UserAuthModal } from './components/UserAuthModal';
import { OrdersModal } from './components/OrdersModal';
import { SecurityVaultModal } from './components/SecurityVaultModal';
import { LicenseKeySuccessModal } from './components/LicenseKeySuccessModal';
import {
  getUserProfile,
  upsertUserProfile,
  subscribeToActivityLogs,
  subscribeToOrders,
  subscribeToProducts,
  seedProductsIfEmpty,
  updateOrderStatus,
  drawLicenseKeyFromStock,
  batchSyncGamesToFirestore,
  logActivity,
  ADMIN_BOOTSTRAP_EMAIL,
  isMockProduct,
} from './firebase/services';
import {
  getStoredKhmerTopupSettings,
  syncKhmerTopupCatalog,
  fetchLiveKhmerTopupCatalog,
} from './services/khmerTopupService';
import { getStoredCategories, CustomCategory } from './services/categoryService';
import { Plus, Loader2, RefreshCw } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>('kh');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('kstore_theme') as 'dark' | 'light') || 'dark';
  });
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('featured');

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('kstore_theme', next);
      return next;
    });
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(50);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('razy_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const [visibleCount, setVisibleCount] = useState(15);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [cloudProducts, setCloudProducts] = useState<GameItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => getStoredCategories());

  // Modals
  const [selectedGameForTopup, setSelectedGameForTopup] = useState<GameItem | null>(null);
  const [pendingGameForTopup, setPendingGameForTopup] = useState<GameItem | null>(null);
  const [authPromptMessage, setAuthPromptMessage] = useState<string>('');
  const [activeKhqrOrder, setActiveKhqrOrder] = useState<OrderItem | null>(null);
  const [completedLicenseKeyOrder, setCompletedLicenseKeyOrder] = useState<OrderItem | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => isAdminSessionValid());
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  // Sync favorites
  const toggleFavorite = (gameId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId];
      localStorage.setItem('razy_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Persistent User Auth Observer with LocalStorage Auto-Login
  useEffect(() => {
    // 1. Immediately restore session from localStorage for instant auto-login
    const savedUserRaw = localStorage.getItem('kstore_user_session');
    if (savedUserRaw) {
      try {
        const parsed = JSON.parse(savedUserRaw);
        if (parsed && parsed.uid) {
          setCurrentUser(parsed);
        }
      } catch (_) {}
    }

    // 2. Also listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        let profile = await getUserProfile(fbUser.uid);
        if (!profile) {
          profile = await upsertUserProfile({
            uid: fbUser.uid,
            email: fbUser.email || 'user@kstore.kh',
            displayName: fbUser.displayName || 'K-STORE Gamer',
            photoURL: fbUser.photoURL || '',
          });
        }
        setCurrentUser(profile);
        localStorage.setItem('kstore_user_session', JSON.stringify(profile));
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle user auth state change
  const handleUserChanged = (user: UserProfile | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('kstore_user_session', JSON.stringify(user));
      // Auto-resume purchase if user clicked a game before login
      if (pendingGameForTopup) {
        setSelectedGameForTopup(pendingGameForTopup);
        setPendingGameForTopup(null);
      }
    } else {
      localStorage.removeItem('kstore_user_session');
    }
  };

  // Mandatory Login Gate before Purchasing Top-up
  const handleSelectGameForTopup = (game: GameItem) => {
    if (!currentUser) {
      setPendingGameForTopup(game);
      setAuthPromptMessage(
        lang === 'kh'
          ? '🔒 សូមចូលគណនី (Login) ឬ ចុះឈ្មោះជាមុនសិន ដើម្បីទិញសេវាកម្ម!'
          : '🔒 Please Login or Sign Up first to purchase services!'
      );
      setIsAuthOpen(true);
      return;
    }
    setSelectedGameForTopup(game);
  };

  const isAdmin =
    isAdminAuthenticated ||
    currentUser?.role === 'admin' ||
    currentUser?.email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase();

  const handleOpenAdmin = () => {
    if (isAdminAuthenticated) {
      setIsAdminOpen(true);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleAdminLogout = () => {
    setAdminSession(false);
    setIsAdminAuthenticated(false);
    setIsAdminOpen(false);
  };

  // Secret admin shortcut (Ctrl+Shift+A or Alt+A or #admin in URL)
  useEffect(() => {
    if (window.location.hash === '#admin' || window.location.search.includes('admin')) {
      handleOpenAdmin();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) ||
        (e.altKey && (e.key === 'A' || e.key === 'a'))
      ) {
        e.preventDefault();
        handleOpenAdmin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminAuthenticated]);

  // Load real catalog on startup directly from Khmer-TopUp crawler + server custom products
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        const res = await fetchLiveKhmerTopupCatalog();
        if (isMounted && res.ok && res.games && res.games.length > 0) {
          setCloudProducts((prev) => {
            const customProds = prev.filter((p) => !res.games!.some((rg) => rg.id === p.id));
            return [...res.games!, ...customProds];
          });
          batchSyncGamesToFirestore(res.games).catch((e) => console.warn('Firestore sync background:', e));
        }

        // Fetch custom products stored on Server API for cross-device synchronization
        try {
          const apiProdRes = await fetch('/api/admin/products');
          if (apiProdRes.ok) {
            const apiProdData = await apiProdRes.json();
            if (isMounted && apiProdData && Array.isArray(apiProdData.products) && apiProdData.products.length > 0) {
              setCloudProducts((prev) => {
                const map = new Map<string, GameItem>();
                prev.forEach((p) => map.set(p.id, p));
                apiProdData.products.forEach((p: GameItem) => map.set(p.id, p));
                return Array.from(map.values());
              });
            }
          }
        } catch (_) {}
      } catch (err) {
        console.warn('Failed to load live catalog:', err);
      } finally {
        if (isMounted) setIsLoadingCatalog(false);
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time Activity Logs, Orders, and Products listeners
  useEffect(() => {
    const unsubLogs = subscribeToActivityLogs(isAdmin, currentUser?.uid || null, (logs) => {
      setActivityLogs(logs);
    });

    const unsubOrders = subscribeToOrders(isAdmin, currentUser?.uid || null, (ords) => {
      setOrders(ords);
    });

    const unsubProds = subscribeToProducts((prods) => {
      if (prods.length > 0) {
        setCloudProducts((prev) => {
          const map = new Map<string, GameItem>();
          prev.forEach((p) => map.set(p.id, p));
          prods.forEach((p) => map.set(p.id, p));
          const merged = Array.from(map.values()).filter((p) => !isMockProduct(p));
          merged.sort((a, b) => (a.priority || 999) - (b.priority || 999));
          return merged;
        });
        setIsLoadingCatalog(false);
      }
    });

    return () => {
      unsubLogs();
      unsubOrders();
      unsubProds();
    };
  }, [isAdmin, currentUser?.uid]);

  // Initial welcome activity log
  useEffect(() => {
    logActivity('APP_INITIALIZED', 'K-STORE KH platform initialized in browser', 'info');
  }, []);

  // Automated Periodic API Sync with Khmer-TopUp
  useEffect(() => {
    async function runAutoSyncCheck() {
      try {
        const config = getStoredKhmerTopupSettings();
        if (!config.autoSync) return;

        const now = Date.now();
        const lastSync = config.lastSyncTime ? new Date(config.lastSyncTime).getTime() : 0;
        const intervalMs = Math.max(1, config.syncIntervalMinutes || 30) * 60 * 1000;

        if (now - lastSync >= intervalMs) {
          const res = await syncKhmerTopupCatalog(config.apiKey);
          if (res.ok && res.games && res.games.length > 0) {
            setCloudProducts((prev) => {
              const customProds = prev.filter((p) => !res.games!.some((rg) => rg.id === p.id));
              return [...res.games!, ...customProds];
            });
            await batchSyncGamesToFirestore(res.games);
          }
        }
      } catch (err) {
        console.warn('Auto-sync periodic check skipped:', err);
      }
    }

    runAutoSyncCheck();
    const intervalTimer = setInterval(runAutoSyncCheck, 60000); // Check every minute
    return () => clearInterval(intervalTimer);
  }, []);

  // Clean, prioritized sequence matching https://khmer-topup.com
  const POPULAR_ORDER: Record<string, number> = {
    'freefire-sgmy': 1,
    'free-fire': 1,
    freefire: 1,
    'mobile-legends': 2,
    mlbb: 2,
    telegram: 3,
    'mobile-legends-exclusive': 4,
    'mobile-legends-special': 5,
    'freefire-indonesia': 6,
    'honor-of-kings': 7,
    hok: 7,
    'freefire-taiwan': 8,
    'freefire-vietnam': 9,
    'pubg-mobile': 10,
    pubg: 10,
    'eafc-mobile-cambodia': 11,
    'eafc-mobile': 11,
    'magic-chess-gogo': 12,
    'blood-strike': 13,
    'freefire-sg': 14,
    'freefire-brazil': 15,
    'racing-master-sea': 16,
    'freefire-global': 17,
    'wild-rift-cambodia': 18,
    'freefire-middle-east': 19,
    'freefire-latam': 20,
    'freefire-bangladesh': 21,
    'valorant-sg': 22,
    'call-of-duty-mobile-garena-sgmy': 23,
    'bigo-live-diamonds': 24,
    'identity-v': 25,
    '8-ball-pool': 26,
    'arena-breakout': 27,
    roblox: 28,
  };

  // ONLY real products from Firestore/API - No mock data!
  const activeProductsList = [...cloudProducts]
    .filter((p) => !isMockProduct(p))
    .sort((a, b) => {
      const pA = POPULAR_ORDER[a.id] ?? a.priority ?? 999;
      const pB = POPULAR_ORDER[b.id] ?? b.priority ?? 999;
      if (pA !== pB) return pA - pB;
      return a.title.localeCompare(b.title);
    });

  // Filter games
  const filteredGames = activeProductsList.filter((game) => {
    let matchesCategory = true;
    if (selectedCategory === 'all') {
      matchesCategory = true;
    } else if (selectedCategory === 'featured') {
      matchesCategory = game.category === 'featured' || (POPULAR_ORDER[game.id] && POPULAR_ORDER[game.id] <= 12) || Boolean(game.isHot);
    } else {
      matchesCategory = game.category === selectedCategory || game.id === selectedCategory;
    }

    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      matchesSearch =
        game.title.toLowerCase().includes(q) ||
        game.titleKh.toLowerCase().includes(q) ||
        game.id.toLowerCase().includes(q) ||
        Boolean(game.badge?.toLowerCase().includes(q));
    }

    let matchesPrice = true;
    if (maxPriceFilter < 50) {
      matchesPrice = game.packages.some((pkg) => pkg.priceUsd <= maxPriceFilter);
    }

    return matchesCategory && matchesSearch && matchesPrice;
  });

  const displayedGames = filteredGames.slice(0, visibleCount);

  // When order is created in TopupModal
  const handleOrderCreated = (order: OrderItem) => {
    setSelectedGameForTopup(null);
    setActiveKhqrOrder(order);
  };

  // Payment completed
  const handlePaymentSuccess = async (order: OrderItem) => {
    let finalKey = order.licenseKey;
    if (order.gameId) {
      const gameObj = activeProductsList.find((g) => g.id === order.gameId);
      const pkgObj = gameObj?.packages.find(
        (p) => p.name === order.packageTitle || p.nameKh === order.packageTitle
      );
      if (pkgObj) {
        const drawn = await drawLicenseKeyFromStock(order.gameId, pkgObj.id);
        if (drawn) {
          finalKey = drawn;
        }
      }
    }

    const updatedOrder: OrderItem = {
      ...order,
      status: 'completed',
      licenseKey: finalKey || order.licenseKey,
    };

    await updateOrderStatus(order.orderId, 'completed');
    setActiveKhqrOrder(null);
    if (order.isKeyService || finalKey) {
      setCompletedLicenseKeyOrder(updatedOrder);
    } else {
      setIsOrdersOpen(true);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-amber-500 selection:text-black transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0d0c0a] text-white' : 'bg-[#f7f5f0] text-stone-900'
      }`}
    >
      {/* Header */}
      <Header
        lang={lang}
        onToggleLang={setLang}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onOpenAdmin={handleOpenAdmin}
        onOpenOrders={() => setIsOrdersOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenVault={() => setIsVaultOpen(true)}
        orderCount={orders.filter((o) => o.status === 'pending').length}
      />

      {/* Main Content */}
      <main className="flex-1 pb-10">
        {/* Hero Carousel */}
        <HeroBanner
          lang={lang}
          onExploreTopup={() => {
            const el = document.getElementById('games-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onSelectPromoGame={(gameId) => {
            if (!gameId) return;
            const target = activeProductsList.find((g) => g.id === gameId);
            if (target) {
              handleSelectGameForTopup(target);
            } else {
              const el = document.getElementById('games-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />

        {/* Categories, Search & Tabs */}
        <div id="games-section">
          <CategoryNav
            lang={lang}
            theme={theme}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setVisibleCount(30);
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            maxPriceFilter={maxPriceFilter}
            onMaxPriceFilterChange={setMaxPriceFilter}
            totalFilteredCount={filteredGames.length}
            customCategories={customCategories}
          />
        </div>

        {/* 3-Column Mobile / Multi-column Desktop Game Grid */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 pb-6">
          {isLoadingCatalog && cloudProducts.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-amber-400">
                {lang === 'kh'
                  ? 'កំពុងទាញយកទំនិញ និងសេវាកម្មពី https://khmer-topup.com ...'
                  : 'Loading live games and packages from https://khmer-topup.com ...'}
              </h3>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                {lang === 'kh'
                  ? 'សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងទាញយករូបភាព និងតម្លៃពិតប្រាកដ...'
                  : 'Please wait a moment while live images and prices are loaded...'}
              </p>
            </div>
          ) : cloudProducts.length === 0 ? (
            <div
              className={`text-center py-16 px-4 rounded-3xl border ${
                theme === 'dark'
                  ? 'bg-[#14120e] border-stone-800 text-stone-300'
                  : 'bg-white border-stone-200 text-stone-700 shadow-sm'
              }`}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-3xl">
                🎮
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mb-2">
                {lang === 'kh'
                  ? 'មិនទាន់មានទំនិញនៅលើ Website នៅឡើយទេ'
                  : 'No Products in Catalog Yet'}
              </h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto mb-5 leading-relaxed">
                {lang === 'kh'
                  ? 'ទិន្នន័យគំរូត្រូវបានបិទតាមការកំណត់ — សូមចុចប៊ូតុងខាងក្រោមដើម្បីទាញយកទំនិញពិតប្រាកដពី Khmer-TopUp ឬ បង្កើត Category/Products ថ្មី!'
                  : 'Sample data has been disabled — Click below to sync live products from Khmer-TopUp or create categories/products!'}
              </p>
              <button
                onClick={async () => {
                  setIsLoadingCatalog(true);
                  const res = await syncKhmerTopupCatalog();
                  if (res.ok && res.games) {
                    setCloudProducts(res.games);
                    batchSyncGamesToFirestore(res.games).catch(() => {});
                  }
                  setIsLoadingCatalog(false);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 active:scale-95 inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{lang === 'kh' ? 'SYNC ទាញទំនិញពី KHMER-TOPUP ឥឡូវនេះ' : 'SYNC FROM KHMER-TOPUP NOW'}</span>
              </button>
            </div>
          ) : displayedGames.length === 0 ? (
            <div
              className={`text-center py-16 rounded-2xl border ${
                theme === 'dark'
                  ? 'bg-[#14120e] border-stone-800 text-stone-400'
                  : 'bg-white border-stone-200 text-stone-600 shadow-sm'
              }`}
            >
              <p className="text-sm">
                {lang === 'kh' ? 'រកមិនឃើញហ្គេមដែលត្រូវស្វែងរកទេ' : 'No games found matching your search.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-3 px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold"
              >
                {lang === 'kh' ? 'មើលហ្គេមទាំងអស់' : 'View All Games'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3.5">
              {displayedGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  lang={lang}
                  theme={theme}
                  isFavorite={favorites.includes(game.id)}
                  onToggleFavorite={toggleFavorite}
                  onSelectGame={handleSelectGameForTopup}
                />
              ))}
            </div>
          )}

          {/* Show More Games Button */}
          {visibleCount < filteredGames.length && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 24)}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-[#1b1814] hover:bg-[#25211b] border border-amber-500/40 text-amber-400 hover:text-amber-300 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {lang === 'kh'
                    ? '+ បង្ហាញបន្ថែមទៀត (Show More Games)'
                    : '+ Show More Games'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 3 Service Feature Highlights */}
        <FeatureHighlights lang={lang} />
      </main>

      {/* Footer & Floating Support */}
      <Footer lang={lang} theme={theme} onOpenAdmin={handleOpenAdmin} />

      {/* MODALS */}

      {/* 1. Top-up Package Selection Modal */}
      {selectedGameForTopup && (
        <TopupModal
          game={selectedGameForTopup}
          lang={lang}
          currentUser={currentUser}
          onClose={() => setSelectedGameForTopup(null)}
          onOrderCreated={handleOrderCreated}
        />
      )}

      {/* 2. KHQR Payment Modal */}
      {activeKhqrOrder && (
        <KHQRModal
          order={activeKhqrOrder}
          lang={lang}
          onClose={() => setActiveKhqrOrder(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* 3. Admin RBAC & Real-Time Products/Stock Dashboard */}
      {isAdminOpen && (
        <AdminPanel
          lang={lang}
          currentUser={currentUser}
          activityLogs={activityLogs}
          orders={orders}
          products={activeProductsList}
          onClose={() => setIsAdminOpen(false)}
          onLogout={handleAdminLogout}
        />
      )}

      {/* 3.5 Admin Login Security Gate (Username + Security Code) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          setIsAdminLoginOpen(false);
          setIsAdminOpen(true);
        }}
      />

      {/* 4. User Auth / Cloud Account Modal */}
      {isAuthOpen && (
        <UserAuthModal
          lang={lang}
          currentUser={currentUser}
          promptMessage={authPromptMessage}
          onClose={() => {
            setIsAuthOpen(false);
            setAuthPromptMessage('');
          }}
          onUserChanged={handleUserChanged}
        />
      )}

      {/* 5. Orders History Modal */}
      {isOrdersOpen && (
        <OrdersModal
          orders={orders}
          lang={lang}
          onClose={() => setIsOrdersOpen(false)}
          onOpenKhqr={(ord) => setActiveKhqrOrder(ord)}
        />
      )}

      {/* 6. Client-Side AES-GCM Encrypted Vault Modal */}
      {isVaultOpen && (
        <SecurityVaultModal
          lang={lang}
          currentUser={currentUser}
          onClose={() => setIsVaultOpen(false)}
          onProfileUpdated={setCurrentUser}
        />
      )}

      {/* 7. License Key Success Receipt Modal (Matching IMG_3153) */}
      {completedLicenseKeyOrder && (
        <LicenseKeySuccessModal
          order={completedLicenseKeyOrder}
          lang={lang}
          onClose={() => setCompletedLicenseKeyOrder(null)}
        />
      )}
    </div>
  );
}
