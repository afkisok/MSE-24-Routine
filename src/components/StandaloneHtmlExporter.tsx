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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-2xs select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-2xl rounded-xs p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] transition-all border ${
          isDark
            ? 'bg-[#0F172A] border-[#334155] text-white'
            : 'bg-white border-[#E2E8F0] text-[#0F172A]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between pb-3 mb-2 border-b transition-colors ${
            isDark ? 'border-[#334155]' : 'border-[#E2E8F0]'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-2xs flex items-center justify-center font-mono transition-colors ${
                isDark ? 'bg-white text-[#0F172A]' : 'bg-[#0F172A] text-white'
              }`}
            >
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3
                className={`text-sm sm:text-base font-bold uppercase font-mono leading-tight ${
                  isDark ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                Standalone Aviation Dashboard HTML
              </h3>
              <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Self-contained, zero-dependency public utility distribution file
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-7 h-7 rounded-2xs flex items-center justify-center transition-colors cursor-pointer border ${
              isDark
                ? 'bg-[#1E293B] hover:bg-[#334155] text-slate-300 hover:text-white border-[#334155]'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className={`text-xs mb-3 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Contains the complete Aviation Flight Schedule Dashboard utility runtime: dynamic 08:00–17:00 timeline scaling, 1px hairlines matrix, live CSV spreadsheet sync engine, exam alert blocks, and modal manifests in a single runnable HTML file.
        </p>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={handleCopy}
            className={`text-xs py-1.5 px-3.5 rounded-xs cursor-pointer font-mono font-semibold transition-colors border ${
              isDark
                ? 'bg-white hover:bg-slate-100 text-[#0F172A] border-white'
                : 'aviation-btn-primary'
            }`}
          >
            {copied ? (
              <>
                <Check className={`w-3.5 h-3.5 ${isDark ? 'text-[#0F172A]' : 'text-white'}`} />
                <span>COPIED TO CLIPBOARD!</span>
              </>
            ) : (
              <>
                <Copy className={`w-3.5 h-3.5 ${isDark ? 'text-[#0F172A]' : 'text-white'}`} />
                <span>COPY HTML PAYLOAD</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className={`text-xs py-1.5 px-3.5 rounded-xs cursor-pointer font-mono font-semibold transition-colors border ${
              isDark
                ? 'bg-[#1E293B] hover:bg-[#334155] text-white border-[#334155]'
                : 'aviation-btn-secondary'
            }`}
          >
            <Download className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
            <span>DOWNLOAD .HTML FILE</span>
          </button>
        </div>

        {/* Code Preview */}
        <div
          className={`flex-1 min-h-[200px] overflow-hidden rounded-2xs p-3 font-mono text-[11px] border transition-colors ${
            isDark
              ? 'border-[#334155] bg-[#0B1120] text-slate-300'
              : 'border-[#E2E8F0] bg-slate-50 text-slate-700'
          }`}
        >
          <pre className="overflow-y-auto max-h-[240px] leading-relaxed select-all">
            {htmlContent.slice(0, 2200)}
            {'\n... [REMAINDER OF COMPLETE SELF-CONTAINED STANDALONE AVIATION HTML PAYLOAD INCLUDED] ...'}
          </pre>
        </div>

        <div
          className={`mt-3 pt-2.5 flex items-center justify-between text-[11px] font-mono border-t transition-colors ${
            isDark ? 'border-[#334155] text-slate-400' : 'border-[#E2E8F0] text-slate-500'
          }`}
        >
          <span>Ready for hosting on GitHub Pages, Cloudflare, or local offline run</span>
          <button
            onClick={onClose}
            className={`font-bold hover:underline cursor-pointer ${
              isDark ? 'text-white' : 'text-[#0F172A]'
            }`}
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
