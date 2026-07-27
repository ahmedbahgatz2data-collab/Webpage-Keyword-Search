import React, { useState } from 'react';
import { PageResult } from '../types';
import { X, Copy, Check, Search, FileText, ExternalLink } from 'lucide-react';

interface PageTextModalProps {
  page: PageResult | null;
  onClose: () => void;
  keywords: string[];
  theme?: 'dark' | 'light';
}

export const PageTextModal: React.FC<PageTextModalProps> = ({
  page,
  onClose,
  keywords,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!page) return null;

  const handleCopyFullText = () => {
    if (page.textContent) {
      navigator.clipboard.writeText(page.textContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const highlightText = (text: string) => {
    const activeKeywords = keywords.filter(k => k.trim().length > 0);
    if (filterQuery.trim()) {
      activeKeywords.push(filterQuery.trim());
    }

    if (activeKeywords.length === 0) return text;

    try {
      const escapedPatterns = activeKeywords
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

      const regex = new RegExp(`(${escapedPatterns})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, index) => {
        const isMatch = activeKeywords.some(
          k => k.toLowerCase() === part.toLowerCase()
        );

        if (isMatch) {
          return (
            <mark
              key={index}
              className="bg-amber-500/20 text-amber-300 font-semibold px-0.5 rounded border border-amber-500/40"
            >
              {part}
            </mark>
          );
        }
        return part;
      });
    } catch {
      return text;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-start justify-between ${
          isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500 shrink-0" />
              <h3 className={`text-base font-bold line-clamp-1 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                {page.title}
              </h3>
            </div>
            <a
              href={page.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-mono line-clamp-1"
            >
              {page.url}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>

          <button
            onClick={onClose}
            className={isDark ? "p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors" : "p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Filter Toolbar */}
        <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
          isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-100/80 border-slate-200'
        }`}>
          <div className="relative flex-1 max-w-sm">
            <Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Highlight text..."
              className={isDark ? "w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500" : "w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"}
            />
          </div>

          <div className={isDark ? "flex items-center gap-3 text-zinc-400" : "flex items-center gap-3 text-slate-600"}>
            <span>Words: <strong className={isDark ? "text-zinc-200" : "text-slate-800"}>{page.wordCount.toLocaleString()}</strong></span>
            <span>Matches: <strong className="text-amber-500">{page.totalMatches}</strong></span>

            <button
              onClick={handleCopyFullText}
              className={isDark ? "px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium transition-colors flex items-center gap-1.5" : "px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 font-medium transition-colors flex items-center gap-1.5"}
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Text Content Inspector */}
        <div className={`p-5 overflow-y-auto flex-1 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
          isDark ? 'text-zinc-300 bg-zinc-950/40' : 'text-slate-700 bg-slate-50'
        }`}>
          {page.textContent ? (
            highlightText(page.textContent)
          ) : (
            <span className="text-zinc-500 italic">No extracted text available for this webpage.</span>
          )}
        </div>
      </div>
    </div>
  );
};
