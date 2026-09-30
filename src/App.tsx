import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { SearchControls } from './components/SearchControls';
import { SearchResults } from './components/SearchResults';
import { PageTextModal } from './components/PageTextModal';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { SearchHistoryModal } from './components/SearchHistoryModal';
import { ExportModal } from './components/ExportModal';
import { UserGuideModal } from './components/UserGuideModal';
import { PageResult, SearchOptions, SearchHistoryItem } from './types';
import { AlertCircle, Sparkles, Globe, KeyRound, Eye, EyeOff, Trash2, RotateCcw } from 'lucide-react';

const LOCAL_STORAGE_HISTORY_KEY = 'webpage_keyword_search_history_v1';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('app_theme', nextTheme);
    } catch {
      // Ignore
    }
  };

  const [results, setResults] = useState<PageResult[]>([]);
  const [searchTimeMs, setSearchTimeMs] = useState<number>(0);
  const [currentKeywords, setCurrentKeywords] = useState<string[]>([]);
  const [currentUrls, setCurrentUrls] = useState<string[]>([]);

  // Scanning & Pause / Resume State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{
    current: number;
    total: number;
    currentUrl?: string;
    isWaitingDelay?: boolean;
    delayRemainingSec?: number;
    isCompleted?: boolean;
  } | null>(null);

  // Results View/Hide Toggle - Default hidden
  const [showResults, setShowResults] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [selectedPageForText, setSelectedPageForText] = useState<PageResult | null>(null);
  const [selectedPageForAi, setSelectedPageForAi] = useState<PageResult | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Search History
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Refs for scan control
  const isPausedRef = useRef<boolean>(false);
  const stopScanningRef = useRef<boolean>(false);
  const lastSearchOptionsRef = useRef<SearchOptions>({
    matchCase: false,
    exactPhrase: true,
    useRegex: false,
    contextLength: 90,
    stealthMode: true,
    delayBetweenRequestsMs: 0
  });

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

  // Pause Scan
  const handlePauseScan = () => {
    setIsPaused(true);
    isPausedRef.current = true;
  };

  // Resume Scan
  const handleResumeScan = () => {
    setIsPaused(false);
    isPausedRef.current = false;
  };

  // Stop Scan
  const handleStopScan = () => {
    stopScanningRef.current = true;
    isPausedRef.current = false;
    setIsPaused(false);
    setIsScanning(false);
    setScanProgress(prev => (prev ? { ...prev, isWaitingDelay: false, isCompleted: true } : null));
  };

  // Automatic CSV Export on Scan Completion
  const triggerAutoCsvExport = (resultsToExport: PageResult[], keywordsToExport: string[]) => {
    const headers = [
      'URL',
      'Title',
      'Status',
      'Searched Keywords',
      'Status Found or Not Found',
      'Found Location',
      'Section / DOM Breadcrumb',
      'Context Type',
      'Total Matches',
      'Word Count',
      'Fetch Time (ms)',
      'Context Snippets'
    ];

    const rows: string[] = [];

    resultsToExport.forEach(p => {
      const isError = p.status === 'error';
      const targetKws = p.targetKeywords && p.targetKeywords.length > 0
        ? p.targetKeywords
        : (keywordsToExport && keywordsToExport.length > 0 ? keywordsToExport : ['-']);

      const httpStatusText = p.httpStatus ? `HTTP ${p.httpStatus}` : '';
      const errorReason = p.errorMessage || 'Failed to fetch / Empty';
      const statusText = isError ? `Error${httpStatusText ? ` (${httpStatusText})` : ''}` : '200 OK';

      targetKws.forEach(kw => {
        const km = p.keywordMatches?.[kw];
        const matchCount = km?.count || 0;
        const isFound = matchCount > 0;
        const statusFoundOrNot = isError
          ? `Failed: ${errorReason}`
          : isFound
          ? 'Found'
          : 'Not found';

        const foundIn = km?.foundIn;
        const foundLocationText = !isFound || isError ? '-' : foundIn === 'visible' ? 'Visible Page' : foundIn === 'raw_code' ? 'Raw Code / SSR Data' : 'Both (Visible & Raw Code)';
        const snippets = km?.snippets || [];

        if (snippets.length > 0) {
          snippets.forEach(s => {
            const snippetText = s.text.replace(/[\r\n]+/g, ' ');
            const snipLocText = s.location === 'raw_code' ? 'Raw Code' : 'Visible Page';
            const domBreadcrumb = s.domPath || '-';
            const ctxType = s.contextType || 'general';
            rows.push([
              `"${p.url.replace(/"/g, '""')}"`,
              `"${(p.title || p.url || 'Untitled').replace(/"/g, '""')}"`,
              `"${statusText}"`,
              `"${kw.replace(/"/g, '""')}"`,
              `"${statusFoundOrNot}"`,
              `"${snipLocText}"`,
              `"${domBreadcrumb.replace(/"/g, '""')}"`,
              `"${ctxType}"`,
              matchCount,
              p.wordCount || 0,
              p.fetchTimeMs || 0,
              `"${snippetText.replace(/"/g, '""')}"`
            ].join(','));
          });
        } else {
          rows.push([
            `"${p.url.replace(/"/g, '""')}"`,
            `"${(p.title || p.url || 'Untitled').replace(/"/g, '""')}"`,
            `"${statusText}"`,
            `"${kw.replace(/"/g, '""')}"`,
            `"${statusFoundOrNot}"`,
            `"${foundLocationText}"`,
            `"-"`,
            `"-"`,
            matchCount,
            p.wordCount || 0,
            p.fetchTimeMs || 0,
            isError ? `"${errorReason.replace(/"/g, '""')}"` : `"-"`
          ].join(','));
        }
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keyword-search-report-${Date.now()}.csv`;
    link.click();
  };

  // Main Search Execution (Supports Progressive Scan + Pause / Resume + Configurable Delays)
  const handleExecuteSearch = async (
    searchData: {
      targets?: { url: string; keywords: string[]; rawHtml?: string; isLocalHtml?: boolean }[];
      urls?: string[];
      keywords?: string[];
    },
    options: SearchOptions
  ) => {
    const startTime = Date.now();
    lastSearchOptionsRef.current = options;
    setIsScanning(true);
    setIsPaused(false);
    setErrorMessage(null);
    setShowResults(false);

    isPausedRef.current = false;
    stopScanningRef.current = false;

    let targetList: Array<{ url: string; keywords: string[]; rawHtml?: string; isLocalHtml?: boolean }> = [];
    let allKeywords: string[] = [];
    let allUrls: string[] = [];

    if (searchData.targets && searchData.targets.length > 0) {
      targetList = searchData.targets;
      allUrls = searchData.targets.map(t => t.url);
      const kwSet = new Set<string>();
      searchData.targets.forEach(t => t.keywords.forEach(k => kwSet.add(k)));
      allKeywords = Array.from(kwSet);
    } else {
      allUrls = searchData.urls || [];
      allKeywords = searchData.keywords || [];
      targetList = allUrls.map(u => ({ url: u, keywords: allKeywords }));
    }

    setCurrentKeywords(allKeywords);
    setCurrentUrls(allUrls);

    if (targetList.length === 0) {
      setIsScanning(false);
      return;
    }

    setScanProgress({
      current: 0,
      total: targetList.length,
      currentUrl: targetList[0]?.url,
      isWaitingDelay: false,
      isCompleted: false
    });

    setResults([]);
    let accumulatedResults: PageResult[] = [];

    for (let i = 0; i < targetList.length; i++) {
      if (stopScanningRef.current) break;

      // Rate-limiting delay between requests to avoid getting blocked
      const delayMs = options.delayBetweenRequestsMs ?? 0;
      if (i > 0 && delayMs > 0) {
        const delayStart = Date.now();
        while (Date.now() - delayStart < delayMs) {
          if (stopScanningRef.current) break;
          while (isPausedRef.current) {
            if (stopScanningRef.current) break;
            await new Promise(res => setTimeout(res, 150));
          }
          if (stopScanningRef.current) break;
          const elapsed = Date.now() - delayStart;
          const remaining = Math.max(0, Math.ceil((delayMs - elapsed) / 100) / 10);
          setScanProgress({
            current: i + 1,
            total: targetList.length,
            currentUrl: targetList[i].url,
            isWaitingDelay: true,
            delayRemainingSec: remaining
          });
          await new Promise(res => setTimeout(res, 100));
        }
      }

      if (stopScanningRef.current) break;

      // Handle Pause state
      while (isPausedRef.current) {
        if (stopScanningRef.current) break;
        await new Promise(res => setTimeout(res, 200));
      }

      if (stopScanningRef.current) break;

      const currentTarget = targetList[i];
      setScanProgress({
        current: i + 1,
        total: targetList.length,
        currentUrl: currentTarget.url,
        isWaitingDelay: false
      });

      const controller = new AbortController();
      const abortTimeout = setTimeout(() => controller.abort(), 20000); // 20s overall safety abort

      try {
        const response = await fetch('/api/fetch-and-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            targets: [currentTarget],
            options
          })
        });

        clearTimeout(abortTimeout);

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || `Error scanning ${currentTarget.url}`);
        }

        const data = await response.json();
        const pageResults: PageResult[] = data.results || [];
        accumulatedResults = [...accumulatedResults, ...pageResults];
        setResults([...accumulatedResults]);
        setSearchTimeMs(Date.now() - startTime);
      } catch (err: any) {
        clearTimeout(abortTimeout);
        console.error('Scan error:', err);
        const fallbackErrorResult: PageResult = {
          url: currentTarget.url,
          title: currentTarget.url,
          status: 'error',
          errorMessage: err.name === 'AbortError' ? 'Scan timed out after 20 seconds' : (err.message || 'Failed to scan webpage'),
          targetKeywords: currentTarget.keywords,
          foundKeywords: [],
          notFoundKeywords: currentTarget.keywords,
          keywordMatches: {},
          wordCount: 0,
          totalMatches: 0,
          fetchTimeMs: 0
        };
        accumulatedResults = [...accumulatedResults, fallbackErrorResult];
        setResults([...accumulatedResults]);
        setSearchTimeMs(Date.now() - startTime);
      }
    }

    setIsScanning(false);
    setIsPaused(false);
    setScanProgress({
      current: targetList.length,
      total: targetList.length,
      currentUrl: undefined,
      isWaitingDelay: false,
      isCompleted: true
    });

    const totalMatches = accumulatedResults.reduce((acc: number, p: PageResult) => acc + (p.totalMatches || 0), 0);
    saveSearchToHistory(allUrls, allKeywords, totalMatches, accumulatedResults.length);

    if (options.autoDownload !== false && accumulatedResults.length > 0) {
      triggerAutoCsvExport(accumulatedResults, allKeywords);
    }
  };

  // Retry Failed URLs (either all failed or specific list)
  const handleRetryFailed = async (specificUrls?: string[]) => {
    if (isScanning) return;

    // Filter failed pages
    const failedPages = results.filter(
      p => p.status === 'error' && (!specificUrls || specificUrls.includes(p.url))
    );

    if (failedPages.length === 0) return;

    const opts = lastSearchOptionsRef.current || {
      matchCase: false,
      exactPhrase: true,
      useRegex: false,
      contextLength: 90,
      stealthMode: true,
      delayBetweenRequestsMs: 0
    };

    const targetList = failedPages.map(p => ({
      url: p.url,
      keywords: p.targetKeywords && p.targetKeywords.length > 0 ? p.targetKeywords : currentKeywords,
      rawHtml: p.rawHtml,
      isLocalHtml: p.isLocalHtml
    }));

    setIsScanning(true);
    setIsPaused(false);
    setErrorMessage(null);
    setShowResults(false);

    isPausedRef.current = false;
    stopScanningRef.current = false;

    setScanProgress({
      current: 0,
      total: targetList.length,
      currentUrl: targetList[0]?.url,
      isWaitingDelay: false,
      isCompleted: false
    });

    // Mark retrying pages as 'fetching'
    const retryingUrls = new Set(targetList.map(t => t.url));
    setResults(prev =>
      prev.map(p => (retryingUrls.has(p.url) ? { ...p, status: 'fetching', errorMessage: undefined } : p))
    );

    for (let i = 0; i < targetList.length; i++) {
      if (stopScanningRef.current) break;

      const delayMs = opts.delayBetweenRequestsMs ?? 0;
      if (i > 0 && delayMs > 0) {
        const delayStart = Date.now();
        while (Date.now() - delayStart < delayMs) {
          if (stopScanningRef.current) break;
          while (isPausedRef.current) {
            if (stopScanningRef.current) break;
            await new Promise(res => setTimeout(res, 150));
          }
          if (stopScanningRef.current) break;
          const elapsed = Date.now() - delayStart;
          const remaining = Math.max(0, Math.ceil((delayMs - elapsed) / 100) / 10);
          setScanProgress({
            current: i + 1,
            total: targetList.length,
            currentUrl: targetList[i].url,
            isWaitingDelay: true,
            delayRemainingSec: remaining
          });
          await new Promise(res => setTimeout(res, 100));
        }
      }

      if (stopScanningRef.current) break;

      while (isPausedRef.current) {
        if (stopScanningRef.current) break;
        await new Promise(res => setTimeout(res, 200));
      }

      if (stopScanningRef.current) break;

      const currentTarget = targetList[i];
      setScanProgress({
        current: i + 1,
        total: targetList.length,
        currentUrl: currentTarget.url,
        isWaitingDelay: false
      });

      const controller = new AbortController();
      const abortTimeout = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch('/api/fetch-and-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            targets: [currentTarget],
            options: opts
          })
        });

        clearTimeout(abortTimeout);

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || `Error scanning ${currentTarget.url}`);
        }

        const data = await response.json();
        const updatedPage: PageResult = (data.results && data.results[0]) || {
          url: currentTarget.url,
          title: currentTarget.url,
          status: 'error',
          errorMessage: 'No data returned',
          targetKeywords: currentTarget.keywords,
          foundKeywords: [],
          notFoundKeywords: currentTarget.keywords,
          keywordMatches: {},
          wordCount: 0,
          totalMatches: 0,
          fetchTimeMs: 0
        };

        setResults(prev =>
          prev.map(p => (p.url === currentTarget.url ? updatedPage : p))
        );
      } catch (err: any) {
        clearTimeout(abortTimeout);
        console.error('Retry scan error:', err);
        const fallbackErrorResult: PageResult = {
          url: currentTarget.url,
          title: currentTarget.url,
          status: 'error',
          errorMessage: err.name === 'AbortError' ? 'Scan timed out after 20 seconds' : (err.message || 'Failed to scan webpage'),
          targetKeywords: currentTarget.keywords,
          foundKeywords: [],
          notFoundKeywords: currentTarget.keywords,
          keywordMatches: {},
          wordCount: 0,
          totalMatches: 0,
          fetchTimeMs: 0
        };
        setResults(prev =>
          prev.map(p => (p.url === currentTarget.url ? fallbackErrorResult : p))
        );
      }
    }

    setIsScanning(false);
    setIsPaused(false);
    setScanProgress({
      current: targetList.length,
      total: targetList.length,
      currentUrl: undefined,
      isWaitingDelay: false,
      isCompleted: true
    });
  };

  const handleRestoreSearch = (historyItem: SearchHistoryItem) => {
    handleExecuteSearch(
      { urls: historyItem.urls, keywords: historyItem.keywords, targets: historyItem.targets },
      { matchCase: false, exactPhrase: true, useRegex: false, contextLength: 90, delayBetweenRequestsMs: 0 }
    );
  };

  const isDark = theme === 'dark';

  return (
    <div className={isDark ? 'min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased flex flex-col selection:bg-blue-600 selection:text-white transition-colors' : 'min-h-screen bg-slate-100 text-slate-800 font-sans antialiased flex flex-col selection:bg-blue-600 selection:text-white transition-colors'}>
      {/* App Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        hasResults={results.length > 0}
        historyCount={history.length}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Search Controls Panel */}
        <SearchControls
          onSearch={handleExecuteSearch}
          isLoading={isScanning}
          isPaused={isPaused}
          scanProgress={scanProgress}
          onPauseScan={handlePauseScan}
          onResumeScan={handleResumeScan}
          onStopScan={handleStopScan}
          theme={theme}
        />

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl p-4 flex items-center gap-3 text-xs sm:text-sm animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Search Error</p>
              <p>{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-500 hover:underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Results Bar Header with View/Hide Toggle */}
        {results.length > 0 && (
          <div className={isDark ? 'flex items-center justify-between bg-zinc-900/90 rounded-2xl px-5 py-3.5 border border-zinc-800 font-mono text-xs' : 'flex items-center justify-between bg-white rounded-2xl px-5 py-3.5 border border-slate-200 shadow-sm font-mono text-xs'}>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className={isDark ? 'font-bold text-zinc-200 text-sm' : 'font-bold text-slate-800 text-sm'}>
                Webpage Scan Results ({results.length} Pages)
              </span>
              {isScanning && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 border border-blue-500/30 text-[11px]">
                  Scanning in progress...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {results.some(p => p.status === 'error') && (
                <button
                  type="button"
                  onClick={() => handleRetryFailed()}
                  disabled={isScanning}
                  className={
                    isDark
                      ? "px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-semibold transition-all flex items-center gap-1.5 border border-amber-500/30 text-xs disabled:opacity-50"
                      : "px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold transition-all flex items-center gap-1.5 border border-amber-300 text-xs disabled:opacity-50"
                  }
                  title="إعادة محاولة الروابط التي فشلت"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Retry Failed ({results.filter(p => p.status === 'error').length})</span>
                </button>
              )}

              <button
                onClick={() => {
                  setResults([]);
                  setShowResults(false);
                  setSearchTimeMs(0);
                  setScanProgress(null);
                }}
                className={isDark ? 'px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 hover:text-rose-300 font-semibold transition-all flex items-center gap-1.5 border border-zinc-700' : 'px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-600 hover:text-rose-700 font-semibold transition-all flex items-center gap-1.5 border border-slate-300'}
                title="Clear all search results"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Clear Results</span>
              </button>

              <button
                onClick={() => setShowResults(!showResults)}
                className={isDark ? 'px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold transition-all flex items-center gap-2 border border-zinc-700' : 'px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold transition-all flex items-center gap-2 border border-slate-300'}
              >
                {showResults ? (
                  <>
                    <EyeOff className="w-4 h-4 text-rose-500" />
                    <span>Hide Results</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-emerald-500" />
                    <span>View Results ({results.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results.length > 0 && showResults && (
          <SearchResults
            results={results}
            searchTimeMs={searchTimeMs}
            keywords={currentKeywords}
            onViewFullText={(page) => setSelectedPageForText(page)}
            onAiAnalyze={(page) => setSelectedPageForAi(page)}
            onToggleHideResults={() => setShowResults(false)}
            onClearResults={() => {
              setResults([]);
              setShowResults(false);
              setSearchTimeMs(0);
              setScanProgress(null);
            }}
            onRetryFailed={handleRetryFailed}
            isScanning={isScanning}
            theme={theme}
          />
        )}
      </main>

      {/* Modals */}
      <PageTextModal
        page={selectedPageForText}
        onClose={() => setSelectedPageForText(null)}
        keywords={currentKeywords}
        theme={theme}
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

      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        isDark={isDark}
      />
    </div>
  );
}

