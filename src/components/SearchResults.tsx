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
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  Link2,
  X,
  FileQuestion
} from 'lucide-react';

interface SearchResultsProps {
  results: PageResult[];
  searchTimeMs: number;
  keywords: string[];
  onViewFullText: (page: PageResult) => void;
  onAiAnalyze: (page: PageResult) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchTimeMs,
  keywords,
  onViewFullText,
  onAiAnalyze
}) => {
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
        <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 shadow-sm flex items-center gap-3.5 hover:border-zinc-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{totalPages}</div>
            <div className="text-xs text-zinc-400 font-medium">Pages Searched</div>
          </div>
        </div>

        <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 shadow-sm flex items-center gap-3.5 hover:border-zinc-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{totalMatches}</div>
            <div className="text-xs text-zinc-400 font-medium">Total Occurrences</div>
          </div>
        </div>

        <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 shadow-sm flex items-center gap-3.5 hover:border-zinc-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{totalWords.toLocaleString()}</div>
            <div className="text-xs text-zinc-400 font-medium">Words Extracted</div>
          </div>
        </div>

        <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 shadow-sm flex items-center gap-3.5 hover:border-zinc-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{(searchTimeMs / 1000).toFixed(2)}s</div>
            <div className="text-xs text-zinc-400 font-medium">Scan Duration</div>
          </div>
        </div>
      </div>

      {/* Control Bar & Filter Bar */}
      <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
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
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Bento Cards</span>
            </button>
          </div>

          {/* Keyword Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-medium text-zinc-400">Keyword:</span>
            <select
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-200 font-medium outline-none focus:border-blue-500"
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
            <span className="font-medium text-zinc-400">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-200 font-medium outline-none focus:border-blue-500"
            >
              <option value="all">All Results ({results.length})</option>
              <option value="matches">Has Matches</option>
              <option value="no-matches">No Matches</option>
              <option value="error">Errors</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <button
              onClick={expandAll}
              className="px-2 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Expand Contexts
            </button>
            <span>/</span>
            <button
              onClick={collapseAll}
              className="px-2 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Collapse
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-medium text-zinc-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-200 font-medium outline-none focus:border-blue-500"
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
        <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950/90 text-zinc-400 border-b border-zinc-800 font-mono tracking-wider uppercase">
                  <th className="p-3.5 pl-4 font-semibold w-10 text-center">#</th>
                  <th className="p-3.5 font-semibold min-w-[180px]">URL</th>
                  <th className="p-3.5 font-semibold min-w-[160px]">Title</th>
                  <th className="p-3.5 font-semibold w-24">Status</th>
                  <th className="p-3.5 font-semibold min-w-[220px]">Keyword (Found & Not Found)</th>
                  <th className="p-3.5 font-semibold w-36">Status Found or Not</th>
                  <th className="p-3.5 font-semibold w-24 text-center">Total Matches</th>
                  <th className="p-3.5 font-semibold w-24 text-right">Word Count</th>
                  <th className="p-3.5 font-semibold w-24 text-right">Fetch Time</th>
                  <th className="p-3.5 pr-4 font-semibold min-w-[280px]">Context Snippet Excerpt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200 font-sans">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-zinc-500 font-mono">
                      <Search className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                      <p className="font-semibold text-zinc-300">No results matching active filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((page, index) => {
                    const isExpanded = expandedPageUrls[page.url] === true;
                    const hasError = page.status === 'error';

                    // Derive keywords for this specific URL
                    const targetKws = page.targetKeywords && page.targetKeywords.length > 0 ? page.targetKeywords : keywords;
                    const foundKws = page.foundKeywords || targetKws.filter(kw => (page.keywordMatches?.[kw]?.count || 0) > 0);
                    const notFoundKws = page.notFoundKeywords || targetKws.filter(kw => !page.keywordMatches?.[kw] || page.keywordMatches[kw].count === 0);

                    // Collect all snippets for this page
                    const allSnippets: Snippet[] = (Object.values(page.keywordMatches || {}) as any[])
                      .flatMap(km => km.snippets || []);

                    const topSnippet = allSnippets[0];

                    return (
                      <React.Fragment key={page.url}>
                        <tr className="hover:bg-zinc-800/40 transition-colors group">
                          {/* Index */}
                          <td className="p-3.5 pl-4 text-center font-mono text-zinc-500 text-[11px]">
                            {index + 1}
                          </td>

                          {/* 1. URL */}
                          <td className="p-3.5 max-w-[200px]">
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5 font-mono text-[11px] truncate"
                              title={page.url}
                            >
                              <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">{page.url}</span>
                            </a>
                          </td>

                          {/* 2. Title */}
                          <td className="p-3.5 max-w-[180px]">
                            <div className="font-medium text-zinc-100 truncate" title={page.title || 'Untitled Page'}>
                              {page.title || <span className="text-zinc-500 italic">Untitled</span>}
                            </div>
                            {page.metaDescription && (
                              <div className="text-[10px] text-zinc-400 truncate mt-0.5 font-mono">
                                {page.metaDescription}
                              </div>
                            )}
                          </td>

                          {/* 3. Status */}
                          <td className="p-3.5 font-mono">
                            {hasError ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <XCircle className="w-3 h-3" />
                                Error
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                200 OK
                              </span>
                            )}
                          </td>

                          {/* 4. Keyword (Found & Not Found clearly shown) */}
                          <td className="p-3.5 max-w-[240px]">
                            <div className="flex flex-wrap gap-1">
                              {/* Found Keywords */}
                              {foundKws.map(kw => {
                                const count = page.keywordMatches?.[kw]?.count || 0;
                                return (
                                  <span
                                    key={kw}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                    title={`Found ${count} times`}
                                  >
                                    <Check className="w-3 h-3 text-amber-400" />
                                    <span>{kw} ({count})</span>
                                  </span>
                                );
                              })}

                              {/* Not Found Keywords */}
                              {notFoundKws.map(kw => (
                                <span
                                  key={kw}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/10 text-rose-300/80 border border-rose-500/20 line-through opacity-80"
                                  title="Not Found on this webpage"
                                >
                                  <X className="w-3 h-3 text-rose-400" />
                                  <span>{kw} (Not Found)</span>
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* 5. Status Found or Not */}
                          <td className="p-3.5 font-mono">
                            {hasError ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Failed
                              </span>
                            ) : page.totalMatches > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                Found ({foundKws.length}/{targetKws.length} KWs)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                <FileQuestion className="w-3 h-3" />
                                Not Found (0/{targetKws.length})
                              </span>
                            )}
                          </td>

                          {/* 6. Total Matches */}
                          <td className="p-3.5 text-center font-mono font-bold">
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-xs ${
                                page.totalMatches > 0
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'text-zinc-500'
                              }`}
                            >
                              {page.totalMatches}
                            </span>
                          </td>

                          {/* 7. Word Count */}
                          <td className="p-3.5 text-right font-mono text-zinc-300 text-[11px]">
                            {page.wordCount ? page.wordCount.toLocaleString() : '0'}
                          </td>

                          {/* 8. Fetch Time (ms) */}
                          <td className="p-3.5 text-right font-mono text-zinc-400 text-[11px]">
                            {page.fetchTimeMs} ms
                          </td>

                          {/* 9. Context Snippet Excerpt & Actions */}
                          <td className="p-3.5 pr-4">
                            {hasError ? (
                              <span className="text-rose-400/80 font-mono text-[11px] italic truncate block max-w-[280px]">
                                {page.errorMessage}
                              </span>
                            ) : topSnippet ? (
                              <div className="space-y-1.5">
                                <div className="text-[11px] font-mono text-zinc-300 bg-zinc-950/80 p-2 rounded-lg border border-zinc-800/80 line-clamp-2 leading-tight">
                                  {renderHighlightedSnippet(topSnippet)}
                                </div>

                                <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                                  <button
                                    onClick={() => togglePageExpand(page.url)}
                                    className="text-blue-400 hover:text-blue-300 font-semibold hover:underline flex items-center gap-1"
                                  >
                                    <span>{isExpanded ? 'Hide Contexts' : `All Snippets (${allSnippets.length})`}</span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>

                                  <button
                                    onClick={() => onViewFullText(page)}
                                    className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                                    title="View full webpage text"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Full Text</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-zinc-500 font-mono text-[11px]">
                                <span className="italic">No keywords found</span>
                                <button
                                  onClick={() => onViewFullText(page)}
                                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Text</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Drawer showing full list of Context Snippets */}
                        {isExpanded && (
                          <tr className="bg-zinc-950/90 border-b border-zinc-800">
                            <td colSpan={10} className="p-4 sm:p-5">
                              <div className="space-y-3 max-w-5xl mx-auto">
                                <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800 font-mono">
                                  <div className="font-semibold text-zinc-300 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    <span>Full Context Snippets Breakdown</span>
                                    <span className="text-zinc-500">({allSnippets.length} occurrences matched)</span>
                                  </div>
                                  {!hasError && (
                                    <button
                                      onClick={() => onAiAnalyze(page)}
                                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-xs transition-all flex items-center gap-1"
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      AI Gemini Summary
                                    </button>
                                  )}
                                </div>

                                {/* Status of Keywords summary */}
                                <div className="flex flex-wrap gap-2 text-xs font-mono bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                  <span className="text-zinc-400 font-semibold">Searched Keywords:</span>
                                  {foundKws.map(kw => (
                                    <span key={kw} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      ✓ {kw} ({page.keywordMatches?.[kw]?.count} found)
                                    </span>
                                  ))}
                                  {notFoundKws.map(kw => (
                                    <span key={kw} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 line-through">
                                      ✗ {kw} (Not Found)
                                    </span>
                                  ))}
                                </div>

                                {hasError ? (
                                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2 font-mono">
                                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                    <span>Error details: {page.errorMessage}</span>
                                  </div>
                                ) : allSnippets.length === 0 ? (
                                  <p className="text-xs text-zinc-500 italic bg-zinc-900 p-3 rounded-xl border border-zinc-800 font-mono">
                                    No mapped keywords were detected on this webpage.
                                  </p>
                                ) : (
                                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                                    {allSnippets.map((snippet, idx) => {
                                      const snippetCopyKey = `${page.url}-${idx}`;
                                      const isCopied = copiedSnippetId === snippetCopyKey;

                                      return (
                                        <div
                                          key={snippet.id || idx}
                                          className="group relative bg-zinc-900/90 hover:bg-zinc-800/80 rounded-xl p-3 border border-zinc-800 hover:border-amber-500/40 transition-all text-xs font-mono text-zinc-200 flex items-start justify-between gap-3"
                                        >
                                          <div className="flex-1">
                                            <span className="inline-block px-1.5 py-0.5 mr-2 rounded text-[10px] font-sans font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                              {snippet.keyword}
                                            </span>
                                            {renderHighlightedSnippet(snippet)}
                                          </div>

                                          <button
                                            onClick={() => copyToClipboard(snippet.text, snippetCopyKey)}
                                            className="text-zinc-500 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition-all shrink-0"
                                            title="Copy snippet"
                                          >
                                            {isCopied ? (
                                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Bento Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className={`bg-zinc-900/90 rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  hasError
                    ? 'border-rose-500/30 bg-rose-950/10'
                    : page.totalMatches > 0
                    ? 'border-zinc-800 hover:border-blue-500/50 shadow-sm'
                    : 'border-zinc-800/60 opacity-90'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 space-y-3 border-b border-zinc-800/80">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                              hasError
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : page.totalMatches > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {hasError ? 'Failed' : `${page.totalMatches} Matches (${foundKws.length}/${targetKws.length} Found)`}
                          </span>

                          <span className="text-xs font-mono text-zinc-500">
                            {page.fetchTimeMs}ms
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-zinc-100 line-clamp-1">
                          {page.title || page.url}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!hasError && (
                          <button
                            onClick={() => onAiAnalyze(page)}
                            className="p-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition-all"
                            title="AI Analysis"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => togglePageExpand(page.url)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <a
                      href={page.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 font-mono text-xs line-clamp-1"
                    >
                      <ExternalLink className="w-3 h-3 text-blue-400 shrink-0" />
                      {page.url}
                    </a>
                  </div>

                  {/* Keywords Breakdown Row */}
                  <div className="px-4 py-2.5 bg-zinc-950/80 border-b border-zinc-800 flex flex-wrap gap-1.5 text-xs font-mono">
                    {foundKws.map(kw => (
                      <span key={kw} className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ✓ {kw} ({page.keywordMatches?.[kw]?.count})
                      </span>
                    ))}
                    {notFoundKws.map(kw => (
                      <span key={kw} className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 line-through">
                        ✗ {kw} (Not Found)
                      </span>
                    ))}
                  </div>

                  {/* Context Snippets */}
                  {isExpanded && !hasError && (
                    <div className="p-4 space-y-3 font-mono">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                        <span>Context Snippets ({allSnippets.length})</span>
                        <button
                          onClick={() => onViewFullText(page)}
                          className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View Text
                        </button>
                      </div>

                      {allSnippets.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                          No mapped keywords detected on page.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {allSnippets.slice(0, 4).map((snippet, idx) => (
                            <div
                              key={idx}
                              className="bg-zinc-950/80 rounded-xl p-2.5 border border-zinc-800 text-xs text-zinc-300"
                            >
                              <span className="inline-block px-1.5 py-0.5 mr-1.5 rounded text-[10px] font-sans font-bold bg-amber-500/20 text-amber-300">
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
