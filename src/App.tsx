import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchControls } from './components/SearchControls';
import { SearchResults } from './components/SearchResults';
import { PageTextModal } from './components/PageTextModal';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { SearchHistoryModal } from './components/SearchHistoryModal';
import { ExportModal } from './components/ExportModal';
import { PageResult, SearchOptions, SearchHistoryItem } from './types';
import { AlertCircle, Sparkles, Globe, KeyRound } from 'lucide-react';

const LOCAL_STORAGE_HISTORY_KEY = 'webpage_keyword_search_history_v1';

export default function App() {
  const [results, setResults] = useState<PageResult[]>([]);
  const [searchTimeMs, setSearchTimeMs] = useState<number>(0);
  const [currentKeywords, setCurrentKeywords] = useState<string[]>([]);
  const [currentUrls, setCurrentUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [selectedPageForText, setSelectedPageForText] = useState<PageResult | null>(null);
  const [selectedPageForAi, setSelectedPageForAi] = useState<PageResult | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Search History
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const saveSearchToHistory = (urls: string[], keywords: string[], totalMatches: number, pagesCount: number) => {
    const newItem: SearchHistoryItem = {
      id: `hist-${Date.now()}`,
      timestamp: Date.now(),
      urls,
      keywords,
      totalMatches,
      pagesCount
    };

    const updated = [newItem, ...history.slice(0, 19)];
    setHistory(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    } catch {
      // Ignore
    }
  };

  // Main Search Execution
  const handleExecuteSearch = async (
    searchData: { targets?: { url: string; keywords: string[] }[]; urls?: string[]; keywords?: string[] },
    options: SearchOptions
  ) => {
    setIsLoading(true);
    setErrorMessage(null);

    let allKeywords: string[] = [];
    let allUrls: string[] = [];

    if (searchData.targets && searchData.targets.length > 0) {
      allUrls = searchData.targets.map(t => t.url);
      const kwSet = new Set<string>();
      searchData.targets.forEach(t => t.keywords.forEach(k => kwSet.add(k)));
      allKeywords = Array.from(kwSet);
    } else {
      allUrls = searchData.urls || [];
      allKeywords = searchData.keywords || [];
    }

    setCurrentKeywords(allKeywords);
    setCurrentUrls(allUrls);

    try {
      const response = await fetch('/api/fetch-and-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targets: searchData.targets,
          urls: searchData.urls,
          keywords: searchData.keywords,
          options
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error: HTTP ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      setSearchTimeMs(data.searchTimeMs || 0);

      const totalMatches = (data.results || []).reduce((acc: number, p: PageResult) => acc + (p.totalMatches || 0), 0);
      saveSearchToHistory(allUrls, allKeywords, totalMatches, (data.results || []).length);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while searching pages.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreSearch = (historyItem: SearchHistoryItem) => {
    handleExecuteSearch(
      { urls: historyItem.urls, keywords: historyItem.keywords, targets: historyItem.targets },
      { matchCase: false, exactPhrase: true, useRegex: false, contextLength: 90 }
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased flex flex-col selection:bg-blue-600 selection:text-white">
      {/* App Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        hasResults={results.length > 0}
        historyCount={history.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Search Controls Panel */}
        <SearchControls
          onSearch={handleExecuteSearch}
          isLoading={isLoading}
        />

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl p-4 flex items-center gap-3 text-xs sm:text-sm animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Search Error</p>
              <p>{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <SearchResults
            results={results}
            searchTimeMs={searchTimeMs}
            keywords={currentKeywords}
            onViewFullText={(page) => setSelectedPageForText(page)}
            onAiAnalyze={(page) => setSelectedPageForAi(page)}
          />
        )}

        {/* Initial Empty State / Helper Guide */}
        {results.length === 0 && !isLoading && (
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-6 shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto shadow-inner">
              <Globe className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-zinc-100">
                Webpage Keyword Search Engine
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed font-mono">
                Provide target URLs and keywords above, or choose a preset to scan real-time web pages instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left border-t border-zinc-800 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5 font-mono">
                  <Globe className="w-4 h-4 text-blue-400" />
                  1. Server Fetch
                </div>
                <p className="text-zinc-500 text-[11px] leading-normal font-mono">
                  Fetches live HTML server-side without CORS limitations.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5 font-mono">
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  2. Keyword Scan
                </div>
                <p className="text-zinc-500 text-[11px] leading-normal font-mono">
                  Scans for exact phrases, case variants, or regex snippets.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  3. Gemini AI
                </div>
                <p className="text-zinc-500 text-[11px] leading-normal font-mono">
                  Generate instant summaries and Q&A insights on keyword findings.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <PageTextModal
        page={selectedPageForText}
        onClose={() => setSelectedPageForText(null)}
        keywords={currentKeywords}
      />

      <AiAnalysisModal
        page={selectedPageForAi}
        onClose={() => setSelectedPageForAi(null)}
        keywords={currentKeywords}
      />

      <SearchHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onRestoreSearch={handleRestoreSearch}
        onClearHistory={handleClearHistory}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        results={results}
        keywords={currentKeywords}
      />
    </div>
  );
}
