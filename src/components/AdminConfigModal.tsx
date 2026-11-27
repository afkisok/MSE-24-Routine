import React, { useState, useEffect } from 'react';
import { X, RefreshCw, RotateCcw, Check, FileCode } from 'lucide-react';
import { DEFAULT_ROUTINE_CSV_URL } from '../types/routine';
import { BottomSheetModal } from './BottomSheetModal';

interface AdminConfigModalProps {
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
  }, [currentUrl]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveUrl(urlInput.trim());
    setSavedSuccess(true);
    window.setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleResetToDefault = () => {
    setUrlInput(DEFAULT_ROUTINE_CSV_URL);
    onResetToOfficialDefault();
    setSavedSuccess(true);
    window.setTimeout(() => setSavedSuccess(false), 2000);
  };

  const statusText =
    syncStatus.status === 'success'
      ? 'Synced'
      : syncStatus.status === 'syncing'
      ? 'Syncing...'
      : syncStatus.status === 'error'
      ? 'Sync failed'
      : 'Ready';

  const formattedSyncTime = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <BottomSheetModal
      onClose={onClose}
      theme={theme}
      ariaLabelledBy="admin-modal-title"
      sheetClassName="overflow-hidden pb-[env(safe-area-inset-bottom)] sm:pb-0"
      renderHeader={(grabHandle) => (
        <div className={`border-b ${isDark ? 'border-stone-800' : 'border-stone-200'}`}>
          <div className="pt-3.5">{grabHandle}</div>
          <div className="px-5 pt-0.5 pb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-full font-sans font-semibold text-xs flex items-center justify-center shrink-0 border tracking-normal ${
                  isDark
                    ? 'bg-stone-100 text-stone-900 border-stone-100'
                    : 'bg-stone-900 text-stone-50 border-stone-900'
                }`}
              >
                B24
              </div>
              <div className="min-w-0">
                <h2
                  id="admin-modal-title"
                  className="text-sm font-semibold tracking-normal leading-tight"
                >
                  Admin Configuration
                </h2>
                {/* Minimal Flat Inline Feed Status */}
                <div
                  className={`mt-0.5 text-xs font-sans tabular-nums flex items-center gap-1.5 flex-wrap ${
                    isDark ? 'text-stone-400' : 'text-stone-500'
                  }`}
                >
                  <span className={`font-medium ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>
                    {statusText}
                  </span>
                  <span className="text-stone-400">·</span>
                  <span>
                    {totalEventsCount} {totalEventsCount === 1 ? 'session' : 'sessions'}
                  </span>
                  {formattedSyncTime && (
                    <>
                      <span className="text-stone-400">·</span>
                      <span>{formattedSyncTime}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              type="button"
              aria-label="Close admin configuration"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 border cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-[#262523] border-transparent text-stone-400 hover:text-stone-100 hover:bg-[#2F2E2B]'
                  : 'bg-stone-100 border-transparent text-stone-500 hover:text-stone-900 hover:bg-stone-200'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    >
      {/* Modal Body */}
      <div
        className="p-5 overflow-y-auto no-scrollbar overscroll-y-contain space-y-5 text-xs"
        onPointerDown={(e) => {
          if (e.currentTarget.scrollTop > 0) {
            e.stopPropagation();
          }
        }}
      >
        {/* CSV Endpoint Form */}
        <form onSubmit={handleSave} className="space-y-3">
          <label
            htmlFor="admin-csv-url-input"
            className={`block text-[11px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-stone-400' : 'text-stone-500'
            }`}
          >
            Google Sheets CSV Endpoint
          </label>

          <input
            id="admin-csv-url-input"
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
            className={`w-full px-3 py-2 text-xs font-mono rounded-lg border overflow-x-auto whitespace-nowrap transition-colors focus:outline-none ${
              isDark
                ? 'bg-[#262523] text-stone-100 border-transparent placeholder-stone-500 focus:border-stone-500'
                : 'bg-white text-stone-900 border-stone-300 placeholder-stone-400 focus:border-stone-900'
            }`}
          />

          {/* Streamlined Compact Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
            <button
              type="submit"
              disabled={syncStatus.status === 'syncing'}
              className={`py-2 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 active:scale-95 border disabled:opacity-60 ${
                isDark
                  ? 'bg-stone-100 text-stone-900 border-stone-100 hover:bg-stone-200'
                  : 'bg-stone-900 text-stone-50 border-stone-900 hover:bg-stone-800'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`}
                  />
                  <span>Save & Re-sync</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95 border ${
                isDark
                  ? 'bg-[#262523] border-transparent text-stone-200 hover:text-stone-100 hover:bg-[#2F2E2B]'
                  : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Restore Default
            </button>

            <button
              type="button"
              onClick={onForceRefresh}
              disabled={syncStatus.status === 'syncing'}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95 border disabled:opacity-60 ${
                isDark
                  ? 'bg-[#262523] border-transparent text-stone-300 hover:text-stone-100 hover:bg-[#2F2E2B]'
                  : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
              }`}
            >
              Force Sync
            </button>
          </div>
        </form>

        {/* Secondary Tools Section */}
        <div
          className={`pt-4 border-t space-y-2.5 ${
            isDark ? 'border-stone-800' : 'border-stone-200'
          }`}
        >
          <span
            className={`block text-[11px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-stone-400' : 'text-stone-500'
            }`}
          >
            Utilities
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onResetBaseline}
              className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all duration-150 active:scale-95 border ${
                isDark
                  ? 'bg-[#262523] border-transparent text-stone-300 hover:text-stone-100 hover:bg-[#2F2E2B]'
                  : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Baseline
            </button>

            {onOpenExport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.setTimeout(() => onOpenExport(), 190);
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all duration-150 active:scale-95 border ${
                  isDark
                    ? 'bg-[#262523] border-transparent text-stone-300 hover:text-stone-100 hover:bg-[#2F2E2B]'
                    : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Export HTML
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className={`px-5 py-3 border-t flex items-center justify-between text-[11px] ${
          isDark ? 'border-stone-800' : 'border-stone-200'
        }`}
      >
        <span className={isDark ? 'text-stone-400' : 'text-stone-500'}>
          Saved locally on this device
        </span>
        <button
          type="button"
          onClick={onClose}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 active:scale-95 border ${
            isDark
              ? 'bg-stone-100 text-stone-900 border-stone-100 hover:bg-stone-200'
              : 'bg-stone-900 text-stone-50 border-stone-900 hover:bg-stone-800'
          }`}
        >
          Done
        </button>
      </div>
    </BottomSheetModal>
  );
};
