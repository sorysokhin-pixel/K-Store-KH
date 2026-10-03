import React, { useState } from 'react';
import { X, Zap, Lock, AlertCircle, CheckCircle2, ShieldCheck, HelpCircle, RefreshCw } from 'lucide-react';
import { GameItem, GamePackage, Language, OrderItem, UserProfile } from '../types';
import { encryptSensitiveData } from '../firebase/encryption';
import { createOrder } from '../firebase/services';
import { verifyGameAccount } from '../services/khmerTopupService';

interface TopupModalProps {
  game: GameItem;
  lang: Language;
  currentUser: UserProfile | null;
  onClose: () => void;
  onOrderCreated: (order: OrderItem) => void;
}

export const TopupModal: React.FC<TopupModalProps> = ({
  game,
  lang,
  currentUser,
  onClose,
  onOrderCreated,
}) => {
  const isKeyService =
    game.isKeyService || game.category === 'panel' || game.category === 'robux';

  const [selectedPackage, setSelectedPackage] = useState<GamePackage>(game.packages[0]);
  const [playerId, setPlayerId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [backupContact, setBackupContact] = useState('');
  const [showOptionalGameId, setShowOptionalGameId] = useState(false);
  const [sensitiveSecret, setSensitiveSecret] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [verifiedNickname, setVerifiedNickname] = useState<string | null>(null);

  const handleCheckPlayerNickname = async () => {
    if (!playerId.trim()) return;
    setIsCheckingNickname(true);
    setVerifiedNickname(null);
    try {
      const slug = game.externalSlug || game.id.replace(/^kt-/, '');
      const res = await verifyGameAccount(slug, playerId.trim(), zoneId.trim() || undefined);
      if (res.valid && res.nickname) {
        setVerifiedNickname(res.nickname);
      } else {
        setVerifiedNickname(null);
        if (res.error) {
          setErrorMsg(res.error);
        }
      }
    } catch (_) {
    } finally {
      setIsCheckingNickname(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For standard games (non-key services), Game ID is required!
    if (!isKeyService && !playerId.trim()) {
      setErrorMsg(
        lang === 'kh'
          ? 'សូមបញ្ចូល Player ID របស់លោកអ្នក!'
          : 'Please enter your Player ID / Game ID!'
      );
      return;
    }

    if (!isKeyService && game.needsZoneId && !zoneId.trim()) {
      setErrorMsg(
        lang === 'kh'
          ? 'សូមបញ្ចូល Server / Zone ID!'
          : 'Please enter your Zone/Server ID!'
      );
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      let encryptedPayload = '';
      if (sensitiveSecret.trim()) {
        const userPass = currentUser?.uid || 'KStoreKH-Guest-Encryption-Key';
        encryptedPayload = isEncrypted
          ? await encryptSensitiveData(sensitiveSecret.trim(), userPass)
          : sensitiveSecret.trim();
      }

      // Generate or retrieve license key for Key/Panel services
      let generatedLicenseKey: string | undefined = undefined;
      if (isKeyService) {
        if (selectedPackage.keys && selectedPackage.keys.length > 0) {
          generatedLicenseKey = selectedPackage.keys[0];
        } else {
          const durationPrefix = selectedPackage.durationHours ? `${selectedPackage.durationHours}H` : 'TRLL';
          generatedLicenseKey = `${durationPrefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-4EC5`;
        }
      }

      const orderId = `CK_${Math.random().toString(36).substring(2, 8).toUpperCase()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const newOrder = await createOrder({
        orderId,
        userId: currentUser?.uid || 'guest-user',
        userEmail: currentUser?.email || 'guest@kstorekh.app',
        gameId: game.id,
        gameTitle: game.title,
        packageTitle: selectedPackage.name,
        amountUsd: selectedPackage.priceUsd,
        playerId: playerId.trim() || backupContact.trim() || 'Key-Service-Auto',
        zoneId: zoneId.trim() || undefined,
        encryptedPlayerSecret: encryptedPayload || undefined,
        status: 'pending',
        paymentMethod: 'KHQR_ALL_BANKS',
        isKeyService,
        licenseKey: generatedLicenseKey,
        unlockUrl: game.unlockUrl || 'https://kstorekh.vercel.app/unlock',
        backupContact: backupContact.trim() || undefined,
      });

      onOrderCreated(newOrder);
    } catch (err) {
      console.error('Failed to create order:', err);
      setErrorMsg(
        lang === 'kh'
          ? 'មានបញ្ហាក្នុងការបង្កើតការកុម្ម៉ង់ សូមព្យាយាមម្តងទៀត'
          : 'Failed to create order. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#14120f] border border-amber-500/30 p-5 sm:p-6 shadow-2xl shadow-black text-left max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Header */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-stone-800">
          <img
            src={game.coverImage}
            alt={game.title}
            className="w-14 h-14 rounded-2xl object-cover border border-amber-500/30 shadow-md"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.retried && game.coverImage?.startsWith('https://khmer-topup.com/')) {
                target.dataset.retried = 'true';
                target.src = `/api/khmer-topup/image-proxy?url=${encodeURIComponent(game.coverImage)}`;
              }
            }}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {game.badge || (isKeyService ? 'VIP KEY' : 'TOPUP')}
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                <Zap className="w-3 h-3 fill-emerald-400" /> Instant delivery
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1">
              {game.title}
            </h2>
            <p className="text-xs text-stone-400">
              {isKeyService
                ? (lang === 'kh' ? 'ទទួលបាន Key និង របៀបប្រើភ្លាមៗ' : 'Instant License Key & Tutorial')
                : (lang === 'kh' ? 'បញ្ចូលពេជ្រស្វ័យប្រវត្ត តាម Player ID' : 'Automated Top-Up via Player ID')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Section 1: ENTER YOUR INFORMATION */}
          <div className="p-3.5 rounded-2xl bg-[#1b1814] border border-stone-800 space-y-3">
            <div className="flex items-center justify-between text-amber-400 font-extrabold text-xs uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>
                  {lang === 'kh' ? 'បញ្ចូលព័ត៌មានរបស់អ្នក' : 'ENTER YOUR INFORMATION'}
                </span>
              </div>
              <HelpCircle className="w-4 h-4 text-stone-400" />
            </div>

            {/* If NOT a Key Service -> Require Game ID */}
            {!isKeyService ? (
              <div className="space-y-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={playerId}
                      onChange={(e) => {
                        setPlayerId(e.target.value);
                        setVerifiedNickname(null);
                      }}
                      placeholder={
                        game.idLabel || (lang === 'kh' ? 'Game ID / Player ID' : 'Game ID / Player ID')
                      }
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#12100d] border border-stone-800 focus:border-amber-500 focus:outline-none text-xs sm:text-sm text-white placeholder-stone-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleCheckPlayerNickname}
                      disabled={isCheckingNickname || !playerId.trim()}
                      className="px-3 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-bold transition border border-stone-700 disabled:opacity-50 shrink-0 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingNickname ? 'animate-spin' : ''}`} />
                      <span>{isCheckingNickname ? 'Checking...' : 'Check Nickname'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-1 mt-1 text-[11px]">
                    <span className="text-stone-400">PLAYER:</span>
                    {verifiedNickname ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{verifiedNickname} (Verified ✓)</span>
                      </span>
                    ) : (
                      <span className="text-stone-500 font-bold">
                        {playerId.trim() ? 'Not checked yet' : 'Required'}
                      </span>
                    )}
                  </div>
                </div>

                {game.needsZoneId && (
                  <div>
                    <input
                      type="text"
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      placeholder={
                        game.zonePlaceholder ||
                        (lang === 'kh' ? 'Zone ID / Server' : 'Zone ID / Server')
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100d] border border-stone-800 focus:border-amber-500 focus:outline-none text-xs sm:text-sm text-white placeholder-stone-400 font-mono"
                    />
                  </div>
                )}

                <input
                  type="text"
                  value={backupContact}
                  onChange={(e) => setBackupContact(e.target.value)}
                  placeholder="Telegram username or Phone (for backup)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100d] border border-stone-800 focus:border-amber-500 focus:outline-none text-xs text-white placeholder-stone-400 font-mono"
                />
              </div>
            ) : (
              /* If KEY SERVICE (Panel / Robux Code) -> Game ID optional or not required! (Matching IMG_3224) */
              <div className="space-y-2">
                <input
                  type="text"
                  value={backupContact}
                  onChange={(e) => setBackupContact(e.target.value)}
                  placeholder="Telegram username or Phone (for backup)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100d] border border-stone-800 focus:border-amber-500 focus:outline-none text-xs sm:text-sm text-white placeholder-stone-400 font-mono"
                />

                {showOptionalGameId ? (
                  <div>
                    <input
                      type="text"
                      value={playerId}
                      onChange={(e) => setPlayerId(e.target.value)}
                      placeholder="Optional Game ID (Optional)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100d] border border-stone-800 focus:border-amber-500 focus:outline-none text-xs text-white placeholder-stone-400 font-mono"
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Section 2: CHOOSE A PACKAGE (Matching Screenshot 2: khmer-topup.com/game/freefire-sgmy) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>📦</span>
                <span>{lang === 'kh' ? '២. ជ្រើសរើសកញ្ចប់ទំនិញ (CHOOSE A PACKAGE)' : '2. CHOOSE A PACKAGE'}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black font-mono">
                {game.packages.length} PACKAGES
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
              {game.packages.map((pkg) => {
                const isSelected = selectedPackage.id === pkg.id;
                const isBestSeller = pkg.popular || Boolean(pkg.bonus?.toLowerCase().includes('popular') || pkg.bonus?.toLowerCase().includes('best'));

                return (
                  <button
                    type="button"
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative p-2.5 sm:p-3 rounded-2xl text-center border transition-all flex flex-col justify-between items-center min-h-[78px] ${
                      isSelected
                        ? 'bg-[#1f1a12] border-amber-400 ring-2 ring-amber-400 shadow-lg shadow-amber-400/25'
                        : 'bg-[#16130f] border-stone-800 hover:border-stone-700 hover:bg-[#1b1712]'
                    }`}
                  >
                    {/* BEST SELLER badge if popular */}
                    {isBestSeller && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-black text-[9px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap">
                        🔥 BEST SELLER
                      </span>
                    )}

                    {/* Package Name */}
                    <div className="text-[11px] sm:text-xs font-bold text-stone-200 line-clamp-1 w-full text-center">
                      {lang === 'kh' && pkg.nameKh ? pkg.nameKh : pkg.name}
                    </div>

                    {/* Price USD */}
                    <div className="flex flex-col items-center my-0.5">
                      <div className="text-sm sm:text-base font-black text-amber-400 font-mono tracking-tight">
                        ${pkg.priceUsd.toFixed(2)}
                      </div>
                      {currentUser?.role === 'admin' && pkg.originalPriceUsd !== undefined && pkg.originalPriceUsd !== pkg.priceUsd && (
                        <div className="text-[9px] text-emerald-400/80 font-mono">
                          Cost: ${pkg.originalPriceUsd.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* Bottom Package ID #tag (e.g. #374, #391 matching Screenshot 2) */}
                    <div className="w-full flex items-center justify-between text-[10px] text-stone-500 font-mono">
                      <span>{pkg.externalPackageId ? `#${pkg.externalPackageId}` : `#${pkg.id.slice(-4)}`}</span>
                      {isSelected && <span className="text-amber-400 font-bold">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key Features Checklist Box (Only if product has explicit keyFeatures configured) */}
          {isKeyService && game.keyFeatures && game.keyFeatures.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#161310] border border-stone-800 space-y-1.5 text-xs text-stone-300">
              <div className="font-extrabold text-amber-400 flex items-center gap-1">
                <span>🪄</span> Key Features
              </div>
              <ul className="space-y-1 text-[11px] font-medium text-stone-300">
                {game.keyFeatures.map((feat: string, fIdx: number) => (
                  <li key={fIdx} className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bottom Need Help Hint (Matching IMG_3224) */}
          {isKeyService && !showOptionalGameId && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowOptionalGameId(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1b1814] border border-stone-800 text-[11px] text-amber-400 hover:text-amber-300 transition"
              >
                <span>Need help? Enter your Game ID.</span>
              </button>
            </div>
          )}

          {/* Sensitive Encrypted PIN / Backup Note */}
          <div className="p-3 rounded-2xl bg-[#100e0b] border border-stone-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-stone-300">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'kh' ? 'កំណត់ត្រាសម្ងាត់ (AES Note)' : 'Encrypted Note'}</span>
              </span>
              <label className="flex items-center gap-1 text-[10px] text-emerald-400">
                <input
                  type="checkbox"
                  checked={isEncrypted}
                  onChange={(e) => setIsEncrypted(e.target.checked)}
                  className="rounded border-stone-700 text-amber-500 focus:ring-0"
                />
                <span>AES-256</span>
              </label>
            </div>
            <input
              type="password"
              value={sensitiveSecret}
              onChange={(e) => setSensitiveSecret(e.target.value)}
              placeholder={
                lang === 'kh'
                  ? 'បញ្ចូលព័ត៌មានបន្ថែម ឬ Backup Key (ប្រសិនបើមាន)'
                  : 'Optional backup pin or note'
              }
              className="w-full px-3 py-1.5 rounded-lg bg-[#181512] border border-stone-800 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Footer Bar & Pay Button */}
          <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-stone-400">Total:</div>
              <div className="text-xl font-black text-amber-400">
                ${selectedPackage.priceUsd.toFixed(2)}
              </div>
              <div className="text-[10px] text-stone-400">
                Product: <strong className="text-white">{selectedPackage.name}</strong>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-lime-500 via-emerald-500 to-lime-500 hover:from-lime-400 hover:to-emerald-400 text-black font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>
                {isSubmitting
                  ? (lang === 'kh' ? 'កំពុងដំណើរការ...' : 'Processing...')
                  : (lang === 'kh' ? '💳 ទូទាត់ប្រាក់ (Pay Now)' : '💳 Pay Now')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
