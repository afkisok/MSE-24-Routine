import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { KeyRound, AlertCircle } from 'lucide-react';

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

  // Body scroll lock is centrally managed by App.tsx via isAnyModalOpen

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Rendered inside AnimatePresence below for spring open/close physics

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="admin-pin-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none pointer-events-auto"
        >
          <div
            aria-hidden="true"
            onClick={onClose}
            className="fixed inset-0 z-0 pointer-events-auto"
          />
          <motion.div
            key="admin-pin-dialog"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{
              type: 'spring',
              stiffness: 440,
              damping: 40,
              mass: 0.9,
            }}
            className={`relative z-10 w-full max-w-sm rounded-2xl shadow-2xl border p-6 flex flex-col will-change-transform transform-gpu ${
              shake ? 'animate-shake' : ''
            } ${
              isDark
                ? 'bg-[#1E1D1C] border-transparent text-stone-100 shadow-black/80'
                : 'bg-white border-stone-200 text-stone-900 shadow-stone-300/50'
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
                isDark ? 'bg-[#262523] text-stone-200' : 'bg-stone-100 text-stone-800'
              }`}
            >
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 id="pin-dialog-title" className="text-sm font-semibold tracking-normal leading-tight">
                Admin Verification
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                Enter 4-digit PIN for access
              </p>
            </div>
          </div>
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
                        ? 'border-stone-400 bg-[#262523] text-stone-100'
                        : 'border-stone-900 bg-stone-100 text-stone-900'
                      : isDark
                      ? 'border-transparent bg-[#262523]'
                      : 'border-stone-200 bg-white'
                  } ${
                    error
                      ? isDark
                        ? 'border-stone-300 text-stone-100'
                        : 'border-stone-900 text-stone-900'
                      : ''
                  }`}
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
            <div
              className={`flex items-center gap-1.5 text-xs font-medium animate-fadeIn ${
                isDark ? 'text-stone-300' : 'text-stone-700'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Incorrect PIN. Please try again.</span>
            </div>
          )}

          <div className="w-full flex items-center pt-2">
            <button
              type="submit"
              disabled={pin.length < 4}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-full cursor-pointer transition-all active:scale-95 border disabled:opacity-40 ${
                isDark
                  ? 'bg-stone-100 text-stone-900 border-stone-100 hover:bg-stone-200'
                  : 'bg-stone-900 text-stone-50 border-stone-900 hover:bg-stone-800'
              }`}
            >
              Verify
            </button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
