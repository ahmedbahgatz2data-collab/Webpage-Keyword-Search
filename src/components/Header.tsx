import React from 'react';
import { History, Download, Globe2, Sun, Moon, ExternalLink } from 'lucide-react';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenExport: () => void;
  hasResults: boolean;
  historyCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenExport,
  hasResults,
  historyCount,
  theme,
  onToggleTheme
}) => {
  return (
    <header className={
      theme === 'dark'
        ? 'bg-zinc-950/90 border-b border-zinc-800/80 text-white sticky top-0 z-30 backdrop-blur-md transition-colors'
        : 'bg-white/90 border-b border-slate-200 text-slate-900 sticky top-0 z-30 backdrop-blur-md shadow-xs transition-colors'
    }>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
            <Globe2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className={
                theme === 'dark'
                  ? 'text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400'
                  : 'text-lg font-bold text-slate-900'
              }>
                Webpage Keyword Search Engine
              </h1>
              <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full">
                Bento Grid
              </span>
            </div>
            <p className={theme === 'dark' ? 'text-xs text-zinc-400 hidden sm:block font-mono' : 'text-xs text-slate-500 hidden sm:block font-mono'}>
              Scan URLs for custom keywords with context snippets & AI summaries
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className={
              theme === 'dark'
                ? 'p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-700/80 transition-all'
                : 'p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-amber-600 border border-slate-300 transition-all'
            }
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {hasResults && (
            <button
              onClick={onOpenExport}
              className={
                theme === 'dark'
                  ? 'flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 transition-all shadow-xs'
                  : 'flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all shadow-xs'
              }
              title="Export results"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Export Results</span>
            </button>
          )}

          <button
            onClick={onOpenHistory}
            className={
              theme === 'dark'
                ? 'relative flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 transition-all shadow-xs'
                : 'relative flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all shadow-xs'
            }
            title="Search history"
          >
            <History className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold bg-blue-600 text-white rounded-full font-mono">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
