import React, { useState } from 'react';
import { X, Lock, Shield, User, LogOut, CheckCircle, Sparkles, Key } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserProfile, Language, UserRole } from '../types';
import { upsertUserProfile, logActivity, ADMIN_BOOTSTRAP_EMAIL } from '../firebase/services';
import { encryptSensitiveData } from '../firebase/encryption';

interface UserAuthModalProps {
  lang: Language;
  currentUser: UserProfile | null;
  onClose: () => void;
  onUserChanged: (user: UserProfile | null) => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  lang,
  currentUser,
  onClose,
  onUserChanged,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      const profile = await upsertUserProfile({
        uid: fbUser.uid,
        email: fbUser.email || 'user@razykh.app',
        displayName: fbUser.displayName || 'Gamer KH',
        photoURL: fbUser.photoURL || '',
      });

      await logActivity(
        'USER_LOGIN_GOOGLE',
        `User ${profile.email} logged in via Google Cloud Auth`,
        'security',
        { uid: profile.uid, email: profile.email }
      );

      onUserChanged(profile);
      onClose();
    } catch (err: any) {
      console.error('Google Sign in error:', err);
      // If popup was blocked or closed, give friendly message
      setErrorMsg(
        err.code === 'auth/popup-closed-by-user'
          ? 'Popup closed. You can also test with the one-click Cloud Personas below.'
          : 'Google Sign-in encounter: ' + (err.message || 'Please try demo persona')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePersona = async (email: string, name: string, role: UserRole) => {
    setLoading(true);
    try {
      const uid = `uid-${email.replace(/[@.]/g, '-')}`;
      const profile = await upsertUserProfile({
        uid,
        email,
        displayName: name,
        role,
      });

      await logActivity(
        'USER_LOGIN_SIMULATED',
        `Session authenticated as [${role.toUpperCase()}] ${email}`,
        role === 'admin' ? 'security' : 'action',
        { uid, email }
      );

      onUserChanged(profile);
      onClose();
    } catch (err) {
      console.error('Persona login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEncryptedData = async () => {
    if (!currentUser) return;
    try {
      const encrypted = await encryptSensitiveData(privateNote, currentUser.uid);
      const updated = await upsertUserProfile({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        role: currentUser.role,
        encryptedData: encrypted,
      });
      await logActivity('ENCRYPTED_DATA_SAVED', `Updated AES-GCM encrypted user vault for ${currentUser.email}`, 'security');
      onUserChanged(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to encrypt:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      if (currentUser) {
        await logActivity('USER_LOGOUT', `User ${currentUser.email} logged out`, 'info');
      }
      await signOut(auth);
      onUserChanged(null);
      onClose();
    } catch (err) {
      console.error('Sign out error:', err);
      onUserChanged(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-[#14120e] border border-amber-500/30 p-5 sm:p-6 shadow-2xl shadow-black text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {currentUser ? (
          /* Profile Details */
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-stone-800">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-lg">
                {currentUser.displayName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{currentUser.displayName}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      currentUser.role === 'admin'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-xs text-stone-400">{currentUser.email}</p>
              </div>
            </div>

            {/* Wallet & Security Status */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-[#1c1914] border border-stone-800">
                <span className="text-stone-400 text-[11px] block">{lang === 'kh' ? 'សមតុល្យគណនី' : 'Account Balance'}</span>
                <span className="text-lg font-black text-amber-400">
                  ${currentUser.balanceUsd.toFixed(2)} USD
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#1c1914] border border-stone-800">
                <span className="text-stone-400 text-[11px] block">{lang === 'kh' ? 'ស្ថានភាពសុវត្ថិភាព' : 'Security Status'}</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>AES-GCM Secure</span>
                </span>
              </div>
            </div>

            {/* Personal Encrypted Storage */}
            <div className="p-3.5 rounded-xl bg-[#171410] border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'kh' ? 'ផ្ទុកទិន្នន័យសម្ងាត់ (Encrypted Vault)' : 'Encrypted Private Data Vault'}</span>
                </label>
                {currentUser.encryptedData && (
                  <span className="text-[10px] text-emerald-400 font-bold">1 Record Saved</span>
                )}
              </div>
              <input
                type="text"
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                placeholder={lang === 'kh' ? 'បញ្ចូល PIN ឬ Phone សម្ងាត់' : 'Private phone, PIN or backup codes'}
                className="w-full px-3 py-2 rounded-lg bg-[#201d17] border border-stone-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleSaveEncryptedData}
                className="w-full py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 transition"
              >
                {savedSuccess ? '✅ Saved & Encrypted!' : 'Encrypt & Store to Firestore'}
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 text-xs font-bold flex items-center justify-center gap-2 border border-red-800/60 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>{lang === 'kh' ? 'ចាកចេញពីគណនី' : 'Sign Out'}</span>
            </button>
          </div>
        ) : (
          /* Sign-In Options */
          <div className="space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-white">
                {lang === 'kh' ? 'ចូលគណនី K-STORE KH' : 'Cloud-Based Authentication'}
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                {lang === 'kh'
                  ? 'ភ្ជាប់គណនី Google ឬ ជ្រើសរើស Persona ដើម្បីសាកល្បង Role-Based Access Control'
                  : 'Sign in with Google OAuth or switch persona to test scalable RBAC roles'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-stone-100 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-98 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{lang === 'kh' ? 'ចូលតាម Google Account' : 'Sign in with Google'}</span>
            </button>

            {/* Quick RBAC Persona Testing Buttons */}
            <div className="pt-2 border-t border-stone-800">
              <span className="text-[11px] font-bold text-stone-400 block mb-2">
                {lang === 'kh' ? '⚡ សាកល្បងសិទ្ធិ RBAC ភ្លាមៗ:' : '⚡ Instant RBAC Persona Testing:'}
              </span>
              <div className="space-y-1.5">
                {/* Admin Bootstrap Email */}
                <button
                  type="button"
                  onClick={() =>
                    handleSimulatePersona(ADMIN_BOOTSTRAP_EMAIL, 'Sokhin Sory (Admin)', 'admin')
                  }
                  className="w-full p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-left flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-white block">Sokhin Sory (Superadmin)</span>
                      <span className="text-[10px] text-amber-400 font-mono">{ADMIN_BOOTSTRAP_EMAIL}</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[10px] font-black uppercase">
                    Admin
                  </span>
                </button>

                {/* Standard User */}
                <button
                  type="button"
                  onClick={() =>
                    handleSimulatePersona('gamer.kh@razykh.app', 'Vannak Gamer', 'user')
                  }
                  className="w-full p-2.5 rounded-xl bg-[#1b1814] hover:bg-[#23201a] border border-stone-800 text-left flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-stone-400" />
                    <div>
                      <span className="font-bold text-white block">Vannak Gamer (Standard)</span>
                      <span className="text-[10px] text-stone-400">gamer.kh@razykh.app</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-stone-700 text-stone-300 text-[10px] font-bold uppercase">
                    User
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
