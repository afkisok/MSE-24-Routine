export function generateSingleFileHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>MSE 2K24 — Academic Routine & Timetable (KUET)</title>
  <meta name="description" content="MSE 2K24 / Batch '24 — Dept. of Materials Science and Engineering, KUET • 2nd Year 1st Term. Aviation utility schedule dashboard with dynamic timeline scaling, live Google Sheets CSV sync, and alternating week lab tracking." />
  
  <!-- Tailwind CSS via CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
          },
          colors: {
            navy: '#0F172A',
            teal: '#064E3B',
            hairline: '#E2E8F0',
            steel: '#334155',
          }
        }
      }
    }
  </script>

  <!-- Google Fonts: Inter & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

  <style>
    * {
      box-sizing: border-box;
    }
    body {
      background-color: #FFFFFF;
      color: #0F172A;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow-x: hidden;
      width: 100%;
      max-width: 100vw;
      transition: background-color 150ms ease, color 150ms ease;
    }
    html.dark body {
      background-color: #0F172A;
      color: #FFFFFF;
    }

    .font-mono-numbers {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
    }
    
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #F8FAFC; border-radius: 2px; }
    html.dark ::-webkit-scrollbar-track { background: #0B1120; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px; }
    html.dark ::-webkit-scrollbar-thumb { background: #334155; }
    ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
    html.dark ::-webkit-scrollbar-thumb:hover { background: #475569; }

    .timeline-touch-track {
      touch-action: pan-x pan-y;
      -webkit-overflow-scrolling: touch;
    }

    /* High-contrast utilitarian group micro-chip */
    .badge-group {
      display: inline-flex;
      align-items: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 1px 4px;
      border-radius: 2px;
      line-height: 1;
      white-space: nowrap;
      flex-shrink: 0;
      border: 1px solid #34D399;
      background-color: #ECFDF5;
      color: #064E3B;
    }

    html.dark .badge-group {
      background-color: #1E293B;
      color: #6EE7B7;
      border-color: rgba(5, 150, 105, 0.7);
    }

    /* Narrow Exam Slot Optimization (< 35 mins) */
    .compact-exam {
      background-color: #D97706 !important;
      border-color: #B45309 !important;
      color: #FFFFFF !important;
    }
    html.dark .compact-exam {
      background-color: #D97706 !important;
      border-color: #F59E0B !important;
      color: #FFFFFF !important;
    }
  </style>
</head>
<body class="bg-white text-[#0F172A] min-h-screen antialiased selection:bg-slate-200 selection:text-slate-900">

  <!-- 1. Top Aviation Telemetry Status Ribbon -->
  <div id="telemetry-bar" class="border-b border-[#E2E8F0] bg-slate-50/80 px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 transition-colors">
    <div class="flex items-center gap-2 flex-wrap">
      <span id="radar-badge" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#064E3B] border border-emerald-200 font-mono text-[10px] font-bold uppercase">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
        LIVE FEED
      </span>
      <span class="text-slate-300">|</span>
      <span class="font-mono text-[11px] text-slate-900 font-bold" id="telemetry-deck-label">MSE 2K24 ROUTINE</span>
    </div>

    <div class="flex items-center gap-3 font-mono text-[11px]">
      <div id="digital-clock-box" class="inline-flex items-center gap-1.5 text-slate-900 bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-sm">
        <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span id="digital-clock" class="font-semibold tabular-nums">08:00:00 LOC</span>
      </div>
      <span class="text-slate-500 hidden md:inline">WINDOW: 08:00 – 17:00</span>
    </div>
  </div>

  <!-- 2. Header with Flight Operations Deck & Data Link -->
  <header id="main-header" class="bg-white border-b border-[#E2E8F0] sticky top-0 z-40 select-none shadow-2xs w-full transition-colors">
    <div class="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 w-full">
      <div class="flex items-center gap-3 min-w-0">
        <div id="brand-badge" class="w-9 h-9 rounded-sm bg-[#0F172A] text-white font-mono font-black text-xs flex items-center justify-center shrink-0 border border-[#0F172A] tracking-widest transition-colors">
          B24
        </div>
        <div class="min-w-0">
          <h1 id="brand-title" class="text-base sm:text-lg font-bold tracking-tight text-[#0F172A] leading-tight truncate transition-colors">
            MSE 2K24 / Batch '24 Routine
          </h1>
          <div id="brand-subtitle" class="text-[11px] text-slate-500 font-mono truncate transition-colors">
            Dept. of Materials Science and Engineering, KUET • 2nd Year 1st Term
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0 flex-wrap">
        <!-- UTILITARIAN THEME TOGGLE BUTTON -->
        <button
          id="theme-toggle-btn"
          onclick="toggleTheme()"
          type="button"
          title="Toggle between light and midnight navy dark utility theme"
          class="font-sans font-bold uppercase text-[11px] sm:text-xs py-1.5 px-3 rounded-sm flex items-center justify-center gap-1.5 cursor-pointer tracking-wider transition-colors border select-none bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50"
        >
          <span id="theme-label">[ THEME: LIGHT ]</span>
        </button>

        <button id="btn-jump-now" onclick="scrollToCurrentHour()" class="text-xs py-1.5 px-3 rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors border bg-white text-[#0F172A] border-[#CBD5E1] hover:bg-slate-50">
          <svg class="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>Jump to Now</span>
        </button>
      </div>
    </div>

    <!-- CSV DISPATCH LINK CONSOLE -->
    <div id="csv-dispatch-deck" class="border-t border-[#E2E8F0] bg-slate-50/50 px-3 sm:px-6 py-2 w-full transition-colors">
      <div class="max-w-7xl mx-auto w-full">
        <div class="flex flex-col gap-1.5 w-full">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span id="csv-dispatch-label" class="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#0F172A] uppercase transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Google Sheets CSV Data Link
            </span>
            <span id="sync-status-indicator" class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm uppercase tracking-wide border bg-white text-slate-600 border-[#E2E8F0]">
              STANDBY // READY
            </span>
          </div>

          <!-- Input Bar with hairlines -->
          <div class="w-full flex flex-col md:flex-row gap-2 max-w-full items-stretch md:items-center">
            <div class="relative flex-1 min-w-0">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
              </div>
              <input
                id="testing-csv-input"
                type="text"
                placeholder="Paste Google Sheets CSV link (https://docs.google.com/spreadsheets/d/.../export?format=csv)"
                class="w-full bg-white text-[#0F172A] text-xs font-mono pl-8 pr-3 py-1.5 rounded-sm border border-[#CBD5E1] focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] focus:outline-none placeholder-slate-400 transition-all shadow-2xs"
              />
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                id="btn-manual-sync"
                onclick="fetchAndSync()"
                class="text-xs py-1.5 px-3 rounded-sm flex-1 md:flex-initial bg-[#0F172A] text-white font-semibold transition-colors flex items-center gap-1.5 justify-center"
                title="Execute manual fetch and sync"
              >
                <svg id="sync-icon" class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                <span>Sync Feed</span>
              </button>
              <button
                id="btn-reset-baseline"
                onclick="resetToBaselineDefault()"
                class="text-xs py-1.5 px-2.5 rounded-sm text-slate-700 bg-white border border-[#CBD5E1] hover:bg-slate-50 flex-1 md:flex-initial transition-colors"
                title="Reset to baseline schedule"
              >
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 flex flex-col overflow-x-hidden">
    <!-- 'UP NEXT' UPCOMING SESSIONS DEPARTURES WIDGET -->
    <div id="at-a-glance-widget" class="bg-white border border-[#E2E8F0] rounded-sm p-4 mb-4 select-none shadow-2xs w-full max-w-full transition-colors">
      <div id="at-a-glance-header" class="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-3">
        <div class="flex items-center gap-2">
          <div id="at-a-glance-icon" class="w-6 h-6 rounded-sm bg-[#0F172A] text-white flex items-center justify-center font-mono">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </div>
          <div>
            <h2 id="at-a-glance-title" class="text-sm font-bold text-[#0F172A] tracking-tight leading-tight uppercase font-mono transition-colors">
              Upcoming Classes
            </h2>
            <p id="at-a-glance-subtitle" class="text-[11px] text-slate-500 font-mono transition-colors">
              Next 3 scheduled sessions · MSE 2K24
            </p>
          </div>
        </div>
        <span class="text-[10px] font-mono font-semibold text-[#064E3B] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-sm uppercase">
          Live Sync Active
        </span>
      </div>
      <div id="at-a-glance-list" class="space-y-1.5"></div>
    </div>

    <!-- 5. OPERATIONAL DISPATCH LOG SECTION (DIFFERENTIAL ENGINE) -->
    <div id="dispatch-log-panel" class="mb-4 rounded-sm border border-[#E2E8F0] bg-white transition-colors">
      <div id="dispatch-log-header" class="px-3 py-2 flex items-center justify-between cursor-pointer select-none" onclick="toggleDispatchLog()">
        <div class="flex items-center gap-2">
          <div id="dispatch-log-icon" class="w-5 h-5 rounded-sm bg-[#0F172A] text-white flex items-center justify-center font-mono">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <span id="dispatch-log-title" class="text-xs font-bold font-mono tracking-wider uppercase text-[#0F172A]">
            OPERATIONAL DISPATCH LOG
          </span>
          <span id="dispatch-count-badge" class="text-[10px] font-mono px-1.5 py-0.2 rounded-sm border bg-slate-100 text-slate-600 border-slate-200">
            0 UPDATES
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            id="btn-clear-logs"
            onclick="event.stopPropagation(); clearLogs();"
            type="button"
            class="text-[10px] font-mono px-2 py-0.5 rounded-sm border bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            CLEAR LOGS
          </button>
          <span id="dispatch-chevron" class="text-xs text-slate-500 font-mono">▼</span>
        </div>
      </div>

      <div id="dispatch-log-body" class="hidden p-3 border-t border-[#E2E8F0] space-y-1.5 text-xs font-mono">
        <!-- Log entries populated via JS -->
      </div>
    </div>

    <!-- Subheader Legend Bar (1px hairline #E2E8F0 light / #334155 dark) -->
    <div id="legend-bar" class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#E2E8F0] p-3 bg-slate-50/70 rounded-sm transition-colors">
      <div id="legend-text" class="flex items-center gap-2 text-xs text-slate-600 font-mono flex-wrap">
        <span class="font-bold">OPERATIONAL WINDOW: <strong class="font-semibold">08:00 – 17:00</strong></span>
        <span aria-hidden="true">|</span>
        <span id="legend-week-info" class="font-bold text-[#064E3B]">2ND YEAR · 1ST TERM</span>
        <span aria-hidden="true">|</span>
        <span>SUNDAY – THURSDAY</span>
      </div>

      <!-- Aviation Category Legend Badges -->
      <div class="flex flex-wrap items-center gap-2 text-xs font-mono">
        <div id="legend-lecture-chip" class="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-white text-slate-800 border border-slate-300 font-semibold text-[11px]">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
          <span>Lecture</span>
        </div>
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-emerald-50 text-[#064E3B] border border-emerald-300 font-semibold text-[11px]">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
          <span>Laboratory</span>
        </div>
        <div id="legend-exam-chip" class="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-amber-50 text-[#78350F] border border-[#D97706] font-semibold text-[11px]">
          <span class="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
          <span>Exam / CT</span>
        </div>
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-slate-200 text-slate-700 border border-slate-400 font-semibold text-[11px]">
          <span>CANCELLED</span>
        </div>
      </div>
    </div>

    <!-- UNIFIED SCHEDULE MATRIX (1px fine hairlines #E2E8F0 light / #334155 dark) -->
    <div class="mb-6">
      <div class="px-1 py-1.5 flex items-center justify-between text-xs text-slate-500 font-mono">
        <span id="matrix-section-title" class="text-[#0F172A] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors">
          <span class="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
          Weekly Routine Matrix
        </span>
        <span class="text-slate-500 text-[11px] hidden sm:inline">
          Horizontal Track Navigation · Click Any Slot For Details
        </span>
      </div>

      <div id="master-grid-box" class="bg-white border border-[#E2E8F0] rounded-sm overflow-hidden shadow-2xs flex items-stretch select-none transition-colors">
        <!-- STATIC LEFT CONTAINER: Precision Day Track Column -->
        <div id="static-day-column-wrapper" class="w-24 sm:w-32 shrink-0 border-r border-[#E2E8F0] bg-slate-50/70 flex flex-col z-20 transition-colors">
          <div id="static-day-header" class="h-10 border-b border-[#E2E8F0] px-3 flex items-center justify-between text-[11px] font-bold text-[#0F172A] bg-slate-100/80 tracking-wide uppercase font-mono transition-colors">
            <span>DAY</span>
            <span class="text-[10px] text-slate-500 hidden sm:inline">CLASSES</span>
          </div>
          <div id="static-day-column" class="flex flex-col"></div>
        </div>

        <!-- RIGHT CONTAINER: HORIZONTAL TIMELINE SCROLL TRACK -->
        <div id="timeline-scroll-container" class="flex-1 overflow-x-auto scroll-smooth timeline-touch-track bg-white transition-colors">
          <div class="min-w-[960px] flex flex-col">
            <!-- Axis Header with Pixel-Aligned Gridline Ticks -->
            <div class="h-10 border-b border-[#E2E8F0] bg-slate-100/70 relative select-none transition-colors" id="academic-axis-header"></div>
            <div id="academic-tracks-container" class="flex flex-col"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Official Footer with MSE 2K24 Metadata -->
    <footer id="main-footer" class="mt-8 pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-500 transition-colors">
      <div class="flex items-center gap-2 flex-wrap">
        <span id="footer-brand" class="text-[#0F172A] font-bold uppercase transition-colors">MSE 2K24 / Batch Routine</span>
        <span>/</span>
        <span>Dept. of Materials Science and Engineering, KUET</span>
      </div>
      <div>
        <span>Operational Window: 08:00 – 17:00</span>
      </div>
    </footer>
  </main>

  <!-- Inspection Modal (One UI Bottom Sheet Dialog) -->
  <div id="inspection-modal" class="fixed inset-0 z-50 hidden flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-2xs select-none transition-all" onclick="closeInspectionModal()">
    <div id="modal-card" class="relative w-full max-w-lg bg-white border border-[#E2E8F0] rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto text-[#0F172A] transition-all" onclick="event.stopPropagation()">
      <!-- Drag Pill Handle -->
      <div class="flex justify-center -mt-1 mb-3 pt-1">
        <div id="modal-drag-handle" class="w-12 h-1.5 rounded-full bg-zinc-300"></div>
      </div>
      <div id="modal-header-strip" class="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#E2E8F0]">
        <div id="modal-type-kicker" class="flex items-center gap-2 flex-wrap font-mono"></div>
        <button id="modal-close-btn" onclick="closeInspectionModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200" aria-label="Close details dialog">
          ✕
        </button>
      </div>

      <h2 id="modal-subject-title" class="text-lg sm:text-xl font-bold tracking-tight leading-tight mb-2 text-[#0F172A]"></h2>
      
      <!-- Explicit 'Class Cancelled' Alert Banner -->
      <div id="modal-cancellation-banner" class="hidden mb-3 p-3.5 bg-slate-100 border border-slate-300 rounded-[16px] text-slate-800 text-xs flex items-start gap-2.5">
        <span class="text-sm shrink-0">⚠️</span>
        <div>
          <p class="font-bold font-mono uppercase tracking-wide">Notice: Class Cancelled</p>
          <p class="text-[11px] text-slate-600 mt-0.5 leading-relaxed">This class period has been officially cancelled by administration. No attendance required.</p>
        </div>
      </div>

      <!-- Solid Professional Alert Banner Block for Exams (Aviation Amber) -->
      <div id="modal-exam-details" class="hidden mb-3 border border-[#D97706] bg-amber-50/90 rounded-sm overflow-hidden">
        <div id="modal-exam-inner-header" class="bg-[#D97706] text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold font-mono tracking-wider uppercase border-b border-amber-700">
          <span class="flex items-center gap-1.5">
            <span>📝</span>
            <span>EXAM / CLASS TEST (CT) SESSION</span>
          </span>
          <span id="modal-marks" class="text-amber-100 text-[11px] font-mono"></span>
        </div>
        <div class="p-3">
          <div class="text-xs font-bold font-mono uppercase text-[#78350F] mb-2">Required Exam Syllabus Coverage:</div>
          <ul id="modal-syllabus-list" class="space-y-1 text-xs text-slate-800"></ul>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div id="modal-time-box" class="bg-slate-50 border border-[#E2E8F0] rounded-[16px] p-3.5">
          <div class="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold uppercase">
            <span>🕒</span>
            <span>TIME WINDOW</span>
          </div>
          <div id="modal-time-window" class="text-sm font-bold text-[#0F172A] mt-1 font-mono tabular-nums"></div>
        </div>
        <div id="modal-room-box" class="bg-slate-50 border border-[#E2E8F0] rounded-[16px] p-3.5">
          <div class="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold uppercase">
            <span>📍</span>
            <span>ASSIGNED VENUE / ROOM</span>
          </div>
          <div id="modal-room-number" class="text-sm font-bold text-[#0F172A] mt-1 font-mono truncate"></div>
        </div>
        <div id="modal-teacher-box" class="bg-slate-50 border border-[#E2E8F0] rounded-[16px] p-3.5 sm:col-span-2">
          <div class="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold uppercase">
            <span>👤</span>
            <span>FACULTY INSTRUCTOR</span>
          </div>
          <div id="modal-teacher-name" class="text-sm font-bold text-[#0F172A] mt-1"></div>
        </div>

        <!-- Prominent Lab Group Designation Card -->
        <div id="modal-group-box" class="hidden bg-emerald-50/50 border border-emerald-300 rounded-[16px] p-3.5 sm:col-span-2 transition-colors">
          <div class="flex items-center justify-between text-[11px] font-semibold uppercase text-[#064E3B]">
            <span class="flex items-center gap-1.5">
              <span>👥</span>
              <span>ASSIGNED LAB GROUP DESIGNATION</span>
            </span>
            <span id="modal-group-chip" class="badge-group"></span>
          </div>
          <div id="modal-group-desc" class="text-sm font-bold text-[#0F172A] mt-1.5 font-mono"></div>
          <div id="modal-group-status" class="text-[11px] font-mono text-slate-600 mt-0.5"></div>
        </div>
      </div>

      <div id="modal-action-footer" class="pt-2">
        <button id="modal-dismiss-btn" onclick="closeInspectionModal()" class="w-full py-3 px-6 rounded-full cursor-pointer font-medium text-sm transition-all shadow-sm bg-[#0F172A] text-white">
          Close Details
        </button>
      </div>
    </div>
  </div>

  <script>
    /**
     * MSE 2K24 / BATCH '24 (KUET) AVIATION ROUTINE ENGINE
     * Includes Differential Dispatch Log Engine & Alternating Group/Week Lab Parser.
     */
    const DATABASE_ENDPOINT = "";
    const BASELINE_STORAGE_KEY = "mse24_baseline_state";
    const DISPATCH_LOGS_KEY = "mse24_dispatch_logs";

    // Baseline Class Routine for MSE 2K24 / Batch '24 (KUET)
    const baselineTestData = [
      { day: "Sunday", startTime: "10:40", endTime: "11:30", subject: "Math 2127: Mathematics-III", teacher: "AH (S.M. Arif Hossen)", room: "MSE 311 / 312", type: "Lecture", status: "Normal", syllabus: "", marks: "" },
      { day: "Sunday", startTime: "11:30", endTime: "12:20", subject: "Hum 2127: Sociology and Financial Accounting", teacher: "RA/FA (Dr. S.M. Rabiul Alam / Farhana Afroj)", room: "MSE 311 / 312", type: "Lecture", status: "Normal", syllabus: "", marks: "" },
      { day: "Sunday", startTime: "12:20", endTime: "13:10", subject: "MSE 2103: Thermodynamics of Materials", teacher: "MH/ARH (Md Mehidi Hasan / Arman Hossain)", room: "MSE 311 / 312", type: "Lecture", status: "Normal", syllabus: "", marks: "" },
      { day: "Sunday", startTime: "14:30", endTime: "16:10", subject: "MSE 2108: Materials Thermodynamics Laboratory", teacher: "ARH & NMN (Arman Hossain & Nadim Mahmood Nayeem)", room: "MSE 311 / 312", type: "Lab-A", status: "Normal", syllabus: "Odd Week Session", marks: "" },
      { day: "Monday", startTime: "08:50", endTime: "09:40", subject: "Phy 2111: Solid State Physics", teacher: "Dr. Marie Curie (MC)", room: "Physics Gallery 01", type: "Lecture", status: "Normal", syllabus: "", marks: "" },
      { day: "Monday", startTime: "09:40", endTime: "10:40", subject: "ME 2127: Mechanics of Materials", teacher: "MSM (Dr. Mohammad Sultan Mahmud)", room: "MSE 311 / 312", type: "Lecture", status: "Normal", syllabus: "", marks: "" },
      { day: "Monday", startTime: "11:30", endTime: "13:10", subject: "MSE 2104: Physical Metallurgy Laboratory", teacher: "MAS & MH (Md. Amran Sarker & Md Mehidi Hasan)", room: "Metallurgy Lab, Level-2", type: "Lab-B", status: "Normal", syllabus: "Even Week Session", marks: "" },
      { day: "Tuesday", startTime: "10:40", endTime: "11:30", subject: "ME 2127: Mechanics of Materials", teacher: "MSM (Dr. Mohammad Sultan Mahmud)", room: "MSE 311 / 312", type: "Lecture", status: "Normal", syllabus: "", marks: "" },
      { day: "Tuesday", startTime: "11:30", endTime: "12:20", subject: "Hum 2127: Sociology & Accounting", teacher: "FA (Farhana Afroj)", room: "MSE 311 / 312", type: "Lecture", status: "Normal", syllabus: "", marks: "" },
      { day: "Tuesday", startTime: "12:20", endTime: "13:10", subject: "MSE 2101: Class Test 1", teacher: "MAS (Md. Amran Sarker)", room: "MSE 311", type: "Exam", status: "Normal", marks: "20 Marks (5% Grade Weight)", syllabus: "• Crystal Structures\\n• Miller Indices\\n• Imperfections in Solids" },
      { day: "Wednesday", startTime: "08:00", endTime: "10:30", subject: "MSE 2102: Polymer Science and Engineering Laboratory", teacher: "NMN & MAS (Nadim Mahmood Nayeem & Md. Amran Sarker)", room: "New Academic Building, Block-D, Level-3", type: "Lab-A", status: "Normal", syllabus: "Odd Week Rotation", marks: "" },
      { day: "Wednesday", startTime: "11:30", endTime: "12:20", subject: "MSE 2103: Thermodynamics of Materials", teacher: "MH/ARH (Md Mehidi Hasan / Arman Hossain)", room: "MSE 311 / 312", type: "Lecture", status: "Normal", syllabus: "", marks: "" },
      { day: "Thursday", startTime: "08:00", endTime: "08:50", subject: "MSE 2101: Introduction to MSE", teacher: "NMN (Nadim Mahmood Nayeem)", room: "MSE 311 / 312", type: "Lecture", status: "Cancelled", syllabus: "", marks: "" },
      { day: "Thursday", startTime: "08:50", endTime: "09:40", subject: "Math 2127: Mathematics-III", teacher: "AH (S.M. Arif Hossen)", room: "MSE 311 / 312", type: "Lecture", status: "Normal", syllabus: "", marks: "" },
      { day: "Thursday", startTime: "10:40", endTime: "12:20", subject: "ME 2128: Mechanics of Materials Sessional", teacher: "MSM (Dr. Mohammad Sultan Mahmud)", room: "Solid Mechanics Lab", type: "Lab", status: "Normal", syllabus: "", marks: "" }
    ];

    const DAY_START_MINUTES = 480;  // 08:00 AM
    const TOTAL_DAY_MINUTES = 540;  // 540 minutes total (until 05:00 PM)
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

    const ACADEMIC_PERIOD_TIMES = [
      '08:00', '08:50', '09:40', '10:40', '11:30', '12:20',
      '13:10', '14:30', '15:20', '16:10', '17:00'
    ];

    let currentEvents = [...baselineTestData];
    let currentTheme = 'light';
    let isDispatchLogExpanded = false;

    // 1. ACADEMIC TERM & LAB GROUP PARSER
    // Automated calendar-week and odd/even week cycle calculations completely removed.
    function getCalendarWeekInfo() {
      return {
        cycleLabel: '2ND YEAR · 1ST TERM'
      };
    }

    /**
     * Parses concise shorthands ("Lab-A", "Lab A", "Lab-B", "Lab B", "Lab-A/B", "Lab A/B", "Lab", "[Grp-A]")
     * and performs case-insensitive category matching.
     * Category classification:
     * - If lower.includes('exam') || lower.includes('test'): Category = 'EXAM'
     * - Else if lower.includes('lab') || lower.includes('sessional'): Category = 'LAB'
     * - Else: Category = 'LECTURE'
     * Under no circumstances does any entry containing "lab" default to "LECTURE".
     */
    function parseAlternatingSchedule(type, subject, syllabus) {
      const rawType = (type || '').trim().toLowerCase();

      // Strict Category Parser: inspects ONLY type column, never subject
      let category = 'LECTURE';
      if (rawType.includes('exam') || rawType === 'ct' || rawType.startsWith('test')) {
        category = 'EXAM';
      } else if (rawType.includes('lab') || rawType.includes('sessional')) {
        category = 'LAB';
      } else {
        category = 'LECTURE';
      }

      // Shorthand Lab Group Support:
      // Recognize clean shorthands: "Lab-A", "Lab A", "Lab-B", "Lab B", "Lab-A/B", "Lab A/B", and bracketed formats "[Grp-A]"
      let groupTag = null;
      let groupVariant = null;
      const candidates = category === 'LAB' ? [rawType, subject || '', syllabus || ''] : [];

      for (const text of candidates) {
        if (!text) continue;
        const norm = text.toLowerCase();
        // Check Dual Group A/B first
        if (/lab[-_\\s]?a\\/b|\\ba\\/b\\b|grp[-_\\s]?a\\/b|group[-_\\s]?a\\/b|\\[a\\/b\\]|\\(a\\/b\\)/i.test(norm)) {
          groupTag = 'GRP A/B';
          groupVariant = 'A/B';
          break;
        }
        // Check Group A
        if (/[-_\\s\\(\\[]grp[-_\\s]?a[\\]\\)]?|[-_\\s\\(\\[]group[-_\\s]?a[\\]\\)]?|\\bgrp[-_\\s]?a\\b|\\bgroup[-_\\s]?a\\b|[-_\\s]a\\b|\\[a\\]|\\(a\\)/i.test(norm)) {
          groupTag = 'GRP A';
          groupVariant = 'A';
          break;
        }
        // Check Group B
        if (/[-_\\s\\(\\[]grp[-_\\s]?b[\\]\\)]?|[-_\\s\\(\\[]group[-_\\s]?b[\\]\\)]?|\\bgrp[-_\\s]?b\\b|\\bgroup[-_\\s]?b\\b|[-_\\s]b\\b|\\[b\\]|\\(b\\)/i.test(norm)) {
          groupTag = 'GRP B';
          groupVariant = 'B';
          break;
        }
      }

      const cleanSyllabus = (syllabus || '').trim();
      const hasReportDue = category === 'LAB' && cleanSyllabus.length > 0;

      return {
        category,
        groupTag,
        groupVariant,
        badgeText: groupTag,
        hasReportDue,
        syllabusText: cleanSyllabus,
        isAlternating: false,
        isActiveThisWeek: true,
        statusKicker: null
      };
    }

    // 2. DIFFERENTIAL DISPATCH LOG ENGINE
    function processDifferentialLogs(freshEvents) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

      // Construct current state snapshot
      const currentSnapshot = {};
      freshEvents.forEach(evt => {
        const key = (evt.day + '_' + evt.startTime + '_' + evt.subject).trim();
        const signature = (evt.room || '') + '|' + (evt.status || 'Normal') + '|' + (evt.teacher || '') + '|' + (evt.syllabus || '') + '|' + (evt.marks || '');
        currentSnapshot[key] = { signature, event: evt };
      });

      let cachedBaselineRaw = null;
      try {
        cachedBaselineRaw = localStorage.getItem(BASELINE_STORAGE_KEY);
      } catch (e) {}

      let existingLogs = [];
      try {
        const rawLogs = localStorage.getItem(DISPATCH_LOGS_KEY);
        if (rawLogs) existingLogs = JSON.parse(rawLogs);
      } catch (e) {}

      // FIRST LOAD
      if (!cachedBaselineRaw) {
        const initLog = {
          id: 'sys-' + Date.now(),
          time: timeStr,
          type: 'SYSTEM READY',
          message: '[SYSTEM READY]: Baseline schedule loaded. Monitoring for live changes.'
        };
        const initialLogs = [initLog];
        try {
          localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(currentSnapshot));
          localStorage.setItem(DISPATCH_LOGS_KEY, JSON.stringify(initialLogs));
        } catch (e) {}
        renderDispatchLogs(initialLogs);
        return;
      }

      // SUBSEQUENT SYNCS
      let cachedBaseline = {};
      try {
        cachedBaseline = JSON.parse(cachedBaselineRaw);
      } catch (e) {}

      const newDiffLogs = [];
      Object.keys(currentSnapshot).forEach(key => {
        const cur = currentSnapshot[key];
        const prev = cachedBaseline[key];

        if (!prev) {
          newDiffLogs.push({
            id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            time: timeStr,
            type: 'NEW SLOT',
            message: '[NEW SLOT] ' + cur.event.day + ' ' + cur.event.startTime + ' ' + cur.event.subject + ' added to timetable'
          });
          return;
        }

        if (cur.signature === prev.signature) {
          return; // Identical, zero logs
        }

        let type = 'EXAM UPDATE';
        let msg = '';
        if (cur.event.status !== prev.event.status) {
          if (cur.event.status === 'Cancelled') {
            type = 'CANCELLATION';
            msg = '[ALERT] ' + cur.event.day + ' ' + cur.event.startTime + ' ' + cur.event.subject + ' marked CANCELLED';
          } else {
            type = 'NEW SLOT';
            msg = '[RESTORED] ' + cur.event.day + ' ' + cur.event.startTime + ' ' + cur.event.subject + ' restored to active';
          }
        } else if (cur.event.room !== prev.event.room) {
          type = 'ROOM REALLOCATION';
          msg = '[ROOM CHANGE] ' + cur.event.day + ' ' + cur.event.startTime + ' ' + cur.event.subject + ' moved to ' + (cur.event.room || 'TBA');
        } else if (cur.event.syllabus !== prev.event.syllabus || cur.event.marks !== prev.event.marks) {
          type = 'EXAM UPDATE';
          msg = '[EXAM UPDATE] ' + cur.event.day + ' ' + cur.event.startTime + ' ' + cur.event.subject + ' syllabus/marks modified';
        } else if (cur.event.teacher !== prev.event.teacher) {
          type = 'FACULTY UPDATE';
          msg = '[FACULTY CHANGE] ' + cur.event.day + ' ' + cur.event.startTime + ' ' + cur.event.subject + ' instructor reallocated';
        } else {
          msg = '[DISPATCH] ' + cur.event.day + ' ' + cur.event.startTime + ' ' + cur.event.subject + ' parameters updated';
        }

        newDiffLogs.push({
          id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          time: timeStr,
          type,
          message: msg
        });
      });

      // Check deleted slots
      Object.keys(cachedBaseline).forEach(key => {
        if (!currentSnapshot[key]) {
          const prev = cachedBaseline[key];
          newDiffLogs.push({
            id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            time: timeStr,
            type: 'CANCELLATION',
            message: '[DELETED] ' + prev.event.day + ' ' + prev.event.startTime + ' ' + prev.event.subject + ' withdrawn from routine'
          });
        }
      });

      const updatedLogs = [...newDiffLogs, ...existingLogs].slice(0, 10);
      try {
        localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(currentSnapshot));
        localStorage.setItem(DISPATCH_LOGS_KEY, JSON.stringify(updatedLogs));
      } catch (e) {}

      renderDispatchLogs(updatedLogs);
    }

    function renderDispatchLogs(logs) {
      const isDark = currentTheme === 'dark';
      const countBadge = document.getElementById('dispatch-count-badge');
      const body = document.getElementById('dispatch-log-body');
      if (countBadge) countBadge.textContent = logs.length + (logs.length === 1 ? ' UPDATE' : ' UPDATES');
      if (!body) return;
      body.innerHTML = '';

      if (logs.length === 0) {
        body.innerHTML = '<div class="py-2 text-center text-slate-400">NO DISPATCH EVENTS RECORDED</div>';
        return;
      }

      logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'p-2 rounded-sm border flex items-center gap-2 ' + 
          (isDark ? 'bg-[#0F172A] border-[#334155]' : 'bg-slate-50 border-slate-200');

        let typeBadge = '';
        if (log.type === 'CANCELLATION') {
          typeBadge = '<span class="px-1.5 py-0.2 rounded-sm text-[9px] font-bold border ' + (isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300') + '">CANCELLATION</span>';
        } else if (log.type === 'ROOM REALLOCATION') {
          typeBadge = '<span class="px-1.5 py-0.2 rounded-sm text-[9px] font-bold border ' + (isDark ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-[#064E3B] border-emerald-300') + '">VENUE CHANGE</span>';
        } else if (log.type === 'EXAM UPDATE') {
          typeBadge = '<span class="px-1.5 py-0.2 rounded-sm text-[9px] font-bold border ' + (isDark ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900 text-white border-slate-900') + '">EXAM / CT</span>';
        } else {
          typeBadge = '<span class="px-1.5 py-0.2 rounded-sm text-[9px] font-bold border ' + (isDark ? 'bg-[#1E293B] text-slate-300 border-[#334155]' : 'bg-slate-100 text-slate-700 border-slate-200') + '">TELEMETRY</span>';
        }

        item.innerHTML = 
          '<span class="text-[10px] tabular-nums font-semibold ' + (isDark ? 'text-slate-400' : 'text-slate-500') + '">[' + log.time + ']</span>' +
          typeBadge +
          '<span class="truncate ' + (isDark ? 'text-slate-200' : 'text-slate-800') + '">' + log.message + '</span>';

        body.appendChild(item);
      });
    }

    function toggleDispatchLog() {
      isDispatchLogExpanded = !isDispatchLogExpanded;
      const body = document.getElementById('dispatch-log-body');
      const chevron = document.getElementById('dispatch-chevron');
      if (body) {
        if (isDispatchLogExpanded) body.classList.remove('hidden');
        else body.classList.add('hidden');
      }
      if (chevron) {
        chevron.textContent = isDispatchLogExpanded ? '▲' : '▼';
      }
    }

    function clearLogs() {
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const resetLog = [{
        id: 'clear-' + Date.now(),
        time: timeStr,
        type: 'SYSTEM READY',
        message: '[LOGS CLEARED]: History wiped. Baseline state preserved.'
      }];
      try {
        localStorage.setItem(DISPATCH_LOGS_KEY, JSON.stringify(resetLog));
      } catch (e) {}
      renderDispatchLogs(resetLog);
    }

    // 3. THEME MANAGEMENT WITH LOCALSTORAGE PERSISTENCE
    function initTheme() {
      try {
        const saved = localStorage.getItem('aviation_theme');
        if (saved === 'dark' || saved === 'light') {
          currentTheme = saved;
        }
      } catch (e) {}
      applyTheme(currentTheme);
    }

    function toggleTheme() {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('aviation_theme', currentTheme);
      } catch (e) {}
      applyTheme(currentTheme);
      renderAtAGlance();
      renderAcademicPeriodGrid();
      // Re-render logs in current theme
      try {
        const logs = JSON.parse(localStorage.getItem(DISPATCH_LOGS_KEY) || '[]');
        renderDispatchLogs(logs);
      } catch (e) {}
    }

    function applyTheme(theme) {
      const isDark = theme === 'dark';
      const root = document.documentElement;
      const themeLabel = document.getElementById('theme-label');
      const themeBtn = document.getElementById('theme-toggle-btn');
      
      if (themeLabel) themeLabel.textContent = '[ THEME: ' + (isDark ? 'DARK' : 'LIGHT') + ' ]';

      if (isDark) {
        root.classList.add('dark');
        document.body.className = 'bg-[#0F172A] text-white min-h-screen antialiased selection:bg-slate-700 selection:text-white';
        if (themeBtn) themeBtn.className = 'font-sans font-bold uppercase text-[11px] sm:text-xs py-1.5 px-3 rounded-sm flex items-center justify-center gap-1.5 cursor-pointer tracking-wider transition-colors border select-none bg-[#1E293B] border-[#334155] text-white hover:bg-[#334155]';
      } else {
        root.classList.remove('dark');
        document.body.className = 'bg-white text-[#0F172A] min-h-screen antialiased selection:bg-slate-200 selection:text-slate-900';
        if (themeBtn) themeBtn.className = 'font-sans font-bold uppercase text-[11px] sm:text-xs py-1.5 px-3 rounded-sm flex items-center justify-center gap-1.5 cursor-pointer tracking-wider transition-colors border select-none bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50';
      }

      // Sync elements
      const teleBar = document.getElementById('telemetry-bar');
      const teleLabel = document.getElementById('telemetry-deck-label');
      const clockBox = document.getElementById('digital-clock-box');
      const mainHeader = document.getElementById('main-header');
      const brandBadge = document.getElementById('brand-badge');
      const brandTitle = document.getElementById('brand-title');
      const brandSub = document.getElementById('brand-subtitle');
      const jumpBtn = document.getElementById('btn-jump-now');
      const csvDeck = document.getElementById('csv-dispatch-deck');
      const csvLabel = document.getElementById('csv-dispatch-label');
      const csvInput = document.getElementById('testing-csv-input');
      const syncBtn = document.getElementById('btn-manual-sync');
      const resetBtn = document.getElementById('btn-reset-baseline');
      const atAGlanceCard = document.getElementById('at-a-glance-widget');
      const atAGlanceHeader = document.getElementById('at-a-glance-header');
      const atAGlanceTitle = document.getElementById('at-a-glance-title');
      const atAGlanceIcon = document.getElementById('at-a-glance-icon');
      const dispatchPanel = document.getElementById('dispatch-log-panel');
      const dispatchHeader = document.getElementById('dispatch-log-header');
      const dispatchTitle = document.getElementById('dispatch-log-title');
      const dispatchIcon = document.getElementById('dispatch-log-icon');
      const dispatchBody = document.getElementById('dispatch-log-body');
      const legendBar = document.getElementById('legend-bar');
      const legendText = document.getElementById('legend-text');
      const masterGridBox = document.getElementById('master-grid-box');
      const staticDayWrapper = document.getElementById('static-day-column-wrapper');
      const staticDayHeader = document.getElementById('static-day-header');
      const timelineContainer = document.getElementById('timeline-scroll-container');
      const axisHeader = document.getElementById('academic-axis-header');
      const secTitle = document.getElementById('matrix-section-title');
      const mainFooter = document.getElementById('main-footer');
      const footerBrand = document.getElementById('footer-brand');

      if (teleBar) teleBar.className = isDark ? 'border-b border-[#334155] bg-[#0B1120] px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 transition-colors' : 'border-b border-[#E2E8F0] bg-slate-50/80 px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 transition-colors';
      if (teleLabel) teleLabel.className = 'font-mono text-[11px] font-bold ' + (isDark ? 'text-white' : 'text-[#0F172A]');
      if (clockBox) clockBox.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border ' + (isDark ? 'bg-[#131D31] text-white border-[#334155]' : 'bg-white text-slate-900 border-[#E2E8F0]');
      if (mainHeader) mainHeader.className = isDark ? 'bg-[#0F172A] border-b border-[#334155] sticky top-0 z-40 select-none w-full transition-colors' : 'bg-white border-b border-[#E2E8F0] sticky top-0 z-40 select-none shadow-2xs w-full transition-colors';
      if (brandBadge) brandBadge.className = 'w-9 h-9 rounded-sm font-mono font-black text-xs flex items-center justify-center shrink-0 border tracking-widest transition-colors ' + (isDark ? 'bg-white text-[#0F172A] border-white' : 'bg-[#0F172A] text-white border-[#0F172A]');
      if (brandTitle) brandTitle.className = 'text-base sm:text-lg font-bold tracking-tight leading-tight truncate transition-colors ' + (isDark ? 'text-white' : 'text-[#0F172A]');
      if (brandSub) brandSub.className = 'text-[11px] font-mono truncate transition-colors ' + (isDark ? 'text-slate-400' : 'text-slate-500');
      if (jumpBtn) jumpBtn.className = 'text-xs py-1.5 px-3 rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors border ' + (isDark ? 'bg-[#1E293B] border-[#334155] text-white hover:bg-[#334155]' : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50');
      if (csvDeck) csvDeck.className = isDark ? 'border-t border-[#334155] bg-[#0B1120] px-3 sm:px-6 py-2 w-full transition-colors' : 'border-t border-[#E2E8F0] bg-slate-50/50 px-3 sm:px-6 py-2 w-full transition-colors';
      if (csvLabel) csvLabel.className = 'flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase transition-colors ' + (isDark ? 'text-white' : 'text-[#0F172A]');
      if (csvInput) csvInput.className = 'w-full text-xs font-mono pl-8 pr-3 py-1.5 rounded-sm transition-all shadow-2xs focus:outline-none border ' + (isDark ? 'bg-[#131D31] text-white border-[#334155] placeholder-slate-500' : 'bg-white text-[#0F172A] border-[#CBD5E1] placeholder-slate-400');
      if (syncBtn) syncBtn.className = 'text-xs py-1.5 px-3 rounded-sm flex-1 md:flex-initial font-semibold transition-colors flex items-center gap-1.5 justify-center border cursor-pointer ' + (isDark ? 'bg-white text-[#0F172A] hover:bg-slate-100 border-white' : 'bg-[#0F172A] text-white border-[#0F172A]');
      if (resetBtn) resetBtn.className = 'text-xs py-1.5 px-2.5 rounded-sm flex-1 md:flex-initial transition-colors cursor-pointer border ' + (isDark ? 'bg-[#1E293B] border-[#334155] text-white hover:bg-[#334155]' : 'bg-white text-slate-700 border-[#CBD5E1] hover:bg-slate-50');
      if (atAGlanceCard) atAGlanceCard.className = 'rounded-sm p-4 mb-4 select-none shadow-2xs w-full max-w-full transition-colors border ' + (isDark ? 'bg-[#131D31] border-[#334155]' : 'bg-white border-[#E2E8F0]');
      if (atAGlanceHeader) atAGlanceHeader.className = 'flex items-center justify-between pb-2.5 mb-3 border-b ' + (isDark ? 'border-[#334155]' : 'border-[#E2E8F0]');
      if (atAGlanceTitle) atAGlanceTitle.className = 'text-sm font-bold tracking-tight leading-tight uppercase font-mono transition-colors ' + (isDark ? 'text-white' : 'text-[#0F172A]');
      if (atAGlanceIcon) atAGlanceIcon.className = 'w-6 h-6 rounded-sm flex items-center justify-center font-mono ' + (isDark ? 'bg-white text-[#0F172A]' : 'bg-[#0F172A] text-white');
      if (dispatchPanel) dispatchPanel.className = 'mb-4 rounded-sm border transition-colors ' + (isDark ? 'bg-[#131D31] border-[#334155]' : 'bg-white border-[#E2E8F0]');
      if (dispatchTitle) dispatchTitle.className = 'text-xs font-bold font-mono tracking-wider uppercase ' + (isDark ? 'text-white' : 'text-[#0F172A]');
      if (dispatchIcon) dispatchIcon.className = 'w-5 h-5 rounded-sm flex items-center justify-center font-mono ' + (isDark ? 'bg-white text-[#0F172A]' : 'bg-[#0F172A] text-white');
      if (dispatchBody) dispatchBody.className = (isDispatchLogExpanded ? '' : 'hidden ') + 'p-3 border-t space-y-1.5 text-xs font-mono ' + (isDark ? 'border-[#334155]' : 'border-[#E2E8F0]');
      if (legendBar) legendBar.className = 'mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-sm transition-colors border ' + (isDark ? 'border-[#334155] bg-[#131D31]' : 'border-[#E2E8F0] bg-slate-50/70');
      if (legendText) legendText.className = 'flex items-center gap-2 text-xs font-mono flex-wrap ' + (isDark ? 'text-slate-300' : 'text-slate-600');
      if (masterGridBox) masterGridBox.className = 'rounded-sm overflow-hidden shadow-2xs flex items-stretch select-none transition-colors border ' + (isDark ? 'bg-[#0F172A] border-[#334155]' : 'bg-white border-[#E2E8F0]');
      if (staticDayWrapper) staticDayWrapper.className = 'w-24 sm:w-32 shrink-0 border-r flex flex-col z-20 transition-colors ' + (isDark ? 'border-[#334155] bg-[#0B1120]' : 'border-[#E2E8F0] bg-slate-50/70');
      if (staticDayHeader) staticDayHeader.className = 'h-10 border-b px-3 flex items-center justify-between text-[11px] font-bold tracking-wide uppercase font-mono transition-colors ' + (isDark ? 'border-[#334155] bg-[#131D31] text-white' : 'border-[#E2E8F0] bg-slate-100/80 text-[#0F172A]');
      if (timelineContainer) timelineContainer.className = 'flex-1 overflow-x-auto scroll-smooth timeline-touch-track transition-colors ' + (isDark ? 'bg-[#0F172A]' : 'bg-white');
      if (axisHeader) axisHeader.className = 'h-10 border-b relative select-none transition-colors ' + (isDark ? 'border-[#334155] bg-[#131D31]' : 'border-[#E2E8F0] bg-slate-100/70');
      if (secTitle) secTitle.className = 'font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors ' + (isDark ? 'text-white' : 'text-[#0F172A]');
      if (mainFooter) mainFooter.className = 'mt-8 pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono transition-colors ' + (isDark ? 'border-[#334155] text-slate-400' : 'border-[#E2E8F0] text-slate-500');
      if (footerBrand) footerBrand.className = 'font-bold uppercase transition-colors ' + (isDark ? 'text-white' : 'text-[#0F172A]');
      const legExam = document.getElementById('legend-exam-chip');
      if (legExam) legExam.className = 'flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-semibold text-[11px] border ' + (isDark ? 'bg-[#78350F]/40 text-amber-200 border-[#F59E0B]' : 'bg-amber-50 text-[#78350F] border-[#D97706]');
    }

    function timeToMinutes(timeStr) {
      if (!timeStr) return 0;
      const parts = timeStr.trim().split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    function calculateSlot(startTime, endTime) {
      const startMins = timeToMinutes(startTime);
      const endMins = timeToMinutes(endTime);
      const duration = Math.max(0, endMins - startMins);
      const leftOffset = ((startMins - DAY_START_MINUTES) / TOTAL_DAY_MINUTES) * 100;
      const width = (duration / TOTAL_DAY_MINUTES) * 100;
      return {
        left: Math.max(0, Math.min(100, leftOffset)),
        width: Math.max(1, Math.min(100 - leftOffset, width)),
        duration
      };
    }

    function formatDuration(mins) {
      if (mins < 60) return mins + 'M';
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? h + 'H ' + m + 'M' : h + 'H';
    }

    // 4. RENDER 'DEPARTURES & UP NEXT' QUEUE
    function renderAtAGlance() {
      const listEl = document.getElementById('at-a-glance-list');
      if (!listEl) return;
      listEl.innerHTML = '';

      const isDark = currentTheme === 'dark';
      const weekInfo = getCalendarWeekInfo();
      const now = new Date();
      const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentMins = now.getHours() * 60 + now.getMinutes();

      let currentDayIdx = DAYS.indexOf(currentDayName);
      if (currentDayIdx === -1) currentDayIdx = 0;

      const activeEvents = currentEvents.filter(e => e.status !== 'Cancelled');
      const upcoming = [];

      activeEvents.forEach(evt => {
        const evtDayIdx = DAYS.indexOf(evt.day);
        if (evtDayIdx === -1) return;

        const startMins = timeToMinutes(evt.startTime);
        const endMins = timeToMinutes(evt.endTime);
        let dayDelta = evtDayIdx - currentDayIdx;

        if (dayDelta === 0 && currentMins > endMins) dayDelta = 5;
        else if (dayDelta < 0) dayDelta += 5;

        let relativeLabel = '';
        if (dayDelta === 0) {
          if (currentMins < startMins) {
            const diff = startMins - currentMins;
            relativeLabel = diff < 60 ? 'in ' + diff + 'm' : 'Today ' + evt.startTime;
          } else {
            relativeLabel = 'Active Now';
          }
        } else if (dayDelta === 1) {
          relativeLabel = 'Tomorrow ' + evt.startTime;
        } else {
          relativeLabel = evt.day.slice(0, 3) + ' ' + evt.startTime;
        }

        upcoming.push({ event: evt, relativeLabel, sortScore: dayDelta * 1440 + startMins });
      });

      upcoming.sort((a, b) => a.sortScore - b.sortScore);
      const next3 = upcoming.slice(0, 3);

      if (next3.length === 0) {
        listEl.innerHTML = '<div class="py-6 text-center text-xs font-mono border rounded-sm ' + (isDark ? 'text-slate-400 bg-[#0F172A] border-[#334155]' : 'text-slate-500 bg-slate-50 border-[#E2E8F0]') + '">NO DEPARTURES IN ACTIVE QUEUE</div>';
        return;
      }

      next3.forEach(({ event: evt, relativeLabel }, index) => {
        const alternating = parseAlternatingSchedule(evt.type, evt.subject, evt.syllabus);
        const isExam = alternating.category === 'EXAM';
        const isLab = alternating.category === 'LAB';

        const item = document.createElement('div');
        item.className = 'p-2.5 sm:p-3 rounded-sm transition-all duration-120 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-2xs border ' + 
          (isDark ? 'bg-[#0F172A] hover:bg-[#1E293B] border-[#334155] hover:border-slate-400' : 'bg-white hover:bg-slate-50/80 border-[#E2E8F0] hover:border-slate-400');
        item.onclick = () => openInspectionModal(evt);

        const typeBadge = isExam
          ? (isDark ? 'bg-amber-950/80 text-amber-300 border-amber-700' : 'bg-amber-100 text-[#B45309] border-amber-300')
          : isLab
          ? (isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-[#064E3B] border-emerald-300')
          : (isDark ? 'bg-[#1E293B] text-slate-200 border-[#334155]' : 'bg-slate-100 text-slate-900 border-slate-300');

        let groupBadge = '';
        if (alternating.groupTag) {
          groupBadge = '<span class="badge-group">' + alternating.groupTag + '</span>';
        }

        item.innerHTML = 
          '<div class="flex items-start sm:items-center gap-3 min-w-0">' +
            '<div class="w-6 h-6 rounded-sm font-mono font-bold text-xs flex items-center justify-center shrink-0 border tabular-nums ' + (isDark ? 'bg-[#1E293B] text-slate-200 border-[#334155]' : 'bg-slate-100 text-slate-700 border-slate-200') + '">0' + (index + 1) + '</div>' +
            '<div class="min-w-0">' +
              '<div class="flex items-center gap-2 flex-wrap">' +
                '<span class="text-xs sm:text-sm font-bold tracking-tight truncate transition-colors ' + (isDark ? 'text-white' : 'text-[#0F172A]') + '">' + evt.subject + '</span>' +
                '<span class="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-sm border uppercase ' + typeBadge + '">' + (isLab ? 'LAB' : isExam ? 'EXAM' : 'LECTURE') + '</span>' +
                groupBadge +
              '</div>' +
              '<div class="text-[11px] font-mono flex items-center gap-2 mt-0.5 flex-wrap ' + (isDark ? 'text-slate-400' : 'text-slate-500') + '">' +
                '<span class="font-medium ' + (isDark ? 'text-slate-200' : 'text-slate-700') + '">Room ' + (evt.room || 'TBA') + '</span>' +
                '<span class="' + (isDark ? 'text-slate-600' : 'text-slate-300') + '">/</span>' +
                '<span class="truncate ' + (isDark ? 'text-slate-300' : 'text-slate-600') + '">' + evt.teacher.split('(')[0].trim() + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">' +
            '<div class="text-left sm:text-right font-mono">' +
              '<div class="text-[11px] font-bold px-2 py-0.5 rounded-sm inline-block uppercase border ' + (isDark ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800' : 'text-[#064E3B] bg-emerald-50 border-emerald-200') + '">' + relativeLabel + '</div>' +
              '<div class="text-[11px] font-semibold flex items-center gap-1 sm:justify-end mt-0.5 tabular-nums ' + (isDark ? 'text-slate-300' : 'text-slate-600') + '">🕒 ' + evt.day.slice(0, 3) + ' ' + evt.startTime + ' – ' + evt.endTime + '</div>' +
            '</div>' +
            '<div class="w-6 h-6 rounded-sm flex items-center justify-center transition-colors border ' + (isDark ? 'bg-[#1E293B] text-slate-300 border-[#334155]' : 'bg-slate-100 text-slate-500 border-slate-200') + '">→</div>' +
          '</div>';
        listEl.appendChild(item);
      });
    }

    // 5. RENDER MASTER MATRIX GRID (GATE IDENTIFIER STYLE + 1PX EXACT ALIGNMENT)
    function renderAcademicPeriodGrid() {
      const isDark = currentTheme === 'dark';
      const weekInfo = getCalendarWeekInfo();
      const staticDayCol = document.getElementById('static-day-column');
      if (!staticDayCol) return;
      staticDayCol.innerHTML = '';
      const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      // Static Day Column: Airport Boarding Gate Style (Clean Flex Center)
      DAYS.forEach((day) => {
        const isToday = day.toLowerCase() === todayName.toLowerCase();
        const dayEventsCount = currentEvents.filter(e => e.day.toLowerCase() === day.toLowerCase()).length;

        const cell = document.createElement('div');
        cell.className = 'h-24 p-2 flex items-center justify-center transition-colors border-b last:border-b-0 ' + 
          (isDark ? 'border-[#334155] ' + (isToday ? 'bg-[#131D31]' : 'bg-[#0B1120]') : 'border-[#E2E8F0] ' + (isToday ? 'bg-slate-100/90' : 'bg-slate-50/40'));

        cell.innerHTML = 
          '<div class="w-full h-full rounded-sm p-2 flex flex-col items-center justify-center text-center transition-all border ' +
            (isToday 
              ? (isDark ? 'bg-[#1E293B] border-emerald-500 text-white shadow-xs' : 'bg-[#0F172A] border-[#0F172A] text-white shadow-xs')
              : (isDark ? 'bg-[#131D31] border-[#334155] text-white hover:border-slate-500' : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:border-slate-300')) + '">' +
            '<div class="flex items-center justify-center gap-1.5 leading-none">' +
              '<span class="text-base font-black tracking-widest font-mono uppercase">' + day.slice(0, 3) + '</span>' +
              (isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>' : '') +
            '</div>' +
            '<div class="mt-1 flex items-center justify-center gap-1 font-mono text-[9px] tracking-wider uppercase opacity-80 leading-none">' +
              '<span>GATE ' + day.slice(0, 1) + '</span>' +
              '<span>·</span>' +
              '<span>' + dayEventsCount + (dayEventsCount === 1 ? ' FLT' : ' FLTS') + '</span>' +
            '</div>' +
          '</div>';

        staticDayCol.appendChild(cell);
      });

      // Axis Header: Precision Hairline Ticks (100% Mathematically Aligned with Gridlines)
      const axisHeader = document.getElementById('academic-axis-header');
      if (!axisHeader) return;
      axisHeader.innerHTML = '';
      ACADEMIC_PERIOD_TIMES.forEach((timeStr, idx) => {
        const mins = timeToMinutes(timeStr);
        const leftPercent = ((mins - DAY_START_MINUTES) / TOTAL_DAY_MINUTES) * 100;
        const isFirst = idx === 0;
        const isLast = idx === ACADEMIC_PERIOD_TIMES.length - 1;

        // 1. Tick line
        const tick = document.createElement('div');
        tick.style.left = leftPercent + '%';
        tick.className = 'absolute bottom-0 h-2.5 w-px border-l pointer-events-none ' + (isDark ? 'border-[#334155]' : 'border-slate-300');
        axisHeader.appendChild(tick);

        // 2. Centered Text label
        const markText = document.createElement('div');
        markText.style.left = leftPercent + '%';
        markText.className = 'absolute top-1 text-[10px] font-mono font-semibold whitespace-nowrap tabular-nums pointer-events-none ' + 
          (isFirst ? 'translate-x-0 pl-1' : isLast ? '-translate-x-full pr-1' : '-translate-x-1/2') + ' ' + 
          (isDark ? 'text-slate-300' : 'text-slate-600');
        markText.textContent = timeStr;
        axisHeader.appendChild(markText);
      });

      const tracksContainer = document.getElementById('academic-tracks-container');
      if (!tracksContainer) return;
      tracksContainer.innerHTML = '';

      DAYS.forEach((day) => {
        const isToday = day.toLowerCase() === todayName.toLowerCase();
        const dayEvents = currentEvents.filter(e => e.day.toLowerCase() === day.toLowerCase());

        const trackRow = document.createElement('div');
        trackRow.className = 'h-24 relative py-1 transition-colors border-b last:border-b-0 ' + 
          (isDark ? 'border-[#334155] ' + (isToday ? 'bg-[#131D31]/40' : 'bg-[#0F172A]') : 'border-[#E2E8F0] ' + (isToday ? 'bg-slate-50/50' : 'bg-white'));

        // Exact 1px vertical hairline matrix lines
        ACADEMIC_PERIOD_TIMES.forEach(timeStr => {
          const mins = timeToMinutes(timeStr);
          const leftPercent = ((mins - DAY_START_MINUTES) / TOTAL_DAY_MINUTES) * 100;
          const line = document.createElement('div');
          line.style.left = leftPercent + '%';
          line.className = 'absolute top-0 bottom-0 w-px border-l pointer-events-none ' + (isDark ? 'border-[#334155]' : 'border-[#E2E8F0]');
          trackRow.appendChild(line);
        });

        // Event cards
        dayEvents.forEach(evt => {
          const geom = calculateSlot(evt.startTime, evt.endTime);
          const isCancelled = evt.status === 'Cancelled';
          const alternating = parseAlternatingSchedule(evt.type, evt.subject, evt.syllabus);
          const isExam = alternating.category === 'EXAM';
          const isLab = alternating.category === 'LAB';
          const isCompactExam = isExam && geom.duration < 35 && !isCancelled;
          const isCompact = geom.duration <= 35;

          const card = document.createElement('div');
          card.style.left = geom.left + '%';
          card.style.width = geom.width + '%';
          card.style.boxSizing = 'border-box';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          card.style.justifyContent = 'space-between';
          card.style.overflow = 'hidden';

          // 1. NARROW EXAM COMPACT CARD (< 35 mins)
          if (isCompactExam) {
            card.style.padding = '4px 6px';
            card.style.alignItems = 'center';
            card.className = 'absolute top-1 bottom-1 z-10 select-none cursor-pointer rounded-sm border transition-all duration-120 group ' + 
              (isDark
                ? 'compact-exam bg-[#D97706] border-[#F59E0B] text-white shadow-2xs hover:bg-[#F59E0B] hover:text-slate-950'
                : 'compact-exam bg-[#D97706] border-[#B45309] text-white shadow-2xs hover:bg-[#B45309]');
            card.onclick = () => openInspectionModal(evt);
            card.title = 'EXAM / CT: ' + evt.subject + ' [' + evt.startTime + ' - ' + evt.endTime + ']';

            let html = '';
            html += '<div class="text-[8px] font-mono font-bold tracking-wider uppercase opacity-90 shrink-0 leading-none">EXAM</div>';
            html += '<div class="my-auto flex flex-col items-center justify-center text-center"><span class="font-mono font-black text-xs sm:text-sm tracking-wider uppercase leading-none drop-shadow-2xs">CT</span></div>';
            html += '<div class="text-[9px] font-mono font-bold tabular-nums shrink-0 leading-none opacity-95">' + evt.startTime + '</div>';
            card.innerHTML = html;
            trackRow.appendChild(card);
            return;
          }

          // 2. STANDARD CARD
          card.style.padding = '6px 8px';

          let theme = isDark
            ? 'bg-[#131D31] border-[#334155] text-white hover:border-slate-300 hover:bg-[#1E293B]'
            : 'bg-white border-slate-300 text-[#0F172A] hover:border-[#0F172A] hover:bg-slate-50/60';
          let chipClass = isDark
            ? 'bg-slate-800 text-slate-200 border-[#334155]'
            : 'bg-slate-100 text-slate-800 border-slate-300';

          if (isCancelled) {
            theme = isDark
              ? 'bg-slate-900/80 border-[#334155] text-slate-500 opacity-60 hover:opacity-90'
              : 'bg-slate-100/90 border-slate-300 text-slate-500 opacity-65 hover:opacity-100';
            chipClass = isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-600 border-slate-300';
          } else if (isExam) {
            theme = isDark
              ? 'bg-[#78350F]/40 border-[#F59E0B] text-amber-100 shadow-2xs hover:border-amber-400 hover:bg-[#78350F]/60'
              : 'bg-amber-50/90 border-[#D97706] text-[#78350F] shadow-2xs hover:bg-amber-100/90 hover:border-[#B45309]';
          } else if (isLab) {
            theme = isDark
              ? 'bg-[#064E3B]/30 border-emerald-600/80 text-emerald-200 hover:border-emerald-400'
              : 'bg-emerald-50/60 border-emerald-300 text-[#064E3B] hover:border-[#064E3B] hover:bg-emerald-50';
            chipClass = isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-[#064E3B] border-emerald-300';
          }

          card.className = 'absolute top-1 bottom-1 z-10 select-none cursor-pointer rounded-sm border transition-all duration-120 group ' + theme;
          card.onclick = () => openInspectionModal(evt);
          card.title = evt.subject + ' [' + evt.startTime + ' - ' + evt.endTime + ']';

          let html = '';
          // 1. Aviation Amber Exam Banner
          if (isExam && !isCancelled) {
            html += '<div class="-mx-2 -mt-1.5 px-2 py-0.5 mb-1 flex items-center justify-between text-[9px] font-bold font-mono tracking-wider uppercase shrink-0 border-b ' + 
              (isDark ? 'bg-[#B45309] text-amber-50 border-amber-600/50' : 'bg-[#D97706] text-white border-amber-700') + '">';
            html += '<span class="flex items-center gap-1"><span>📝</span> EXAM / CT</span>';
            html += '<span class="text-[8px] font-mono truncate ml-1 opacity-95">' + (evt.marks || 'ASSESSMENT') + '</span>';
            html += '</div>';
          }

          // 2. Header tags
          html += '<div class="flex items-center justify-between gap-1 text-[10px] shrink-0 leading-none">';
          html += '<div class="flex items-center gap-1 truncate min-w-0 flex-wrap">';
          if (!isExam) {
            html += '<span class="text-[9px] font-semibold tracking-wide uppercase px-1 py-0.2 rounded-sm border leading-none shrink-0 ' + chipClass + '">' + (isLab ? 'LAB' : 'LECTURE') + '</span>';
          }
          if (alternating.groupTag && !isCancelled) {
            html += '<span class="badge-group">' + alternating.groupTag + '</span>';
          }
          if (alternating.hasReportDue && !isCancelled) {
            html += '<span class="inline-flex items-center gap-0.5 text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-sm border uppercase tracking-wider shrink-0 leading-none ' + 
              (isDark ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-[#064E3B] border-emerald-300') + '">📄 REPORT DUE</span>';
          }
          if (isCancelled) {
            html += '<span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-sm shrink-0 tracking-wide border ' + 
              (isDark ? 'bg-slate-800 text-slate-300 border-slate-600' : 'bg-slate-200 text-slate-700 border-slate-400') + '">CANCELLED</span>';
          }
          html += '</div>';
          html += '<span class="text-[9px] font-mono font-medium shrink-0 tabular-nums ' + (isExam ? (isDark ? 'text-amber-300/80' : 'text-amber-800') : (isDark ? 'text-slate-400' : 'text-slate-500')) + '">' + formatDuration(geom.duration) + '</span>';
          html += '</div>';

          // 3. Middle Subject & Room
          html += '<div class="my-auto py-0.5 min-w-0">';
          html += '<div class="text-[11px] sm:text-xs font-bold leading-snug truncate tracking-tight ' + 
            (isCancelled ? 'line-through text-slate-500' : isExam ? (isDark ? 'text-amber-100' : 'text-[#78350F]') : (isDark ? 'text-white' : 'text-[#0F172A]')) + '">' + evt.subject + '</div>';
          if (!isCompact) {
            html += '<div class="text-[10px] truncate flex items-center gap-1.5 mt-0.5 font-mono ' + 
              (isExam ? (isDark ? 'text-amber-200/80' : 'text-amber-900/80') : (isDark ? 'text-slate-300' : 'text-slate-600')) + ' ' + (isCancelled ? 'line-through opacity-70' : '') + '">';
            html += '<span class="truncate font-medium ' + (isExam ? (isDark ? 'text-amber-200' : 'text-amber-800') : (isDark ? 'text-slate-200' : 'text-slate-700')) + '">Room ' + (evt.room || 'TBA') + '</span>';
            html += '<span class="' + (isExam ? 'text-amber-500/50' : (isDark ? 'text-slate-600' : 'text-slate-300')) + '">/</span>';
            html += '<span class="truncate ' + (isExam ? (isDark ? 'text-amber-200' : 'text-amber-800') : (isDark ? 'text-slate-300' : 'text-slate-700')) + '">' + evt.teacher.split('(')[0].trim() + '</span>';
            html += '</div>';
          }
          html += '</div>';

          // 4. Footer time
          html += '<div class="flex items-center justify-between text-[9px] sm:text-[10px] shrink-0 pt-0.5 font-mono tabular-nums leading-none border-t ' + 
            (isExam ? (isDark ? 'border-amber-700/50 text-amber-200' : 'border-amber-200 text-amber-900') : (isDark ? 'border-[#334155] text-slate-300' : 'border-slate-200 text-slate-600')) + ' ' + (isCancelled ? 'line-through opacity-70' : '') + '">';
          html += '<span class="font-semibold">🕒 ' + evt.startTime + ' – ' + evt.endTime + '</span>';
          if (isExam && !isCancelled) {
            html += '<span class="text-[8px] font-bold px-1 py-0.2 rounded-sm border uppercase tracking-wider ' + 
              (isDark ? 'bg-amber-950/80 text-amber-300 border-amber-700' : 'bg-amber-100 text-[#B45309] border-amber-300') + '">REQ</span>';
          }
          html += '</div>';

          card.innerHTML = html;
          trackRow.appendChild(card);
        });

        tracksContainer.appendChild(trackRow);
      });
    }

    // 6. SINGLE-TABLE CSV DATA SYNC PIPELINE
    function updateSyncStatus(status, text) {
      const el = document.getElementById('sync-status-indicator');
      const icon = document.getElementById('sync-icon');
      const isDark = currentTheme === 'dark';
      if (!el) return;
      el.textContent = text;
      if (status === 'error') {
        el.className = 'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm uppercase tracking-wide border ' + 
          (isDark ? 'bg-rose-950/70 text-rose-300 border-rose-800' : 'bg-rose-50 text-rose-700 border-rose-200');
        if (icon) icon.classList.remove('animate-spin');
      } else if (status === 'success') {
        el.className = 'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm uppercase tracking-wide border ' + 
          (isDark ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-[#064E3B] border-emerald-200');
        if (icon) icon.classList.remove('animate-spin');
      } else if (status === 'syncing') {
        el.className = 'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm uppercase tracking-wide border ' + 
          (isDark ? 'bg-slate-800 text-slate-200 border-slate-600' : 'bg-slate-100 text-slate-800 border-slate-300');
        if (icon) icon.classList.add('animate-spin');
      } else {
        el.className = 'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm uppercase tracking-wide border ' + 
          (isDark ? 'bg-[#131D31] text-slate-300 border-[#334155]' : 'bg-white text-slate-600 border-[#E2E8F0]');
        if (icon) icon.classList.remove('animate-spin');
      }
    }

    async function fetchAndSync(targetUrl) {
      const inputEl = document.getElementById('testing-csv-input');
      const url = (targetUrl !== undefined ? targetUrl : (inputEl ? inputEl.value : '')).trim();
      if (!url) {
        updateSyncStatus('error', 'EMPTY_URL');
        return;
      }

      updateSyncStatus('syncing', 'FETCHING_STREAM...');
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP_' + res.status);
        const text = await res.text();
        const rows = text.split(/\\r?\\n/).map(l => l.split(',').map(c => c.replace(/^"(.*)"$/, '$1').trim()));
        if (rows.length < 2) throw new Error('NO_VALID_DATA_ROWS');

        const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
        const dayIdx = headers.findIndex(h => h.includes('day'));
        const startIdx = headers.findIndex(h => h.includes('start'));
        const endIdx = headers.findIndex(h => h.includes('end'));
        const subIdx = headers.findIndex(h => h.includes('sub') || h.includes('course'));
        const teaIdx = headers.findIndex(h => h.includes('teach') || h.includes('proctor'));
        const rmIdx = headers.findIndex(h => h.includes('room'));
        const typeIdx = headers.findIndex(h => h.includes('type'));
        const statIdx = headers.findIndex(h => h.includes('stat'));
        const sylIdx = headers.findIndex(h => h.includes('syl'));
        const mkIdx = headers.findIndex(h => h.includes('mark'));

        const parsed = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (r.length < 3 || !r[dayIdx]) continue;
          const rawType = (r[typeIdx] || '').trim();
          const lowerType = rawType.toLowerCase();
          let finalType = 'Lecture';
          if (lowerType.includes('exam') || lowerType.includes('test')) {
            finalType = 'Exam';
          } else if (lowerType.includes('lab') || lowerType.includes('sessional')) {
            finalType = rawType || 'Lab'; // Never falls back to 'Lecture'
          } else {
            finalType = 'Lecture';
          }

          parsed.push({
            day: r[dayIdx],
            startTime: r[startIdx] || '08:00',
            endTime: r[endIdx] || '08:50',
            subject: r[subIdx] || 'Course',
            teacher: r[teaIdx] || '',
            room: r[rmIdx] || '',
            type: finalType,
            status: r[statIdx] || 'Normal',
            syllabus: r[sylIdx] || '',
            marks: r[mkIdx] || ''
          });
        }

        if (parsed.length === 0) throw new Error('ZERO_VALID_ROWS');

        currentEvents = parsed;
        renderAtAGlance();
        renderAcademicPeriodGrid();
        processDifferentialLogs(parsed);
        updateSyncStatus('success', 'SYNC_OK: ' + parsed.length + '_CLASSES');
      } catch (err) {
        console.warn('Sync failed:', err);
        updateSyncStatus('error', 'FAILED: ' + (err.message || 'CORS_ERROR'));
      }
    }

    function resetToBaselineDefault() {
      currentEvents = [...baselineTestData];
      const inputEl = document.getElementById('testing-csv-input');
      if (inputEl) inputEl.value = '';
      renderAtAGlance();
      renderAcademicPeriodGrid();
      processDifferentialLogs(baselineTestData);
      updateSyncStatus('idle', 'BASELINE_RESTORED');
    }

    // 7. INSPECTION MODAL
    function openInspectionModal(evt) {
      const isDark = currentTheme === 'dark';
      const weekInfo = getCalendarWeekInfo();
      const modal = document.getElementById('inspection-modal');
      const kicker = document.getElementById('modal-type-kicker');
      const title = document.getElementById('modal-subject-title');
      const altCallout = document.getElementById('modal-alternating-callout');
      const banner = document.getElementById('modal-cancellation-banner');
      const timeWindow = document.getElementById('modal-time-window');
      const roomNumber = document.getElementById('modal-room-number');
      const teacherName = document.getElementById('modal-teacher-name');
      const examDetails = document.getElementById('modal-exam-details');
      const marksEl = document.getElementById('modal-marks');
      const syllabusList = document.getElementById('modal-syllabus-list');

      const alternating = parseAlternatingSchedule(evt.type, evt.subject, evt.syllabus);
      const isExam = alternating.category === 'EXAM';
      const isLab = alternating.category === 'LAB';
      const isCancelled = evt.status === 'Cancelled';

      const typeBadge = isExam
        ? (isDark ? 'bg-amber-950/80 text-amber-300 border-amber-700' : 'bg-amber-100 text-[#B45309] border-amber-300')
        : isLab
        ? (isDark ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-[#064E3B] border-emerald-300')
        : (isDark ? 'bg-slate-800 text-slate-200 border-[#334155]' : 'bg-slate-100 text-[#0F172A] border-slate-300');

      let kickerHtml = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-sm border uppercase tracking-wide ' + typeBadge + '">' + (isLab ? 'LAB' : isExam ? 'EXAM' : 'LECTURE') + '</span>';
      if (alternating.groupTag && !isCancelled) {
        kickerHtml += '<span class="badge-group">' + alternating.groupTag + '</span>';
      }
      kickerHtml += '<span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-sm uppercase border ' + (isDark ? 'text-slate-300 bg-slate-800 border-[#334155]' : 'text-slate-600 bg-slate-100 border border-slate-200') + '">📅 ' + evt.day + '</span>';
      if (isCancelled) {
        kickerHtml += '<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase border ' + (isDark ? 'bg-slate-800 text-slate-300 border-slate-600' : 'bg-slate-200 text-slate-700 border-slate-400') + '">CANCELLED</span>';
      }
      kicker.innerHTML = kickerHtml;

      title.textContent = evt.subject;
      title.className = 'text-lg sm:text-xl font-bold tracking-tight leading-tight mb-2 ' + (isCancelled ? 'line-through text-slate-500' : (isDark ? 'text-white' : 'text-[#0F172A]'));

      if (isCancelled) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }

      timeWindow.textContent = evt.startTime + ' – ' + evt.endTime;
      roomNumber.textContent = evt.room || 'GATE TBA';
      teacherName.textContent = evt.teacher || 'Not designated';

      // Prominent Lab Group Designation Card
      const groupBox = document.getElementById('modal-group-box');
      const groupChip = document.getElementById('modal-group-chip');
      const groupDesc = document.getElementById('modal-group-desc');
      const groupStatus = document.getElementById('modal-group-status');

      if (isLab || alternating.groupTag) {
        if (groupBox) {
          groupBox.classList.remove('hidden');
          groupBox.className = 'rounded-sm p-3 sm:col-span-2 border transition-colors ' + 
            (isDark ? 'bg-[#131D31] border-[#334155]' : 'bg-emerald-50/50 border-emerald-300');
          if (groupChip) {
            groupChip.textContent = alternating.groupTag || 'ALL GROUPS';
            groupChip.className = 'badge-group ' + (isDark ? 'bg-[#1E293B] text-emerald-300 border-emerald-600/70' : 'bg-emerald-100 text-[#064E3B] border-emerald-400');
          }
          if (groupDesc) {
            groupDesc.className = 'text-sm font-bold mt-1.5 font-mono ' + (isDark ? 'text-white' : 'text-[#0F172A]');
            groupDesc.textContent = alternating.groupTag === 'GRP A'
              ? 'Group A Only (Sessional Attendance)'
              : alternating.groupTag === 'GRP B'
              ? 'Group B Only (Sessional Attendance)'
              : alternating.groupTag === 'GRP A/B'
              ? 'Dual Group (Group A & Group B Dual Attendance)'
              : 'Full Batch Laboratory Sessional (Combined Attendance)';
          }
          if (groupStatus) {
            groupStatus.className = 'text-[11px] font-mono mt-0.5 ' + (isDark ? 'text-slate-400' : 'text-slate-600');
            groupStatus.textContent = alternating.groupTag
              ? '● Roster: Designated subgroup session in MSE departmental lab'
              : '● Roster: Combined laboratory session for all students';
          }
        }
      } else {
        if (groupBox) groupBox.classList.add('hidden');
      }

      if (isExam) {
        examDetails.classList.remove('hidden');
        marksEl.textContent = evt.marks || '20 MARKS (5% WEIGHT)';
        syllabusList.innerHTML = '';
        if (evt.syllabus) {
          evt.syllabus.split('\\n').forEach(line => {
            const clean = line.replace(/^[•\\-\\*]\\s*/, '').trim();
            if (clean) {
              const li = document.createElement('li');
              li.className = 'flex items-start gap-2';
              li.innerHTML = '<span class="text-amber-500 font-bold font-mono">•</span><span class="leading-relaxed">' + clean + '</span>';
              syllabusList.appendChild(li);
            }
          });
        } else {
          syllabusList.innerHTML = '<li class="text-slate-400 italic">No specific syllabus topics appended</li>';
        }
      } else {
        examDetails.classList.add('hidden');
      }

      modal.classList.remove('hidden');
    }

    function closeInspectionModal() { 
      document.getElementById('inspection-modal').classList.add('hidden'); 
    }

    function scrollToCurrentHour() {
      const track = document.getElementById('timeline-scroll-container');
      if (track) {
        track.scrollTo({ left: 240, behavior: 'smooth' });
      }
    }

    setInterval(() => {
      const now = new Date();
      const el = document.getElementById('digital-clock');
      if (el) {
        el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' LOC';
      }
    }, 1000);

    window.addEventListener('DOMContentLoaded', () => {
      const weekInfo = getCalendarWeekInfo();
      const weekBadge = document.getElementById('week-cycle-badge');
      const legendWeek = document.getElementById('legend-week-info');
      if (weekBadge) weekBadge.textContent = weekInfo.cycleLabel;
      if (legendWeek) legendWeek.textContent = weekInfo.cycleLabel;

      initTheme();
      renderAtAGlance();
      renderAcademicPeriodGrid();

      // Initialize differential logs
      let existingLogs = [];
      try {
        existingLogs = JSON.parse(localStorage.getItem(DISPATCH_LOGS_KEY) || '[]');
      } catch (e) {}
      if (existingLogs.length > 0) {
        renderDispatchLogs(existingLogs);
      } else {
        processDifferentialLogs(baselineTestData);
      }

      const inputEl = document.getElementById('testing-csv-input');
      if (inputEl) {
        inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            fetchAndSync();
          }
        });
        if (DATABASE_ENDPOINT && DATABASE_ENDPOINT.trim()) {
          inputEl.value = DATABASE_ENDPOINT.trim();
        }
      }

      if (DATABASE_ENDPOINT && DATABASE_ENDPOINT.trim()) {
        fetchAndSync(DATABASE_ENDPOINT);
      }
    });
  </script>
</body>
</html>`;
}
