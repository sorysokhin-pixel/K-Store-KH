import React from 'react';
import {
  ShieldCheck,
  UserCheck,
  Receipt,
  Shield,
  Send,
  Sun,
  Moon,
} from 'lucide-react';
import { Language, UserProfile } from '../types';

interface HeaderProps {
  lang: Language;
  onToggleLang: (lang: Language) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser: UserProfile | null;
  isAdmin: boolean;
  onOpenAdmin: () => void;
  onOpenOrders: () => void;
  onOpenAuth: () => void;
  onOpenVault: () => void;
  orderCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  currentUser,
  isAdmin,
  onOpenAdmin,
  onOpenOrders,
  onOpenAuth,
  onOpenVault,
  orderCount,
}) => {
  const isDark = theme === 'dark';

  const [logoClicks, setLogoClicks] = React.useState(0);
  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        onOpenAdmin();
        return 0;
      }
      return next;
    });
  };

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-200 ${
        isDark
          ? 'bg-[#12110e]/95 border-amber-500/15'
          : 'bg-white/95 border-stone-200 shadow-sm'
      }`}
    >
      {/* Live Telegram Alert Bar with Admin @sorysokhin */}
      <div className="bg-gradient-to-r from-sky-950 via-[#0e273c] to-sky-950 px-3 py-1 text-xs text-sky-200 border-b border-sky-800/40 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-2 max-w-full truncate">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500 text-black uppercase tracking-wider animate-pulse shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            LIVE
          </span>
          <span className="truncate">
            Telegram Admin:{' '}
            <a
              href="https://t.me/sorysokhin"
              target="_blank"
              rel="noreferrer"
              className="text-sky-300 font-bold hover:underline"
            >
              @sorysokhin
            </a>{' '}
            {lang === 'kh' ? 'សម្រាប់ការ Update និង កស្តាក...' : 'for updates and support...'}
          </span>
        </div>
        <a
          href="https://t.me/sorysokhin"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:flex items-center gap-1 text-[11px] text-sky-300 hover:text-white shrink-0 pl-3 font-medium"
        >
          <Send className="w-3 h-3" />
          Contact Admin @sorysokhin
        </a>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Logo (Uploaded Avatar Logo /logo.jpg) */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={handleLogoClick}
        >
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 p-[2px] shadow-lg shadow-amber-500/20 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
            <img
              src="/logo.jpg"
              alt="K-STORE Mascot Logo"
              className="w-full h-full object-cover rounded-full bg-yellow-400"
            />
          </div>

          <div className="flex items-baseline">
            <span
              className={`text-2xl font-black tracking-tight font-sans ${
                isDark ? 'text-white' : 'text-stone-900'
              }`}
            >
              K-STORE
            </span>
            <span className="ml-1 text-2xl font-black text-amber-500 tracking-tight">
              KH
            </span>
          </div>
        </div>

        {/* Right Action Icons & Auth */}
        <div className="flex items-center gap-2 sm:gap-2.5">

          {/* Theme Toggle Button (Sun / Moon) */}
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-lg border transition duration-200 active:scale-90 ${
              isDark
                ? 'bg-[#201d18] hover:bg-[#2c2821] border-stone-800 text-amber-400'
                : 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-amber-600'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark/light theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-stone-700 animate-in spin-in-180 duration-300" />
            )}
          </button>

          {/* Encrypted Vault Button */}
          <button
            onClick={onOpenVault}
            className={`flex items-center gap-1 p-2 rounded-lg border text-xs transition ${
              isDark
                ? 'bg-[#201d18] hover:bg-[#2c2821] border-stone-800 text-stone-300 hover:text-amber-400'
                : 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-700'
            }`}
            title="Encrypted Data Vault (AES-GCM)"
          >
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="hidden lg:inline text-[11px] font-semibold text-emerald-500">AES Vault</span>
          </button>

          {/* Orders / History Button */}
          <button
            onClick={onOpenOrders}
            className={`relative p-2 rounded-lg border transition ${
              isDark
                ? 'bg-[#201d18] hover:bg-[#2c2821] border-stone-800 text-stone-300 hover:text-white'
                : 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-700'
            }`}
            title="My Orders"
          >
            <Receipt className="w-4 h-4" />
            {orderCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {orderCount}
              </span>
            )}
          </button>

          {/* Telegram Channel Button -> Admin @sorysokhin */}
          <a
            href="https://t.me/sorysokhin"
            target="_blank"
            rel="noreferrer"
            className={`p-2 rounded-lg border transition ${
              isDark
                ? 'bg-[#201d18] hover:bg-sky-950 border-stone-800 hover:border-sky-500/40 text-sky-400'
                : 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-600'
            }`}
            title="Telegram Admin @sorysokhin"
          >
            <Send className="w-4 h-4" />
          </a>

          {/* Language Toggle KH | EN */}
          <div
            className={`flex items-center rounded-lg p-0.5 border text-xs font-bold ${
              isDark ? 'bg-[#201d18] border-stone-800' : 'bg-stone-100 border-stone-300'
            }`}
          >
            <button
              onClick={() => onToggleLang('kh')}
              className={`px-2 py-1 rounded-md transition ${
                lang === 'kh'
                  ? 'bg-amber-400 text-black shadow font-black'
                  : 'text-stone-400 hover:text-stone-900'
              }`}
            >
              KH
            </button>
            <button
              onClick={() => onToggleLang('en')}
              className={`px-2 py-1 rounded-md transition ${
                lang === 'en'
                  ? 'bg-amber-400 text-black shadow font-black'
                  : 'text-stone-400 hover:text-stone-900'
              }`}
            >
              EN
            </button>
          </div>

          {/* User Profile / Auth Button */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs transition shadow-md shadow-amber-500/10"
          >
            {currentUser ? (
              <>
                <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-black uppercase text-black">
                  {currentUser.displayName.charAt(0)}
                </div>
                <span className="max-w-[70px] sm:max-w-[100px] truncate">{currentUser.displayName}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/25 text-black font-extrabold uppercase">
                  {currentUser.role}
                </span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span className="hidden xs:inline">{lang === 'kh' ? 'ចូលគណនី' : 'Login'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
