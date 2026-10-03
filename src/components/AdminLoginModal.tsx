import React, { useState } from 'react';
import { X, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { verifyAdminCredentialsAsync, setAdminSession, isCustomCredentialsSet } from '../services/adminAuthService';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const isCustom = isCustomCredentialsSet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('សូមបញ្ចូលឈ្មោះគណនី Admin (Username)!');
      return;
    }
    if (!code.trim()) {
      setErrorMsg('សូមបញ្ចូលលេខកូដសម្ងាត់ (Security Code / Password)!');
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await verifyAdminCredentialsAsync(username, code);
      if (isValid) {
        setAdminSession(true);
        setIsLoading(false);
        onSuccess();
      } else {
        setIsLoading(false);
        setErrorMsg('Username ឬលេខកូដសម្ងាត់មិនត្រឹមត្រូវទេ! សូមព្យាយាមម្តងទៀត។');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'ការផ្ទៀងផ្ទាត់បរាជ័យ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#161410] border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-500/10 text-white space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full bg-stone-900/60 border border-stone-800 hover:bg-stone-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-400/30 to-amber-600/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase">
            ផ្ទាំងចូលគ្រប់គ្រង (Admin Login)
          </h3>
          <p className="text-xs text-stone-400 max-w-xs mx-auto">
            សូមបញ្ចូល Username និងលេខកូដសម្ងាត់ ដើម្បីចូលកាន់ Admin Dashboard
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-400 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-300">
              ឈ្មោះអ្នកប្រើ (Admin Username):
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <User className="w-4 h-4 text-amber-500" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="ឧ. admin"
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#100f0c] border border-stone-800 focus:border-amber-500 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition font-mono"
              />
            </div>
          </div>

          {/* Security Code Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-stone-300">
                លេខកូដសម្ងាត់ (Security Code):
              </label>
              <span className="text-[10px] text-stone-400">កូដសម្ងាត់ ៦ ខ្ទង់</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
              </div>
              <input
                type={showCode ? 'text' : 'password'}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#100f0c] border border-stone-800 focus:border-amber-500 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition font-mono tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-white"
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>កំពុងផ្ទៀងផ្ទាត់...</span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>ចូលកាន់ Admin Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Discreet Notice */}
        <div className="pt-2 text-center border-t border-stone-800/80">
          <p className="text-[11px] text-stone-400">
            {isCustom ? (
              <span className="text-amber-400 font-semibold">🔒 ប្រព័ន្ធការពារដោយលេខកូដផ្ទាល់ខ្លួន (Custom Security Code)</span>
            ) : (
              <>គណនីដើម (Default): <span className="font-mono text-stone-300">admin</span> / កូដ: <span className="font-mono text-stone-300">888888</span></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
