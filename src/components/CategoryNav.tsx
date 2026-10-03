import React from 'react';
import {
  Gamepad2,
  Search,
  ArrowRight,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { Language } from '../types';
import { CustomCategory, getStoredCategories } from '../services/categoryService';

export type CategoryFilter = string;

interface CategoryNavProps {
  lang: Language;
  theme?: 'dark' | 'light';
  selectedCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  maxPriceFilter: number;
  onMaxPriceFilterChange: (val: number) => void;
  totalFilteredCount: number;
  customCategories?: CustomCategory[];
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  lang,
  theme = 'dark',
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  maxPriceFilter,
  onMaxPriceFilterChange,
  totalFilteredCount,
  customCategories,
}) => {
  const isDark = theme === 'dark';
  const categoriesList = customCategories || getStoredCategories();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-2 space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <h2 className={`text-lg sm:text-xl font-black tracking-wider uppercase font-sans ${isDark ? 'text-white' : 'text-stone-900'}`}>
            {lang === 'kh' ? 'ហ្គេមពេញនិយម' : 'FEATURED GAMES'}
          </h2>
        </div>

        <button
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase transition ${
            isDark
              ? 'bg-[#1e1b16] hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
          }`}
        >
          <span>{totalFilteredCount} {lang === 'kh' ? 'ហ្គេម' : 'GAMES'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Input Bar & Price Range Toggle */}
      <div className="space-y-2.5">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              lang === 'kh'
                ? 'ស្វែងរកហ្គេម (Free Fire, MLBB, Roblox, PUBG, Genshin...)'
                : 'Search games (Free Fire, MLBB, Roblox, PUBG, Genshin...)'
            }
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none transition shadow-inner ${
              isDark
                ? 'bg-[#181612] border-stone-800 text-white placeholder-stone-400 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50'
                : 'bg-white border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 dark:hover:text-white text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Interactive Price Range Slider Filter */}
        <div className={`p-3 sm:p-3.5 rounded-xl border space-y-2 ${
          isDark ? 'bg-[#171410] border-stone-800' : 'bg-white border-stone-200 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            <div className={`flex items-center gap-1.5 font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {lang === 'kh' ? 'តម្រងតម្លៃកញ្ចប់អតិបរមា:' : 'Max Package Price Filter:'}
              </span>
              <span className="text-amber-500 font-mono font-black text-sm">
                ${maxPriceFilter >= 50 ? '50.00+ (All)' : `${maxPriceFilter.toFixed(2)} USD`}
              </span>
            </div>

            {/* Price Presets */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {[1.0, 5.0, 10.0, 25.0, 50.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onMaxPriceFilterChange(preset)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    maxPriceFilter === preset
                      ? 'bg-amber-400 text-black font-black'
                      : isDark
                      ? 'bg-[#201d17] text-stone-400 hover:text-white border border-stone-800'
                      : 'bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200'
                  }`}
                >
                  {preset >= 50 ? 'All' : `≤ $${preset}`}
                </button>
              ))}

              {maxPriceFilter < 50 && (
                <button
                  type="button"
                  onClick={() => onMaxPriceFilterChange(50)}
                  className="p-1 text-stone-400 hover:text-amber-500 text-[10px] flex items-center gap-0.5"
                  title="Reset price filter"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Range Input Slider */}
          <div className="relative flex items-center">
            <input
              type="range"
              min={0.25}
              max={50.0}
              step={0.5}
              value={maxPriceFilter}
              onChange={(e) => onMaxPriceFilterChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-stone-300 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Categories Horizontal Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {categoriesList.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                isSelected
                  ? 'bg-amber-400 text-black shadow-md font-black'
                  : isDark
                  ? 'bg-[#181612] text-stone-300 hover:text-white hover:bg-[#201d17] border border-stone-800'
                  : 'bg-white text-stone-700 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 shadow-sm'
              }`}
            >
              <span>{cat.icon || '🎮'}</span>
              <span>{lang === 'kh' ? cat.nameKh : cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
