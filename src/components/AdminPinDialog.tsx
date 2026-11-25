import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, KeyRound, AlertCircle } from 'lucide-react';

interface AdminPinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  theme: 'light' | 'dark';
}

const CORRECT_PIN = '2024';

export const AdminPinDialog: React.FC<AdminPinDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  theme,
}) => {
  const isDark = theme === 'dark';
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      setShake(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Body scroll lock with cleanup hook
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInputChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setPin(clean);
    if (error) setError(false);

    if (clean.length === 4) {
      if (clean === CORRECT_PIN) {
        onSuccess();
        onClose();
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setTimeout(() => setPin(''), 600);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      onSuccess();
      onClose();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setPin(''), 600);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-2xl shadow-2xl border p-6 flex flex-col transition-all transform ${
          shake ? 'animate-shake' : ''
        } ${
          isDark
            ? 'bg-[#18181B] border-[#27272A] text-white shadow-black/80'
            : 'bg-white border-[#E2E8F0] text-[#0F172A] shadow-slate-300/50'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isDark ? 'bg-amber-400/10 text-amber-300' : 'bg-amber-50 text-amber-700'
              }`}
            >
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 id="pin-dialog-title" className="text-sm font-semibold tracking-normal leading-tight">
                Admin Verification
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Enter 4-digit PIN for access
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN Form */}
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 my-2">
          {/* Visual 4-Digit Display */}
          <div className="flex items-center justify-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const char = pin[idx];
              const isFilled = Boolean(char);
              return (
                <div
                  key={idx}
                  className={`w-11 h-12 rounded-xl flex items-center justify-center text-lg font-semibold tabular-nums border transition-all ${
                    isFilled
                      ? isDark
                        ? 'border-amber-400 bg-amber-400/10 text-white'
                        : 'border-[#0F172A] bg-slate-50 text-[#0F172A]'
                      : isDark
                      ? 'border-[#334155] bg-[#121212]'
                      : 'border-slate-200 bg-white'
                  } ${error ? 'border-rose-500 text-rose-500' : ''}`}
                >
                  {isFilled ? '•' : ''}
                </div>
              );
            })}
          </div>

          {/* Hidden Real Input for clean keyboard typing on desktop & mobile */}
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => handleInputChange(e.target.value)}
            className="sr-only"
            autoComplete="off"
          />

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Incorrect PIN. Please try again.</span>
            </div>
          )}

          <div className="w-full flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-full cursor-pointer transition-all active:scale-95 border ${
                isDark
                  ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pin.length < 4}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-full cursor-pointer transition-all active:scale-95 border disabled:opacity-40 ${
                isDark
                  ? 'bg-white text-zinc-900 border-white hover:bg-zinc-100'
                  : 'bg-[#0F172A] text-white border-[#0F172A] hover:bg-slate-800'
              }`}
            >
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
