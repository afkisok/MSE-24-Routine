import React, { useState, useEffect } from 'react';
import { X, Database, RefreshCw, RotateCcw, Check, AlertTriangle, ShieldCheck, FileCode } from 'lucide-react';
import { DEFAULT_ROUTINE_CSV_URL } from '../types/routine';

interface AdminConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onSaveUrl: (newUrl: string) => void;
  onResetToOfficialDefault: () => void;
  onForceRefresh: () => void;
  onResetBaseline: () => void;
  onOpenExport?: () => void;
  syncStatus: {
    status: 'idle' | 'syncing' | 'success' | 'error';
    message: string;
  };
  totalEventsCount: number;
  lastSyncTime: string | null;
  theme: 'light' | 'dark';
}

export const AdminConfigModal: React.FC<AdminConfigModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onSaveUrl,
  onResetToOfficialDefault,
  onForceRefresh,
  onResetBaseline,
  onOpenExport,
  syncStatus,
  totalEventsCount,
  lastSyncTime,
  theme,
}) => {
  const isDark = theme === 'dark';
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setUrlInput(currentUrl);
  }, [currentUrl, isOpen]);

  // Handle body scroll lock with standard cleanup hook
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

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isCustomUrl = urlInput.trim() !== DEFAULT_ROUTINE_CSV_URL;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveUrl(urlInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetToDefault = () => {
    setUrlInput(DEFAULT_ROUTINE_CSV_URL);
    onResetToOfficialDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh] transition-all transform animate-scaleIn ${
          isDark
            ? 'bg-[#0F172A] border-[#334155] text-white shadow-black/80'
            : 'bg-white border-[#E2E8F0] text-[#0F172A] shadow-slate-300/50'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        {/* Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b ${
            isDark ? 'border-[#334155] bg-[#1E293B]/60' : 'border-[#E2E8F0] bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-xl font-sans font-semibold text-xs flex items-center justify-center shrink-0 border tracking-normal ${
                isDark ? 'bg-white text-[#0F172A] border-white' : 'bg-[#0F172A] text-white border-[#0F172A]'
              }`}
            >
              B24
            </div>
            <div>
              <h2 id="admin-modal-title" className="text-sm font-semibold tracking-normal">
                Admin Configuration
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Data Feed & Synchronizer Controls
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 border cursor-pointer ${
              isDark
                ? 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-white hover:bg-[#27272A]'
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Status Overview Card */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
              isDark ? 'bg-[#131D31] border-[#334155]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-500" />
                Feed Status
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                  syncStatus.status === 'success'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : syncStatus.status === 'syncing'
                    ? 'bg-amber-500/10 text-amber-500'
                    : syncStatus.status === 'error'
                    ? 'bg-rose-500/10 text-rose-500'
                    : isDark
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {syncStatus.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div>
                <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  LOADED CLASSES
                </span>
                <span className="font-bold">{totalEventsCount} Sessions</span>
              </div>
              <div>
                <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  LAST SYNCED
                </span>
                <span className="truncate block" title={lastSyncTime || 'N/A'}>
                  {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
                </span>
              </div>
            </div>

            {syncStatus.message && (
              <p className={`text-[10px] font-mono truncate pt-1 border-t ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                {syncStatus.message}
              </p>
            )}
          </div>

          {/* CSV Endpoint Form */}
          <form onSubmit={handleSave} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Google Sheets CSV Endpoint
              </label>
              {isCustomUrl ? (
                <span className="text-[10px] font-mono text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Custom Endpoint
                </span>
              ) : (
                <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Official KUET MSE Default
                </span>
              )}
            </div>

            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Provide the published CSV export link from the official Google Sheets routine schedule.
            </p>

            <textarea
              rows={3}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
              className={`w-full p-2.5 text-xs font-mono rounded-xl border transition-all resize-none focus:outline-none ${
                isDark
                  ? 'bg-[#131D31] text-white border-[#334155] placeholder-slate-500 focus:border-white focus:ring-1 focus:ring-white'
                  : 'bg-white text-[#0F172A] border-[#CBD5E1] placeholder-slate-400 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]'
              }`}
            />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={syncStatus.status === 'syncing'}
                className={`py-2 px-4 rounded-full font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-150 active:scale-95 border ${
                  isDark
                    ? 'bg-white text-[#0F172A] border-white hover:bg-slate-200'
                    : 'bg-[#0F172A] text-white border-[#0F172A] hover:bg-slate-800'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Saved & Syncing!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>Save & Re-sync</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetToDefault}
                className={`py-2 px-3.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-150 active:scale-95 border ${
                  isDark
                    ? 'bg-[#1E293B] border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155]'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Restore Official Default
              </button>

              <button
                type="button"
                onClick={onForceRefresh}
                disabled={syncStatus.status === 'syncing'}
                className={`py-2 px-3.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-150 active:scale-95 border ${
                  isDark
                    ? 'bg-[#18181B] border-[#27272A] text-slate-300 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Force Sync
              </button>
            </div>
          </form>

          {/* Secondary Tools Section */}
          <div
            className={`pt-3 border-t space-y-2 ${
              isDark ? 'border-[#334155]' : 'border-[#E2E8F0]'
            }`}
          >
            <span className={`block text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Maintenance Utilities
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onResetBaseline}
                className={`py-1.5 px-3 rounded-full text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-all active:scale-95 border ${
                  isDark
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                    : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                Reset To Offline Baseline
              </button>

              {onOpenExport && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenExport();
                  }}
                  className={`py-1.5 px-3 rounded-full text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-all active:scale-95 border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FileCode className="w-3 h-3" />
                  Open HTML Exporter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between text-[11px] ${
            isDark ? 'border-[#334155] bg-[#0B1120]' : 'border-[#E2E8F0] bg-slate-50'
          }`}
        >
          <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Changes saved locally to this device
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-full font-semibold cursor-pointer transition-all active:scale-95 border ${
              isDark
                ? 'bg-white text-[#0F172A] border-white hover:bg-slate-200'
                : 'bg-[#0F172A] text-white border-[#0F172A] hover:bg-slate-800'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
