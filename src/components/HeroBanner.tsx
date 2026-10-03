import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Tag,
  ShieldAlert,
  Flame,
  ArrowRight,
  Gift,
} from 'lucide-react';
import { Language } from '../types';

export interface BannerData {
  id: string;
  titleKh: string;
  titleEn: string;
  descKh: string;
  descEn: string;
  badgeKh: string;
  badgeEn: string;
  discountTag?: string;
  originalPrice?: string;
  discountPrice?: string;
  image: string;
  gameId?: string;
}

const DEFAULT_BANNERS: BannerData[] = [
  {
    id: 'banner-ff-bonus',
    titleKh: 'Free Fire ពេជ្រ និងកញ្ចប់ប្រចាំសប្តាហ៍ (Weekly / Diamonds)',
    titleEn: 'Free Fire Diamonds & Weekly Passes',
    descKh: 'តម្លៃទាបបំផុតចាប់ពី $0.24 ឡើងទៅ ទូទាត់តាម KHQR ដោយស្វ័យប្រវត្ត 100%',
    descEn: 'Cheapest prices starting from $0.24! Instant auto-delivery via KHQR.',
    badgeKh: '🔥 ពេញនិយម',
    badgeEn: '🔥 POPULAR',
    discountTag: 'START $0.24',
    originalPrice: '$0.50',
    discountPrice: '$0.24',
    image: 'https://khmer-topup.com/static/uploads/games/free-fire-real.webp',
    gameId: 'freefire-sgmy',
  },
  {
    id: 'banner-mlbb-pass',
    titleKh: 'Mobile Legends Cambodia (Weekly Pass & Diamonds)',
    titleEn: 'Mobile Legends Cambodia (Weekly Pass & Diamonds)',
    descKh: 'បញ្ចូលពេជ្រភ្លាមៗក្នុង 1-3 វិនាទី! តម្លៃពិសេសចាប់ពី $0.76',
    descEn: 'Instant diamond delivery in 1-3 seconds! Starting at only $0.76.',
    badgeKh: '💎 កញ្ចប់ពេញនិយម',
    badgeEn: '💎 BEST SELLER',
    discountTag: 'BEST PRICE',
    originalPrice: '$1.20',
    discountPrice: '$0.76',
    image: 'https://khmer-topup.com/static/uploads/games/mobile-legends-real.webp',
    gameId: 'mobile-legends',
  },
  {
    id: 'banner-telegram-stars',
    titleKh: 'Telegram Stars (ទិញ Stars ដោយស្វ័យប្រវត្ត)',
    titleEn: 'Telegram Stars (Instant Automated Delivery)',
    descKh: 'ទិញ Stars សម្រាប់ Telegram Bot និង Channel ភ្លាមៗ មិនបាច់ចាំយូរ',
    descEn: 'Buy Telegram Stars with instant automated delivery via KHQR.',
    badgeKh: '✈️ Telegram Stars',
    badgeEn: '✈️ Instant Stars',
    discountTag: 'HOT DEAL',
    originalPrice: '$1.00',
    discountPrice: '$0.77',
    image: 'https://khmer-topup.com/static/uploads/games/telegram-0d8b2c.webp',
    gameId: 'telegram',
  },
  {
    id: 'banner-pubg-uc',
    titleKh: 'PUBG Mobile Global (Instant UC Delivery)',
    titleEn: 'PUBG Mobile Global (Instant UC Delivery)',
    descKh: 'បញ្ចូល UC ភ្លាមៗ មិនបាច់ចាំយូរ សុវត្ថិភាពខ្ពស់បំផុតតាមរយៈ Player ID',
    descEn: 'Instant UC credit via Player ID. 100% safe, no password required.',
    badgeKh: '⚡ ភ្លាមៗ 1-3 វិនាទី',
    badgeEn: '⚡ Instant Delivery',
    discountTag: 'POPULAR',
    originalPrice: '$1.50',
    discountPrice: '$0.99',
    image: 'https://khmer-topup.com/static/uploads/games/pubg-mobile-real.webp',
    gameId: 'pubg-mobile',
  },
];

interface HeroBannerProps {
  lang: Language;
  banners?: BannerData[];
  onExploreTopup: () => void;
  onSelectPromoGame?: (gameId?: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  lang,
  banners = DEFAULT_BANNERS,
  onExploreTopup,
  onSelectPromoGame,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  const slide = banners[currentSlide] || banners[0];

  const handleAction = () => {
    if (slide.gameId && onSelectPromoGame) {
      onSelectPromoGame(slide.gameId);
    } else {
      onExploreTopup();
    }
  };

  return (
    <div className="relative max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-2">
      {/* Promo Carousel Wrapper */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-amber-500/30 bg-[#171410] shadow-2xl shadow-black/80 aspect-[16/9] sm:aspect-[21/9] min-h-[230px] max-h-[360px] flex items-center group/carousel"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Background Artwork */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 filter brightness-65"
          style={{ backgroundImage: `url(${slide.image})` }}
        />

        {/* Cyberpunk & Gold Gradients Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0c0a] via-transparent to-black/40" />

        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-35 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500 via-red-600 to-transparent" />

        {/* Promo Tag Floating Banner at Top Right */}
        {slide.discountTag && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-red-600/40 animate-pulse border border-red-400/40">
            <Tag className="w-3.5 h-3.5" />
            <span>{slide.discountTag}</span>
          </div>
        )}

        {/* Banner Content */}
        <div className="relative z-10 px-5 sm:px-10 py-6 max-w-xl space-y-2">
          {/* Badge pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold shadow-sm backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'kh' ? slide.badgeKh : slide.badgeEn}</span>
          </div>

          {/* Banner Title */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight drop-shadow-md">
            {lang === 'kh' ? slide.titleKh : slide.titleEn}
          </h2>

          {/* Banner Description */}
          <p className="text-xs sm:text-sm text-stone-300 line-clamp-2 leading-relaxed">
            {lang === 'kh' ? slide.descKh : slide.descEn}
          </p>

          {/* Discount Price Bar */}
          {slide.discountPrice && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                {slide.discountPrice}
              </span>
              {slide.originalPrice && (
                <span className="text-xs sm:text-sm line-through text-stone-400 font-medium">
                  {slide.originalPrice}
                </span>
              )}
            </div>
          )}

          {/* CTA Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleAction}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm transition-transform active:scale-95 shadow-lg shadow-amber-500/25 flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>{lang === 'kh' ? 'ទិញកញ្ចប់ប្រូម៉ូសិននេះ' : 'Claim Offer Now'}</span>
            </button>

            <button
              onClick={onExploreTopup}
              className="hidden xs:flex items-center gap-1 text-[11px] sm:text-xs text-amber-400/90 font-bold hover:text-white transition"
            >
              <span>{lang === 'kh' ? 'មើលកញ្ចប់ទាំងអស់' : 'Explore Catalog'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() =>
            setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length)
          }
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-stone-700/60 text-white flex items-center justify-center transition backdrop-blur-sm z-20"
          aria-label="Previous promotional slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % banners.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-stone-700/60 text-white flex items-center justify-center transition backdrop-blur-sm z-20"
          aria-label="Next promotional slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Carousel Indicators & Pause Hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? 'w-6 bg-amber-400'
                  : 'w-2 bg-stone-600/70 hover:bg-stone-400'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
