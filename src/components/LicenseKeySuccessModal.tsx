import React, { useState } from 'react';
import { Check, Copy, ExternalLink, PlayCircle, Send, X, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Language, OrderItem } from '../types';

interface LicenseKeySuccessModalProps {
  order: OrderItem;
  lang: Language;
  onClose: () => void;
}

export const LicenseKeySuccessModal: React.FC<LicenseKeySuccessModalProps> = ({
  order,
  lang,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  // Generate a realistic license key if missing
  const key =
    order.licenseKey ||
    `TRLL-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-4EC5`;

  const unlockUrl = order.unlockUrl || 'https://kstorekh.vercel.app/unlock';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (e) {
      console.log('Confetti:', e);
    }
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenUnlock = () => {
    handleCopyKey();
    window.open(unlockUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm sm:max-w-md rounded-3xl bg-[#12100d] border border-amber-500/30 p-5 sm:p-6 shadow-2xl shadow-black text-center overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition z-10"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Green Circle Header */}
        <div className="flex flex-col items-center justify-center mt-1 mb-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-2 shadow-lg shadow-emerald-500/20">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {lang === 'kh' ? 'ការទូទាត់ជោគជ័យ!' : 'Payment Successful!'}
          </h2>
          <p className="text-xs text-stone-300 mt-1 max-w-xs font-medium">
            {lang === 'kh'
              ? 'សូមអរគុណ! នេះជាព័ត៌មានបញ្ជាទិញ និង License Key របស់អ្នក៖'
              : 'Thank you! Here is your purchase detail & License Key:'}
          </p>
        </div>

        {/* Red Dashed Boundary Card - LICENSE KEY BOX */}
        <div className="my-4 p-4 rounded-2xl bg-[#1a0f0f] border-2 border-dashed border-red-500/80 space-y-3 relative shadow-inner">
          <div className="text-[11px] font-black uppercase tracking-widest text-stone-300">
            LICENSE KEY របស់អ្នក
          </div>

          {/* Key Code Text */}
          <div className="text-xl sm:text-2xl font-black font-mono text-red-500 tracking-wider break-all bg-black/40 py-2 px-3 rounded-xl border border-red-900/60 shadow-inner">
            {key}
          </div>

          {/* Two Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleCopyKey}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 shadow-lg shadow-emerald-600/30"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'kh' ? 'បានចម្លង!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{lang === 'kh' ? 'ចម្លង KEY (COPY)' : 'Copy KEY'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenUnlock}
              className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 shadow-lg shadow-red-600/30"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{lang === 'kh' ? 'ចូល UNLOCK' : 'Open UNLOCK'}</span>
            </button>
          </div>

          {/* Tip / Instruction Box */}
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] sm:text-xs text-emerald-300 text-left leading-relaxed flex items-start gap-1.5">
            <span className="shrink-0 text-base">💡</span>
            <div>
              <strong>{lang === 'kh' ? 'របៀបប្រើ៖' : 'How to use:'}</strong>{' '}
              {lang === 'kh'
                ? 'ចុច «ចម្លង Key» រួចចូលទៅគេហទំព័រ ហើយចុច Paste (បិទភ្ជាប់) ក្នុងប្រអប់ Key រួចចុច UNLOCK។'
                : 'Click "Copy KEY", open the unlock portal, paste the code into the Key field, and click UNLOCK.'}
            </div>
          </div>
        </div>

        {/* Order Details Summary Box */}
        <div className="p-3.5 rounded-2xl bg-[#1a1713] border border-stone-800 text-xs text-left space-y-1.5 font-medium">
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Order ID:</span>
            <span className="text-red-400 font-mono font-bold">{order.orderId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Product:</span>
            <span className="text-white font-bold">{order.gameTitle}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Plan / Package:</span>
            <span className="text-stone-300">{order.packageTitle}</span>
          </div>
        </div>

        {/* Two Blue Action Buttons at Bottom */}
        <div className="mt-4 space-y-2">
          <a
            href="https://t.me/sorysokhin"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/25 active:scale-98"
          >
            <PlayCircle className="w-4 h-4" />
            <span>{lang === 'kh' ? 'វីដេអូបង្រៀនរបៀបដាក់ (Video Guide)' : 'Video Guide Tutorial'}</span>
          </a>

          <a
            href="https://t.me/sorysokhin"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-[#0a1e30] hover:bg-sky-900 border border-sky-500/50 text-sky-300 hover:text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Send className="w-4 h-4" />
            <span>{lang === 'kh' ? 'ទាក់ទង Admin @sorysokhin' : 'Contact Admin @sorysokhin'}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
