import React from 'react';
import { Zap, QrCode, Headphones } from 'lucide-react';
import { Language } from '../types';

interface FeatureHighlightsProps {
  lang: Language;
}

export const FeatureHighlights: React.FC<FeatureHighlightsProps> = ({ lang }) => {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
      <div className="space-y-3">
        {/* Highlight 1: Instant Delivery */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#171410] border border-stone-800/80 hover:border-amber-500/40 transition flex items-start gap-4 shadow-md">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400">
              {lang === 'kh' ? 'ផ្តល់ជូនភ្លាមៗ' : 'Instant Automated Delivery'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 leading-relaxed">
              {lang === 'kh'
                ? 'ប្រព័ន្ធស្វ័យប្រវត្តបញ្ជូន Key និង Link Download ភ្លាមៗក្រោយទូទាត់ជោគជ័យ។'
                : 'Automated fulfillment system immediately delivers diamonds, game vouchers, and keys upon successful payment.'}
            </p>
          </div>
        </div>

        {/* Highlight 2: Scan KHQR */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#171410] border border-stone-800/80 hover:border-amber-500/40 transition flex items-start gap-4 shadow-md">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400">
              {lang === 'kh' ? 'ស្កេន KHQR' : 'Scan & Pay via KHQR'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 leading-relaxed">
              {lang === 'kh'
                ? 'ស្កេនទូទាត់ប្រាក់ USD តាម KHQR នៃគ្រប់ធនាគារ (ABA, Wing, ACLEDA, etc.)។'
                : 'Universal KHQR payment support across all Cambodian mobile banking apps (ABA Mobile, Wing Bank, ACLEDA, Sathapana, etc.).'}
            </p>
          </div>
        </div>

        {/* Highlight 3: 24h Support */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#171410] border border-stone-800/80 hover:border-amber-500/40 transition flex items-start gap-4 shadow-md">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400">
              {lang === 'kh' ? 'ជំនួយ 24h' : '24/7 Expert Support'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 leading-relaxed">
              {lang === 'kh'
                ? 'ក្រុមការងារជំនាញចាំជួយដំឡើង និងណែនាំ 24 ម៉ោងតាម Telegram។'
                : 'Dedicated customer support technicians standing by 24/7 on Telegram to guide installation and top-up.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
