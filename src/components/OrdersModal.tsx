import React, { useState } from 'react';
import { X, Receipt, Check, Copy, ExternalLink, QrCode, Key } from 'lucide-react';
import { OrderItem, Language } from '../types';

interface OrdersModalProps {
  orders: OrderItem[];
  lang: Language;
  onClose: () => void;
  onOpenKhqr: (order: OrderItem) => void;
}

export const OrdersModal: React.FC<OrdersModalProps> = ({
  orders,
  lang,
  onClose,
  onOpenKhqr,
}) => {
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const handleCopyKey = (key: string, orderId: string) => {
    navigator.clipboard.writeText(key);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#14120e] border border-amber-500/30 p-5 sm:p-6 shadow-2xl shadow-black text-left max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">
              {lang === 'kh' ? 'ប្រវត្តិបញ្ជាទិញ (My Orders)' : 'My Orders & Top-Up History'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              {lang === 'kh' ? 'មិនទាន់មានប្រវត្តិបញ្ជាទិញទេ' : 'No top-up transactions yet.'}
            </div>
          ) : (
            orders.map((ord) => {
              const isKey = ord.isKeyService || Boolean(ord.licenseKey);
              const keyString =
                ord.licenseKey ||
                `TRLL-${ord.orderId.substring(3, 7).toUpperCase()}-4EC5`;

              return (
                <div
                  key={ord.orderId}
                  className="p-3.5 rounded-2xl bg-[#1a1713] border border-stone-800 hover:border-stone-700 space-y-2 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-amber-400 font-mono font-bold block">
                        {ord.orderId}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5">
                        {ord.gameTitle} • {ord.packageTitle}
                      </h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        ord.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : ord.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  {/* Display License Key Box for Panel / Digital Key Orders */}
                  {isKey && ord.status === 'completed' && (
                    <div className="p-2.5 rounded-xl bg-[#140c0c] border border-dashed border-red-500/60 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-red-400 font-extrabold uppercase">
                        <span className="flex items-center gap-1">
                          <Key className="w-3 h-3" /> License Key
                        </span>
                        <span>VIP Key</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-red-500 tracking-wider">
                        {keyString}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleCopyKey(keyString, ord.orderId)}
                          className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 transition"
                        >
                          {copiedOrderId === ord.orderId ? (
                            <>
                              <Check className="w-3 h-3" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Key
                            </>
                          )}
                        </button>
                        <a
                          href={ord.unlockUrl || 'https://kstorekh.vercel.app/unlock'}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 transition"
                        >
                          <ExternalLink className="w-3 h-3" /> UNLOCK
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-stone-400 pt-1 border-t border-stone-800/80">
                    <div>
                      <span>Account / Contact: </span>
                      <strong className="text-stone-200 font-mono">{ord.playerId}</strong>
                    </div>
                    <div className="text-sm font-black text-amber-400 font-mono">
                      ${ord.amountUsd.toFixed(2)} USD
                    </div>
                  </div>

                  {ord.status === 'pending' && (
                    <button
                      onClick={() => {
                        onOpenKhqr(ord);
                        onClose();
                      }}
                      className="w-full mt-1 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{lang === 'kh' ? 'បើកស្កេន KHQR ម្តងទៀត' : 'Open KHQR Payment'}</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
