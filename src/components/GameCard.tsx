import React from 'react';
import { Heart } from 'lucide-react';
import { GameItem, Language } from '../types';

interface GameCardProps {
  game: GameItem;
  lang: Language;
  theme?: 'dark' | 'light';
  isFavorite: boolean;
  onToggleFavorite: (gameId: string) => void;
  onSelectGame: (game: GameItem) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  lang,
  theme = 'dark',
  isFavorite,
  onToggleFavorite,
  onSelectGame,
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      onClick={() => onSelectGame(game)}
      className={`group relative flex flex-col justify-between rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 transition-all duration-200 hover:-translate-y-1 cursor-pointer select-none border ${
        isDark
          ? 'bg-[#171410] border-stone-800/90 hover:border-amber-500/50 hover:shadow-xl hover:shadow-black/70'
          : 'bg-white border-stone-200 hover:border-amber-500 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-lg sm:rounded-xl overflow-hidden bg-stone-900 mb-2">
        <img
          src={game.coverImage}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.retried && game.coverImage?.startsWith('https://khmer-topup.com/')) {
              target.dataset.retried = 'true';
              target.src = `/api/khmer-topup/image-proxy?url=${encodeURIComponent(game.coverImage)}`;
            }
          }}
        />

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top-Left POPULAR Badge (Matching Screenshot 1) */}
        {game.isHot ? (
          <div className="absolute top-1.5 left-1.5 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 text-white border border-stone-700/80 text-[9px] font-black uppercase tracking-wider backdrop-blur-sm shadow-md">
              <span className="text-amber-400">🔥</span>
              <span>POPULAR</span>
            </span>
          </div>
        ) : game.badge ? (
          <div className="absolute top-1.5 left-1.5 z-10">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-black/75 text-amber-400 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
              {lang === 'kh' && game.badgeKh ? game.badgeKh : game.badge}
            </span>
          </div>
        ) : null}

        {/* Top-Right Country Flag Badge (Matching Screenshot 1) */}
        {game.countryFlag ? (
          <div className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full overflow-hidden border border-white/60 shadow-md bg-stone-900 flex items-center justify-center">
            <img
              src={game.countryFlag}
              alt="Country Flag"
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.retried && game.countryFlag?.startsWith('https://khmer-topup.com/')) {
                  target.dataset.retried = 'true';
                  target.src = `/api/khmer-topup/image-proxy?url=${encodeURIComponent(game.countryFlag)}`;
                }
              }}
            />
          </div>
        ) : (
          /* Favorite Heart Button if no flag */
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(game.id);
            }}
            className={`absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
              isFavorite
                ? 'bg-red-500/80 text-white'
                : 'bg-black/50 text-stone-300 hover:text-red-400 hover:bg-black/70'
            }`}
            aria-label="Add to favorites"
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-white' : ''}`} />
          </button>
        )}

        {/* Bottom Corner Title / Stock Level Badge if low */}
        {game.stockCount === 0 ? (
          <div className="absolute bottom-1.5 left-1.5">
            <span className="px-1.5 py-0.5 rounded bg-red-600/90 text-white text-[9px] font-extrabold shadow">
              {lang === 'kh' ? 'អស់ស្តុក' : 'Out of Stock'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Game Title */}
      <div className="px-0.5 mb-2 flex-grow flex items-center justify-center text-center">
        <h3
          className={`text-xs sm:text-sm font-bold line-clamp-1 transition-colors ${
            isDark ? 'text-white group-hover:text-amber-300' : 'text-stone-900 group-hover:text-amber-600'
          }`}
        >
          {game.title}
        </h3>
      </div>

      {/* Amber TOPUP Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectGame(game);
        }}
        className="w-full py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-500 text-black font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-md shadow-amber-500/15 group-hover:shadow-amber-500/30 transition-all duration-200 active:scale-95"
      >
        TOPUP
      </button>
    </div>
  );
};
