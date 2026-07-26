import React, { useState } from 'react';
import { Search, Plus, Trash2, SlidersHorizontal, Globe, KeyRound, RefreshCw, Layers, Check, Link2, Sparkles, Code2, ListPlus } from 'lucide-react';
import { SearchOptions, PresetSample } from '../types';
import { SAMPLE_PRESETS } from '../data/presets';

interface UrlTargetItem {
  id: string;
  url: string;
  keywords: string[];
}

interface SearchControlsProps {
  onSearch: (
    searchData: { targets?: { url: string; keywords: string[] }[]; urls?: string[]; keywords?: string[] },
    options: SearchOptions
  ) => void;
  isLoading: boolean;
}

export const SearchControls: React.FC<SearchControlsProps> = ({
  onSearch,
  isLoading
}) => {
  const [searchMode, setSearchMode] = useState<'mapped' | 'global'>('mapped');

  // Mapped Targets State
  const [targets, setTargets] = useState<UrlTargetItem[]>([
    {
      id: 'target-1',
      url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
      keywords: ['neural network', 'algorithm', 'robot']
    },
    {
      id: 'target-2',
      url: 'https://en.wikipedia.org/wiki/Machine_learning',
      keywords: ['training', 'model', 'dataset', 'quantum']
    }
  ]);

  const [bulkMappedText, setBulkMappedText] = useState<string>('');
  const [showBulkText, setShowBulkText] = useState<boolean>(false);

  // Global State
  const [urlsText, setUrlsText] = useState<string>(
    'https://en.wikipedia.org/wiki/Artificial_intelligence\nhttps://en.wikipedia.org/wiki/Machine_learning'
  );
  const [globalKeywords, setGlobalKeywords] = useState<string[]>(['neural network', 'algorithm', 'data', 'training']);
  const [globalKwInput, setGlobalKwInput] = useState<string>('');

  // Per-target keyword inputs
  const [targetKwInputs, setTargetKwInputs] = useState<Record<string, string>>({});

  const [options, setOptions] = useState<SearchOptions>({
    matchCase: false,
    exactPhrase: true,
    useRegex: false,
    contextLength: 90
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>('tech-news');

  // Load Presets
  const handleLoadPreset = (preset: PresetSample) => {
    setSelectedPresetId(preset.id);
    if (preset.targets && preset.targets.length > 0) {
      setSearchMode('mapped');
      setTargets(preset.targets.map((t, i) => ({ id: `preset-t-${i}`, url: t.url, keywords: [...t.keywords] })));
    } else {
      setUrlsText(preset.urls.join('\n'));
      setGlobalKeywords(preset.keywords);
    }
  };

  // Target Actions (Mapped Mode)
  const handleAddTarget = () => {
    setTargets([
      ...targets,
      {
        id: `target-${Date.now()}`,
        url: '',
        keywords: []
      }
    ]);
  };

  const handleRemoveTarget = (id: string) => {
    setTargets(targets.filter(t => t.id !== id));
  };

  const handleUpdateTargetUrl = (id: string, newUrl: string) => {
    setTargets(targets.map(t => (t.id === id ? { ...t, url: newUrl } : t)));
  };

  const handleAddTargetKeyword = (id: string) => {
    const inputVal = (targetKwInputs[id] || '').trim();
    if (!inputVal) return;

    setTargets(
      targets.map(t => {
        if (t.id === id && !t.keywords.includes(inputVal)) {
          return { ...t, keywords: [...t.keywords, inputVal] };
        }
        return t;
      })
    );

    setTargetKwInputs({ ...targetKwInputs, [id]: '' });
  };

  const handleRemoveTargetKeyword = (id: string, kwToRemove: string) => {
    setTargets(
      targets.map(t => {
        if (t.id === id) {
          return { ...t, keywords: t.keywords.filter(k => k !== kwToRemove) };
        }
        return t;
      })
    );
  };

  // Parse Bulk Mapped Text (format: URL | kw1, kw2)
  const handleParseBulkMappedText = () => {
    if (!bulkMappedText.trim()) return;

    const lines = bulkMappedText.split('\n');
    const newTargets: UrlTargetItem[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Split by pipe | or -> or comma
      let parts: string[] = [];
      if (trimmed.includes('|')) {
        parts = trimmed.split('|');
      } else if (trimmed.includes('->')) {
        parts = trimmed.split('->');
      } else {
        parts = [trimmed, ''];
      }

      const url = parts[0].trim();
      const kwString = parts.slice(1).join(' ').trim();
      const kws = kwString
        ? kwString.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : [];

      if (url) {
        newTargets.push({
          id: `bulk-${Date.now()}-${idx}`,
          url,
          keywords: kws
        });
      }
    });

    if (newTargets.length > 0) {
      setTargets(newTargets);
      setBulkMappedText('');
      setShowBulkText(false);
    } else {
      alert('Could not parse valid targets from bulk text. Please use format: URL | keyword1, keyword2');
    }
  };

  // Global Keywords Actions
  const handleAddGlobalKeyword = () => {
    const trimmed = globalKwInput.trim();
    if (trimmed && !globalKeywords.includes(trimmed)) {
      setGlobalKeywords([...globalKeywords, trimmed]);
      setGlobalKwInput('');
    }
  };

  const handleRemoveGlobalKeyword = (kwToRemove: string) => {
    setGlobalKeywords(globalKeywords.filter(k => k !== kwToRemove));
  };

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (searchMode === 'mapped') {
      const validTargets = targets
        .map(t => ({
          url: t.url.trim(),
          keywords: t.keywords
        }))
        .filter(t => t.url.length > 0 && t.keywords.length > 0);

      if (validTargets.length === 0) {
        alert('Please add at least one URL with at least one mapped keyword.');
        return;
      }

      onSearch({ targets: validTargets }, options);
    } else {
      const parsedUrls = urlsText
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0);

      if (parsedUrls.length === 0) {
        alert('Please enter at least one URL.');
        return;
      }

      if (globalKeywords.length === 0) {
        alert('Please enter at least one keyword.');
        return;
      }

      onSearch({ urls: parsedUrls, keywords: globalKeywords }, options);
    }
  };

  return (
    <div className="bg-zinc-900/90 rounded-2xl shadow-md border border-zinc-800 p-5 sm:p-6 transition-all">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-400" />
            Webpage Search & Keyword Configuration
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            Map specific keywords per URL or search global keywords across multiple webpages.
          </p>
        </div>

        {/* Search Mode Toggle & Presets */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setSearchMode('mapped')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                searchMode === 'mapped'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>URL-Keyword Mapping</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchMode('global')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                searchMode === 'global'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Global Keywords</span>
            </button>
          </div>

          {/* Quick Sample Presets */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="text-xs font-medium text-zinc-500 whitespace-nowrap hidden sm:inline">
              Presets:
            </span>
            {SAMPLE_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleLoadPreset(preset)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all whitespace-nowrap flex items-center gap-1 ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-blue-400" />}
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* MODE 1: Mapped Keywords Per URL */}
        {searchMode === 'mapped' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 font-mono">
                <Link2 className="w-4 h-4 text-blue-400" />
                URL & Mapped Keywords Builder ({targets.length} Target Pages)
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkText(!showBulkText)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 font-mono"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  {showBulkText ? 'Hide Bulk Paste' : 'Bulk Paste (URL | keywords)'}
                </button>
              </div>
            </div>

            {/* Bulk Paste Drawer */}
            {showBulkText && (
              <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-3 font-mono text-xs">
                <p className="text-zinc-400">
                  Paste URLs and keywords mapped per line in format: <strong className="text-zinc-200">URL | keyword1, keyword2</strong>
                </p>
                <textarea
                  value={bulkMappedText}
                  onChange={(e) => setBulkMappedText(e.target.value)}
                  rows={3}
                  placeholder={`https://en.wikipedia.org/wiki/Artificial_intelligence | neural network, algorithm\nhttps://en.wikipedia.org/wiki/Machine_learning | training, model, dataset`}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleParseBulkMappedText}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center gap-1"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  Parse & Load Mapped Targets
                </button>
              </div>
            )}

            {/* Mapped Targets List */}
            <div className="space-y-3">
              {targets.map((target, idx) => (
                <div
                  key={target.id}
                  className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-3 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={target.url}
                        onChange={(e) => handleUpdateTargetUrl(target.id, e.target.value)}
                        placeholder="Target Webpage URL (e.g. https://example.com/page)"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500"
                      />
                    </div>

                    {targets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTarget(target.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors"
                        title="Remove URL Target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Keywords mapped to this specific URL */}
                  <div className="pl-8 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-mono text-zinc-500 mr-1">
                        Mapped Keywords:
                      </span>
                      {target.keywords.map((kw, kIdx) => (
                        <span
                          key={kIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTargetKeyword(target.id, kw)}
                            className="text-amber-400/60 hover:text-amber-200 font-bold ml-1"
                          >
                            &times;
                          </button>
                        </span>
                      ))}

                      {target.keywords.length === 0 && (
                        <span className="text-xs text-zinc-600 italic font-mono">
                          No keywords mapped to this URL yet. Add one below.
                        </span>
                      )}
                    </div>

                    {/* Add Keyword to this URL */}
                    <div className="flex items-center gap-2 max-w-md">
                      <input
                        type="text"
                        value={targetKwInputs[target.id] || ''}
                        onChange={(e) => setTargetKwInputs({ ...targetKwInputs, [target.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTargetKeyword(target.id);
                          }
                        }}
                        placeholder="Add keyword for this URL..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTargetKeyword(target.id)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-zinc-700 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3 text-amber-400" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddTarget}
              className="w-full py-2.5 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              Add Another Target URL with Custom Keywords
            </button>
          </div>
        ) : (
          /* MODE 2: Global Keywords Mode */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Section 1: Webpage URLs Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 font-mono">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Target Webpage URLs
                </label>
                <button
                  type="button"
                  onClick={() => setUrlsText('')}
                  className="text-xs text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>

              <textarea
                value={urlsText}
                onChange={(e) => {
                  setUrlsText(e.target.value);
                  setSelectedPresetId(null);
                }}
                rows={5}
                placeholder="Enter or paste webpage URLs (1 per line)...&#10;https://en.wikipedia.org/wiki/Artificial_intelligence"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs sm:text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:border-blue-500 outline-none transition-all resize-y min-h-[120px]"
              />
            </div>

            {/* Section 2: Global Keywords Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 font-mono">
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  Global Keywords (Applied to all URLs)
                </label>
                {globalKeywords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setGlobalKeywords([])}
                    className="text-xs text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 min-h-[120px] transition-all flex flex-col justify-between gap-3">
                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                  {globalKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30"
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGlobalKeyword(kw)}
                        className="text-amber-400/60 hover:text-amber-200"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                  <input
                    type="text"
                    value={globalKwInput}
                    onChange={(e) => setGlobalKwInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGlobalKeyword();
                      }
                    }}
                    placeholder="Type keyword and press Enter..."
                    className="flex-1 bg-transparent text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddGlobalKeyword}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Options & Search Action Row */}
        <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-mono">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.matchCase}
                onChange={(e) => setOptions({ ...options, matchCase: e.target.checked })}
                className="w-4 h-4 bg-zinc-950 border-zinc-800 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-zinc-300">Case Sensitive</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.exactPhrase}
                onChange={(e) => setOptions({ ...options, exactPhrase: e.target.checked })}
                className="w-4 h-4 bg-zinc-950 border-zinc-800 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-zinc-300">Exact Phrase</span>
            </label>

            <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
              <span className="text-zinc-500">Context Length:</span>
              <select
                value={options.contextLength}
                onChange={(e) => setOptions({ ...options, contextLength: Number(e.target.value) })}
                className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-200 focus:border-blue-500 outline-none"
              >
                <option value={60}>Short (60 chars)</option>
                <option value={90}>Medium (90 chars)</option>
                <option value={150}>Long (150 chars)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scanning Webpages...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Run Webpage Keyword Search</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
