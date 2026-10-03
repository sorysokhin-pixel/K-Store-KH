import React, { useState } from 'react';
import { X, ShieldCheck, Lock, Unlock, Key, Copy, Check, Info } from 'lucide-react';
import { encryptSensitiveData, decryptSensitiveData } from '../firebase/encryption';
import { Language, UserProfile } from '../types';
import { logActivity, upsertUserProfile } from '../firebase/services';

interface SecurityVaultModalProps {
  lang: Language;
  currentUser: UserProfile | null;
  onClose: () => void;
  onProfileUpdated?: (user: UserProfile) => void;
}

export const SecurityVaultModal: React.FC<SecurityVaultModalProps> = ({
  lang,
  currentUser,
  onClose,
  onProfileUpdated,
}) => {
  const [plainInput, setPlainInput] = useState('');
  const [passphrase, setPassphrase] = useState(currentUser?.uid || 'RaZyKH-User-Secret-2026');
  const [cipherOutput, setCipherOutput] = useState('');
  const [cipherInput, setCipherInput] = useState('');
  const [decryptedOutput, setDecryptedOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const handleEncrypt = async () => {
    if (!plainInput) return;
    try {
      setErrorMsg('');
      const encrypted = await encryptSensitiveData(plainInput, passphrase);
      setCipherOutput(encrypted);
      setCipherInput(encrypted);
    } catch (err: any) {
      setErrorMsg(err.message || 'Encryption error');
    }
  };

  const handleDecrypt = async () => {
    if (!cipherInput) return;
    try {
      setErrorMsg('');
      const decrypted = await decryptSensitiveData(cipherInput, passphrase);
      setDecryptedOutput(decrypted);
    } catch (err: any) {
      setErrorMsg('Decryption failed: Incorrect passkey or corrupt data.');
    }
  };

  const handleSaveToCloud = async () => {
    if (!currentUser || !cipherOutput) return;
    try {
      const updated = await upsertUserProfile({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        role: currentUser.role,
        encryptedData: cipherOutput,
      });
      await logActivity(
        'SECURITY_VAULT_SAVED',
        `AES-GCM ciphertext persisted to Firestore for ${currentUser.email}`,
        'security'
      );
      if (onProfileUpdated) onProfileUpdated(updated);
      setSaveStatus('✅ Encrypted data saved to cloud!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      setErrorMsg('Failed to save to cloud database.');
    }
  };

  const copyCipher = () => {
    navigator.clipboard.writeText(cipherOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#14120e] border border-emerald-500/30 p-5 sm:p-6 shadow-2xl shadow-black text-left max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-stone-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>{lang === 'kh' ? 'ប្រព័ន្ធផ្ទុកទិន្នន័យ Encrypted (AES-GCM 256)' : 'AES-GCM 256 Encrypted Vault'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                ACTIVE
              </span>
            </h2>
            <p className="text-xs text-stone-400">
              {lang === 'kh'
                ? 'ការពារព័ត៌មានរសើប និង Key ហ្គេម មុនពេលរក្សាទុកក្នុង Cloud'
                : 'Zero-knowledge client-side encryption using Web Crypto API'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="mt-4 space-y-4 text-xs">
          {/* Encryption Passkey */}
          <div className="p-3 rounded-xl bg-[#1b1814] border border-stone-800 space-y-1.5">
            <label className="text-stone-300 font-bold flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Derivation Passkey (Master Secret):</span>
            </label>
            <input
              type="text"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#100f0c] border border-stone-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Step 1: Encrypt Plaintext */}
          <div className="p-3.5 rounded-xl bg-[#171410] border border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Encrypt Sensitive Information</span>
              </span>
            </div>
            <textarea
              rows={2}
              value={plainInput}
              onChange={(e) => setPlainInput(e.target.value)}
              placeholder="Enter sensitive player credentials, game pass PIN, or private note..."
              className="w-full p-2.5 rounded-lg bg-[#1b1814] border border-stone-700 text-white placeholder-stone-400 text-xs focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleEncrypt}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Generate AES-GCM Ciphertext</span>
            </button>
          </div>

          {/* Ciphertext Output */}
          {cipherOutput && (
            <div className="p-3.5 rounded-xl bg-[#100e0b] border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Protected Ciphertext (Base64 + IV):
                </span>
                <button
                  onClick={copyCipher}
                  className="flex items-center gap-1 text-[11px] text-stone-300 hover:text-white"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-[10px] text-stone-300 break-all bg-black/60 p-2 rounded border border-stone-800">
                {cipherOutput}
              </p>
              {currentUser && (
                <button
                  onClick={handleSaveToCloud}
                  className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-bold transition"
                >
                  {saveStatus || 'Save Ciphertext to Cloud Profile (Firestore)'}
                </button>
              )}
            </div>
          )}

          {/* Step 2: Decrypt Test */}
          <div className="p-3.5 rounded-xl bg-[#171410] border border-stone-800 space-y-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span>2. Decrypt &amp; Verify Plaintext</span>
            </span>
            <input
              type="text"
              value={cipherInput}
              onChange={(e) => setCipherInput(e.target.value)}
              placeholder="Paste ciphertext to decrypt..."
              className="w-full p-2.5 rounded-lg bg-[#1b1814] border border-stone-700 text-white placeholder-stone-400 text-xs font-mono focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={handleDecrypt}
              className="w-full py-2 rounded-lg bg-[#25211b] hover:bg-[#302b23] border border-stone-700 text-amber-300 font-bold transition flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Decrypt with Passkey</span>
            </button>
            {decryptedOutput && (
              <div className="p-2 rounded bg-black/60 border border-emerald-500/40 text-emerald-300 font-medium">
                Plaintext: <span className="font-bold">{decryptedOutput}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
