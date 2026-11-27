import React, { useState } from 'react';
import { generateSingleFileHtml } from '../utils/singleFileHtmlGenerator';
import { Copy, Download, Check, X, FileCode } from 'lucide-react';

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
  const htmlContent = generateSingleFileHtml();

  if (!isOpen) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-2xs select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-2xl rounded-xs p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] transition-all border ${
          isDark
            ? 'bg-[#1E1D1C] border-transparent text-stone-100'
            : 'bg-white border-stone-200 text-stone-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between pb-3 mb-2 border-b transition-colors ${
            isDark ? 'border-stone-800' : 'border-stone-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-2xs flex items-center justify-center font-mono transition-colors ${
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

          <button
            onClick={onClose}
            className={`w-7 h-7 rounded-2xs flex items-center justify-center transition-colors cursor-pointer border ${
              isDark
                ? 'bg-[#262523] hover:bg-[#2F2E2B] text-stone-300 hover:text-stone-100 border-transparent'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 border-stone-200'
            }`}
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className={`text-xs mb-3 leading-relaxed ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
          Contains the complete Aviation Flight Schedule Dashboard utility runtime: dynamic 08:00–17:00 timeline scaling, 1px hairlines matrix, live CSV spreadsheet sync engine, exam alert blocks, and modal manifests in a single runnable HTML file.
        </p>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={handleCopy}
            className={`text-xs py-1.5 px-3.5 rounded-xs cursor-pointer font-mono font-semibold transition-colors border ${
              isDark
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-900 border-stone-100'
                : 'aviation-btn-primary'
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
            className={`text-xs py-1.5 px-3.5 rounded-xs cursor-pointer font-mono font-semibold transition-colors border ${
              isDark
                ? 'bg-[#262523] hover:bg-[#2F2E2B] text-stone-100 border-transparent'
                : 'aviation-btn-secondary'
            }`}
          >
            <Download className={`w-3.5 h-3.5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`} />
            <span>DOWNLOAD .HTML FILE</span>
          </button>
        </div>

        {/* Code Preview */}
        <div
          className={`flex-1 min-h-[200px] overflow-hidden rounded-2xs p-3 font-mono text-[11px] border transition-colors ${
            isDark
              ? 'border-transparent bg-[#262523] text-stone-300'
              : 'border-stone-200 bg-stone-50 text-stone-700'
          }`}
        >
          <pre className="overflow-y-auto max-h-[240px] leading-relaxed select-all">
            {htmlContent.slice(0, 2200)}
            {'\n... [REMAINDER OF COMPLETE SELF-CONTAINED STANDALONE AVIATION HTML PAYLOAD INCLUDED] ...'}
          </pre>
        </div>

        <div
          className={`mt-3 pt-2.5 flex items-center justify-between text-[11px] font-mono border-t transition-colors ${
            isDark ? 'border-stone-800 text-stone-400' : 'border-stone-200 text-stone-500'
          }`}
        >
          <span>Ready for hosting on GitHub Pages, Cloudflare, or local offline run</span>
          <button
            onClick={onClose}
            className={`font-bold hover:underline cursor-pointer ${
              isDark ? 'text-stone-100' : 'text-stone-900'
            }`}
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
