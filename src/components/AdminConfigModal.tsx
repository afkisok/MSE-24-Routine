import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Check, FileCode } from 'lucide-react';
import { DEFAULT_ROUTINE_CSV_URL } from '../types/routine';
import { BottomSheetModal } from './BottomSheetModal';
import { SmoothRefreshIcon } from './SmoothRefreshIcon';
import { TACTILE_SPRING, VIEW_TRANSITION } from '../utils/springs';

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
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const secondaryBtnClass = `h-9 px-3.5 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer select-none transition-colors duration-150 disabled:opacity-55 ${
    isDark
      ? 'bg-[#262523] text-stone-200 hover:bg-[#2F2D2A] hover:text-stone-100'
      : 'bg-[#F4F3EF] text-stone-700 hover:bg-[#EAE8E2] hover:text-stone-900'
  }`;

  return (
    <BottomSheetModal
      onClose={onClose}
      theme={theme}
      ariaLabelledBy="admin-modal-title"
      sheetClassName="p-5 sm:p-6 overflow-hidden"
      renderHeader={(grabHandle) => (
        <>
          {grabHandle}

          {/* Flat Uppercase Eyebrow Strip with Tabular Sync Summary */}
          <div
            className={`pb-3 mb-3.5 border-b flex items-center justify-between gap-3 transition-colors ${
              isDark ? 'border-stone-800' : 'border-stone-200'
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider shrink-0 ${
                isDark ? 'text-[#FAF9F6]' : 'text-[#141312]'
              }`}
            >
              Admin
            </span>

            <div
              className={`text-[11px] font-medium font-sans tabular-nums flex items-center gap-1.5 truncate ${
                isDark ? 'text-stone-400' : 'text-stone-500'
              }`}
            >
              <span
                className={
                  syncStatus.status === 'error'
                    ? isDark
                      ? 'text-[#E5484D]'
                      : 'text-[#9E2C2C]'
                    : isDark
                    ? 'text-stone-200'
                    : 'text-stone-700'
                }
              >
                {statusText}
              </span>
              <span aria-hidden="true" className="opacity-50">
                ·
              </span>
              <span>
                {totalEventsCount} {totalEventsCount === 1 ? 'session' : 'sessions'}
              </span>
              {formattedSyncTime && (
                <>
                  <span aria-hidden="true" className="opacity-50">
                    ·
                  </span>
                  <span>{formattedSyncTime}</span>
                </>
              )}
            </div>
          </div>
        </>
      )}
    >
      {/* Modal Heading */}
      <motion.h2
        id="admin-modal-title"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...VIEW_TRANSITION, delay: 0.04 }}
        className={`text-lg sm:text-xl font-bold tracking-tight leading-snug mb-3 ${
          isDark ? 'text-stone-100' : 'text-stone-900'
        }`}
      >
        Routine Configuration
      </motion.h2>

      {/* Borderless Vertical Sections with 1px Hairline Dividers */}
      <div
        data-modal-scrollable="true"
        className={`overflow-y-auto no-scrollbar overscroll-y-contain flex flex-col divide-y pb-[env(safe-area-inset-bottom)] sm:pb-0 ${
          isDark ? 'divide-stone-800' : 'divide-stone-200'
        }`}
        onPointerDown={(e) => {
          if (e.currentTarget.scrollTop > 0) {
            e.stopPropagation();
          }
        }}
      >
        {/* Google Sheets CSV Source */}
        <motion.form
          onSubmit={handleSave}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...VIEW_TRANSITION, delay: 0.08 }}
          className="py-3.5 first:pt-1"
        >
          <label
            htmlFor="admin-csv-url-input"
            className={`block text-[11px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-stone-400' : 'text-stone-500'
            }`}
          >
            Google Sheets CSV
          </label>

          <input
            id="admin-csv-url-input"
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
            className={`mt-2 w-full h-10 px-3.5 text-xs font-sans rounded-xl border overflow-x-auto whitespace-nowrap transition-colors focus:outline-none ${
              isDark
                ? 'bg-[#161514] text-stone-100 border-white/[0.06] placeholder-stone-500 focus:border-stone-500'
                : 'bg-[#F4F3EF] text-stone-900 border-black/[0.06] placeholder-stone-400 focus:border-stone-900'
            }`}
          />

          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <motion.button
              type="submit"
              disabled={syncStatus.status === 'syncing'}
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              transition={TACTILE_SPRING}
              className={`h-9 px-3.5 rounded-xl font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer select-none transition-colors duration-150 disabled:opacity-55 ${
                isDark
                  ? 'bg-stone-100 text-stone-900 hover:bg-stone-200'
                  : 'bg-stone-900 text-stone-50 hover:bg-stone-800'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <SmoothRefreshIcon
                    isSyncing={syncStatus.status === 'syncing'}
                    syncStatus={syncStatus.status}
                    className="w-3.5 h-3.5 block"
                  />
                  <span>Save & Re-sync</span>
                </>
              )}
            </motion.button>

            <motion.button
              type="button"
              onClick={onForceRefresh}
              disabled={syncStatus.status === 'syncing'}
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              transition={TACTILE_SPRING}
              className={secondaryBtnClass}
            >
              <SmoothRefreshIcon
                isSyncing={syncStatus.status === 'syncing'}
                syncStatus={syncStatus.status}
                className="w-3.5 h-3.5 block"
                showSuccessCheck
                successClassName={isDark ? 'text-emerald-400' : 'text-emerald-600'}
              />
              <span>Force Sync</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={handleResetToDefault}
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              transition={TACTILE_SPRING}
              className={secondaryBtnClass}
            >
              Restore Default
            </motion.button>
          </div>
        </motion.form>

        {/* Maintenance & Export */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...VIEW_TRANSITION, delay: 0.12 }}
          className="py-3.5 last:pb-1"
        >
          <span
            className={`block text-[11px] font-semibold uppercase tracking-wider ${
              isDark ? 'text-stone-400' : 'text-stone-500'
            }`}
          >
            Utilities
          </span>

          <div
            className={`mt-2 grid gap-2 ${
              onOpenExport ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            <motion.button
              type="button"
              onClick={onResetBaseline}
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              transition={TACTILE_SPRING}
              className={secondaryBtnClass}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Baseline</span>
            </motion.button>

            {onOpenExport && (
              <motion.button
                type="button"
                onClick={() => {
                  onClose();
                  window.setTimeout(() => onOpenExport(), 190);
                }}
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                transition={TACTILE_SPRING}
                className={secondaryBtnClass}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Export HTML</span>
              </motion.button>
            )}
          </div>

          <p
            className={`mt-3 text-[11px] leading-snug ${
              isDark ? 'text-stone-500' : 'text-stone-400'
            }`}
          >
            Preferences are saved locally on this device.
          </p>
        </motion.div>
      </div>
    </BottomSheetModal>
  );
};
