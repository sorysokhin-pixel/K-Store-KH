import React from 'react';
import { Bot, Send, Lock } from 'lucide-react';
import { Language } from '../types';

interface FooterProps {
  lang: Language;
  theme?: 'dark' | 'light';
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ lang, theme = 'dark', onOpenAdmin }) => {
  const isDark = theme === 'dark';

  return (
    <footer
      className={`mt-8 border-t py-10 px-4 text-center relative transition-colors ${
        isDark ? 'border-stone-800/80 bg-[#100f0c]' : 'border-stone-200 bg-stone-100'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 p-[1.5px] flex items-center justify-center overflow-hidden shadow-md">
            <img
              src="/logo.jpg"
              alt="K-STORE Logo"
              className="w-full h-full object-cover rounded-full bg-yellow-400"
            />
          </div>
          <div className="flex items-baseline">
            <span className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-stone-900'}`}>
              K-STORE
            </span>
            <span className="ml-1 text-xl font-black text-amber-500">KH</span>
          </div>
        </div>

        {/* Copyright & Subtitle */}
        <p className={`text-xs max-w-md ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
          © 2026{' '}
          <strong className={isDark ? 'text-white' : 'text-stone-900'}>
            K-STORE KH
          </strong>{' '}
          (<span className="text-amber-500 font-bold">kstorekh.vercel.app</span>). Fast &amp; Secure Game Top-Up. All rights reserved.
        </p>

        {/* Action Links */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Telegram Direct Support Link -> Admin @sorysokhin */}
          <a
            href="https://t.me/sorysokhin"
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
              isDark
                ? 'bg-[#1b1814] hover:bg-[#25211b] border-stone-800 text-sky-400'
                : 'bg-white hover:bg-stone-50 border-stone-300 text-sky-600 shadow-sm'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram Admin: @sorysokhin</span>
          </a>

          {/* Discreet Admin Portal Entry */}
          {onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                isDark
                  ? 'border-stone-800 text-stone-500 hover:text-amber-400 hover:border-amber-500/30 bg-[#161410]'
                  : 'border-stone-200 text-stone-500 hover:text-amber-600 bg-stone-50'
              }`}
              title="Admin Portal Login (Ctrl+Shift+A)"
            >
              <Lock className="w-3 h-3" />
              <span>Admin Portal</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating 24h Robot Support Widget at Bottom-Right -> @sorysokhin */}
      <a
        href="https://t.me/sorysokhin"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 p-[2px] shadow-2xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center group"
        title="24/7 Telegram Live Support @sorysokhin"
      >
        <div className="w-full h-full rounded-full bg-[#17140f] flex items-center justify-center relative overflow-hidden border border-amber-400/40">
          <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black animate-pulse" />
        </div>
      </a>
    </footer>
  );
};
