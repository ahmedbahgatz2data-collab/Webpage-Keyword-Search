import React, { useState } from 'react';
import { PageResult, Snippet } from '../types';
import {
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  FileText,
  AlertCircle,
  Clock,
  Hash,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  Link2,
  X,
  FileQuestion,
  Trash2
} from 'lucide-react';

interface SearchResultsProps {
  results: PageResult[];
  searchTimeMs: number;
  keywords: string[];
  onViewFullText: (page: PageResult) => void;
  onAiAnalyze: (page: PageResult) => void;
  onToggleHideResults?: () => void;
  onClearResults?: () => void;
  theme?: 'dark' | 'light';
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchTimeMs,
  keywords,
  onViewFullText,
  onAiAnalyze,
  onToggleHideResults,
  onClearResults,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [filterKeyword, setFilterKeyword] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'matches' | 'url' | 'time' | 'words'>('matches');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [expandedPageUrls, setExpandedPageUrls] = useState<Record<string, boolean>>({});

  // Stats Calculations
  const totalPages = results.length;
  const totalMatches = results.reduce((acc, p) => acc + (p.totalMatches || 0), 0);
  const totalWords = results.reduce((acc, p) => acc + (p.wordCount || 0), 0);

  // Collect all keywords searched across pages
  const allSearchedKeywords = Array.from(
    new Set(
      results.flatMap(p => p.targetKeywords && p.targetKeywords.length > 0 ? p.targetKeywords : keywords)
    )
  );

  // Toggle snippet expansion per page
  const togglePageExpand = (url: string) => {
    setExpandedPageUrls(prev => ({
      ...prev,
      [url]: !prev[url]
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    results.forEach(p => (allExpanded[p.url] = true));
    setExpandedPageUrls(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    results.forEach(p => (allCollapsed[p.url] = false));
    setExpandedPageUrls(allCollapsed);
  };

  // Filter & Sort Logic
  const filteredResults = results.filter(page => {
    if (filterStatus === 'matches' && page.totalMatches === 0) return false;
    if (filterStatus === 'no-matches' && (page.totalMatches > 0 || page.status !== 'success')) return false;
    if (filterStatus === 'error' && page.status !== 'error') return false;

    if (filterKeyword !== 'all') {
      const isTarget = (page.targetKeywords || keywords).includes(filterKeyword);
      if (!isTarget) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'matches') return b.totalMatches - a.totalMatches;
    if (sortBy === 'time') return a.fetchTimeMs - b.fetchTimeMs;
    if (sortBy === 'words') return b.wordCount - a.wordCount;
    if (sortBy === 'url') return a.url.localeCompare(b.url);
    return 0;
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  // Render snippet with highlighted keyword
  const renderHighlightedSnippet = (snippet: Snippet) => {
    const text = snippet.text;
    const kw = snippet.keyword;
    if (!kw) return <span>{text}</span>;

    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedKw})`, 'gi'));

    return (
      <span className="leading-relaxed">
        {parts.map((part, i) => {
          if (part.toLowerCase() === kw.toLowerCase()) {
            return (
              <mark
                key={i}
                className="bg-amber-500/20 text-amber-300 font-semibold px-1 py-0.5 rounded border border-amber-500/40"
              >
                {part}
              </mark>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bento Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 font-mono">
        <div className={isDark ? "bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 shadow-sm flex items-center gap-3.5 hover:border-zinc-700 transition-colors" : "bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5 hover:border-slate-300 transition-colors"}>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <div className={isDark ? "text-2xl font-bold text-zinc-100" : "text-2xl font-bold text-slate-900"}>{totalPages}</div>
            <div className={isDark ? "text-xs text-zinc-400 font-medium" : "text-xs text-slate-500 font-medium"}>Pages Searched</div>
          </div>
        </div>

        <div className={isDark ? "bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 shadow-sm flex items-center gap-3.5 hover:border-zinc-700 transition-colors" : "bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5 hover:border-slate-300 transition-colors"}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-500">{totalMatches}</div>
            <div className={isDark ? "text-xs text-zinc-400 font-medium" : "text-xs text-slate-500 font-medium"}>Total Occurrences</div>
          </div>
        </div>

        <div className={isDark ? "bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 shadow-sm flex items-center gap-3.5 hover:border-zinc-700 transition-colors" : "bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5 hover:border-slate-300 transition-colors"}>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className={isDark ? "text-2xl font-bold text-zinc-100" : "text-2xl font-bold text-slate-900"}>{totalWords.toLocaleString()}</div>
            <div className={isDark ? "text-xs text-zinc-400 font-medium" : "text-xs text-slate-500 font-medium"}>Words Extracted</div>
          </div>
        </div>

        <div className={isDark ? "bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 shadow-sm flex items-center gap-3.5 hover:border-zinc-700 transition-colors" : "bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5 hover:border-slate-300 transition-colors"}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className={isDark ? "text-2xl font-bold text-zinc-100" : "text-2xl font-bold text-slate-900"}>{(searchTimeMs / 1000).toFixed(2)}s</div>
            <div className={isDark ? "text-xs text-zinc-400 font-medium" : "text-xs text-slate-500 font-medium"}>Scan Duration</div>
          </div>
        </div>
      </div>

      {/* Control Bar & Filter Bar */}
      <div className={isDark ? "bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs font-mono" : "bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-mono"}>
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className={isDark ? "flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800" : "flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200"}>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table Grid Report</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Bento Cards</span>
            </button>
          </div>

          {/* Keyword Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className={isDark ? "w-3.5 h-3.5 text-zinc-500" : "w-3.5 h-3.5 text-slate-400"} />
            <span className={isDark ? "font-medium text-zinc-400" : "font-medium text-slate-600"}>Keyword:</span>
            <select
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              className={
                isDark
                  ? "rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-200 font-medium outline-none focus:border-blue-500"
                  : "rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-slate-800 font-medium outline-none focus:border-blue-500"
              }
            >
              <option value="all">All Searched Keywords ({allSearchedKeywords.length})</option>
              {allSearchedKeywords.map((kw) => (
                <option key={kw} value={kw}>
                  {kw}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className={isDark ? "font-medium text-zinc-400" : "font-medium text-slate-600"}>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={
                isDark
                  ? "rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-200 font-medium outline-none focus:border-blue-500"
                  : "rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-slate-800 font-medium outline-none focus:border-blue-500"
              }
            >
              <option value="all">All Results ({results.length})</option>
              <option value="matches">Has Matches</option>
              <option value="no-matches">No Matches</option>
              <option value="error">Errors</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {onClearResults && (
            <button
              onClick={onClearResults}
              className={
                isDark
                  ? "px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-all flex items-center gap-1.5"
                  : "px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-500/40 transition-all flex items-center gap-1.5"
              }
              title="Clear all search results"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Clear Results</span>
            </button>
          )}

          {onToggleHideResults && (
            <button
              onClick={onToggleHideResults}
              className={
                isDark
                  ? "px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-all flex items-center gap-1.5"
                  : "px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-500/40 transition-all flex items-center gap-1.5"
              }
              title="Hide Results View"
            >
              <EyeOff className="w-3.5 h-3.5 text-rose-500" />
              <span>Hide</span>
            </button>
          )}

          <div className={isDark ? "flex items-center gap-1.5 text-zinc-400" : "flex items-center gap-1.5 text-slate-600"}>
            <button
              onClick={expandAll}
              className={isDark ? "px-2 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" : "px-2 py-1 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"}
            >
              Expand Contexts
            </button>
            <span>/</span>
            <button
              onClick={collapseAll}
              className={isDark ? "px-2 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors" : "px-2 py-1 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"}
            >
              Collapse
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className={isDark ? "w-3.5 h-3.5 text-zinc-500" : "w-3.5 h-3.5 text-slate-400"} />
            <span className={isDark ? "font-medium text-zinc-400" : "font-medium text-slate-600"}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={
                isDark
                  ? "rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-200 font-medium outline-none focus:border-blue-500"
                  : "rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-slate-800 font-medium outline-none focus:border-blue-500"
              }
            >
              <option value="matches">Matches (High → Low)</option>
              <option value="time">Fastest Response Time</option>
              <option value="words">Word Count</option>
              <option value="url">URL Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Results Table View */}
      {viewMode === 'table' ? (
        <div className={isDark ? "bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-md overflow-hidden" : "bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"}>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={isDark ? "bg-zinc-950/95 text-zinc-400 border-b border-zinc-800 font-mono tracking-wider uppercase sticky top-0 z-10 backdrop-blur-md" : "bg-slate-100/95 text-slate-600 border-b border-slate-200 font-mono tracking-wider uppercase sticky top-0 z-10 backdrop-blur-md"}>
                  <th className="p-3.5 pl-4 font-semibold w-10 text-center">#</th>
                  <th className="p-3.5 font-semibold min-w-[180px]">URL</th>
                  <th className="p-3.5 font-semibold min-w-[150px]">Title</th>
                  <th className="p-3.5 font-semibold w-24">Status</th>
                  <th className="p-3.5 font-semibold min-w-[160px]">Searched Keywords</th>
                  <th className="p-3.5 font-semibold w-36">Status Found or Not Found</th>
                  <th className="p-3.5 font-semibold w-24 text-center">Total Matches</th>
                  <th className="p-3.5 font-semibold w-24 text-right">Word Count</th>
                  <th className="p-3.5 font-semibold w-28 text-right">Fetch Time (ms)</th>
                  <th className="p-3.5 pr-4 font-semibold min-w-[280px]">Context Snippets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200 font-sans">
                {(() => {
                  // Build flat list of rows (1 row per keyword/snippet per URL)
                  const tableRows: {
                    id: string;
                    page: PageResult;
                    keyword: string;
                    isFound: boolean;
                    matchCount: number;
                    snippet?: Snippet | null;
                    snippetIndex?: number;
                    snippetTotal?: number;
                  }[] = [];

                  filteredResults.forEach((page) => {
                    const targetKws = page.targetKeywords && page.targetKeywords.length > 0 ? page.targetKeywords : keywords;
                    
                    const kwsToInclude = filterKeyword === 'all'
                      ? targetKws
                      : targetKws.filter(k => k.toLowerCase() === filterKeyword.toLowerCase());

                    if (kwsToInclude.length === 0 && targetKws.length === 0) {
                      tableRows.push({
                        id: `${page.url}-none`,
                        page,
                        keyword: 'N/A',
                        isFound: false,
                        matchCount: 0,
                        snippet: null
                      });
                    } else {
                      kwsToInclude.forEach((kw) => {
                        const km = page.keywordMatches?.[kw];
                        const matchCount = km?.count || 0;
                        const isFound = matchCount > 0;
                        const snippets = km?.snippets || [];

                        if (filterStatus === 'matches' && !isFound) return;
                        if (filterStatus === 'no-matches' && isFound) return;
                        if (filterStatus === 'error' && page.status !== 'error') return;

                        if (snippets.length > 0) {
                          snippets.forEach((snippet, sIdx) => {
                            tableRows.push({
                              id: `${page.url}-${kw}-s${sIdx}`,
                              page,
                              keyword: kw,
                              isFound,
                              matchCount,
                              snippet,
                              snippetIndex: sIdx + 1,
                              snippetTotal: snippets.length
                            });
                          });
                        } else {
                          tableRows.push({
                            id: `${page.url}-${kw}-nosnippet`,
                            page,
                            keyword: kw,
                            isFound,
                            matchCount,
                            snippet: null
                          });
                        }
                      });
                    }
                  });

                  if (tableRows.length === 0) {
                    return (
                      <tr>
                        <td colSpan={10} className="p-12 text-center text-zinc-500 font-mono">
                          <Search className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                          <p className="font-semibold text-zinc-300">No keyword rows matching active filters</p>
                        </td>
                      </tr>
                    );
                  }

                  let currentUrl = '';
                  let urlBgToggle = false;

                  return tableRows.map((row, idx) => {
                    const { page, keyword, isFound, matchCount, snippet } = row;
                    const hasError = page.status === 'error';
                    const isNewUrl = page.url !== currentUrl;

                    if (isNewUrl) {
                      currentUrl = page.url;
                      urlBgToggle = !urlBgToggle;
                    }

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-blue-500/10 transition-colors ${
                          isDark
                            ? urlBgToggle ? 'bg-zinc-900/60' : 'bg-zinc-950/40'
                            : urlBgToggle ? 'bg-slate-50' : 'bg-white'
                        } ${isNewUrl && idx > 0 ? (isDark ? 'border-t-2 border-zinc-800' : 'border-t-2 border-slate-300') : (isDark ? 'border-t border-zinc-800/40' : 'border-t border-slate-200/60')}`}
                      >
                        {/* Index */}
                        <td className={`p-3.5 pl-4 text-center font-mono text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                          {idx + 1}
                        </td>

                        {/* 1. URL */}
                        <td className="p-3.5 max-w-[200px]">
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1.5 font-mono text-[11px] truncate font-medium"
                            title={page.url}
                          >
                            <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{page.url}</span>
                          </a>
                        </td>

                        {/* 2. Title */}
                        <td className="p-3.5 max-w-[160px]">
                          <div className={`font-medium truncate ${isDark ? 'text-zinc-100' : 'text-slate-800'}`} title={page.title || 'Untitled Page'}>
                            {page.title || <span className={isDark ? 'text-zinc-500 italic' : 'text-slate-400 italic'}>Untitled</span>}
                          </div>
                        </td>

                        {/* 3. Status */}
                        <td className="p-3.5 font-mono">
                          {hasError ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              <XCircle className="w-3 h-3" />
                              Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              200 OK
                            </span>
                          )}
                        </td>

                        {/* 4. Searched Keywords */}
                        <td className="p-3.5 font-mono">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                              isFound
                                ? isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-amber-100 text-amber-800 border border-amber-300'
                                : isDark ? 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/60' : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            {keyword}
                          </span>
                        </td>

                        {/* 5. Status Found or Not Found */}
                        <td className="p-3.5 font-mono">
                          {hasError ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              Error
                            </span>
                          ) : isFound ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Found
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              Not found
                            </span>
                          )}
                        </td>

                        {/* 6. Total Matches */}
                        <td className="p-3.5 text-center font-mono font-bold">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-xs ${
                              matchCount > 0
                                ? isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-300'
                                : isDark ? 'text-zinc-500' : 'text-slate-400'
                            }`}
                          >
                            {matchCount}
                          </span>
                        </td>

                        {/* 7. Word Count */}
                        <td className={`p-3.5 text-right font-mono text-[11px] ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                          {page.wordCount ? page.wordCount.toLocaleString() : '0'}
                        </td>

                        {/* 8. Fetch Time (ms) */}
                        <td className={`p-3.5 text-right font-mono text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                          {page.fetchTimeMs} ms
                        </td>

                        {/* 9. Context Snippets */}
                        <td className="p-3.5 pr-4 max-w-[320px]">
                          {hasError ? (
                            <span className="text-rose-500/80 font-mono text-[11px] italic truncate block">
                              {page.errorMessage}
                            </span>
                          ) : snippet ? (
                            <div className="space-y-1">
                              <div className={`text-[11px] font-mono p-2 rounded-lg border leading-tight ${
                                isDark
                                  ? 'text-zinc-300 bg-zinc-950/80 border-zinc-800/80'
                                  : 'text-slate-800 bg-slate-50 border-slate-200'
                              }`}>
                                {renderHighlightedSnippet(snippet)}
                              </div>
                              {row.snippetTotal && row.snippetTotal > 1 && (
                                <div className={`text-[10px] font-mono italic ${isDark ? 'text-amber-400/70' : 'text-amber-700'}`}>
                                  Snippet #{row.snippetIndex} of {row.snippetTotal}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className={`font-mono text-[11px] italic ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Bento Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[650px] overflow-y-auto pr-1">
          {filteredResults.map((page) => {
            const isExpanded = expandedPageUrls[page.url] !== false;
            const hasError = page.status === 'error';

            const targetKws = page.targetKeywords && page.targetKeywords.length > 0 ? page.targetKeywords : keywords;
            const foundKws = page.foundKeywords || targetKws.filter(kw => (page.keywordMatches?.[kw]?.count || 0) > 0);
            const notFoundKws = page.notFoundKeywords || targetKws.filter(kw => !page.keywordMatches?.[kw] || page.keywordMatches[kw].count === 0);

            const allSnippets: Snippet[] = (Object.values(page.keywordMatches || {}) as any[])
              .flatMap(km => km.snippets || []);

            return (
              <div
                key={page.url}
                className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  hasError
                    ? isDark ? 'border-rose-500/30 bg-rose-950/10' : 'border-rose-300 bg-rose-50'
                    : page.totalMatches > 0
                    ? isDark ? 'bg-zinc-900/90 border-zinc-800 hover:border-blue-500/50 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-400 shadow-xs'
                    : isDark ? 'bg-zinc-900/90 border-zinc-800/60 opacity-90' : 'bg-slate-50 border-slate-200 opacity-90'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className={`p-4 sm:p-5 space-y-3 border-b ${isDark ? 'border-zinc-800/80' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                              hasError
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                : page.totalMatches > 0
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-200 text-slate-600 border-slate-300'
                            }`}
                          >
                            {hasError ? 'Failed' : `${page.totalMatches} Matches (${foundKws.length}/${targetKws.length} Found)`}
                          </span>

                          <span className={`text-xs font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            {page.fetchTimeMs}ms
                          </span>
                        </div>

                        <h3 className={`text-base font-semibold line-clamp-1 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                          {page.title || page.url}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!hasError && (
                          <button
                            onClick={() => onAiAnalyze(page)}
                            className="p-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-500 hover:bg-indigo-600/30 border border-indigo-500/30 transition-all"
                            title="AI Analysis"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => togglePageExpand(page.url)}
                          className={isDark ? "p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors" : "p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <a
                      href={page.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1 font-mono text-xs line-clamp-1"
                    >
                      <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                      {page.url}
                    </a>
                  </div>

                  {/* Keywords Breakdown Row */}
                  <div className={`px-4 py-2.5 border-b flex flex-wrap gap-1.5 text-xs font-mono ${
                    isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {foundKws.map(kw => (
                      <span key={kw} className={`px-2 py-0.5 rounded text-[10px] ${
                        isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        ✓ {kw} ({page.keywordMatches?.[kw]?.count})
                      </span>
                    ))}
                    {notFoundKws.map(kw => (
                      <span key={kw} className={`px-2 py-0.5 rounded text-[10px] line-through ${
                        isDark ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 'bg-rose-100 text-rose-700 border border-rose-300'
                      }`}>
                        ✗ {kw} (Not Found)
                      </span>
                    ))}
                  </div>

                  {/* Context Snippets */}
                  {isExpanded && !hasError && (
                    <div className="p-4 space-y-3 font-mono">
                      <div className={`flex items-center justify-between text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                        <span>Context Snippets ({allSnippets.length})</span>
                        <button
                          onClick={() => onViewFullText(page)}
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View Text
                        </button>
                      </div>

                      {allSnippets.length === 0 ? (
                        <p className={`text-xs italic p-3 rounded-xl border ${
                          isDark ? 'text-zinc-500 bg-zinc-950 border-zinc-800' : 'text-slate-400 bg-slate-50 border-slate-200'
                        }`}>
                          No mapped keywords detected on page.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {allSnippets.slice(0, 4).map((snippet, idx) => (
                            <div
                              key={idx}
                              className={`rounded-xl p-2.5 border text-xs ${
                                isDark
                                  ? 'bg-zinc-950/80 border-zinc-800 text-zinc-300'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <span className={`inline-block px-1.5 py-0.5 mr-1.5 rounded text-[10px] font-sans font-bold ${
                                isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {snippet.keyword}
                              </span>
                              {renderHighlightedSnippet(snippet)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
