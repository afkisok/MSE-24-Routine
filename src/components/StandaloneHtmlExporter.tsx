import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { generateSingleFileHtml } from '../utils/singleFileHtmlGenerator';
import { Copy, Download, Check, FileCode } from 'lucide-react';
import { BOTTOM_SHEET_SPRING } from './BottomSheetModal';

interface StandaloneHtmlExporterProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const StandaloneHtmlExporter: React.FC<StandaloneHtmlExporterProps> = ({
  isOpen,
  onClose,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);
  const htmlContent = isOpen ? generateSingleFileHtml() : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(htmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aviation-schedule-dashboard.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="standalone-exporter-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none pointer-events-auto"
          role="dialog"
          aria-modal="true"
        >
          <div
            aria-hidden="true"
            onClick={onClose}
            className="fixed inset-0 z-0 pointer-events-auto"
          />
          <motion.div
            key="standalone-exporter-dialog"
            initial={{ opacity: 0, y: 20, scale: 0.955 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{
              opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
              default: BOTTOM_SHEET_SPRING,
            }}
            className={`relative z-10 w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] border will-change-transform transform-gpu ${
              isDark
                ? 'bg-[#1E1D1C] border-transparent text-stone-100'
                : 'bg-white border-stone-200 text-stone-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
        <div
          className={`flex items-center justify-between pb-3 mb-3.5 border-b transition-colors ${
            isDark ? 'border-stone-800' : 'border-stone-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-mono transition-colors ${
                isDark ? 'bg-stone-100 text-stone-900' : 'bg-stone-900 text-stone-50'
              }`}
            >
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3
                className={`text-sm sm:text-base font-bold uppercase font-mono leading-tight ${
                  isDark ? 'text-stone-100' : 'text-stone-900'
                }`}
              >
                Standalone Aviation Dashboard HTML
              </h3>
              <p className={`text-[11px] font-mono ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                Self-contained, zero-dependency public utility distribution file
              </p>
            </div>
          </div>
        </div>

        <p className={`text-xs mb-3.5 leading-relaxed ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
          Contains the complete Aviation Flight Schedule Dashboard utility runtime: dynamic 08:00–17:00 timeline scaling, 1px hairlines matrix, live CSV spreadsheet sync engine, exam alert blocks, and modal manifests in a single runnable HTML file.
        </p>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-3.5">
          <button
            onClick={handleCopy}
            className={`h-9 px-3.5 text-xs rounded-xl cursor-pointer font-mono font-semibold inline-flex items-center gap-1.5 transition-colors border ${
              isDark
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-900 border-stone-100'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-50 border-stone-900'
            }`}
          >
            {copied ? (
              <>
                <Check className={`w-3.5 h-3.5 ${isDark ? 'text-stone-900' : 'text-stone-50'}`} />
                <span>COPIED TO CLIPBOARD!</span>
              </>
            ) : (
              <>
                <Copy className={`w-3.5 h-3.5 ${isDark ? 'text-stone-900' : 'text-stone-50'}`} />
                <span>COPY HTML PAYLOAD</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className={`h-9 px-3.5 text-xs rounded-xl cursor-pointer font-mono font-semibold inline-flex items-center gap-1.5 transition-colors border ${
              isDark
                ? 'bg-[#262523] hover:bg-[#2F2E2B] text-stone-100 border-transparent'
                : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300'
            }`}
          >
            <Download className={`w-3.5 h-3.5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`} />
            <span>DOWNLOAD .HTML FILE</span>
          </button>
        </div>

        {/* Code Preview */}
        <div
          className={`flex-1 min-h-[200px] overflow-hidden rounded-xl p-3.5 font-mono text-[11px] border transition-colors ${
            isDark
              ? 'border-transparent bg-[#262523] text-stone-300'
              : 'border-stone-200 bg-stone-50 text-stone-700'
          }`}
        >
          <pre
            data-modal-scrollable="true"
            className="overflow-y-auto no-scrollbar max-h-[240px] leading-relaxed select-all"
          >
            {htmlContent.slice(0, 2200)}
            {'\n... [REMAINDER OF COMPLETE SELF-CONTAINED STANDALONE AVIATION HTML PAYLOAD INCLUDED] ...'}
          </pre>
        </div>

        <div
          className={`mt-3.5 pt-3 flex items-center justify-between text-[11px] font-mono border-t transition-colors ${
            isDark ? 'border-stone-800 text-stone-400' : 'border-stone-200 text-stone-500'
          }`}
        >
          <span>Ready for hosting on GitHub Pages, Cloudflare, or local offline run</span>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
