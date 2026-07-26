import React from 'react';
import { SearchHistoryItem } from '../types';
import { X, History, Trash2, ArrowRight, Calendar, Globe } from 'lucide-react';

interface SearchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SearchHistoryItem[];
  onRestoreSearch: (item: SearchHistoryItem) => void;
  onClearHistory: () => void;
}

export const SearchHistoryModal: React.FC<SearchHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onRestoreSearch,
  onClearHistory
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-zinc-100 font-mono">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-zinc-100">Search History</h3>
          </div>

          <div className="flex items-center space-x-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2.5 py-1 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <History className="w-8 h-8 mx-auto opacity-40 text-zinc-600" />
              <p className="text-sm font-medium">No previous search queries</p>
              <p className="text-xs text-zinc-600">Searches automatically save here for quick access.</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="group bg-zinc-950 rounded-xl p-4 border border-zinc-800 hover:border-blue-500/50 transition-all flex items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="text-amber-400 font-semibold">{item.totalMatches} matches</span>
                  </div>

                  {/* URLs preview */}
                  <div className="text-xs text-zinc-300 flex items-center gap-1.5 line-clamp-1">
                    <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{item.urls.join(', ')}</span>
                  </div>

                  {/* Keywords tags */}
                  <div className="flex flex-wrap gap-1">
                    {item.keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onRestoreSearch(item);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-xs font-medium transition-colors flex items-center gap-1 shrink-0 self-center"
                >
                  <span>Re-run</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
